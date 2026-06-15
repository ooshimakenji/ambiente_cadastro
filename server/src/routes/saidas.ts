// =====================================================================
// Router de saídas (atendimentos). Receber = registrar o retorno por desfecho.
//   PATCH /saidas/:id/receber → fecha a saída EM_CAMPO por desfecho
//       body { status: 'CONCLUIDA'|'NAO_REALIZADO'|'CANCELADA', fotos?, anotacoes? }
//
// Efeitos derivados na OS (dentro da $transaction):
//   CONCLUIDA      → OS.status=CONCLUIDA + concluidoEm; SEM_FOTOS deixa pendência de foto.
//   NAO_REALIZADO  → OS segue ABERTA (visita/batedor; pronta p/ nova saída).
//   CANCELADA      → cancela a saída; OS segue conforme as demais saídas (derivado).
//
// Regularização de foto: receber uma saída tipo=FOTO com fotos=COM_FOTOS marca a
// saída CAMPO concluída SEM_FOTOS como COM_FOTOS (fecha a pendência "aguardando fotos").
//
// Saída é append-only: receber NUNCA deleta nem cria nova saída; apenas fecha
// a saída EM_CAMPO. Auditoria SAIDA em toda mutação.
// =====================================================================
import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { registrarEvento } from '../audit/index.js'
import { erro400, erro404, erro409 } from '../middleware/httpError.js'
import { DESFECHO_SAIDA, FOTOS } from '../domain.js'
import {
  includeExpandida,
  serializarOSExpandida,
  snapshotSaida,
  derivarStatusOS,
} from './lib/ordensShared.js'

export const saidasRouter = Router()

const receberSchema = z.object({
  status: z.enum(DESFECHO_SAIDA),
  fotos: z.enum(FOTOS).optional(),
  anotacoes: z.string().nullable().optional(),
})

// ---------- PATCH /saidas/:id/receber ----------
saidasRouter.patch('/:id/receber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) throw erro400('ID inválido')

    const dados = receberSchema.parse(req.body)
    const autorId = req.usuario!.id

    const saida = await prisma.saida.findUnique({ where: { id }, include: { ordem: true } })
    if (!saida) throw erro404('Saída não encontrada')
    if (saida.status !== 'EM_CAMPO') {
      throw erro409(`Saída #${id} não está EM_CAMPO (status atual: ${saida.status})`)
    }

    const ordemId = saida.ordemId
    const antes = snapshotSaida(saida)

    const resultado = await prisma.$transaction(async (tx) => {
      // Fecha a saída pelo desfecho.
      const saidaAtualizada = await tx.saida.update({
        where: { id },
        data: {
          status: dados.status,
          fotos: dados.status === 'CONCLUIDA' ? (dados.fotos ?? null) : null,
          anotacoes: dados.anotacoes ?? saida.anotacoes,
          recebidoEm: new Date(),
        },
      })
      await registrarEvento(
        {
          entidade: 'SAIDA',
          entidadeId: id,
          acao: 'MUDANCA_STATUS',
          autorId,
          antes,
          depois: snapshotSaida(saidaAtualizada),
          descricao: `OS ${saida.ordem.sequencial}: saída ${saida.tipo} recebida como ${dados.status}`,
        },
        tx,
      )

      // Regularização de foto: saída FOTO concluída COM_FOTOS fecha a pendência
      // marcando a(s) saída(s) CAMPO concluída(s) SEM_FOTOS como COM_FOTOS.
      if (saida.tipo === 'FOTO' && dados.status === 'CONCLUIDA' && dados.fotos === 'COM_FOTOS') {
        const pendentes = await tx.saida.findMany({
          where: { ordemId, tipo: 'CAMPO', status: 'CONCLUIDA', fotos: 'SEM_FOTOS' },
        })
        for (const p of pendentes) {
          const pAtualizada = await tx.saida.update({
            where: { id: p.id },
            data: { fotos: 'COM_FOTOS' },
          })
          await registrarEvento(
            {
              entidade: 'SAIDA',
              entidadeId: p.id,
              acao: 'ATUALIZACAO',
              autorId,
              antes: snapshotSaida(p),
              depois: snapshotSaida(pAtualizada),
              descricao: `OS ${saida.ordem.sequencial}: foto regularizada (saída #${p.id})`,
            },
            tx,
          )
        }
      }

      // Recalcula o status DERIVADO da OS a partir de todas as saídas.
      const todas = await tx.saida.findMany({ where: { ordemId } })
      const novoStatus = derivarStatusOS(todas)
      const osAtual = saida.ordem
      const updateOS: Record<string, unknown> = {}
      if (novoStatus !== osAtual.status) updateOS.status = novoStatus
      if (novoStatus === 'CONCLUIDA' && !osAtual.concluidoEm) updateOS.concluidoEm = new Date()
      if (novoStatus !== 'CONCLUIDA' && osAtual.concluidoEm) updateOS.concluidoEm = null
      if (Object.keys(updateOS).length > 0) {
        const antesOS = { status: osAtual.status, concluidoEm: osAtual.concluidoEm }
        const osNova = await tx.ordemServico.update({ where: { id: ordemId }, data: updateOS })
        await registrarEvento(
          {
            entidade: 'OS',
            entidadeId: ordemId,
            acao: 'MUDANCA_STATUS',
            autorId,
            antes: antesOS,
            depois: { status: osNova.status, concluidoEm: osNova.concluidoEm },
            descricao: `OS ${osAtual.sequencial}: status derivado → ${novoStatus}`,
          },
          tx,
        )
      }

      return tx.ordemServico.findUnique({ where: { id: ordemId }, include: includeExpandida })
    })

    res.json(serializarOSExpandida(resultado!))
  } catch (e) {
    next(e)
  }
})
