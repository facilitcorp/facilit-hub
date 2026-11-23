import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pedir } from "./cliente";
import type { AtorResumo, AtualizacaoEmpresa, Empresa, Pagina, StatusEmpresa } from "./tipos";

export const chavesEmpresa = {
  todas: ["empresas"] as const,
  lista: (f: FiltroEmpresas) => ["empresas", "lista", f] as const,
  uma: (id: string) => ["empresas", id] as const,
};

export interface FiltroEmpresas {
  status?: StatusEmpresa;
  busca?: string;
}

export function useListarEmpresas(filtro: FiltroEmpresas = {}) {
  return useQuery({
    queryKey: chavesEmpresa.lista(filtro),
    queryFn: () =>
      pedir<Pagina<Empresa>>("GET", "/empresas", {
        consulta: { status: filtro.status, busca: filtro.busca, limite: 200 },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useObterEmpresa(id: string) {
  return useQuery({
    queryKey: chavesEmpresa.uma(id),
    queryFn: () => pedir<Empresa>("GET", `/empresas/${id}`),
  });
}

export function useCriarEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: { nome: string; descricaoCurta?: string; segmento?: string }) =>
      pedir<Empresa>("POST", "/empresas", { corpo: dados }),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesEmpresa.todas }),
  });
}

export function useAtualizarEmpresa(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: AtualizacaoEmpresa) =>
      pedir<Empresa>("PATCH", `/empresas/${id}`, { corpo: dados }),
    onSuccess: (e) => {
      qc.setQueryData(chavesEmpresa.uma(id), e);
      void qc.invalidateQueries({ queryKey: ["empresas", "lista"] });
    },
  });
}

export function useListarAtores() {
  return useQuery({
    queryKey: ["atores"],
    queryFn: () => pedir<Pagina<AtorResumo>>("GET", "/atores", { consulta: { limite: 200 } }),
    staleTime: 5 * 60_000,
  });
}
