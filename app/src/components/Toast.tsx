import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import Snackbar from '@mui/material/Snackbar'
import { useM3 } from '../theme/useM3'

// COPIADO de dashboard_servicos (manter idêntico p/ futura unificação).
// Snackbar M3 (inverse-surface) — paridade com showToast do vanilla
const ToastCtx = createContext<(msg: string) => void>(() => {})

export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const { m3, elev } = useM3()
  const showToast = useCallback((m: string) => setMsg(m), [])

  return (
    <ToastCtx.Provider value={showToast}>
      {children}
      <Snackbar
        open={msg !== null}
        autoHideDuration={3000}
        onClose={() => setMsg(null)}
        message={msg ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          content: {
            sx: {
              bgcolor: m3.inverseSurface,
              color: m3.inverseOnSurface,
              boxShadow: elev[3],
              borderRadius: 1,
            },
          },
        }}
      />
    </ToastCtx.Provider>
  )
}
