import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Db } from './db.js';

const pasta = fileURLToPath(new URL('./migracoes/', import.meta.url));

/** Aplica, em ordem, as migrations ainda não aplicadas. Cada uma numa transação. */
export async function migrar(db: Db): Promise<string[]> {
  await db.query(`CREATE TABLE IF NOT EXISTS migracoes (
    nome text PRIMARY KEY, aplicada_em timestamptz NOT NULL DEFAULT now())`);
  const feitas = new Set(
    (await db.query<{ nome: string }>('SELECT nome FROM migracoes')).rows.map((r) => r.nome),
  );
  const arquivos = (await readdir(pasta)).filter((f) => f.endsWith('.sql')).sort();
  const aplicadas: string[] = [];
  for (const nome of arquivos) {
    if (feitas.has(nome)) continue;
    const sql = await readFile(pasta + nome, 'utf8');
    await db.transacao(async (tx) => {
      await tx.query(sql);
      await tx.query('INSERT INTO migracoes (nome) VALUES ($1)', [nome]);
    });
    aplicadas.push(nome);
  }
  return aplicadas;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { conectar } = await import('./config.js');
  const { db, fechar } = conectar();
  console.log('aplicadas:', (await migrar(db)).join(', ') || 'nenhuma');
  await fechar();
}
