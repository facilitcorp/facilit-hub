import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { escopo, type Db } from '../db.js';
import { codificarCursor, decodificarCursor, Limite, lista } from '../paginacao.js';
import { exigir } from '../sessao.js';

const Filtros = z.object({
  limite: Limite,
  cursor: z.string().optional(),
  empresaId: z.uuid().optional(),
  projetoId: z.uuid().optional(),
  tipo: lista(z.string().max(60)),
  desde: z.iso.datetime({ offset: true }).optional(),
  depoisDe: z.uuid().optional(),
});
const CursorEvento = z.object({ em: z.string(), id: z.uuid() });

interface Linha {
  id: string; tipo: string; ocorreu_em: Date; em_txt: string; empresa_id: string | null; projeto_id: string | null;
  alvo_tipo: string; alvo_id: string; alvo_titulo: string | null; dados: Record<string, unknown>;
  autor_id: string | null; autor_tipo: string | null; autor_nome: string | null; autor_ativo: boolean | null;
}

const paraEvento = (l: Linha) => ({
  id: l.id,
  tipo: l.tipo,
  ocorreuEm: new Date(l.ocorreu_em).toISOString(),
  autor: l.autor_id ? { id: l.autor_id, tipo: l.autor_tipo, nome: l.autor_nome, ativo: l.autor_ativo, avatarUrl: null } : null,
  empresaId: l.empresa_id,
  projetoId: l.projeto_id,
  alvo: { tipo: l.alvo_tipo, id: l.alvo_id, titulo: l.alvo_titulo },
  dados: l.dados,
});

export function rotasEventos(app: FastifyInstance, base: Db) {
  app.get('/api/eventos', async (req) => {
    const s = exigir(req, 'eventos.ler');
    const db = escopo(base, s.organizacaoId);
    const f = Filtros.parse(req.query);
    const params: unknown[] = [s.organizacaoId];
    const onde = ['e.organizacao_id = $1'];
    const p = (v: unknown) => (params.push(v), `$${params.length}`);
    if (f.empresaId) onde.push(`e.empresa_id = ${p(f.empresaId)}`);
    if (f.projetoId) onde.push(`e.projeto_id = ${p(f.projetoId)}`);
    if (f.tipo?.length) onde.push(`e.tipo = ANY(${p(f.tipo)})`);
    if (f.desde) onde.push(`e.ocorreu_em >= ${p(f.desde)}`);

    // Cursor guarda o instante como texto do Postgres: Date do JS perde os microssegundos.
    // Ao vivo: posteriores ao `depoisDe`, em ordem crescente. Senão, do mais recente para trás.
    const aoVivo = !!f.depoisDe;
    const ancora = aoVivo
      ? (await db.query<{ em: string }>('SELECT ocorreu_em::text AS em FROM eventos WHERE id = $1 AND organizacao_id = $2', [f.depoisDe, s.organizacaoId])).rows[0]
      : undefined;
    const c = decodificarCursor(f.cursor, CursorEvento) ??
      (ancora ? { em: ancora.em, id: f.depoisDe! } : undefined);
    if (c) onde.push(`(e.ocorreu_em, e.id) ${aoVivo ? '>' : '<'} (${p(c.em)}::timestamptz, ${p(c.id)}::uuid)`);
    const dir = aoVivo ? 'ASC' : 'DESC';

    const { rows } = await db.query<Linha>(
      `SELECT e.id, e.tipo, e.ocorreu_em, e.ocorreu_em::text AS em_txt, e.empresa_id, e.projeto_id, e.alvo_tipo, e.alvo_id, e.alvo_titulo, e.dados,
              a.id AS autor_id, a.tipo AS autor_tipo, a.nome AS autor_nome, a.ativo AS autor_ativo
         FROM eventos e LEFT JOIN atores a ON a.id = e.autor_ator_id
        WHERE ${onde.join(' AND ')}
        ORDER BY e.ocorreu_em ${dir}, e.id ${dir}
        LIMIT ${p(f.limite + 1)}`,
      params,
    );
    const pagina = rows.slice(0, f.limite);
    const ultimo = pagina.at(-1);
    return {
      itens: pagina.map(paraEvento),
      proximoCursor: rows.length > f.limite && ultimo
        ? codificarCursor({ em: ultimo.em_txt, id: ultimo.id }) : null,
    };
  });
}
