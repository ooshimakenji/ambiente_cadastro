-- CreateTable
CREATE TABLE "PermissaoPapel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "papel" TEXT NOT NULL,
    "tela" TEXT NOT NULL,
    "permitido" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "PermissaoPapel_papel_tela_key" ON "PermissaoPapel"("papel", "tela");
