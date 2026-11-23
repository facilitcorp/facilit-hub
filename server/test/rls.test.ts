import { describe, expect, it } from 'vitest';
import { conferirUsuarioDoBanco, escopo } from '../src/db.js';
import { appDeTeste, entrarComo, ORIGEM } from './apoio.js';

// Prova que o isolamento não depende só do `WHERE organizacao_id` das rotas:
// as consultas aqui NÃO filtram por organização, e mesmo assim o Postgres barra.
describe('RLS por organização', () => {
  it('sem filtro no SQL, cada organização só enxerga e só grava o que é seu', async () => {
    const { app, db } = await appDeTeste();
    const a = await entrarComo(app, db, { email: 'a@exemplo.com', papel: 'gestor', organizacao: 'Organização A' });
    const b = await entrarComo(app, db, { email: 'b@outra.com', papel: 'gestor', organizacao: 'Organização B' });
    const env = (url: string, payload: object, cookies: object) =>
      app.inject({ method: 'POST', url, payload, headers: { origin: ORIGEM }, cookies: cookies as Record<string, string> });
    const ea = (await env('/api/empresas', { nome: 'Empresa da A' }, a.cookies)).json();
    await env('/api/projetos', { empresaId: ea.id, nome: 'Projeto da A' }, a.cookies);
    await env('/api/empresas', { nome: 'Empresa da B' }, b.cookies);

    const daB = escopo(db, b.organizacaoId);
    for (const tabela of ['empresas', 'projetos', 'eventos', 'atores']) {
      const { rows } = await daB.query<{ organizacao_id: string }>(`SELECT organizacao_id FROM ${tabela}`);
      expect(rows.every((r) => r.organizacao_id === b.organizacaoId), tabela).toBe(true);
    }
    expect((await daB.query('SELECT 1 FROM projetos')).rows).toHaveLength(0);
    // UPDATE/DELETE em linha da outra organização não alcança nada
    expect((await daB.query('UPDATE empresas SET nome = $1 WHERE id = $2 RETURNING id', ['Invadida', ea.id])).rows).toHaveLength(0);
    expect((await daB.query('DELETE FROM empresas WHERE id = $1 RETURNING id', [ea.id])).rows).toHaveLength(0);
    // gravar em nome da outra organização é recusado pelo banco
    await expect(daB.query('INSERT INTO empresas (organizacao_id, nome) VALUES ($1, $2)', [a.organizacaoId, 'Intrusa'])).rejects.toThrow(/row-level security/);
    // tabelas sem coluna própria herdam da empresa
    await expect(daB.query("INSERT INTO empresa_imagens (empresa_id, tipo, mime, conteudo) VALUES ($1, 'logo', 'image/png', '\\x00')", [ea.id])).rejects.toThrow(/row-level security/);

    expect((await escopo(db, a.organizacaoId).query<{ nome: string }>('SELECT nome FROM empresas WHERE id = $1', [ea.id])).rows[0]?.nome).toBe('Empresa da A');
  });

  it('sem organização definida, nada aparece', async () => {
    const { app, db } = await appDeTeste();
    const a = await entrarComo(app, db, { email: 'a@exemplo.com', papel: 'gestor' });
    await app.inject({ method: 'POST', url: '/api/empresas', payload: { nome: 'Empresa Exemplo' }, headers: { origin: ORIGEM }, cookies: a.cookies });
    expect((await db.query('SELECT 1 FROM empresas')).rows).toHaveLength(0);
    expect((await db.query('SELECT 1 FROM atores')).rows).toHaveLength(0);
  });

  it('o usuário do banco nos testes é comum (não ignora o RLS)', async () => {
    const { db } = await appDeTeste();
    await expect(conferirUsuarioDoBanco(db)).resolves.toBeUndefined();
  });
});
