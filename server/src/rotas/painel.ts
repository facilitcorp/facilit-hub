import type { FastifyInstance } from 'fastify';
import { escopo, type Db } from '../db.js';
import { exigir } from '../sessao.js';

// Janelas da Home (D-012). Voltam na resposta para o front montar rótulo e filtro iguais.
const JANELA_PRAZO_DIAS = 7;
const JANELA_CONCLUIDOS_DIAS = 30;

export function rotasPainel(app: FastifyInstance, base: Db) {
  app.get('/api/painel', async (req) => {
    const s = exigir(req, 'projetos.ler');
    const db = escopo(base, s.organizacaoId);
    const { rows } = await db.query<Record<string, number>>(
      `SELECT
         (SELECT count(*)::int FROM empresas WHERE organizacao_id = $1 AND status <> 'inativa') AS "totalEmpresas",
         count(*) FILTER (WHERE status = 'em_andamento')::int AS "projetosAtivos",
         count(*) FILTER (WHERE status = 'bloqueado')::int AS "projetosBloqueados",
         count(*) FILTER (WHERE status NOT IN ('concluido', 'cancelado')
                            AND prazo_previsto <= current_date + $2::int)::int AS "projetosProximosDoPrazo",
         count(*) FILTER (WHERE concluido_em >= now() - make_interval(days => $3::int))::int AS "projetosConcluidosRecentemente"
       FROM projetos WHERE organizacao_id = $1`,
      [s.organizacaoId, JANELA_PRAZO_DIAS, JANELA_CONCLUIDOS_DIAS],
    );
    return {
      ...rows[0],
      janelaPrazoDias: JANELA_PRAZO_DIAS,
      janelaConcluidosDias: JANELA_CONCLUIDOS_DIAS,
      geradoEm: new Date().toISOString(),
    };
  });
}
