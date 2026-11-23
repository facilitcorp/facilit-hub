import { criarApp } from './app.js';
import { conectar, lerConfig } from './config.js';
import { conferirUsuarioDoBanco } from './db.js';
import { migrar } from './migrar.js';

const { db } = conectar();
await conferirUsuarioDoBanco(db);
await migrar(db);
const app = criarApp(db, lerConfig());
await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 8080) });
