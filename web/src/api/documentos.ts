import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, dados, LIMITE } from "./cliente";
import type { DocumentoAtualizacao, DocumentoEntrada, FiltroDocumentos } from "./tipos";

const chaveLista = (f: FiltroDocumentos) => ["documentos", f] as const;

export function useListarDocumentos(filtro: FiltroDocumentos = {}) {
  return useQuery({
    queryKey: chaveLista(filtro),
    queryFn: () =>
      dados(api.GET("/documentos", { params: { query: { limite: LIMITE, ...filtro } } })),
    placeholderData: keepPreviousData,
  });
}

export function useCriarDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DocumentoEntrada) => dados(api.POST("/documentos", { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documentos"] }),
  });
}

export function useAtualizarDocumento(documentoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DocumentoAtualizacao) =>
      dados(api.PATCH("/documentos/{documentoId}", { params: { path: { documentoId } }, body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documentos"] }),
  });
}

export function useRemoverDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentoId: string) =>
      dados(api.DELETE("/documentos/{documentoId}", { params: { path: { documentoId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documentos"] }),
  });
}
