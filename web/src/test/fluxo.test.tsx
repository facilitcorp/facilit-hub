import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { renderizar } from "./renderizar";
import { servidor } from "./setup";

describe("login", () => {
  it("manda para /entrar sem sessão e volta para a página pedida depois de entrar", async () => {
    const { router } = renderizar("/empresas", { logado: false });
    const u = userEvent.setup();
    await u.type(await screen.findByLabelText("E-mail"), "gestor@exemplo.com");
    await u.type(screen.getByLabelText("Senha"), "demo");
    await u.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("heading", { name: "Empresas" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/empresas");
  });

  it("mostra erro com senha errada", async () => {
    renderizar("/", { logado: false });
    const u = userEvent.setup();
    await u.type(await screen.findByLabelText("E-mail"), "gestor@exemplo.com");
    await u.type(screen.getByLabelText("Senha"), "errada");
    await u.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha inválidos");
  });
});

describe("Hoje na <organização>", () => {
  it("mostra indicadores, empresas e projetos em andamento", async () => {
    renderizar("/");
    expect(await screen.findByRole("heading", { name: "Hoje na Exemplocorp" })).toBeInTheDocument();
    const indicador = (r: string) =>
      document.querySelector(`[data-indicador="${r}"]`)?.nextElementSibling?.textContent;
    expect(indicador("Empresas")).toBe("3");
    expect(indicador("Projetos ativos")).toBe("2");
    expect(indicador("Projetos bloqueados")).toBe("1");
    expect(indicador("Prazo em até 7 dias")).toBe("2");
    expect(indicador("Concluídos (30 dias)")).toBe("1");
    expect(screen.getAllByText("Aurora Logística").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Novo site Aurora").length).toBeGreaterThan(0);
    // concluído não aparece em "em andamento"
    expect(screen.queryByText("Campanha de expansão")).not.toBeInTheDocument();
  });
});

describe("empresas", () => {
  it("filtra por status", async () => {
    renderizar("/empresas");
    await screen.findByText("Vértice Digital");
    await userEvent.selectOptions(screen.getByLabelText("Filtrar por status"), "pausada");
    await waitFor(() => expect(screen.queryByText("Vértice Digital")).not.toBeInTheDocument());
    expect(screen.getByText("Nimbus Saúde")).toBeInTheDocument();
  });

  it("cria empresa em estruturação e abre o ambiente dela", async () => {
    renderizar("/empresas");
    const u = userEvent.setup();
    await u.click(await screen.findByRole("button", { name: /Nova empresa/ }));
    await u.type(screen.getByLabelText("Nome"), "Orion Educação");
    await u.click(screen.getByRole("button", { name: "Criar empresa" }));
    expect(await screen.findByRole("heading", { name: "Orion Educação" })).toBeInTheDocument();
    expect(screen.getAllByText("Em estruturação").length).toBeGreaterThan(0);
  });
});

describe("ambiente da empresa", () => {
  it("mostra dados, links, ferramentas, responsáveis e projetos", async () => {
    renderizar("/empresas/e1");
    expect(await screen.findByRole("heading", { name: "Aurora Logística" })).toBeInTheDocument();
    expect(screen.getByText("Sua carga no caminho certo")).toBeInTheDocument();
    expect(screen.getByText("00.000.000/0001-91")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Abrir/ }).map((a) => a.getAttribute("href")),
    ).toContain("https://aurora.example");
    expect(screen.getByText("CRM Exemplo")).toBeInTheDocument();
    expect(screen.getByText("Diretora")).toBeInTheDocument();
    expect(await screen.findAllByText("Integração CRM")).not.toHaveLength(0);
    // nunca existe campo de senha nas ferramentas
    await userEvent.click(
      within(screen.getByText("Sistemas e ferramentas").parentElement!).getByRole("button", {
        name: /Editar/,
      }),
    );
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it("adiciona um link e salva", async () => {
    renderizar("/empresas/e2");
    const u = userEvent.setup();
    await screen.findByRole("heading", { name: "Vértice Digital" });
    await u.click(
      within(screen.getByText("Links e canais").parentElement!).getByRole("button", {
        name: /Editar/,
      }),
    );
    await u.click(screen.getByRole("button", { name: /Adicionar link/ }));
    const dialogo = screen.getByRole("dialog");
    const nomes = within(dialogo).getAllByLabelText("Nome");
    const urls = within(dialogo).getAllByLabelText("URL");
    await u.type(nomes.at(-1)!, "Instagram");
    await u.type(urls.at(-1)!, "instagram.com/vertice");
    await u.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    expect(await within(dialogo).findByText(/começando com https/)).toBeInTheDocument();
    await u.clear(urls.at(-1)!);
    await u.type(urls.at(-1)!, "https://instagram.com/vertice");
    await u.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Instagram")).toBeInTheDocument();
  });

  it("avisa quando outra pessoa salvou antes (409)", async () => {
    renderizar("/empresas/e1");
    const u = userEvent.setup();
    await screen.findByRole("heading", { name: "Aurora Logística" });
    servidor.use(http.patch("*/api/empresas/:id", () => HttpResponse.json({}, { status: 409 })));
    await u.click(
      within(screen.getByText("Responsáveis").parentElement!).getByRole("button", {
        name: /Editar/,
      }),
    );
    await u.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Outra pessoa alterou");
  });
});

describe("ambiente do projeto", () => {
  it("mostra próxima ação e última atualização no topo, e registra nova atualização", async () => {
    renderizar("/projetos/p1");
    const u = userEvent.setup();
    expect(await screen.findByRole("heading", { name: "Novo site Aurora" })).toBeInTheDocument();
    expect(screen.getByText("Finalizar integração do formulário.")).toBeInTheDocument();
    expect(
      screen.getAllByText("Finalizamos o layout e agora estamos iniciando integração.").length,
    ).toBeGreaterThan(0);
    await u.type(
      screen.getByLabelText("Nova atualização"),
      "Formulário integrado, iniciando testes.",
    );
    await u.click(screen.getByRole("button", { name: "Registrar atualização" }));
    await waitFor(() =>
      expect(screen.getAllByText("Formulário integrado, iniciando testes.")).toHaveLength(2),
    );
    expect(screen.getByLabelText("Nova atualização")).toHaveValue("");
  });

  it("destaca projeto aberto sem atualização recente", async () => {
    renderizar("/projetos/p2");
    expect(await screen.findByText(/projeto sem atualização recente/)).toBeInTheDocument();
  });

  it("edita progresso e próxima ação", async () => {
    renderizar("/projetos/p5");
    const u = userEvent.setup();
    await u.click(await screen.findByRole("button", { name: /Editar projeto/ }));
    await u.type(screen.getByLabelText("Próxima ação"), "Reunião de kickoff.");
    await u.selectOptions(screen.getByLabelText("Status"), "em_andamento");
    await u.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Reunião de kickoff.")).toBeInTheDocument();
    expect(screen.getByText("Em andamento")).toBeInTheDocument();
  });
});

describe("documentos", () => {
  it("lista os links de todos os projetos e filtra por tipo", async () => {
    renderizar("/documentos");
    expect(await screen.findByText("Repositório")).toBeInTheDocument();
    expect(screen.getByText("Homologação")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Filtrar por tipo"), "figma");
    await waitFor(() => expect(screen.queryByText("Repositório")).not.toBeInTheDocument());
    expect(screen.getByText("Layout")).toBeInTheDocument();
  });

  it("adiciona link no projeto e recusa URL com usuário e senha", async () => {
    renderizar("/projetos/p5");
    const u = userEvent.setup();
    await u.click(await screen.findByRole("button", { name: /Adicionar/ }));
    const dialogo = screen.getByRole("dialog");
    await u.type(within(dialogo).getByLabelText("Nome"), "Drive do projeto");
    await u.selectOptions(within(dialogo).getByLabelText("Tipo"), "google_drive");
    await u.type(within(dialogo).getByLabelText("URL"), "https://eu:segredo@drive.example/pasta");
    await u.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    expect(await within(dialogo).findByText(/sem usuário ou senha/)).toBeInTheDocument();
    const url = within(dialogo).getByPlaceholderText("https://");
    await u.clear(url);
    await u.type(url, "https://drive.example/pasta");
    await u.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Drive do projeto")).toBeInTheDocument();
  });
});

describe("painel e permissões", () => {
  it("card de bloqueados abre a lista filtrada", async () => {
    const { router } = renderizar("/");
    await userEvent.click(await screen.findByText("Projetos bloqueados"));
    expect(await screen.findByRole("heading", { name: "Projetos" })).toBeInTheDocument();
    expect(router.state.location.search).toBe("?status=bloqueado");
    await waitFor(() => expect(screen.queryByText("Novo site Aurora")).not.toBeInTheDocument());
    expect(screen.getAllByText("Integração CRM").length).toBeGreaterThan(0);
  });

  it("esconde ações de edição sem permissão", async () => {
    servidor.use(
      http.get("*/api/sessao", () =>
        HttpResponse.json({
          usuario: {
            id: "u9",
            atorId: "a4",
            nome: "Diego Rocha",
            email: "d@exemplo.com",
            papel: "membro",
          },
          organizacao: { id: "org-1", nome: "Outra Org" },
          permissoes: ["empresas.ler", "projetos.ler"],
          expiraEm: new Date(Date.now() + 3_600_000).toISOString(),
        }),
      ),
    );
    renderizar("/empresas/e1");
    expect(await screen.findByRole("heading", { name: "Aurora Logística" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Novo projeto/ })).not.toBeInTheDocument();
  });

  it("sessão expirada em qualquer chamada leva ao login", async () => {
    const { router } = renderizar("/empresas");
    await screen.findByText("Vértice Digital");
    servidor.use(
      http.get("*/api/empresas/:id", () =>
        HttpResponse.json(
          { type: "x", title: "Sessão expirada", status: 401, codigo: "sessao_expirada" },
          { status: 401 },
        ),
      ),
    );
    await userEvent.click(screen.getByText("Vértice Digital"));
    await waitFor(() => expect(router.state.location.pathname).toBe("/entrar"));
  });
});
