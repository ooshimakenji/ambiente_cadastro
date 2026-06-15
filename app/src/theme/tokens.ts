// Tokens Material Design 3 — espelham 1:1 os --md-sys-* do app vanilla
// (ver DESIGN_GUIDE.md). Seed: #0B57D0.
// Roles "container" não existem no palette padrão do MUI; ficam aqui e são
// consumidos via useM3() conforme o modo atual.
// COPIADO de dashboard_servicos (acoplamento solto — manter idêntico p/ futura unificação).

export interface M3Scheme {
  primary: string
  onPrimary: string
  primaryContainer: string
  onPrimaryContainer: string
  secondary: string
  onSecondary: string
  secondaryContainer: string
  onSecondaryContainer: string
  tertiary: string
  onTertiary: string
  tertiaryContainer: string
  onTertiaryContainer: string
  error: string
  onError: string
  errorContainer: string
  onErrorContainer: string
  surface: string
  onSurface: string
  onSurfaceVariant: string
  surfaceContainerLowest: string
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  outline: string
  outlineVariant: string
  inverseSurface: string
  inverseOnSurface: string
  inversePrimary: string
  scrim: string
  success: string
  successContainer: string
  onSuccessContainer: string
  warning: string
  warningContainer: string
  onWarningContainer: string
}

export const m3Light: M3Scheme = {
  primary: '#0B57D0',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D8E2FF',
  onPrimaryContainer: '#001A41',
  secondary: '#575E71',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#DBE2F9',
  onSecondaryContainer: '#141B2C',
  tertiary: '#715573',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FBD7FC',
  onTertiaryContainer: '#29132D',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  surface: '#F9F9FF',
  onSurface: '#1A1B20',
  onSurfaceVariant: '#44474F',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F3F3FA',
  surfaceContainer: '#EDEDF4',
  surfaceContainerHigh: '#E7E8EE',
  surfaceContainerHighest: '#E2E2E9',
  outline: '#74777F',
  outlineVariant: '#C4C6D0',
  inverseSurface: '#2F3036',
  inverseOnSurface: '#F0F0F7',
  inversePrimary: '#ADC6FF',
  scrim: '#000000',
  success: '#146C2E',
  successContainer: '#C2EFC9',
  onSuccessContainer: '#03210C',
  warning: '#7A5900',
  warningContainer: '#FFDF9E',
  onWarningContainer: '#261A00',
}

export const m3Dark: M3Scheme = {
  primary: '#ADC6FF',
  onPrimary: '#002E69',
  primaryContainer: '#004494',
  onPrimaryContainer: '#D8E2FF',
  secondary: '#BFC6DC',
  onSecondary: '#293041',
  secondaryContainer: '#3F4759',
  onSecondaryContainer: '#DBE2F9',
  tertiary: '#DEBCDF',
  onTertiary: '#402843',
  tertiaryContainer: '#583E5B',
  onTertiaryContainer: '#FBD7FC',
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
  surface: '#111318',
  onSurface: '#E2E2E9',
  onSurfaceVariant: '#C4C6D0',
  surfaceContainerLowest: '#0C0E13',
  surfaceContainerLow: '#191C20',
  surfaceContainer: '#1D2024',
  surfaceContainerHigh: '#282A2F',
  surfaceContainerHighest: '#33353A',
  outline: '#8E9099',
  outlineVariant: '#44474F',
  inverseSurface: '#E2E2E9',
  inverseOnSurface: '#2F3036',
  inversePrimary: '#0B57D0',
  scrim: '#000000',
  success: '#92D89E',
  successContainer: '#0A5222',
  onSuccessContainer: '#C2EFC9',
  warning: '#F1C147',
  warningContainer: '#5C4300',
  onWarningContainer: '#FFDF9E',
}

// Shape scale M3 (px)
export const shape = {
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 9999,
}

// Elevações M3 (níveis 1–3)
export const elevation = {
  light: [
    'none',
    '0 1px 2px rgba(0,0,0,.30), 0 1px 3px 1px rgba(0,0,0,.15)',
    '0 1px 2px rgba(0,0,0,.30), 0 2px 6px 2px rgba(0,0,0,.15)',
    '0 1px 3px rgba(0,0,0,.30), 0 4px 8px 3px rgba(0,0,0,.15)',
  ],
  dark: [
    'none',
    '0 1px 2px rgba(0,0,0,.45), 0 1px 3px 1px rgba(0,0,0,.30)',
    '0 1px 2px rgba(0,0,0,.45), 0 2px 6px 2px rgba(0,0,0,.30)',
    '0 1px 3px rgba(0,0,0,.45), 0 4px 8px 3px rgba(0,0,0,.30)',
  ],
}

// Larguras da navegação (window size classes MD3)
export const nav = {
  drawerWidth: 280,
  railWidth: 80,
  topbarHeight: 64,
}
