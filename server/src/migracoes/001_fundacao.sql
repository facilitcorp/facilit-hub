-- P1: organização, atores, usuários, sessões e eventos (D-006, D-007, D-009).

CREATE TABLE organizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  criada_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE atores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id),
  tipo text NOT NULL CHECK (tipo IN ('pessoa', 'agente', 'automacao')),
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX atores_organizacao ON atores (organizacao_id, nome);

CREATE TABLE usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id),
  ator_id uuid NOT NULL UNIQUE REFERENCES atores(id),
  email text NOT NULL,
  senha_hash text NOT NULL,
  papel text NOT NULL CHECK (papel IN ('administrador', 'gestor', 'membro')),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX usuarios_email ON usuarios (lower(email));

-- Guarda só o hash do token: quem lê o banco não consegue se passar pela sessão.
CREATE TABLE sessoes (
  token_hash text PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  criada_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL
);
CREATE INDEX sessoes_usuario ON sessoes (usuario_id);

-- Somente inserção; gravado na mesma transação da mudança (D-009).
CREATE TABLE eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id),
  tipo text NOT NULL,
  ocorreu_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  autor_ator_id uuid REFERENCES atores(id),
  empresa_id uuid,
  projeto_id uuid,
  alvo_tipo text NOT NULL,
  alvo_id uuid NOT NULL,
  alvo_titulo text,
  dados jsonb NOT NULL DEFAULT '{}',
  versao_schema integer NOT NULL DEFAULT 1
);
CREATE INDEX eventos_organizacao ON eventos (organizacao_id, ocorreu_em DESC, id DESC);
CREATE INDEX eventos_projeto ON eventos (projeto_id, ocorreu_em DESC) WHERE projeto_id IS NOT NULL;
CREATE INDEX eventos_empresa ON eventos (empresa_id, ocorreu_em DESC) WHERE empresa_id IS NOT NULL;
