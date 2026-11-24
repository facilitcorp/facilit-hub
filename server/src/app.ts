import cookie from '@fastify/cookie';
import estatico from '@fastify/static';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import type { Config } from './config.js';
import type { Db } from './db.js';
import { Problema } from './problema.js';
import { rotasAtores } from './rotas/atores.js';
import { rotasEmpresas } from './rotas/empresas.js';
import { rotasDocumentos } from './rotas/documentos.js';
import { rotasEventos } from './rotas/eventos.js';
import { rotasPainel } from './rotas/painel.js';
import { rotasProjetos } from './rotas/projetos.js';
import { rotasSessao } from './rotas/sessao.js';
import { rotasUsuarios } from './rotas/usuarios.js';
import { COOKIE_SESSAO, lerSessao } from './sessao.js';

const MUTACOES = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const LIVRES_COM_SENHA_PROVISORIA = new Set(['GET /api/sessao', 'DELETE /api/sessao', 'PUT /api/sessao/senha']);

// SPA no mesmo domínio (D-005). style-src com 'unsafe-inline' por causa de atributos style do React.
const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
  "connect-src 'self'", "font-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');

export function criarApp(db: Db, config: Config) {
  const app = Fastify({ logger: config.logs ?? false, trustProxy: true });
  app.register(cookie);
  app.decorateRequest('sessao', null);

  // D-005: mutação só com Origin igual ao do Hub. Sem CORS, sem token anti-CSRF.
  app.addHook('onRequest', async (req) => {
    if (MUTACOES.has(req.method) && req.headers.origin !== config.origemPermitida) {
      throw new Problema(403, 'origem_invalida', 'Origem da requisição não permitida');
    }
  });
  app.addHook('preHandler', async (req) => {
    if (!req.url.startsWith('/api/')) return;
    req.sessao = await lerSessao(db, req.cookies[COOKIE_SESSAO]);
    // Senha provisória: até trocar, só dá para ver a sessão, sair ou trocar a senha.
    if (req.sessao?.trocarSenha && !LIVRES_COM_SENHA_PROVISORIA.has(`${req.method} ${req.routeOptions.url}`)) {
      throw new Problema(403, 'troca_de_senha_obrigatoria', 'Troque a senha provisória para continuar');
    }
  });
  app.addHook('onSend', async (_req, reply) => {
    reply.header('content-security-policy', CSP);
    reply.header('x-content-type-options', 'nosniff');
    reply.header('referrer-policy', 'same-origin');
    reply.header('strict-transport-security', 'max-age=31536000');
    reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  });

  app.setErrorHandler((erro, req, reply) => {
    let p: Problema;
    if (erro instanceof Problema) p = erro;
    else if (erro instanceof ZodError) {
      p = new Problema(400, 'validacao', 'Entrada inválida', erro.issues.map((i) => ({
        campo: i.path.join('.'), codigo: i.code, mensagem: i.message,
      })));
    } else if ((erro as { statusCode?: number }).statusCode === 400) {
      p = new Problema(400, 'validacao', 'Entrada inválida');
    } else {
      req.log.error(erro);
      p = new Problema(500, 'erro_interno', 'Erro interno');
    }
    reply.code(p.status).type('application/problem+json').send({
      type: 'about:blank', title: p.titulo, status: p.status, codigo: p.codigo,
      ...(p.campos ? { campos: p.campos } : {}),
    });
  });

  app.get('/api/saude', async () => ({ ok: true }));
  rotasSessao(app, db, config);
  rotasUsuarios(app, db);
  rotasEventos(app, db);
  rotasAtores(app, db);
  rotasEmpresas(app, db);
  rotasProjetos(app, db);
  rotasDocumentos(app, db);
  rotasPainel(app, db);

  // Front compilado (web/dist) servido pela própria API: um serviço, um domínio.
  // Rota desconhecida fora de /api devolve o index.html (o React Router resolve).
  if (config.webDir) {
    app.register(estatico, { root: config.webDir, wildcard: false, maxAge: '1h' });
    app.setNotFoundHandler((req, reply) => {
      // /assets/* inexistente é 404: aba aberta antes de uma publicação pede o .js antigo e
      // precisa de erro claro, não do index.html com 200.
      if (req.method === 'GET' && !req.url.startsWith('/api/') && !req.url.startsWith('/assets/')) {
        return reply.header('cache-control', 'no-cache').sendFile('index.html');
      }
      return reply.code(404).type('application/problem+json')
        .send({ type: 'about:blank', title: 'Não encontrado', status: 404, codigo: 'nao_encontrado' });
    });
  }
  return app;
}
