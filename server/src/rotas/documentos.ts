import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db.js';
import { registrarEvento } from '../eventos.js';
import { codificarCursor, decodificarCursor, Limite } from '../paginacao.js';
import { Problema } from '../problema.js';
import { exigir } from '../sessao.js';
import { textoOpc, UrlExterna } from '../validacao.js';
import { obterProjeto } from './projetos.js';

const TIPO = z.enum(['github', 'figma', 'google_drive', 'homologacao', 'documentacao', 'apresentacao', 'outro']);
const campos = { nome: z.string().trim().min(1).max(160), tipo: TIPO, url: UrlExterna, observacao: textoOpc(1000) };
const DocumentoEntrada = z.strictObject({ projetoId: z.uuid(), ...campos, observacao: campos.observacao.optional() });
const DocumentoAtualizacao = z.strictObject({ versao: z.number().int(), ...z.object(campos).partial().shape });

const SELECT_DOC = `
  SELECT d.id, d.projeto_id, d.nome, d.tipo, d.url, d.observacao, d.criado_em, d.atualizado_em, d.versao,
         p.nome AS projeto_nome, e.id AS empresa_id, e.nome AS empresa_nome, li.versao AS logo_versao,
         CASE WHEN a.id IS NULL THEN NULL ELSE json_build_object('id', a.id, 'tipo', a.tipo, 'nome', a.nome, 'ativo', a.ativo, 'avatarUrl', NULL) END AS autor
    FROM documentos d
    JOIN projetos p ON p.id = d.projeto_id
    JOIN empresas e ON e.id = p.empresa_id
    LEFT JOIN empresa_imagens li ON li.empresa_id = e.id AND li.tipo = 'logo'
    LEFT JOIN atores a ON a.id = d.autor_ator_id`;

type Linha = Record<string, unknown> & { id: string; projeto_id: string; empresa_id: string; logo_versao: number | null };
const paraDocumento = (l: Linha) => ({
  id: l.id,
  projetoId: l.projeto_id,
  projeto: { id: l.projeto_id, nome: l.projeto_nome },
  empresa: { id: l.empresa_id, nome: l.empresa_nome, logoUrl: l.logo_versao == null ? null : `/api/empresas/${l.empresa_id}/logo?v=${l.logo_versao}` },
  nome: l.nome,
  tipo: l.tipo,
  url: l.url,
  observacao: l.observacao,
  autor: l.autor,
  criadoEm: new Date(l.criado_em as string).toISOString(),
  atualizadoEm: new Date(l.atualizado_em as string).toISOString(),
  versao: l.versao,
});

async function obter(db: Db, organizacaoId: string, id: string) {
  const { rows } = await db.query<Linha>(`${SELECT_DOC} WHERE d.id = $1 AND d.organizacao_id = $2`, [id, organizacaoId]);
  if (!rows[0]) throw new Problema(404, 'nao_encontrado', 'Documento não encontrado');
  return rows[0];
}

const Filtros = z.object({
  limite: Limite,
  cursor: z.string().optional(),
  projetoId: z.uuid().optional(),
  empresaId: z.uuid().optional(),
  tipo: TIPO.optional(),
  busca: z.string().max(120).optional(),
  ordem: z.enum(['nome', '-nome', 'criadoEm', '-criadoEm']).default('-criadoEm'),
});
const ORDEM = { nome: 'sem_acento(d.nome) ASC', '-nome': 'sem_acento(d.nome) DESC', criadoEm: 'd.criado_em ASC', '-criadoEm': 'd.criado_em DESC' };
const Params = z.object({ documentoId: z.uuid() });

export function rotasDocumentos(app: FastifyInstance, db: Db) {
  app.get('/api/documentos', async (req) => {
    const s = exigir(req, 'documentos.ler');
    const f = Filtros.parse(req.query);
    const offset = decodificarCursor(f.cursor, z.object({ o: z.number().int().min(0) }))?.o ?? 0;
    const params: unknown[] = [s.organizacaoId];
    const p = (v: unknown) => (params.push(v), `$${params.length}`);
    const onde = ['d.organizacao_id = $1'];
    if (f.projetoId) onde.push(`d.projeto_id = ${p(f.projetoId)}`);
    if (f.empresaId) onde.push(`p.empresa_id = ${p(f.empresaId)}`);
    if (f.tipo) onde.push(`d.tipo = ${p(f.tipo)}`);
    if (f.busca) onde.push(`sem_acento(d.nome) LIKE '%' || sem_acento(${p(f.busca)}) || '%'`);
    const { rows } = await db.query<Linha>(
      `${SELECT_DOC} WHERE ${onde.join(' AND ')} ORDER BY ${ORDEM[f.ordem]}, d.id LIMIT ${p(f.limite + 1)} OFFSET ${p(offset)}`, params,
    );
    return {
      itens: rows.slice(0, f.limite).map(paraDocumento),
      proximoCursor: rows.length > f.limite ? codificarCursor({ o: offset + f.limite }) : null,
    };
  });

  app.post('/api/documentos', async (req, reply) => {
    const s = exigir(req, 'documentos.editar');
    const d = DocumentoEntrada.parse(req.body);
    const projeto = await obterProjeto(db, s.organizacaoId, d.projetoId).catch(() => {
      throw new Problema(400, 'validacao', 'Projeto não encontrado', [{ campo: 'projetoId', codigo: 'nao_encontrado', mensagem: 'Projeto não encontrado' }]);
    });
    const id = await db.transacao(async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO documentos (organizacao_id, projeto_id, nome, tipo, url, observacao, autor_ator_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [s.organizacaoId, d.projetoId, d.nome, d.tipo, d.url, d.observacao ?? null, s.atorId],
      );
      const id = rows[0]!.id;
      await registrarEvento(tx, {
        organizacaoId: s.organizacaoId, tipo: 'document.added', autorAtorId: s.atorId,
        empresaId: projeto.empresa_id, projetoId: d.projetoId, alvo: { tipo: 'documento', id, titulo: d.nome },
        dados: { tipo: d.tipo },
      });
      return id;
    });
    return reply.code(201).send(paraDocumento(await obter(db, s.organizacaoId, id)));
  });

  app.patch('/api/documentos/:documentoId', async (req) => {
    const s = exigir(req, 'documentos.editar');
    const { documentoId } = Params.parse(req.params);
    const { versao, ...d } = DocumentoAtualizacao.parse(req.body);
    const atual = await obter(db, s.organizacaoId, documentoId);
    if (atual.versao !== versao) throw new Problema(409, 'versao_desatualizada', 'Outra pessoa alterou este documento. Recarregue.');
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const [k, v] of Object.entries(d)) {
      if (v === undefined) continue;
      vals.push(v);
      sets.push(`${k} = $${vals.length}`);
    }
    vals.push(documentoId, versao);
    const { rows } = await db.query(
      `UPDATE documentos SET ${[...sets, 'atualizado_em = now()', 'versao = versao + 1'].join(', ')}
        WHERE id = $${vals.length - 1} AND versao = $${vals.length} RETURNING id`, vals,
    );
    if (!rows.length) throw new Problema(409, 'versao_desatualizada', 'Outra pessoa alterou este documento. Recarregue.');
    return paraDocumento(await obter(db, s.organizacaoId, documentoId));
  });

  app.delete('/api/documentos/:documentoId', async (req, reply) => {
    const s = exigir(req, 'documentos.editar');
    const { documentoId } = Params.parse(req.params);
    await db.query('DELETE FROM documentos WHERE id = $1 AND organizacao_id = $2', [documentoId, s.organizacaoId]);
    return reply.code(204).send();
  });
}
