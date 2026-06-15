// =====================================================================
// Rota de integração — exporta OS no formato data.json do dashboard_servicos.
//   GET /integracao/servicos → DadosServicosExport
//
// Mapeamento: STATUS_PARA_CAMPO (espelho de app/src/lib/statusMap.ts).
// Formato compatível com ServicoExport / DadosServicosExport do statusMap.ts.
// OS ativas = não CONCLUIDA e não CANCELADA.
// Concluídas hoje = concluidoEm >= início do dia local.
//
// Lembrete: este endpoint é read-only; não grava auditoria.
// Migração futura a Postgres: nenhuma mudança necessária aqui.
// =====================================================================
import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../../prisma.js'
import type { StatusOS } from '../../domain.js'

export const integracaoRouter = Router()

// Espelho de STATUS_PARA_CAMPO de app/src/lib/statusMap.ts (4 status novos).
type StatusCampo = 'nao_visitada' | 'visitada' | 'batedor' | 'atendendo' | 'concluida' | 'cancelada'

const STATUS_PARA_CAMPO: Record<StatusOS, StatusCampo> = {
  PENDENTE: 'nao_visitada',
  ATENDENDO: 'atendendo',
  CONCLUIDA: 'concluida',
  CANCELADA: 'cancelada',
}

// Converte OS do banco para o shape ServicoExport.
// ⚠️ Lacuna documentada (INTEGRACAO.md): o cadastro removeu endereco/bairro/lat/lon,
// então esses campos saem vazios/omitidos — virão de outro sistema via API.
function converterOS(os: {
  sequencial: string
  status: string
  criadoEm: Date
  atualizadoEm: Date
  concluidoEm: Date | null
  tipoServico: { nome: string } | null
  equipe: { nome: string } | null
}) {
  const statusCampo = STATUS_PARA_CAMPO[os.status as StatusOS] ?? 'nao_visitada'
  const criadoEm = os.criadoEm
  const dataAbertura = criadoEm.toISOString().slice(0, 10) // YYYY-MM-DD
  const horaAbertura = criadoEm.toISOString().slice(11, 19) // HH:MM:SS

  return {
    sequencial: os.sequencial,
    equipe: os.equipe?.nome ?? '',
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
    // Início do dia atual (UTC) para filtrar concluídas hoje
    const agora = new Date()
    const inicioDoDia = new Date(agora)
    inicioDoDia.setUTCHours(0, 0, 0, 0)

    const includeRelacoes = {
      equipe: { select: { nome: true } },
      tipoServico: { select: { nome: true } },
    } as const

    // OS ativas: PENDENTE, ATENDENDO
    const ativas = await prisma.ordemServico.findMany({
      where: { status: { in: ['PENDENTE', 'ATENDENDO'] } },
      orderBy: { sequencial: 'asc' },
      include: includeRelacoes,
    })

    // Concluídas hoje
    const concluidasHoje = await prisma.ordemServico.findMany({
      where: {
        status: 'CONCLUIDA',
        concluidoEm: { gte: inicioDoDia },
      },
      orderBy: { concluidoEm: 'desc' },
      include: includeRelacoes,
    })

    // Métricas simples
    const totalPorStatus = await prisma.ordemServico.groupBy({
      by: ['status'],
      _count: { _all: true },
    })
    const metricas: Record<string, number> = {}
    for (const item of totalPorStatus) {
      metricas[item.status] = item._count._all
    }

    const resposta = {
      atualizado_em: agora.toISOString(),
      metricas,
      os_ativas: ativas.map(converterOS),
      concluidas_hoje: concluidasHoje.map(converterOS),
    }

    res.json(resposta)
  } catch (e) {
    next(e)
  }
})
