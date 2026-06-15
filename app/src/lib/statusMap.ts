// =====================================================================
// Mapeamento de status ↔ vocabulário do dashboard_servicos (status_campo).
// Modelo v3: o status_campo é DERIVADO do status da OS + das saídas
// (o backend usa a mesma lógica em routes/integracao/exportServicos.ts).
// =====================================================================

import type { StatusOS, Saida } from './types'

// status_campo da referência (valores observados no data.json)
export type StatusCampo = 'nao_visitada' | 'visitada' | 'batedor' | 'atendendo' | 'concluida' | 'cancelada'

// Mapa simples por status da OS (fallback; ABERTA refina pelas saídas — ver derivarStatusCampo).
export const STATUS_PARA_CAMPO: Record<StatusOS, StatusCampo> = {
  ABERTA: 'nao_visitada',
  CONCLUIDA: 'concluida',
  CANCELADA: 'cancelada',
}

// status_campo da referência → nosso status da OS (colapsa os estados de ABERTA).
export const CAMPO_PARA_STATUS: Record<StatusCampo, StatusOS> = {
  nao_visitada: 'ABERTA',
  visitada: 'ABERTA',
  batedor: 'ABERTA',
  atendendo: 'ABERTA',
  concluida: 'CONCLUIDA',
  cancelada: 'CANCELADA',
}

// Derivação completa do status_campo a partir da OS + suas saídas.
//   CONCLUIDA → concluida; CANCELADA → cancelada
//   ABERTA: sem saída CAMPO → nao_visitada; alguma EM_CAMPO → atendendo;
//           última saída CAMPO NAO_REALIZADO → batedor; senão atendendo.
export function derivarStatusCampo(
  status: StatusOS,
  saidas: Pick<Saida, 'status' | 'tipo' | 'criadoEm'>[],
): StatusCampo {
  if (status === 'CONCLUIDA') return 'concluida'
  if (status === 'CANCELADA') return 'cancelada'
  const campo = saidas.filter((s) => s.tipo !== 'FOTO')
  if (campo.length === 0) return 'nao_visitada'
  if (campo.some((s) => s.status === 'EM_CAMPO')) return 'atendendo'
  const ordenadas = [...campo].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
  const ultima = ordenadas[ordenadas.length - 1]
  if (ultima.status === 'NAO_REALIZADO') return 'batedor'
  return 'atendendo'
}

// Shape de uma OS no formato data.json do dashboard_servicos (read-only na view de preview)
export interface ServicoExport {
  sequencial: string
  equipe: string
  endereco: string
  numero: string
  bairro: string
  tipo_servico: string
  status_campo: StatusCampo
  data_abertura?: string
  hora_abertura?: string
  atualizado_em?: string
  concluida_em?: string
  maquina?: string
  lat?: number
  lon?: number
}

// Envelope data.json (GET /integracao/servicos retorna este formato)
export interface DadosServicosExport {
  atualizado_em: string
  metricas?: Record<string, number>
  os_ativas?: ServicoExport[]
  concluidas_hoje?: ServicoExport[]
}
