import type {
  CategoriaFerramenta,
  Papel,
  FaseProjeto,
  Prioridade,
  StatusEmpresa,
  StatusFerramenta,
  StatusProjeto,
  TipoDocumento,
  TipoLink,
} from "@/api/tipos";

export type Tom = "neutro" | "azul" | "verde" | "amarelo" | "vermelho" | "cinza" | "roxo";

export const statusEmpresa: Record<StatusEmpresa, { rotulo: string; tom: Tom }> = {
  em_estruturacao: { rotulo: "Em estruturação", tom: "azul" },
  ativa: { rotulo: "Ativa", tom: "verde" },
  pausada: { rotulo: "Pausada", tom: "amarelo" },
  inativa: { rotulo: "Inativa", tom: "cinza" },
};

export const statusProjeto: Record<StatusProjeto, { rotulo: string; tom: Tom }> = {
  nao_iniciado: { rotulo: "Não iniciado", tom: "neutro" },
  em_andamento: { rotulo: "Em andamento", tom: "azul" },
  bloqueado: { rotulo: "Bloqueado", tom: "vermelho" },
  pausado: { rotulo: "Pausado", tom: "amarelo" },
  concluido: { rotulo: "Concluído", tom: "verde" },
  cancelado: { rotulo: "Cancelado", tom: "cinza" },
};

export const fasesProjeto: { valor: FaseProjeto; rotulo: string }[] = [
  { valor: "descoberta", rotulo: "Descoberta" },
  { valor: "planejamento", rotulo: "Planejamento" },
  { valor: "execucao", rotulo: "Execução" },
  { valor: "validacao", rotulo: "Validação" },
  { valor: "entrega", rotulo: "Entrega" },
];

export const prioridades: Record<Prioridade, { rotulo: string; tom: Tom }> = {
  baixa: { rotulo: "Baixa", tom: "neutro" },
  media: { rotulo: "Média", tom: "azul" },
  alta: { rotulo: "Alta", tom: "amarelo" },
  critica: { rotulo: "Crítica", tom: "vermelho" },
};

export const tiposLink: Record<TipoLink, string> = {
  site: "Site oficial",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  google_perfil: "Google Perfil da Empresa",
  tiktok: "TikTok",
  outro: "Outro",
};

export const categoriasFerramenta: Record<CategoriaFerramenta, string> = {
  crm: "CRM",
  financeiro: "Financeiro",
  rastreamento: "Plataforma de rastreamento",
  desenvolvimento: "Desenvolvimento (GitHub etc.)",
  produtividade: "Produtividade (Google Workspace etc.)",
  marketing: "Marketing (Meta Business etc.)",
  sistema_interno: "Sistema interno",
  hospedagem: "Hospedagem",
  dominio: "Domínio",
  analytics: "Analytics",
  outro: "Outro",
};

export const statusFerramenta: Record<StatusFerramenta, { rotulo: string; tom: Tom }> = {
  em_uso: { rotulo: "Em uso", tom: "verde" },
  em_implantacao: { rotulo: "Em implantação", tom: "azul" },
  descontinuada: { rotulo: "Descontinuada", tom: "cinza" },
};

export const tiposDocumento: Record<TipoDocumento, string> = {
  github: "GitHub",
  figma: "Figma",
  google_drive: "Google Drive",
  homologacao: "Site de homologação",
  documentacao: "Documentação",
  apresentacao: "Apresentação",
  outro: "Outro",
};

export function opcoes<K extends string>(mapa: Record<K, string | { rotulo: string }>) {
  return (Object.keys(mapa) as K[]).map((valor) => {
    const v = mapa[valor];
    return { valor, rotulo: typeof v === "string" ? v : v.rotulo };
  });
}

export const papeis: Record<Papel, { rotulo: string; descricao: string }> = {
  administrador: { rotulo: "Administrador", descricao: "Tudo, inclusive as contas de acesso" },
  gestor: { rotulo: "Gestor", descricao: "Cria e edita empresas e projetos" },
  membro: { rotulo: "Membro", descricao: "Lê e registra andamento" },
};

/** Mensagens para os `codigo` do problem+json que a interface explica melhor que o back. */
export const mensagensErro: Record<string, string> = {
  versao_desatualizada:
    "Outra pessoa alterou este registro enquanto você editava. Recarregue para ver a versão atual.",
  email_em_uso: "Já existe uma conta com esse e-mail.",
  propria_conta: "Você não pode desativar nem mudar o papel da sua própria conta.",
  ultimo_administrador: "A organização precisa de ao menos um administrador ativo.",
  senha_atual_incorreta: "A senha atual não confere.",
  senha_igual: "A nova senha precisa ser diferente da atual.",
  muitas_tentativas: "Muitas tentativas. Espere alguns minutos e tente de novo.",
};
