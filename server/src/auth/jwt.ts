// =====================================================================
// Geração e verificação de JWT (jsonwebtoken).
// Expira via JWT_EXPIRES_IN (~15min, alinhado ao auto-logout do frontend).
// =====================================================================
import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'

export type Papel = 'ADMIN' | 'SUPERVISOR'

// Payload do token (não inclui dados sensíveis como senhaHash).
export interface TokenPayload {
  id: number
  login: string
  nome: string
  papel: Papel
}

// Segurança: NÃO usar fallback de segredo. Se JWT_SECRET não estiver no .env,
// falha imediatamente no boot (evita assinar tokens com segredo previsível).
const JWT_SECRET_ENV = process.env.JWT_SECRET
if (!JWT_SECRET_ENV || JWT_SECRET_ENV.length < 16) {
  throw new Error(
    'JWT_SECRET ausente ou muito curto (mín. 16 chars). Defina-o no server/.env antes de iniciar.',
  )
}
// Constante já estreitada para `string` (o guard acima garante presença).
const JWT_SECRET: string = JWT_SECRET_ENV
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m'

export function gerarToken(payload: TokenPayload): string {
  const opts: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] }
  return jwt.sign(payload, JWT_SECRET, opts)
}

/**
 * Verifica o token e retorna o payload tipado, ou null se inválido/expirado.
 */
export function verificarToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (typeof decoded === 'string') return null
    const { id, login, nome, papel } = decoded as Record<string, unknown>
    if (
      typeof id === 'number' &&
      typeof login === 'string' &&
      typeof nome === 'string' &&
      (papel === 'ADMIN' || papel === 'SUPERVISOR')
    ) {
      return { id, login, nome, papel }
    }
    return null
  } catch {
    return null
  }
}
