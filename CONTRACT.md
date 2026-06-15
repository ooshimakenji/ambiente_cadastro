# Contrato da API — `ambiental_cadastro`

Fonte da verdade para as fases de Backend (2) e Frontend (4). Tipos TypeScript canônicos em
`app/src/lib/types.ts` (domínio + DTOs) e `app/src/lib/statusMap.ts` (integração). O backend **espelha**
esses tipos (monorepo com builds separados — não há import cruzado).

## Convenções

- **Base URL (dev):** app chama `/api/*`, o Vite faz proxy para `http://localhost:3001` (ver `vite.config.ts`).
- **Auth:** `Authorization: Bearer <JWT>`. Token expira em ~15 min (alinhado ao auto-logout). Em **401**, o
  cliente (`api.ts`) dispara logout.
- **Erros:** corpo JSON `{ "erro": "mensagem" }` + status HTTP adequado (400 validação, 401 não autenticado,
  403 sem permissão, 404 não encontrado, 409 conflito/transição inválida).
- **Datas:** ISO 8601 string na API.
- **Validação:** `zod` no server, espelhando as constantes de `types.ts` (`STATUS_OS`, `PAPEIS`, etc.).
- **Permissões:** todas as rotas protegidas exigem JWT. Gestão de **usuários é restrita a `ADMIN`**.

## Auditoria automática (regra transversal)

Toda mutação (criar/editar/mudar status/excluir, e login/logout) grava um `EventoAuditoria` **na mesma
transação Prisma** (`prisma.$transaction`) via serviço `registrarEvento({ entidade, entidadeId, acao,
autorId, antes, depois })`. O helper calcula `diff` (JSON `{ campo: [antes, depois] }`).

## Endpoints

### Auth
| Método | Rota | Corpo / resposta | Notas |
|---|---|---|---|
| POST | `/auth/login` | `LoginRequest` → `LoginResponse` | valida senha (bcrypt); gera evento `LOGIN` |
| POST | `/auth/logout` | — → 204 | gera evento `LOGOUT` |
| GET | `/auth/me` | → `Usuario` | usuário do token |

### Usuários (ADMIN)
| Método | Rota | Corpo / resposta |
|---|---|---|
| GET | `/usuarios` | → `UsuarioComEquipe[]` |
| POST | `/usuarios` | `NovoUsuario` → `Usuario` |
| PATCH | `/usuarios/:id` | `EditarUsuario` → `Usuario` |
| DELETE | `/usuarios/:id` | → 204 (ou desativa, ver nota) |

> Exclusão: preferir **desativar** (`ativo=false`) a apagar, para preservar FKs de auditoria/OS. `DELETE`
> pode mapear para desativação. Confirmar no detalhe da implementação.

### Equipes
| Método | Rota | Corpo / resposta |
|---|---|---|
| GET | `/equipes` | → `Equipe[]` |
| POST | `/equipes` | `NovaEquipe` → `Equipe` |
| PATCH | `/equipes/:id` | `EditarEquipe` → `Equipe` |
| DELETE | `/equipes/:id` | → 204 |

### Tipos de serviço
| Método | Rota | Corpo / resposta | Notas |
|---|---|---|---|
| GET | `/tipos` | → `TipoServico[]` | |
| POST | `/tipos` | `NovoTipoServico` → `TipoServico` | |
| PATCH | `/tipos/:id` | `EditarTipoServico` → `TipoServico` | |
| DELETE | `/tipos/:id` | → 204 | 409 se houver OS referenciando (FK P2003) — desativar em vez de excluir |

### Ordens de Serviço
| Método | Rota | Corpo / resposta | Notas |
|---|---|---|---|
| GET | `/ordens` | → `OrdemServicoExpandida[]` | filtros por query: `status`, `equipeId`, `responsavelId`, `fotos` (`COM_FOTOS`\|`SEM_FOTOS`), `sequencial` (igualdade). "Aguardando fotos" = `status=CONCLUIDA&fotos=SEM_FOTOS` |
| GET | `/ordens/:id` | → `OrdemServicoExpandida` + `eventos: EventoAuditoriaComAutor[]` | p/ timeline; inclui `tipoServico` |
| POST | `/ordens` | `NovaOrdem` → `OrdemServico` | usa o `sequencial` **bipado** (não gera mais `numero`). Com `equipeId` → nasce `ATENDENDO`; sem → `PENDENTE`. `sequencial` duplicado → **409** `{ erro: 'Já existe uma OS com este sequencial' }` |
| PATCH | `/ordens/:id` | `EditarOrdem` → `OrdemServico` | edita `tipoServicoId`/`equipeId`/`responsavelId`/`anotacoes`. `sequencial` é **imutável** |
| PATCH | `/ordens/:id/status` | `MudarStatusOrdem` → `OrdemServico` | valida `TRANSICOES_STATUS` (Atender/Cancelar); ao ir p/ `CONCLUIDA` seta `concluidoEm`; evento `MUDANCA_STATUS` |
| PATCH | `/ordens/:id/receber` | `ReceberOrdem` (`{ fotos }`) → `OrdemServico` | valida status `ATENDENDO`/`PENDENTE` (senão 409); seta `fotos`, `status=CONCLUIDA`, `concluidoEm`; evento `MUDANCA_STATUS` "finalizada (com/sem fotos)" |
| DELETE | `/ordens/:id` | → 204 | |

### Eventos (Histórico)
| Método | Rota | Corpo / resposta |
|---|---|---|
| GET | `/eventos` | `FiltroEventos` (query) → `EventoAuditoriaComAutor[]` |

### Dashboard
| Método | Rota | Resposta |
|---|---|---|
| GET | `/dashboard` | `DashboardResumo` (contagem por status + ordens recentes + últimos eventos) |

### Integração / preview (read-only)
| Método | Rota | Resposta | Notas |
|---|---|---|---|
| GET | `/integracao/servicos` | `DadosServicosExport` (formato `data.json` do dashboard_servicos) | usa `STATUS_PARA_CAMPO`; alimenta a view "Serviços (preview)" |

## Status de OS e transições

**4 status:** `PENDENTE`, `ATENDENDO`, `CONCLUIDA`, `CANCELADA`.
- `PENDENTE → [ATENDENDO, CANCELADA]`
- `ATENDENDO → [CONCLUIDA, CANCELADA, PENDENTE]`
- `CONCLUIDA → []`  ·  `CANCELADA → []`

Ciclo de uso real: **Cadastrar** (com equipe → nasce `ATENDENDO`; sem → `PENDENTE`) · **Atender**/**Cancelar**
via `PATCH /ordens/:id/status` · **Receber** via `PATCH /ordens/:id/receber` (→ `CONCLUIDA` + `fotos`). Matriz
exata em `TRANSICOES_STATUS` (`types.ts`). Mapeamento ao `status_campo` da referência em `statusMap.ts`
(`PENDENTE→nao_visitada`, `ATENDENDO→atendendo`, `CONCLUIDA→concluida`, `CANCELADA→cancelada`).

## Auto-logout (frontend)

Hook `useAutoLogout(timeoutMs)` reinicia timer em `mousemove`/`keydown`/`click`; ao expirar chama `logout()`.
Default ~15 min (alinhado à expiração do JWT).
