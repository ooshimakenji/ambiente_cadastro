// =====================================================================
// errorHandler central — serializa qualquer erro como { erro: mensagem }.
// Deve ser montado POR ÚLTIMO em index.ts (depois de todas as rotas).
// - HttpError -> usa seu status/mensagem.
// - ZodError  -> 400 com a primeira mensagem de validação.
// - Erros conhecidos do Prisma (P2002 etc.) -> mapeados p/ 409/404.
// - Demais    -> 500 (mensagem genérica; detalhe vai ao log).
// =====================================================================
import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { HttpError } from './httpError.js'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ erro: err.message })
    return
  }

  if (err instanceof ZodError) {
    const primeiro = err.issues[0]
    const caminho = primeiro?.path?.length ? `${primeiro.path.join('.')}: ` : ''
    res.status(400).json({ erro: `${caminho}${primeiro?.message ?? 'Dados inválidos'}` })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ erro: 'Registro duplicado (violação de unicidade)' })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ erro: 'Registro não encontrado' })
      return
    }
    if (err.code === 'P2003') {
      res.status(409).json({ erro: 'Operação viola integridade referencial' })
      return
    }
  }

  console.error('[errorHandler] erro não tratado:', err)
  res.status(500).json({ erro: 'Erro interno do servidor' })
}

// 404 para rotas não registradas (montar antes do errorHandler).
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' })
}
