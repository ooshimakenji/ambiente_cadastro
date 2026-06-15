# HANDOFF_V3 — estado da execução (redesign v3: OS multi-saída)

> Doc de estado **versionado** para retomar sem se perder se o contexto/tokens estourarem.
> Plano completo: `C:\Users\tanuk\.claude\plans\glittery-cooking-penguin.md`.
> **Para retomar, diga ao Claude:** "continuar a Fase B do redesign v3 do ambiental_cadastro — ver HANDOFF_V3.md".

## Objetivo

Evoluir o `ambiental_cadastro` do modelo linear (1 OS = 1 registro, `sequencial @unique`, 409 ao repetir) para
**OS (sequencial único) → N Saídas/atendimentos**. Foco: **rastreabilidade total**.

## Garantias inegociáveis (Parte 0)
- **`Saída` append-only/imutável**: re-despachar a OS **adiciona** saída, nunca sobrescreve/zera. Status da OS é **derivado**.
- **Sem hard delete de OS/Saída** (DELETE /ordens removido). Encerrar = estado `CANCELADA`.
- **Auditoria** em toda mutação. **Migração de produção não destrutiva** (reset de `dev.db` só em dev).

═══════════════════════════════════════════════════════════════════════════
## ⏩ ESTADO ATUAL (2026-06-15) — LEIA PRIMEIRO

- ✅ **FASE A CONCLUÍDA e COMMITADA** — commit `a284595` ("feat(v3): modelo OS->N saídas + backend (Fase A)").
  Migração `20260615070620_v3_os_multi_saida` aplicada; seed verde (4 cenários); **`tsc` do server VERDE**.
- ✅ **FASE B CONCLUÍDA** — frontend alinhado ao contrato v3. Builds **VERDES**: `app/npm run build` e
  `server/npm run build`. Zero referências ao modelo antigo (`FotosOS`/`EditarOrdem`/`MudarStatusOrdem`/
  `PENDENTE`/`ATENDENDO`/`/ordens/:id/receber`/`/ordens/:id/status`).
  - Unidade 1 (telas de bipagem): `CadastrarOS.tsx` (re-despacho: bipa→GET /ordens?sequencial→resumo+"Cadastrar nova
    saída"; removido tratamento de 409; MUI Select corrigido), `ReceberOS.tsx` (reescrita: abas Receber [desfecho→
    fotos→descrição via PATCH /saidas/:id/receber] e Aguardando fotos [saida-foto+receber COM_FOTOS]),
    `FolhasCasa.tsx` (nova: bipagem + lista; aviso "só rastro").
  - Unidade 2: `OrdensServico.tsx` reescrita read-mostly (tabela v3 + Drawer com timeline de saídas + auditoria via
    GET /ordens/:id; sem criar/editar/excluir).
  - Unidade 3: `App.tsx` passa `isAdmin` ao `useAutoLogout`; `package.json` app/server renomeados; `main.tsx` OK.
  - Fix extra (não previsto): `app/src/components/Filtros.tsx` — `LABEL_ENTIDADE` ganhou `SAIDA`/`FOLHA_ENVIO`.
  - **NOTA**: o scaffolding de `App.tsx`/`AppShell.tsx` (nav `folhas`) e o param `isAdmin` em `useAutoLogout.ts` já
    existiam antes da Fase B (criados junto do contrato); a Fase B só completou o que faltava.
- ✅ **FASE C CONCLUÍDA** — review adversarial (Opus) + verify E2E HTTP (:3001) **28/28 OK**.
  - Review achou 2 [ALTO] + 1 [MÉDIO], todos corrigidos: (a) ReceberOS pegava a 1ª saída EM_CAMPO em vez da
    última (após re-despacho); (b) CadastrarOS tinha race entre verificar sequencial e submeter no Enter
    (mensagem/decisão com estado stale) → `verificarSequencial` agora retorna a OS e `cadastrar(existente?)`
    decide com dado fresco; (c) re-despacho de OS CANCELADA agora é bloqueado/avisado antes do POST. Também
    corrigido texto enganoso "Pendente/Atendimento" (status inexistentes no v3).
  - E2E validou: multi-saída append-only (NAO_REALIZADO mantém ABERTA; re-despacho soma saída sem sobrescrever),
    CONCLUIDA+SEM_FOTOS fecha OS com pendência de foto, aguardando-fotos, regularização via saída FOTO,
    folhas casa + `enviadaCasaEm`, `DELETE /ordens`→404, DELETE tipo/equipe em uso→409.
  - "Admin não cai por inatividade": verificado por código (`useAutoLogout(…, isAdmin)` + `App.tsx` passa o param).
  - Builds app+server **verdes** após as correções.
- Git: branch `main`. Commits v3: `a284595` (Fase A) + `fc9daf4` (Fase B) + commit da Fase C (este). Sem push.
- ✅ **PARTE 5 — VALIDAÇÃO LOCAL (Opção 1) IMPLEMENTADA** (2026-06-15). `server/scripts/publicador.ts`
  (login→`GET /integracao/servicos`→`server/out/data.json`, sem push) + `validarIntegracao.ts` (zod vs
  contrato da SPA + diff vs `dashboard_servicos/data.json`). Scripts: `npm run integracao:{publicar,validar,local}`.
  `exportServicos.ts` agora emite `metricas` por `status_campo` (fiel ao data.json de produção). Rodado:
  schema OK, só avisos esperados (endereço/bairro vazios = gap conhecido). **Push/staging/cutover/endereço
  seguem ADIADOS** (ver INTEGRACAO.md §7). Builds verdes.
- ⏭️ **PRÓXIMO (fora desta leva):** ligar a integração de verdade — revogar token OAuth exposto, definir origem
  de endereço/coordenadas, trocar writeFile por push GitHub e desligar o watch de Excel do auto_sync.py.

═══════════════════════════════════════════════════════════════════════════
## CONTRATO v3 (settado na Fase A — fonte para a Fase B)

**Tipos** (`app/src/lib/types.ts`, NÃO editar):
- `OrdemServico`: `sequencial`, `tipoServicoId`, `status` ∈ `ABERTA|CONCLUIDA|CANCELADA`, `concluidoEm?`,
  `enviadaCasaEm?`, `criadoPorId`, `criadoEm`. (Não há mais `fotos`/`equipeId`/`responsavelId`/`anotacoes`/`numero` na OS.)
- `OrdemServicoExpandida` = OS + `saidas: Saida[]` (ordem asc) + `tipoServico`.
- `Saida`: `id`, `ordemId`, `equipeId?`, `responsavelId?`, `status` ∈ `EM_CAMPO|CONCLUIDA|NAO_REALIZADO|CANCELADA`,
  `fotos` ∈ `COM_FOTOS|SEM_FOTOS|null`, `tipo` ∈ `CAMPO|FOTO`, `anotacoes?`, `criadoEm`, `recebidoEm?`.
- `FolhaEnvio`: `id`, `ordemId`, `descricao?`, `periodo` ∈ `MANHA|TARDE`, `recebidoPorId?`, `criadoEm`.
- DTOs: `NovaOrdem` `{sequencial,tipoServicoId,equipeId?,responsavelId?,anotacoes?}` ·
  `ReceberSaida` `{status,fotos?,anotacoes?}` · `NovaSaidaFoto` · `NovaFolhaEnvio` `{sequencial,descricao?,periodo,recebidoPorId?}`.
- Labels/cores: `STATUS_OS_LABELS/COR`, `STATUS_SAIDA_LABELS/COR`, `DESFECHO_SAIDA_LABELS`, `FOTOS_LABELS`, `PERIODO_LABELS`.
- `statusMap.derivarStatusCampo(status, saidas)` → vocabulário do dashboard_servicos.

**Rotas** (backend já pronto; confirmar params em `server/src/routes/{ordens,saidas,folhas}.ts`):
- `POST /ordens` — cadastrar; se `sequencial` já existe → **nova saída** (re-despacho), **sem 409**.
- `PATCH /saidas/:id/receber` — `{status,fotos?,anotacoes?}`; só saída `EM_CAMPO`. CONCLUIDA fecha a OS; SEM_FOTOS deixa pendência.
- `POST /ordens/:id/saida-foto` — cria saída tipo FOTO p/ regularizar foto.
- `POST /folhas` / `GET /folhas` — folhas casa (registra + seta `enviadaCasaEm`).
- `GET /ordens?sequencial=` · `GET /ordens?aguardandoFotos=true` · `GET /ordens/:id` (expandida) · `GET /tipos|/equipes|/usuarios`.
- **REMOVIDOS:** `DELETE /ordens/:id`, `PATCH /ordens/:id/status`, `PATCH /ordens/:id/receber`, `PATCH /ordens/:id`, `/dashboard`.
- Auth: JWT admin 12h (`JWT_EXPIRES_IN_ADMIN`), demais 15m.

═══════════════════════════════════════════════════════════════════════════
## FASE B — especificação para executar (3 unidades, arquivos DISJUNTOS)

Padrão: ler `app/src/views/Equipes.tsx` (MD3), `useAuth.tsx` (`usuario.id/nome/papel`), `Toast.tsx` (`useToast`),
`useM3`, `format.ts` (`formatarData`), `api` genérico (`api.get/post/patch`, NÃO editar). Público idoso → botões/campos grandes.
Typecheck: `cd app && npm run build` (NÃO `tsc --noEmit`).

### Unidade 1 (Sonnet) — telas de bipagem: `CadastrarOS.tsx`, `ReceberOS.tsx`, `FolhasCasa.tsx`(novo)
- **CadastrarOS**: sequencial autofocus; Tipo(/tipos), Equipe(/equipes), Responsável(logado; ADMIN troca via /usuarios, SUPERVISOR travado), Anotações. Se sequencial já existe (`GET /ordens?sequencial=`) → mostra resumo + saídas e botão "Cadastrar nova saída"; senão "Cadastrar e atribuir". `POST /ordens`. **Corrigir aviso MUI Select out-of-range** (value '' até opções carregarem). Reset+refoco após sucesso.
- **ReceberOS**: abas **Receber** e **Aguardando fotos**. Receber: bipa → `GET /ordens?sequencial=` → acha saída `EM_CAMPO` → inputs grandes **status (Concluída[default]/Não realizado/Cancelada) → fotos (se Concluída) → descrição** → `PATCH /saidas/{id}/receber`. Aguardando fotos: `GET /ordens?aguardandoFotos=true`; ação "Regularizar foto" via `POST /ordens/:id/saida-foto` + `PATCH /saidas/:id/receber {status:CONCLUIDA,fotos:COM_FOTOS}` (confirmar fluxo em saidas.ts).
- **FolhasCasa** (novo): bipa sequencial + período(Manhã/Tarde) + descrição + quem recebeu(logado/ADMIN escolhe) → `POST /folhas`; lista `GET /folhas`. É só rastro (avisar na UI). Default export.

### Unidade 2 (Sonnet) — `OrdensServico.tsx` (reescrever, read-mostly)
- Tabela OS: Sequencial · Status OS · Tipo · nº saídas · última saída(equipe+desfecho) · Foto pendente? · Folha à casa?(ícone se `enviadaCasaEm`) · Criada em. Busca/filtro por status.
- Detalhe (drawer/expand): **timeline de todas as Saídas** (data, equipe/resp, tipo CAMPO/FOTO, desfecho, fotos, anotações, recebidoEm) + envios de folha + eventos de auditoria (se vierem no GET /ordens/:id). É o coração da rastreabilidade.
- **Sem criar/editar/excluir** (append-only; sem DELETE). Remover todo código do modelo antigo (numero/titulo/endereco/DialogStatus/EditarOrdem/MudarStatusOrdem).

### Unidade 3 (Haiku) — navegação + auto-logout admin + cosmético
- `AppShell.tsx` navItems: add **`folhas` → "Folhas Casa"** (ícone Outlined). Ordem: Cadastrar · Receber · Folhas Casa · Ordens · Equipes · Usuários(ADMIN) · Tipos · Histórico. Ajustar tipo `NavView` (+`folhas`).
- `App.tsx`: importar `FolhasCasa` (`./views/FolhasCasa`, default), caso `folhas`→`<FolhasCasa/>`. View inicial `cadastrar`. Manter `usuarios` p/ ADMIN.
- `useAutoLogout.ts`: **não derrubar ADMIN** — quando `papel==='ADMIN'`, não armar timer/listeners (sair cedo). SUPERVISOR continua caindo ~15min. Ver como é chamado (App.tsx + useAuth).
- `package.json`: `app` → name `ambiental-cadastro-app`; `server` → `ambiental-cadastro-server`. `main.tsx`: conferir sem ToastProvider duplicado.

### Após Fase B
- `cd app && npm run build` VERDE. Commit: "feat(v3): frontend telas multi-saída + folhas casa (Fase B)". Marcar checklist abaixo.

═══════════════════════════════════════════════════════════════════════════
## FASE C — review + verify (após Fase B)
- Review adversarial (Opus). Verify E2E (HTTP, server :3001): bipar→saída→receber cada desfecho→nova saída (mesmo sequencial, **append-only: saídas anteriores permanecem**)→concluir→aguardando fotos→regularizar foto→folhas casa + indicador "foi à casa"→`DELETE /ordens` não existe (404/405)→delete tipo/equipe em uso 404→409→admin não cai por inatividade. Builds verdes. HANDOFF final + commit.

## Checklist
### Fase A — [x] CONCLUÍDA (commit a284595)
### Fase B — [x] Unidade 1 (bipagem) · [x] Unidade 2 (OrdensServico) · [x] Unidade 3 (nav/logout/cosmético) · [x] build app verde · [x] commit
### Fase C — [x] review · [x] verify E2E (28/28) · [x] HANDOFF final + commit

## Como retomar (comandos)
```
cd ambiental_cadastro/server && npm install && npx prisma generate && npm run dev   # API :3001 (dev.db já migrado+seedado)
cd ../app && npm install && npm run dev                                              # :5173 (quebra até Fase B)
# logins seed: admin/admin123 (ADMIN), supervisor/supervisor123
# typecheck: (server) npm run build · (app) npm run build   — NÃO tsc --noEmit
```

## Notas futuras ("ambiente", fora desta leva)
Importar a cópia da planilha do dono p/ massa real de OS; RBAC por tela (usuário só vê telas permitidas).
Integração data.json (publicador + validação local, Opção 1) é a Parte 5 — após v3 assentar.
