// =====================================================================
// Helper de diff para auditoria.
// Compara dois snapshots (antes/depois) e devolve { campo: [antes, depois] }
// apenas para os campos que mudaram. Serializado como String (JSON) em SQLite;
// na migração p/ Postgres o campo `diff` pode virar Json nativo.
// =====================================================================

export type ValorDiff = string | number | boolean | null | undefined
export type DiffMapa = Record<string, [ValorDiff, ValorDiff]>

type Snapshot = Record<string, unknown> | null | undefined

/**
 * Calcula o diff entre dois snapshots. Considera a união das chaves de ambos.
 * Datas são normalizadas para ISO string antes de comparar.
 * Retorna undefined quando nada mudou.
 */
export function calcularDiff(antes: Snapshot, depois: Snapshot): DiffMapa | undefined {
  const a = antes ?? {}
  const d = depois ?? {}
  const chaves = new Set([...Object.keys(a), ...Object.keys(d)])
  const diff: DiffMapa = {}

  for (const chave of chaves) {
    const va = normalizar(a[chave])
    const vd = normalizar(d[chave])
    if (va !== vd) {
      diff[chave] = [va, vd]
    }
  }

  return Object.keys(diff).length > 0 ? diff : undefined
}

function normalizar(v: unknown): ValorDiff {
  if (v === null || v === undefined) return v as null | undefined
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'object') return JSON.stringify(v)
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v
  return String(v)
}
