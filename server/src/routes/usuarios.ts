// =====================================================================
// Router de usuários — restrito a ADMIN (requireAdmin aplicado no index.ts).
//   GET    /usuarios         → UsuarioComEquipe[]
//   POST   /usuarios         → Usuario (cria com senha hashed)
//   PATCH  /usuarios/:id     → Usuario (edita; re-hasha senha se vier)
//   DELETE /usuarios/:id     → 204 (desativa ativo=false, preserva FKs)
//
// Migração futura a Postgres: nenhuma mudança necessária neste arquivo;
// apenas schema.prisma e DATABASE_URL precisam de atualização.
// =====================================================================
import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { registrarEvento } from '../audit/index.js'
import { hashSenha } from '../auth/index.js'
import { serializarUsuario } from '../auth/serializar.js'
import { erro400, erro404, erro409 } from '../middleware/httpError.js'
import { PAPEIS } from '../domain.js'

export const usuariosRouter = Router()

// ---------- helpers de serialização ----------

function serializarComEquipe(u: {
  id: number
  nome: string
  login: string
  papel: string
  ativo: boolean
  equipeId: number | null
  criadoEm: Date
  equipe: { id: number; nome: string } | null
}) {
  return {
    id: u.id,
    nome: u.nome,
    login: u.login,
    papel: u.papel,
    ativo: u.ativo,
    equipeId: u.equipeId,
    criadoEm: u.criadoEm.toISOString(),
    equipe: u.equipe ? { id: u.equipe.id, nome: u.equipe.nome } : null,
  }
}

// ---------- Schemas zod ----------

const novoUsuarioSchema = z.object({
  nome: z.string().min(1, 'nome é obrigatório'),
  login: z.string().min(1, 'login é obrigatório'),
  senha: z.string().min(4, 'senha deve ter ao menos 4 caracteres'),
  papel: z.enum(PAPEIS),
  equipeId: z.number().int().positive().nullable().optional(),
})

const editarUsuarioSchema = z.object({
  nome: z.string().min(1).optional(),
  login: z.string().min(1).optional(),
  senha: z.string().min(4).optional(),
  papel: z.enum(PAPEIS).optional(),
  equipeId: z.number().int().positive().nullable().optional(),
  ativo: z.boolean().optional(),
})

// ---------- GET /usuarios ----------

usuariosRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { criadoEm: 'desc' },
      include: { equipe: { select: { id: true, nome: true } } },
    })
    res.json(usuarios.map(serializarComEquipe))
  } catch (e) {
    next(e)
  }
})

// ---------- POST /usuarios ----------

usuariosRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dados = novoUsuarioSchema.parse(req.body)
    const autorId = req.usuario!.id

    // Verifica duplicidade de login antes da transação
    const existente = await prisma.usuario.findUnique({ where: { login: dados.login } })
    if (existente) throw erro409(`Login '${dados.login}' já está em uso`)

    const senhaHash = await hashSenha(dados.senha)

    const usuario = await prisma.$transaction(async (tx) => {
      const novo = await tx.usuario.create({
        data: {
          nome: dados.nome,
          login: dados.login,
          senhaHash,
          papel: dados.papel,
          equipeId: dados.equipeId ?? null,
        },
      })
      await registrarEvento(
        {
          entidade: 'USUARIO',
          entidadeId: novo.id,
          acao: 'CRIACAO',
          autorId,
          depois: { id: novo.id, nome: novo.nome, login: novo.login, papel: novo.papel },
        },
        tx,
      )
      return novo
    })

    res.status(201).json(serializarUsuario(usuario))
  } catch (e) {
    next(e)
  }
})

// ---------- PATCH /usuarios/:id ----------

usuariosRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw erro400('ID inválido')

    const dados = editarUsuarioSchema.parse(req.body)
    const autorId = req.usuario!.id

    const existente = await prisma.usuario.findUnique({ where: { id } })
    if (!existente) throw erro404('Usuário não encontrado')

    // Verifica duplicidade de login se veio novo login
    if (dados.login && dados.login !== existente.login) {
      const conflito = await prisma.usuario.findUnique({ where: { login: dados.login } })
      if (conflito) throw erro409(`Login '${dados.login}' já está em uso`)
    }

    const updateData: Record<string, unknown> = {}
    if (dados.nome !== undefined) updateData.nome = dados.nome
    if (dados.login !== undefined) updateData.login = dados.login
    if (dados.papel !== undefined) updateData.papel = dados.papel
    if (dados.equipeId !== undefined) updateData.equipeId = dados.equipeId
    if (dados.ativo !== undefined) updateData.ativo = dados.ativo
    if (dados.senha !== undefined) updateData.senhaHash = await hashSenha(dados.senha)

    if (Object.keys(updateData).length === 0) throw erro400('Nenhum campo para atualizar')

    const snapshotAntes = {
      nome: existente.nome,
      login: existente.login,
      papel: existente.papel,
      equipeId: existente.equipeId,
      ativo: existente.ativo,
    }

    const atualizado = await prisma.$transaction(async (tx) => {
      const u = await tx.usuario.update({ where: { id }, data: updateData })
      await registrarEvento(
        {
          entidade: 'USUARIO',
          entidadeId: id,
          acao: 'ATUALIZACAO',
          autorId,
          antes: snapshotAntes,
          depois: { nome: u.nome, login: u.login, papel: u.papel, equipeId: u.equipeId, ativo: u.ativo },
        },
        tx,
      )
      return u
    })

    res.json(serializarUsuario(atualizado))
  } catch (e) {
    next(e)
  }
})

// ---------- DELETE /usuarios/:id (desativa, preserva FKs) ----------

usuariosRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw erro400('ID inválido')

    const autorId = req.usuario!.id

    const existente = await prisma.usuario.findUnique({ where: { id } })
    if (!existente) throw erro404('Usuário não encontrado')

    await prisma.$transaction(async (tx) => {
      await tx.usuario.update({ where: { id }, data: { ativo: false } })
      await registrarEvento(
        {
          entidade: 'USUARIO',
          entidadeId: id,
          acao: 'EXCLUSAO',
          autorId,
          antes: { ativo: existente.ativo },
          depois: { ativo: false },
          descricao: `Usuário #${id} desativado (soft-delete)`,
        },
        tx,
      )
    })

    res.status(204).end()
  } catch (e) {
    next(e)
  }
})
