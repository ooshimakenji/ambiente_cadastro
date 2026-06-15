// =====================================================================
// Router de ordens de serviço.
//   GET    /ordens                  → OrdemServicoExpandida[] (filtros: status, equipeId, responsavelId, fotos, sequencial)
//   GET    /ordens/:id              → OrdemServicoExpandida + { eventos: EventoAuditoriaComAutor[] }
//   POST   /ordens                  → OrdemServico (usa sequencial bipado; ATENDENDO se vier equipe, senão PENDENTE)
//   PATCH  /ordens/:id              → OrdemServico (edição de campos; sequencial é imutável)
//   PATCH  /ordens/:id/status       → OrdemServico (valida TRANSICOES_STATUS; Atender/Cancelar)
//   PATCH  /ordens/:id/receber      → OrdemServico (seta fotos + status CONCLUIDA + concluidoEm)
//   DELETE /ordens/:id              → 204
//
// Auditoria: toda mutação chama registrarEvento dentro da MESMA prisma.$transaction.
// Migração futura a Postgres: nenhuma mudança necessária aqui.
// =====================================================================
import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { registrarEvento } from '../audit/index.js'
import { erro400, erro404, erro409 } from '../middleware/httpError.js'
import { STATUS_OS, TRANSICOES_STATUS } from '../domain.js'
import type { StatusOS } from '../domain.js'

export const ordensRouter = Router()

// ---------- Selects reutilizáveis ----------

const includeExpandida = {
  tipoServico: { select: { id: true, nome: true } },
  equipe: { select: { id: true, nome: true } },
  responsavel: { select: { id: true, nome: true } },
  criadoPor: { select: { id: true, nome: true } },
} as const

// ---------- helpers de serialização ----------

type OSPrisma = {
  id: number
  sequencial: string
  anotacoes: string | null
  tipoServicoId: number | null
  status: string
  fotos: string | null
  equipeId: number | null
  responsavelId: number | null
  criadoPorId: number
  criadoEm: Date
  atualizadoEm: Date
  concluidoEm: Date | null
}

type OSExpandidaPrisma = OSPrisma & {
  tipoServico: { id: number; nome: string } | null
  equipe: { id: number; nome: string } | null
  responsavel: { id: number; nome: string } | null
  criadoPor: { id: number; nome: string }
}

function serializarOS(os: OSPrisma) {
  return {
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
  }
}

function serializarOSExpandida(os: OSExpandidaPrisma) {
  return {
    ...serializarOS(os),
    tipoServico: os.tipoServico ? { id: os.tipoServico.id, nome: os.tipoServico.nome } : null,
    equipe: os.equipe ? { id: os.equipe.id, nome: os.equipe.nome } : null,
    responsavel: os.responsavel ? { id: os.responsavel.id, nome: os.responsavel.nome } : null,
    criadoPor: { id: os.criadoPor.id, nome: os.criadoPor.nome },
  }
}

function serializarEvento(ev: {
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

// ---------- Snapshot de OS para diff ----------

function snapshotOS(os: OSPrisma): Record<string, unknown> {
  return {
    sequencial: os.sequencial,
    anotacoes: os.anotacoes,
    tipoServicoId: os.tipoServicoId,
    fotos: os.fotos,
    status: os.status,
    equipeId: os.equipeId,
    responsavelId: os.responsavelId,
    concluidoEm: os.concluidoEm,
  }
}

// ---------- Schemas zod ----------

const filtroOrdensSchema = z.object({
  status: z.enum(STATUS_OS).optional(),
  equipeId: z.coerce.number().int().positive().optional(),
  responsavelId: z.coerce.number().int().positive().optional(),
  fotos: z.enum(['COM_FOTOS', 'SEM_FOTOS']).optional(),
  sequencial: z.string().trim().min(1).optional(),
})

const novaOrdemSchema = z.object({
  sequencial: z.string().trim().min(1, 'sequencial é obrigatório'),
  tipoServicoId: z.number().int().positive('tipoServicoId é obrigatório'),
  equipeId: z.number().int().positive().nullable().optional(),
  responsavelId: z.number().int().positive().nullable().optional(),
  anotacoes: z.string().nullable().optional(),
})

// Edição NÃO permite alterar o sequencial (ID bipado imutável).
const editarOrdemSchema = novaOrdemSchema.partial().omit({ sequencial: true })

const mudarStatusSchema = z.object({
  status: z.enum(STATUS_OS),
})

const receberOrdemSchema = z.object({
  fotos: z.enum(['COM_FOTOS', 'SEM_FOTOS']),
})

// ---------- GET /ordens ----------

ordensRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filtros = filtroOrdensSchema.parse(req.query)

    const where: Record<string, unknown> = {}
    if (filtros.status) where.status = filtros.status
    if (filtros.equipeId) where.equipeId = filtros.equipeId
    if (filtros.responsavelId) where.responsavelId = filtros.responsavelId
    if (filtros.fotos) where.fotos = filtros.fotos
    if (filtros.sequencial) where.sequencial = filtros.sequencial

    const ordens = await prisma.ordemServico.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      include: includeExpandida,
    })

    res.json(ordens.map(serializarOSExpandida))
  } catch (e) {
    next(e)
  }
})

// ---------- GET /ordens/:id ----------

ordensRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw erro400('ID inválido')

    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: includeExpandida,
    })
    if (!os) throw erro404('Ordem de serviço não encontrada')

    const eventos = await prisma.eventoAuditoria.findMany({
      where: { entidade: 'OS', entidadeId: id },
      orderBy: { criadoEm: 'asc' },
      include: { autor: { select: { id: true, nome: true } } },
    })

    res.json({
      ...serializarOSExpandida(os),
      eventos: eventos.map(serializarEvento),
    })
  } catch (e) {
    next(e)
  }
})

// ---------- POST /ordens ----------

ordensRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dados = novaOrdemSchema.parse(req.body)
    const autorId = req.usuario!.id

    // Regra de nascimento: com equipe → ATENDENDO; sem equipe → PENDENTE.
    const statusInicial: StatusOS = dados.equipeId ? 'ATENDENDO' : 'PENDENTE'

    const nova = await prisma.$transaction(async (tx) => {
      const os = await tx.ordemServico.create({
        data: {
          sequencial: dados.sequencial,
          anotacoes: dados.anotacoes ?? null,
          tipoServicoId: dados.tipoServicoId,
          status: statusInicial,
          equipeId: dados.equipeId ?? null,
          responsavelId: dados.responsavelId ?? null,
          criadoPorId: autorId,
        },
      })

      await registrarEvento(
        {
          entidade: 'OS',
          entidadeId: os.id,
          acao: 'CRIACAO',
          autorId,
          depois: snapshotOS(os),
        },
        tx,
      )

      return os
    })

    res.status(201).json(serializarOS(nova))
  } catch (e) {
    // Sequencial duplicado (unique) → 409.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return next(erro409('Já existe uma OS com este sequencial'))
    }
    next(e)
  }
})

// ---------- PATCH /ordens/:id ----------

ordensRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw erro400('ID inválido')

    const dados = editarOrdemSchema.parse(req.body)
    const autorId = req.usuario!.id

    const existente = await prisma.ordemServico.findUnique({ where: { id } })
    if (!existente) throw erro404('Ordem de serviço não encontrada')

    const updateData: Record<string, unknown> = {}
    if (dados.anotacoes !== undefined) updateData.anotacoes = dados.anotacoes
    if (dados.tipoServicoId !== undefined) updateData.tipoServicoId = dados.tipoServicoId
    if (dados.equipeId !== undefined) updateData.equipeId = dados.equipeId
    if (dados.responsavelId !== undefined) updateData.responsavelId = dados.responsavelId

    if (Object.keys(updateData).length === 0) throw erro400('Nenhum campo para atualizar')

    const antes = snapshotOS(existente)

    const atualizada = await prisma.$transaction(async (tx) => {
      const os = await tx.ordemServico.update({ where: { id }, data: updateData })
      await registrarEvento(
        {
          entidade: 'OS',
          entidadeId: id,
          acao: 'ATUALIZACAO',
          autorId,
          antes,
          depois: snapshotOS(os),
        },
        tx,
      )
      return os
    })

    res.json(serializarOS(atualizada))
  } catch (e) {
    next(e)
  }
})

// ---------- PATCH /ordens/:id/status ----------

ordensRouter.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw erro400('ID inválido')

    const { status: novoStatus } = mudarStatusSchema.parse(req.body)
    const autorId = req.usuario!.id

    const existente = await prisma.ordemServico.findUnique({ where: { id } })
    if (!existente) throw erro404('Ordem de serviço não encontrada')

    const statusAtual = existente.status as StatusOS
    const transicoesPermitidas = TRANSICOES_STATUS[statusAtual]

    if (!transicoesPermitidas.includes(novoStatus)) {
      throw erro409(
        `Transição inválida: ${statusAtual} → ${novoStatus}. Permitidas: [${transicoesPermitidas.join(', ') || 'nenhuma'}]`,
      )
    }

    const updateData: Record<string, unknown> = { status: novoStatus }
    if (novoStatus === 'CONCLUIDA') {
      updateData.concluidoEm = new Date()
    }

    const antes = snapshotOS(existente)

    const atualizada = await prisma.$transaction(async (tx) => {
      const os = await tx.ordemServico.update({ where: { id }, data: updateData })
      await registrarEvento(
        {
          entidade: 'OS',
          entidadeId: id,
          acao: 'MUDANCA_STATUS',
          autorId,
          antes,
          depois: snapshotOS(os),
          descricao: `OS ${existente.sequencial}: status alterado de ${statusAtual} para ${novoStatus}`,
        },
        tx,
      )
      return os
    })

    res.json(serializarOS(atualizada))
  } catch (e) {
    next(e)
  }
})

// ---------- PATCH /ordens/:id/receber ----------
// Finaliza a OS no recebimento: registra fotos, marca CONCLUIDA e concluidoEm.
ordensRouter.patch('/:id/receber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw erro400('ID inválido')

    const { fotos } = receberOrdemSchema.parse(req.body)
    const autorId = req.usuario!.id

    const existente = await prisma.ordemServico.findUnique({ where: { id } })
    if (!existente) throw erro404('Ordem de serviço não encontrada')

    const statusAtual = existente.status as StatusOS
    if (statusAtual !== 'ATENDENDO' && statusAtual !== 'PENDENTE') {
      throw erro409(
        `OS ${existente.sequencial} não pode ser recebida no status ${statusAtual} (esperado ATENDENDO ou PENDENTE)`,
      )
    }

    const antes = snapshotOS(existente)
    const rotuloFotos = fotos === 'COM_FOTOS' ? 'com fotos' : 'sem fotos — equipe cobrada'

    const atualizada = await prisma.$transaction(async (tx) => {
      const os = await tx.ordemServico.update({
        where: { id },
        data: { fotos, status: 'CONCLUIDA', concluidoEm: new Date() },
      })
      await registrarEvento(
        {
          entidade: 'OS',
          entidadeId: id,
          acao: 'MUDANCA_STATUS',
          autorId,
          antes,
          depois: snapshotOS(os),
          descricao: `OS ${existente.sequencial}: finalizada (${rotuloFotos})`,
        },
        tx,
      )
      return os
    })

    res.json(serializarOS(atualizada))
  } catch (e) {
    next(e)
  }
})

// ---------- DELETE /ordens/:id ----------

ordensRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw erro400('ID inválido')

    const autorId = req.usuario!.id

    const existente = await prisma.ordemServico.findUnique({ where: { id } })
    if (!existente) throw erro404('Ordem de serviço não encontrada')

    await prisma.$transaction(async (tx) => {
      await tx.ordemServico.delete({ where: { id } })
      await registrarEvento(
        {
          entidade: 'OS',
          entidadeId: id,
          acao: 'EXCLUSAO',
          autorId,
          antes: snapshotOS(existente),
        },
        tx,
      )
    })

    res.status(204).end()
  } catch (e) {
    next(e)
  }
})
