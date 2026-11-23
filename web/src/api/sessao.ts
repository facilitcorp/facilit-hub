import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, dados, ErroApi } from "./cliente";
import type { Permissao } from "./tipos";

export const chaveSessao = ["sessao"] as const;

export function useObterSessao() {
  return useQuery({
    queryKey: chaveSessao,
    queryFn: async () => {
      try {
        return await dados(api.GET("/sessao"));
      } catch (e) {
        if (e instanceof ErroApi && e.naoAutenticado) return null;
        throw e;
      }
    },
    staleTime: Infinity,
  });
}

/** Só orienta a interface (esconder ações); quem nega é o back. */
export function usePode(permissao: Permissao) {
  return useObterSessao().data?.permissoes.includes(permissao) ?? false;
}

/** Nome da organização da sessão (D-006): nada de nome de organização fixo no código. */
export function useNomeOrganizacao() {
  return useObterSessao().data?.organizacao.nome ?? "";
}

export function useEntrar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; senha: string }) => dados(api.POST("/sessao", { body })),
    onSuccess: (s) => qc.setQueryData(chaveSessao, s),
  });
}

export function useSair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => dados(api.DELETE("/sessao")),
    onSettled: () => {
      qc.clear();
      qc.setQueryData(chaveSessao, null);
    },
  });
}
