import { describe, expect, it } from 'vitest';
import { cnpjValido } from '../src/validacao.js';
import { appDeTeste, entrarComo, ORIGEM } from './apoio.js';

async function preparar() {
  const { app, db } = await appDeTeste();
  const gestor = await entrarComo(app, db, { email: 'gestora@exemplo.com', papel: 'gestor', nome: 'Gestora Exemplo' });
  const membro = await entrarComo(app, db, { email: 'membro@exemplo.com', papel: 'membro' });
  const enviar = (method: 'POST' | 'PATCH', url: string, payload: unknown, cookies = gestor.cookies) =>
    app.inject({ method, url, payload: payload as object, headers: { origin: ORIGEM }, cookies });
  return { app, db, gestor, membro, enviar };
}

const COMPLETA = {
  nome: 'Empresa Exemplo',
  nomeFantasia: 'Exemplo',
  razaoSocial: 'Empresa Exemplo Ltda',
  slogan: 'Um slogan',
  descricaoCurta: 'Faz coisas de exemplo',
  descricao: 'Descrição completa',
  segmento: 'Tecnologia',
  cnpj: '11222333000181',
  telefone: '+551130000000',
  whatsapp: '+5511999990000',
  email: 'contato@exemplo.com',
  endereco: { cidade: 'São Paulo', uf: 'SP', cep: '01001000' },
  contatos: [{ nome: 'Pessoa Contato', cargo: 'Comercial' }],
  links: [{ tipo: 'site', nome: 'Site oficial', url: 'https://exemplo.com', ativo: true }],
  ferramentas: [{ nome: 'GitHub', categoria: 'desenvolvimento', url: 'https://github.com/exemplo', status: 'em_uso' }],
  observacoes: 'Notas internas',
};

describe('empresas', () => {
  it('cria com todos os campos, lê e lista', async () => {
    const { app, gestor, enviar } = await preparar();
    const r = await enviar('POST', '/api/empresas', { ...COMPLETA, responsaveis: [{ atorId: gestor.atorId, papel: 'Diretora' }] });
    expect(r.statusCode).toBe(201);
    const e = r.json();
    expect(e).toMatchObject({
      ...COMPLETA,
      status: 'em_estruturacao',
      responsaveis: [{ ator: { id: gestor.atorId, nome: 'Gestora Exemplo', tipo: 'pessoa' }, papel: 'Diretora' }],
      totalProjetos: 0, logoUrl: null, versao: 1,
    });
    const lida = (await app.inject({ url: `/api/empresas/${e.id}`, cookies: gestor.cookies })).json();
    expect(lida).toEqual(e);
    const lista = (await app.inject({ url: '/api/empresas?busca=EXEMPLO', cookies: gestor.cookies })).json();
    expect(lista.itens).toHaveLength(1);
    const ev = (await app.inject({ url: `/api/eventos?empresaId=${e.id}`, cookies: gestor.cookies })).json();
    expect(ev.itens[0]).toMatchObject({ tipo: 'company.created', alvo: { tipo: 'empresa', id: e.id } });
  });

  it('edita parcialmente, substitui listas e controla versão', async () => {
    const { enviar } = await preparar();
    const e = (await enviar('POST', '/api/empresas', COMPLETA)).json();
    const r = await enviar('PATCH', `/api/empresas/${e.id}`, {
      versao: 1, status: 'ativa', slogan: '', endereco: { bairro: 'Centro' },
      links: [{ tipo: 'instagram', nome: 'Instagram', url: 'https://instagram.com/exemplo', ativo: false }],
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({
      status: 'ativa', slogan: null, nome: 'Empresa Exemplo', versao: 2,
      endereco: { cidade: 'São Paulo', bairro: 'Centro' },
      links: [{ tipo: 'instagram', ativo: false }],
      ferramentas: COMPLETA.ferramentas,
    });
    const velho = await enviar('PATCH', `/api/empresas/${e.id}`, { versao: 1, nome: 'Outro nome' });
    expect(velho.statusCode).toBe(409);
    expect(velho.json().codigo).toBe('versao_desatualizada');
  });

  it('recusa credencial: campo de senha em ferramenta e URL com usuário:senha', async () => {
    const { enviar } = await preparar();
    const comSenha = await enviar('POST', '/api/empresas', {
      nome: 'Empresa Exemplo', ferramentas: [{ nome: 'CRM', categoria: 'crm', status: 'em_uso', senha: 'x' }],
    });
    expect(comSenha.statusCode).toBe(400);
    const urlSenha = await enviar('POST', '/api/empresas', {
      nome: 'Empresa Exemplo', links: [{ tipo: 'site', nome: 'Site', url: 'https://usuario:segredo@exemplo.com', ativo: true }],
    });
    expect(urlSenha.statusCode).toBe(400);
    expect(urlSenha.json().campos[0].campo).toBe('links.0.url');
  });

  it('valida CNPJ, telefone e status', async () => {
    const { enviar } = await preparar();
    expect(cnpjValido('11222333000181')).toBe(true);
    expect(cnpjValido('11222333000180')).toBe(false);
    const r = await enviar('POST', '/api/empresas', { nome: 'Empresa Exemplo', cnpj: '11222333000180', telefone: '1199', status: 'x' });
    expect(r.statusCode).toBe(400);
    expect(r.json().campos.map((c: { campo: string }) => c.campo).sort()).toEqual(['cnpj', 'status', 'telefone']);
  });

  it('membro lê mas não cria nem edita; outra organização não enxerga', async () => {
    const { app, db, membro, enviar } = await preparar();
    const e = (await enviar('POST', '/api/empresas', COMPLETA)).json();
    expect((await enviar('POST', '/api/empresas', COMPLETA, membro.cookies)).statusCode).toBe(403);
    expect((await enviar('PATCH', `/api/empresas/${e.id}`, { versao: 1, nome: 'X1' }, membro.cookies)).statusCode).toBe(403);
    expect((await app.inject({ url: `/api/empresas/${e.id}`, cookies: membro.cookies })).statusCode).toBe(200);
    const fora = await entrarComo(app, db, { email: 'fora@outra.com', papel: 'gestor', organizacao: 'Outra Organização' });
    expect((await app.inject({ url: `/api/empresas/${e.id}`, cookies: fora.cookies })).statusCode).toBe(404);
    expect((await app.inject({ url: '/api/empresas', cookies: fora.cookies })).json().itens).toHaveLength(0);
  });

  it('responsável inativo é recusado', async () => {
    const { db, gestor, enviar } = await preparar();
    await db.query('UPDATE atores SET ativo = false WHERE id = $1', [gestor.atorId]);
    const r = await enviar('POST', '/api/empresas', { nome: 'Empresa Exemplo', responsaveis: [{ atorId: gestor.atorId }] });
    expect(r.statusCode).toBe(400);
    expect(r.json().codigo).toBe('ator_inativo');
  });

  it('envia, lê e remove logo; recusa SVG', async () => {
    const { app, gestor } = await preparar();
    const e = (await app.inject({ method: 'POST', url: '/api/empresas', headers: { origin: ORIGEM }, cookies: gestor.cookies, payload: { nome: 'Empresa Exemplo' } })).json();
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4c50000000049454e44ae426082', 'hex');
    const multipart = (conteudo: Buffer, nome: string) => {
      const fronteira = 'xxfronteiraxx';
      return {
        headers: { origin: ORIGEM, 'content-type': `multipart/form-data; boundary=${fronteira}` },
        payload: Buffer.concat([
          Buffer.from(`--${fronteira}\r\nContent-Disposition: form-data; name="arquivo"; filename="${nome}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
          conteudo, Buffer.from(`\r\n--${fronteira}--\r\n`),
        ]),
      };
    };
    const up = await app.inject({ method: 'PUT', url: `/api/empresas/${e.id}/logo`, cookies: gestor.cookies, ...multipart(png, 'logo.png') });
    expect(up.statusCode).toBe(200);
    expect(up.json().logoUrl).toBe(`/api/empresas/${e.id}/logo?v=1`);
    const img = await app.inject({ url: up.json().logoUrl, cookies: gestor.cookies });
    expect(img.headers['content-type']).toBe('image/png');
    expect(img.rawPayload.equals(png)).toBe(true);
    expect((await app.inject({ url: up.json().logoUrl })).statusCode).toBe(401);

    const svg = await app.inject({ method: 'PUT', url: `/api/empresas/${e.id}/logo`, cookies: gestor.cookies, ...multipart(Buffer.from('<svg onload="x"/>'), 'logo.png') });
    expect(svg.statusCode).toBe(400);

    const rm = await app.inject({ method: 'DELETE', url: `/api/empresas/${e.id}/logo`, headers: { origin: ORIGEM }, cookies: gestor.cookies });
    expect(rm.json().logoUrl).toBeNull();
  });

  it('atores para o seletor de responsável', async () => {
    const { app, gestor } = await preparar();
    const r = (await app.inject({ url: '/api/atores?busca=gestora', cookies: gestor.cookies })).json();
    expect(r.itens).toEqual([expect.objectContaining({ id: gestor.atorId, tipo: 'pessoa', ativo: true })]);
  });
});
