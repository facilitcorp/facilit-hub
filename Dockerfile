# Imagem única do Facilit Hub: API (server/) servindo também o front compilado (web/dist), mesmo domínio (D-005).
# Configuração só por variável de ambiente; nenhum segredo entra na imagem (ver server/.env.example).

FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .nvmrc ./
COPY web/package.json web/
COPY server/package.json server/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @facilit-hub/web build && pnpm --filter @facilit-hub/server build \
 && rm -f web/dist/mockServiceWorker.js  # mocks só existem em desenvolvimento

FROM node:22-slim AS execucao
WORKDIR /app
ENV NODE_ENV=production HUB_WEB_DIR=/app/web/dist PORT=8080
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY web/package.json web/
COPY server/package.json server/
RUN pnpm install --frozen-lockfile --prod --filter @facilit-hub/server && pnpm store prune
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/web/dist web/dist
USER node
EXPOSE 8080
CMD ["node", "server/dist/main.js"]
