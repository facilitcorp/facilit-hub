# Como contribuir com o Facilit Hub

> Este repositório é **público**. Tudo que entra aqui pode ser lido por qualquer
> pessoa, para sempre — inclusive o histórico.

## Fluxo

1. Branch a partir da `main` (`feat/…`, `fix/…`, `docs/…`).
2. Pull Request para a `main`, com pelo menos **1 aprovação** e os checks verdes.
3. Nunca `push --force` na `main`.

## Segurança — regras de repositório público

1. **Nenhum dado real.** Mocks, seeds, testes, exemplos e capturas usam
   empresas e pessoas fictícias. Nome de cliente da Facilitcorp não entra nem
   em documentação.
2. **Nenhum segredo.** Senha, token, chave de API, cookie, connection string,
   credencial: nada disso entra em código, commit, log ou mensagem. Os valores
   ficam no Secret Manager / ambiente de execução. O `.env.example` traz
   **apenas os nomes** das variáveis.
3. **Nada interno em código.** URL de ambiente, ID de projeto de nuvem e
   endereço interno vêm de variável de ambiente.
4. **A proteção é do banco e da API, não do segredo do código.** As regras de
   acesso são legíveis por qualquer um; por isso o isolamento é por RLS no
   PostgreSQL e toda permissão é checada na API.

### Front-end

5. **Nada de segredo em `VITE_*`.** Toda variável `VITE_` vai para o JavaScript
   baixado pelo navegador. No front só entra configuração já pública (ex.: URL
   base da API). A esteira falha se encontrar `VITE_` com nome de segredo.
6. **Sem source map no build de produção.**

## Segredo vazou?

Commit com segredo **não se conserta apagando o commit**: o valor deve ser
considerado comprometido. Avise no grupo imediatamente para que a credencial
seja **rotacionada**; só depois limpe o histórico, se for o caso.

## Estrutura e ferramentas

| Pasta | O que é |
|---|---|
| `api/openapi.yaml` | Contrato oficial (D-002). Muda por PR próprio. |
| `web/` | Front-end (D-003). Tipos gerados do contrato em `web/src/api/gerado/` (não editar à mão). |
| `server/` | Back-end (D-004). |
| `docs/` | Decisões (`DECISOES.md`) e documentação. |

- Node 22 (`.nvmrc`) e **pnpm** via Corepack (`corepack enable`); monorepo com
  workspaces. Use só `pnpm` — nada de `package-lock.json` ou `yarn.lock`.
- TypeScript `strict` em todo pacote. ESLint (flat config) + Prettier.
- Cada pacote expõe os scripts `lint`, `typecheck`, `test` e `build`.
