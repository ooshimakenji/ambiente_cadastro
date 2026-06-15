// =====================================================================
// Router de folhas casa — rastro do envio do papel físico ao ambiente 2.
//   POST /folhas → registra FolhaEnvio (por sequencial) + seta enviadaCasaEm na OS
//       body { sequencial, descricao?, periodo: 'MANHA'|'TARDE', recebidoPorId? }
//   GET  /folhas → lista/consulta (filtros: sequencial, periodo, desde, ate)
//
// É rastro: NÃO muda o status da OS, não imputa responsabilidade a quem envia.
// Apenas marca o indicador enviadaCasaEm. Auditoria FOLHA_ENVIO.
// =====================================================================
import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { registrarEvento } from '../audit/index.js'
import { erro404 } from '../middleware/httpError.js'
import { PERIODO } from '../domain.js'

export const folhasRouter = Router()

// ---------- helpers ----------

function serializarFolha(f: {
  id: number
  ordemId: number
  descricao: string | null
  periodo: string
  recebidoPorId: number | null
  criadoPorId: number
  criadoEm: Date
  ordem?: { id: number; sequencial: string } | null
  recebidoPor?: { id: number; nome: string } | null
  criadoPor?: { id: number; nome: string } | null
}) {
  return {
    id: f.id,
    ordemId: f.ordemId,
    sequencial: f.ordem?.sequencial ?? null,
    descricao: f.descricao,
    periodo: f.periodo,
    recebidoPorId: f.recebidoPorId,
    criadoPorId: f.criadoPorId,
    criadoEm: f.criadoEm.toISOString(),
    recebidoPor: f.recebidoPor ? { id: f.recebidoPor.id, nome: f.recebidoPor.nome } : null,
    criadoPor: f.criadoPor ? { id: f.criadoPor.id, nome: f.criadoPor.nome } : null,
  }
}

// ---------- Schemas zod ----------

const novaFolhaSchema = z.object({
  sequencial: z.string().trim().min(1, 'sequencial é obrigatório'),
  descricao: z.string().nullable().optional(),
  periodo: z.enum(PERIODO),
  recebidoPorId: z.number().int().positive().nullable().optional(),
})

const filtroFolhasSchema = z.object({
  sequencial: z.string().trim().min(1).optional(),
  periodo: z.enum(PERIODO).optional(),
  desde: z.string().datetime({ offset: true }).optional(),
  ate: z.string().datetime({ offset: true }).optional(),
})

const includeFolha = {
  ordem: { select: { id: true, sequencial: true } },
  recebidoPor: { select: { id: true, nome: true } },
  criadoPor: { select: { id: true, nome: true } },
} as const

// ---------- POST /folhas ----------

folhasRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dados = novaFolhaSchema.parse(req.body)
    const autorId = req.usuario!.id

    const os = await prisma.ordemServico.findUnique({ where: { sequencial: dados.sequencial } })
    if (!os) throw erro404(`Nenhuma OS com sequencial ${dados.sequencial}`)

    const folha = await prisma.$transaction(async (tx) => {
      const nova = await tx.folhaEnvio.create({
        data: {
          ordemId: os.id,
          descricao: dados.descricao ?? null,
          periodo: dados.periodo,
          recebidoPorId: dados.recebidoPorId ?? null,
          criadoPorId: autorId,
        },
        include: includeFolha,
      })
      // Marca o indicador (não muda status da OS).
      await tx.ordemServico.update({ where: { id: os.id }, data: { enviadaCasaEm: new Date() } })
      await registrarEvento(
        {
          entidade: 'FOLHA_ENVIO',
          entidadeId: nova.id,
          acao: 'CRIACAO',
          autorId,
          depois: { ordemId: os.id, periodo: dados.periodo, descricao: dados.descricao ?? null },
          descricao: `OS ${os.sequencial}: folha enviada à casa (${dados.periodo})`,
        },
        tx,
      )
      return nova
    })

    res.status(201).json(serializarFolha(folha))
  } catch (e) {
    next(e)
  }
})

// ---------- GET /folhas ----------

folhasRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filtros = filtroFolhasSchema.parse(req.query)

    const where: Record<string, unknown> = {}
    if (filtros.sequencial) where.ordem = { sequencial: filtros.sequencial }
    if (filtros.periodo) where.periodo = filtros.periodo
    if (filtros.desde || filtros.ate) {
      const criadoEm: Record<string, Date> = {}
      if (filtros.desde) criadoEm.gte = new Date(filtros.desde)
      if (filtros.ate) criadoEm.lte = new Date(filtros.ate)
      where.criadoEm = criadoEm
    }

    const folhas = await prisma.folhaEnvio.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      include: includeFolha,
    })

    res.json(folhas.map(serializarFolha))
  } catch (e) {
    next(e)
  }
})
