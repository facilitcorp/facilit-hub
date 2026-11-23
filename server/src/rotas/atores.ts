import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { escopo, type Db } from '../db.js';
import { codificarCursor, decodificarCursor, Limite } from '../paginacao.js';
import { exigir } from '../sessao.js';

const Filtros = z.object({
  limite: Limite,
  cursor: z.string().optional(),
  tipo: z.enum(['pessoa', 'agente', 'automacao']).optional(),
  ativo: z.enum(['true', 'false']).default('true'),
  busca: z.string().max(120).optional(),
  ordem: z.enum(['nome', '-nome']).default('nome'),
});

export function rotasAtores(app: FastifyInstance, base: Db) {
  app.get('/api/atores', async (req) => {
    const s = exigir(req, 'atores.ler');
    const db = escopo(base, s.organizacaoId);
    const f = Filtros.parse(req.query);
    const offset = decodificarCursor(f.cursor, z.object({ o: z.number().int().min(0) }))?.o ?? 0;
    const params: unknown[] = [s.organizacaoId, f.ativo === 'true'];
    const p = (v: unknown) => (params.push(v), `$${params.length}`);
    const onde = ['organizacao_id = $1', 'ativo = $2'];
    if (f.tipo) onde.push(`tipo = ${p(f.tipo)}`);
    if (f.busca) onde.push(`sem_acento(nome) LIKE '%' || sem_acento(${p(f.busca)}) || '%'`);
    const { rows } = await db.query<{ id: string; tipo: string; nome: string; ativo: boolean; descricao: string | null }>(
      `SELECT id, tipo, nome, ativo, descricao FROM atores WHERE ${onde.join(' AND ')}
        ORDER BY sem_acento(nome) ${f.ordem === 'nome' ? 'ASC' : 'DESC'}, id LIMIT ${p(f.limite + 1)} OFFSET ${p(offset)}`,
      params,
    );
    return {
      itens: rows.slice(0, f.limite).map((a) => ({ ...a, avatarUrl: null })),
      proximoCursor: rows.length > f.limite ? codificarCursor({ o: offset + f.limite }) : null,
    };
  });
}
