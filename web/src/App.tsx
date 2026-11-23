import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { criarClienteQuery, rotas } from "@/rotas";

export function App() {
  const [qc] = useState(criarClienteQuery);
  const [router] = useState(() => createBrowserRouter(rotas));
  return (
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
