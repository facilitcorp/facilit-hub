import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, dados, LIMITE } from "./cliente";
import type { AtualizacaoProjeto, FiltroProjetos, NovoProjeto } from "./tipos";

export const chavesProjeto = {
  lista: (f: FiltroProjetos) => ["projetos", "lista", f] as const,
  um: (id: string) => ["projetos", id] as const,
  atualizacoes: (id: string) => ["projetos", id, "atualizacoes"] as const,
};

function invalidarResumos(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["projetos", "lista"] });
  void qc.invalidateQueries({ queryKey: ["empresas"] });
  void qc.invalidateQueries({ queryKey: ["painel"] });
}

export function useListarProjetos(filtro: FiltroProjetos = {}) {
  return useQuery({
    queryKey: chavesProjeto.lista(filtro),
    queryFn: () =>
      dados(api.GET("/projetos", { params: { query: { limite: LIMITE, ...filtro } } })),
    placeholderData: keepPreviousData,
  });
}

export function useObterProjeto(projetoId: string) {
  return useQuery({
    queryKey: chavesProjeto.um(projetoId),
    queryFn: () => dados(api.GET("/projetos/{projetoId}", { params: { path: { projetoId } } })),
  });
}

export function useCriarProjeto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NovoProjeto) => dados(api.POST("/projetos", { body })),
    onSuccess: () => invalidarResumos(qc),
  });
}

export function useAtualizarProjeto(projetoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AtualizacaoProjeto) =>
      dados(api.PATCH("/projetos/{projetoId}", { params: { path: { projetoId } }, body })),
    onSuccess: (p) => {
      qc.setQueryData(chavesProjeto.um(projetoId), p);
      invalidarResumos(qc);
    },
  });
}

export function useListarAtualizacoesProjeto(projetoId: string) {
  return useQuery({
    queryKey: chavesProjeto.atualizacoes(projetoId),
    queryFn: () =>
      dados(
        api.GET("/projetos/{projetoId}/atualizacoes", {
          params: { path: { projetoId }, query: { limite: LIMITE } },
        }),
      ),
  });
}

export function useRegistrarAtualizacaoProjeto(projetoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (texto: string) =>
      dados(
        api.POST("/projetos/{projetoId}/atualizacoes", {
          params: { path: { projetoId } },
          body: { texto },
        }),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chavesProjeto.um(projetoId) });
      void qc.invalidateQueries({ queryKey: chavesProjeto.atualizacoes(projetoId) });
      void qc.invalidateQueries({ queryKey: ["projetos", "lista"] });
    },
  });
}
