import { type FormEvent, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import { useM3 } from '../theme/useM3'
import { shape } from '../theme/tokens'
import { useAuth } from '../hooks/useAuth'

// =====================================================================
// Tela de login — MD3, centralizada, Enter submete.
// Lê 'erro' e 'carregando' de useAuth() sem re-lançar exceção.
// =====================================================================

export default function Login() {
  const { login, carregando, erro } = useAuth()
  const { m3, elev } = useM3()

  const [loginVal, setLoginVal] = useState('')
  const [senha, setSenha] = useState('')

  // Limpa erro visual se o usuário começar a digitar novamente
  const [erroLocal, setErroLocal] = useState<string | null>(null)

  useEffect(() => {
    setErroLocal(erro)
  }, [erro])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErroLocal(null)
    await login(loginVal, senha)
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 400,
          bgcolor: m3.surfaceContainerLow,
          borderRadius: `${shape.extraLarge}px`,
          boxShadow: elev[2],
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* Cabeçalho */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4, gap: 1.5 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 56,
                height: 56,
                bgcolor: m3.primaryContainer,
                color: m3.onPrimaryContainer,
                borderRadius: `${shape.large}px`,
              }}
            >
              <AssignmentOutlinedIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h1" sx={{ fontSize: 22, fontWeight: 500 }}>
                Cadastro de OS
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: '.5px' }}>
                Ordens de Serviço
              </Typography>
            </Box>
          </Box>

          {/* Formulário */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {erroLocal && (
              <Alert
                severity="error"
                sx={{
                  borderRadius: `${shape.medium}px`,
                  bgcolor: m3.errorContainer,
                  color: m3.onErrorContainer,
                  '& .MuiAlert-icon': { color: m3.onErrorContainer },
                }}
              >
                {erroLocal}
              </Alert>
            )}

            <TextField
              label="Login"
              type="text"
              value={loginVal}
              onChange={(e) => {
                setLoginVal(e.target.value)
                setErroLocal(null)
              }}
              autoComplete="username"
              autoFocus
              disabled={carregando}
              required
              fullWidth
              slotProps={{ htmlInput: { 'aria-label': 'Login do usuário' } }}
            />

            <TextField
              label="Senha"
              type="password"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value)
                setErroLocal(null)
              }}
              autoComplete="current-password"
              disabled={carregando}
              required
              fullWidth
              slotProps={{ htmlInput: { 'aria-label': 'Senha' } }}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={carregando || !loginVal || !senha}
              fullWidth
              size="large"
              sx={{
                mt: 1,
                borderRadius: `${shape.full}px`,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: 15,
                py: 1.25,
              }}
            >
              {carregando ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                'Entrar'
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
