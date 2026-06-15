// =====================================================================
// Importador de massa de TESTE (dev) — lê o JSON do extrair_planilha.py e
// insere no ambiental_cadastro via Prisma. Idempotente: pula o que já existe.
//
// Escopo (decidido com o usuário): OS "magras" (status ABERTA, sem tipo/equipe)
// a partir dos sequenciais abertos da planilha + tipos/equipes de referência.
// Folhas Casa: puladas. Endereço: não entra no v3 (vem de outro sistema).
//
// Pré-requisito: rodar antes `python scripts/extrair_planilha.py` (gera out/planilha.json).
// Uso: npm run import:planilha   (NÃO sobe o servidor; escreve direto no dev.db via Prisma)
// =====================================================================
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const aqui = dirname(fileURLToPath(import.meta.url))
const ENTRADA = process.env.IMPORT_OUT ?? resolve(aqui, '../out/planilha.json')
const prisma = new PrismaClient()

type Dados = { origem: string; tipos: string[]; equipes: string[]; sequenciais_abertos: string[] }

async function main() {
  const dados: Dados = JSON.parse(readFileSync(ENTRADA, 'utf8'))
  console.log(`Lendo ${ENTRADA} (origem: ${dados.origem})`)

  // Autor das OS importadas = um ADMIN existente (do seed).
  const admin =
    (await prisma.usuario.findFirst({ where: { papel: 'ADMIN' } })) ??
    (await prisma.usuario.findFirst())
  if (!admin) throw new Error('Nenhum usuário no banco. Rode `npm run seed` antes.')

  // --- Tipos de serviço (skip os que já existem por nome) ---
  const tiposExistentes = new Set((await prisma.tipoServico.findMany({ select: { nome: true } })).map((t) => t.nome))
  const tiposNovos = dados.tipos.filter((n) => !tiposExistentes.has(n))
  if (tiposNovos.length) await prisma.tipoServico.createMany({ data: tiposNovos.map((nome) => ({ nome })) })

  // --- Equipes (skip as que já existem por nome) ---
  const equipesExistentes = new Set((await prisma.equipe.findMany({ select: { nome: true } })).map((e) => e.nome))
  const equipesNovas = dados.equipes.filter((n) => !equipesExistentes.has(n))
  if (equipesNovas.length) await prisma.equipe.createMany({ data: equipesNovas.map((nome) => ({ nome })) })

  // --- OS abertas magras (skip sequenciais já existentes) ---
  const seqDesejados = [...new Set(dados.sequenciais_abertos)]
  const seqExistentes = new Set(
    (await prisma.ordemServico.findMany({ where: { sequencial: { in: seqDesejados } }, select: { sequencial: true } })).map(
      (o) => o.sequencial,
    ),
  )
  const seqNovos = seqDesejados.filter((s) => !seqExistentes.has(s))
  if (seqNovos.length) {
    await prisma.ordemServico.createMany({
      data: seqNovos.map((sequencial) => ({ sequencial, status: 'ABERTA', criadoPorId: admin.id })),
    })
  }

  console.log('✓ Import concluído:')
  console.log(`  tipos: +${tiposNovos.length} novos (${tiposExistentes.size} já existiam)`)
  console.log(`  equipes: +${equipesNovas.length} novas (${equipesExistentes.size} já existiam)`)
  console.log(`  OS abertas: +${seqNovos.length} novas (${seqExistentes.size}/${seqDesejados.length} já existiam)`)
}

main()
  .catch((e) => {
    console.error('✗ import falhou:', e instanceof Error ? e.message : e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
