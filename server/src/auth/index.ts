// Barrel do módulo de auth.
export { authRouter } from './router.js'
export { hashSenha, verificarSenha } from './senha.js'
export { gerarToken, verificarToken } from './jwt.js'
export type { TokenPayload, Papel } from './jwt.js'
export { serializarUsuario } from './serializar.js'
export type { UsuarioPublico } from './serializar.js'
