# Integração `ambiental_cadastro` → `dashboard_servicos`

> Status: **ADIADA** (decisão do usuário em 2026-06-14). Este documento descreve o pipeline real,
> a ponte que já existe no backend e o caminho recomendado para ligar a integração quando for a hora.
> **Nenhum código de integração é implementado agora** — apenas instruções.

## 1. Como o `data.json` é produzido HOJE (pipeline real)

```
Planilha Excel
   │  (watch de arquivo)
   ▼
mapa_registros            ← Flask rodando numa VM da GCP
   │  DB própria com lat/lng geocodificados + histórico
   │  servicos/auto_sync.py :: _gerar_json()
   │  push via API do GitHub
   ▼
repo dashboard_servicos   ← commits "data: AAAA-MM-DD HH:MM" (~1/min) em data.json
   │  .github/workflows/deploy.yml
   ▼
GitHub Pages              ← publica a SPA
   ▼
SPA (React + vanilla)     ← fetch do data.json + polling a cada 30s
```

### Correção importante
- O diretório **`api__scrapper/` é um template abandonado** (`BASE_URL=exemplo.com`), **fora** do caminho de
  produção. Documentos antigos (e o `DECISOES_REDESIGN.md` original) mencionavam mexer no `api__scrapper` para
  integrar — isso está **errado**. Quem efetivamente produz e publica o `data.json` é o **`mapa_registros`**
  (Flask na GCP VM), conforme `HANDOFF.md:54` do repo `dashboard_servicos`.

## 2. A ponte JÁ existe no backend do cadastro

O `ambiental_cadastro` já expõe o endpoint:

```
GET /integracao/servicos   → DadosServicosExport
```

(`server/src/routes/integracao/exportServicos.ts`)

Ele emite exatamente o envelope `DadosServicosExport` no formato do `data.json`
(`atualizado_em`, `metricas`, `os_ativas[]`, `concluidas_hoje[]`), usando o mapa
`STATUS_PARA_CAMPO` (espelho de `app/src/lib/statusMap.ts`). É a peça que falta consumir.

Mapeamento de status atual (4 status novos):

| Status do cadastro | `status_campo` no data.json |
|--------------------|-----------------------------|
| `PENDENTE`         | `nao_visitada`              |
| `ATENDENDO`        | `atendendo`                 |
| `CONCLUIDA`        | `concluida`                 |
| `CANCELADA`        | `cancelada`                 |

OS ativas no export = `status in (PENDENTE, ATENDENDO)`. Concluídas hoje = `CONCLUIDA` com `concluidoEm >= início do dia`.

## 3. Decisão de arquitetura: fonte de verdade = DB do cadastro (Prisma)

O `dashboard_servicos` passará a consumir os dados **do cadastro** (reabre a unificação de repos no futuro).
Caminhos para ligar:

### Caminho recomendado — publicador pequeno
Um publicador (cron/loop, pode ser um script Node ou Python) que:
1. Faz login no cadastro e chama `GET /integracao/servicos`.
2. Serializa o resultado como `data.json`.
3. Dá `push` desse `data.json` no repo `dashboard_servicos` via **API do GitHub**.

Isso **substitui** o watch de Excel do `auto_sync.py`. O resto do pipeline (deploy.yml → Pages → SPA polling)
permanece intacto.

### Alternativa
Apontar o próprio `auto_sync.py` para consumir o endpoint `GET /integracao/servicos` em vez de ler a planilha Excel.

## 4. ⚠️ LACUNA conhecida — endereço, bairro e coordenadas

O redesign do cadastro **removeu** os campos `endereco`, `bairro`, `lat`, `lon` (e `maquina`) da OS. Consequência:

- O `data.json` gerado a partir do cadastro **não terá rua/bairro nem coordenadas**.
- A **tabela** do `dashboard_servicos` fica sem essas colunas e o **mapa** fica sem pins.

No export atual esses campos saem como **strings vazias** (`endereco`, `bairro`, `numero`) e `lat`/`lon`/`maquina`
são **omitidos**.

**Pré-requisito explícito da integração real:** endereço/bairro/coordenadas deverão vir de **outro sistema via API**
(já previsto no `DECISOES_REDESIGN.md`). Enquanto isso não existir, ligar o pipeline degrada a tabela/mapa do
`dashboard_servicos`. **Não se altera o código do cadastro por causa disso** — é decisão registrada, não bug.

## 5. ⚠️ Segurança — token OAuth exposto no remote git

O remote git do repo `dashboard_servicos` tem um **token OAuth do GitHub embutido na URL**
(formato `https://oauth2:gho_…@github.com/…`), visível em `git remote -v`.

**Recomendação:**
1. **Revogar/regerar** o token imediatamente (GitHub → Settings → Developer settings → tokens).
2. Reconfigurar o remote **sem credencial embutida**:
   ```
   git remote set-url origin https://github.com/<org>/dashboard_servicos.git
   ```
3. Usar um **credential helper** (ex.: `git config --global credential.helper manager`) ou um
   token em variável de ambiente no publicador — nunca commitar credencial.

## 6. Checklist para ligar a integração (quando for a hora)

- [ ] Revogar e regerar o token OAuth exposto; reconfigurar o remote do `dashboard_servicos` sem credencial embutida.
- [ ] Definir a origem de **endereço/bairro/coordenadas** (API do outro sistema) ou aceitar tabela/mapa degradados.
- [ ] Subir o backend do cadastro de forma acessível ao publicador (rede/credenciais).
- [ ] Criar o **publicador** (cron/loop): autentica → `GET /integracao/servicos` → escreve `data.json` →
      push via API do GitHub no `dashboard_servicos`. (Ou apontar `auto_sync.py` para o endpoint.)
- [ ] Desligar o watch de Excel do `auto_sync.py` (evitar dupla fonte).
- [ ] Validar: commit `data: …` aparece no `dashboard_servicos`; deploy.yml roda; SPA reflete em ≤30s.
- [ ] Conferir o mapeamento de `status_campo` (tabela acima) com o que a SPA do `dashboard_servicos` espera.
