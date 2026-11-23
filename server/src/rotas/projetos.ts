import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db.js';
import { registrarEvento } from '../eventos.js';
import { codificarCursor, decodificarCursor, Limite, lista } from '../paginacao.js';
import { Problema } from '../problema.js';
import { exigir } from '../sessao.js';
import { textoOpc } from '../validacao.js';

const STATUS = ['nao_iniciado', 'em_andamento', 'bloqueado', 'pausado', 'concluido', 'cancelado'] as const;
const FASE = ['descoberta', 'planejamento', 'execucao', 'validacao', 'entrega'] as const;
const PRIORIDADE = ['baixa', 'media', 'alta', 'critica'] as const;
const Data = z.iso.date().nullable();

const campos = {
  nome: z.string().trim().min(2).max(160),
  descricao: textoOpc(4000),
  objetivo: textoOpc(2000),
  status: z.enum(STATUS),
  fase: z.enum(FASE),
  prioridade: z.enum(PRIORIDADE),
  progresso: z.number().int().min(0).max(100),
  responsavelId: z.uuid().nullable(),
  inicioPrevisto: Data,
  prazoPrevisto: Data,
  proximaAcao: textoOpc(500),
};
const ProjetoEntrada = z.strictObject({ ...z.object(campos).partial().shape, empresaId: z.uuid(), nome: campos.nome });
const ProjetoAtualizacao = z.strictObject({ versao: z.number().int(), ...z.object(campos).partial().shape });

const COLUNAS = {
  nome: 'nome', descricao: 'descricao', objetivo: 'objetivo', status: 'status', fase: 'fase', prioridade: 'prioridade',
  progresso: 'progresso', responsavelId: 'responsavel_ator_id', inicioPrevisto: 'inicio_previsto',
  prazoPrevisto: 'prazo_previsto', proximaAcao: 'proxima_acao',
} as const;

const ator = (alias: string) =>
  `CASE WHEN ${alias}.id IS NULL THEN NULL ELSE json_build_object('id', ${alias}.id, 'tipo', ${alias}.tipo, 'nome', ${alias}.nome, 'ativo', ${alias}.ativo, 'avatarUrl', NULL) END`;

// Datas `date` saem como texto: o driver converteria para meia-noite local e o fuso trocaria o dia.
const SELECT_PROJETO = `
  SELECT p.id, p.empresa_id, p.nome, p.descricao, p.objetivo, p.status, p.fase, p.prioridade, p.progresso,
         p.inicio_previsto::text AS inicio_previsto, p.prazo_previsto::text AS prazo_previsto,
         p.concluido_em, p.proxima_acao, p.criado_em, p.atualizado_em, p.versao,
         json_build_object('id', e.id, 'nome', e.nome, 'logoVersao', li.versao) AS empresa,
         ${ator('r')} AS responsavel,
         (SELECT json_build_object('id', u.id, 'texto', u.texto, 'em', u.em, 'autor', ${ator('ua')})
            FROM projeto_atualizacoes u LEFT JOIN atores ua ON ua.id = u.autor_ator_id
           WHERE u.projeto_id = p.id ORDER BY u.em DESC, u.id DESC LIMIT 1) AS ultima
    FROM projetos p
    JOIN empresas e ON e.id = p.empresa_id
    LEFT JOIN empresa_imagens li ON li.empresa_id = e.id AND li.tipo = 'logo'
    LEFT JOIN atores r ON r.id = p.responsavel_ator_id`;

type Linha = Record<string, unknown> & { id: string; empresa_id: string; nome: string; status: string; versao: number };
const iso = (d: unknown) => (d == null ? null : new Date(d as string).toISOString());

const paraProjeto = (l: Linha) => {
  const e = l.empresa as { id: string; nome: string; logoVersao: number | null };
  const u = l.ultima as { id: string; texto: string; em: string; autor: unknown } | null;
  return {
    id: l.id,
    empresaId: l.empresa_id,
    empresa: { id: e.id, nome: e.nome, logoUrl: e.logoVersao == null ? null : `/api/empresas/${e.id}/logo?v=${e.logoVersao}` },
    nome: l.nome,
    descricao: l.descricao,
    objetivo: l.objetivo,
    status: l.status,
    fase: l.fase,
    prioridade: l.prioridade,
    progresso: l.progresso,
    responsavel: l.responsavel,
    inicioPrevisto: l.inicio_previsto,
    prazoPrevisto: l.prazo_previsto,
    concluidoEm: iso(l.concluido_em),
    ultimaAtualizacao: u ? { ...u, em: iso(u.em) } : null,
    proximaAcao: l.proxima_acao,
    criadoEm: iso(l.criado_em),
    atualizadoEm: iso(l.atualizado_em),
    versao: l.versao,
  };
};

export async function obterProjeto(db: Db, organizacaoId: string, id: string) {
  const { rows } = await db.query<Linha>(`${SELECT_PROJETO} WHERE p.id = $1 AND p.organizacao_id = $2`, [id, organizacaoId]);
  if (!rows[0]) throw new Problema(404, 'nao_encontrado', 'Projeto não encontrado');
  return rows[0];
}

async function conferirResponsavel(tx: Db, organizacaoId: string, atorId: string | null | undefined) {
  if (!atorId) return;
  const a = (await tx.query<{ ativo: boolean }>('SELECT ativo FROM atores WHERE id = $1 AND organizacao_id = $2', [atorId, organizacaoId])).rows[0];
  if (!a) throw new Problema(400, 'validacao', 'Ator não encontrado', [{ campo: 'responsavelId', codigo: 'nao_encontrado', mensagem: 'Ator não encontrado' }]);
  if (!a.ativo) throw new Problema(400, 'ator_inativo', 'Ator inativo não recebe atribuição nova', [{ campo: 'responsavelId', codigo: 'ator_inativo', mensagem: 'Ator inativo' }]);
}

const Filtros = z.object({
  limite: Limite,
  cursor: z.string().optional(),
  empresaId: z.uuid().optional(),
  status: lista(z.enum(STATUS)),
  fase: z.enum(FASE).optional(),
  prioridade: z.enum(PRIORIDADE).optional(),
  responsavelId: z.uuid().optional(),
  prazoAte: z.iso.date().optional(),
  concluidoDesde: z.iso.datetime({ offset: true }).optional(),
  ordem: z.enum(['nome', '-nome', 'prazoPrevisto', '-prazoPrevisto', 'prioridade', '-prioridade',
    'atualizadoEm', '-atualizadoEm', 'concluidoEm', '-concluidoEm']).default('-atualizadoEm'),
});
const PESO_PRIORIDADE = `CASE p.prioridade WHEN 'baixa' THEN 1 WHEN 'media' THEN 2 WHEN 'alta' THEN 3 ELSE 4 END`;
const ORDEM: Record<z.infer<typeof Filtros>['ordem'], string> = {
  nome: 'sem_acento(p.nome) ASC', '-nome': 'sem_acento(p.nome) DESC',
  prazoPrevisto: 'p.prazo_previsto ASC NULLS LAST', '-prazoPrevisto': 'p.prazo_previsto DESC NULLS LAST',
  prioridade: `${PESO_PRIORIDADE} ASC`, '-prioridade': `${PESO_PRIORIDADE} DESC`,
  atualizadoEm: 'p.atualizado_em ASC', '-atualizadoEm': 'p.atualizado_em DESC',
  concluidoEm: 'p.concluido_em ASC NULLS LAST', '-concluidoEm': 'p.concluido_em DESC NULLS LAST',
};

const Params = z.object({ projetoId: z.uuid() });

export function rotasProjetos(app: FastifyInstance, db: Db) {
  app.get('/api/projetos', async (req) => {
    const s = exigir(req, 'projetos.ler');
    const f = Filtros.parse(req.query);
    const offset = decodificarCursor(f.cursor, z.object({ o: z.number().int().min(0) }))?.o ?? 0;
    const params: unknown[] = [s.organizacaoId];
    const p = (v: unknown) => (params.push(v), `$${params.length}`);
    const onde = ['p.organizacao_id = $1'];
    if (f.empresaId) onde.push(`p.empresa_id = ${p(f.empresaId)}`);
    if (f.status?.length) onde.push(`p.status = ANY(${p(f.status)})`);
    if (f.fase) onde.push(`p.fase = ${p(f.fase)}`);
    if (f.prioridade) onde.push(`p.prioridade = ${p(f.prioridade)}`);
    if (f.responsavelId) onde.push(`p.responsavel_ator_id = ${p(f.responsavelId)}`);
    if (f.prazoAte) onde.push(`p.prazo_previsto <= ${p(f.prazoAte)}::date`);
    if (f.concluidoDesde) onde.push(`p.concluido_em >= ${p(f.concluidoDesde)}::timestamptz`);
    const { rows } = await db.query<Linha>(
      `${SELECT_PROJETO} WHERE ${onde.join(' AND ')} ORDER BY ${ORDEM[f.ordem]}, p.id LIMIT ${p(f.limite + 1)} OFFSET ${p(offset)}`,
      params,
    );
    return {
      itens: rows.slice(0, f.limite).map(paraProjeto),
      proximoCursor: rows.length > f.limite ? codificarCursor({ o: offset + f.limite }) : null,
    };
  });

  app.post('/api/projetos', async (req, reply) => {
    const s = exigir(req, 'projetos.criar');
    const d = ProjetoEntrada.parse(req.body);
    const id = await db.transacao(async (tx) => {
      const empresa = (await tx.query('SELECT 1 FROM empresas WHERE id = $1 AND organizacao_id = $2', [d.empresaId, s.organizacaoId])).rows[0];
      if (!empresa) throw new Problema(400, 'validacao', 'Empresa não encontrada', [{ campo: 'empresaId', codigo: 'nao_encontrado', mensagem: 'Empresa não encontrada' }]);
      await conferirResponsavel(tx, s.organizacaoId, d.responsavelId);
      const cols = ['organizacao_id', 'empresa_id', 'concluido_em'];
      const vals: unknown[] = [s.organizacaoId, d.empresaId, d.status === 'concluido' ? new Date() : null];
      for (const [campo, coluna] of Object.entries(COLUNAS)) {
        const v = d[campo as keyof typeof d];
        if (v === undefined) continue;
        cols.push(coluna);
        vals.push(v);
      }
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO projetos (${cols.join(', ')}) VALUES (${vals.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`, vals,
      );
      const id = rows[0]!.id;
      await registrarEvento(tx, {
        organizacaoId: s.organizacaoId, tipo: 'project.created', autorAtorId: s.atorId,
        empresaId: d.empresaId, projetoId: id, alvo: { tipo: 'projeto', id, titulo: d.nome },
      });
      return id;
    });
    return reply.code(201).send(paraProjeto(await obterProjeto(db, s.organizacaoId, id)));
  });

  app.get('/api/projetos/:projetoId', async (req) => {
    const s = exigir(req, 'projetos.ler');
    const { projetoId } = Params.parse(req.params);
    return paraProjeto(await obterProjeto(db, s.organizacaoId, projetoId));
  });

  app.patch('/api/projetos/:projetoId', async (req) => {
    const s = exigir(req, 'projetos.editar');
    const { projetoId } = Params.parse(req.params);
    const { versao, ...d } = ProjetoAtualizacao.parse(req.body);
    await db.transacao(async (tx) => {
      const atual = (await tx.query<{ versao: number; status: string; nome: string; empresa_id: string }>(
        'SELECT versao, status, nome, empresa_id FROM projetos WHERE id = $1 AND organizacao_id = $2 FOR UPDATE',
        [projetoId, s.organizacaoId],
      )).rows[0];
      if (!atual) throw new Problema(404, 'nao_encontrado', 'Projeto não encontrado');
      if (atual.versao !== versao) throw new Problema(409, 'versao_desatualizada', 'Outra pessoa alterou este projeto. Recarregue.');
      await conferirResponsavel(tx, s.organizacaoId, d.responsavelId);

      const sets: string[] = [];
      const vals: unknown[] = [];
      for (const [campo, coluna] of Object.entries(COLUNAS)) {
        const v = d[campo as keyof typeof d];
        if (v === undefined) continue;
        vals.push(v);
        sets.push(`${coluna} = $${vals.length}`);
      }
      // concluidoEm é do back: entra ao virar concluído e sai se deixar de ser.
      const mudouStatus = d.status !== undefined && d.status !== atual.status;
      if (mudouStatus) sets.push(d.status === 'concluido' ? 'concluido_em = now()' : 'concluido_em = NULL');
      vals.push(projetoId);
      await tx.query(
        `UPDATE projetos SET ${[...sets, 'atualizado_em = now()', 'versao = versao + 1'].join(', ')} WHERE id = $${vals.length}`, vals,
      );
      const base = {
        organizacaoId: s.organizacaoId, autorAtorId: s.atorId, empresaId: atual.empresa_id, projetoId,
        alvo: { tipo: 'projeto' as const, id: projetoId, titulo: d.nome ?? atual.nome },
      };
      await registrarEvento(tx, { ...base, tipo: 'project.updated', dados: { campos: Object.keys(d), de: mudouStatus ? { status: atual.status } : undefined } });
      if (mudouStatus && d.status === 'bloqueado') await registrarEvento(tx, { ...base, tipo: 'project.blocked' });
      if (mudouStatus && atual.status === 'bloqueado') await registrarEvento(tx, { ...base, tipo: 'project.unblocked' });
    });
    return paraProjeto(await obterProjeto(db, s.organizacaoId, projetoId));
  });

  app.get('/api/projetos/:projetoId/atualizacoes', async (req) => {
    const s = exigir(req, 'projetos.ler');
    const { projetoId } = Params.parse(req.params);
    const f = z.object({ limite: Limite, cursor: z.string().optional() }).parse(req.query);
    await obterProjeto(db, s.organizacaoId, projetoId);
    const offset = decodificarCursor(f.cursor, z.object({ o: z.number().int().min(0) }))?.o ?? 0;
    const { rows } = await db.query<{ id: string; texto: string; em: string; autor: unknown }>(
      `SELECT u.id, u.texto, u.em, ${ator('a')} AS autor FROM projeto_atualizacoes u LEFT JOIN atores a ON a.id = u.autor_ator_id
        WHERE u.projeto_id = $1 ORDER BY u.em DESC, u.id DESC LIMIT $2 OFFSET $3`,
      [projetoId, f.limite + 1, offset],
    );
    return {
      itens: rows.slice(0, f.limite).map((u) => ({ ...u, em: iso(u.em) })),
      proximoCursor: rows.length > f.limite ? codificarCursor({ o: offset + f.limite }) : null,
    };
  });

  // Atualização só se acrescenta: sem versão e sem mexer na `versao` do projeto (não derruba formulário aberto).
  app.post('/api/projetos/:projetoId/atualizacoes', async (req, reply) => {
    const s = exigir(req, 'projetos.atualizar');
    const { projetoId } = Params.parse(req.params);
    const { texto } = z.strictObject({ texto: z.string().trim().min(1).max(4000) }).parse(req.body);
    const projeto = await obterProjeto(db, s.organizacaoId, projetoId);
    const nota = await db.transacao(async (tx) => {
      const { rows } = await tx.query<{ id: string; em: string }>(
        'INSERT INTO projeto_atualizacoes (organizacao_id, projeto_id, texto, autor_ator_id) VALUES ($1, $2, $3, $4) RETURNING id, em',
        [s.organizacaoId, projetoId, texto, s.atorId],
      );
      const nota = rows[0]!;
      await registrarEvento(tx, {
        organizacaoId: s.organizacaoId, tipo: 'project.updated', autorAtorId: s.atorId,
        empresaId: projeto.empresa_id, projetoId, alvo: { tipo: 'projeto', id: projetoId, titulo: projeto.nome },
        dados: { notaAndamento: { id: nota.id, texto } },
      });
      return nota;
    });
    return reply.code(201).send({
      id: nota.id, texto, em: iso(nota.em),
      autor: { id: s.atorId, tipo: 'pessoa', nome: s.nome, ativo: true, avatarUrl: null },
    });
  });
}
