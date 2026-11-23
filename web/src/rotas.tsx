import { QueryClient } from "@tanstack/react-query";
import type { RouteObject } from "react-router";
import { Link } from "react-router";
import { ErroApi } from "@/api/cliente";
import { Estrutura } from "@/layout/Estrutura";
import { Documentos } from "@/paginas/Documentos";
import { Empresa } from "@/paginas/empresa/Empresa";
import { Empresas } from "@/paginas/Empresas";
import { Entrar } from "@/paginas/Entrar";
import { Hoje } from "@/paginas/Hoje";
import { Projeto } from "@/paginas/projeto/Projeto";
import { Projetos } from "@/paginas/Projetos";

export const rotas: RouteObject[] = [
  { path: "/entrar", element: <Entrar /> },
  {
    element: <Estrutura />,
    children: [
      { index: true, element: <Hoje /> },
      { path: "empresas", element: <Empresas /> },
      { path: "empresas/:id", element: <Empresa /> },
      { path: "projetos", element: <Projetos /> },
      { path: "projetos/:id", element: <Projeto /> },
      { path: "documentos", element: <Documentos /> },
      {
        path: "*",
        element: (
          <p className="text-sm">
            Página não encontrada.{" "}
            <Link to="/" className="text-marca">
              Voltar ao início
            </Link>
          </p>
        ),
      },
    ],
  },
];

export function criarClienteQuery() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (n, e) => !(e instanceof ErroApi && e.status < 500) && n < 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}
