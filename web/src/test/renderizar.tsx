import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { criarClienteQuery, rotas } from "@/rotas";
import { reiniciarMocks } from "@/mocks/handlers";

export function renderizar(caminho: string, { logado = true } = {}) {
  reiniciarMocks({ logado });
  const qc = criarClienteQuery();
  qc.setDefaultOptions({ queries: { ...qc.getDefaultOptions().queries, retry: false } });
  const router = createMemoryRouter(rotas, { initialEntries: [caminho] });
  return {
    router,
    ...render(
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}
