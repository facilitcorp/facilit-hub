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

/**
 * Banco "dentro" de uma organização: toda consulta roda numa transação com
 * `app.organizacao_id` definido, e o RLS do Postgres só deixa ver e gravar
 * linhas dessa organização (D-006). É a segunda trava, além do filtro no SQL.
 */
export function escopo(db: Db, organizacaoId: string): Db {
  const definir = (tx: Db) => tx.query("SELECT set_config('app.organizacao_id', $1, true)", [organizacaoId]);
  return {
    query: (sql, params) => db.transacao(async (tx) => {
      await definir(tx);
      return tx.query(sql, params);
    }),
    transacao: (fn) => db.transacao(async (tx) => {
      await definir(tx);
      return fn(tx);
    }),
  };
}

/** Superusuário ou BYPASSRLS ignoram o RLS: o app não sobe conectado assim. */
export async function conferirUsuarioDoBanco(db: Db) {
  const { rows } = await db.query<{ usuario: string; escapa: boolean }>(
    'SELECT current_user AS usuario, (rolsuper OR rolbypassrls) AS escapa FROM pg_roles WHERE rolname = current_user',
  );
  if (rows[0]?.escapa) {
    throw new Error(`usuário do banco "${rows[0].usuario}" ignora o RLS (superusuário ou BYPASSRLS); use um usuário comum`);
  }
}
