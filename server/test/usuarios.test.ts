import { describe, expect, it } from 'vitest';
import { appDeTeste, entrarComo, ORIGEM } from './apoio.js';

const PROVISORIA = 'provisoria-1234';
const NOVA = 'minha-senha-nova-1';

async function preparar() {
  const { app, db } = await appDeTeste();
  const admin = await entrarComo(app, db, { email: 'admin@exemplo.com', papel: 'administrador', nome: 'Admin' });
  const chamar = (method: 'GET' | 'POST' | 'PATCH' | 'PUT', url: string, cookies = admin.cookies, payload?: object) =>
    app.inject({ method, url, cookies, headers: { origin: ORIGEM }, ...(payload ? { payload } : {}) });
  const entrar = (email: string, senha: string) =>
    app.inject({ method: 'POST', url: '/api/sessao', headers: { origin: ORIGEM }, payload: { email, senha } });
  const cookieDe = (r: Awaited<ReturnType<typeof entrar>>) =>
    ({ '__Host-hub_sessao': r.cookies.find((c) => c.name === '__Host-hub_sessao')!.value });
  return { app, db, admin, chamar, entrar, cookieDe };
}

const novaConta = { nome: 'Bia Gestora', email: 'bia@exemplo.com', papel: 'gestor', senhaProvisoria: PROVISORIA };

describe('contas de usuário', () => {
  it('administrador cria a conta; a pessoa troca a senha provisória no primeiro acesso', async () => {
    const { chamar, entrar, cookieDe } = await preparar();
    const criada = await chamar('POST', '/api/usuarios', undefined, novaConta);
    expect(criada.statusCode).toBe(201);
    expect(criada.json()).toMatchObject({ nome: 'Bia Gestora', papel: 'gestor', ativo: true, trocarSenha: true });
    expect(criada.body).not.toContain(PROVISORIA);

    const login = await entrar('bia@exemplo.com', PROVISORIA);
    expect(login.json().usuario.trocarSenha).toBe(true);
    const bia = cookieDe(login);

    const bloqueada = await chamar('GET', '/api/empresas', bia);
    expect(bloqueada.statusCode).toBe(403);
    expect(bloqueada.json().codigo).toBe('troca_de_senha_obrigatoria');
    expect((await chamar('GET', '/api/sessao', bia)).statusCode).toBe(200);

    const errada = await chamar('PUT', '/api/sessao/senha', bia, { senhaAtual: 'outra', novaSenha: NOVA });
    expect(errada.json().codigo).toBe('senha_atual_incorreta');
    const igual = await chamar('PUT', '/api/sessao/senha', bia, { senhaAtual: PROVISORIA, novaSenha: PROVISORIA });
    expect(igual.json().codigo).toBe('senha_igual');
    const curta = await chamar('PUT', '/api/sessao/senha', bia, { senhaAtual: PROVISORIA, novaSenha: 'curta' });
    expect(curta.statusCode).toBe(400);

    const trocou = await chamar('PUT', '/api/sessao/senha', bia, { senhaAtual: PROVISORIA, novaSenha: NOVA });
    expect(trocou.statusCode).toBe(200);
    expect(trocou.json().usuario.trocarSenha).toBe(false);
    expect(trocou.json().permissoes).not.toContain('usuarios.gerir');
    expect((await chamar('GET', '/api/empresas', bia)).statusCode).toBe(200);
    expect((await entrar('bia@exemplo.com', PROVISORIA)).statusCode).toBe(401);
    expect((await entrar('bia@exemplo.com', NOVA)).statusCode).toBe(200);
  });

  it('só administrador gerencia contas', async () => {
    const { app, db, chamar } = await preparar();
    const gestor = await entrarComo(app, db, { email: 'g@exemplo.com', papel: 'gestor' });
    expect((await chamar('GET', '/api/usuarios', gestor.cookies)).statusCode).toBe(403);
    expect((await chamar('POST', '/api/usuarios', gestor.cookies, novaConta)).statusCode).toBe(403);
  });

  it('e-mail repetido (sem diferenciar caixa) é 409', async () => {
    const { chamar } = await preparar();
    await chamar('POST', '/api/usuarios', undefined, novaConta);
    const r = await chamar('POST', '/api/usuarios', undefined, { ...novaConta, email: 'BIA@exemplo.com' });
    expect(r.statusCode).toBe(409);
    expect(r.json().codigo).toBe('email_em_uso');
  });

  it('desativar derruba a sessão, tira o ator do seletor e bloqueia o login', async () => {
    const { chamar, entrar, cookieDe } = await preparar();
    const { id, atorId } = (await chamar('POST', '/api/usuarios', undefined, novaConta)).json();
    const bia = cookieDe(await entrar('bia@exemplo.com', PROVISORIA));

    const r = await chamar('PATCH', `/api/usuarios/${id}`, undefined, { ativo: false });
    expect(r.json()).toMatchObject({ ativo: false });
    expect((await chamar('GET', '/api/sessao', bia)).statusCode).toBe(401);
    expect((await entrar('bia@exemplo.com', PROVISORIA)).statusCode).toBe(401);
    const atores = (await chamar('GET', '/api/atores')).json().itens.map((a: { id: string }) => a.id);
    expect(atores).not.toContain(atorId);

    await chamar('PATCH', `/api/usuarios/${id}`, undefined, { ativo: true, nome: 'Beatriz', papel: 'membro' });
    const lista = (await chamar('GET', '/api/usuarios')).json().itens;
    expect(lista.find((u: { id: string }) => u.id === id)).toMatchObject({ nome: 'Beatriz', papel: 'membro', ativo: true });
  });

  it('senha provisória nova derruba as sessões e obriga a trocar de novo', async () => {
    const { chamar, entrar, cookieDe } = await preparar();
    const { id } = (await chamar('POST', '/api/usuarios', undefined, novaConta)).json();
    const bia = cookieDe(await entrar('bia@exemplo.com', PROVISORIA));
    await chamar('PUT', '/api/sessao/senha', bia, { senhaAtual: PROVISORIA, novaSenha: NOVA });

    const r = await chamar('PUT', `/api/usuarios/${id}/senha-provisoria`, undefined, { senhaProvisoria: 'outra-provisoria-9' });
    expect(r.json().trocarSenha).toBe(true);
    expect((await chamar('GET', '/api/sessao', bia)).statusCode).toBe(401);
    expect((await entrar('bia@exemplo.com', 'outra-provisoria-9')).json().usuario.trocarSenha).toBe(true);
  });

  // Quem chama já é administrador ativo e não mexe na própria conta: o 409 `ultimo_administrador`
  // só aparece em edições simultâneas, e é o FOR UPDATE que o garante.
  it('administrador não rebaixa nem desativa a própria conta', async () => {
    const { chamar, admin } = await preparar();
    const propria = await chamar('PATCH', `/api/usuarios/${admin.usuarioId}`, undefined, { papel: 'gestor' });
    expect(propria.json().codigo).toBe('propria_conta');
    const desativar = await chamar('PATCH', `/api/usuarios/${admin.usuarioId}`, undefined, { ativo: false });
    expect(desativar.json().codigo).toBe('propria_conta');

    const outro = (await chamar('POST', '/api/usuarios', undefined, { ...novaConta, papel: 'administrador' })).json();
    expect((await chamar('PATCH', `/api/usuarios/${outro.id}`, undefined, { papel: 'gestor' })).statusCode).toBe(200);
    expect((await chamar('PATCH', `/api/usuarios/${admin.usuarioId}`, undefined, { nome: 'Admin Novo' })).statusCode).toBe(200);
  });

  it('não enxerga nem altera conta de outra organização', async () => {
    const { app, db, chamar } = await preparar();
    const outra = await entrarComo(app, db, { email: 'x@outra.com', papel: 'administrador', organizacao: 'Outra' });
    const lista = (await chamar('GET', '/api/usuarios')).json().itens.map((u: { email: string }) => u.email);
    expect(lista).toEqual(['admin@exemplo.com']);
    expect((await chamar('PATCH', `/api/usuarios/${outra.usuarioId}`, undefined, { ativo: false })).statusCode).toBe(404);
    expect((await chamar('PUT', `/api/usuarios/${outra.usuarioId}/senha-provisoria`, undefined, { senhaProvisoria: PROVISORIA }))
      .statusCode).toBe(404);
  });
});
