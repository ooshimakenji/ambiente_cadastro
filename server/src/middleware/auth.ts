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
import { normalizarPapel, TELAS, type Tela } from '../domain.js'
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
      papel: normalizarPapel(usuario.papel),
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

// Retorna as telas que um papel pode acessar.
// ADMIN tem acesso total; demais papéis consultam a tabela PermissaoPapel.
export async function permissoesDoUsuario(papel: string): Promise<Tela[]> {
  if (papel === 'ADMIN') {
    return [...TELAS]
  }
  const linhas = await prisma.permissaoPapel.findMany({
    where: { papel, permitido: true },
    select: { tela: true },
  })
  return linhas.map((l) => l.tela as Tela)
}

// Guard por tela: ADMIN passa; demais precisam de PermissaoPapel(permitido=true).
// Use SEMPRE depois de requireAuth.
export function requirePermissao(tela: Tela): RequestHandler {
  return async (req, _res, next) => {
    try {
      if (!req.usuario) return next(erro401())
      if (req.usuario.papel === 'ADMIN') return next()
      const ok = await prisma.permissaoPapel.findUnique({
        where: { papel_tela: { papel: req.usuario.papel, tela } },
      })
      if (!ok || !ok.permitido) {
        return next(erro403(`Sem permissão para "${tela}"`))
      }
      next()
    } catch (e) {
      next(e)
    }
  }
}
