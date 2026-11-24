import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { renderizar } from "./renderizar";
import { servidor } from "./setup";

const problema = (status: number, codigo: string) =>
  HttpResponse.json({ type: "about:blank", title: codigo, status, codigo }, { status });

describe("tela de usuários", () => {
  it("só aparece no menu para quem gere contas", async () => {
    renderizar("/");
    await screen.findByRole("heading", { name: "Hoje na Exemplocorp" });
    expect(screen.queryByRole("link", { name: "Usuários" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trocar senha" })).toBeInTheDocument();
  });

  it("lista as contas com papel e situação; na própria linha não há desativar", async () => {
    renderizar("/usuarios", { papel: "administrador" });
    expect(await screen.findByRole("link", { name: "Usuários" })).toBeInTheDocument();
    const linha = await screen.findByRole("row", { name: /Bruno Lima/ });
    expect(within(linha).getByText("(você)")).toBeInTheDocument();
    expect(within(linha).getByText("Administrador")).toBeInTheDocument();
    expect(within(linha).queryByRole("button", { name: /Desativar/ })).not.toBeInTheDocument();
    const ana = screen.getByText("Ana Souza").closest("tr")!;
    expect(within(ana).getByText("gestor@exemplo.com")).toBeInTheDocument();
    expect(within(ana).getByRole("button", { name: /Desativar/ })).toBeInTheDocument();
    // editar a própria conta não oferece troca de papel
    await userEvent.click(within(linha).getByRole("button", { name: "Editar Bruno Lima" }));
    expect(within(screen.getByRole("dialog")).queryByLabelText("Papel")).not.toBeInTheDocument();
  });

  it("cria conta com senha gerada, mostrada uma vez com copiar", async () => {
    renderizar("/usuarios", { papel: "administrador" });
    const u = userEvent.setup();
    await u.click(await screen.findByRole("button", { name: /Nova conta/ }));
    const dialogo = screen.getByRole("dialog");
    const senha = within(dialogo).getByLabelText("Senha provisória") as HTMLInputElement;
    const inicial = senha.value;
    expect(inicial).toHaveLength(16);
    await u.click(within(dialogo).getByRole("button", { name: "Gerar senha" }));
    expect(senha.value).not.toBe(inicial);
    const gerada = senha.value;
    await u.type(within(dialogo).getByLabelText("Nome"), "Eva Nunes");
    await u.type(within(dialogo).getByLabelText("E-mail"), "eva@exemplo.com");
    await u.selectOptions(within(dialogo).getByLabelText("Papel"), "gestor");
    await u.click(within(dialogo).getByRole("button", { name: "Criar conta" }));

    const mostra = await screen.findByRole("dialog", { name: "Senha provisória" });
    expect(within(mostra).getByLabelText("Senha provisória gerada")).toHaveTextContent(gerada);
    await u.click(within(mostra).getByRole("button", { name: "Copiar" }));
    expect(await navigator.clipboard.readText()).toBe(gerada);
    await u.click(within(mostra).getByRole("button", { name: "Pronto" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(gerada)).not.toBeInTheDocument();
    const linha = (await screen.findByText("Eva Nunes")).closest("tr")!;
    expect(within(linha).getByText("Aguardando troca de senha")).toBeInTheDocument();
    // a senha nunca vai para a URL
    expect(window.location.href).not.toContain(gerada);
  });

  it("recusa senha curta e e-mail já usado", async () => {
    renderizar("/usuarios", { papel: "administrador" });
    const u = userEvent.setup();
    await u.click(await screen.findByRole("button", { name: /Nova conta/ }));
    const dialogo = screen.getByRole("dialog");
    await u.type(within(dialogo).getByLabelText("Nome"), "Outra Ana");
    await u.type(within(dialogo).getByLabelText("E-mail"), "gestor@exemplo.com");
    const senha = within(dialogo).getByLabelText("Senha provisória");
    await u.clear(senha);
    await u.type(senha, "curta");
    await u.click(within(dialogo).getByRole("button", { name: "Criar conta" }));
    expect(await within(dialogo).findByText("Mínimo de 12 caracteres")).toBeInTheDocument();
    await u.click(within(dialogo).getByRole("button", { name: "Gerar senha" }));
    await u.click(within(dialogo).getByRole("button", { name: "Criar conta" }));
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(
      "Já existe uma conta com esse e-mail.",
    );
  });

  it("desativa e reativa; mostra o erro de último administrador", async () => {
    renderizar("/usuarios", { papel: "administrador" });
    const u = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const carla = (await screen.findByText("Carla Mendes")).closest("tr")!;
    await u.click(within(carla).getByRole("button", { name: /Desativar/ }));
    expect(await within(carla).findByText("Desativada")).toBeInTheDocument();
    await u.click(within(carla).getByRole("button", { name: /Reativar/ }));
    expect(await within(carla).findByText("Ativa")).toBeInTheDocument();

    servidor.use(http.patch("*/api/usuarios/:id", () => problema(409, "ultimo_administrador")));
    await u.click(within(carla).getByRole("button", { name: /Desativar/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A organização precisa de ao menos um administrador ativo.",
    );
    vi.restoreAllMocks();
  });

  it("edita nome e papel de outra conta e mostra propria_conta", async () => {
    renderizar("/usuarios", { papel: "administrador" });
    const u = userEvent.setup();
    await u.click(await screen.findByRole("button", { name: "Editar Carla Mendes" }));
    const dialogo = screen.getByRole("dialog");
    await u.selectOptions(within(dialogo).getByLabelText("Papel"), "gestor");
    await u.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(screen.getByText("Carla Mendes").closest("tr")!).getByText("Gestor"));

    servidor.use(http.patch("*/api/usuarios/:id", () => problema(400, "propria_conta")));
    await u.click(screen.getByRole("button", { name: "Editar Carla Mendes" }));
    await u.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Você não pode desativar nem mudar o papel da sua própria conta.",
    );
  });

  it("redefine a senha e marca a conta como aguardando troca", async () => {
    renderizar("/usuarios", { papel: "administrador" });
    const u = userEvent.setup();
    await u.click(await screen.findByRole("button", { name: "Redefinir a senha de Ana Souza" }));
    await u.click(screen.getByRole("button", { name: "Redefinir senha" }));
    expect(await screen.findByRole("dialog", { name: "Senha provisória" })).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Pronto" }));
    const ana = screen.getByText("Ana Souza").closest("tr")!;
    expect(within(ana).getByText("Aguardando troca de senha")).toBeInTheDocument();
  });

  it("sem a permissão, a rota não mostra as contas nem pede a lista à API", async () => {
    const pedidos: string[] = [];
    servidor.events.on("request:start", ({ request }) => {
      pedidos.push(`${request.method} ${new URL(request.url).pathname}`);
    });
    renderizar("/usuarios");
    expect(await screen.findByText(/Só administradores/)).toBeInTheDocument();
    await waitFor(() => expect(pedidos.some((p) => p.endsWith("/sessao"))).toBe(true));
    expect(pedidos.filter((p) => /^GET .*\/usuarios$/.test(p))).toEqual([]);
    servidor.events.removeAllListeners();
  });
});

describe("senha provisória", () => {
  it("primeiro acesso: entra, é obrigado a trocar e chega à Home", async () => {
    const { router } = renderizar("/usuarios", { logado: false, papel: "administrador" });
    const u = userEvent.setup();
    // o administrador cria a conta...
    await u.type(await screen.findByLabelText("E-mail"), "admin@exemplo.com");
    await u.type(screen.getByLabelText("Senha"), "demo");
    await u.click(screen.getByRole("button", { name: "Entrar" }));
    await u.click(await screen.findByRole("button", { name: /Nova conta/ }));
    const dialogo = screen.getByRole("dialog");
    const provisoria = (within(dialogo).getByLabelText("Senha provisória") as HTMLInputElement)
      .value;
    await u.type(within(dialogo).getByLabelText("Nome"), "Eva Nunes");
    await u.type(within(dialogo).getByLabelText("E-mail"), "eva@exemplo.com");
    await u.click(within(dialogo).getByRole("button", { name: "Criar conta" }));
    await u.click(await screen.findByRole("button", { name: "Pronto" }));
    await u.click(screen.getByRole("button", { name: "Sair" }));

    // ...e a pessoa entra com a senha provisória
    await u.type(await screen.findByLabelText("E-mail"), "eva@exemplo.com");
    await u.type(screen.getByLabelText("Senha"), provisoria);
    await u.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("heading", { name: "Crie a sua senha" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/senha");
    expect(screen.queryByRole("link", { name: "Empresas" })).not.toBeInTheDocument();

    // qualquer rota leva de volta à troca
    await act(() => router.navigate("/empresas"));
    expect(await screen.findByRole("heading", { name: "Crie a sua senha" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/senha");

    await u.type(screen.getByLabelText(/^Senha atual/), "errada");
    await u.type(screen.getByLabelText(/^Nova senha/), "uma-senha-so-minha");
    await u.type(screen.getByLabelText(/Confirme a nova senha/), "uma-senha-so-mi");
    await u.click(screen.getByRole("button", { name: "Trocar senha" }));
    expect(await screen.findByText("As senhas não conferem")).toBeInTheDocument();
    await u.type(screen.getByLabelText(/Confirme a nova senha/), "nha");
    await u.click(screen.getByRole("button", { name: "Trocar senha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("A senha atual não confere.");

    await u.clear(screen.getByLabelText(/^Senha atual/));
    await u.type(screen.getByLabelText(/^Senha atual/), provisoria);
    await u.click(screen.getByRole("button", { name: "Trocar senha" }));
    expect(await screen.findByRole("heading", { name: "Hoje na Exemplocorp" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("403 troca_de_senha_obrigatoria em qualquer chamada recarrega a sessão", async () => {
    const { router } = renderizar("/empresas");
    await screen.findByText("Vértice Digital");
    let trocar = false;
    servidor.use(
      http.get("*/api/sessao", () =>
        trocar
          ? HttpResponse.json({
              usuario: {
                id: "u-a1",
                atorId: "a1",
                nome: "Ana Souza",
                email: "gestor@exemplo.com",
                papel: "gestor",
                trocarSenha: true,
              },
              organizacao: { id: "org-1", nome: "Exemplocorp" },
              permissoes: ["empresas.ler"],
              expiraEm: new Date(Date.now() + 3_600_000).toISOString(),
            })
          : undefined,
      ),
      http.get("*/api/empresas/:id", () => {
        trocar = true;
        return problema(403, "troca_de_senha_obrigatoria");
      }),
    );
    await userEvent.click(screen.getByText("Vértice Digital"));
    expect(await screen.findByRole("heading", { name: "Crie a sua senha" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/senha");
  });

  it("troca voluntária pelo menu; 429 vira aviso de espera", async () => {
    renderizar("/");
    const u = userEvent.setup();
    await u.click(await screen.findByRole("link", { name: "Trocar senha" }));
    await u.type(screen.getByLabelText(/^Senha atual/), "demo");
    await u.type(screen.getByLabelText(/^Nova senha/), "outra-senha-boa");
    await u.type(screen.getByLabelText(/Confirme a nova senha/), "outra-senha-boa");
    await u.click(screen.getByRole("button", { name: "Trocar senha" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Senha trocada");
    expect(screen.getByLabelText(/^Senha atual/)).toHaveValue("");

    servidor.use(http.put("*/api/sessao/senha", () => new HttpResponse(null, { status: 429 })));
    await u.type(screen.getByLabelText(/^Senha atual/), "outra-senha-boa");
    await u.type(screen.getByLabelText(/^Nova senha/), "mais-uma-senha-boa");
    await u.type(screen.getByLabelText(/Confirme a nova senha/), "mais-uma-senha-boa");
    await u.click(screen.getByRole("button", { name: "Trocar senha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Muitas tentativas");
  });
});
