import cookie from '@fastify/cookie';
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
import { COOKIE_SESSAO, lerSessao } from './sessao.js';

const MUTACOES = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export function criarApp(db: Db, config: Config) {
  const app = Fastify({ logger: false, trustProxy: true });
  app.register(cookie);
  app.decorateRequest('sessao', null);

  // D-005: mutação só com Origin igual ao do Hub. Sem CORS, sem token anti-CSRF.
  app.addHook('onRequest', async (req) => {
    if (MUTACOES.has(req.method) && req.headers.origin !== config.origemPermitida) {
      throw new Problema(403, 'origem_invalida', 'Origem da requisição não permitida');
    }
  });
  app.addHook('preHandler', async (req) => {
    req.sessao = await lerSessao(db, req.cookies[COOKIE_SESSAO]);
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
  rotasEventos(app, db);
  rotasAtores(app, db);
  rotasEmpresas(app, db);
  rotasProjetos(app, db);
  rotasDocumentos(app, db);
  rotasPainel(app, db);
  return app;
}
