import multipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db.js';
import { registrarEvento } from '../eventos.js';
import { codificarCursor, decodificarCursor, Limite, lista } from '../paginacao.js';
import { Problema } from '../problema.js';
import { exigir } from '../sessao.js';
import { Cnpj, Telefone, textoOpc, UrlExterna } from '../validacao.js';

const STATUS = ['em_estruturacao', 'ativa', 'pausada', 'inativa'] as const;

const Endereco = z.strictObject({
  logradouro: textoOpc(200).optional(),
  numero: textoOpc(20).optional(),
  complemento: textoOpc(120).optional(),
  bairro: textoOpc(120).optional(),
  cidade: textoOpc(120).optional(),
  uf: z.string().regex(/^[A-Z]{2}$/).nullable().optional(),
  cep: z.string().regex(/^[0-9]{8}$/).nullable().optional(),
  pais: z.string().regex(/^[A-Z]{2}$/).optional(),
});

const Link = z.strictObject({
  tipo: z.enum(['site', 'instagram', 'facebook', 'linkedin', 'youtube', 'whatsapp', 'google_perfil', 'tiktok', 'outro']),
  nome: z.string().trim().min(1).max(80),
  url: UrlExterna,
  ativo: z.boolean().default(true),
});

// strictObject: qualquer campo a mais (ex. "senha") é recusado com 400 (D-012).
const Ferramenta = z.strictObject({
  nome: z.string().trim().min(1).max(120),
  categoria: z.enum(['crm', 'financeiro', 'rastreamento', 'desenvolvimento', 'produtividade', 'marketing',
    'sistema_interno', 'hospedagem', 'dominio', 'analytics', 'outro']),
  descricao: textoOpc(500).optional(),
  url: UrlExterna.nullable().optional(),
  observacao: textoOpc(1000).optional(),
  status: z.enum(['em_uso', 'em_implantacao', 'descontinuada']).default('em_uso'),
});

const Contato = z.strictObject({
  nome: z.string().trim().min(2).max(160),
  cargo: textoOpc(120).optional(),
  email: z.email().max(254).nullable().optional(),
  telefone: Telefone.nullable().optional(),
  observacao: textoOpc(500).optional(),
});

const Responsavel = z.strictObject({ atorId: z.uuid(), papel: textoOpc(80).optional() });

const campos = {
  nome: z.string().trim().min(2).max(160),
  nomeFantasia: textoOpc(160),
  razaoSocial: textoOpc(200),
  slogan: textoOpc(160),
  descricaoCurta: textoOpc(280),
  descricao: textoOpc(8000),
  segmento: textoOpc(120),
  status: z.enum(STATUS),
  cnpj: Cnpj.nullable(),
  telefone: Telefone.nullable(),
  whatsapp: Telefone.nullable(),
  email: z.email().max(254).nullable(),
  links: z.array(Link).max(30),
  ferramentas: z.array(Ferramenta).max(50),
  contatos: z.array(Contato).max(30),
  endereco: Endereco.nullable(),
  observacoes: textoOpc(8000),
  responsaveis: z.array(Responsavel).max(20),
};

const EmpresaEntrada = z.strictObject({
  ...z.object(campos).partial().shape,
  nome: campos.nome,
  empresaMaeId: z.uuid().nullable().optional(),
});
const EmpresaAtualizacao = z.strictObject({ versao: z.number().int(), ...z.object(campos).partial().shape });

/** Coluna do banco de cada campo simples. Listas e endereço são tratados à parte. */
const COLUNAS = {
  nome: 'nome', nomeFantasia: 'nome_fantasia', razaoSocial: 'razao_social', slogan: 'slogan',
  descricaoCurta: 'descricao_curta', descricao: 'descricao', segmento: 'segmento', status: 'status',
  cnpj: 'cnpj', telefone: 'telefone', whatsapp: 'whatsapp', email: 'email', observacoes: 'observacoes',
  links: 'links', ferramentas: 'ferramentas', contatos: 'contatos', endereco: 'endereco',
} as const;
const JSONB = new Set(['links', 'ferramentas', 'contatos', 'endereco']);

const SELECT_EMPRESA = `
  SELECT e.*,
    (SELECT versao FROM empresa_imagens WHERE empresa_id = e.id AND tipo = 'logo') AS logo_versao,
    (SELECT versao FROM empresa_imagens WHERE empresa_id = e.id AND tipo = 'capa') AS capa_versao,
    (SELECT count(*)::int FROM projetos p WHERE p.empresa_id = e.id) AS total_projetos,
    (SELECT count(*)::int FROM projetos p WHERE p.empresa_id = e.id AND p.status = 'em_andamento') AS total_em_andamento,
    COALESCE((SELECT json_agg(json_build_object(
        'ator', json_build_object('id', a.id, 'tipo', a.tipo, 'nome', a.nome, 'ativo', a.ativo, 'avatarUrl', null),
        'papel', r.papel) ORDER BY r.ordem)
      FROM empresa_responsaveis r JOIN atores a ON a.id = r.ator_id WHERE r.empresa_id = e.id), '[]') AS responsaveis
  FROM empresas e`;

type Linha = Record<string, unknown> & { id: string; versao: number; nome: string };

const urlImagem = (id: string, tipo: string, versao: unknown) =>
  versao == null ? null : `/api/empresas/${id}/${tipo}?v=${versao}`;
const iso = (d: unknown) => (d == null ? null : new Date(d as string).toISOString());

export const paraEmpresa = (l: Linha) => ({
  id: l.id,
  organizacaoId: l.organizacao_id,
  nome: l.nome,
  nomeFantasia: l.nome_fantasia,
  razaoSocial: l.razao_social,
  slogan: l.slogan,
  descricaoCurta: l.descricao_curta,
  descricao: l.descricao,
  segmento: l.segmento,
  status: l.status,
  logoUrl: urlImagem(l.id, 'logo', l.logo_versao),
  capaUrl: urlImagem(l.id, 'capa', l.capa_versao),
  cnpj: l.cnpj,
  telefone: l.telefone,
  whatsapp: l.whatsapp,
  email: l.email,
  links: l.links,
  ferramentas: l.ferramentas,
  contatos: l.contatos,
  endereco: l.endereco,
  observacoes: l.observacoes,
  responsaveis: l.responsaveis,
  totalProjetos: l.total_projetos,
  totalProjetosEmAndamento: l.total_em_andamento,
  empresaMaeId: l.empresa_mae_id,
  criadaEm: iso(l.criada_em),
  atualizadaEm: iso(l.atualizada_em),
  versao: l.versao,
});

async function obter(db: Db, organizacaoId: string, id: string) {
  const { rows } = await db.query<Linha>(`${SELECT_EMPRESA} WHERE e.id = $1 AND e.organizacao_id = $2`, [id, organizacaoId]);
  if (!rows[0]) throw new Problema(404, 'nao_encontrado', 'Empresa não encontrada');
  return rows[0];
}

/** Substitui os responsáveis. Ator tem que ser da organização e estar ativo (D-007). */
async function gravarResponsaveis(tx: Db, organizacaoId: string, empresaId: string, lista: z.infer<typeof Responsavel>[]) {
  const ids = [...new Set(lista.map((r) => r.atorId))];
  if (ids.length !== lista.length) {
    throw new Problema(400, 'validacao', 'Ator repetido nos responsáveis', [{ campo: 'responsaveis', codigo: 'repetido', mensagem: 'Ator repetido' }]);
  }
  if (ids.length) {
    const { rows } = await tx.query<{ id: string; ativo: boolean }>(
      'SELECT id, ativo FROM atores WHERE id = ANY($1) AND organizacao_id = $2', [ids, organizacaoId],
    );
    lista.forEach((r, i) => {
      const a = rows.find((x) => x.id === r.atorId);
      if (!a) throw new Problema(400, 'validacao', 'Ator não encontrado', [{ campo: `responsaveis.${i}.atorId`, codigo: 'nao_encontrado', mensagem: 'Ator não encontrado' }]);
      if (!a.ativo) throw new Problema(400, 'ator_inativo', 'Ator inativo não recebe atribuição nova', [{ campo: `responsaveis.${i}.atorId`, codigo: 'ator_inativo', mensagem: 'Ator inativo' }]);
    });
  }
  await tx.query('DELETE FROM empresa_responsaveis WHERE empresa_id = $1', [empresaId]);
  for (const [i, r] of lista.entries()) {
    await tx.query('INSERT INTO empresa_responsaveis (empresa_id, ator_id, papel, ordem) VALUES ($1, $2, $3, $4)',
      [empresaId, r.atorId, r.papel ?? null, i]);
  }
}

const Filtros = z.object({
  limite: Limite,
  cursor: z.string().optional(),
  ordem: z.enum(['nome', '-nome', 'criadaEm', '-criadaEm']).default('nome'),
  busca: z.string().max(120).optional(),
  status: lista(z.enum(STATUS)),
});
const ORDEM = { nome: 'sem_acento(e.nome) ASC', '-nome': 'sem_acento(e.nome) DESC', criadaEm: 'e.criada_em ASC', '-criadaEm': 'e.criada_em DESC' };

// Assinaturas dos formatos aceitos: o tipo vem do conteúdo, nunca do nome do arquivo.
function mimeDe(b: Buffer): string | null {
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}
const LIMITE_IMAGEM = { logo: 2 * 1024 * 1024, capa: 5 * 1024 * 1024 };
const Imagem = z.enum(['logo', 'capa']);

export function rotasEmpresas(app: FastifyInstance, db: Db) {
  app.register(multipart, { limits: { fileSize: LIMITE_IMAGEM.capa, files: 1 } });

  app.get('/api/empresas', async (req) => {
    const s = exigir(req, 'empresas.ler');
    const f = Filtros.parse(req.query);
    const offset = decodificarCursor(f.cursor, z.object({ o: z.number().int().min(0) }))?.o ?? 0;
    const params: unknown[] = [s.organizacaoId];
    const p = (v: unknown) => (params.push(v), `$${params.length}`);
    const onde = ['e.organizacao_id = $1'];
    if (f.busca) onde.push(`sem_acento(e.nome) LIKE '%' || sem_acento(${p(f.busca)}) || '%'`);
    if (f.status?.length) onde.push(`e.status = ANY(${p(f.status)})`);
    const { rows } = await db.query<Linha>(
      `${SELECT_EMPRESA} WHERE ${onde.join(' AND ')} ORDER BY ${ORDEM[f.ordem]}, e.id LIMIT ${p(f.limite + 1)} OFFSET ${p(offset)}`,
      params,
    );
    return {
      itens: rows.slice(0, f.limite).map(paraEmpresa),
      proximoCursor: rows.length > f.limite ? codificarCursor({ o: offset + f.limite }) : null,
    };
  });

  app.post('/api/empresas', async (req, reply) => {
    const s = exigir(req, 'empresas.criar');
    const d = EmpresaEntrada.parse(req.body);
    const id = await db.transacao(async (tx) => {
      if (d.empresaMaeId) await obter(tx, s.organizacaoId, d.empresaMaeId);
      const cols = ['organizacao_id', 'empresa_mae_id'];
      const vals: unknown[] = [s.organizacaoId, d.empresaMaeId ?? null];
      for (const [campo, coluna] of Object.entries(COLUNAS)) {
        const v = d[campo as keyof typeof d];
        if (v === undefined) continue;
        cols.push(coluna);
        vals.push(JSONB.has(campo) && v !== null ? JSON.stringify(v) : v);
      }
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO empresas (${cols.join(', ')}) VALUES (${vals.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`, vals,
      );
      const id = rows[0]!.id;
      if (d.responsaveis) await gravarResponsaveis(tx, s.organizacaoId, id, d.responsaveis);
      await registrarEvento(tx, {
        organizacaoId: s.organizacaoId, tipo: 'company.created', autorAtorId: s.atorId,
        empresaId: id, alvo: { tipo: 'empresa', id, titulo: d.nome },
      });
      return id;
    });
    return reply.code(201).send(paraEmpresa(await obter(db, s.organizacaoId, id)));
  });

  app.get('/api/empresas/:empresaId', async (req) => {
    const s = exigir(req, 'empresas.ler');
    const { empresaId } = z.object({ empresaId: z.uuid() }).parse(req.params);
    return paraEmpresa(await obter(db, s.organizacaoId, empresaId));
  });

  app.patch('/api/empresas/:empresaId', async (req) => {
    const s = exigir(req, 'empresas.editar');
    const { empresaId } = z.object({ empresaId: z.uuid() }).parse(req.params);
    const { versao, ...d } = EmpresaAtualizacao.parse(req.body);
    await db.transacao(async (tx) => {
      const atual = (await tx.query<{ versao: number; endereco: Record<string, unknown> | null; nome: string }>(
        'SELECT versao, endereco, nome FROM empresas WHERE id = $1 AND organizacao_id = $2 FOR UPDATE', [empresaId, s.organizacaoId],
      )).rows[0];
      if (!atual) throw new Problema(404, 'nao_encontrado', 'Empresa não encontrada');
      if (atual.versao !== versao) throw new Problema(409, 'versao_desatualizada', 'Outra pessoa alterou esta empresa. Recarregue.');

      const sets: string[] = [];
      const vals: unknown[] = [];
      for (const [campo, coluna] of Object.entries(COLUNAS)) {
        let v: unknown = d[campo as keyof typeof d];
        if (v === undefined) continue;
        // endereço é parcial: só os campos enviados mudam; null apaga tudo.
        if (campo === 'endereco' && v !== null) v = { ...(atual.endereco ?? {}), ...(v as object) };
        vals.push(JSONB.has(campo) && v !== null ? JSON.stringify(v) : v);
        sets.push(`${coluna} = $${vals.length}`);
      }
      vals.push(empresaId);
      await tx.query(
        `UPDATE empresas SET ${[...sets, 'atualizada_em = now()', 'versao = versao + 1'].join(', ')} WHERE id = $${vals.length}`, vals,
      );
      if (d.responsaveis) await gravarResponsaveis(tx, s.organizacaoId, empresaId, d.responsaveis);
      await registrarEvento(tx, {
        organizacaoId: s.organizacaoId, tipo: 'company.updated', autorAtorId: s.atorId,
        empresaId, alvo: { tipo: 'empresa', id: empresaId, titulo: d.nome ?? atual.nome },
        dados: { campos: Object.keys(d) },
      });
    });
    return paraEmpresa(await obter(db, s.organizacaoId, empresaId));
  });

  app.get('/api/empresas/:empresaId/:imagem', async (req, reply) => {
    const s = exigir(req, 'empresas.ler');
    const { empresaId, imagem } = z.object({ empresaId: z.uuid(), imagem: Imagem }).parse(req.params);
    const { rows } = await db.query<{ mime: string; conteudo: Uint8Array }>(
      `SELECT i.mime, i.conteudo FROM empresa_imagens i JOIN empresas e ON e.id = i.empresa_id
        WHERE i.empresa_id = $1 AND i.tipo = $2 AND e.organizacao_id = $3`, [empresaId, imagem, s.organizacaoId],
    );
    if (!rows[0]) throw new Problema(404, 'nao_encontrado', 'Imagem não encontrada');
    // A URL leva ?v=versao: pode guardar em cache, mas só no navegador de quem tem sessão.
    return reply.type(rows[0].mime).header('cache-control', 'private, max-age=86400')
      .header('x-content-type-options', 'nosniff').send(Buffer.from(rows[0].conteudo));
  });

  app.put('/api/empresas/:empresaId/:imagem', async (req) => {
    const s = exigir(req, 'empresas.editar');
    const { empresaId, imagem } = z.object({ empresaId: z.uuid(), imagem: Imagem }).parse(req.params);
    await obter(db, s.organizacaoId, empresaId);
    if (!req.isMultipart()) throw new Problema(400, 'validacao', 'Envie o arquivo em multipart/form-data, campo "arquivo"');
    const arquivo = await req.file();
    if (!arquivo || arquivo.fieldname !== 'arquivo') throw new Problema(400, 'validacao', 'Campo "arquivo" ausente');
    let conteudo: Buffer;
    try {
      conteudo = await arquivo.toBuffer();
    } catch {
      throw new Problema(413, 'arquivo_grande', 'Arquivo maior que o limite');
    }
    if (conteudo.length > LIMITE_IMAGEM[imagem]) {
      throw new Problema(413, 'arquivo_grande', `Limite de ${LIMITE_IMAGEM[imagem] / 1024 / 1024} MB`);
    }
    const mime = mimeDe(conteudo);
    if (!mime) throw new Problema(400, 'formato_invalido', 'Use PNG, JPEG ou WebP');
    await db.transacao(async (tx) => {
      await tx.query(
        `INSERT INTO empresa_imagens (empresa_id, tipo, mime, conteudo) VALUES ($1, $2, $3, $4)
         ON CONFLICT (empresa_id, tipo) DO UPDATE SET mime = EXCLUDED.mime, conteudo = EXCLUDED.conteudo,
           versao = empresa_imagens.versao + 1`,
        [empresaId, imagem, mime, conteudo],
      );
      await tx.query('UPDATE empresas SET atualizada_em = now(), versao = versao + 1 WHERE id = $1', [empresaId]);
      await registrarEvento(tx, {
        organizacaoId: s.organizacaoId, tipo: 'company.updated', autorAtorId: s.atorId,
        empresaId, alvo: { tipo: 'empresa', id: empresaId }, dados: { campos: [imagem] },
      });
    });
    return paraEmpresa(await obter(db, s.organizacaoId, empresaId));
  });

  app.delete('/api/empresas/:empresaId/:imagem', async (req) => {
    const s = exigir(req, 'empresas.editar');
    const { empresaId, imagem } = z.object({ empresaId: z.uuid(), imagem: Imagem }).parse(req.params);
    await obter(db, s.organizacaoId, empresaId);
    await db.transacao(async (tx) => {
      const { rows } = await tx.query<{ tipo: string }>(
        'DELETE FROM empresa_imagens WHERE empresa_id = $1 AND tipo = $2 RETURNING tipo', [empresaId, imagem],
      );
      if (!rows.length) return;
      await tx.query('UPDATE empresas SET atualizada_em = now(), versao = versao + 1 WHERE id = $1', [empresaId]);
      await registrarEvento(tx, {
        organizacaoId: s.organizacaoId, tipo: 'company.updated', autorAtorId: s.atorId,
        empresaId, alvo: { tipo: 'empresa', id: empresaId }, dados: { campos: [imagem] },
      });
    });
    return paraEmpresa(await obter(db, s.organizacaoId, empresaId));
  });
}
