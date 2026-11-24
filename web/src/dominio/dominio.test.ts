import { describe, expect, it } from "vitest";
import type { Projeto } from "@/api/tipos";
import { diasAte, haQuanto, notaVelha, urlSegura } from "./formato";
import { filtrosDoPainel, prazoProximo } from "./painel";
import { telefoneOpc, urlObrig } from "./formulario";
import { gerarSenha } from "./senha";

const agora = new Date("2026-11-23T12:00:00Z").getTime();
const base = {
  versao: 1,
  empresa: { id: "e", nome: "E" },
  prioridade: "media",
  fase: "execucao",
  progresso: 0,
  atualizadoEm: "2026-11-01T00:00:00Z",
} as const;
const p = (x: Partial<Projeto>) =>
  ({ ...base, id: "x", nome: "x", status: "em_andamento", ...x }) as Projeto;

describe("filtrosDoPainel", () => {
  it("gera o filtro de listarProjetos equivalente a cada número", () => {
    const f = filtrosDoPainel(7, 30, agora);
    expect(f.ativos).toBe("/projetos?status=em_andamento");
    expect(f.proximosDoPrazo).toBe(
      "/projetos?status=nao_iniciado&status=em_andamento&status=bloqueado&status=pausado&prazoAte=2026-11-30",
    );
    expect(f.concluidosRecentes).toBe(
      `/projetos?status=concluido&concluidoDesde=${encodeURIComponent("2026-10-24T12:00:00.000Z")}`,
    );
  });
  it("prazoProximo ignora projeto concluído", () => {
    expect(prazoProximo(p({ prazoPrevisto: "2026-11-25" }), 7, agora)).toBe(true);
    expect(prazoProximo(p({ prazoPrevisto: "2026-12-05" }), 7, agora)).toBe(false);
    expect(prazoProximo(p({ prazoPrevisto: "2026-12-05" }), 15, agora)).toBe(true);
    expect(prazoProximo(p({ status: "concluido", prazoPrevisto: "2026-11-25" }), 7, agora)).toBe(
      false,
    );
  });
});

describe("formato", () => {
  it("haQuanto", () => {
    expect(haQuanto("2026-11-23T08:00:00Z", agora)).toBe("hoje");
    expect(haQuanto("2026-11-20T12:00:00Z", agora)).toBe("há 3 dias");
  });
  it("diasAte e notaVelha", () => {
    expect(diasAte("2026-11-23", agora)).toBe(1);
    expect(notaVelha("2026-11-10T00:00:00Z", agora)).toBe(true);
    expect(notaVelha(undefined, agora)).toBe(true);
    expect(notaVelha("2026-11-20T00:00:00Z", agora)).toBe(false);
  });
  it("urlSegura bloqueia javascript:", () => {
    expect(urlSegura("javascript:alert(1)")).toBeUndefined();
    expect(urlSegura("https://ok.example")).toBe("https://ok.example");
    expect(urlSegura("/api/empresas/e1/logo?v=2")).toBe("/api/empresas/e1/logo?v=2");
    expect(urlSegura("//malicioso.example/x")).toBeUndefined();
    expect(urlSegura("data:text/html,x")).toBeUndefined();
  });
  it("URL com usuário/senha embutidos é recusada (mesma regra do back)", () => {
    expect(urlObrig.safeParse("https://user:senha@painel.example").success).toBe(false);
    expect(urlObrig.safeParse("https://painel.example/login").success).toBe(true);
  });
  it("telefone vira E.164", () => {
    expect(telefoneOpc.parse("+55 (11) 99999-0000")).toBe("+5511999990000");
    expect(telefoneOpc.parse("")).toBeNull();
    expect(telefoneOpc.safeParse("11 9999").success).toBe(false);
  });
});

describe("gerarSenha", () => {
  it("gera 16 caracteres sem ambíguos e diferentes a cada chamada", () => {
    const senhas = new Set(Array.from({ length: 50 }, () => gerarSenha()));
    expect(senhas.size).toBe(50);
    for (const s of senhas) expect(s).toMatch(/^[A-HJ-NP-Za-km-np-z2-9]{16}$/);
    expect(gerarSenha(20)).toHaveLength(20);
  });
});
