# Deploy & Roadmap de Infraestrutura — ambiental_cadastro

Este documento descreve **como rodar hoje** (PC do trabalho, rede interna) e o **caminho de evolução**
para um site próprio em máquina dedicada. Nada aqui exige refazer o app — são passos de infraestrutura.

---

## 1. Hoje — rodar no PC do trabalho (porta única, LAN)

O backend já serve o frontend buildado, então **tudo roda numa porta só** (`3001`).

### Passos (uma vez, após clonar/atualizar)
```bat
preparar.bat
```
Instala dependências, aplica migrações, faz seed (admin/supervisor/campo + tipos + equipes + permissões)
e builda backend e frontend.

### Subir o sistema
```bat
iniciar.bat
```
Sobe o servidor (API + site) na porta 3001, com **auto-reinício** se cair. Acesso:
- No PC: `http://localhost:3001`
- Outros aparelhos na rede: `http://<IP-do-PC>:3001` (descubra o IP com `ipconfig`)

### Subir sozinho ao ligar o PC (sem admin)
```bat
instalar-autostart.bat
```
Cria um atalho na pasta **Inicializar** do usuário (`shell:startup`). Para desativar, apague o atalho.

### O que pedir ao TI (não-admin)
- Liberar a **porta 3001 (TCP, entrada)** no firewall do Windows, perfil Domínio/Privada.
- (Recomendado) **IP fixo / reserva DHCP** para o PC, senão o endereço muda ao reiniciar.
- Garantir que os aparelhos estão na **mesma rede** (sem isolamento de cliente no Wi-Fi).
- Permissão para instalar **Node.js LTS** + **Git** (e **Python 3 + openpyxl** só se for importar planilha).

### Trocar segredos antes do uso real
- `server/.env`: definir um **`JWT_SECRET`** forte; trocar `ADMIN_SENHA` (o seed sincroniza a senha do admin
  com esse valor). Trocar as senhas de `supervisor`/`campo` pela tela de Usuários.

> ⚠️ Limitação atual: rodar no PC pessoal/trabalho depende do PC ligado. Sem backup automático do banco
> (`server/prisma/dev.db`) — copie o arquivo periodicamente até o passo 3.

---

## 2. Backup do banco (SQLite) — recomendado já

O banco é um único arquivo: `server/prisma/dev.db`. Backup = copiar esse arquivo com o servidor parado
(ou usar `VACUUM INTO`). Sugestão simples: uma tarefa agendada do Windows copiando o `.db` para uma pasta
de rede/nuvem 1x/dia. (Pode virar um `backup.bat` quando quiser.)

---

## 3. Roadmap — site próprio em máquina dedicada

Quando o uso justificar tirar do PC pessoal. Passos independentes, do mais simples ao mais completo:

### 3.1 Máquina dedicada
- **Opção A — mini-PC na empresa** (ex.: Intel NUC/equivalente, Windows ou Linux): fica ligado 24/7 na rede
  interna. Mais barato no longo prazo; depende da rede/energia local.
- **Opção B — VPS na nuvem** (ex.: provedor cloud, 1–2 vCPU): acesso de qualquer lugar, IP público, mais fácil
  HTTPS/domínio; custo mensal e dados saem da empresa (avaliar LGPD/política interna).

### 3.2 Processo gerenciado (sempre no ar)
- Linux: **systemd** ou **pm2** (`pm2 start ... && pm2 startup && pm2 save`).
- Windows: **NSSM** (roda `node dist/index.js` como serviço) — substitui o `iniciar.bat`.
- Mantém o app reiniciando sozinho e subindo no boot, sem janela aberta.

### 3.3 Domínio + HTTPS
- Registrar um domínio (ex.: `cadastro.suaempresa.com.br`) apontando para a máquina.
- **Reverse proxy** com **Caddy** (HTTPS automático via Let's Encrypt, config trivial) ou **Nginx**:
  proxy `:443 → :3001`. A partir daí o app é acessado por `https://...` em vez de `http://IP:3001`.

### 3.4 Banco: SQLite → PostgreSQL
- Hoje SQLite cobre bem um time pequeno. Migrar a Postgres quando houver concorrência alta/backup robusto:
  1. `server/prisma/schema.prisma`: `provider = "postgresql"`.
  2. `DATABASE_URL` apontando para o Postgres.
  3. `npx prisma migrate deploy` (as queries Prisma não mudam; comentários já no schema).
  4. Migrar os dados existentes (export/import) e ativar **backups automáticos** do Postgres.

### 3.5 Hardening
- `JWT_SECRET` forte por ambiente; `.env` fora do versionamento (já está).
- Senhas iniciais trocadas; revisar expiração de token (admin 12h vs 15min).
- Logs/erros monitorados; backups testados (restaurar de fato, não só copiar).

### 3.6 Integração com o `dashboard_servicos` (quando for ligar)
- Publicar o `data.json` no GitHub (hoje o publicador é local — ver `INTEGRACAO.md`).
- **Revogar o token OAuth exposto** no remote do `dashboard_servicos` antes.
- Definir a origem de endereço/bairro/coordenadas (vêm de outro sistema).

---

## Checklist de cutover (PC pessoal → máquina dedicada)
- [ ] Máquina escolhida (mini-PC ou VPS) provisionada e na rede.
- [ ] Node/Git instalados; repo clonado; `preparar.bat`/equivalente rodado.
- [ ] Processo como serviço (NSSM/systemd/pm2) no boot.
- [ ] (Opcional) Domínio + HTTPS via Caddy/Nginx.
- [ ] Backup automático do banco configurado e **testado**.
- [ ] Segredos/senhas de produção trocados.
- [ ] Usuários reais criados e papéis/permissões revisados na tela **Permissões**.
- [ ] Dados migrados (se trocar p/ Postgres) e validados.
