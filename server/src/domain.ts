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

export const PAPEIS = ['ADMIN', 'SUPERVISOR', 'CAMPO'] as const
export type Papel = (typeof PAPEIS)[number]

// Telas controláveis por permissão (papel × tela). ADMIN vê todas (bypass);
// `usuarios` e `permissoes` são sempre ADMIN-only e ficam fora desta lista.
export const TELAS = [
  'cadastrar',
  'receber',
  'folhas',
  'ordens',
  'equipes',
  'tipos',
  'historico',
] as const
export type Tela = (typeof TELAS)[number]

// Normaliza um papel vindo do banco (String) para o union tipado.
// Fallback seguro = SUPERVISOR (papel mais restritivo entre os "operacionais"
// que ainda enxerga o conjunto padrão; nunca eleva a ADMIN).
export function normalizarPapel(p: string): Papel {
  return (PAPEIS as readonly string[]).includes(p) ? (p as Papel) : 'SUPERVISOR'
}

export const ENTIDADES_AUDITORIA = [
  'OS',
  'SAIDA',
  'FOLHA_ENVIO',
  'USUARIO',
  'EQUIPE',
  'TIPO_SERVICO',
  'PERMISSAO',
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
