// =====================================================================
// Validador da integração (Opção 1 — local). Confere o data.json gerado pelo
// publicador contra o CONTRATO da SPA do dashboard_servicos e faz um diff
// estrutural com o data.json de produção. NÃO faz rede/push.
// Rode com: npm run integracao:validar (após integracao:publicar)
//
// Saída: relatório legível. Exit 1 se houver violação dura de schema.
// Avisos (endereço/bairro vazios, sem lat/lon, campos extras) são esperados
// e documentados em INTEGRACAO.md — não falham a validação.
// =====================================================================
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const aqui = dirname(fileURLToPath(import.meta.url))
const GERADO = process.env.INTEGRACAO_OUT ?? resolve(aqui, '../out/data.json')
const PROD = process.env.INTEGRACAO_PROD ?? resolve(aqui, '../../../dashboard_servicos/data.json')

// status_campo reconhecidos pela SPA (dashboard_servicos/app/src/lib/types.ts).
const STATUS_CAMPO = ['nao_visitada', 'visitada', 'batedor', 'atendendo', 'concluida', 'cancelada'] as const

const itemAtiva = z
  .object({
    sequencial: z.string().min(1),
    equipe: z.string(),
    endereco: z.string(),
    numero: z.string(),
    bairro: z.string(),
    tipo_servico: z.string(),
    status_campo: z.enum(STATUS_CAMPO),
    data_abertura: z.string().min(1),
    hora_abertura: z.string().min(1),
    atualizado_em: z.string().min(1),
  })
  .passthrough()

const itemConcluida = z
  .object({
    sequencial: z.string().min(1),
    equipe: z.string(),
    endereco: z.string(),
    numero: z.string(),
    bairro: z.string(),
    tipo_servico: z.string(),
    concluida_em: z.string().min(1),
  })
  .passthrough()

const envelope = z
  .object({
    atualizado_em: z.string().min(1),
    metricas: z.record(z.string(), z.number()).optional(),
    os_ativas: z.array(itemAtiva).optional(),
    concluidas_hoje: z.array(itemConcluida).optional(),
  })
  .passthrough()

function chaves(arr: unknown): Set<string> {
  const s = new Set<string>()
  if (Array.isArray(arr)) for (const it of arr) if (it && typeof it === 'object') Object.keys(it).forEach((k) => s.add(k))
  return s
}

function lerJson(caminho: string): any {
  return JSON.parse(readFileSync(caminho, 'utf8'))
}

let avisos = 0

console.log(`\n== Schema-check: ${GERADO} ==`)
const dados = lerJson(GERADO)
const parsed = envelope.safeParse(dados)
if (!parsed.success) {
  console.error('✗ VIOLAÇÃO de schema (a SPA não consumiria isto):')
  for (const issue of parsed.error.issues.slice(0, 20)) {
    console.error(`  · ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}
console.log('✓ envelope e itens conformes ao contrato da SPA')
console.log(`  os_ativas=${dados.os_ativas?.length ?? 0} · concluidas_hoje=${dados.concluidas_hoje?.length ?? 0}`)

// Degradações conhecidas (documentadas) → avisos, não erros.
const ativas: any[] = dados.os_ativas ?? []
const semEndereco = ativas.filter((o) => !o.endereco?.trim()).length
const semBairro = ativas.filter((o) => !o.bairro?.trim()).length
if (semEndereco) { avisos++; console.log(`  ⚠ ${semEndereco}/${ativas.length} ativas sem endereço (gap conhecido — virá de outro sistema)`) }
if (semBairro) { avisos++; console.log(`  ⚠ ${semBairro}/${ativas.length} ativas sem bairro (gap conhecido)`) }
const statusUsados = [...new Set(ativas.map((o) => o.status_campo))]
console.log(`  status_campo presentes nas ativas: ${statusUsados.join(', ') || '(nenhum)'}`)

// Diff estrutural vs produção.
console.log(`\n== Diff estrutural vs produção: ${PROD} ==`)
try {
  const prod = lerJson(PROD)
  for (const secao of ['os_ativas', 'concluidas_hoje'] as const) {
    const kGer = chaves(dados[secao])
    const kProd = chaves(prod[secao])
    const faltam = [...kProd].filter((k) => !kGer.has(k))
    const extras = [...kGer].filter((k) => !kProd.has(k))
    console.log(`  [${secao}]`)
    console.log(`    faltam vs produção: ${faltam.length ? faltam.join(', ') : '(nenhum)'}`)
    console.log(`    extras vs produção: ${extras.length ? extras.join(', ') : '(nenhum)'}`)
    if (faltam.length) avisos++
  }
  // status_campo de produção que talvez não saibamos gerar?
  const scProd = new Set<string>((prod.os_ativas ?? []).map((o: any) => o.status_campo))
  const desconhecidos = [...scProd].filter((s) => !STATUS_CAMPO.includes(s as any))
  if (desconhecidos.length) { avisos++; console.log(`  ⚠ status_campo de produção fora do conjunto conhecido: ${desconhecidos.join(', ')}`) }
} catch (e) {
  avisos++
  console.log(`  ⚠ não consegui ler o data.json de produção (${e instanceof Error ? e.message : e}). Diff pulado.`)
}

console.log(`\n===== Schema OK. ${avisos} aviso(s) (esperados/documentados — não falham). =====`)
process.exit(0)
