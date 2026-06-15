// =====================================================================
// Augmentation de Express.Request — injeta o usuário autenticado pelo
// middleware requireAuth (a partir do JWT Bearer).
// O shape espelha o "payload" mínimo do token (não inclui senhaHash).
// =====================================================================

// Papéis espelham PAPEIS de app/src/lib/types.ts (monorepo: sem import cruzado).
type Papel = 'ADMIN' | 'SUPERVISOR'

export interface UsuarioAutenticado {
  id: number
  login: string
  nome: string
  papel: Papel
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado
    }
  }
}

export {}
