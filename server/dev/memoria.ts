import { randomBytes } from 'node:crypto';
import { criarApp } from '../src/app.js';
import { criarUsuario } from '../src/criar-admin.js';
import { migrar } from '../src/migrar.js';
import { dbPglite } from './pglite.js';

// Back completo com Postgres em memória, para o front integrar sem banco nem nuvem.
// Tudo some quando o processo para. Uso: pnpm --filter @facilit-hub/server dev:memoria
const db = dbPglite();
await migrar(db);
const senha = randomBytes(9).toString('base64url');
const email = 'gestor@exemplo.com';
await criarUsuario(db, { organizacao: 'Grupo Exemplo', nome: 'Gestor Exemplo', email, senha, papel: 'gestor' });

const origem = process.env.HUB_ORIGEM ?? 'http://localhost:5173';
const porta = Number(process.env.PORT ?? 8080);
await criarApp(db, { origemPermitida: origem, sessaoHoras: 12 }).listen({ host: '127.0.0.1', port: porta });
console.log(`API em memória em http://127.0.0.1:${porta}/api (origem aceita: ${origem})`);
console.log(`login: ${email} / ${senha}`);
