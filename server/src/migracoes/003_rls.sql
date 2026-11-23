-- RLS (D-006): o Postgres só devolve e só aceita linhas da organização definida
-- na transação (`app.organizacao_id`, via `escopo()`). Sem ela definida, nada aparece.
-- FORCE vale também para o dono das tabelas; só superusuário ou BYPASSRLS escapam,
-- e o app se recusa a subir com um usuário assim (ver conferirUsuarioDoBanco).
-- Fora do RLS, de propósito: organizacoes, usuarios e sessoes (o login acontece
-- antes de se saber a organização) e migracoes.

CREATE FUNCTION organizacao_atual() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.organizacao_id', true), '')::uuid
$$;

ALTER TABLE atores ENABLE ROW LEVEL SECURITY;
ALTER TABLE atores FORCE ROW LEVEL SECURITY;
CREATE POLICY por_organizacao ON atores USING (organizacao_id = organizacao_atual());

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos FORCE ROW LEVEL SECURITY;
CREATE POLICY por_organizacao ON eventos USING (organizacao_id = organizacao_atual());

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas FORCE ROW LEVEL SECURITY;
CREATE POLICY por_organizacao ON empresas USING (organizacao_id = organizacao_atual());

ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE projetos FORCE ROW LEVEL SECURITY;
CREATE POLICY por_organizacao ON projetos USING (organizacao_id = organizacao_atual());

ALTER TABLE projeto_atualizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_atualizacoes FORCE ROW LEVEL SECURITY;
CREATE POLICY por_organizacao ON projeto_atualizacoes USING (organizacao_id = organizacao_atual());

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos FORCE ROW LEVEL SECURITY;
CREATE POLICY por_organizacao ON documentos USING (organizacao_id = organizacao_atual());

-- Sem coluna própria: herdam da empresa (cuja leitura já passa pelo RLS dela).
ALTER TABLE empresa_responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_responsaveis FORCE ROW LEVEL SECURITY;
CREATE POLICY por_organizacao ON empresa_responsaveis
  USING (EXISTS (SELECT 1 FROM empresas e WHERE e.id = empresa_id));

ALTER TABLE empresa_imagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_imagens FORCE ROW LEVEL SECURITY;
CREATE POLICY por_organizacao ON empresa_imagens
  USING (EXISTS (SELECT 1 FROM empresas e WHERE e.id = empresa_id));
