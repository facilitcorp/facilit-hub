import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { inserirConta } from '../criar-admin.js';
import { escopo, type Db } from '../db.js';
import { Problema } from '../problema.js';
import { gerarHash } from '../senha.js';
import { encerrarSessoesDoUsuario, exigir } from '../sessao.js';
import { NovaSenha } from '../validacao.js';

const Papel = z.enum(['administrador', 'gestor', 'membro']);
const Nome = z.string().trim().min(1).max(120);
const Id = z.object({ usuarioId: z.uuid() });

const Entrada = z.object({
  nome: Nome,
  email: z.email().max(254),
  papel: Papel,
  senhaProvisoria: NovaSenha,
});
const Atualizacao = z.object({ nome: Nome, papel: Papel, ativo: z.boolean() })
  .partial().refine((o) => Object.keys(o).length > 0, 'Informe ao menos um campo');
const Provisoria = z.object({ senhaProvisoria: NovaSenha });

interface Linha {
  id: string; atorId: string; nome: string; email: string; papel: string;
  ativo: boolean; trocarSenha: boolean; criadoEm: Date; senhaTrocadaEm: Date | null;
}

// `usuarios` fica fora do RLS (o login vem antes da organização): o filtro por
// organizacao_id aqui é a trava. O nome vem do ator, que está no RLS.
const SELECT_CONTA = `
  SELECT u.id, u.ator_id AS "atorId", a.nome, u.email, u.papel, u.ativo, u.trocar_senha AS "trocarSenha",
         u.criado_em AS "criadoEm", u.senha_trocada_em AS "senhaTrocadaEm"
    FROM usuarios u JOIN atores a ON a.id = u.ator_id
   WHERE u.organizacao_id = $1`;

const conta = (l: Linha) => ({
  ...l,
  criadoEm: new Date(l.criadoEm).toISOString(),
  senhaTrocadaEm: l.senhaTrocadaEm ? new Date(l.senhaTrocadaEm).toISOString() : null,
});

const naoEncontrado = () => new Problema(404, 'nao_encontrado', 'Conta não encontrada');

async function lerConta(tx: Db, organizacaoId: string, id: string) {
  const l = (await tx.query<Linha>(`${SELECT_CONTA} AND u.id = $2`, [organizacaoId, id])).rows[0];
  if (!l) throw naoEncontrado();
  return conta(l);
}

export function rotasUsuarios(app: FastifyInstance, base: Db) {
  app.get('/api/usuarios', async (req) => {
    const s = exigir(req, 'usuarios.gerir');
    const { rows } = await escopo(base, s.organizacaoId).query<Linha>(
      `${SELECT_CONTA} ORDER BY sem_acento(a.nome), u.id`, [s.organizacaoId],
    );
    return { itens: rows.map(conta) };
  });

  app.post('/api/usuarios', async (req, reply) => {
    const s = exigir(req, 'usuarios.gerir');
    const d = Entrada.parse(req.body);
    const senhaHash = await gerarHash(d.senhaProvisoria);
    const criada = await escopo(base, s.organizacaoId).transacao(async (tx) => {
      // O índice de e-mail é global (lower(email)): o login acontece antes de saber a organização.
      const existe = await tx.query('SELECT 1 FROM usuarios WHERE lower(email) = lower($1)', [d.email]);
      if (existe.rows.length) throw new Problema(409, 'email_em_uso', 'Já existe conta com esse e-mail');
      const { usuarioId } = await inserirConta(tx, s.organizacaoId, { ...d, senhaHash, trocarSenha: true });
      return lerConta(tx, s.organizacaoId, usuarioId);
    }).catch((e: unknown) => {
      if ((e as { code?: string }).code === '23505') throw new Problema(409, 'email_em_uso', 'Já existe conta com esse e-mail');
      throw e;
    });
    return reply.code(201).send(criada);
  });

  app.patch('/api/usuarios/:usuarioId', async (req) => {
    const s = exigir(req, 'usuarios.gerir');
    const { usuarioId } = Id.parse(req.params);
    const d = Atualizacao.parse(req.body);
    return escopo(base, s.organizacaoId).transacao(async (tx) => {
      // Trava as contas de administrador da organização: duas edições simultâneas
      // não conseguem, juntas, deixar a organização sem nenhum.
      const admins = (await tx.query<{ id: string }>(
        `SELECT id FROM usuarios WHERE organizacao_id = $1 AND papel = 'administrador' AND ativo FOR UPDATE`,
        [s.organizacaoId],
      )).rows.map((r) => r.id);
      const atual = await lerConta(tx, s.organizacaoId, usuarioId);
      if (usuarioId === s.usuarioId && (d.ativo === false || (d.papel && d.papel !== atual.papel))) {
        throw new Problema(400, 'propria_conta', 'Você não pode desativar nem mudar o papel da própria conta');
      }
      const deixaDeSerAdmin = admins.includes(usuarioId) && (d.ativo === false || (d.papel && d.papel !== 'administrador'));
      if (deixaDeSerAdmin && admins.length === 1) {
        throw new Problema(409, 'ultimo_administrador', 'A organização precisa de ao menos um administrador ativo');
      }
      if (d.nome !== undefined) await tx.query('UPDATE atores SET nome = $2 WHERE id = $1', [atual.atorId, d.nome]);
      if (d.ativo !== undefined) await tx.query('UPDATE atores SET ativo = $2 WHERE id = $1', [atual.atorId, d.ativo]);
      if (d.papel !== undefined || d.ativo !== undefined) {
        await tx.query('UPDATE usuarios SET papel = COALESCE($2, papel), ativo = COALESCE($3, ativo) WHERE id = $1', [
          usuarioId, d.papel ?? null, d.ativo ?? null,
        ]);
      }
      if (d.ativo === false) await encerrarSessoesDoUsuario(tx, usuarioId);
      return lerConta(tx, s.organizacaoId, usuarioId);
    });
  });

  app.put('/api/usuarios/:usuarioId/senha-provisoria', async (req) => {
    const s = exigir(req, 'usuarios.gerir');
    const { usuarioId } = Id.parse(req.params);
    const { senhaProvisoria } = Provisoria.parse(req.body);
    const hash = await gerarHash(senhaProvisoria);
    return escopo(base, s.organizacaoId).transacao(async (tx) => {
      const { rows } = await tx.query(
        'UPDATE usuarios SET senha_hash = $3, trocar_senha = true WHERE id = $1 AND organizacao_id = $2 RETURNING id',
        [usuarioId, s.organizacaoId, hash],
      );
      if (!rows.length) throw naoEncontrado();
      await encerrarSessoesDoUsuario(tx, usuarioId);
      return lerConta(tx, s.organizacaoId, usuarioId);
    });
  });
}
