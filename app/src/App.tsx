import { useState } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useAutoLogout } from './hooks/useAutoLogout'
import { ToastProvider } from './components/Toast'
import AppShell from './components/AppShell'
import Login from './views/Login'

// Importações das views (escritas por outros agentes em paralelo — não criar aqui)
import CadastrarOS from './views/CadastrarOS'
import ReceberOS from './views/ReceberOS'
import FolhasCasa from './views/FolhasCasa'
import OrdensServico from './views/OrdensServico'
import Equipes from './views/Equipes'
import Usuarios from './views/Usuarios'
import TiposServico from './views/TiposServico'
import Historico from './views/Historico'
import Permissoes from './views/Permissoes'
import type { Tela } from './lib/types'

// =====================================================================
// Tipo de navegação — espelha o NavView do AppShell
// =====================================================================
type NavView =
  | 'cadastrar'
  | 'receber'
  | 'folhas'
  | 'ordens'
  | 'equipes'
  | 'usuarios'
  | 'tipos'
  | 'historico'
  | 'permissoes'

// Views só de ADMIN (fora da matriz de permissões por tela).
const VIEWS_ADMIN: NavView[] = ['usuarios', 'permissoes']

// =====================================================================
// Conteúdo interno — consome useAuth() e controla navegação
// =====================================================================
function AppContent() {
  const { usuario, permissoes, carregando, logout } = useAuth()
  const [view, setView] = useState<NavView>('cadastrar')

  // Auto-logout por inatividade (alinhado à expiração do JWT ~15 min)
  useAutoLogout(15 * 60 * 1000, logout, usuario?.papel === 'ADMIN')

  // Spinner enquanto rehidrata sessão
  if (carregando) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  // Sem usuário: exibe tela de login
  if (!usuario) {
    return <Login />
  }

  // RBAC: pode acessar a view? ADMIN tudo; views admin-only = só ADMIN;
  // demais views são gated pela matriz de permissões (telas).
  const podeAcessar = (v: NavView): boolean => {
    if (usuario.papel === 'ADMIN') return true
    if (VIEWS_ADMIN.includes(v)) return false
    return permissoes.includes(v as Tela)
  }

  // Fallback = 1ª view que o usuário pode acessar (cadastrar se possível).
  const fallbackView: NavView = podeAcessar('cadastrar')
    ? 'cadastrar'
    : (permissoes[0] as NavView | undefined) ?? 'cadastrar'

  const viewEfetiva: NavView = podeAcessar(view) ? view : fallbackView

  const handleNavigate = (proxima: NavView) => {
    setView(podeAcessar(proxima) ? proxima : fallbackView)
  }

  // Mapeamento view → componente
  const renderView = () => {
    switch (viewEfetiva) {
      case 'cadastrar':
        return <CadastrarOS />
      case 'receber':
        return <ReceberOS />
      case 'folhas':
        return <FolhasCasa />
      case 'ordens':
        return <OrdensServico />
      case 'equipes':
        return <Equipes />
      case 'usuarios':
        return <Usuarios />
      case 'tipos':
        return <TiposServico />
      case 'historico':
        return <Historico />
      case 'permissoes':
        return <Permissoes />
      default:
        return <CadastrarOS />
    }
  }

  return (
    <AppShell
      view={viewEfetiva}
      onNavigate={handleNavigate}
      usuario={usuario}
      permissoes={permissoes}
      onLogout={logout}
    >
      {renderView()}
    </AppShell>
  )
}

// =====================================================================
// Raiz do app — providers em camadas
// =====================================================================
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  )
}
