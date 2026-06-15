import { useState, type ReactNode } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import useMediaQuery from '@mui/material/useMediaQuery'
import useScrollTrigger from '@mui/material/useScrollTrigger'
import { useTheme, useColorScheme } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined'
import DownloadDoneOutlinedIcon from '@mui/icons-material/DownloadDoneOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { useM3 } from '../theme/useM3'
import { nav, shape } from '../theme/tokens'
import type { Usuario } from '../lib/types'

type NavView = 'cadastrar' | 'receber' | 'ordens' | 'equipes' | 'usuarios' | 'tipos' | 'historico'

interface AppShellProps {
  view: NavView
  onNavigate: (view: NavView) => void
  usuario: Usuario
  onLogout: () => void
  children: ReactNode
}

export default function AppShell({ view, onNavigate, usuario, onLogout, children }: AppShellProps) {
  const theme = useTheme()
  const { m3, elev } = useM3()
  const { mode, setMode } = useColorScheme()
  const isRail = useMediaQuery(theme.breakpoints.between('md', 'lg'))
  const isPermanent = useMediaQuery(theme.breakpoints.up('lg'))
  const showName = useMediaQuery(theme.breakpoints.up('md'))
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 4 })
  const [drawerAberto, setDrawerAberto] = useState(false)

  const navWidth = isPermanent ? nav.drawerWidth : isRail ? nav.railWidth : 0
  const dark = mode === 'dark'

  const toggleTema = () => {
    setMode(dark ? 'light' : 'dark')
  }

  const itemSx = (ativo: boolean) => ({
    height: isRail ? 64 : 56,
    width: isRail ? 64 : 'auto',
    mx: isRail ? 'auto' : 0,
    px: isRail ? 0 : 2,
    borderRadius: isRail ? `${shape.large}px` : `${shape.full}px`,
    flexDirection: isRail ? 'column' : 'row',
    justifyContent: isRail ? 'center' : 'flex-start',
    gap: isRail ? 0.5 : 1.5,
    color: ativo ? m3.onSecondaryContainer : m3.onSurfaceVariant,
    bgcolor: ativo ? m3.secondaryContainer : 'transparent',
    '&:hover': { bgcolor: ativo ? m3.secondaryContainer : undefined },
  })

  const navItems: Array<{ view: NavView; label: string; icon: React.ElementType }> = [
    { view: 'cadastrar', label: 'Cadastrar OS', icon: AddCircleOutlineIcon },
    { view: 'receber', label: 'Receber OS', icon: DownloadDoneOutlinedIcon },
    { view: 'ordens', label: 'Ordens de Serviço', icon: AssignmentOutlinedIcon },
    { view: 'equipes', label: 'Equipes', icon: GroupOutlinedIcon },
    ...(usuario.papel === 'ADMIN' ? [{ view: 'usuarios' as const, label: 'Usuários', icon: PersonOutlinedIcon }] : []),
    { view: 'tipos', label: 'Tipos de serviço', icon: CategoryOutlinedIcon },
    { view: 'historico', label: 'Histórico', icon: HistoryOutlinedIcon },
  ]

  const conteudoDrawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: isRail ? 0.5 : 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, justifyContent: isRail ? 'center' : 'flex-start' }}>
        <Avatar variant="rounded" sx={{ bgcolor: m3.primaryContainer, color: m3.onPrimaryContainer }}>
          <AssignmentOutlinedIcon />
        </Avatar>
        {!isRail && (
          <Box>
            <Typography sx={{ fontWeight: 500, fontSize: 16 }}>Cadastro</Typography>
            <Typography variant="caption" color="text.secondary">
              Ordens de Serviço
            </Typography>
          </Box>
        )}
      </Box>

      <List sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <ListItemButton
              key={item.view}
              onClick={() => {
                onNavigate(item.view)
                setDrawerAberto(false)
              }}
              aria-current={view === item.view ? 'page' : undefined}
              sx={itemSx(view === item.view)}
            >
              <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>
                <Icon />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{ primary: { sx: { fontSize: isRail ? 10 : 14, fontWeight: 500 } } }}
                sx={{ my: 0, ...(isRail && { textAlign: 'center', flex: 'none' }) }}
              />
            </ListItemButton>
          )
        })}
      </List>

      <Divider sx={{ my: 1 }} />

      <Box sx={{ mt: 'auto' }}>
        {!isRail && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 2 }}>
            {usuario.nome}
          </Typography>
        )}
      </Box>
    </Box>
  )

  const initials = usuario.nome
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Drawer
        variant={navWidth ? 'permanent' : 'temporary'}
        open={navWidth ? true : drawerAberto}
        onClose={() => setDrawerAberto(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: navWidth || nav.drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: navWidth || nav.drawerWidth,
            border: 'none',
            bgcolor: m3.surfaceContainerLow,
            borderRadius: `0 ${shape.large}px ${shape.large}px 0`,
            ...(navWidth === 0 && { boxShadow: elev[3] }),
          },
          ...(navWidth === 0 && { width: 0 }),
        }}
      >
        {conteudoDrawer}
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            left: navWidth,
            width: `calc(100% - ${navWidth}px)`,
            height: nav.topbarHeight,
            justifyContent: 'center',
            bgcolor: scrolled ? m3.surfaceContainer : m3.surface,
            color: 'text.primary',
            boxShadow: scrolled ? elev[2] : 'none',
            transition: 'background-color .2s ease, box-shadow .2s ease',
          }}
        >
          <Toolbar sx={{ gap: 1 }}>
            {navWidth === 0 && (
              <IconButton
                aria-label="Abrir menu de navegação"
                aria-expanded={drawerAberto}
                onClick={() => setDrawerAberto(true)}
                sx={{ color: 'text.secondary' }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h1" noWrap>
                Cadastro
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: '.5px' }}>
                Ordens de Serviço
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            <IconButton
              aria-label={dark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              onClick={toggleTema}
              sx={{ color: 'text.secondary' }}
            >
              {dark ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
            </IconButton>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                pl: 0.5,
                pr: showName ? 2 : 0.5,
                py: 0.5,
                ml: 1,
                borderRadius: `${shape.full}px`,
                bgcolor: m3.surfaceContainerHigh,
              }}
              aria-label={`Usuário: ${usuario.nome}`}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 13 }}>
                {initials}
              </Avatar>
              {showName && (
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2 }}>{usuario.nome}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {usuario.papel === 'ADMIN' ? 'Administrador' : 'Supervisor'}
                  </Typography>
                </Box>
              )}
            </Box>
            <IconButton
              aria-label="Sair"
              onClick={onLogout}
              sx={{ color: 'text.secondary' }}
            >
              <LogoutOutlinedIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: { xs: 1440, xl: 1840 },
            mx: 'auto',
            px: { xs: 2, sm: 3 },
            pt: `${nav.topbarHeight + 24}px`,
            pb: 12,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}
