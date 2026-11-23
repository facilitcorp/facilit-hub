import { describe, expect, it, vi } from "vitest";

vi.mock("msw/browser", () => ({ setupWorker: (...h: unknown[]) => h }));

describe("mock parcial", () => {
  it("deixa empresas, atores e sessão para o back real", async () => {
    const { criarWorker } = await import("./browser");
    const rotas = (criarWorker("parcial") as unknown as { info: { header: string } }[]).map(
      (h) => h.info.header,
    );
    expect(rotas.some((r) => r.includes("/painel"))).toBe(true);
    expect(rotas.some((r) => r.includes("/projetos"))).toBe(true);
    expect(rotas.some((r) => r.includes("/documentos"))).toBe(true);
    expect(rotas.some((r) => /\/(empresas|atores|sessao)/.test(r))).toBe(false);
  });
});
