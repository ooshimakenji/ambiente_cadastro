// =====================================================================
// Router de tipos de serviço — espelha equipes.ts.
// Todos os usuários autenticados podem ler; POST/PATCH/DELETE exigem
// autenticação (requireAuth aplicado no index.ts).
//   GET    /tipos      → TipoServico[]
//   POST   /tipos      → TipoServico
//   PATCH  /tipos/:id  → TipoServico
//   DELETE /tipos/:id  → 204 (409 se houver OS referenciando)
//
// Migração futura a Postgres: nenhuma mudança necessária aqui.
// =====================================================================
import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { registrarEvento } from '../audit/index.js'
import { erro400, erro404, erro409 } from '../middleware/httpError.js'

export const tiposServicoRouter = Router()

// ---------- helpers ----------

function serializarTipo(t: {
  id: number
  nome: string
  ativo: boolean
  criadoEm: Date
}) {
  return {
    id: t.id,
    nome: t.nome,
    ativo: t.ativo,
    criadoEm: t.criadoEm.toISOString(),
  }
}

// ---------- Schemas zod ----------

const novoTipoSchema = z.object({
  nome: z.string().min(1, 'nome é obrigatório'),
})

const editarTipoSchema = z.object({
  nome: z.string().min(1).optional(),
  ativo: z.boolean().optional(),
})

// ---------- GET /tipos ----------

tiposServicoRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tipos = await prisma.tipoServico.findMany({ orderBy: { criadoEm: 'desc' } })
    res.json(tipos.map(serializarTipo))
  } catch (e) {
    next(e)
  }
})

// ---------- POST /tipos ----------

tiposServicoRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dados = novoTipoSchema.parse(req.body)
    const autorId = req.usuario!.id

    const tipo = await prisma.$transaction(async (tx) => {
      const novo = await tx.tipoServico.create({ data: { nome: dados.nome } })
      await registrarEvento(
        {
          entidade: 'TIPO_SERVICO',
          entidadeId: novo.id,
          acao: 'CRIACAO',
          autorId,
          depois: { id: novo.id, nome: novo.nome, ativo: novo.ativo },
        },
        tx,
      )
      return novo
    })

    res.status(201).json(serializarTipo(tipo))
  } catch (e) {
    next(e)
  }
})

// ---------- PATCH /tipos/:id ----------

tiposServicoRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw erro400('ID inválido')

    const dados = editarTipoSchema.parse(req.body)
    const autorId = req.usuario!.id

    const existente = await prisma.tipoServico.findUnique({ where: { id } })
    if (!existente) throw erro404('Tipo de serviço não encontrado')

    const updateData: Record<string, unknown> = {}
    if (dados.nome !== undefined) updateData.nome = dados.nome
    if (dados.ativo !== undefined) updateData.ativo = dados.ativo

    if (Object.keys(updateData).length === 0) throw erro400('Nenhum campo para atualizar')

    const snapshotAntes = { nome: existente.nome, ativo: existente.ativo }

    const atualizado = await prisma.$transaction(async (tx) => {
      const t = await tx.tipoServico.update({ where: { id }, data: updateData })
      await registrarEvento(
        {
          entidade: 'TIPO_SERVICO',
          entidadeId: id,
          acao: 'ATUALIZACAO',
          autorId,
          antes: snapshotAntes,
          depois: { nome: t.nome, ativo: t.ativo },
        },
        tx,
      )
      return t
    })

    res.json(serializarTipo(atualizado))
  } catch (e) {
    next(e)
  }
})

// ---------- DELETE /tipos/:id ----------

tiposServicoRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw erro400('ID inválido')

    const autorId = req.usuario!.id

    const existente = await prisma.tipoServico.findUnique({ where: { id } })
    if (!existente) throw erro404('Tipo de serviço não encontrado')

    // Pré-checagem de uso: bloqueia a exclusão se houver OS referenciando.
    const emUso = await prisma.ordemServico.count({ where: { tipoServicoId: id } })
    if (emUso > 0) {
      throw erro409(
        `Não é possível excluir: em uso por ${emUso} ordem(ns) de serviço — desative em vez de excluir.`,
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.tipoServico.delete({ where: { id } })
      await registrarEvento(
        {
          entidade: 'TIPO_SERVICO',
          entidadeId: id,
          acao: 'EXCLUSAO',
          autorId,
          antes: { nome: existente.nome, ativo: existente.ativo },
        },
        tx,
      )
    })

    res.status(204).end()
  } catch (e) {
    // FK: existe OS referenciando este tipo → não pode excluir.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      return next(
        erro409('Não é possível excluir: há ordens de serviço usando este tipo. Desative-o em vez de excluir.'),
      )
    }
    next(e)
  }
})
