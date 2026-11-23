// Dados FICTÍCIOS para desenvolvimento e testes. Nunca use nomes de clientes reais aqui.
import type { AtorResumo, Empresa, NotaAndamento, Projeto } from "@/api/tipos";

const dia = 86_400_000;
const atras = (d: number) => new Date(Date.now() - d * dia).toISOString();
const daqui = (d: number) => new Date(Date.now() + d * dia).toISOString().slice(0, 10);

export const atores: AtorResumo[] = [
  { id: "a1", nome: "Ana Souza" },
  { id: "a2", nome: "Bruno Lima" },
  { id: "a3", nome: "Carla Mendes" },
  { id: "a4", nome: "Diego Rocha" },
];
const [ana, bruno, carla, diego] = atores as [AtorResumo, AtorResumo, AtorResumo, AtorResumo];

function empresa(e: Partial<Empresa> & Pick<Empresa, "id" | "nome" | "status">): Empresa {
  return {
    versao: 1,
    contatos: [],
    links: [],
    ferramentas: [],
    responsaveis: [],
    totalProjetos: 0,
    projetosEmAndamento: 0,
    atualizadoEm: atras(3),
    ...e,
  };
}

export function criarBase() {
  const empresas: Empresa[] = [
    empresa({
      id: "e1",
      nome: "Aurora Logística",
      nomeFantasia: "Aurora",
      razaoSocial: "Aurora Logística Ltda.",
      slogan: "Sua carga no caminho certo",
      descricaoCurta: "Transporte e armazenagem para o varejo regional.",
      descricaoCompleta:
        "Opera frota própria e centros de distribuição, atendendo redes de varejo com entregas programadas e rastreadas.",
      segmento: "Logística",
      status: "ativa",
      cnpj: "00000000000191",
      endereco: {
        logradouro: "Rua Exemplo",
        numero: "100",
        bairro: "Centro",
        cidade: "Cidade Fictícia",
        uf: "SP",
        cep: "01000000",
        pais: "BR",
      },
      telefone: "+551130000000",
      whatsapp: "+5511900000000",
      email: "contato@aurora.example",
      contatos: [{ nome: "Fernanda Alves", cargo: "Financeiro", email: "fin@aurora.example" }],
      observacoes: "Renovação do contrato de armazenagem em março.",
      links: [
        { nome: "Site", url: "https://aurora.example", tipo: "site", ativo: true },
        {
          nome: "Instagram",
          url: "https://instagram.com/aurora.example",
          tipo: "instagram",
          ativo: true,
        },
        {
          nome: "LinkedIn",
          url: "https://linkedin.com/company/aurora-example",
          tipo: "linkedin",
          ativo: false,
        },
      ],
      ferramentas: [
        {
          nome: "CRM Exemplo",
          categoria: "crm",
          descricao: "Funil comercial",
          link: "https://crm.example",
          status: "em_uso",
        },
        { nome: "GitHub", categoria: "codigo", link: "https://github.com", status: "em_uso" },
        { nome: "Analytics Exemplo", categoria: "analytics", status: "em_avaliacao" },
      ],
      responsaveis: [
        { ator: ana, papel: "Diretora" },
        { ator: bruno, papel: "Marketing" },
      ],
    }),
    empresa({
      id: "e2",
      nome: "Vértice Digital",
      slogan: "Tecnologia que aproxima",
      descricaoCurta: "Agência de produtos digitais e sites.",
      segmento: "Tecnologia",
      status: "em_estruturacao",
      responsaveis: [{ ator: carla, papel: "Gestora" }],
      links: [{ nome: "Site", url: "https://vertice.example", tipo: "site", ativo: true }],
    }),
    empresa({
      id: "e3",
      nome: "Nimbus Saúde",
      descricaoCurta: "Rede de clínicas populares.",
      segmento: "Saúde",
      status: "pausada",
    }),
  ];

  const nota = (id: string, texto: string, autor: AtorResumo, dias: number): NotaAndamento => ({
    id,
    texto,
    autor,
    em: atras(dias),
  });

  const projetos: Projeto[] = [
    {
      id: "p1",
      versao: 1,
      nome: "Novo site Aurora",
      empresa: { id: "e1", nome: "Aurora Logística" },
      descricao: "Site institucional com área do cliente.",
      objetivo: "Gerar contatos comerciais pelo site.",
      responsavel: bruno,
      prioridade: "alta",
      status: "em_andamento",
      fase: "execucao",
      progresso: 60,
      inicioPrevisto: daqui(-40),
      prazoPrevisto: daqui(10),
      proximosPassos: "Finalizar integração do formulário.",
      ultimaAtualizacao: nota(
        "n1",
        "Finalizamos o layout e agora estamos iniciando integração.",
        bruno,
        1,
      ),
      documentos: [
        { nome: "Repositório", tipo: "GitHub", url: "https://github.com/exemplo/site" },
        { nome: "Layout", tipo: "Figma", url: "https://figma.com/file/exemplo" },
      ],
      atualizadoEm: atras(1),
    },
    {
      id: "p2",
      versao: 1,
      nome: "Integração CRM",
      empresa: { id: "e1", nome: "Aurora Logística" },
      descricao: "Levar leads do site para o CRM.",
      responsavel: ana,
      prioridade: "media",
      status: "bloqueado",
      fase: "planejamento",
      progresso: 20,
      prazoPrevisto: daqui(30),
      proximosPassos: "Aguardando aprovação da diretoria.",
      ultimaAtualizacao: nota("n2", "Fornecedor ainda não liberou a API.", ana, 12),
      documentos: [],
      atualizadoEm: atras(12),
    },
    {
      id: "p3",
      versao: 1,
      nome: "Campanha de expansão",
      empresa: { id: "e1", nome: "Aurora Logística" },
      responsavel: bruno,
      prioridade: "baixa",
      status: "concluido",
      fase: "entrega",
      progresso: 100,
      documentos: [],
      concluidoEm: atras(5),
      atualizadoEm: atras(5),
    },
    {
      id: "p4",
      versao: 1,
      nome: "Portal do cliente",
      empresa: { id: "e2", nome: "Vértice Digital" },
      descricao: "Portal para clientes acompanharem pedidos.",
      responsavel: carla,
      prioridade: "critica",
      status: "em_andamento",
      fase: "validacao",
      progresso: 85,
      prazoPrevisto: daqui(4),
      proximosPassos: "Publicar versão de homologação.",
      ultimaAtualizacao: nota("n4", "Testes com 3 clientes piloto.", carla, 2),
      documentos: [
        { nome: "Homologação", tipo: "Site de homologação", url: "https://hml.vertice.example" },
      ],
      atualizadoEm: atras(2),
    },
    {
      id: "p5",
      versao: 1,
      nome: "Identidade visual",
      empresa: { id: "e2", nome: "Vértice Digital" },
      responsavel: diego,
      prioridade: "media",
      status: "nao_iniciado",
      fase: "descoberta",
      progresso: 0,
      documentos: [],
      atualizadoEm: atras(20),
    },
  ];

  const notas: Record<string, NotaAndamento[]> = {
    p1: [projetos[0]!.ultimaAtualizacao!, nota("n0", "Layout aprovado pela diretoria.", ana, 8)],
    p2: [projetos[1]!.ultimaAtualizacao!],
    p4: [projetos[3]!.ultimaAtualizacao!],
  };

  return { empresas, projetos, notas };
}
