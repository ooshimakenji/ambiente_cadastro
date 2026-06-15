import { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'
import Switch from '@mui/material/Switch'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import { useM3 } from '../theme/useM3'
import { shape } from '../theme/tokens'
import { api, ApiError } from '../lib/api'
import { useToast } from '../components/Toast'
import { PAPEIS, TELAS, PAPEL_LABELS, TELA_LABELS } from '../lib/types'
import type { PermissaoPapel, Papel, Tela } from '../lib/types'

// -----------------------------------------------------------------------
// Permissões — matriz papel × tela (ADMIN configura quem vê o quê).
// ADMIN sempre vê tudo (não entra na matriz). Telas usuarios/permissoes
// também são sempre ADMIN-only e não aparecem aqui.
// -----------------------------------------------------------------------

// Papéis configuráveis (ADMIN fora da matriz).
const PAPEIS_CONFIG = PAPEIS.filter((p): p is Exclude<Papel, 'ADMIN'> => p !== 'ADMIN')

const chave = (papel: string, tela: string) => `${papel}|${tela}`

export default function Permissoes() {
  const { m3, elev } = useM3()
  const toast = useToast()

  const [mapa, setMapa] = useState<Record<string, boolean>>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const linhas = await api.get<PermissaoPapel[]>('/permissoes')
      const m: Record<string, boolean> = {}
      for (const l of linhas) m[chave(l.papel, l.tela)] = l.permitido
      setMapa(m)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erro ao carregar permissões')
    } finally {
      setCarregando(false)
    }
  }, [toast])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function alternar(papel: Papel, tela: Tela, permitido: boolean) {
    const k = chave(papel, tela)
    setSalvando(k)
    // Otimista
    setMapa((prev) => ({ ...prev, [k]: permitido }))
    try {
      await api.patch('/permissoes', { papel, tela, permitido })
    } catch (e) {
      // Reverte em falha
      setMapa((prev) => ({ ...prev, [k]: !permitido }))
      toast(e instanceof ApiError ? e.message : 'Erro ao salvar permissão')
    } finally {
      setSalvando(null)
    }
  }

  return (
    <Box>
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <AdminPanelSettingsOutlinedIcon sx={{ color: m3.primary, fontSize: 28 }} />
        <Box>
          <Typography variant="h1" sx={{ fontSize: 22, fontWeight: 500 }}>
            Permissões
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Quais telas cada papel pode acessar
          </Typography>
        </Box>
      </Box>

      <Alert
        severity="info"
        sx={{
          mb: 3,
          maxWidth: 760,
          borderRadius: `${shape.medium}px`,
          bgcolor: m3.primaryContainer,
          color: m3.onPrimaryContainer,
          '& .MuiAlert-icon': { color: m3.primary },
        }}
      >
        O ADMIN sempre vê tudo. A edição de Equipes, Tipos e Usuários é exclusiva do ADMIN — o Histórico é
        somente leitura. As mudanças valem após o usuário entrar de novo.
      </Alert>

      <Paper
        elevation={0}
        sx={{
          maxWidth: 760,
          bgcolor: m3.surfaceContainerLow,
          borderRadius: `${shape.large}px`,
          boxShadow: elev[1],
          overflow: 'hidden',
        }}
      >
        {carregando ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={32} sx={{ color: m3.primary }} />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    '& .MuiTableCell-head': {
                      bgcolor: m3.surfaceContainer,
                      color: m3.onSurfaceVariant,
                      fontWeight: 600,
                      fontSize: 13,
                      letterSpacing: '.4px',
                      borderBottom: `1px solid ${m3.outlineVariant}`,
                    },
                  }}
                >
                  <TableCell>Tela</TableCell>
                  {PAPEIS_CONFIG.map((p) => (
                    <TableCell key={p} align="center">
                      {PAPEL_LABELS[p]}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {TELAS.map((tela) => (
                  <TableRow
                    key={tela}
                    sx={{
                      '& .MuiTableCell-root': {
                        borderBottom: `1px solid ${m3.outlineVariant}`,
                        fontSize: 14,
                      },
                      '&:last-child .MuiTableCell-root': { borderBottom: 'none' },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>{TELA_LABELS[tela]}</TableCell>
                    {PAPEIS_CONFIG.map((papel) => {
                      const k = chave(papel, tela)
                      return (
                        <TableCell key={papel} align="center">
                          <Switch
                            checked={mapa[k] ?? false}
                            disabled={salvando === k}
                            onChange={(e) => alternar(papel, tela, e.target.checked)}
                          />
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  )
}
