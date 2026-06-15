// =====================================================================
// Serialização de Usuario para o cliente (DTO público).
// Remove senhaHash e converte datas para ISO string (espelha o tipo
// `Usuario` de app/src/lib/types.ts). Reutilizável na Fase 3.
// =====================================================================
import type { Usuario as UsuarioPrisma } from '@prisma/client'
import type { Papel } from './jwt.js'

export interface UsuarioPublico {
  id: number
  nome: string
  login: string
  papel: Papel
  ativo: boolean
  equipeId: number | null
  criadoEm: string // ISO
}

export function serializarUsuario(u: UsuarioPrisma): UsuarioPublico {
  return {
    id: u.id,
    nome: u.nome,
    login: u.login,
    papel: (u.papel === 'ADMIN' ? 'ADMIN' : 'SUPERVISOR') as Papel,
    ativo: u.ativo,
    equipeId: u.equipeId,
    criadoEm: u.criadoEm.toISOString(),
  }
}
