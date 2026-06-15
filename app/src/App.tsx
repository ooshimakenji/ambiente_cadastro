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

// =====================================================================
// Tipo de navegação — espelha o NavView do AppShell
// =====================================================================
type NavView = 'cadastrar' | 'receber' | 'folhas' | 'ordens' | 'equipes' | 'usuarios' | 'tipos' | 'historico'

// =====================================================================
// Conteúdo interno — consome useAuth() e controla navegação
// =====================================================================
function AppContent() {
  const { usuario, carregando, logout } = useAuth()
  const [view, setView] = useState<NavView>('cadastrar')

  // Auto-logout por inatividade (alinhado à expiração do JWT ~15 min)
  useAutoLogout(15 * 60 * 1000, logout)

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

  // Proteção de rota: ADMIN-only → fallback para cadastrar
  const viewEfetiva: NavView =
    view === 'usuarios' && usuario.papel !== 'ADMIN' ? 'cadastrar' : view

  const handleNavigate = (proxima: NavView) => {
    // Proteção de navegação: se a view destino for restrita, redireciona
    if (proxima === 'usuarios' && usuario.papel !== 'ADMIN') {
      setView('cadastrar')
      return
    }
    setView(proxima)
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
      default:
        return <CadastrarOS />
    }
  }

  return (
    <AppShell
      view={viewEfetiva}
      onNavigate={handleNavigate}
      usuario={usuario}
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
