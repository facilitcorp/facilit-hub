import { createHash, randomBytes } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import type { Db } from './db.js';
import { naoAutenticado, semPermissao } from './problema.js';

export const COOKIE_SESSAO = '__Host-hub_sessao';

export type Papel = 'administrador' | 'gestor' | 'membro';

export interface SessaoAtiva {
  usuarioId: string;
  atorId: string;
  organizacaoId: string;
  organizacaoNome: string;
  nome: string;
  email: string;
  papel: Papel;
  expiraEm: Date;
}

/** Permissões por papel. O back nega pelo mesmo mapa que o front recebe em `GET /sessao`. */
const PERMISSOES: Record<Papel, readonly string[]> = {
  administrador: [
    'empresas.ler', 'empresas.criar', 'empresas.editar',
    'projetos.ler', 'projetos.criar', 'projetos.editar', 'projetos.atualizar',
    'documentos.ler', 'documentos.editar', 'atores.ler', 'eventos.ler',
  ],
  gestor: [
    'empresas.ler', 'empresas.criar', 'empresas.editar',
    'projetos.ler', 'projetos.criar', 'projetos.editar', 'projetos.atualizar',
    'documentos.ler', 'documentos.editar', 'atores.ler', 'eventos.ler',
  ],
  membro: [
    'empresas.ler', 'projetos.ler', 'projetos.atualizar',
    'documentos.ler', 'documentos.editar', 'atores.ler', 'eventos.ler',
  ],
};

export const permissoesDe = (papel: Papel) => PERMISSOES[papel];

const hashToken = (token: string) => createHash('sha256').update(token).digest('base64url');

export async function abrirSessao(db: Db, usuarioId: string, horas: number) {
  const token = randomBytes(32).toString('base64url');
  const expiraEm = new Date(Date.now() + horas * 3600_000);
  await db.query('INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES ($1, $2, $3)', [
    hashToken(token), usuarioId, expiraEm,
  ]);
  return { token, expiraEm };
}

export async function encerrarSessao(db: Db, token: string | undefined) {
  if (token) await db.query('DELETE FROM sessoes WHERE token_hash = $1', [hashToken(token)]);
}

export async function lerSessao(db: Db, token: string | undefined): Promise<SessaoAtiva | null> {
  if (!token) return null;
  const { rows } = await db.query<SessaoAtiva>(
    `SELECT u.id AS "usuarioId", u.ator_id AS "atorId", u.organizacao_id AS "organizacaoId",
            o.nome AS "organizacaoNome", a.nome, u.email, u.papel, s.expira_em AS "expiraEm"
       FROM sessoes s
       JOIN usuarios u ON u.id = s.usuario_id AND u.ativo
       JOIN atores a ON a.id = u.ator_id
       JOIN organizacoes o ON o.id = u.organizacao_id
      WHERE s.token_hash = $1 AND s.expira_em > now()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

/** Usar no começo de toda rota protegida: 401 sem sessão, 403 sem a permissão. */
export function exigir(req: FastifyRequest, permissao?: string): SessaoAtiva {
  const s = req.sessao;
  if (!s) throw naoAutenticado();
  if (permissao && !permissoesDe(s.papel).includes(permissao)) throw semPermissao();
  return s;
}

declare module 'fastify' {
  interface FastifyRequest {
    sessao: SessaoAtiva | null;
  }
}
