import type {
  CategoriaFerramenta,
  FaseProjeto,
  Prioridade,
  StatusEmpresa,
  StatusFerramenta,
  StatusProjeto,
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
  codigo: "Código (GitHub etc.)",
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
  em_avaliacao: { rotulo: "Em avaliação", tom: "azul" },
  descontinuada: { rotulo: "Descontinuada", tom: "cinza" },
};

export function opcoes<K extends string>(mapa: Record<K, string | { rotulo: string }>) {
  return (Object.keys(mapa) as K[]).map((valor) => {
    const v = mapa[valor];
    return { valor, rotulo: typeof v === "string" ? v : v.rotulo };
  });
}
