// =====================================================================
// Router de permissões por papel (configuráveis pelo ADMIN).
//   GET   /permissoes → matriz completa (papel × tela), default false.
//   PATCH /permissoes → upsert de uma célula { papel, tela, permitido } + auditoria.
// ADMIN sempre tem acesso total (não entra na matriz). Montado com
// requireAuth + requireAdmin no index.ts.
// =====================================================================
import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { registrarEvento } from '../audit/index.js'
import { TELAS, PAPEIS } from '../domain.js'

export const permissoesRouter = Router()

// Papéis configuráveis (ADMIN tem tudo, fica fora da matriz).
const PAPEIS_CONFIGURAVEIS = PAPEIS.filter((p) => p !== 'ADMIN')

const patchSchema = z
  .object({
    papel: z.string(),
    tela: z.string(),
    permitido: z.boolean(),
  })
  .refine(
    (d) =>
      (PAPEIS_CONFIGURAVEIS as readonly string[]).includes(d.papel) &&
      (TELAS as readonly string[]).includes(d.tela),
    { message: 'papel ou tela inválido' },
  )

// GET /permissoes — matriz (papel × tela); células ausentes = false.
permissoesRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const linhas = await prisma.permissaoPapel.findMany()
    const mapa = new Map(linhas.map((l) => [`${l.papel}|${l.tela}`, l.permitido]))
    const matriz = PAPEIS_CONFIGURAVEIS.flatMap((papel) =>
      TELAS.map((tela) => ({ papel, tela, permitido: mapa.get(`${papel}|${tela}`) ?? false })),
    )
    res.json(matriz)
  } catch (e) {
    next(e)
  }
})

// PATCH /permissoes — atualiza uma célula + auditoria.
permissoesRouter.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { papel, tela, permitido } = patchSchema.parse(req.body)
    const autorId = req.usuario!.id

    const reg = await prisma.$transaction(async (tx) => {
      const r = await tx.permissaoPapel.upsert({
        where: { papel_tela: { papel, tela } },
        update: { permitido },
        create: { papel, tela, permitido },
      })
      await registrarEvento(
        {
          entidade: 'PERMISSAO',
          entidadeId: r.id,
          acao: 'ATUALIZACAO',
          autorId,
          depois: { papel, tela, permitido },
          descricao: `Permissão ${papel} / ${tela} = ${permitido ? 'sim' : 'não'}`,
        },
        tx,
      )
      return r
    })

    res.json({ papel: reg.papel, tela: reg.tela, permitido: reg.permitido })
  } catch (e) {
    next(e)
  }
})
