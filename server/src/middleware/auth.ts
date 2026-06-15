// =====================================================================
// Middlewares de autenticação/autorização.
// - requireAuth: lê o Bearer token, valida, RE-VALIDA o usuário no banco
//   (existe e ativo) e injeta req.usuario (401 se inválido/inativo).
//   A revalidação no banco garante revogação imediata de usuários
//   desativados (soft-delete) ou removidos, mesmo com JWT ainda não expirado.
// - requireAdmin: exige req.usuario.papel === 'ADMIN' (403 caso contrário).
//   Deve ser usado SEMPRE depois de requireAuth.
// =====================================================================
import type { RequestHandler } from 'express'
import { verificarToken } from '../auth/jwt.js'
import { prisma } from '../prisma.js'
import { erro401, erro403 } from './httpError.js'

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return next(erro401('Token ausente'))
    }
    const token = header.slice('Bearer '.length).trim()
    const payload = verificarToken(token)
    if (!payload) {
      return next(erro401('Token inválido ou expirado'))
    }

    // Revalida no banco: usuário deve existir e estar ativo.
    // Fonte de verdade para papel/login/nome (token pode estar defasado após edição).
    const usuario = await prisma.usuario.findUnique({ where: { id: payload.id } })
    if (!usuario || !usuario.ativo) {
      return next(erro401('Usuário inativo ou inexistente'))
    }

    req.usuario = {
      id: usuario.id,
      login: usuario.login,
      nome: usuario.nome,
      papel: usuario.papel === 'ADMIN' ? 'ADMIN' : 'SUPERVISOR',
    }
    next()
  } catch (e) {
    next(e)
  }
}

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.usuario) {
    return next(erro401())
  }
  if (req.usuario.papel !== 'ADMIN') {
    return next(erro403('Acesso restrito a administradores'))
  }
  next()
}
