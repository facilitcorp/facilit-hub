import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, dados, LIMITE } from "./cliente";
import type { AtualizacaoEmpresa, EmpresaEntrada, FiltroEmpresas } from "./tipos";

export const chavesEmpresa = {
  todas: ["empresas"] as const,
  lista: (f: FiltroEmpresas) => ["empresas", "lista", f] as const,
  uma: (id: string) => ["empresas", id] as const,
};

export function useListarEmpresas(filtro: FiltroEmpresas = {}) {
  return useQuery({
    queryKey: chavesEmpresa.lista(filtro),
    queryFn: () =>
      dados(api.GET("/empresas", { params: { query: { limite: LIMITE, ...filtro } } })),
    placeholderData: keepPreviousData,
  });
}

export function useObterEmpresa(empresaId: string) {
  return useQuery({
    queryKey: chavesEmpresa.uma(empresaId),
    queryFn: () => dados(api.GET("/empresas/{empresaId}", { params: { path: { empresaId } } })),
  });
}

export function useCriarEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EmpresaEntrada) => dados(api.POST("/empresas", { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesEmpresa.todas }),
  });
}

export function useAtualizarEmpresa(empresaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AtualizacaoEmpresa) =>
      dados(api.PATCH("/empresas/{empresaId}", { params: { path: { empresaId } }, body })),
    onSuccess: (e) => {
      qc.setQueryData(chavesEmpresa.uma(empresaId), e);
      void qc.invalidateQueries({ queryKey: ["empresas", "lista"] });
      // nome/logo aparecem embutidos nos projetos
      void qc.invalidateQueries({ queryKey: ["projetos"] });
    },
  });
}

export type Imagem = "logo" | "capa";

export function useEnviarImagemEmpresa(empresaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ imagem, arquivo }: { imagem: Imagem; arquivo: File }) =>
      dados(
        api.PUT("/empresas/{empresaId}/{imagem}", {
          params: { path: { empresaId, imagem } },
          body: { arquivo: arquivo as unknown as string },
          bodySerializer: (b) => {
            const fd = new FormData();
            fd.append("arquivo", b.arquivo as unknown as File);
            return fd;
          },
        }),
      ),
    onSuccess: (e) => {
      qc.setQueryData(chavesEmpresa.uma(empresaId), e);
      void qc.invalidateQueries({ queryKey: ["empresas", "lista"] });
    },
  });
}

export function useRemoverImagemEmpresa(empresaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imagem: Imagem) =>
      dados(
        api.DELETE("/empresas/{empresaId}/{imagem}", { params: { path: { empresaId, imagem } } }),
      ),
    onSuccess: (e) => {
      qc.setQueryData(chavesEmpresa.uma(empresaId), e);
      void qc.invalidateQueries({ queryKey: ["empresas", "lista"] });
    },
  });
}

export function useListarAtores() {
  return useQuery({
    queryKey: ["atores"],
    queryFn: () =>
      dados(api.GET("/atores", { params: { query: { limite: LIMITE, ativo: true } } })),
    staleTime: 5 * 60_000,
  });
}
