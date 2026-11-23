import { describe, expect, it } from 'vitest';
import { registrarEvento } from '../src/eventos.js';
import { appDeTeste, entrarComo } from './apoio.js';

describe('eventos', () => {
  it('lista do mais recente para trás, pagina e isola por organização', async () => {
    const { app, db } = await appDeTeste();
    const ana = await entrarComo(app, db, { email: 'ana@exemplo.com', papel: 'membro' });
    const outra = await entrarComo(app, db, { email: 'bia@outra.com', papel: 'gestor', organizacao: 'Outra Organização' });
    const alvo = { tipo: 'projeto' as const, id: '00000000-0000-4000-8000-000000000001', titulo: 'Projeto Exemplo' };
    for (let i = 1; i <= 3; i++) {
      await registrarEvento(db, { organizacaoId: ana.organizacaoId, tipo: 'project.updated', autorAtorId: ana.atorId, alvo, dados: { n: i } });
    }
    await registrarEvento(db, { organizacaoId: outra.organizacaoId, tipo: 'project.created', autorAtorId: null, alvo });

    const p1 = (await app.inject({ url: '/api/eventos?limite=2', cookies: ana.cookies })).json();
    expect(p1.itens.map((e: { dados: { n: number } }) => e.dados.n)).toEqual([3, 2]);
    expect(p1.itens[0].autor).toMatchObject({ id: ana.atorId, tipo: 'pessoa' });
    const p2 = (await app.inject({ url: `/api/eventos?limite=2&cursor=${p1.proximoCursor}`, cookies: ana.cookies })).json();
    expect(p2.itens.map((e: { dados: { n: number } }) => e.dados.n)).toEqual([1]);
    expect(p2.proximoCursor).toBeNull();

    // ao vivo: só os posteriores, em ordem crescente
    const vivo = (await app.inject({ url: `/api/eventos?depoisDe=${p2.itens[0].id}`, cookies: ana.cookies })).json();
    expect(vivo.itens.map((e: { dados: { n: number } }) => e.dados.n)).toEqual([2, 3]);

    const daOutra = (await app.inject({ url: '/api/eventos', cookies: outra.cookies })).json();
    expect(daOutra.itens).toHaveLength(1);
    expect(daOutra.itens[0].tipo).toBe('project.created');
  });

  it('sem sessão é 401; cursor adulterado é 400', async () => {
    const { app, db } = await appDeTeste();
    expect((await app.inject({ url: '/api/eventos' })).statusCode).toBe(401);
    const ana = await entrarComo(app, db, { email: 'ana@exemplo.com', papel: 'membro' });
    expect((await app.inject({ url: '/api/eventos?cursor=xxx', cookies: ana.cookies })).statusCode).toBe(400);
  });

  it('permissões da sessão seguem o papel', async () => {
    const { app, db } = await appDeTeste();
    const membro = await entrarComo(app, db, { email: 'm@exemplo.com', papel: 'membro' });
    const gestor = await entrarComo(app, db, { email: 'g@exemplo.com', papel: 'gestor' });
    const pm = (await app.inject({ url: '/api/sessao', cookies: membro.cookies })).json().permissoes;
    const pg = (await app.inject({ url: '/api/sessao', cookies: gestor.cookies })).json().permissoes;
    expect(pm).toContain('projetos.atualizar');
    expect(pm).not.toContain('empresas.editar');
    expect(pg).toContain('empresas.editar');
  });
});
