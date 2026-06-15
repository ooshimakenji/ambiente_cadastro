// =====================================================================
// Mapeamento de status ↔ vocabulário do dashboard_servicos (status_campo).
// Compatibilidade futura: o backend usa o mesmo mapeamento em
// server/src/integracao/exportServicos.ts para GET /integracao/servicos.
// ⚠️ Pares marcados (*) a revisar com o usuário ao implementar a integração.
// =====================================================================

import type { StatusOS } from './types'

// status_campo da referência (valores observados no data.json)
export type StatusCampo = 'nao_visitada' | 'visitada' | 'batedor' | 'atendendo' | 'concluida' | 'cancelada'

// Nosso status (4 valores) → status_campo da referência.
export const STATUS_PARA_CAMPO: Record<StatusOS, StatusCampo> = {
  PENDENTE: 'nao_visitada',
  ATENDENDO: 'atendendo',
  CONCLUIDA: 'concluida',
  CANCELADA: 'cancelada',
}

// status_campo da referência → nosso status (inverso).
// 'visitada'/'batedor' da referência colapsam em ATENDENDO no nosso modelo de 4 status.
export const CAMPO_PARA_STATUS: Record<StatusCampo, StatusOS> = {
  nao_visitada: 'PENDENTE',
  visitada: 'ATENDENDO',
  batedor: 'ATENDENDO',
  atendendo: 'ATENDENDO',
  concluida: 'CONCLUIDA',
  cancelada: 'CANCELADA',
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
