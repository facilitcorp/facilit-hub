# Facilit Hub — web

Front do MVP 1 (React 19 + Vite + TS strict, Tailwind 4, TanStack Query, React Hook Form + Zod).

```bash
corepack enable
pnpm install
cp web/.env.example web/.env.local   # VITE_MOCK=1 liga os mocks fictícios (senha "demo")
pnpm --filter @facilit-hub/web dev
```

Sem mocks, o Vite repassa `/api` para `API_URL` (padrão `http://localhost:3000`).

Scripts: `lint`, `typecheck`, `test`, `build`.

## Estado provisório

Os tipos em `src/api/tipos.ts` são escritos à mão a partir do contrato v0.6.0 e dos campos novos do
MVP 1. Quando `api/openapi.yaml` estiver na `main`, eles passam a sair de `src/api/gerado/`
(openapi-typescript), e `src/api/cliente.ts` passa a usar openapi-fetch. Os hooks e as telas não mudam.

Mocks (`src/mocks`) usam só empresas e pessoas fictícias.
