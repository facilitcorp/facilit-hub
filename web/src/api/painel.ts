import { useQuery } from "@tanstack/react-query";
import { api, dados } from "./cliente";

export function useObterPainel() {
  return useQuery({ queryKey: ["painel"], queryFn: () => dados(api.GET("/painel")) });
}
