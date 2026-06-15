// =====================================================================
// Router de dashboard — resumo agregado.
//   GET /dashboard → DashboardResumo
//     - contagemPorStatus: Record<StatusOS, number>
//     - ordensRecentes: OrdemServicoExpandida[] (últimas 10)
//     - ultimosEventos: EventoAuditoriaComAutor[] (últimos 20)
//
// Migração futura a Postgres: nenhuma mudança necessária aqui;
// groupBy pode ser substituído por query nativa se necessário p/ performance.
// =====================================================================
import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../prisma.js'
import { STATUS_OS } from '../domain.js'
import type { StatusOS } from '../domain.js'

export const dashboardRouter = Router()

// ---------- GET /dashboard ----------

dashboardRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Contagem por status (groupBy)
    const groupResult = await prisma.ordemServico.groupBy({
      by: ['status'],
      _count: { _all: true },
    })

    // Inicializa todos os status com 0 para garantir o shape completo
    const contagemPorStatus = Object.fromEntries(
      STATUS_OS.map((s) => [s, 0]),
    ) as Record<StatusOS, number>

    for (const item of groupResult) {
      const s = item.status as StatusOS
      if (s in contagemPorStatus) {
        contagemPorStatus[s] = item._count._all
      }
    }

    // Ordens recentes (últimas 10 criadas, expandidas)
    const ordensRecentes = await prisma.ordemServico.findMany({
      orderBy: { criadoEm: 'desc' },
      take: 10,
      include: {
        tipoServico: { select: { id: true, nome: true } },
        equipe: { select: { id: true, nome: true } },
        responsavel: { select: { id: true, nome: true } },
        criadoPor: { select: { id: true, nome: true } },
      },
    })

    // Últimos eventos (últimos 20)
    const ultimosEventos = await prisma.eventoAuditoria.findMany({
      orderBy: { criadoEm: 'desc' },
      take: 20,
      include: { autor: { select: { id: true, nome: true } } },
    })

    res.json({
      contagemPorStatus,
      ordensRecentes: ordensRecentes.map((os) => ({
        id: os.id,
        sequencial: os.sequencial,
        anotacoes: os.anotacoes,
        tipoServicoId: os.tipoServicoId,
        status: os.status,
        fotos: os.fotos,
        equipeId: os.equipeId,
        responsavelId: os.responsavelId,
        criadoPorId: os.criadoPorId,
        criadoEm: os.criadoEm.toISOString(),
        atualizadoEm: os.atualizadoEm.toISOString(),
        concluidoEm: os.concluidoEm ? os.concluidoEm.toISOString() : null,
        tipoServico: os.tipoServico ? { id: os.tipoServico.id, nome: os.tipoServico.nome } : null,
        equipe: os.equipe ? { id: os.equipe.id, nome: os.equipe.nome } : null,
        responsavel: os.responsavel ? { id: os.responsavel.id, nome: os.responsavel.nome } : null,
        criadoPor: { id: os.criadoPor.id, nome: os.criadoPor.nome },
      })),
      ultimosEventos: ultimosEventos.map((ev) => ({
        id: ev.id,
        entidade: ev.entidade,
        entidadeId: ev.entidadeId,
        acao: ev.acao,
        autorId: ev.autorId,
        descricao: ev.descricao,
        diff: ev.diff,
        criadoEm: ev.criadoEm.toISOString(),
        autor: ev.autor ? { id: ev.autor.id, nome: ev.autor.nome } : null,
      })),
    })
  } catch (e) {
    next(e)
  }
})
