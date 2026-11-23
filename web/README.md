# Facilit Hub — web

Front do MVP 1 (React 19 + Vite + TS strict, Tailwind 4, TanStack Query, React Hook Form + Zod).

```bash
corepack enable
pnpm install
cp web/.env.example web/.env.local   # VITE_MOCK=1 liga os mocks fictícios (senha "demo")
pnpm --filter @facilit-hub/web dev
```

Sem mocks, o Vite repassa `/api` para `API_URL` (padrão `http://localhost:3000`).

### Contra o back real (sem banco nem nuvem)

```bash
# terminal 1 — API completa com Postgres em memória; mostra o login de teste no console
HUB_ORIGEM=http://localhost:5173 pnpm --filter @facilit-hub/server dev:memoria
# terminal 2 — front sem mocks, com /api apontando para a API
API_URL=http://127.0.0.1:8080 pnpm --filter @facilit-hub/web dev
```

`HUB_ORIGEM` precisa ser a origem do Vite: o back confere o `Origin` nas mutações.

## Contrato

Os tipos saem de `api/openapi.yaml` para `src/api/gerado/esquema.ts` (não editar à mão):

```bash
pnpm --filter @facilit-hub/web api:gerar
```

`src/api/tipos.ts` só dá nomes curtos aos tipos gerados; os hooks em `src/api/*.ts` usam
`openapi-fetch` e levam o nome do `operationId` (`useListarEmpresas`, `useAtualizarEmpresa`...).

Mocks (`src/mocks`) usam só empresas e pessoas fictícias.
