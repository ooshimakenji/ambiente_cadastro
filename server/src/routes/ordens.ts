// =====================================================================
// Router de ordens de serviço (modelo v3: OS pai → N saídas).
//   GET    /ordens                  → OrdemServicoExpandida[] (com saidas[])
//                                      filtros: status, sequencial, tipoServicoId,
//                                      aguardandoFotos (bool)
//   GET    /ordens/:id              → OrdemServicoExpandida + { eventos: [] }
//   POST   /ordens                  → cadastra (cria OS+1ª saída OU nova saída se já existe)
//   POST   /ordens/:id/saida-foto   → cria saída tipo=FOTO p/ regularizar foto
//
// NÃO há DELETE (rastreabilidade: sem hard delete; cancelar é estado).
// O status da OS é DERIVADO das saídas (ver lib/derivar.ts), atualizado
// dentro das transações. Auditoria em toda mutação (mesma $transaction).
// =====================================================================
import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { registrarEvento } from '../audit/index.js'
import { erro400, erro404, erro409 } from '../middleware/httpError.js'
import { requirePermissao } from '../middleware/auth.js'
import { STATUS_OS } from '../domain.js'
import {
  includeExpandida,
  serializarOSExpandida,
  serializarEvento,
  snapshotSaida,
  derivarStatusOS,
  aguardandoFotos,
} from './lib/ordensShared.js'

export const ordensRouter = Router()

// ---------- Schemas zod ----------

const filtroOrdensSchema = z.object({
  status: z.enum(STATUS_OS).optional(),
  tipoServicoId: z.coerce.number().int().positive().optional(),
  sequencial: z.string().trim().min(1).optional(),
  // "aguardando fotos": OS CONCLUIDA com saída concluída SEM_FOTOS não regularizada.
  aguardandoFotos: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

const novaOrdemSchema = z.object({
  sequencial: z.string().trim().min(1, 'sequencial é obrigatório'),
  tipoServicoId: z.number().int().positive('tipoServicoId é obrigatório'),
  equipeId: z.number().int().positive().nullable().optional(),
  responsavelId: z.number().int().positive().nullable().optional(),
  anotacoes: z.string().nullable().optional(),
})

const saidaFotoSchema = z.object({
  equipeId: z.number().int().positive().nullable().optional(),
  responsavelId: z.number().int().positive().nullable().optional(),
  anotacoes: z.string().nullable().optional(),
})

// ---------- GET /ordens ----------

ordensRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filtros = filtroOrdensSchema.parse(req.query)

    const where: Record<string, unknown> = {}
    if (filtros.status) where.status = filtros.status
    if (filtros.tipoServicoId) where.tipoServicoId = filtros.tipoServicoId
    if (filtros.sequencial) where.sequencial = filtros.sequencial

    const ordens = await prisma.ordemServico.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      include: includeExpandida,
    })

    let lista = ordens.map(serializarOSExpandida)
    if (filtros.aguardandoFotos !== undefined) {
      lista = lista.filter((os) => aguardandoFotos(os.saidas) === filtros.aguardandoFotos)
    }

    res.json(lista)
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

// ---------- POST /ordens (cadastrar / re-despachar) ----------
// Sequencial NOVO  → cria OrdemServico (ABERTA) + (se houver equipe) 1ª Saida EM_CAMPO.
// Sequencial EXISTE → cria NOVA Saida (re-despacho). NÃO retorna 409.
ordensRouter.post('/', requirePermissao('cadastrar'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dados = novaOrdemSchema.parse(req.body)
    const autorId = req.usuario!.id

    const resultado = await prisma.$transaction(async (tx) => {
      const existente = await tx.ordemServico.findUnique({ where: { sequencial: dados.sequencial } })

      if (!existente) {
        // Nasce a OS (ABERTA). Com equipe → já cria a 1ª saída EM_CAMPO.
        const os = await tx.ordemServico.create({
          data: {
            sequencial: dados.sequencial,
            tipoServicoId: dados.tipoServicoId,
            status: 'ABERTA',
            criadoPorId: autorId,
          },
        })
        await registrarEvento(
          {
            entidade: 'OS',
            entidadeId: os.id,
            acao: 'CRIACAO',
            autorId,
            depois: { sequencial: os.sequencial, tipoServicoId: os.tipoServicoId, status: os.status },
            descricao: `OS ${os.sequencial} cadastrada`,
          },
          tx,
        )

        if (dados.equipeId) {
          const saida = await tx.saida.create({
            data: {
              ordemId: os.id,
              equipeId: dados.equipeId,
              responsavelId: dados.responsavelId ?? null,
              status: 'EM_CAMPO',
              tipo: 'CAMPO',
              anotacoes: dados.anotacoes ?? null,
              criadoPorId: autorId,
            },
          })
          await registrarEvento(
            {
              entidade: 'SAIDA',
              entidadeId: saida.id,
              acao: 'CRIACAO',
              autorId,
              depois: snapshotSaida(saida),
              descricao: `OS ${os.sequencial}: 1ª saída em campo`,
            },
            tx,
          )
        }
        return tx.ordemServico.findUnique({ where: { id: os.id }, include: includeExpandida })
      }

      // OS já existe → re-despacho: nova saída EM_CAMPO.
      if (existente.status === 'CANCELADA') {
        throw erro409(`OS ${existente.sequencial} está CANCELADA — não aceita novas saídas`)
      }
      const saida = await tx.saida.create({
        data: {
          ordemId: existente.id,
          equipeId: dados.equipeId ?? null,
          responsavelId: dados.responsavelId ?? null,
          status: 'EM_CAMPO',
          tipo: 'CAMPO',
          anotacoes: dados.anotacoes ?? null,
          criadoPorId: autorId,
        },
      })
      await registrarEvento(
        {
          entidade: 'SAIDA',
          entidadeId: saida.id,
          acao: 'CRIACAO',
          autorId,
          depois: snapshotSaida(saida),
          descricao: `OS ${existente.sequencial}: nova saída em campo (re-despacho)`,
        },
        tx,
      )

      // Re-despacho de uma OS concluída a reabre (há trabalho em campo de novo).
      const saidas = await tx.saida.findMany({ where: { ordemId: existente.id } })
      const novoStatus = derivarStatusOS(saidas)
      if (novoStatus !== existente.status || existente.concluidoEm) {
        await tx.ordemServico.update({
          where: { id: existente.id },
          data: { status: novoStatus, concluidoEm: novoStatus === 'CONCLUIDA' ? existente.concluidoEm : null },
        })
      }
      return tx.ordemServico.findUnique({ where: { id: existente.id }, include: includeExpandida })
    })

    res.status(201).json(serializarOSExpandida(resultado!))
  } catch (e) {
    next(e)
  }
})

// ---------- POST /ordens/:id/saida-foto ----------
// Cria uma saída tipo=FOTO (EM_CAMPO) p/ regularizar foto de OS concluída-sem-foto.
// A regularização se concretiza no recebimento dessa saída (PATCH /saidas/:id/receber
// com fotos=COM_FOTOS), que marca a saída CAMPO concluída SEM_FOTOS como COM_FOTOS.
ordensRouter.post('/:id/saida-foto', requirePermissao('receber'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw erro400('ID inválido')

    const dados = saidaFotoSchema.parse(req.body)
    const autorId = req.usuario!.id

    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: { saidas: true },
    })
    if (!os) throw erro404('Ordem de serviço não encontrada')
    if (!aguardandoFotos(os.saidas)) {
      throw erro409(`OS ${os.sequencial} não está aguardando fotos`)
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const saida = await tx.saida.create({
        data: {
          ordemId: id,
          equipeId: dados.equipeId ?? null,
          responsavelId: dados.responsavelId ?? null,
          status: 'EM_CAMPO',
          tipo: 'FOTO',
          anotacoes: dados.anotacoes ?? null,
          criadoPorId: autorId,
        },
      })
      await registrarEvento(
        {
          entidade: 'SAIDA',
          entidadeId: saida.id,
          acao: 'CRIACAO',
          autorId,
          depois: snapshotSaida(saida),
          descricao: `OS ${os.sequencial}: saída de foto (regularização)`,
        },
        tx,
      )
      return tx.ordemServico.findUnique({ where: { id }, include: includeExpandida })
    })

    res.status(201).json(serializarOSExpandida(resultado!))
  } catch (e) {
    next(e)
  }
})
