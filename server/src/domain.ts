// =====================================================================
// Constantes de domínio — ESPELHAM app/src/lib/types.ts.
// Monorepo com builds separados (sem import cruzado): mantenha em sincronia
// manualmente. Usadas por zod e pela lógica de transição de status.
// =====================================================================

export const STATUS_OS = ['PENDENTE', 'ATENDENDO', 'CONCLUIDA', 'CANCELADA'] as const
export type StatusOS = (typeof STATUS_OS)[number]

export const PAPEIS = ['ADMIN', 'SUPERVISOR'] as const
export type Papel = (typeof PAPEIS)[number]

export const ENTIDADES_AUDITORIA = ['OS', 'USUARIO', 'EQUIPE', 'TIPO_SERVICO'] as const
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

// Transições de status permitidas (validadas no PATCH /ordens/:id/status — Fase 3).
export const TRANSICOES_STATUS: Record<StatusOS, StatusOS[]> = {
  PENDENTE: ['ATENDENDO', 'CANCELADA'],
  ATENDENDO: ['CONCLUIDA', 'CANCELADA', 'PENDENTE'],
  CONCLUIDA: [],
  CANCELADA: [],
}
