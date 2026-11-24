import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Config } from '../config.js';
import type { Db } from '../db.js';
import { Problema } from '../problema.js';
import { conferir, gerarHash, HASH_FALSO } from '../senha.js';
import {
  abrirSessao, COOKIE_SESSAO, encerrarSessao, encerrarSessoesDoUsuario, exigir, lerSessao, permissoesDe,
  type SessaoAtiva,
} from '../sessao.js';
import { NovaSenha } from '../validacao.js';

const Credenciais = z.object({
  email: z.email().max(254),
  senha: z.string().min(1).max(200),
});

const TrocaDeSenha = z.object({
  senhaAtual: z.string().min(1).max(200),
  novaSenha: NovaSenha,
});

/** Limite simples em memória: 10 tentativas erradas por e-mail a cada 15 min. Um processo só no MVP. */
const JANELA_MS = 15 * 60_000;
const MAX_TENTATIVAS = 10;
const tentativas = new Map<string, { n: number; desde: number }>();

function contarFalha(chave: string) {
  const agora = Date.now();
  const t = tentativas.get(chave);
  if (!t || agora - t.desde > JANELA_MS) tentativas.set(chave, { n: 1, desde: agora });
  else t.n++;
}
function bloqueado(chave: string) {
  const t = tentativas.get(chave);
  return !!t && Date.now() - t.desde <= JANELA_MS && t.n >= MAX_TENTATIVAS;
}

const corpoSessao = (s: SessaoAtiva) => ({
  usuario: {
    id: s.usuarioId, atorId: s.atorId, nome: s.nome, email: s.email, papel: s.papel, trocarSenha: s.trocarSenha,
  },
  organizacao: { id: s.organizacaoId, nome: s.organizacaoNome },
  permissoes: permissoesDe(s.papel),
  expiraEm: new Date(s.expiraEm).toISOString(),
});

export function rotasSessao(app: FastifyInstance, db: Db, config: Config) {
  app.get('/api/sessao', async (req) => corpoSessao(exigir(req)));

  app.post('/api/sessao', async (req, reply) => {
    const { email, senha } = Credenciais.parse(req.body);
    const chave = email.toLowerCase();
    if (bloqueado(chave)) {
      throw new Problema(429, 'muitas_tentativas', 'Muitas tentativas. Tente de novo em alguns minutos.');
    }
    const { rows } = await db.query<{ id: string; senha_hash: string }>(
      'SELECT id, senha_hash FROM usuarios WHERE lower(email) = $1 AND ativo',
      [chave],
    );
    const usuario = rows[0];
    const ok = await conferir(senha, usuario?.senha_hash ?? HASH_FALSO);
    if (!usuario || !ok) {
      contarFalha(chave);
      throw new Problema(401, 'credenciais_invalidas', 'E-mail ou senha incorretos');
    }
    tentativas.delete(chave);
    const { token, expiraEm } = await abrirSessao(db, usuario.id, config.sessaoHoras);
    reply.setCookie(COOKIE_SESSAO, token, {
      httpOnly: true, secure: true, sameSite: 'strict', path: '/', expires: expiraEm,
    });
    return corpoSessao((await lerSessao(db, token))!);
  });

  // Senha atual errada conta no mesmo limite do login: a sessão aberta não vira atalho para adivinhar senha.
  app.put('/api/sessao/senha', async (req) => {
    const s = exigir(req);
    const { senhaAtual, novaSenha } = TrocaDeSenha.parse(req.body);
    const chave = s.email.toLowerCase();
    if (bloqueado(chave)) {
      throw new Problema(429, 'muitas_tentativas', 'Muitas tentativas. Tente de novo em alguns minutos.');
    }
    const { rows } = await db.query<{ senha_hash: string }>('SELECT senha_hash FROM usuarios WHERE id = $1', [s.usuarioId]);
    if (!(await conferir(senhaAtual, rows[0]!.senha_hash))) {
      contarFalha(chave);
      throw new Problema(400, 'senha_atual_incorreta', 'A senha atual não confere');
    }
    if (senhaAtual === novaSenha) throw new Problema(400, 'senha_igual', 'A nova senha precisa ser diferente da atual');
    await db.transacao(async (tx) => {
      await tx.query(
        'UPDATE usuarios SET senha_hash = $2, trocar_senha = false, senha_trocada_em = now() WHERE id = $1',
        [s.usuarioId, await gerarHash(novaSenha)],
      );
      await encerrarSessoesDoUsuario(tx, s.usuarioId, req.cookies[COOKIE_SESSAO]);
    });
    return corpoSessao((await lerSessao(db, req.cookies[COOKIE_SESSAO]))!);
  });

  app.delete('/api/sessao', async (req, reply) => {
    await encerrarSessao(db, req.cookies[COOKIE_SESSAO]);
    reply.clearCookie(COOKIE_SESSAO, { path: '/', secure: true, httpOnly: true, sameSite: 'strict' });
    return reply.code(204).send();
  });
}
