// =====================================================================
// Publicador (Opção 1 — validação LOCAL). Autentica no cadastro, busca o
// export de integração e escreve um data.json local no formato do
// dashboard_servicos. NÃO faz push ao GitHub — push/staging/cutover ficam
// adiados (ver INTEGRACAO.md). Rode com: npm run integracao:publicar
//
// Config por env (.env): PORT, ADMIN_LOGIN, ADMIN_SENHA.
//   INTEGRACAO_API  → base da API (default http://localhost:PORT)
//   INTEGRACAO_OUT  → caminho do data.json (default server/out/data.json)
// =====================================================================
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.INTEGRACAO_API ?? `http://localhost:${process.env.PORT ?? 3001}`
const OUT = process.env.INTEGRACAO_OUT ?? resolve(aqui, '../out/data.json')
const LOGIN = process.env.ADMIN_LOGIN ?? 'admin'
const SENHA = process.env.ADMIN_SENHA ?? 'admin123'

async function main() {
  // 1. Login → token
  const rLogin = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: LOGIN, senha: SENHA }),
  })
  if (!rLogin.ok) {
    throw new Error(`Login falhou (${rLogin.status}). API em ${BASE} está no ar? Credenciais corretas?`)
  }
  const { token } = (await rLogin.json()) as { token: string }

  // 2. GET /integracao/servicos
  const rExport = await fetch(`${BASE}/integracao/servicos`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!rExport.ok) throw new Error(`Export falhou (${rExport.status}).`)
  const dados = await rExport.json()

  // 3. Escreve o data.json local (sem push).
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify(dados, null, 2) + '\n', 'utf8')

  const nAtivas = Array.isArray(dados.os_ativas) ? dados.os_ativas.length : 0
  const nConcl = Array.isArray(dados.concluidas_hoje) ? dados.concluidas_hoje.length : 0
  console.log(`✓ data.json gerado em ${OUT}`)
  console.log(`  atualizado_em=${dados.atualizado_em} · os_ativas=${nAtivas} · concluidas_hoje=${nConcl}`)
  console.log(`  metricas=${JSON.stringify(dados.metricas)}`)
  console.log('  (push ao dashboard_servicos NÃO realizado — validação local apenas)')
}

main().catch((e) => {
  console.error('✗ publicador falhou:', e instanceof Error ? e.message : e)
  process.exit(1)
})
