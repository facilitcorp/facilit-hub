import { useQuery } from "@tanstack/react-query";
import { api, dados } from "./cliente";

export function useObterPainel() {
  return useQuery({ queryKey: ["painel"], queryFn: () => dados(api.GET("/painel")) });
}

/** Janela de "prazo próximo" definida pelo back; undefined enquanto o painel carrega. */
export function useJanelaPrazo() {
  return useObterPainel().data?.janelaPrazoDias;
}
