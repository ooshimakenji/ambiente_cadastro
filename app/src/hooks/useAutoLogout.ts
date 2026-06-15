import { useEffect, useRef } from 'react'

// =====================================================================
// useAutoLogout — reinicia timer de inatividade em eventos do usuário.
// Ao expirar, chama onTimeout (geralmente logout()).
// ADMINs são isentos: o hook não inicia listeners nem timer para eles.
// =====================================================================

const EVENTOS: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll']

export function useAutoLogout(timeoutMs: number, onTimeout: () => void, isAdmin: boolean = false): void {
  // Ref para sempre acessar a versão mais recente do callback sem recriar efeitos
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  useEffect(() => {
    // Se o usuário é ADMIN, não arma listeners nem timer
    if (isAdmin) {
      return
    }

    let timerId: ReturnType<typeof setTimeout>

    const reiniciar = () => {
      clearTimeout(timerId)
      timerId = setTimeout(() => onTimeoutRef.current(), timeoutMs)
    }

    // Inicia o timer imediatamente
    reiniciar()

    // Adiciona listeners com passive onde aplicável
    const opcoesPassive = { passive: true } as const
    const opcoesNormal = {} as const

    EVENTOS.forEach((evento) => {
      const opcoes = evento === 'scroll' || evento === 'mousemove' ? opcoesPassive : opcoesNormal
      window.addEventListener(evento, reiniciar, opcoes)
    })

    return () => {
      clearTimeout(timerId)
      EVENTOS.forEach((evento) => {
        window.removeEventListener(evento, reiniciar)
      })
    }
  }, [timeoutMs, isAdmin]) // recria se o timeout ou status de admin mudar
}
