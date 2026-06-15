// =====================================================================
// Router de autenticação.
//   POST /auth/login  -> valida login+senha (bcrypt), grava evento LOGIN,
//                        retorna { token, usuario } (sem senhaHash).
//   POST /auth/logout -> grava evento LOGOUT (se autenticado), 204.
//   GET  /auth/me     -> retorna o usuário do token (Usuario).
// Auditoria de LOGIN/LOGOUT ocorre na mesma transação do upsert (regra
// transversal do CONTRACT.md).
// =====================================================================
import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { registrarEvento } from '../audit/index.js'
import { verificarSenha } from './senha.js'
import { gerarToken } from './jwt.js'
import { serializarUsuario } from './serializar.js'
import { requireAuth, permissoesDoUsuario } from '../middleware/auth.js'
import { erro401 } from '../middleware/httpError.js'

const loginSchema = z.object({
  login: z.string().min(1, 'login é obrigatório'),
  senha: z.string().min(1, 'senha é obrigatória'),
})

export const authRouter = Router()

// POST /auth/login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { login, senha } = loginSchema.parse(req.body)

    const usuario = await prisma.usuario.findUnique({ where: { login } })
    // Mensagem genérica (não revela se o login existe).
    if (!usuario || !usuario.ativo) {
      throw erro401('Credenciais inválidas')
    }
    const ok = await verificarSenha(senha, usuario.senhaHash)
    if (!ok) {
      throw erro401('Credenciais inválidas')
    }

    // Evento LOGIN na mesma transação.
    await prisma.$transaction(async (tx) => {
      await registrarEvento(
        {
          entidade: 'USUARIO',
          entidadeId: usuario.id,
          acao: 'LOGIN',
          autorId: usuario.id,
        },
        tx,
      )
    })

    const usuarioPublico = serializarUsuario(usuario)
    const token = gerarToken({
      id: usuarioPublico.id,
      login: usuarioPublico.login,
      nome: usuarioPublico.nome,
      papel: usuarioPublico.papel,
    })
    const permissoes = await permissoesDoUsuario(usuarioPublico.papel)

    res.json({ token, usuario: usuarioPublico, permissoes })
  } catch (e) {
    next(e)
  }
})

// POST /auth/logout — requer auth (para sabermos quem deslogou e auditar).
authRouter.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const autor = req.usuario!
    await prisma.$transaction(async (tx) => {
      await registrarEvento(
        {
          entidade: 'USUARIO',
          entidadeId: autor.id,
          acao: 'LOGOUT',
          autorId: autor.id,
        },
        tx,
      )
    })
    res.status(204).end()
  } catch (e) {
    next(e)
  }
})

// GET /auth/me — usuário do token (lê do banco p/ refletir estado atual).
authRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const autor = req.usuario!
    const usuario = await prisma.usuario.findUnique({ where: { id: autor.id } })
    if (!usuario || !usuario.ativo) {
      throw erro401('Usuário não encontrado ou inativo')
    }
    const usuarioPublico = serializarUsuario(usuario)
    const permissoes = await permissoesDoUsuario(usuarioPublico.papel)
    res.json({ usuario: usuarioPublico, permissoes })
  } catch (e) {
    next(e)
  }
})
