// =====================================================================
// Bootstrap Express — dashboard_cadastro server.
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
import cors from 'cors'

import { authRouter } from './auth/index.js'
import { requireAuth, requireAdmin, errorHandler, notFoundHandler } from './middleware/index.js'
import { usuariosRouter } from './routes/usuarios.js'
import { equipesRouter } from './routes/equipes.js'
import { tiposServicoRouter } from './routes/tiposServico.js'
import { ordensRouter } from './routes/ordens.js'
import { eventosRouter } from './routes/eventos.js'
import { dashboardRouter } from './routes/dashboard.js'
import { integracaoRouter } from './routes/integracao/exportServicos.js'

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

// Fase 3: routers protegidos por requireAuth
// /usuarios exige adicionalmente requireAdmin (gestão de usuários restrita a ADMIN)
app.use('/usuarios', requireAuth, requireAdmin, usuariosRouter)
app.use('/equipes', requireAuth, equipesRouter)
app.use('/tipos', requireAuth, tiposServicoRouter)
app.use('/ordens', requireAuth, ordensRouter)
app.use('/eventos', requireAuth, eventosRouter)
app.use('/dashboard', requireAuth, dashboardRouter)
app.use('/integracao', requireAuth, integracaoRouter)

// 404 para rotas não registradas.
app.use(notFoundHandler)

// errorHandler central — SEMPRE por último.
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`API ouvindo em http://localhost:${PORT}`)
})
