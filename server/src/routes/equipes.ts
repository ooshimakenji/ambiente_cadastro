// =====================================================================
// Router de equipes — todos os usuários autenticados podem ler;
// POST/PATCH/DELETE exigem autenticação (requireAuth aplicado no index.ts).
//   GET    /equipes      → Equipe[]
//   POST   /equipes      → Equipe
//   PATCH  /equipes/:id  → Equipe
//   DELETE /equipes/:id  → 204
//
// Migração futura a Postgres: nenhuma mudança necessária aqui.
// =====================================================================
import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { registrarEvento } from '../audit/index.js'
import { erro400, erro404, erro409 } from '../middleware/httpError.js'

export const equipesRouter = Router()

// ---------- helpers ----------

function serializarEquipe(e: {
  id: number
  nome: string
  descricao: string | null
  ativo: boolean
  criadoEm: Date
}) {
  return {
    id: e.id,
    nome: e.nome,
    descricao: e.descricao,
    ativo: e.ativo,
    criadoEm: e.criadoEm.toISOString(),
  }
}

// ---------- Schemas zod ----------

const novaEquipeSchema = z.object({
  nome: z.string().min(1, 'nome é obrigatório'),
  descricao: z.string().nullable().optional(),
})

const editarEquipeSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
})

// ---------- GET /equipes ----------

equipesRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const equipes = await prisma.equipe.findMany({ orderBy: { criadoEm: 'desc' } })
    res.json(equipes.map(serializarEquipe))
  } catch (e) {
    next(e)
  }
})

// ---------- POST /equipes ----------

equipesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dados = novaEquipeSchema.parse(req.body)
    const autorId = req.usuario!.id

    const equipe = await prisma.$transaction(async (tx) => {
      const nova = await tx.equipe.create({
        data: {
          nome: dados.nome,
          descricao: dados.descricao ?? null,
        },
      })
      await registrarEvento(
        {
          entidade: 'EQUIPE',
          entidadeId: nova.id,
          acao: 'CRIACAO',
          autorId,
          depois: { id: nova.id, nome: nova.nome, descricao: nova.descricao },
        },
        tx,
      )
      return nova
    })

    res.status(201).json(serializarEquipe(equipe))
  } catch (e) {
    next(e)
  }
})

// ---------- PATCH /equipes/:id ----------

equipesRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw erro400('ID inválido')

    const dados = editarEquipeSchema.parse(req.body)
    const autorId = req.usuario!.id

    const existente = await prisma.equipe.findUnique({ where: { id } })
    if (!existente) throw erro404('Equipe não encontrada')

    const updateData: Record<string, unknown> = {}
    if (dados.nome !== undefined) updateData.nome = dados.nome
    if (dados.descricao !== undefined) updateData.descricao = dados.descricao
    if (dados.ativo !== undefined) updateData.ativo = dados.ativo

    if (Object.keys(updateData).length === 0) throw erro400('Nenhum campo para atualizar')

    const snapshotAntes = {
      nome: existente.nome,
      descricao: existente.descricao,
      ativo: existente.ativo,
    }

    const atualizada = await prisma.$transaction(async (tx) => {
      const e = await tx.equipe.update({ where: { id }, data: updateData })
      await registrarEvento(
        {
          entidade: 'EQUIPE',
          entidadeId: id,
          acao: 'ATUALIZACAO',
          autorId,
          antes: snapshotAntes,
          depois: { nome: e.nome, descricao: e.descricao, ativo: e.ativo },
        },
        tx,
      )
      return e
    })

    res.json(serializarEquipe(atualizada))
  } catch (e) {
    next(e)
  }
})

// ---------- DELETE /equipes/:id ----------

equipesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw erro400('ID inválido')

    const autorId = req.usuario!.id

    const existente = await prisma.equipe.findUnique({ where: { id } })
    if (!existente) throw erro404('Equipe não encontrada')

    // Pré-checagem de uso: bloqueia se houver usuários ou saídas referenciando.
    const usuarios = await prisma.usuario.count({ where: { equipeId: id } })
    const saidas = await prisma.saida.count({ where: { equipeId: id } })
    const total = usuarios + saidas
    if (total > 0) {
      throw erro409(
        `Não é possível excluir: em uso por ${total} registro(s) (${usuarios} usuário(s), ${saidas} saída(s)) — desative em vez de excluir.`,
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.equipe.delete({ where: { id } })
      await registrarEvento(
        {
          entidade: 'EQUIPE',
          entidadeId: id,
          acao: 'EXCLUSAO',
          autorId,
          antes: { nome: existente.nome, descricao: existente.descricao, ativo: existente.ativo },
        },
        tx,
      )
    })

    res.status(204).end()
  } catch (e) {
    next(e)
  }
})
