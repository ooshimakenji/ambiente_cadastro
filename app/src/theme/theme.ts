import { createTheme } from '@mui/material/styles'
import { m3Light, m3Dark, shape } from './tokens'

// COPIADO de dashboard_servicos (manter idêntico p/ futura unificação).
// Breakpoints = window size classes MD3 (ver DESIGN_GUIDE.md §3):
// xs <600 compact · sm 600–839 medium · md 840–1199 expanded
// lg 1200–1599 large · xl ≥1600 extra-large
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data' },
  breakpoints: {
    values: { xs: 0, sm: 600, md: 840, lg: 1200, xl: 1600 },
  },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: m3Light.primary, contrastText: m3Light.onPrimary },
        secondary: { main: m3Light.secondary, contrastText: m3Light.onSecondary },
        error: { main: m3Light.error, contrastText: m3Light.onError },
        success: { main: m3Light.success },
        warning: { main: m3Light.warning },
        background: { default: m3Light.surface, paper: m3Light.surfaceContainerLow },
        text: { primary: m3Light.onSurface, secondary: m3Light.onSurfaceVariant },
        divider: m3Light.outlineVariant,
      },
    },
    dark: {
      palette: {
        primary: { main: m3Dark.primary, contrastText: m3Dark.onPrimary },
        secondary: { main: m3Dark.secondary, contrastText: m3Dark.onSecondary },
        error: { main: m3Dark.error, contrastText: m3Dark.onError },
        success: { main: m3Dark.success },
        warning: { main: m3Dark.warning },
        background: { default: m3Dark.surface, paper: m3Dark.surfaceContainerLow },
        text: { primary: m3Dark.onSurface, secondary: m3Dark.onSurfaceVariant },
        divider: m3Dark.outlineVariant,
      },
    },
  },
  typography: {
    fontFamily: "'Roboto', system-ui, sans-serif",
    h1: { fontSize: 22, lineHeight: '28px', fontWeight: 400 }, // title-large (h1 da top bar)
    h2: { fontSize: 16, lineHeight: '24px', fontWeight: 500, letterSpacing: '.15px' }, // title-medium
    body1: { fontSize: 16, lineHeight: '24px', letterSpacing: '.5px' },
    body2: { fontSize: 14, lineHeight: '20px', letterSpacing: '.25px' },
    button: { fontSize: 14, fontWeight: 500, letterSpacing: '.1px', textTransform: 'none' },
    caption: { fontSize: 12, lineHeight: '16px', letterSpacing: '.4px' },
  },
  shape: { borderRadius: shape.medium },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: shape.full, height: 40 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
})
