import { describe, expect, it } from 'vitest';
import { criarUsuario } from '../src/criar-admin.js';
import { appDeTeste, ORIGEM } from './apoio.js';

const SENHA = 'senha-de-teste-123';

async function preparar() {
  const { app, db } = await appDeTeste();
  await criarUsuario(db, {
    organizacao: 'Organização Exemplo', nome: 'Ana Gestora', email: 'ana@exemplo.com', senha: SENHA, papel: 'gestor',
  });
  return { app, db };
}

const entrar = (app: Awaited<ReturnType<typeof preparar>>['app'], senha = SENHA, origin = ORIGEM) =>
  app.inject({ method: 'POST', url: '/api/sessao', headers: { origin }, payload: { email: 'ANA@exemplo.com', senha } });

describe('sessão', () => {
  it('entra, lê a sessão e sai', async () => {
    const { app } = await preparar();
    const r = await entrar(app);
    expect(r.statusCode).toBe(200);
    const cookie = r.cookies.find((c) => c.name === '__Host-hub_sessao')!;
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Strict', path: '/' });
    expect(r.json()).toMatchObject({
      usuario: { nome: 'Ana Gestora', papel: 'gestor' },
      organizacao: { nome: 'Organização Exemplo' },
    });
    expect(r.json().permissoes).toContain('projetos.editar');

    const ler = await app.inject({ url: '/api/sessao', cookies: { '__Host-hub_sessao': cookie.value } });
    expect(ler.statusCode).toBe(200);

    const sair = await app.inject({
      method: 'DELETE', url: '/api/sessao', headers: { origin: ORIGEM }, cookies: { '__Host-hub_sessao': cookie.value },
    });
    expect(sair.statusCode).toBe(204);
    const depois = await app.inject({ url: '/api/sessao', cookies: { '__Host-hub_sessao': cookie.value } });
    expect(depois.statusCode).toBe(401);
  });

  it('senha errada e e-mail inexistente dão o mesmo 401', async () => {
    const { app } = await preparar();
    const errada = await entrar(app, 'outra-senha');
    const inexistente = await app.inject({
      method: 'POST', url: '/api/sessao', headers: { origin: ORIGEM }, payload: { email: 'nao@exemplo.com', senha: SENHA },
    });
    expect(errada.statusCode).toBe(401);
    expect(inexistente.statusCode).toBe(401);
    expect(errada.json().codigo).toBe(inexistente.json().codigo);
    expect(errada.headers['content-type']).toContain('application/problem+json');
  });

  it('bloqueia com 429 depois de 10 erros', async () => {
    const { app } = await preparar();
    for (let i = 0; i < 10; i++) await entrar(app, 'errada');
    expect((await entrar(app)).statusCode).toBe(429);
  });

  it('mutação com Origin diferente é 403', async () => {
    const { app } = await preparar();
    const r = await entrar(app, SENHA, 'https://outro.site');
    expect(r.statusCode).toBe(403);
    expect(r.json().codigo).toBe('origem_invalida');
  });

  it('entrada inválida é 400 com erro por campo', async () => {
    const { app } = await preparar();
    const r = await app.inject({ method: 'POST', url: '/api/sessao', headers: { origin: ORIGEM }, payload: { email: 'x' } });
    expect(r.statusCode).toBe(400);
    expect(r.json().campos.map((c: { campo: string }) => c.campo)).toEqual(expect.arrayContaining(['email', 'senha']));
  });
});

describe('front servido pela API', () => {
  it('serve o index.html nas rotas do React, 404 em /api e /assets inexistentes e cabeçalhos de segurança', async () => {
    const { mkdtemp, writeFile } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { criarApp } = await import('../src/app.js');
    const { dbDeTeste } = await import('./apoio.js');
    const pasta = await mkdtemp(join(tmpdir(), 'web-'));
    await writeFile(join(pasta, 'index.html'), '<div id="raiz"></div>');
    const app = criarApp(await dbDeTeste(), { origemPermitida: ORIGEM, sessaoHoras: 12, webDir: pasta });
    const pagina = await app.inject({ url: '/empresas/123' });
    expect(pagina.statusCode).toBe(200);
    expect(pagina.body).toContain('raiz');
    expect(pagina.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    const api = await app.inject({ url: '/api/nao-existe' });
    expect(api.statusCode).toBe(404);
    expect(api.headers['content-type']).toContain('application/problem+json');
    // HEAD também: health check numa rota do front não pode dar 404.
    expect((await app.inject({ method: 'HEAD', url: '/usuarios' })).statusCode).toBe(200);
    const antigo = await app.inject({ url: '/assets/index-antigo.js' });
    expect(antigo.statusCode).toBe(404);
  });
});
