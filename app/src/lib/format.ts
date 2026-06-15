// Utilitários portados do vanilla (mesmo comportamento — ver PARITY.md)
// COPIADO de dashboard_servicos (manter idêntico p/ futura unificação).

export function texto(valor: unknown): string {
  return String(valor ?? '').trim()
}

export function normalizar(valor: unknown): string {
  return texto(valor)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function numero(valor: number): string {
  return Number(valor || 0).toLocaleString('pt-BR')
}

export function parseData(valor: unknown): Date | null {
  const raw = texto(valor)
  if (!raw) return null
  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatarData(valor: unknown): string {
  const d = parseData(valor)
  if (!d) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatarHora(d: Date | null): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d)
}
