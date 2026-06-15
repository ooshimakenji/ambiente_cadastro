import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import { theme } from './theme/theme'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* modeStorageKey 'theme': mesma chave do dashboard_servicos — preferência migra sozinha */}
    <ThemeProvider theme={theme} defaultMode="light" modeStorageKey="theme">
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
