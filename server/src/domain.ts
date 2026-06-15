// =====================================================================
// Constantes de domínio — ESPELHAM app/src/lib/types.ts.
// Monorepo com builds separados (sem import cruzado): mantenha em sincronia
// manualmente. Usadas por zod e pela lógica de derivação de status.
//
// Modelo v3: OS (pai) → N Saídas. O status da OS é DERIVADO das saídas.
// =====================================================================

// Status da OS (derivado das saídas).
export const STATUS_OS = ['ABERTA', 'CONCLUIDA', 'CANCELADA'] as const
export type StatusOS = (typeof STATUS_OS)[number]

// Status de uma Saída/atendimento.
export const STATUS_SAIDA = ['EM_CAMPO', 'CONCLUIDA', 'NAO_REALIZADO', 'CANCELADA'] as const
export type StatusSaida = (typeof STATUS_SAIDA)[number]

// Desfechos válidos ao "receber" uma saída (fecha a saída EM_CAMPO).
export const DESFECHO_SAIDA = ['CONCLUIDA', 'NAO_REALIZADO', 'CANCELADA'] as const
export type DesfechoSaida = (typeof DESFECHO_SAIDA)[number]

// Tipo de saída: CAMPO (atendimento normal) | FOTO (só regularizar foto).
export const TIPO_SAIDA = ['CAMPO', 'FOTO'] as const
export type TipoSaida = (typeof TIPO_SAIDA)[number]

// Valores de fotos (na Saída).
export const FOTOS = ['COM_FOTOS', 'SEM_FOTOS'] as const
export type Fotos = (typeof FOTOS)[number]

// Período da folha enviada à casa.
export const PERIODO = ['MANHA', 'TARDE'] as const
export type Periodo = (typeof PERIODO)[number]

export const PAPEIS = ['ADMIN', 'SUPERVISOR'] as const
export type Papel = (typeof PAPEIS)[number]

export const ENTIDADES_AUDITORIA = [
  'OS',
  'SAIDA',
  'FOLHA_ENVIO',
  'USUARIO',
  'EQUIPE',
  'TIPO_SERVICO',
] as const
export type EntidadeAuditoria = (typeof ENTIDADES_AUDITORIA)[number]

export const ACOES_AUDITORIA = [
  'CRIACAO',
  'ATUALIZACAO',
  'MUDANCA_STATUS',
  'EXCLUSAO',
  'LOGIN',
  'LOGOUT',
] as const
export type AcaoAuditoria = (typeof ACOES_AUDITORIA)[number]
