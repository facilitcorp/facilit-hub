import { http, HttpResponse } from "msw";
import type {
  AtualizacaoEmpresa,
  AtualizacaoProjeto,
  AtorResumo,
  Conta,
  Documento,
  DocumentoAtualizacao,
  DocumentoEntrada,
  Empresa,
  EmpresaEntrada,
  NovoProjeto,
  Painel,
  Permissao,
  Projeto,
  Papel,
  Sessao,
  UsuarioAtualizacao,
  UsuarioEntrada,
} from "@/api/tipos";
import { atores, criarBase, criarContas, novaEmpresa, novoProjeto, ORG } from "./dados";

let base = criarBase();
let sessao: Sessao | null = null;
let seq = 0;
let contas = criarContas();
/** Senha de cada conta (só no mock). Todas as do exemplo usam "demo". */
let senhas = new Map<string, string>();

const PERMISSOES: Permissao[] = [
  "empresas.ler",
  "empresas.criar",
  "empresas.editar",
  "projetos.ler",
  "projetos.criar",
  "projetos.editar",
  "projetos.atualizar",
  "documentos.ler",
  "documentos.editar",
  "atores.ler",
  "eventos.ler",
];

function abrirSessao(c: Conta = contas[0]!): Sessao {
  return {
    usuario: {
      id: c.id,
      atorId: c.atorId,
      nome: c.nome,
      email: c.email,
      papel: c.papel,
      trocarSenha: c.trocarSenha,
    },
    organizacao: { id: ORG, nome: "Exemplocorp" },
    permissoes: c.papel === "administrador" ? [...PERMISSOES, "usuarios.gerir"] : PERMISSOES,
    expiraEm: new Date(Date.now() + 3_600_000).toISOString(),
  };
}

/** Reinicia o estado (usado nos testes). `papel` escolhe com qual conta do exemplo entrar. */
export function reiniciarMocks(opcoes: { logado?: boolean; papel?: Papel } = {}) {
  base = criarBase();
  contas = criarContas();
  senhas = new Map(contas.map((c) => [c.email, "demo"]));
  const c = contas.find((x) => x.papel === (opcoes.papel ?? "gestor"));
  sessao = opcoes.logado ? abrirSessao(c) : null;
}

const agora = () => new Date().toISOString();
const id = (p: string) => `${p}-novo-${++seq}`;
const problema = (status: number, codigo: string, title: string) =>
  HttpResponse.json(
    { type: "about:blank", title, status, codigo },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );
const naoEncontrado = () => problema(404, "nao_encontrado", "Não encontrado");
const conflito = () => problema(409, "versao_desatualizada", "Versão desatualizada");
const pagina = <T>(itens: T[]) => HttpResponse.json({ itens, proximoCursor: null });

/** Merge: null apaga; ausente mantém. */
function mesclar<T extends object>(atual: T, patch: object): T {
  const r = { ...atual } as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) r[k] = v;
  return r as T;
}

function comContagem(e: Empresa): Empresa {
  const ps = base.projetos.filter((p) => p.empresa.id === e.id);
  return {
    ...e,
    totalProjetos: ps.length,
    totalProjetosEmAndamento: ps.filter((p) => p.status === "em_andamento").length,
  };
}

const ator = (atorId?: string | null): AtorResumo | null =>
  atores.find((a) => a.id === atorId) ?? null;
const resumoEmpresa = (e: Empresa) => ({ id: e.id, nome: e.nome, logoUrl: e.logoUrl });
const API = "*/api";

const contaDaSessao = () => contas.find((c) => c.id === sessao?.usuario.id);
const ultimoAdmin = (c: Conta) =>
  c.papel === "administrador" &&
  contas.filter((x) => x.ativo && x.papel === "administrador").length === 1;

export const handlers = [
  // Senha provisória: como no back, só sessão, sair e troca de senha passam.
  http.all(`${API}/*`, ({ request }) => {
    const { pathname } = new URL(request.url);
    if (sessao?.usuario.trocarSenha && !/\/api\/sessao(\/senha)?$/.test(pathname))
      return problema(403, "troca_de_senha_obrigatoria", "Troque a senha provisória");
  }),
  http.get(`${API}/sessao`, () =>
    sessao ? HttpResponse.json(sessao) : problema(401, "sessao_expirada", "Sem sessão"),
  ),
  http.post(`${API}/sessao`, async ({ request }) => {
    const { email, senha } = (await request.json()) as { email: string; senha: string };
    // e-mail fora das contas entra como o gestor do exemplo (testes antigos)
    const c = contas.find((x) => x.email === email && x.ativo) ?? (email ? contas[0] : undefined);
    if (!c || senha !== (senhas.get(c.email) ?? "demo"))
      return problema(401, "credenciais_invalidas", "E-mail ou senha inválidos");
    sessao = abrirSessao(c);
    return HttpResponse.json(sessao);
  }),
  http.put(`${API}/sessao/senha`, async ({ request }) => {
    const c = contaDaSessao();
    if (!sessao || !c) return problema(401, "sessao_expirada", "Sem sessão");
    const { senhaAtual, novaSenha } = (await request.json()) as {
      senhaAtual: string;
      novaSenha: string;
    };
    if (senhaAtual !== senhas.get(c.email))
      return problema(400, "senha_atual_incorreta", "A senha atual não confere");
    if (senhaAtual === novaSenha)
      return problema(400, "senha_igual", "A nova senha precisa ser diferente da atual");
    senhas.set(c.email, novaSenha);
    Object.assign(c, { trocarSenha: false, senhaTrocadaEm: agora() });
    sessao = abrirSessao(c);
    return HttpResponse.json(sessao);
  }),

  http.get(`${API}/usuarios`, () => HttpResponse.json({ itens: contas })),
  http.post(`${API}/usuarios`, async ({ request }) => {
    const d = (await request.json()) as UsuarioEntrada;
    if (contas.some((c) => c.email.toLowerCase() === d.email.toLowerCase()))
      return problema(409, "email_em_uso", "Já existe conta com esse e-mail");
    const c: Conta = {
      id: id("u"),
      atorId: id("a"),
      nome: d.nome,
      email: d.email,
      papel: d.papel,
      ativo: true,
      trocarSenha: true,
      criadoEm: agora(),
      senhaTrocadaEm: null,
    };
    contas.push(c);
    senhas.set(c.email, d.senhaProvisoria);
    return HttpResponse.json(c, { status: 201 });
  }),
  http.patch(`${API}/usuarios/:id`, async ({ params, request }) => {
    const c = contas.find((x) => x.id === params.id);
    if (!c) return naoEncontrado();
    const d = (await request.json()) as UsuarioAtualizacao;
    const muda = d.ativo === false || (d.papel !== undefined && d.papel !== c.papel);
    if (c.id === sessao?.usuario.id && muda)
      return problema(400, "propria_conta", "Não pode alterar a própria conta");
    if (muda && d.papel !== "administrador" && ultimoAdmin(c))
      return problema(409, "ultimo_administrador", "Último administrador");
    Object.assign(c, mesclar(c, d));
    return HttpResponse.json(c);
  }),
  http.put(`${API}/usuarios/:id/senha-provisoria`, async ({ params, request }) => {
    const c = contas.find((x) => x.id === params.id);
    if (!c) return naoEncontrado();
    const { senhaProvisoria } = (await request.json()) as { senhaProvisoria: string };
    senhas.set(c.email, senhaProvisoria);
    c.trocarSenha = true;
    return HttpResponse.json(c);
  }),
  http.delete(`${API}/sessao`, () => {
    sessao = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/atores`, () => pagina(atores)),

  http.get(`${API}/painel`, () => {
    const ps = base.projetos;
    const aberto = (p: Projeto) => !["concluido", "cancelado"].includes(p.status);
    const limitePrazo = Date.now() + 7 * 86_400_000;
    const limiteConcl = Date.now() - 30 * 86_400_000;
    const painel: Painel = {
      totalEmpresas: base.empresas.filter((e) => e.status !== "inativa").length,
      projetosAtivos: ps.filter((p) => p.status === "em_andamento").length,
      projetosBloqueados: ps.filter((p) => p.status === "bloqueado").length,
      projetosProximosDoPrazo: ps.filter(
        (p) => aberto(p) && p.prazoPrevisto && new Date(p.prazoPrevisto).getTime() <= limitePrazo,
      ).length,
      projetosConcluidosRecentemente: ps.filter(
        (p) => p.concluidoEm && new Date(p.concluidoEm).getTime() >= limiteConcl,
      ).length,
      janelaPrazoDias: 7,
      janelaConcluidosDias: 30,
      geradoEm: agora(),
    };
    return HttpResponse.json(painel);
  }),

  http.get(`${API}/empresas`, ({ request }) => {
    const q = new URL(request.url).searchParams;
    const status = q.getAll("status");
    const busca = q.get("busca")?.toLowerCase();
    return pagina(
      base.empresas
        .filter((e) => status.length === 0 || status.includes(e.status))
        .filter((e) => !busca || e.nome.toLowerCase().includes(busca))
        .map(comContagem),
    );
  }),
  http.get(`${API}/empresas/:id`, ({ params }) => {
    const e = base.empresas.find((x) => x.id === params.id);
    return e ? HttpResponse.json(comContagem(e)) : naoEncontrado();
  }),
  http.post(`${API}/empresas`, async ({ request }) => {
    const { responsaveis, ...d } = (await request.json()) as EmpresaEntrada;
    const e = novaEmpresa({
      ...d,
      id: id("e"),
      responsaveis: (responsaveis ?? []).map((r) => ({
        ator: ator(r.atorId)!,
        papel: r.papel ?? null,
      })),
      criadaEm: agora(),
      atualizadaEm: agora(),
    });
    base.empresas.push(e);
    return HttpResponse.json(e, { status: 201 });
  }),
  http.patch(`${API}/empresas/:id`, async ({ params, request }) => {
    const i = base.empresas.findIndex((x) => x.id === params.id);
    if (i < 0) return naoEncontrado();
    const atual = base.empresas[i]!;
    const { versao, responsaveis, ...resto } = (await request.json()) as AtualizacaoEmpresa;
    if (versao !== atual.versao) return conflito();
    const nova: Empresa = {
      ...mesclar(atual, resto),
      responsaveis: responsaveis
        ? responsaveis.map((r) => ({ ator: ator(r.atorId)!, papel: r.papel ?? null }))
        : atual.responsaveis,
      versao: atual.versao + 1,
      atualizadaEm: agora(),
    };
    base.empresas[i] = nova;
    for (const p of base.projetos) if (p.empresa.id === nova.id) p.empresa = resumoEmpresa(nova);
    return HttpResponse.json(comContagem(nova));
  }),
  http.put(`${API}/empresas/:id/:imagem`, async ({ params, request }) => {
    const e = base.empresas.find((x) => x.id === params.id);
    if (!e) return naoEncontrado();
    const arquivo = (await request.formData()).get("arquivo");
    if (!(arquivo instanceof Blob)) return problema(400, "validacao", "Arquivo obrigatório");
    const url =
      typeof URL.createObjectURL === "function"
        ? URL.createObjectURL(arquivo)
        : "https://img.example/x.png";
    if (params.imagem === "logo") e.logoUrl = url;
    else e.capaUrl = url;
    e.versao += 1;
    return HttpResponse.json(comContagem(e));
  }),
  http.delete(`${API}/empresas/:id/:imagem`, ({ params }) => {
    const e = base.empresas.find((x) => x.id === params.id);
    if (!e) return naoEncontrado();
    if (params.imagem === "logo") e.logoUrl = null;
    else e.capaUrl = null;
    e.versao += 1;
    return HttpResponse.json(comContagem(e));
  }),

  http.get(`${API}/projetos`, ({ request }) => {
    const q = new URL(request.url).searchParams;
    const status = q.getAll("status");
    const busca = q.get("busca")?.toLowerCase();
    const prazoAte = q.get("prazoAte");
    const concluidoDesde = q.get("concluidoDesde");
    return pagina(
      base.projetos
        .filter((p) => !q.get("empresaId") || p.empresa.id === q.get("empresaId"))
        .filter((p) => status.length === 0 || status.includes(p.status))
        .filter((p) => !prazoAte || (!!p.prazoPrevisto && p.prazoPrevisto <= prazoAte))
        .filter((p) => !concluidoDesde || (!!p.concluidoEm && p.concluidoEm >= concluidoDesde))
        .filter((p) => !busca || p.nome.toLowerCase().includes(busca)),
    );
  }),
  http.get(`${API}/projetos/:id`, ({ params }) => {
    const p = base.projetos.find((x) => x.id === params.id);
    return p ? HttpResponse.json(p) : naoEncontrado();
  }),
  http.post(`${API}/projetos`, async ({ request }) => {
    const { responsavelId, empresaId, ...d } = (await request.json()) as NovoProjeto;
    const e = base.empresas.find((x) => x.id === empresaId);
    if (!e) return problema(400, "validacao", "Empresa inválida");
    const p = novoProjeto({
      ...d,
      id: id("p"),
      empresa: resumoEmpresa(e),
      responsavel: ator(responsavelId),
      criadoEm: agora(),
      atualizadoEm: agora(),
    });
    base.projetos.push(p);
    return HttpResponse.json(p, { status: 201 });
  }),
  http.patch(`${API}/projetos/:id`, async ({ params, request }) => {
    const i = base.projetos.findIndex((x) => x.id === params.id);
    if (i < 0) return naoEncontrado();
    const atual = base.projetos[i]!;
    const { versao, responsavelId, ...resto } = (await request.json()) as AtualizacaoProjeto;
    if (versao !== atual.versao) return conflito();
    const status = resto.status ?? atual.status;
    const novo: Projeto = {
      ...mesclar(atual, resto),
      responsavel: responsavelId === undefined ? atual.responsavel : ator(responsavelId),
      concluidoEm: status !== "concluido" ? null : (atual.concluidoEm ?? agora()),
      versao: atual.versao + 1,
      atualizadoEm: agora(),
    };
    base.projetos[i] = novo;
    return HttpResponse.json(novo);
  }),
  http.get(`${API}/projetos/:id/atualizacoes`, ({ params }) =>
    pagina(base.notas[params.id as string] ?? []),
  ),
  http.post(`${API}/projetos/:id/atualizacoes`, async ({ params, request }) => {
    const p = base.projetos.find((x) => x.id === params.id);
    if (!p) return naoEncontrado();
    const { texto } = (await request.json()) as { texto: string };
    const nota = { id: id("n"), texto, autor: ator(sessao?.usuario.atorId), em: agora() };
    (base.notas[p.id] ??= []).unshift(nota);
    p.ultimaAtualizacao = nota;
    return HttpResponse.json(nota, { status: 201 });
  }),

  http.get(`${API}/documentos`, ({ request }) => {
    const q = new URL(request.url).searchParams;
    const busca = q.get("busca")?.toLowerCase();
    return pagina(
      base.documentos
        .filter((d) => !q.get("projetoId") || d.projetoId === q.get("projetoId"))
        .filter((d) => !q.get("empresaId") || d.empresa.id === q.get("empresaId"))
        .filter((d) => !q.get("tipo") || d.tipo === q.get("tipo"))
        .filter((d) => !busca || d.nome.toLowerCase().includes(busca)),
    );
  }),
  http.post(`${API}/documentos`, async ({ request }) => {
    const d = (await request.json()) as DocumentoEntrada;
    const p = base.projetos.find((x) => x.id === d.projetoId);
    if (!p) return problema(400, "validacao", "Projeto inválido");
    const doc: Documento = {
      ...d,
      id: id("d"),
      observacao: d.observacao ?? null,
      projeto: { id: p.id, nome: p.nome },
      empresa: p.empresa,
      autor: ator(sessao?.usuario.atorId),
      criadoEm: agora(),
      atualizadoEm: agora(),
      versao: 1,
    };
    base.documentos.unshift(doc);
    return HttpResponse.json(doc, { status: 201 });
  }),
  http.patch(`${API}/documentos/:id`, async ({ params, request }) => {
    const i = base.documentos.findIndex((x) => x.id === params.id);
    if (i < 0) return naoEncontrado();
    const atual = base.documentos[i]!;
    const { versao, ...resto } = (await request.json()) as DocumentoAtualizacao;
    if (versao !== atual.versao) return conflito();
    const novo = { ...mesclar(atual, resto), versao: atual.versao + 1, atualizadoEm: agora() };
    base.documentos[i] = novo;
    return HttpResponse.json(novo);
  }),
  http.delete(`${API}/documentos/:id`, ({ params }) => {
    base.documentos = base.documentos.filter((x) => x.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
