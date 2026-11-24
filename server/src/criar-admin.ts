import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { conectar } from './config.js';
import type { Db } from './db.js';
import { migrar } from './migrar.js';
import { gerarHash } from './senha.js';
import type { Papel } from './sessao.js';

/**
 * Ator `pessoa` + usuário, dentro de uma transação já no escopo da organização.
 * Usado pelo comando abaixo e pela tela de usuários (`POST /usuarios`).
 */
export async function inserirConta(
  tx: Db, organizacaoId: string,
  d: { nome: string; email: string; senhaHash: string; papel: Papel; trocarSenha: boolean },
) {
  const ator = (await tx.query<{ id: string }>(
    `INSERT INTO atores (organizacao_id, tipo, nome) VALUES ($1, 'pessoa', $2) RETURNING id`, [organizacaoId, d.nome],
  )).rows[0]!;
  const usuario = (await tx.query<{ id: string }>(
    `INSERT INTO usuarios (organizacao_id, ator_id, email, senha_hash, papel, trocar_senha)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [organizacaoId, ator.id, d.email, d.senhaHash, d.papel, d.trocarSenha],
  )).rows[0]!;
  return { atorId: ator.id, usuarioId: usuario.id };
}

/** Cria a organização (se ainda não houver) e um usuário com o ator `pessoa` dele. */
export async function criarUsuario(
  db: Db,
  d: { organizacao: string; nome: string; email: string; senha: string; papel: Papel; trocarSenha?: boolean },
) {
  const senhaHash = await gerarHash(d.senha);
  return db.transacao(async (tx) => {
    let org = (await tx.query<{ id: string }>('SELECT id FROM organizacoes WHERE nome = $1', [d.organizacao])).rows[0];
    org ??= (await tx.query<{ id: string }>('INSERT INTO organizacoes (nome) VALUES ($1) RETURNING id', [d.organizacao])).rows[0]!;
    await tx.query("SELECT set_config('app.organizacao_id', $1, true)", [org.id]);
    const ids = await inserirConta(tx, org.id, { ...d, senhaHash, trocarSenha: d.trocarSenha ?? false });
    return { organizacaoId: org.id, ...ids };
  });
}

// Uso: pnpm --filter @facilit-hub/server criar-admin (na imagem: node server/dist/criar-admin.js).
// Pergunta tudo no terminal: senha nunca em argumento nem em arquivo. A senha é provisória:
// quem opera o comando não é o dono da conta, então a troca no primeiro acesso é obrigatória (D-014).
if (import.meta.url === `file://${process.argv[1]}`) {
  const rl = createInterface({ input: stdin, output: stdout });
  const organizacao = await rl.question('Organização: ');
  const nome = await rl.question('Nome: ');
  const email = await rl.question('E-mail: ');
  const senha = await rl.question('Senha provisória (mín. 12): ');
  rl.close();
  if (senha.length < 12) throw new Error('senha curta');
  const { db, fechar } = conectar();
  await migrar(db);
  await criarUsuario(db, { organizacao, nome, email, senha, papel: 'administrador', trocarSenha: true });
  console.log('usuário criado');
  await fechar();
}
