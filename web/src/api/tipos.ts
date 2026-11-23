// Tipos provisórios espelhando o contrato v0.6.0 + campos do MVP 1 ainda não publicados.
// Serão substituídos pelos tipos gerados em src/api/gerado/ quando a main subir.

export type Id = string;
export type DataHora = string; // ISO 8601
export type Data = string; // AAAA-MM-DD

export interface AtorResumo {
  id: Id;
  nome: string;
  avatarUrl?: string;
}

export type StatusEmpresa = "em_estruturacao" | "ativa" | "pausada" | "inativa";

export interface Endereco {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  pais?: string;
}

export interface Contato {
  nome: string;
  cargo?: string;
  email?: string;
  telefone?: string;
  observacao?: string;
}

export type TipoLink =
  | "site"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "youtube"
  | "whatsapp"
  | "google_perfil"
  | "tiktok"
  | "outro";

export interface LinkCanal {
  nome: string;
  url: string;
  tipo: TipoLink;
  ativo: boolean;
}

export type CategoriaFerramenta =
  | "crm"
  | "financeiro"
  | "rastreamento"
  | "codigo"
  | "produtividade"
  | "marketing"
  | "sistema_interno"
  | "hospedagem"
  | "dominio"
  | "analytics"
  | "outro";

export type StatusFerramenta = "em_uso" | "em_avaliacao" | "descontinuada";

export interface Ferramenta {
  nome: string;
  categoria: CategoriaFerramenta;
  descricao?: string;
  link?: string;
  observacao?: string;
  status: StatusFerramenta;
}

export interface Responsavel {
  ator: AtorResumo;
  papel: string;
}

export interface Empresa {
  id: Id;
  versao: number;
  nome: string;
  nomeFantasia?: string;
  razaoSocial?: string;
  logoUrl?: string;
  capaUrl?: string;
  slogan?: string;
  descricaoCurta?: string;
  descricaoCompleta?: string;
  segmento?: string;
  status: StatusEmpresa;
  cnpj?: string;
  endereco?: Endereco;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  contatos: Contato[];
  observacoes?: string;
  links: LinkCanal[];
  ferramentas: Ferramenta[];
  responsaveis: Responsavel[];
  totalProjetos: number;
  projetosEmAndamento: number;
  atualizadoEm: DataHora;
}

export type EmpresaResumo = Pick<Empresa, "id" | "nome" | "logoUrl">;

type Opcionais<T> = { [K in keyof T]-?: undefined extends T[K] ? K : never }[keyof T];

/** PATCH com semântica de merge: ausente = não muda; null limpa (só em campo opcional). */
export type Patch<T> = { [K in Exclude<keyof T, Opcionais<T>>]?: T[K] } & {
  [K in Opcionais<T>]?: T[K] | null;
};

/** Corpo do PATCH: listas substituem a inteira; responsáveis vão como {atorId, papel}. */
export type AtualizacaoEmpresa = Patch<
  Omit<
    Empresa,
    "id" | "versao" | "responsaveis" | "totalProjetos" | "projetosEmAndamento" | "atualizadoEm"
  >
> & {
  versao: number;
  responsaveis?: { atorId: Id; papel: string }[];
};

export type StatusProjeto =
  "nao_iniciado" | "em_andamento" | "bloqueado" | "pausado" | "concluido" | "cancelado";

export type FaseProjeto = "descoberta" | "planejamento" | "execucao" | "validacao" | "entrega";

export type Prioridade = "baixa" | "media" | "alta" | "critica";

export interface NotaAndamento {
  id: Id;
  texto: string;
  autor: AtorResumo;
  em: DataHora;
}

export interface DocumentoLink {
  nome: string;
  tipo: string;
  url: string;
  observacao?: string;
}

export interface Projeto {
  id: Id;
  versao: number;
  nome: string;
  empresa: EmpresaResumo;
  descricao?: string;
  objetivo?: string;
  responsavel?: AtorResumo;
  prioridade: Prioridade;
  status: StatusProjeto;
  fase: FaseProjeto;
  progresso: number;
  inicioPrevisto?: Data;
  prazoPrevisto?: Data;
  proximosPassos?: string;
  ultimaAtualizacao?: NotaAndamento;
  documentos: DocumentoLink[];
  concluidoEm?: DataHora;
  atualizadoEm: DataHora;
}

export type AtualizacaoProjeto = Patch<
  Omit<Projeto, "id" | "versao" | "empresa" | "responsavel" | "ultimaAtualizacao" | "atualizadoEm">
> & { versao: number; responsavelId?: Id | null };

export interface NovoProjeto {
  empresaId: Id;
  nome: string;
  descricao?: string;
  responsavelId?: Id;
  prioridade?: Prioridade;
  prazoPrevisto?: Data;
}

export interface Pagina<T> {
  itens: T[];
  total: number;
}

export interface Sessao {
  ator: AtorResumo;
}
