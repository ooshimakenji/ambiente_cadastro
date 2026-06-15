// =====================================================================
// Helpers compartilhados entre ordens.ts e saidas.ts.
//   - includeExpandida: include Prisma p/ OS com saídas + relações
//   - serializarOSExpandida / serializarSaida / serializarEvento
//   - snapshotSaida (diff de auditoria)
//   - derivarStatusOS: status da OS DERIVADO das saídas
//   - aguardandoFotos: pendência de foto (OS concluída sem foto regularizada)
// =====================================================================
import type { StatusOS } from '../../domain.js'

// ---------- include / shapes Prisma ----------

export const includeExpandida = {
  tipoServico: { select: { id: true, nome: true } },
  criadoPor: { select: { id: true, nome: true } },
  saidas: {
    orderBy: { criadoEm: 'asc' as const },
    include: {
      equipe: { select: { id: true, nome: true } },
      responsavel: { select: { id: true, nome: true } },
      criadoPor: { select: { id: true, nome: true } },
    },
  },
} as const

export type SaidaPrisma = {
  id: number
  ordemId: number
  equipeId: number | null
  responsavelId: number | null
  status: string
  fotos: string | null
  tipo: string
  anotacoes: string | null
  criadoPorId: number
  criadoEm: Date
  recebidoEm: Date | null
  equipe?: { id: number; nome: string } | null
  responsavel?: { id: number; nome: string } | null
  criadoPor?: { id: number; nome: string }
}

export type OSExpandidaPrisma = {
  id: number
  sequencial: string
  status: string
  concluidoEm: Date | null
  enviadaCasaEm: Date | null
  tipoServicoId: number | null
  criadoPorId: number
  criadoEm: Date
  atualizadoEm: Date
  tipoServico: { id: number; nome: string } | null
  criadoPor: { id: number; nome: string }
  saidas: SaidaPrisma[]
}

// ---------- serializadores ----------

export function serializarSaida(s: SaidaPrisma) {
  return {
    id: s.id,
    ordemId: s.ordemId,
    equipeId: s.equipeId,
    responsavelId: s.responsavelId,
    status: s.status,
    fotos: s.fotos,
    tipo: s.tipo,
    anotacoes: s.anotacoes,
    criadoPorId: s.criadoPorId,
    criadoEm: s.criadoEm.toISOString(),
    recebidoEm: s.recebidoEm ? s.recebidoEm.toISOString() : null,
    equipe: s.equipe ? { id: s.equipe.id, nome: s.equipe.nome } : null,
    responsavel: s.responsavel ? { id: s.responsavel.id, nome: s.responsavel.nome } : null,
    criadoPor: s.criadoPor ? { id: s.criadoPor.id, nome: s.criadoPor.nome } : null,
  }
}

export function serializarOSExpandida(os: OSExpandidaPrisma) {
  return {
    id: os.id,
    sequencial: os.sequencial,
    status: os.status,
    concluidoEm: os.concluidoEm ? os.concluidoEm.toISOString() : null,
    enviadaCasaEm: os.enviadaCasaEm ? os.enviadaCasaEm.toISOString() : null,
    tipoServicoId: os.tipoServicoId,
    criadoPorId: os.criadoPorId,
    criadoEm: os.criadoEm.toISOString(),
    atualizadoEm: os.atualizadoEm.toISOString(),
    tipoServico: os.tipoServico ? { id: os.tipoServico.id, nome: os.tipoServico.nome } : null,
    criadoPor: { id: os.criadoPor.id, nome: os.criadoPor.nome },
    saidas: os.saidas.map(serializarSaida),
  }
}

export function serializarEvento(ev: {
  id: number
  entidade: string
  entidadeId: number
  acao: string
  autorId: number | null
  descricao: string
  diff: string | null
  criadoEm: Date
  autor: { id: number; nome: string } | null
}) {
  return {
    id: ev.id,
    entidade: ev.entidade,
    entidadeId: ev.entidadeId,
    acao: ev.acao,
    autorId: ev.autorId,
    descricao: ev.descricao,
    diff: ev.diff,
    criadoEm: ev.criadoEm.toISOString(),
    autor: ev.autor ? { id: ev.autor.id, nome: ev.autor.nome } : null,
  }
}

export function snapshotSaida(s: SaidaPrisma): Record<string, unknown> {
  return {
    ordemId: s.ordemId,
    equipeId: s.equipeId,
    responsavelId: s.responsavelId,
    status: s.status,
    fotos: s.fotos,
    tipo: s.tipo,
    anotacoes: s.anotacoes,
    recebidoEm: s.recebidoEm,
  }
}

// ---------- derivação de status ----------

// Status da OS derivado das saídas:
//   - alguma saída CONCLUIDA           → OS CONCLUIDA
//   - senão, todas CANCELADA (e ≥1)    → OS CANCELADA
//   - senão                            → OS ABERTA (em campo, não realizado, ou sem saída)
// Saídas tipo=FOTO não definem conclusão (a OS já estava concluída); são ignoradas
// para fins de derivação além de regularizar foto.
export function derivarStatusOS(saidas: Array<{ status: string; tipo: string }>): StatusOS {
  const campo = saidas.filter((s) => s.tipo !== 'FOTO')
  if (campo.some((s) => s.status === 'CONCLUIDA')) return 'CONCLUIDA'
  if (campo.length > 0 && campo.every((s) => s.status === 'CANCELADA')) return 'CANCELADA'
  return 'ABERTA'
}

// "Aguardando fotos": existe uma saída CAMPO CONCLUIDA marcada SEM_FOTOS e
// nenhuma regularização posterior (a regularização marca essa saída como COM_FOTOS).
export function aguardandoFotos(saidas: Array<{ status: string; tipo: string; fotos: string | null }>): boolean {
  return saidas.some((s) => s.tipo === 'CAMPO' && s.status === 'CONCLUIDA' && s.fotos === 'SEM_FOTOS')
}
