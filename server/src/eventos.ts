import type { Db } from './db.js';

export type TipoAlvo = 'empresa' | 'projeto' | 'demanda' | 'tarefa' | 'decisao' | 'documento';

export interface NovoEvento {
  organizacaoId: string;
  tipo: string;
  autorAtorId: string | null;
  empresaId?: string | null;
  projetoId?: string | null;
  alvo: { tipo: TipoAlvo; id: string; titulo?: string | null };
  dados?: Record<string, unknown>;
}

/** Grava o evento. Chamar com o `tx` da mesma transação da mudança (D-009). */
export async function registrarEvento(tx: Db, e: NovoEvento) {
  await tx.query(
    `INSERT INTO eventos (organizacao_id, tipo, autor_ator_id, empresa_id, projeto_id, alvo_tipo, alvo_id, alvo_titulo, dados)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [e.organizacaoId, e.tipo, e.autorAtorId, e.empresaId ?? null, e.projetoId ?? null,
      e.alvo.tipo, e.alvo.id, e.alvo.titulo ?? null, JSON.stringify(e.dados ?? {})],
  );
}
