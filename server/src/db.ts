import pg from 'pg';

/** O mínimo que o app usa do banco: `pg.Pool` em produção, PGlite nos testes. */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  transacao<R>(fn: (tx: Db) => Promise<R>): Promise<R>;
}

export function dbDoPool(pool: pg.Pool): Db {
  return {
    query: async <T>(sql: string, params?: unknown[]) => ({ rows: (await pool.query(sql, params)).rows as T[] }),
    async transacao(fn) {
      const cliente = await pool.connect();
      try {
        await cliente.query('BEGIN');
        const tx: Db = {
          query: async <T>(sql: string, params?: unknown[]) => ({ rows: (await cliente.query(sql, params)).rows as T[] }),
          transacao: (inner) => inner(tx),
        };
        const r = await fn(tx);
        await cliente.query('COMMIT');
        return r;
      } catch (e) {
        await cliente.query('ROLLBACK');
        throw e;
      } finally {
        cliente.release();
      }
    },
  };
}
