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

import type { FastifyInstance } from 'fastify';
import { criarUsuario } from '../src/criar-admin.js';

export const SENHA = 'senha-de-teste-123';

/** Cria o usuário e devolve o cookie de uma sessão aberta. */
export async function entrarComo(
  app: FastifyInstance, db: Db,
  d: { email: string; papel: 'administrador' | 'gestor' | 'membro'; organizacao?: string; nome?: string },
) {
  const ids = await criarUsuario(db, {
    organizacao: d.organizacao ?? 'Organização Exemplo', nome: d.nome ?? d.email, email: d.email, senha: SENHA, papel: d.papel,
  });
  const r = await app.inject({ method: 'POST', url: '/api/sessao', headers: { origin: ORIGEM }, payload: { email: d.email, senha: SENHA } });
  const valor = r.cookies.find((c) => c.name === '__Host-hub_sessao')!.value;
  return { ...ids, cookies: { '__Host-hub_sessao': valor } };
}
