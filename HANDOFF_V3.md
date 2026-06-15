# HANDOFF_V3 — estado da execução (redesign v3: OS multi-saída)

> Doc de estado **versionado** para retomar sem se perder se o contexto/tokens estourarem.
> Plano completo: `C:\Users\tanuk\.claude\plans\glittery-cooking-penguin.md`.
> Atualizar + commitar este arquivo **a cada fronteira de fase**.

## Objetivo

Evoluir o `ambiental_cadastro` do modelo linear (1 OS = 1 registro, `sequencial @unique`, 409 ao repetir) para
**OS (sequencial único) → N Saídas/atendimentos**. Foco: **rastreabilidade total**.

## Garantias inegociáveis (Parte 0 do plano)

- **`Saída` é append-only/imutável**: re-despachar a mesma OS **adiciona** saída, nunca sobrescreve/zera. Status da
  OS é **derivado** das saídas.
- **Sem hard delete de OS/Saída** (remover o `DELETE /ordens/:id` atual). Encerrar = estado `CANCELADA`.
- **Auditoria** em toda mutação (autor+data). **Migração de produção não destrutiva** (reset de `dev.db` só em dev).

## Modelo alvo

- `OrdemServico` (pai): `sequencial @unique`, `tipoServicoId`, `status` derivado (`ABERTA|CONCLUIDA|CANCELADA`),
  `concluidoEm?`, `enviadaCasaEm?`, `criadoPorId`, `criadoEm`. (Sai `fotos`/`equipeId`/`responsavelId` do nível OS.)
- `Saida` (filho): `ordemId`, `equipeId?`, `responsavelId?`, `status` (`EM_CAMPO|CONCLUIDA|NAO_REALIZADO|CANCELADA`),
  `fotos` (`COM_FOTOS|SEM_FOTOS|null`), `tipo` (`CAMPO|FOTO`), `anotacoes?`, `criadoEm`, `recebidoEm?`.
- `FolhaEnvio` (folhas casa): `ordemId`, `descricao?`, `periodo` (`MANHA|TARDE`), `recebidoPorId`, `criadoEm`.

## Regras-chave

- **Cadastrar** (`POST /ordens`): sequencial novo → cria OS + 1ª saída (com equipe → `EM_CAMPO`); sequencial
  existente → **nova saída** (re-despacho). **Sem 409 de duplicado.**
- **Receber** por desfecho (inputs `sequencial → status → fotos → descrição`): `CONCLUIDA` (fecha OS; `SEM_FOTOS`
  mantém pendência de foto) · `NAO_REALIZADO` (visita/batedor; OS segue ABERTA) · `CANCELADA`.
- **Saída de foto** (`tipo=FOTO`): regulariza foto de OS concluída-sem-foto → marca `COM_FOTOS`.
- **Folhas casa** (`/folhas`): bipagem registra envio + `enviadaCasaEm` (rastro; não muda status, não imputa
  responsabilidade). Indicador "folha já foi à casa".
- **Admin sem auto-logoff**: JWT admin longo (`JWT_EXPIRES_IN_ADMIN`, default 12h) + front não derruba ADMIN.
- Export `/integracao/servicos`: ABERTA+saída EM_CAMPO→`atendendo`; última NAO_REALIZADO→`batedor`; sem saída→
  `nao_visitada`; CONCLUIDA→`concluida`; CANCELADA→`cancelada`.
- Limpeza: delete tipo/equipe em uso → 409; remover `/dashboard`+`DashboardResumo`; corrigir aviso MUI Select.

## Checklist por fase

### Fase A — modelo + backend + contratos (Opus)
- [x] schema.prisma (OrdemServico/Saida/FolhaEnvio) + migração + seed (dev) + reset dev.db
- [x] domain.ts (STATUS_OS/STATUS_SAIDA/TIPO_SAIDA/PERIODO; entidades auditoria +SAIDA/+FOLHA_ENVIO)
- [x] rotas ordens (cadastrar=nova saída, sem 409; remover DELETE), saidas (receber por desfecho, saída foto)
- [x] rotas folhas (POST/GET) + indicador enviadaCasaEm
- [x] tipos/equipes DELETE-em-uso→409; remover /dashboard
- [x] export /integracao/servicos novo mapeamento
- [x] auth: JWT admin longo
- [x] contratos app/src/lib/types.ts + statusMap.ts
- [x] `npm run build` do server verde

> **Fase A concluída (2026-06-15).** Migração `20260615070620_v3_os_multi_saida` aplicada;
> seed verde (4 cenários); `tsc` verde. Rotas: `POST /ordens` (cadastrar/re-despacho),
> `POST /ordens/:id/saida-foto`, `PATCH /saidas/:id/receber`, `POST|GET /folhas`. Sem `DELETE /ordens`.
> Status da OS é derivado (`derivarStatusOS`); pendência de foto = saída CAMPO CONCLUIDA SEM_FOTOS
> (`aguardandoFotos`), fechada quando a saída FOTO é recebida COM_FOTOS (marca a CAMPO como COM_FOTOS).
> Contratos novos p/ Fase B: tipos `Saida`, `FolhaEnvio`, `OrdemServicoExpandida.saidas[]`;
> DTOs `NovaOrdem`, `NovaSaidaFoto`, `ReceberSaida`, `NovaFolhaEnvio`; labels/cores STATUS_OS/STATUS_SAIDA.
> `statusMap.derivarStatusCampo(status, saidas)` para o vocabulário do dashboard_servicos.

### Fase B — frontend fan-out
- [ ] CadastrarOS (nova saída se sequencial existe; fix aviso Select)
- [ ] ReceberOS (desfecho botões grandes + fotos + descrição; aba Aguardando fotos)
- [ ] FolhasCasa (nova tela bipagem + lista)
- [ ] OrdensServico (timeline de saídas + indicador folha; ações por estado)
- [ ] AppShell/menu (+ Folhas Casa); App abre em Cadastrar
- [ ] useAutoLogout exceção ADMIN
- [ ] cosmético package.json names
- [ ] `npm run build` do app verde

### Fase C — review + verify
- [ ] review adversarial (Opus)
- [ ] verify E2E (multi-saída, desfechos, foto, folhas casa, delete-409, DELETE /ordens removido, admin no-logoff)
- [ ] HANDOFF_V3 final + commit

## Estado atual
- **2026-06-15:** Plano v3 aprovado; automode autorizado. Tasks #4–#7 criadas. Este doc criado.
- **Próximo passo exato:** parar dev servers (liberar dev.db) e iniciar **Fase A** (agente Opus).
- Repo: `ambiental_cadastro` (git local + remote `ooshimakenji/ambiente_cadastro`). Branch `main`.
- v2 (modelo linear) está commitado no histórico (`de6ceb0`, `54f81b2`, `0767b5f`, README).

## Como retomar (comandos)
```
# backend
cd ambiental_cadastro/server
npm install
npx prisma generate && npx prisma migrate dev   # (dev) ou migrate deploy
npm run seed
npm run dev            # API :3001
# frontend
cd ../app && npm install && npm run dev          # :5173
# logins seed: admin/admin123 (ADMIN), supervisor/supervisor123
```
Typecheck: `cd server && npm run build` · `cd app && npm run build` (NÃO `tsc --noEmit`).
