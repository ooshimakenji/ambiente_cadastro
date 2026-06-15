// =====================================================================
// Rota de integração — exporta OS no formato data.json do dashboard_servicos.
//   GET /integracao/servicos → DadosServicosExport
//
// Mapeamento por estado DERIVADO das saídas (espelho de app/src/lib/statusMap.ts):
//   OS ABERTA com alguma saída EM_CAMPO        → atendendo
//   OS ABERTA cuja última saída foi NAO_REALIZADO → batedor
//   OS ABERTA sem nenhuma saída                → nao_visitada
//   OS CONCLUIDA                               → concluida
//   OS CANCELADA                               → cancelada
// equipe/tipo_servico vêm da saída mais recente / da OS.
// endereco/bairro/numero vazios; lat/lon/maquina omitidos (virão de outro sistema).
//
// Read-only; não grava auditoria. Migração a Postgres: sem mudanças.
// =====================================================================
import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../../prisma.js'

export const integracaoRouter = Router()

type StatusCampo = 'nao_visitada' | 'visitada' | 'batedor' | 'atendendo' | 'concluida' | 'cancelada'

type SaidaMin = {
  status: string
  tipo: string
  criadoEm: Date
  equipe: { nome: string } | null
}

type OSExport = {
  sequencial: string
  status: string
  criadoEm: Date
  atualizadoEm: Date
  concluidoEm: Date | null
  tipoServico: { nome: string } | null
  saidas: SaidaMin[]
}

// Estado de campo derivado das saídas da OS.
function derivarStatusCampo(os: OSExport): StatusCampo {
  if (os.status === 'CONCLUIDA') return 'concluida'
  if (os.status === 'CANCELADA') return 'cancelada'
  // ABERTA: olha as saídas CAMPO.
  const campo = os.saidas.filter((s) => s.tipo !== 'FOTO')
  if (campo.length === 0) return 'nao_visitada'
  if (campo.some((s) => s.status === 'EM_CAMPO')) return 'atendendo'
  const ultima = campo[campo.length - 1] // saídas vêm ordenadas por criadoEm asc
  if (ultima.status === 'NAO_REALIZADO') return 'batedor'
  return 'atendendo'
}

// Equipe da saída mais recente (qualquer tipo).
function equipeRecente(os: OSExport): string {
  for (let i = os.saidas.length - 1; i >= 0; i--) {
    const nome = os.saidas[i].equipe?.nome
    if (nome) return nome
  }
  return ''
}

function converterOS(os: OSExport) {
  const statusCampo = derivarStatusCampo(os)
  const criadoEm = os.criadoEm
  const dataAbertura = criadoEm.toISOString().slice(0, 10) // YYYY-MM-DD
  const horaAbertura = criadoEm.toISOString().slice(11, 19) // HH:MM:SS

  return {
    sequencial: os.sequencial,
    equipe: equipeRecente(os),
    endereco: '',
    numero: '',
    bairro: '',
    tipo_servico: os.tipoServico?.nome ?? '',
    status_campo: statusCampo,
    data_abertura: dataAbertura,
    hora_abertura: horaAbertura,
    atualizado_em: os.atualizadoEm.toISOString(),
    ...(os.concluidoEm ? { concluida_em: os.concluidoEm.toISOString() } : {}),
  }
}

// ---------- GET /integracao/servicos ----------

integracaoRouter.get('/servicos', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const agora = new Date()
    const inicioDoDia = new Date(agora)
    inicioDoDia.setUTCHours(0, 0, 0, 0)

    const includeRelacoes = {
      tipoServico: { select: { nome: true } },
      saidas: {
        orderBy: { criadoEm: 'asc' as const },
        select: { status: true, tipo: true, criadoEm: true, equipe: { select: { nome: true } } },
      },
    } as const

    // OS ativas: ABERTA
    const ativas = await prisma.ordemServico.findMany({
      where: { status: 'ABERTA' },
      orderBy: { sequencial: 'asc' },
      include: includeRelacoes,
    })

    // Concluídas hoje
    const concluidasHoje = await prisma.ordemServico.findMany({
      where: { status: 'CONCLUIDA', concluidoEm: { gte: inicioDoDia } },
      orderBy: { concluidoEm: 'desc' },
      include: includeRelacoes,
    })

    // Métricas por status_campo (espelha o data.json de produção do dashboard_servicos):
    // as ABERTAS são tabuladas pelo status_campo derivado das saídas; concluida/cancelada
    // vêm do COUNT por status da OS (evita carregar todo o histórico de saídas).
    const totalPorStatus = await prisma.ordemServico.groupBy({
      by: ['status'],
      _count: { _all: true },
    })
    const metricas: Record<string, number> = {}
    for (const os of ativas) {
      const sc = derivarStatusCampo(os)
      metricas[sc] = (metricas[sc] ?? 0) + 1
    }
    for (const item of totalPorStatus) {
      if (item.status === 'CONCLUIDA') metricas.concluida = item._count._all
      else if (item.status === 'CANCELADA') metricas.cancelada = item._count._all
    }

    res.json({
      atualizado_em: agora.toISOString(),
      metricas,
      os_ativas: ativas.map(converterOS),
      concluidas_hoje: concluidasHoje.map(converterOS),
    })
  } catch (e) {
    next(e)
  }
})
