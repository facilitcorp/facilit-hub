import { comoUsuarioDoApp, dbPglite } from '../dev/pglite.js';
import { criarApp } from '../src/app.js';
import type { Db } from '../src/db.js';
import { migrar } from '../src/migrar.js';

export const ORIGEM = 'https://hub.teste';

/** Postgres em memória (PGlite) com as migrations aplicadas. */
export async function dbDeTeste(): Promise<Db> {
  const db = dbPglite();
  await migrar(db);
  await comoUsuarioDoApp(db);
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
