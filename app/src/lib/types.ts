// =====================================================================
// CONTRATO DE TIPOS — ambiental_cadastro
// Fonte da verdade do domínio + DTOs da API. O frontend importa daqui;
// o backend (server/) espelha estes tipos (monorepo com builds separados).
// Mantém compatibilidade futura com dashboard_servicos (ver statusMap.ts).
// =====================================================================

// ---------- Enums (SQLite emula via Prisma; strings validadas por zod no server) ----------

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

// Transições de status permitidas (validadas no PATCH /ordens/:id/status).
// CANCELADA é alcançável de qualquer status ativo; CONCLUIDA encerra.
export const TRANSICOES_STATUS: Record<StatusOS, StatusOS[]> = {
  PENDENTE: ['ATENDENDO', 'CANCELADA'],
  ATENDENDO: ['CONCLUIDA', 'CANCELADA', 'PENDENTE'],
  CONCLUIDA: [],
  CANCELADA: [],
}

// Valores de fotos da OS (setados no recebimento; null até receber).
export const FOTOS_OS = ['COM_FOTOS', 'SEM_FOTOS'] as const
export type FotosOS = (typeof FOTOS_OS)[number]

// ---------- Entidades (shape retornado pela API — datas como ISO string) ----------

export interface Usuario {
  id: number
  nome: string
  login: string
  papel: Papel
  ativo: boolean
  equipeId: number | null
  criadoEm: string // ISO
  // senhaHash NUNCA é serializado para o cliente.
}

export interface Equipe {
  id: number
  nome: string
  descricao: string | null
  ativo: boolean
  criadoEm: string // ISO
}

export interface TipoServico {
  id: number
  nome: string
  ativo: boolean
  criadoEm: string // ISO
}

export interface OrdemServico {
  id: number
  sequencial: string // ID bipado da OS (@unique, imutável)
  anotacoes: string | null
  tipoServicoId: number | null
  status: StatusOS
  fotos: FotosOS | null // 'COM_FOTOS' | 'SEM_FOTOS' | null (null até receber)
  equipeId: number | null
  responsavelId: number | null
  criadoPorId: number
  criadoEm: string // ISO
  atualizadoEm: string // ISO
  concluidoEm: string | null // ISO
}

export interface EventoAuditoria {
  id: number
  entidade: EntidadeAuditoria
  entidadeId: number
  acao: AcaoAuditoria
  autorId: number | null
  descricao: string
  diff: string | null // JSON serializado (antes/depois)
  criadoEm: string // ISO (data + hora)
}

// Versões "expandidas" (com relações resolvidas) que algumas rotas retornam.
export interface UsuarioComEquipe extends Usuario {
  equipe: Pick<Equipe, 'id' | 'nome'> | null
}
export interface OrdemServicoExpandida extends OrdemServico {
  tipoServico: Pick<TipoServico, 'id' | 'nome'> | null
  equipe: Pick<Equipe, 'id' | 'nome'> | null
  responsavel: Pick<Usuario, 'id' | 'nome'> | null
  criadoPor: Pick<Usuario, 'id' | 'nome'>
}
export interface EventoAuditoriaComAutor extends EventoAuditoria {
  autor: Pick<Usuario, 'id' | 'nome'> | null
}

// ---------- Auth ----------

export interface LoginRequest {
  login: string
  senha: string
}
export interface LoginResponse {
  token: string
  usuario: Usuario
}

// ---------- Request bodies (criação/edição) ----------

export interface NovoUsuario {
  nome: string
  login: string
  senha: string
  papel: Papel
  equipeId?: number | null
}
export type EditarUsuario = Partial<Omit<NovoUsuario, 'senha'>> & {
  senha?: string
  ativo?: boolean
}

export interface NovaEquipe {
  nome: string
  descricao?: string | null
}
export type EditarEquipe = Partial<NovaEquipe> & { ativo?: boolean }

export interface NovoTipoServico {
  nome: string
}
export type EditarTipoServico = { nome?: string; ativo?: boolean }

export interface NovaOrdem {
  sequencial: string
  tipoServicoId: number
  equipeId?: number | null
  responsavelId?: number | null
  anotacoes?: string | null
}
// Edição NÃO inclui sequencial (ID bipado imutável).
export type EditarOrdem = Partial<Omit<NovaOrdem, 'sequencial'>>
export interface MudarStatusOrdem {
  status: StatusOS
}
export interface ReceberOrdem {
  fotos: FotosOS // 'COM_FOTOS' | 'SEM_FOTOS'
}

// ---------- Dashboard (KPIs) ----------

export interface DashboardResumo {
  contagemPorStatus: Record<StatusOS, number>
  ordensRecentes: OrdemServicoExpandida[]
  ultimosEventos: EventoAuditoriaComAutor[]
}

// ---------- Filtros de Histórico ----------

export interface FiltroEventos {
  entidade?: EntidadeAuditoria
  entidadeId?: number
  autorId?: number
  acao?: AcaoAuditoria
  desde?: string // ISO
  ate?: string // ISO
}

// ---------- Labels/cores p/ UI (status novos) ----------

export const STATUS_OS_LABELS: Record<StatusOS, string> = {
  PENDENTE: 'Pendente',
  ATENDENDO: 'Atendendo',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}

// cor MUI por status (consumida pelo StatusChip)
export const STATUS_OS_COR: Record<StatusOS, 'warning' | 'info' | 'primary' | 'success' | 'error'> = {
  PENDENTE: 'warning',
  ATENDENDO: 'info',
  CONCLUIDA: 'success',
  CANCELADA: 'error',
}
