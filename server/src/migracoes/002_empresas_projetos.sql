-- MVP 1 (D-011, D-012): empresas, projetos, atualizações e documentos.

-- Busca sem acento e sem caixa, sem depender da extensão unaccent.
CREATE FUNCTION sem_acento(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT translate(lower(t), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')
$$;

CREATE TABLE empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id),
  empresa_mae_id uuid REFERENCES empresas(id),
  nome text NOT NULL,
  nome_fantasia text,
  razao_social text,
  slogan text,
  descricao_curta text,
  descricao text,
  segmento text,
  status text NOT NULL DEFAULT 'em_estruturacao'
    CHECK (status IN ('em_estruturacao', 'ativa', 'pausada', 'inativa')),
  cnpj text CHECK (cnpj ~ '^[0-9]{14}$'),
  telefone text,
  whatsapp text,
  email text,
  endereco jsonb,
  -- Listas pequenas, sempre lidas e gravadas inteiras com a empresa (substituição no PATCH).
  links jsonb NOT NULL DEFAULT '[]',
  ferramentas jsonb NOT NULL DEFAULT '[]',
  contatos jsonb NOT NULL DEFAULT '[]',
  observacoes text,
  criada_em timestamptz NOT NULL DEFAULT now(),
  atualizada_em timestamptz NOT NULL DEFAULT now(),
  versao integer NOT NULL DEFAULT 1
);
CREATE INDEX empresas_organizacao ON empresas (organizacao_id, sem_acento(nome));

CREATE TABLE empresa_responsaveis (
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  ator_id uuid NOT NULL REFERENCES atores(id),
  papel text,
  ordem integer NOT NULL,
  PRIMARY KEY (empresa_id, ator_id)
);

-- Logo e capa privados, servidos pela API com a sessão (D-013).
CREATE TABLE empresa_imagens (
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('logo', 'capa')),
  mime text NOT NULL CHECK (mime IN ('image/png', 'image/jpeg', 'image/webp')),
  conteudo bytea NOT NULL,
  versao integer NOT NULL DEFAULT 1,
  PRIMARY KEY (empresa_id, tipo)
);

CREATE TABLE projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  nome text NOT NULL,
  descricao text,
  objetivo text,
  status text NOT NULL DEFAULT 'nao_iniciado'
    CHECK (status IN ('nao_iniciado', 'em_andamento', 'bloqueado', 'pausado', 'concluido', 'cancelado')),
  fase text NOT NULL DEFAULT 'descoberta'
    CHECK (fase IN ('descoberta', 'planejamento', 'execucao', 'validacao', 'entrega')),
  prioridade text NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
  progresso integer NOT NULL DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  responsavel_ator_id uuid REFERENCES atores(id),
  inicio_previsto date,
  prazo_previsto date,
  concluido_em timestamptz,
  proxima_acao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  versao integer NOT NULL DEFAULT 1
);
CREATE INDEX projetos_organizacao ON projetos (organizacao_id, atualizado_em DESC);
CREATE INDEX projetos_empresa ON projetos (empresa_id);

-- Atualizações de andamento: só se acrescentam.
CREATE TABLE projeto_atualizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id),
  projeto_id uuid NOT NULL REFERENCES projetos(id),
  texto text NOT NULL,
  autor_ator_id uuid REFERENCES atores(id),
  em timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX projeto_atualizacoes_projeto ON projeto_atualizacoes (projeto_id, em DESC);

CREATE TABLE documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id),
  projeto_id uuid NOT NULL REFERENCES projetos(id),
  nome text NOT NULL,
  tipo text NOT NULL
    CHECK (tipo IN ('github', 'figma', 'google_drive', 'homologacao', 'documentacao', 'apresentacao', 'outro')),
  url text NOT NULL,
  observacao text,
  autor_ator_id uuid REFERENCES atores(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  versao integer NOT NULL DEFAULT 1
);
CREATE INDEX documentos_projeto ON documentos (projeto_id);
