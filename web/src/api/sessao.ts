import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ErroApi, pedir } from "./cliente";
import type { Sessao } from "./tipos";

const chave = ["sessao"] as const;

export function useSessao() {
  return useQuery({
    queryKey: chave,
    queryFn: async () => {
      try {
        return await pedir<Sessao>("GET", "/sessao");
      } catch (e) {
        if (e instanceof ErroApi && e.naoAutenticado) return null;
        throw e;
      }
    },
    staleTime: Infinity,
  });
}

export function useEntrar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: { email: string; senha: string }) =>
      pedir<Sessao>("POST", "/sessao", { corpo: dados }),
    onSuccess: (s) => qc.setQueryData(chave, s),
  });
}

export function useSair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => pedir<void>("DELETE", "/sessao"),
    onSettled: () => {
      qc.clear();
      qc.setQueryData(chave, null);
    },
  });
}
