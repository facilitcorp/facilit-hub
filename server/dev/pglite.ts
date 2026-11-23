import { PGlite } from '@electric-sql/pglite';
import type { Db } from '../src/db.js';

/** Postgres em memória (PGlite) com a mesma interface do pool. Só para testes e `dev:memoria`. */
export function dbPglite(): Db {
  const pg = new PGlite();
  type Executor = Pick<PGlite, 'query' | 'exec'>;
  const consultar = (ex: Executor) => async <T>(sql: string, params?: unknown[]) => {
    // Sem parâmetros pode ter vários comandos (migrations): exec. Com parâmetros: query.
    if (params === undefined) return { rows: ((await ex.exec(sql)).at(-1)?.rows ?? []) as T[] };
    return { rows: (await ex.query<T>(sql, params)).rows };
  };
  return {
    query: consultar(pg),
    transacao: (fn) => pg.transaction((tx) => fn({
      query: consultar(tx),
      transacao: () => { throw new Error('transação aninhada'); },
    })),
  };
}

/**
 * O PGlite conecta como superusuário, que ignora o RLS. Depois das migrations,
 * passa a rodar como um papel comum, igual ao usuário do app em produção.
 */
export async function comoUsuarioDoApp(db: Db) {
  await db.query(`
    CREATE ROLE hub_app NOSUPERUSER NOBYPASSRLS;
    GRANT USAGE ON SCHEMA public TO hub_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hub_app;
    SET ROLE hub_app;`);
}
