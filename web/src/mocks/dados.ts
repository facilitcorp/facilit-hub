// Dados FICTÍCIOS para desenvolvimento e testes. Nunca use nomes de clientes reais aqui.
import type { AtorResumo, Documento, Empresa, NotaAndamento, Projeto } from "@/api/tipos";

const dia = 86_400_000;
const atras = (d: number) => new Date(Date.now() - d * dia).toISOString();
const daqui = (d: number) => new Date(Date.now() + d * dia).toISOString().slice(0, 10);

export const ORG = "org-1";

const pessoa = (id: string, nome: string): AtorResumo => ({
  id,
  tipo: "pessoa",
  nome,
  ativo: true,
});
export const atores: AtorResumo[] = [
  pessoa("a1", "Ana Souza"),
  pessoa("a2", "Bruno Lima"),
  pessoa("a3", "Carla Mendes"),
  pessoa("a4", "Diego Rocha"),
];
const [ana, bruno, carla, diego] = atores as [AtorResumo, AtorResumo, AtorResumo, AtorResumo];

export function novaEmpresa(e: Partial<Empresa> & Pick<Empresa, "id" | "nome">): Empresa {
  return {
    organizacaoId: ORG,
    nomeFantasia: null,
    razaoSocial: null,
    slogan: null,
    descricaoCurta: null,
    descricao: null,
    segmento: null,
    status: "em_estruturacao",
    logoUrl: null,
    capaUrl: null,
    cnpj: null,
    telefone: null,
    whatsapp: null,
    email: null,
    links: [],
    ferramentas: [],
    contatos: [],
    endereco: null,
    observacoes: null,
    responsaveis: [],
    totalProjetos: 0,
    totalProjetosEmAndamento: 0,
    empresaMaeId: null,
    criadaEm: atras(60),
    atualizadaEm: atras(3),
    versao: 1,
    ...e,
  };
}

export function novoProjeto(
  p: Partial<Projeto> & Pick<Projeto, "id" | "nome"> & { empresa: Projeto["empresa"] },
): Projeto {
  return {
    empresaId: p.empresa.id,
    descricao: null,
    objetivo: null,
    status: "nao_iniciado",
    fase: "descoberta",
    prioridade: "media",
    progresso: 0,
    responsavel: null,
    inicioPrevisto: null,
    prazoPrevisto: null,
    concluidoEm: null,
    ultimaAtualizacao: null,
    proximaAcao: null,
    criadoEm: atras(30),
    atualizadoEm: atras(3),
    versao: 1,
    ...p,
  };
}

export function criarBase() {
  const empresas: Empresa[] = [
    novaEmpresa({
      id: "e1",
      nome: "Aurora Logística",
      nomeFantasia: "Aurora",
      razaoSocial: "Aurora Logística Ltda.",
      slogan: "Sua carga no caminho certo",
      descricaoCurta: "Transporte e armazenagem para o varejo regional.",
      descricao:
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
          url: "https://crm.example",
          status: "em_uso",
        },
        {
          nome: "GitHub",
          categoria: "desenvolvimento",
          url: "https://github.com",
          status: "em_uso",
        },
        { nome: "Analytics Exemplo", categoria: "analytics", status: "em_implantacao" },
      ],
      responsaveis: [
        { ator: ana, papel: "Diretora" },
        { ator: bruno, papel: "Marketing" },
      ],
    }),
    novaEmpresa({
      id: "e2",
      nome: "Vértice Digital",
      slogan: "Tecnologia que aproxima",
      descricaoCurta: "Agência de produtos digitais e sites.",
      segmento: "Tecnologia",
      responsaveis: [{ ator: carla, papel: "Gestora" }],
      links: [{ nome: "Site", url: "https://vertice.example", tipo: "site", ativo: true }],
    }),
    novaEmpresa({
      id: "e3",
      nome: "Nimbus Saúde",
      descricaoCurta: "Rede de clínicas populares.",
      segmento: "Saúde",
      status: "pausada",
    }),
  ];
  const resumo = (id: string) => {
    const e = empresas.find((x) => x.id === id)!;
    return { id: e.id, nome: e.nome, logoUrl: e.logoUrl };
  };

  const nota = (id: string, texto: string, autor: AtorResumo, dias: number): NotaAndamento => ({
    id,
    texto,
    autor,
    em: atras(dias),
  });

  const projetos: Projeto[] = [
    novoProjeto({
      id: "p1",
      nome: "Novo site Aurora",
      empresa: resumo("e1"),
      descricao: "Site institucional com área do cliente.",
      objetivo: "Gerar contatos comerciais pelo site.",
      responsavel: bruno,
      prioridade: "alta",
      status: "em_andamento",
      fase: "execucao",
      progresso: 60,
      inicioPrevisto: daqui(-40),
      prazoPrevisto: daqui(5),
      proximaAcao: "Finalizar integração do formulário.",
      ultimaAtualizacao: nota(
        "n1",
        "Finalizamos o layout e agora estamos iniciando integração.",
        bruno,
        1,
      ),
      atualizadoEm: atras(1),
    }),
    novoProjeto({
      id: "p2",
      nome: "Integração CRM",
      empresa: resumo("e1"),
      descricao: "Levar leads do site para o CRM.",
      responsavel: ana,
      status: "bloqueado",
      fase: "planejamento",
      progresso: 20,
      prazoPrevisto: daqui(30),
      proximaAcao: "Aguardando aprovação da diretoria.",
      ultimaAtualizacao: nota("n2", "Fornecedor ainda não liberou a API.", ana, 12),
      atualizadoEm: atras(12),
    }),
    novoProjeto({
      id: "p3",
      nome: "Campanha de expansão",
      empresa: resumo("e1"),
      responsavel: bruno,
      prioridade: "baixa",
      status: "concluido",
      fase: "entrega",
      progresso: 100,
      concluidoEm: atras(5),
      atualizadoEm: atras(5),
    }),
    novoProjeto({
      id: "p4",
      nome: "Portal do cliente",
      empresa: resumo("e2"),
      descricao: "Portal para clientes acompanharem pedidos.",
      responsavel: carla,
      prioridade: "critica",
      status: "em_andamento",
      fase: "validacao",
      progresso: 85,
      prazoPrevisto: daqui(4),
      proximaAcao: "Publicar versão de homologação.",
      ultimaAtualizacao: nota("n4", "Testes com 3 clientes piloto.", carla, 2),
      atualizadoEm: atras(2),
    }),
    novoProjeto({ id: "p5", nome: "Identidade visual", empresa: resumo("e2"), responsavel: diego }),
  ];

  const notas: Record<string, NotaAndamento[]> = {
    p1: [projetos[0]!.ultimaAtualizacao!, nota("n0", "Layout aprovado pela diretoria.", ana, 8)],
    p2: [projetos[1]!.ultimaAtualizacao!],
    p4: [projetos[3]!.ultimaAtualizacao!],
  };

  const doc = (id: string, p: Projeto, d: Pick<Documento, "nome" | "tipo" | "url">): Documento => ({
    id,
    projetoId: p.id,
    projeto: { id: p.id, nome: p.nome },
    empresa: p.empresa,
    observacao: null,
    autor: ana,
    criadoEm: atras(10),
    atualizadoEm: atras(10),
    versao: 1,
    ...d,
  });
  const documentos: Documento[] = [
    doc("d1", projetos[0]!, {
      nome: "Repositório",
      tipo: "github",
      url: "https://github.com/exemplo/site",
    }),
    doc("d2", projetos[0]!, {
      nome: "Layout",
      tipo: "figma",
      url: "https://figma.com/file/exemplo",
    }),
    doc("d3", projetos[3]!, {
      nome: "Homologação",
      tipo: "homologacao",
      url: "https://hml.vertice.example",
    }),
  ];

  return { empresas, projetos, notas, documentos };
}
