import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, dados } from "./cliente";
import type { Conta, UsuarioAtualizacao, UsuarioEntrada } from "./tipos";

export const chaveUsuarios = ["usuarios"] as const;

export function useListarUsuarios() {
  return useQuery({
    queryKey: chaveUsuarios,
    queryFn: () => dados(api.GET("/usuarios")),
  });
}

/** Troca a conta na lista sem refazer a chamada. */
function useAtualizarLista() {
  const qc = useQueryClient();
  return (c: Conta) =>
    qc.setQueryData<{ itens: Conta[] }>(chaveUsuarios, (l) =>
      l ? { itens: l.itens.map((x) => (x.id === c.id ? c : x)) } : l,
    );
}

export function useCriarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UsuarioEntrada) => dados(api.POST("/usuarios", { body })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaveUsuarios });
      // a conta nova cria um ator, que passa a poder ser responsável
      void qc.invalidateQueries({ queryKey: ["atores"] });
    },
  });
}

export function useAtualizarUsuario() {
  const qc = useQueryClient();
  const atualizar = useAtualizarLista();
  return useMutation({
    mutationFn: ({ usuarioId, ...body }: UsuarioAtualizacao & { usuarioId: string }) =>
      dados(api.PATCH("/usuarios/{usuarioId}", { params: { path: { usuarioId } }, body })),
    onSuccess: (c) => {
      atualizar(c);
      // nome e situação do ator aparecem como responsável
      void qc.invalidateQueries({ queryKey: ["atores"] });
    },
  });
}

export function useRedefinirSenha() {
  const atualizar = useAtualizarLista();
  return useMutation({
    mutationFn: ({ usuarioId, senhaProvisoria }: { usuarioId: string; senhaProvisoria: string }) =>
      dados(
        api.PUT("/usuarios/{usuarioId}/senha-provisoria", {
          params: { path: { usuarioId } },
          body: { senhaProvisoria },
        }),
      ),
    onSuccess: atualizar,
  });
}
