// =====================================================================
// CONTRATO DE TIPOS — ambiental_cadastro (modelo v3: OS multi-saída)
// Fonte da verdade do domínio + DTOs da API. O frontend importa daqui;
// o backend (server/src/domain.ts) espelha estes tipos (builds separados).
// Mantém compatibilidade futura com dashboard_servicos (ver statusMap.ts).
//
// Modelo v3: OrdemServico (pai, sequencial @unique) → N Saida (append-only).
// O status da OS é DERIVADO das saídas. Folhas casa = FolhaEnvio (rastro).
// =====================================================================

// ---------- Enums (SQLite emula via Prisma; strings validadas por zod no server) ----------

// Status da OS — DERIVADO das saídas.
export const STATUS_OS = ['ABERTA', 'CONCLUIDA', 'CANCELADA'] as const
export type StatusOS = (typeof STATUS_OS)[number]

// Status de uma Saída/atendimento.
export const STATUS_SAIDA = ['EM_CAMPO', 'CONCLUIDA', 'NAO_REALIZADO', 'CANCELADA'] as const
export type StatusSaida = (typeof STATUS_SAIDA)[number]

// Desfechos válidos ao "receber" uma saída.
export const DESFECHO_SAIDA = ['CONCLUIDA', 'NAO_REALIZADO', 'CANCELADA'] as const
export type DesfechoSaida = (typeof DESFECHO_SAIDA)[number]

// Tipo de saída: CAMPO (atendimento) | FOTO (só regularizar foto).
export const TIPO_SAIDA = ['CAMPO', 'FOTO'] as const
export type TipoSaida = (typeof TIPO_SAIDA)[number]

// Valores de fotos da saída (setados no recebimento de saída CONCLUIDA).
export const FOTOS = ['COM_FOTOS', 'SEM_FOTOS'] as const
export type Fotos = (typeof FOTOS)[number]

// Período da folha enviada à casa.
export const PERIODO = ['MANHA', 'TARDE'] as const
export type Periodo = (typeof PERIODO)[number]

export const PAPEIS = ['ADMIN', 'SUPERVISOR', 'CAMPO'] as const
export type Papel = (typeof PAPEIS)[number]

export const PAPEL_LABELS: Record<Papel, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  CAMPO: 'Campo',
}

// Telas controláveis por permissão (espelha TELAS de server/src/domain.ts).
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

export const TELA_LABELS: Record<Tela, string> = {
  cadastrar: 'Cadastrar OS',
  receber: 'Receber OS',
  folhas: 'Folhas à Casa',
  ordens: 'Ordens de Serviço',
  equipes: 'Equipes',
  tipos: 'Tipos de serviço',
  historico: 'Histórico',
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

// Saída/atendimento (filho da OS). Append-only/imutável.
export interface Saida {
  id: number
  ordemId: number
  equipeId: number | null
  responsavelId: number | null
  status: StatusSaida
  fotos: Fotos | null
  tipo: TipoSaida
  anotacoes: string | null
  criadoPorId: number
  criadoEm: string // ISO
  recebidoEm: string | null // ISO
  // relações resolvidas (sempre presentes em OrdemServicoExpandida.saidas)
  equipe: Pick<Equipe, 'id' | 'nome'> | null
  responsavel: Pick<Usuario, 'id' | 'nome'> | null
  criadoPor: Pick<Usuario, 'id' | 'nome'> | null
}

// Folhas casa — rastro do envio do papel físico ao ambiente 2.
export interface FolhaEnvio {
  id: number
  ordemId: number
  sequencial: string | null // sequencial da OS (conveniência na listagem)
  descricao: string | null
  periodo: Periodo
  recebidoPorId: number | null
  criadoPorId: number
  criadoEm: string // ISO
  recebidoPor: Pick<Usuario, 'id' | 'nome'> | null
  criadoPor: Pick<Usuario, 'id' | 'nome'> | null
}

// Ordem de serviço (pai). status DERIVADO das saídas.
export interface OrdemServico {
  id: number
  sequencial: string // ID bipado da OS (@unique, imutável)
  status: StatusOS
  concluidoEm: string | null // ISO
  enviadaCasaEm: string | null // ISO — indicador "folha já foi à casa"
  tipoServicoId: number | null
  criadoPorId: number
  criadoEm: string // ISO
  atualizadoEm: string // ISO
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
  criadoPor: Pick<Usuario, 'id' | 'nome'>
  saidas: Saida[] // todas as saídas, ordenadas por criadoEm asc
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
  permissoes: Tela[]
}

// Permissões por papel (matriz da tela de Permissões).
export interface PermissaoPapel {
  papel: Papel
  tela: Tela
  permitido: boolean
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

// POST /ordens — cadastrar (sequencial novo → cria OS; existente → nova saída).
export interface NovaOrdem {
  sequencial: string
  tipoServicoId: number
  equipeId?: number | null
  responsavelId?: number | null
  anotacoes?: string | null
}

// POST /ordens/:id/saida-foto — saída de regularização de foto.
export interface NovaSaidaFoto {
  equipeId?: number | null
  responsavelId?: number | null
  anotacoes?: string | null
}

// PATCH /saidas/:id/receber — receber por desfecho.
export interface ReceberSaida {
  status: DesfechoSaida // 'CONCLUIDA' | 'NAO_REALIZADO' | 'CANCELADA'
  fotos?: Fotos // só relevante quando status='CONCLUIDA'
  anotacoes?: string | null
}

// POST /folhas — registrar folha enviada à casa.
export interface NovaFolhaEnvio {
  sequencial: string
  descricao?: string | null
  periodo: Periodo
  recebidoPorId?: number | null
}

// Lote: bipar vários sequenciais (mesmo período/quem recebeu/descrição).
export interface NovaFolhaLote {
  periodo: Periodo
  recebidoPorId?: number | null
  descricao?: string | null
  sequenciais: string[]
}

export interface FolhaLoteResultado {
  criadas: FolhaEnvio[]
  naoEncontradas: string[]
}

// ---------- Filtros ----------

export interface FiltroOrdens {
  status?: StatusOS
  tipoServicoId?: number
  sequencial?: string
  aguardandoFotos?: boolean
}

export interface FiltroFolhas {
  sequencial?: string
  periodo?: Periodo
  desde?: string // ISO
  ate?: string // ISO
}

export interface FiltroEventos {
  entidade?: EntidadeAuditoria
  entidadeId?: number
  autorId?: number
  acao?: AcaoAuditoria
  desde?: string // ISO
  ate?: string // ISO
}

// ---------- Labels/cores p/ UI ----------

export const STATUS_OS_LABELS: Record<StatusOS, string> = {
  ABERTA: 'Aberta',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}

export const STATUS_OS_COR: Record<StatusOS, 'warning' | 'info' | 'primary' | 'success' | 'error'> = {
  ABERTA: 'warning',
  CONCLUIDA: 'success',
  CANCELADA: 'error',
}

export const STATUS_SAIDA_LABELS: Record<StatusSaida, string> = {
  EM_CAMPO: 'Em campo',
  CONCLUIDA: 'Concluída',
  NAO_REALIZADO: 'Não realizado',
  CANCELADA: 'Cancelada',
}

export const STATUS_SAIDA_COR: Record<StatusSaida, 'warning' | 'info' | 'primary' | 'success' | 'error'> = {
  EM_CAMPO: 'info',
  CONCLUIDA: 'success',
  NAO_REALIZADO: 'warning',
  CANCELADA: 'error',
}

export const DESFECHO_SAIDA_LABELS: Record<DesfechoSaida, string> = {
  CONCLUIDA: 'Concluída',
  NAO_REALIZADO: 'Não realizado',
  CANCELADA: 'Cancelada',
}

export const FOTOS_LABELS: Record<Fotos, string> = {
  COM_FOTOS: 'Com fotos',
  SEM_FOTOS: 'Sem fotos',
}

export const PERIODO_LABELS: Record<Periodo, string> = {
  MANHA: 'Manhã',
  TARDE: 'Tarde',
}
