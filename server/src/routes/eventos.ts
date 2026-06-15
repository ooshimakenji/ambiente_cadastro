// =====================================================================
// Router de eventos de auditoria (read-only).
//   GET /eventos → EventoAuditoriaComAutor[] (filtros via query string)
//
// Filtros (FiltroEventos de types.ts):
//   entidade, entidadeId, autorId, acao, desde (ISO), ate (ISO)
//
// Migração futura a Postgres: nenhuma mudança necessária aqui.
// =====================================================================
import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { ENTIDADES_AUDITORIA, ACOES_AUDITORIA } from '../domain.js'

export const eventosRouter = Router()

// ---------- Schema de filtros ----------

const filtroEventosSchema = z.object({
  entidade: z.enum(ENTIDADES_AUDITORIA).optional(),
  entidadeId: z.coerce.number().int().positive().optional(),
  autorId: z.coerce.number().int().positive().optional(),
  acao: z.enum(ACOES_AUDITORIA).optional(),
  desde: z.string().datetime({ offset: true }).optional(),
  ate: z.string().datetime({ offset: true }).optional(),
})

// ---------- GET /eventos ----------

eventosRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filtros = filtroEventosSchema.parse(req.query)

    const where: Record<string, unknown> = {}
    if (filtros.entidade) where.entidade = filtros.entidade
    if (filtros.entidadeId !== undefined) where.entidadeId = filtros.entidadeId
    if (filtros.autorId !== undefined) where.autorId = filtros.autorId
    if (filtros.acao) where.acao = filtros.acao
    if (filtros.desde || filtros.ate) {
      const criadoEm: Record<string, Date> = {}
      if (filtros.desde) criadoEm.gte = new Date(filtros.desde)
      if (filtros.ate) criadoEm.lte = new Date(filtros.ate)
      where.criadoEm = criadoEm
    }

    const eventos = await prisma.eventoAuditoria.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      include: { autor: { select: { id: true, nome: true } } },
    })

    res.json(
      eventos.map((ev) => ({
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
    )
  } catch (e) {
    next(e)
  }
})
