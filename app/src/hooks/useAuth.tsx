import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api, setToken, setOnUnauthorized } from '../lib/api'
import type { Usuario, LoginResponse, Tela } from '../lib/types'

// =====================================================================
// Hook de autenticação — AuthProvider + useAuth
// Contrato travado: exportações e assinaturas NÃO devem ser alteradas.
// =====================================================================

interface AuthContextValue {
  usuario: Usuario | null
  token: string | null
  permissoes: Tela[]
  carregando: boolean
  erro: string | null
  login: (login: string, senha: string) => Promise<void>
  logout: () => void
}

const AuthCtx = createContext<AuthContextValue>({
  usuario: null,
  token: null,
  permissoes: [],
  carregando: true,
  erro: null,
  login: async () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [permissoes, setPermissoes] = useState<Tela[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Referência estável ao logout para registrar no setOnUnauthorized sem recriá-lo
  const logoutRef = useRef<() => void>(() => {})

  const logout = useCallback(() => {
    // best-effort: ignora falha
    api.post('/auth/logout').catch(() => {})

    setUsuario(null)
    setTokenState(null)
    setPermissoes([])
    setToken(null)
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('usuario')
    sessionStorage.removeItem('permissoes')
  }, [])

  // Mantém a ref sincronizada com a versão estável
  logoutRef.current = logout

  const login = useCallback(async (loginStr: string, senha: string) => {
    setErro(null)
    setCarregando(true)
    try {
      const resp = await api.post<LoginResponse>('/auth/login', { login: loginStr, senha })
      const perms = resp.permissoes ?? []
      setToken(resp.token)
      setTokenState(resp.token)
      setUsuario(resp.usuario)
      setPermissoes(perms)
      sessionStorage.setItem('token', resp.token)
      sessionStorage.setItem('usuario', JSON.stringify(resp.usuario))
      sessionStorage.setItem('permissoes', JSON.stringify(perms))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao autenticar'
      setErro(msg)
    } finally {
      setCarregando(false)
    }
  }, [])

  // Rehidratação na montagem + registro do handler de 401
  useEffect(() => {
    const tokenSalvo = sessionStorage.getItem('token')
    const usuarioSalvo = sessionStorage.getItem('usuario')
    const permsSalvas = sessionStorage.getItem('permissoes')

    if (tokenSalvo && usuarioSalvo) {
      try {
        const usuarioParsed: Usuario = JSON.parse(usuarioSalvo)
        setToken(tokenSalvo)
        setTokenState(tokenSalvo)
        setUsuario(usuarioParsed)
        if (permsSalvas) setPermissoes(JSON.parse(permsSalvas) as Tela[])
      } catch {
        // sessionStorage corrompida — limpa
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('usuario')
        sessionStorage.removeItem('permissoes')
      }
    }

    setCarregando(false)

    // Registra handler de 401 usando ref para evitar dependência no efeito
    setOnUnauthorized(() => logoutRef.current())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthCtx.Provider value={{ usuario, token, permissoes, carregando, erro, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth(): AuthContextValue {
  return useContext(AuthCtx)
}
