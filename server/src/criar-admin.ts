import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { conectar } from './config.js';
import type { Db } from './db.js';
import { migrar } from './migrar.js';
import { gerarHash } from './senha.js';

/** Cria a organização (se ainda não houver) e um usuário com o ator `pessoa` dele. */
export async function criarUsuario(
  db: Db,
  d: { organizacao: string; nome: string; email: string; senha: string; papel: 'administrador' | 'gestor' | 'membro' },
) {
  const hash = await gerarHash(d.senha);
  return db.transacao(async (tx) => {
    let org = (await tx.query<{ id: string }>('SELECT id FROM organizacoes WHERE nome = $1', [d.organizacao])).rows[0];
    org ??= (await tx.query<{ id: string }>('INSERT INTO organizacoes (nome) VALUES ($1) RETURNING id', [d.organizacao])).rows[0]!;
    const ator = (await tx.query<{ id: string }>(
      `INSERT INTO atores (organizacao_id, tipo, nome) VALUES ($1, 'pessoa', $2) RETURNING id`, [org.id, d.nome],
    )).rows[0]!;
    const usuario = (await tx.query<{ id: string }>(
      `INSERT INTO usuarios (organizacao_id, ator_id, email, senha_hash, papel) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [org.id, ator.id, d.email, hash, d.papel],
    )).rows[0]!;
    return { organizacaoId: org.id, atorId: ator.id, usuarioId: usuario.id };
  });
}

// Uso: pnpm --filter @facilit-hub/server criar-admin. Pergunta tudo no terminal: senha nunca em argumento nem em arquivo.
if (import.meta.url === `file://${process.argv[1]}`) {
  const rl = createInterface({ input: stdin, output: stdout });
  const organizacao = await rl.question('Organização: ');
  const nome = await rl.question('Nome: ');
  const email = await rl.question('E-mail: ');
  const senha = await rl.question('Senha (mín. 12): ');
  rl.close();
  if (senha.length < 12) throw new Error('senha curta');
  const { db, fechar } = conectar();
  await migrar(db);
  await criarUsuario(db, { organizacao, nome, email, senha, papel: 'administrador' });
  console.log('usuário criado');
  await fechar();
}
