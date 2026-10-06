# QuimiPort API

[![CI](https://github.com/LuisLopoFranco/quimiport-api/actions/workflows/ci.yml/badge.svg)](https://github.com/LuisLopoFranco/quimiport-api/actions/workflows/ci.yml)

API backend para gestão de **cargas químicas em contexto portuário**, inspirada nas operações do Porto de Santos.
Projeto do **Tech Challenge – Fase 2** da Pós-Tech **Full Stack Development (FIAP/POSTECH)**, continuação da
modelagem feita na Fase 1 ([quimiport-docs](https://github.com/LuisLopoFranco/quimiport-docs)).

> 📘 **Quer ver como tudo foi construído, passo a passo?** Comece pelo [Guia de construção](docs/guia/00-indice.md).

![Swagger da API](docs/guia/img/swagger.png)

---

## Sumário

- [Contexto do problema](#contexto-do-problema)
- [Descrição da solução](#descrição-da-solução)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Como executar com Docker](#como-executar-com-docker-recomendado)
- [Como executar localmente](#como-executar-localmente-sem-docker-para-a-api)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Como executar os testes](#como-executar-os-testes)
- [Documentação da API](#documentação-da-api)
- [Principais endpoints](#principais-endpoints)
- [Regras de negócio e status da carga](#regras-de-negócio-e-status-da-carga)
- [Banco de dados](#banco-de-dados)
- [Arquitetura e decisões](#arquitetura-e-decisões)
- [Logs e observabilidade](#logs-e-observabilidade)
- [CI/CD](#cicd-com-github-actions)
- [GraphQL (diferencial)](#graphql-diferencial)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Integrantes do grupo](#integrantes-do-grupo)

---

## Contexto do problema

O Porto de Santos movimenta grandes volumes de produtos químicos perigosos (inflamáveis, corrosivos, tóxicos).
Cada carga precisa de produto corretamente classificado, documentação obrigatória válida (como a **FISPQ** e a
**Ficha de Emergência**), um **responsável técnico** e um fluxo controlado de análise, inspeção, liberação e
movimentação. Sem um sistema unificado, uma carga irregular pode ser movimentada, com risco à segurança e à
conformidade legal.

## Descrição da solução

O QuimiPort é uma API REST que:

- **cadastra produtos químicos** com número ONU, classe de risco da ONU e grupo de compatibilidade;
- **registra cargas químicas** associadas a um produto ativo, com quantidade, origem, destino, responsável técnico e documentos;
- **controla o ciclo de vida da carga** com uma máquina de estados que impede transições proibidas;
- **bloqueia, libera e cancela** cargas aplicando as regras de negócio (ex.: não libera sem documentação);
- **guarda o histórico** de todas as mudanças de status (auditoria);
- expõe **documentação Swagger**, **logs estruturados**, **métricas Prometheus** e uma pequena **API GraphQL**.

## Tecnologias utilizadas

| Tecnologia | Uso | Por quê |
|---|---|---|
| **Node.js 24 + TypeScript** | Linguagem e runtime | Exigência do desafio; TypeScript segue o ADR 003 da Fase 1 (tipagem estática) |
| **Express 5** | Framework HTTP | Minimalista, o mais difundido no ecossistema Node, não impõe estrutura: deixa a Clean Architecture da Fase 1 visível no código. Express 5 já trata erros de funções `async` |
| **PostgreSQL 16** | Banco de dados | Dados fortemente relacionais (carga → produto), integridade com FK/CHECK, transações para salvar o agregado |
| **node-postgres (`pg`)** | Acesso ao banco | SQL explícito e didático, sem "mágica" de ORM; o mapeamento fica nos repositórios |
| **Zod** | Validação de entrada | Valida formato do JSON na borda HTTP com mensagens claras |
| **Pino / pino-http** | Logs | Logs JSON estruturados, muito rápidos |
| **prom-client** | Métricas | Métricas no padrão Prometheus em `/metrics` |
| **Swagger UI (OpenAPI 3)** | Documentação | Documentação interativa em `/docs` |
| **GraphQL (graphql-http)** | Diferencial | Consulta de cargas por status com dados do produto |
| **Jest + Supertest** | Testes | Unitários, ponta a ponta (HTTP) e integração com PostgreSQL |
| **Docker / Docker Compose** | Containers | API + banco com um comando; Prometheus/Grafana opcionais |
| **GitHub Actions** | CI | Lint, typecheck, build, testes (com Postgres real) e build da imagem |

## Como executar com Docker (recomendado)

Pré-requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (ou Docker Engine + Compose v2).

```bash
git clone https://github.com/LuisLopoFranco/quimiport-api.git
cd quimiport-api

# Sobe PostgreSQL + API e espera os dois ficarem prontos (as migrações rodam sozinhas na inicialização)
docker compose up -d --build --wait

# (Opcional) carrega produtos de exemplo: Etanol, Ácido sulfúrico, Amônia...
docker compose exec api npm run db:seed:prod

# Acompanhar os logs
docker compose logs -f api
```

Pronto:

- API: http://localhost:3000
- Swagger: http://localhost:3000/docs
- Saúde: http://localhost:3000/health

Para subir também **Prometheus** (http://localhost:9090) e **Grafana** (http://localhost:3001, usuário `admin`/`admin`):

```bash
docker compose --profile monitoring up -d --build --wait
```

Para parar: `docker compose down` (adicione `-v` para apagar também os dados do banco).

## Como executar localmente (sem Docker para a API)

Pré-requisitos: Node.js 24 e um PostgreSQL acessível (pode ser só o banco via Docker: `docker compose up -d --wait db`).

```bash
npm install
cp .env.example .env        # ajuste DATABASE_URL se precisar
npm run db:migrate          # cria as tabelas
npm run db:seed             # (opcional) produtos de exemplo
npm run dev                 # API com recarga automática em http://localhost:3000
```

Sem banco nenhum? Troque a linha do `.env` para `DATABASE_URL=memory` e rode `npm run dev`: a API sobe com
repositórios em memória (útil para demonstração rápida; os dados somem ao reiniciar).

> **Windows:** os scripts `npm run ...` funcionam em qualquer terminal. Para os demais comandos deste README,
> use o **Git Bash** (instalado com o Git). Detalhes na [etapa 01 do guia](docs/guia/01-preparando-o-ambiente.md).

Build de produção (um comando por vez, funciona em qualquer terminal):

```bash
npm run build
npm start
```

## Variáveis de ambiente

Copie `.env.example` para `.env`.

| Variável | Padrão | Descrição |
|---|---|---|
| `NODE_ENV` | `development` | `development` (log colorido), `production` (log JSON) ou `test` (log silencioso) |
| `PORT` | `3000` | Porta HTTP |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/quimiport` | Conexão com o PostgreSQL; `memory` usa repositórios em memória |
| `LOG_LEVEL` | `info` | `trace`, `debug`, `info`, `warn`, `error` |
| `TEST_DATABASE_URL` | – | Banco usado pelos testes de integração (se ausente, eles são pulados) |

No Docker Compose, `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` também podem ser sobrescritas.

## Como executar os testes

```bash
npm test                    # todos os testes
npm run test:unit           # domínio e casos de uso (sem banco, sem HTTP)
npm run test:e2e            # API completa via HTTP com Supertest
npm run test:coverage       # com relatório de cobertura em coverage/

```

**Integração com PostgreSQL real** (pulada se `TEST_DATABASE_URL` não estiver definida):

```bash
docker compose up -d --wait db
docker compose exec db createdb -U postgres quimiport_test    # uma vez (e de novo após um down -v)
```

Depois, descomente a linha `TEST_DATABASE_URL=...` no seu `.env` e rode `npm test` (funciona em qualquer
terminal). Ou defina a variável só para um comando:

```bash
# Git Bash / Linux / macOS
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/quimiport_test npm test
```

```powershell
# PowerShell
$env:TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/quimiport_test"; npm test
```

São **93 testes** em 6 suítes. A cobertura de linhas fica em torno de 96% com o PostgreSQL de teste e 88% sem ele (o CI exige no mínimo 80%). Todos os cenários exigidos pelo enunciado estão cobertos:

| Cenário do enunciado | Onde |
|---|---|
| Cadastro de produto químico | `tests/unit/ProdutoQuimico.test.ts`, `tests/e2e/api.e2e.test.ts` |
| Bloqueio de produto sem nome / sem classe de risco | idem |
| Registro de carga química | `tests/unit/CargaQuimica.test.ts`, e2e |
| Bloqueio de carga com produto inativo | unit, casos de uso, e2e |
| Bloqueio de quantidade ≤ 0 | unit, e2e |
| Bloqueio de liberação sem documentação | unit, e2e |
| Atualização de status da carga | unit, e2e, integração |
| Transições permitidas e proibidas | `tests/unit/MaquinaEstadosCarga.test.ts` (todas as 64 combinações) |
| Cancelamento de carga | unit, e2e |
| Tentativa de movimentar carga bloqueada | unit, e2e, integração |

## Documentação da API

- **Swagger UI:** http://localhost:3000/docs
- **OpenAPI (JSON):** http://localhost:3000/docs.json
- **Arquivo fonte:** [`docs/api/openapi.yaml`](docs/api/openapi.yaml)
- **Requisições prontas** (VS Code REST Client / Insomnia): [`docs/api/quimiport.http`](docs/api/quimiport.http)

A documentação traz todos os endpoints, parâmetros, exemplos de request e response, códigos de erro e as regras aplicadas.

### Formato de erro

```json
{ "erro": { "codigo": "BUSINESS_RULE_VIOLATION", "mensagem": "Uma carga bloqueada não pode entrar em movimentação",
            "detalhes": { "statusAtual": "BLOQUEADA", "statusSolicitado": "EM_MOVIMENTACAO", "permitidos": ["CANCELADA"] } } }
```

| HTTP | Código | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Campo ausente ou inválido (sem nome, quantidade ≤ 0, sem responsável...) |
| 404 | `NOT_FOUND` | Produto ou carga inexistente |
| 409 | `CONFLICT` | Código de carga duplicado |
| 422 | `BUSINESS_RULE_VIOLATION` | Regra violada (transição proibida, produto inativo, documentação pendente) |
| 500 | `INTERNAL_ERROR` | Erro inesperado (detalhes só no log) |

## Principais endpoints

### Produtos químicos

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/produtos-quimicos` | Cria produto (status `ATIVO` por padrão) |
| `GET` | `/produtos-quimicos?status=ATIVO` | Lista (filtro opcional por status) |
| `GET` | `/produtos-quimicos/:id` | Busca por id |
| `PUT` | `/produtos-quimicos/:id` | Atualiza (substituição completa) |
| `PATCH` | `/produtos-quimicos/:id/inativar` | Inativação lógica |

### Cargas químicas

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/cargas-quimicas` | Registra carga (status `REGISTRADA`) |
| `GET` | `/cargas-quimicas?status=&produtoQuimicoId=` | Lista com filtros opcionais |
| `GET` | `/cargas-quimicas/:id` | Busca por id (inclui dados do produto) |
| `PATCH` | `/cargas-quimicas/:id/status` | Altera status `{ "status": "EM_ANALISE" }` |
| `PATCH` | `/cargas-quimicas/:id/bloquear` | Bloqueia `{ "motivo": "..." }` |
| `PATCH` | `/cargas-quimicas/:id/liberar` | Libera (exige documentação válida) |
| `PATCH` | `/cargas-quimicas/:id/cancelar` | Cancela (cancelamento lógico) |
| `POST` | `/cargas-quimicas/:id/documentos` | Anexa documento |
| `GET` | `/cargas-quimicas/:id/historico` | Histórico de status |

### Infra

`GET /health` · `GET /metrics` · `POST /graphql` · `GET /docs`

## Regras de negócio e status da carga

```mermaid
stateDiagram-v2
    [*] --> REGISTRADA
    REGISTRADA --> EM_ANALISE
    EM_ANALISE --> EM_INSPECAO
    EM_INSPECAO --> LIBERADA : documentação válida
    LIBERADA --> EM_MOVIMENTACAO
    EM_MOVIMENTACAO --> FINALIZADA
    REGISTRADA --> CANCELADA
    EM_ANALISE --> CANCELADA
    EM_INSPECAO --> BLOQUEADA : motivo obrigatório
    EM_INSPECAO --> CANCELADA
    LIBERADA --> CANCELADA
    BLOQUEADA --> CANCELADA
    FINALIZADA --> [*]
    CANCELADA --> [*]
```

Tudo o que não está no diagrama é **proibido** (ex.: `CANCELADA → LIBERADA`, `BLOQUEADA → EM_MOVIMENTACAO`,
`EM_INSPECAO → FINALIZADA`, `LIBERADA → REGISTRADA`). A tabela completa de permitidas e proibidas está em
[docs/maquina-de-estados.md](docs/maquina-de-estados.md).

Regras implementadas:

- Produto: obrigatório **nome** e **classe de risco**; **status** só `ATIVO`/`INATIVO`; produto **inativo** não entra em novas cargas.
- Carga: obrigatório **produto existente e ativo**, **quantidade > 0**, **responsável técnico** (nome e registro), origem e destino; **código único**.
- Liberação: só a partir de `EM_INSPECAO` e com **FISPQ** e **FICHA_EMERGENCIA** anexadas e dentro da validade.
- Bloqueio: só a partir de `EM_INSPECAO` e com **motivo**.
- Estados terminais (`FINALIZADA`, `CANCELADA`) não aceitam nenhuma alteração.

## Banco de dados

**PostgreSQL 16**, escolhido porque o domínio é relacional (toda carga referencia um produto), precisa de integridade
forte (chaves estrangeiras, `CHECK` de status e quantidade, código único) e de transações (carga + documentos +
histórico gravados juntos). Também evolui bem: índices, `JSONB` se surgirem atributos flexíveis, e
particionamento do histórico se o volume crescer.

```mermaid
erDiagram
    produtos_quimicos ||--o{ cargas_quimicas : "é usado em"
    cargas_quimicas ||--o{ carga_documentos : "possui"
    cargas_quimicas ||--o{ carga_status_historico : "registra"
```

Modelagem completa (campos, chaves, índices, como o status é controlado e evolução futura):
**[docs/modelagem-de-dados.md](docs/modelagem-de-dados.md)**. Script: [`db/migrations/001_criar_tabelas.sql`](db/migrations/001_criar_tabelas.sql).

## Arquitetura e decisões

Clean Architecture + DDD, seguindo os ADRs 001–005 da Fase 1:

```
presentation (Express, GraphQL)  →  application (casos de uso, DTOs)  →  domain (entidades, regras)
                     ↑                                                       ↑
                     └──────────── infrastructure (PostgreSQL, logs, métricas) implementa as interfaces do domínio
```

- **Domínio** sem nenhuma dependência externa: `ProdutoQuimico`, `CargaQuimica` (agregado raiz), objetos de valor e a `MaquinaEstadosCarga`.
- **Aplicação**: um caso de uso por arquivo (`RegistrarCargaQuimica`, `AlterarStatusCarga`...), que apenas orquestra.
- **Infraestrutura**: repositórios PostgreSQL **e** em memória implementando a mesma interface (prova prática da inversão de dependência).
- **Apresentação**: controllers finos, validação Zod, tratamento de erros centralizado.
- **Composition root** em `src/main/container.ts`: injeção de dependência manual, sem framework.

As decisões novas desta fase (ADR 006 a 012) estão em **[docs/decisoes-arquiteturais.md](docs/decisoes-arquiteturais.md)**.

## Logs e observabilidade

- **Logs estruturados (Pino)** em JSON: cada requisição (método, rota, status, tempo), erros de validação, erros
  internos, criação de produtos, registro de cargas, alterações de status, bloqueios, liberações e tentativas recusadas.
- **Métricas Prometheus** em `/metrics`: latência por rota, produtos criados, cargas registradas e mudanças de status por origem/destino.
- **Grafana** com painel pronto (perfil `monitoring` do Compose).
- **Health check** em `/health` (verifica o banco), usado também pelo `HEALTHCHECK` do Docker.

```json
{"level":"info","time":"2026-10-05T17:32:49.401Z","servico":"quimiport-api","cargaId":"...","codigo":"QP-2026-0003","de":"EM_INSPECAO","para":"BLOQUEADA","motivo":"Lacre violado","msg":"Carga bloqueada"}
```

## CI/CD com GitHub Actions

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda a cada push e pull request:

1. instala as dependências (`npm ci`);
2. lint (ESLint) e verificação de tipos;
3. build (compilação TypeScript);
4. testes unitários, e2e e de integração contra um **PostgreSQL real** (service container), com cobertura mínima de 80%;
5. valida o `docker-compose.yml` e faz o build da imagem Docker.

## GraphQL (diferencial)

`POST /graphql`, somente leitura, reaproveitando os mesmos casos de uso da API REST.

**Cenário:** um painel do porto precisa listar as cargas de um status com os dados do produto. Em REST seriam
N+1 chamadas; em GraphQL é uma só, e o cliente escolhe os campos.

```graphql
{
  cargasPorStatus(status: BLOQUEADA) {
    codigo
    quantidade
    produtoQuimico { nome classeRisco numeroOnu }
  }
  validarTransicao(de: BLOQUEADA, para: EM_MOVIMENTACAO) { permitida }
}
```

## Estrutura de pastas

```
src/
├── domain/                 # regras de negócio puras (não depende de nada)
│   ├── entities/           # ProdutoQuimico, CargaQuimica (agregado raiz)
│   ├── value-objects/      # StatusCarga, ClasseRisco, Quantidade, DocumentoCarga, ResponsavelTecnico
│   ├── services/           # MaquinaEstadosCarga
│   ├── repositories/       # interfaces (portas)
│   └── errors/             # ValidationError, BusinessRuleError, NotFoundError, ConflictError
├── application/
│   ├── use-cases/          # produtos/ e cargas/ (um caso de uso por arquivo)
│   ├── dtos/               # entrada e saída
│   └── interfaces/         # ILogger, IMetricas
├── infrastructure/
│   ├── config/             # variáveis de ambiente
│   ├── database/           # pool, migrações
│   ├── repositories/       # postgres/ e in-memory/
│   ├── logger/             # pino
│   └── observability/      # prom-client
├── presentation/
│   ├── http/               # controllers, routes, middlewares, validators (zod)
│   └── graphql/
└── main/                   # container (DI), app (Express) e server
db/migrations, db/seeds     # SQL
tests/unit, e2e, integration, fixtures
docs/                       # OpenAPI, modelagem, decisões, guia passo a passo
```

## Integrantes do grupo

- **Luis Gabriel Lopo Nogueira Franco** – Desenvolvedor / Arquiteto
