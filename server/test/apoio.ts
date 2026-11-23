import { PGlite } from '@electric-sql/pglite';
import { criarApp } from '../src/app.js';
import type { Db } from '../src/db.js';
import { migrar } from '../src/migrar.js';

export const ORIGEM = 'https://hub.teste';

/** Postgres em memória (PGlite) com as migrations aplicadas. */
export async function dbDeTeste(): Promise<Db> {
  const pg = new PGlite();
  const db: Db = {
    async query<T>(sql: string, params?: unknown[]) {
      if (params === undefined) {
        const r = await pg.exec(sql);
        return { rows: (r.at(-1)?.rows ?? []) as T[] };
      }
      return { rows: (await pg.query<T>(sql, params)).rows };
    },
    transacao: (fn) => pg.transaction((tx) => fn({
      async query<T>(sql: string, params?: unknown[]) {
        if (params === undefined) {
          const r = await tx.exec(sql);
          return { rows: (r.at(-1)?.rows ?? []) as T[] };
        }
        return { rows: (await tx.query<T>(sql, params)).rows };
      },
      transacao: () => { throw new Error('transação aninhada'); },
    })) as never,
  };
  await migrar(db);
  return db;
}

export async function appDeTeste() {
  const db = await dbDeTeste();
  return { db, app: criarApp(db, { origemPermitida: ORIGEM, sessaoHoras: 12 }) };
}
