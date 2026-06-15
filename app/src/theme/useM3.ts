import { useColorScheme } from '@mui/material/styles'
import { m3Light, m3Dark, elevation, type M3Scheme } from './tokens'

// COPIADO de dashboard_servicos (manter idêntico p/ futura unificação).
// Tokens M3 do modo atual (roles "container" que o palette do MUI não tem)
export function useM3(): { m3: M3Scheme; elev: string[] } {
  const { mode, systemMode } = useColorScheme()
  const dark = (mode === 'system' ? systemMode : mode) === 'dark'
  return {
    m3: dark ? m3Dark : m3Light,
    elev: dark ? elevation.dark : elevation.light,
  }
}
