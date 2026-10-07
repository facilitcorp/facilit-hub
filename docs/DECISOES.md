# Decisões oficiais do Facilit Hub

> Aprovadas pelo Paulo (team leader) em 06/10/2026. Uma decisão nova ou uma
> mudança entra aqui por PR, com o motivo — e com o que foi descartado.

## D-001 — Repositório público

O `facilitcorp/facilit-hub` é **público**. Consequências obrigatórias estão em
[`CONTRIBUTING.md`](../CONTRIBUTING.md): nenhum dado real, nenhum segredo,
`.env.example` só com nomes, nada de segredo em `VITE_*`, gitleaks na esteira.

## D-002 — Arquitetura geral

- Monólito modular no back-end; SPA separada no front-end.
- Sem microsserviços nesta fase.
- PostgreSQL como fonte principal da verdade.
- API REST.
- **OpenAPI é o contrato oficial** entre front e back; os tipos do front são
  gerados a partir dele.
- Timeline derivada de eventos (não é cadastrada à mão).

## D-003 — Front-end

React 19 · Vite · TypeScript strict · Tailwind CSS 4 · shadcn/Radix ·
TanStack Query · React Router · React Hook Form · Zod · Recharts · Vitest ·
Testing Library · Playwright (fluxos críticos e prova visual).

Nenhuma outra biblioteca de front-end é obrigatória neste momento.

**Regra:** componente nunca chama `fetch` diretamente; acesso a dados fica em
camada própria/hooks.

## D-004 — Back-end

Node.js 22 · TypeScript · PostgreSQL · migrations versionadas · API REST ·
OpenAPI como contrato oficial · sessão via cookie HttpOnly · validação forte
das entradas.

Arquitetura (parte 1, oficial):

- Monólito modular; sem microsserviços nesta fase.
- PostgreSQL como fonte principal da verdade.
- API REST; OpenAPI como contrato oficial.
- Timeline derivada de eventos.
- Arquivos privados, acessados por URL assinada.
- **Autorização real sempre acontece no back-end.** O front-end apenas reflete
  as permissões recebidas da API.

<!-- PENDENTE: demais partes do back-end, se houver. -->

## D-005 — Sessão e CSRF: mesmo domínio, sem CORS

- Front e API são servidos **no mesmo domínio**; o front chama `/api` por
  caminho relativo (proxy no serviço do front). Não há CORS.
- Cookie de sessão `__Host-hub_sessao`: HttpOnly, Secure, `SameSite=Strict`,
  `Path=/`, sem `Domain`.
- Toda requisição que altera dados (POST/PATCH/PUT/DELETE) tem o cabeçalho
  `Origin` conferido pela API; ausente ou diferente → **403**.
- O front não guarda token nem precisa enviar cabeçalho anti-CSRF.

**Descartado:** API em domínio separado com CORS + credenciais — abre a porta
para CSRF e exige token extra em todo formulário, sem ganho para um app interno.

## D-006 — Organização raiz; empresas não são tenants

Aprovada pelo Paulo em 07/10/2026.

- A **Facilitcorp é a Organization raiz**. Telensat, Rastremix, Mobiliza, TERA,
  ClicToc etc. são **empresas dentro dela**, não tenants independentes.
- O isolamento de dados é por **organização**: toda tabela de domínio tem
  `organizacao_id`, e toda consulta filtra por ele no back-end.
- A sessão pertence a uma organização. O `organizacaoId` **nunca** vem do
  front (query ou corpo); sai da sessão. Hoje só existe uma, mas o modelo já
  aceita outras sem migração de dados.
- `empresaMaeId` continua existindo só para sub-empresas **dentro da mesma
  organização**.

**Descartado:** cada empresa como tenant — separaria dados que a gestão da
Facilitcorp precisa ver juntos (visão executiva) e não reflete o negócio.

## D-007 — Responsáveis são atores (pessoa, agente de IA, automação)

Aprovada pelo Paulo em 07/10/2026.

- Entidade `ator` (`id`, `organizacao_id`, `tipo` = `pessoa` | `agente` |
  `automacao`, `nome`, `ativo`, `descricao`).
- Usuário (quem faz login) é uma credencial ligada a um ator do tipo `pessoa`
  (`usuario.ator_id`). Agente e automação não têm usuário nem senha.
- **Toda atribuição aponta para `ator_id`**: responsável de projeto, de
  demanda, autor de evento na timeline, autor de decisão. Nenhuma FK de
  atribuição aponta para `usuario`.
- Ator inativo continua aparecendo no histórico, mas não recebe atribuição
  nova (400 com `codigo` = `ator_inativo`).
- No contrato: leitura traz `responsavel` (`id`, `tipo`, `nome`) embutido;
  escrita envia `responsavelId`. `GET /atores` alimenta o seletor.

**Descartado:** responsável como `usuario_id` com "usuário fantasma" para
agentes — misturaria login com atribuição e abriria credencial sem dono.

## D-008 — IA desacoplada da interface e do fornecedor

> **ADIADA (D-010).** Planejamento mantido; nada disso é implementado no MVP.
> O rascunho de contrato das análises está no commit `ca8c7be` (v0.4.0).

Aprovada pelo Paulo em 07/10/2026.

- **Nenhuma requisição HTTP espera resposta de modelo.** O front pede
  (`solicitarAnalise` → 202) e lê o que já existe (`listarAnalises`). A tela
  renderiza com a última análise salva, ou com "ainda não há análise".
- As gerações rodam em segundo plano: fila em tabela do Postgres
  (`tarefas_ia`, `FOR UPDATE SKIP LOCKED`), disparada por evento (D-009) ou
  por agenda. Falha e nova tentativa ficam registradas na tarefa.
- O 202 devolve a solicitação (`id` + `estado`), consultável em
  `obterSolicitacaoAnalise`. Pedido repetido para o mesmo alvo e tipo
  enquanto houver um pendente devolve o MESMO pendente — quem garante é o
  back (índice único parcial em `tarefas_ia` onde estado ∈ na_fila/gerando).
- O resultado é persistido em `analises_ia` com: **data da geração**,
  **fontes usadas** (ids de eventos/documentos/etc.), **provedor e modelo**,
  **nível de confiança** (`baixa` | `media` | `alta` | null), versão do prompt
  e `baseada_ate` (último evento considerado → permite marcar como
  desatualizada).
- **Sem acoplamento a fornecedor:** o módulo `ia` expõe uma interface
  interna (`ProvedorIA`). Cada fornecedor é um adaptador; qual usar é
  configuração (variável de ambiente), não código. Nenhum tipo de SDK de
  fornecedor sai do adaptador. No contrato, `provedor` e `modelo` são texto
  livre.
- Confiança é em faixa, não em número: número "0,87" vindo de modelo passa
  uma precisão que não existe.
- Escopo: aqui a IA **classifica, resume e aponta riscos** dentro do fluxo do
  produto. Agente autônomo (que recebe tarefa e age sozinho) é da
  plataforma; o Hub só o registra como ator (D-007) e recebe os eventos dele.

**Descartado:** chamar o modelo na própria requisição da tela — trava a
renderização, multiplica custo a cada visita e deixa a tela refém da latência
e da disponibilidade do fornecedor.

## D-009 — Eventos no Postgres, sem broker

> **No MVP (D-010):** a tabela `eventos` e o histórico entram; `agent.heartbeat`,
> fila de IA e `LISTEN/NOTIFY` ficam para depois.

Aprovada pelo Paulo em 07/10/2026.

- Tabela `eventos`, **somente inserção**: `id`, `organizacao_id`, `tipo`,
  `ocorreu_em`, `autor_ator_id` (null = sistema), `empresa_id`, `projeto_id`,
  `alvo_tipo`, `alvo_id`, `alvo_titulo`, `dados` (jsonb), `versao_schema`.
- O evento é gravado **na mesma transação** da mudança que o causou
  (padrão outbox): não existe mudança sem evento nem evento sem mudança.
- Consumidores (timeline, fila de IA, notificações) leem por cursor
  (`id`/`ocorreu_em`) e são acordados por `LISTEN/NOTIFY`. Cada consumidor
  guarda o próprio cursor; reprocessar é só voltar o cursor.
- A timeline é uma consulta/projeção sobre `eventos`, nunca cadastro à mão.
- Tipos iniciais (identificadores estáveis, só se acrescentam):
  `project.created`, `project.updated`, `demand.created`, `task.completed`,
  `decision.created`, `decision.approved`, `project.blocked`,
  `project.unblocked`, `document.added`, `agent.heartbeat`.
- `agent.heartbeat` é ruído para gente: fica fora da timeline por padrão e
  atualiza `ultimo_sinal_em` do ator. **Proposta:** reter só 30 dias desse tipo.

**Descartado (nesta fase):** Kafka e RabbitMQ — mais um componente para
operar sem volume que justifique; o outbox no Postgres permite migrar depois
sem mudar quem publica.

## D-010 — MVP operacional primeiro

Decidida pelo Paulo em 07/10/2026. Objetivo: gestores usando o Hub o quanto
antes, organizando empresas → projetos → demandas → responsáveis → prazos →
andamento → decisões → histórico.

**Prioridade 1 — fundação:** autenticação, sessão, usuários, permissões
básicas, Organization Facilitcorp, atores/responsáveis, empresas, projetos,
banco, migrations, API, OpenAPI, front-end e layout principal.

**Prioridade 2 — empresas:** ambiente de cada empresa com nome, logo,
capa, descrição, status, site, Instagram, Facebook, LinkedIn, YouTube,
WhatsApp, contatos, endereço, observações, responsáveis e projetos
vinculados (D-011).

**NÃO implementar agora** (decisões ficam documentadas): Facilit AI,
integração com Claude/OpenAI, geração automática de análises, Project Pulse e
Health Score inteligentes, previsão de atrasos, `agent.heartbeat`, integração
automática com GitHub, leitura de commits/deploys, alertas preditivos,
automações avançadas e orquestração de agentes.

Consequências no contrato (v0.5.0): rotas e schemas de análise removidos;
`agent.heartbeat` fora do `TipoEvento`. Nada de projeto é calculado
automaticamente: status, progresso e andamento são informados pelo gestor.

## D-011 — Empresa e projeto no MVP

Decidida pelo Paulo em 07/10/2026.

**Status da empresa:** `em_estruturacao` (sendo preparada), `ativa`
(operação normal), `pausada` (suspensa temporariamente), `inativa`
(encerrada/sem operação). Padrão ao criar: `em_estruturacao`.
**Descartado:** `em_implantacao`.

**Página da empresa** responde, de relance: o que é, qual a situação, quem
são os responsáveis, quais os canais e quais projetos estão vinculados.
Campos: nome, logo, capa, descrição, status, site, Instagram, Facebook,
LinkedIn, YouTube, WhatsApp, contatos, endereço, observações, responsáveis
(atores, com papel) e projetos vinculados (via `listarProjetos?empresaId=`,
com totais na própria empresa).

- Contato da empresa **não é ator**: é pessoa externa, sem login e sem
  atribuição.
- Logo e capa: envio pela API (PNG/JPEG/WebP, sem SVG; 2 MB / 5 MB), leitura
  por URL assinada.

**Projeto (P3):** nome, empresa, descrição, status, fase, responsável,
prioridade, progresso (0–100, manual), início, prazo, última atualização
(nota de andamento escrita pelo gestor, com autor e data) e próximos passos.
A antiga `saude` sai: o status `bloqueado` cobre o caso.
<!-- PENDENTE: confirmação do Paulo sobre os valores de status e fase do projeto. -->
