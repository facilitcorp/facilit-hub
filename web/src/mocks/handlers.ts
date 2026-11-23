import { http, HttpResponse } from "msw";
import type {
  AtorResumo,
  AtualizacaoEmpresa,
  AtualizacaoProjeto,
  Empresa,
  NovoProjeto,
  Projeto,
} from "@/api/tipos";
import { atores, criarBase } from "./dados";

let base = criarBase();
let sessao: AtorResumo | null = null;

/** Reinicia o estado (usado nos testes). */
export function reiniciarMocks(opcoes: { logado?: boolean } = {}) {
  base = criarBase();
  sessao = opcoes.logado ? atores[0]! : null;
}

const agora = () => new Date().toISOString();
const naoEncontrado = () => HttpResponse.json({ mensagem: "Não encontrado" }, { status: 404 });
const conflito = () => HttpResponse.json({ mensagem: "Versão desatualizada" }, { status: 409 });

function comContagem(e: Empresa): Empresa {
  const ps = base.projetos.filter((p) => p.empresa.id === e.id);
  return {
    ...e,
    totalProjetos: ps.length,
    projetosEmAndamento: ps.filter((p) => p.status === "em_andamento").length,
  };
}

const ator = (id?: string | null) => atores.find((a) => a.id === id);

/** Merge patch: null apaga o campo. */
function mesclar<T extends object>(atual: T, patch: object): T {
  const r = { ...atual } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete r[k];
    else if (v !== undefined) r[k] = v;
  }
  return r as T;
}

export const handlers = [
  http.get("/api/sessao", () =>
    sessao
      ? HttpResponse.json({ ator: sessao })
      : HttpResponse.json({ mensagem: "Não autenticado" }, { status: 401 }),
  ),
  http.post("/api/sessao", async ({ request }) => {
    const { email, senha } = (await request.json()) as { email: string; senha: string };
    if (!email || senha !== "demo")
      return HttpResponse.json({ mensagem: "E-mail ou senha inválidos" }, { status: 401 });
    sessao = atores[0]!;
    return HttpResponse.json({ ator: sessao });
  }),
  http.delete("/api/sessao", () => {
    sessao = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/atores", () => HttpResponse.json({ itens: atores, total: atores.length })),

  http.get("/api/empresas", ({ request }) => {
    const q = new URL(request.url).searchParams;
    const status = q.get("status");
    const busca = q.get("busca")?.toLowerCase();
    const itens = base.empresas
      .filter((e) => !status || e.status === status)
      .filter((e) => !busca || e.nome.toLowerCase().includes(busca))
      .map(comContagem);
    return HttpResponse.json({ itens, total: itens.length });
  }),
  http.get("/api/empresas/:id", ({ params }) => {
    const e = base.empresas.find((x) => x.id === params.id);
    return e ? HttpResponse.json(comContagem(e)) : naoEncontrado();
  }),
  http.post("/api/empresas", async ({ request }) => {
    const dados = (await request.json()) as Partial<Empresa>;
    const e: Empresa = {
      id: `e${Date.now()}`,
      versao: 1,
      nome: dados.nome ?? "",
      descricaoCurta: dados.descricaoCurta,
      segmento: dados.segmento,
      status: "em_estruturacao",
      contatos: [],
      links: [],
      ferramentas: [],
      responsaveis: [],
      totalProjetos: 0,
      projetosEmAndamento: 0,
      atualizadoEm: agora(),
    };
    base.empresas.push(e);
    return HttpResponse.json(e, { status: 201 });
  }),
  http.patch("/api/empresas/:id", async ({ params, request }) => {
    const i = base.empresas.findIndex((x) => x.id === params.id);
    if (i < 0) return naoEncontrado();
    const atual = base.empresas[i]!;
    const { versao, responsaveis, ...resto } = (await request.json()) as AtualizacaoEmpresa;
    if (versao !== atual.versao) return conflito();
    const nova: Empresa = {
      ...mesclar(atual, resto),
      responsaveis: responsaveis
        ? responsaveis.map((r) => ({ ator: ator(r.atorId)!, papel: r.papel }))
        : atual.responsaveis,
      versao: atual.versao + 1,
      atualizadoEm: agora(),
    };
    base.empresas[i] = nova;
    for (const p of base.projetos)
      if (p.empresa.id === nova.id) p.empresa = { ...p.empresa, nome: nova.nome };
    return HttpResponse.json(comContagem(nova));
  }),

  http.get("/api/projetos", ({ request }) => {
    const q = new URL(request.url).searchParams;
    const busca = q.get("busca")?.toLowerCase();
    const itens = base.projetos
      .filter((p) => !q.get("empresaId") || p.empresa.id === q.get("empresaId"))
      .filter((p) => !q.get("status") || p.status === q.get("status"))
      .filter((p) => !busca || p.nome.toLowerCase().includes(busca));
    return HttpResponse.json({ itens, total: itens.length });
  }),
  http.get("/api/projetos/:id", ({ params }) => {
    const p = base.projetos.find((x) => x.id === params.id);
    return p ? HttpResponse.json(p) : naoEncontrado();
  }),
  http.post("/api/projetos", async ({ request }) => {
    const d = (await request.json()) as NovoProjeto;
    const e = base.empresas.find((x) => x.id === d.empresaId);
    if (!e) return HttpResponse.json({ mensagem: "Empresa inválida" }, { status: 422 });
    const p: Projeto = {
      id: `p${Date.now()}`,
      versao: 1,
      nome: d.nome,
      descricao: d.descricao,
      empresa: { id: e.id, nome: e.nome, logoUrl: e.logoUrl },
      responsavel: ator(d.responsavelId),
      prioridade: d.prioridade ?? "media",
      status: "nao_iniciado",
      fase: "descoberta",
      progresso: 0,
      prazoPrevisto: d.prazoPrevisto,
      documentos: [],
      atualizadoEm: agora(),
    };
    base.projetos.push(p);
    return HttpResponse.json(p, { status: 201 });
  }),
  http.patch("/api/projetos/:id", async ({ params, request }) => {
    const i = base.projetos.findIndex((x) => x.id === params.id);
    if (i < 0) return naoEncontrado();
    const atual = base.projetos[i]!;
    const { versao, responsavelId, ...resto } = (await request.json()) as AtualizacaoProjeto;
    if (versao !== atual.versao) return conflito();
    const novo: Projeto = {
      ...mesclar(atual, resto),
      responsavel: responsavelId === undefined ? atual.responsavel : ator(responsavelId),
      concluidoEm:
        resto.status === "concluido" && atual.status !== "concluido" ? agora() : atual.concluidoEm,
      versao: atual.versao + 1,
      atualizadoEm: agora(),
    };
    base.projetos[i] = novo;
    return HttpResponse.json(novo);
  }),
  http.get("/api/projetos/:id/atualizacoes", ({ params }) => {
    const itens = base.notas[params.id as string] ?? [];
    return HttpResponse.json({ itens, total: itens.length });
  }),
  http.post("/api/projetos/:id/atualizacoes", async ({ params, request }) => {
    const p = base.projetos.find((x) => x.id === params.id);
    if (!p) return naoEncontrado();
    const { texto } = (await request.json()) as { texto: string };
    const nota = { id: `n${Date.now()}`, texto, autor: sessao ?? atores[0]!, em: agora() };
    (base.notas[p.id] ??= []).unshift(nota);
    p.ultimaAtualizacao = nota;
    p.atualizadoEm = nota.em;
    p.versao += 1;
    return HttpResponse.json(nota, { status: 201 });
  }),
];
