// =====================================================================
// Bootstrap Express — ambiental_cadastro server.
// Fase 3 (este arquivo): routers CRUD + integração montados.
// As variáveis de ambiente vêm do .env, carregado via `node --env-file`
// (configurado nos scripts dev/start/seed do package.json — sem dependência
// de runtime do pacote `dotenv`).
//
// Migração futura a Postgres: nada aqui muda (apenas DATABASE_URL/provider).
// =====================================================================
// A augmentation de Express.Request (req.usuario) está em src/types/express.d.ts
// e é aplicada automaticamente pelo tsc (include: ["src"]).
import express from 'express'
import type { RequestHandler } from 'express'
import cors from 'cors'

import { authRouter } from './auth/index.js'
import {
  requireAuth,
  requireAdmin,
  requirePermissao,
  errorHandler,
  notFoundHandler,
} from './middleware/index.js'
import { usuariosRouter } from './routes/usuarios.js'
import { equipesRouter } from './routes/equipes.js'
import { tiposServicoRouter } from './routes/tiposServico.js'
import { ordensRouter } from './routes/ordens.js'
import { saidasRouter } from './routes/saidas.js'
import { folhasRouter } from './routes/folhas.js'
import { eventosRouter } from './routes/eventos.js'
import { permissoesRouter } from './routes/permissoes.js'
import { integracaoRouter } from './routes/integracao/exportServicos.js'

// Escrita (POST/PATCH/DELETE) restrita a ADMIN; leitura (GET) liberada a autenticados.
// Usado em /equipes e /tipos: todos veem os dropdowns, só ADMIN gerencia.
const adminParaEscrita: RequestHandler = (req, res, next) =>
  req.method === 'GET' ? next() : requireAdmin(req, res, next)

const app = express()
const PORT = Number(process.env.PORT ?? 3001)
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173'

app.use(cors({ origin: CORS_ORIGIN }))
app.use(express.json())

// Health check (mantido).
app.get('/health', (_req, res) => {
  res.json({ ok: true, servico: 'dashboard-cadastro-server' })
})

// ---------- Rotas ----------
app.use('/auth', authRouter)

// RBAC: requireAuth em tudo; gestão (usuarios/permissoes) e escrita de cadastros = ADMIN;
// telas operacionais (folhas/eventos) e ações (ordens POST / saidas receber) por permissão.
app.use('/usuarios', requireAuth, requireAdmin, usuariosRouter)
app.use('/permissoes', requireAuth, requireAdmin, permissoesRouter)
app.use('/equipes', requireAuth, adminParaEscrita, equipesRouter)
app.use('/tipos', requireAuth, adminParaEscrita, tiposServicoRouter)
// /ordens: GET liberado a autenticados (lookup do Cadastrar/Receber);
// POST / e POST /:id/saida-foto têm guard por permissão DENTRO do router.
app.use('/ordens', requireAuth, ordensRouter)
app.use('/saidas', requireAuth, requirePermissao('receber'), saidasRouter)
app.use('/folhas', requireAuth, requirePermissao('folhas'), folhasRouter)
app.use('/eventos', requireAuth, requirePermissao('historico'), eventosRouter)
app.use('/integracao', requireAuth, integracaoRouter)

// 404 para rotas não registradas.
app.use(notFoundHandler)

// errorHandler central — SEMPRE por último.
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`API ouvindo em http://localhost:${PORT}`)
})
