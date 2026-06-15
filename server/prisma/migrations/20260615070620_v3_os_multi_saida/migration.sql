-- CreateTable
CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'SUPERVISOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "equipeId" INTEGER,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Usuario_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Equipe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TipoServico" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OrdemServico" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sequencial" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "concluidoEm" DATETIME,
    "enviadaCasaEm" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    "tipoServicoId" INTEGER,
    "criadoPorId" INTEGER NOT NULL,
    CONSTRAINT "OrdemServico_tipoServicoId_fkey" FOREIGN KEY ("tipoServicoId") REFERENCES "TipoServico" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrdemServico_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Saida" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ordemId" INTEGER NOT NULL,
    "equipeId" INTEGER,
    "responsavelId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'EM_CAMPO',
    "fotos" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'CAMPO',
    "anotacoes" TEXT,
    "criadoPorId" INTEGER NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recebidoEm" DATETIME,
    CONSTRAINT "Saida_ordemId_fkey" FOREIGN KEY ("ordemId") REFERENCES "OrdemServico" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Saida_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Saida_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Saida_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FolhaEnvio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ordemId" INTEGER NOT NULL,
    "descricao" TEXT,
    "periodo" TEXT NOT NULL,
    "recebidoPorId" INTEGER,
    "criadoPorId" INTEGER NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FolhaEnvio_ordemId_fkey" FOREIGN KEY ("ordemId") REFERENCES "OrdemServico" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FolhaEnvio_recebidoPorId_fkey" FOREIGN KEY ("recebidoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FolhaEnvio_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventoAuditoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entidade" TEXT NOT NULL,
    "entidadeId" INTEGER NOT NULL,
    "acao" TEXT NOT NULL,
    "autorId" INTEGER,
    "descricao" TEXT NOT NULL,
    "diff" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventoAuditoria_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_login_key" ON "Usuario"("login");

-- CreateIndex
CREATE INDEX "Usuario_equipeId_idx" ON "Usuario"("equipeId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServico_sequencial_key" ON "OrdemServico"("sequencial");

-- CreateIndex
CREATE INDEX "OrdemServico_status_idx" ON "OrdemServico"("status");

-- CreateIndex
CREATE INDEX "OrdemServico_tipoServicoId_idx" ON "OrdemServico"("tipoServicoId");

-- CreateIndex
CREATE INDEX "Saida_ordemId_idx" ON "Saida"("ordemId");

-- CreateIndex
CREATE INDEX "Saida_status_idx" ON "Saida"("status");

-- CreateIndex
CREATE INDEX "FolhaEnvio_ordemId_idx" ON "FolhaEnvio"("ordemId");

-- CreateIndex
CREATE INDEX "EventoAuditoria_entidade_entidadeId_idx" ON "EventoAuditoria"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "EventoAuditoria_autorId_idx" ON "EventoAuditoria"("autorId");

-- CreateIndex
CREATE INDEX "EventoAuditoria_criadoEm_idx" ON "EventoAuditoria"("criadoEm");
