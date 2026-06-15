// Barrel do módulo de middlewares.
export { requireAuth, requireAdmin } from './auth.js'
export { errorHandler, notFoundHandler } from './errorHandler.js'
export {
  HttpError,
  erro400,
  erro401,
  erro403,
  erro404,
  erro409,
} from './httpError.js'
