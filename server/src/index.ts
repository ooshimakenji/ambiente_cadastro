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
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

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

// ---------- Frontend estático (produção) ----------
// Se o build do app existir (app/dist), o backend serve a SPA na MESMA porta
// (uma só porta na LAN). Em dev isso é ignorado (o Vite serve em :5173).
// __dirname (ESM) → server/dist (prod) ou server/src (dev tsx); em ambos
// ../../app/dist aponta para o build do frontend.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distApp = path.resolve(__dirname, '../../app/dist')
if (existsSync(distApp)) {
  app.use(express.static(distApp))
  // SPA fallback: qualquer GET não-API devolve o index.html (rotas do cliente).
  app.get('*', (_req, res) => res.sendFile(path.join(distApp, 'index.html')))
}

// 404 para rotas não registradas.
app.use(notFoundHandler)

// errorHandler central — SEMPRE por último.
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Servidor ouvindo na porta ${PORT}`)
  console.log(`  Local:  http://localhost:${PORT}`)
  console.log(`  Rede:   http://<IP-do-PC>:${PORT}  (acesso pela LAN)`)
  if (existsSync(distApp)) console.log('  Frontend: servido do app/dist (produção, porta única)')
})
