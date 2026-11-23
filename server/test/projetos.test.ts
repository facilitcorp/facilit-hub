import { describe, expect, it } from 'vitest';
import { appDeTeste, entrarComo, ORIGEM } from './apoio.js';

async function preparar() {
  const { app, db } = await appDeTeste();
  const gestor = await entrarComo(app, db, { email: 'gestora@exemplo.com', papel: 'gestor', nome: 'Gestora Exemplo' });
  const membro = await entrarComo(app, db, { email: 'membro@exemplo.com', papel: 'membro', nome: 'Membro Exemplo' });
  const req = (method: 'POST' | 'PATCH' | 'DELETE', url: string, payload?: unknown, cookies = gestor.cookies) =>
    app.inject({ method, url, payload: payload as object, headers: { origin: ORIGEM }, cookies });
  const ler = (url: string, cookies = gestor.cookies) => app.inject({ url, cookies }).then((r) => r.json());
  const empresa = (await req('POST', '/api/empresas', { nome: 'Empresa Exemplo', status: 'ativa' })).json();
  return { app, db, gestor, membro, req, ler, empresa };
}

describe('projetos', () => {
  it('cria, abre, atualiza progresso/prazo/próxima ação e aparece na empresa', async () => {
    const { gestor, req, ler, empresa } = await preparar();
    const r = await req('POST', '/api/projetos', {
      empresaId: empresa.id, nome: 'Novo site', objetivo: 'Vender mais', responsavelId: gestor.atorId,
      prazoPrevisto: '2026-12-31', proximaAcao: 'Aprovar layout',
    });
    expect(r.statusCode).toBe(201);
    const p = r.json();
    expect(p).toMatchObject({
      empresa: { id: empresa.id, nome: 'Empresa Exemplo', logoUrl: null }, status: 'nao_iniciado', fase: 'descoberta',
      prioridade: 'media', progresso: 0, prazoPrevisto: '2026-12-31', responsavel: { id: gestor.atorId },
      ultimaAtualizacao: null, concluidoEm: null, versao: 1,
    });
    const u = await req('PATCH', `/api/projetos/${p.id}`, {
      versao: 1, status: 'em_andamento', fase: 'execucao', progresso: 40, prazoPrevisto: '2027-01-15', proximaAcao: 'Integrar formulário',
    });
    expect(u.json()).toMatchObject({ progresso: 40, prazoPrevisto: '2027-01-15', proximaAcao: 'Integrar formulário', versao: 2 });
    expect((await req('PATCH', `/api/projetos/${p.id}`, { versao: 1, progresso: 50 })).statusCode).toBe(409);
    expect((await req('PATCH', `/api/projetos/${p.id}`, { versao: 2, progresso: 101 })).statusCode).toBe(400);

    const daEmpresa = await ler(`/api/projetos?empresaId=${empresa.id}`);
    expect(daEmpresa.itens.map((x: { id: string }) => x.id)).toEqual([p.id]);
    expect(await ler(`/api/empresas/${empresa.id}`)).toMatchObject({ totalProjetos: 1, totalProjetosEmAndamento: 1 });
  });

  it('concluidoEm entra e sai com o status; bloqueio gera eventos', async () => {
    const { req, ler, empresa } = await preparar();
    const p = (await req('POST', '/api/projetos', { empresaId: empresa.id, nome: 'Portal' })).json();
    const b = (await req('PATCH', `/api/projetos/${p.id}`, { versao: 1, status: 'bloqueado' })).json();
    const c = (await req('PATCH', `/api/projetos/${p.id}`, { versao: b.versao, status: 'concluido' })).json();
    expect(c.concluidoEm).not.toBeNull();
    const r = (await req('PATCH', `/api/projetos/${p.id}`, { versao: c.versao, status: 'em_andamento' })).json();
    expect(r.concluidoEm).toBeNull();
    const tipos = (await ler(`/api/eventos?projetoId=${p.id}`)).itens.map((e: { tipo: string }) => e.tipo);
    expect(tipos).toEqual(expect.arrayContaining(['project.created', 'project.blocked', 'project.unblocked']));
  });

  it('membro registra atualização mas não edita; a mais recente vai para o topo', async () => {
    const { membro, req, ler, empresa } = await preparar();
    const p = (await req('POST', '/api/projetos', { empresaId: empresa.id, nome: 'Integração CRM' })).json();
    expect((await req('PATCH', `/api/projetos/${p.id}`, { versao: 1, progresso: 10 }, membro.cookies)).statusCode).toBe(403);
    await req('POST', `/api/projetos/${p.id}/atualizacoes`, { texto: 'Layout finalizado' });
    const n = await req('POST', `/api/projetos/${p.id}/atualizacoes`, { texto: 'Iniciando integração' }, membro.cookies);
    expect(n.statusCode).toBe(201);
    expect(n.json()).toMatchObject({ texto: 'Iniciando integração', autor: { nome: 'Membro Exemplo' } });
    const proj = await ler(`/api/projetos/${p.id}`);
    expect(proj.ultimaAtualizacao).toMatchObject({ texto: 'Iniciando integração', autor: { nome: 'Membro Exemplo' } });
    expect(proj.versao).toBe(1);
    const hist = await ler(`/api/projetos/${p.id}/atualizacoes`);
    expect(hist.itens.map((x: { texto: string }) => x.texto)).toEqual(['Iniciando integração', 'Layout finalizado']);
    expect((await req('POST', `/api/projetos/${p.id}/atualizacoes`, { texto: '  ' })).statusCode).toBe(400);
  });

  it('outra organização não vê nem cria projeto em empresa alheia', async () => {
    const { app, db, req, empresa } = await preparar();
    const p = (await req('POST', '/api/projetos', { empresaId: empresa.id, nome: 'Projeto X' })).json();
    const fora = await entrarComo(app, db, { email: 'fora@outra.com', papel: 'gestor', organizacao: 'Outra Organização' });
    expect((await app.inject({ url: `/api/projetos/${p.id}`, cookies: fora.cookies })).statusCode).toBe(404);
    expect((await req('POST', '/api/projetos', { empresaId: empresa.id, nome: 'Invasor' }, fora.cookies)).statusCode).toBe(400);
  });

  it('documentos: cria, filtra, edita, remove e recusa URL com credencial', async () => {
    const { req, ler, empresa } = await preparar();
    const p = (await req('POST', '/api/projetos', { empresaId: empresa.id, nome: 'Novo site' })).json();
    const d = await req('POST', '/api/documentos', { projetoId: p.id, nome: 'Figma', tipo: 'figma', url: 'https://figma.com/x' });
    expect(d.statusCode).toBe(201);
    expect(d.json()).toMatchObject({ projeto: { id: p.id, nome: 'Novo site' }, empresa: { id: empresa.id }, autor: { nome: 'Gestora Exemplo' } });
    expect((await ler(`/api/documentos?empresaId=${empresa.id}&tipo=figma`)).itens).toHaveLength(1);
    const e = await req('PATCH', `/api/documentos/${d.json().id}`, { versao: 1, observacao: 'Versão final' });
    expect(e.json()).toMatchObject({ observacao: 'Versão final', versao: 2 });
    expect((await req('POST', '/api/documentos', { projetoId: p.id, nome: 'X', tipo: 'outro', url: 'https://a:b@x.com' })).statusCode).toBe(400);
    expect((await req('DELETE', `/api/documentos/${d.json().id}`)).statusCode).toBe(204);
    expect((await ler(`/api/documentos?projetoId=${p.id}`)).itens).toHaveLength(0);
  });

  it('painel conta empresas e projetos por situação', async () => {
    const { req, ler, empresa } = await preparar();
    const hoje = new Date();
    const em = (dias: number) => new Date(hoje.getTime() + dias * 86400_000).toISOString().slice(0, 10);
    await req('POST', '/api/empresas', { nome: 'Empresa Inativa', status: 'inativa' });
    await req('POST', '/api/projetos', { empresaId: empresa.id, nome: 'Ativo perto', status: 'em_andamento', prazoPrevisto: em(3) });
    await req('POST', '/api/projetos', { empresaId: empresa.id, nome: 'Atrasado', status: 'bloqueado', prazoPrevisto: em(-2) });
    await req('POST', '/api/projetos', { empresaId: empresa.id, nome: 'Longe', status: 'em_andamento', prazoPrevisto: em(60) });
    await req('POST', '/api/projetos', { empresaId: empresa.id, nome: 'Feito', status: 'concluido', prazoPrevisto: em(1) });
    expect(await ler('/api/painel')).toMatchObject({
      totalEmpresas: 1, projetosAtivos: 2, projetosBloqueados: 1, projetosProximosDoPrazo: 2,
      projetosConcluidosRecentemente: 1, janelaPrazoDias: 7, janelaConcluidosDias: 30,
    });
    const filtro = await ler(`/api/projetos?prazoAte=${em(7)}&status=em_andamento&status=bloqueado`);
    expect(filtro.itens).toHaveLength(2);
  });
});
