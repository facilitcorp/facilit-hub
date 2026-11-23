import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pedir } from "./cliente";
import type {
  AtualizacaoProjeto,
  NotaAndamento,
  NovoProjeto,
  Pagina,
  Projeto,
  StatusProjeto,
} from "./tipos";

export interface FiltroProjetos {
  empresaId?: string;
  status?: StatusProjeto;
  busca?: string;
}

export const chavesProjeto = {
  todas: ["projetos"] as const,
  lista: (f: FiltroProjetos) => ["projetos", "lista", f] as const,
  um: (id: string) => ["projetos", id] as const,
  atualizacoes: (id: string) => ["projetos", id, "atualizacoes"] as const,
};

export function useListarProjetos(filtro: FiltroProjetos = {}) {
  return useQuery({
    queryKey: chavesProjeto.lista(filtro),
    queryFn: () =>
      pedir<Pagina<Projeto>>("GET", "/projetos", {
        consulta: { ...filtro, limite: 200 },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useObterProjeto(id: string) {
  return useQuery({
    queryKey: chavesProjeto.um(id),
    queryFn: () => pedir<Projeto>("GET", `/projetos/${id}`),
  });
}

function invalidarListas(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["projetos", "lista"] });
  void qc.invalidateQueries({ queryKey: ["empresas"] });
}

export function useCriarProjeto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: NovoProjeto) => pedir<Projeto>("POST", "/projetos", { corpo: dados }),
    onSuccess: () => invalidarListas(qc),
  });
}

export function useAtualizarProjeto(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: AtualizacaoProjeto) =>
      pedir<Projeto>("PATCH", `/projetos/${id}`, { corpo: dados }),
    onSuccess: (p) => {
      qc.setQueryData(chavesProjeto.um(id), p);
      invalidarListas(qc);
    },
  });
}

export function useListarAtualizacoes(projetoId: string) {
  return useQuery({
    queryKey: chavesProjeto.atualizacoes(projetoId),
    queryFn: () =>
      pedir<Pagina<NotaAndamento>>("GET", `/projetos/${projetoId}/atualizacoes`, {
        consulta: { limite: 100 },
      }),
  });
}

export function useRegistrarAtualizacao(projetoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (texto: string) =>
      pedir<NotaAndamento>("POST", `/projetos/${projetoId}/atualizacoes`, { corpo: { texto } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chavesProjeto.um(projetoId) });
      void qc.invalidateQueries({ queryKey: chavesProjeto.atualizacoes(projetoId) });
      invalidarListas(qc);
    },
  });
}
