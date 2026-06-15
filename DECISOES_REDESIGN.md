# Decisões finais — Redesenho do fluxo de cadastro/recebimento (`ambiental_cadastro`)

> Consolidado em 2026-06-14. Reúne **todas** as decisões fechadas no chat de redesign, inclusive as 3
> últimas (escopo/integração) que ainda **não** estavam no plano técnico.
> Plano técnico detalhado (arquivos, schema, rotas): `C:\Users\tanuk\.claude\plans\glistening-scribbling-newt.md`.

## Por que redesenhar

A v1 ficou funcional (backend verificado + front buildando), mas o **fluxo não serve ao uso real**:
cadastro pedia campos demais e a mudança de status estava escondida atrás de um ícone genérico — nem quem
conhece o sistema descobriu como concluir/atender uma OS. Alvo real: **operador idoso, sem vontade de usar
dashboard**, que precisa **cadastrar** e **receber** OS com pouquíssima digitação e baixo risco de erro.

## ⭐ As duas telas que são o projeto (tudo o mais é apoio)

1. **Cadastrar OS / Atribuição** — tela dedicada e grande. Bipa o `sequencial` (autofocus) → Tipo + Equipe +
   Responsável (pré-preenchido) + Anotações → **um botão grande "Cadastrar e atribuir"**. Com equipe, a OS já
   **nasce `ATENDENDO`** (atribuição num passo). Reseta pronto para o próximo bip.
2. **Receber OS / Verificação de fotos** — tela dedicada. Bipa o `sequencial` → resumo da OS → toggle
   **Com fotos / Sem fotos (equipe cobrada)** → **botão grande "Finalizar serviço"** (→ `CONCLUIDA`).
   Inclui aba **"Aguardando fotos"** para acompanhar/cobrar as pendências.

Essas duas ficam no **topo do menu** e são feitas/verificadas primeiro. O app **abre na tela Cadastrar**.

## Decisões fechadas (domínio e formulário)

| Tema | Decisão |
|------|---------|
| Identificador | `sequencial` **bipado** (string, `@unique`) **substitui** o `numero` auto. Placeholder "Bipe aqui a ordem de serviço", autofocus. **É o ID da OS.** |
| Campos removidos | `titulo`, `descricao`(→vira `anotacoes`), `endereco`, `bairro`, `lat`, `lon`, `maquina`. Endereço/bairro virão de outro sistema via API (fora desta v1). |
| Campos do cadastro | `sequencial` · **Tipo de serviço** (dropdown) · **Equipe** (dropdown) · **Responsável** (pré-preenchido = usuário logado; **admin pode trocar**, supervisor travado) · **Anotações** (opcional). |
| Status | **4 estados**: `PENDENTE`, `ATENDENDO`, `CONCLUIDA`, `CANCELADA`. (`ATENDENDO` funde os antigos ATRIBUIDA + EM_CAMPO.) |
| Ciclo (2 ações) | Cadastrar **com equipe** → `ATENDENDO`; **sem equipe** → `PENDENTE`. Receber → `CONCLUIDA`. |
| Ações nomeadas | Fim do diálogo "mudar status". Botões com verbo: **Atender** (Pendente→Atendendo), **Cancelar** (ativa→Cancelada). Concluir acontece pela tela **Receber OS**. |
| Fotos | Campo `fotos` na OS (`COM_FOTOS` / `SEM_FOTOS`, null até receber). Rótulo do "sem fotos": **"Sem fotos — equipe cobrada"** = a equipe já foi cobrada pelo serviço e as fotos virão depois. "Sem fotos" vira pendência visível. |
| Tipos de serviço | Nova **entidade** + **tela admin (CRUD)**, espelhando Equipes. O dropdown vem daí. |
| Recebimento | **Tela dedicada "Receber OS"** no menu (não é botão escondido na tabela). |
| Banco | **Resetar `dev.db`** + nova migração + re-seed (só há dados de teste). |

## Decisões de escopo (as 3 últimas — ainda não no plano técnico)

1. **Remover duplicação — cadastro só ESCREVE.** O `dashboard_servicos` já faz toda a verificação/visualização
   e está no ar. Então no `ambiental_cadastro` **dropar a view "Serviços (preview)" e o "Dashboard analítico"**.
   Menu final do cadastro: ⭐Cadastrar OS · ⭐Receber OS · Ordens (lista/gestão) · Equipes/Usuários/Tipos (admin)
   · Histórico (auditoria). **`dashboard_servicos` fica intacto.**
2. **Pendência de fotos é NOVA — controlar aqui.** Implementar a aba "Aguardando fotos" (OS `CONCLUIDA` com
   `fotos = SEM_FOTOS`) para o supervisor cobrar/regularizar.
3. ~~**Integrar AGORA**~~ → **Integração ADIADA (decisão 2026-06-14).** A investigação do pipeline foi concluída:
   quem produz/publica o `data.json` **não** é o `api__scrapper` (template abandonado, `BASE_URL=exemplo.com`),
   e sim o **`mapa_registros`** (Flask na GCP VM; `auto_sync.py::_gerar_json` → push via API do GitHub). A ponte
   já existe no backend do cadastro (`GET /integracao/servicos`). Decidido **não implementar a integração agora** —
   apenas deixar instruções. Ver **`INTEGRACAO.md`** (pipeline real, caminho recomendado com publicador, a lacuna
   de endereço/bairro/coordenadas e o achado de segurança do token OAuth exposto no remote do `dashboard_servicos`).

## Estado do código (antes do redesign)

- **Backend**: completo e verificado (smoke 22/22). **Frontend**: completo, `npm run build` passa, smoke E2E 10/10.
- Tudo isso usa o **modelo ANTIGO** (titulo, ATRIBUIDA/EM_CAMPO, lat/lon, etc.). O redesign **edita** esse modelo
  e adiciona as 2 telas — **não** reescreve do zero (reaproveita backend, auth, auditoria, tema, shell, CRUD).
- Cleanup pendente herdado: `<ToastProvider>` duplicado (`main.tsx` + `App.tsx`).

## Próximos passos (ordem sugerida)

1. **Retomar a investigação da integração** (pipeline `data.json` / `api__scrapper` do `dashboard_servicos`) —
   é o ponto onde paramos e o que falta para fechar 100% do escopo.
2. Atualizar o plano técnico (`glistening-scribbling-newt.md`) com as 3 decisões de escopo + a forma de integração.
3. Executar (exige "ok" explícito p/ workflow/4+ agentes): Fase A contrato+backend (Opus) → Fase B frontend
   fan-out priorizando as 2 telas (Sonnet) + mecânico (Haiku) → Fase C review (Opus) + verify inline.

## Lição técnica (não esquecer)

Para typecheck do front, usar **`npm run build` / `tsc -b`** — `tsc --noEmit` dá falso-positivo aqui (o
`tsconfig.json` raiz do Vite tem `files: []` + só `references`, checa zero arquivos).
