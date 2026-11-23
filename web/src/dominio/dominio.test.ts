import { describe, expect, it } from "vitest";
import type { Projeto } from "@/api/tipos";
import { diasAte, haQuanto, notaVelha, urlSegura } from "./formato";
import { resumoDoGrupo } from "./painel";
import { telefoneOpc } from "./formulario";

const agora = new Date("2026-11-23T12:00:00Z").getTime();
const base = {
  versao: 1,
  empresa: { id: "e", nome: "E" },
  prioridade: "media",
  fase: "execucao",
  progresso: 0,
  documentos: [],
  atualizadoEm: "2026-11-01T00:00:00Z",
} as const;
const p = (x: Partial<Projeto>) =>
  ({ ...base, id: "x", nome: "x", status: "em_andamento", ...x }) as Projeto;

describe("resumoDoGrupo", () => {
  it("conta ativos, bloqueados, prazo próximo e concluídos recentes", () => {
    const r = resumoDoGrupo(
      [
        p({ status: "em_andamento", prazoPrevisto: "2026-11-30" }),
        p({ status: "bloqueado", prazoPrevisto: "2027-03-01" }),
        p({
          status: "concluido",
          prazoPrevisto: "2026-11-24",
          concluidoEm: "2026-11-20T00:00:00Z",
        }),
        p({ status: "concluido", concluidoEm: "2026-09-01T00:00:00Z" }),
        p({ status: "cancelado", prazoPrevisto: "2026-11-24" }),
      ],
      agora,
    );
    expect(r).toEqual({ ativos: 1, bloqueados: 1, proximosDoPrazo: 1, concluidosRecentes: 1 });
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
  });
  it("telefone vira E.164", () => {
    expect(telefoneOpc.parse("+55 (11) 99999-0000")).toBe("+5511999990000");
    expect(telefoneOpc.parse("")).toBeNull();
    expect(telefoneOpc.safeParse("11 9999").success).toBe(false);
  });
});
