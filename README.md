# ambiental_cadastro

App operacional de **Ordens de Serviço (OS)** da Ambiental: cadastrar (bipando o `sequencial`) e receber/finalizar
(com verificação de fotos), com histórico de auditoria. É a **fonte de escrita** dos dados — futuramente alimenta o
visualizador `dashboard_servicos` (integração descrita em [`INTEGRACAO.md`](./INTEGRACAO.md), ainda **não** ligada).

> **Sistema unificado futuro:** "ambiente" (monorepo deliberado, mais à frente). Este repo é só o app de cadastro/recebimento.

## Stack

- **Frontend** (`app/`): React 19 + Vite + MUI v9 (Material Design 3) + TypeScript.
- **Backend** (`server/`): Node + Express + TypeScript + Prisma. Banco **SQLite** (arquivo local), com anotações
  para migrar a PostgreSQL depois (ver `server/prisma/schema.prisma`).
- **Auth:** login por usuário (bcrypt + JWT ~15 min) + auto-logout por inatividade. Toda mutação grava evento de auditoria.

## Pré-requisitos

- **Node.js LTS** (testado no Node 24) e **npm**.
- **Git**.
- Nada de serviço externo: o banco é um arquivo SQLite local na máquina/rede interna.

## Rodar em outro PC (do zero)

```bash
git clone https://github.com/ooshimakenji/ambiente_cadastro.git
cd ambiente_cadastro
```

> `node_modules`, `.env` e o banco `dev.db` **não** são versionados — os passos abaixo recriam tudo.

### 1) Backend (`server/`)

```bash
cd server
npm install

# criar o .env a partir do exemplo e ajustar (ESPECIALMENTE o JWT_SECRET)
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env

npx prisma generate           # gera o Prisma Client
npx prisma migrate deploy     # cria o dev.db e aplica as migrações versionadas
npm run seed                  # popula dados de exemplo (admin, equipes, tipos, OS)

npm run dev                   # sobe a API em http://localhost:3001 (tsx watch)
```

Variáveis do `.env` (ver `server/.env.example`): `DATABASE_URL` (default `file:./dev.db`), **`JWT_SECRET`**
(trocar por valor forte), `JWT_EXPIRES_IN`, `PORT` (3001), `CORS_ORIGIN` (`http://localhost:5173`),
`ADMIN_LOGIN`/`ADMIN_SENHA`/`ADMIN_NOME` (admin inicial criado pelo seed).

### 2) Frontend (`app/`) — em outro terminal

```bash
cd app
npm install
npm run dev                   # sobe o app em http://localhost:5173
```

O Vite faz **proxy de `/api` → `http://localhost:3001`** (ver `app/vite.config.ts`), então o front fala com o
backend sem configuração extra em desenvolvimento.

### 3) Acessar

Abra **http://localhost:5173**. O app abre na tela **Cadastrar OS**. Logins criados pelo seed:

| Login | Senha | Papel |
|-------|-------|-------|
| `admin` | `admin123` (ou o `ADMIN_SENHA` do `.env`) | ADMIN |
| `supervisor` | `supervisor123` | SUPERVISOR |

> Troque essas senhas para uso real.

## Build de produção

```bash
# backend
cd server && npm run build && npm run start    # tsc -> dist/, roda node dist/index.js

# frontend
cd app && npm run build                          # gera app/dist/ (estático)
```

> Dica: para checar tipos do front use **`npm run build`** (o `tsc --noEmit` dá falso-positivo aqui porque o
> `tsconfig.json` raiz usa `references` + `files: []`).

## Estrutura

```
ambiental_cadastro/
├── app/                  # frontend React + Vite + MUI
│   └── src/{views,components,lib,theme,hooks}
├── server/               # backend Express + Prisma
│   ├── prisma/{schema.prisma, migrations/, seed.ts}
│   └── src/{routes,auth,audit,middleware}
├── CONTRACT.md           # contrato da API (endpoints, DTOs)
├── DECISOES_REDESIGN.md  # decisões do redesign do fluxo
└── INTEGRACAO.md         # como ligar a integração com o dashboard_servicos (futuro)
```

## Notas

- **Status da OS:** `PENDENTE → ATENDENDO → CONCLUIDA` (+ `CANCELADA`). Cadastrar com equipe nasce `ATENDENDO`;
  sem equipe nasce `PENDENTE`. Receber finaliza em `CONCLUIDA` (com ou sem fotos).
- **Telas principais:** *Cadastrar OS* e *Receber OS* (com aba *Aguardando fotos*). Demais: Ordens, Equipes,
  Usuários (ADMIN), Tipos de serviço, Histórico.
- Migração para PostgreSQL no futuro: ver comentários em `server/prisma/schema.prisma`.
