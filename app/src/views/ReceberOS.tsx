import { useCallback, useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import DownloadDoneOutlinedIcon from '@mui/icons-material/DownloadDoneOutlined'
import SearchIcon from '@mui/icons-material/Search'
import RefreshIcon from '@mui/icons-material/Refresh'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import NoPhotographyOutlinedIcon from '@mui/icons-material/NoPhotographyOutlined'
import { useM3 } from '../theme/useM3'
import { shape } from '../theme/tokens'
import { api, ApiError } from '../lib/api'
import { useToast } from '../components/Toast'
import { formatarData } from '../lib/format'
import type { OrdemServicoExpandida, FotosOS } from '../lib/types'

// -----------------------------------------------------------------------
// ReceberOS — Duas abas: Receber OS bipada e lista de Aguardando fotos
// -----------------------------------------------------------------------

export default function ReceberOS() {
  const { m3, elev } = useM3()
  const toast = useToast()

  const [aba, setAba] = useState(0)

  return (
    <Box>
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <DownloadDoneOutlinedIcon sx={{ color: m3.primary, fontSize: 28 }} />
        <Box>
          <Typography variant="h1" sx={{ fontSize: 22, fontWeight: 500 }}>
            Receber OS
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Finalize ordens de serviço concluídas em campo
          </Typography>
        </Box>
      </Box>

      {/* Abas */}
      <Tabs
        value={aba}
        onChange={(_, v) => setAba(v as number)}
        sx={{
          mb: 3,
          borderBottom: `1px solid ${m3.outlineVariant}`,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: 15,
            minWidth: 140,
          },
          '& .Mui-selected': { color: m3.primary },
          '& .MuiTabs-indicator': { bgcolor: m3.primary },
        }}
      >
        <Tab label="Receber" aria-label="Aba receber OS" />
        <Tab label="Aguardando fotos" aria-label="Aba lista aguardando fotos" />
      </Tabs>

      {aba === 0 && <AbaReceber m3={m3} elev={elev} toast={toast} />}
      {aba === 1 && <AbaAguardandoFotos m3={m3} elev={elev} />}
    </Box>
  )
}

// -----------------------------------------------------------------------
// AbaReceber
// -----------------------------------------------------------------------

type M3Scheme = ReturnType<typeof useM3>['m3']
type ElevList = ReturnType<typeof useM3>['elev']

interface AbaReceberProps {
  m3: M3Scheme
  elev: ElevList
  toast: (msg: string) => void
}

function AbaReceber({ m3, elev, toast }: AbaReceberProps) {
  const [sequencial, setSequencial] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [ordem, setOrdem] = useState<OrdemServicoExpandida | null>(null)
  const [avisoBusca, setAvisoBusca] = useState<string | null>(null)
  const [fotos, setFotos] = useState<FotosOS>('COM_FOTOS')
  const [finalizando, setFinalizando] = useState(false)

  const sequencialRef = useRef<HTMLInputElement>(null)

  // Refoca ao montar
  useEffect(() => {
    sequencialRef.current?.focus()
  }, [])

  const limpar = useCallback(() => {
    setSequencial('')
    setOrdem(null)
    setAvisoBusca(null)
    setFotos('COM_FOTOS')
    setTimeout(() => sequencialRef.current?.focus(), 50)
  }, [])

  async function buscarOS() {
    const seq = sequencial.trim()
    if (!seq) return

    setBuscando(true)
    setOrdem(null)
    setAvisoBusca(null)
    try {
      const lista = await api.get<OrdemServicoExpandida[]>(
        `/ordens?sequencial=${encodeURIComponent(seq)}`,
      )
      if (!lista || lista.length === 0) {
        setAvisoBusca('Nenhuma OS encontrada com este sequencial.')
        return
      }
      const os = lista[0]
      if (os.status !== 'ATENDENDO' && os.status !== 'PENDENTE') {
        const statusMsg: Record<string, string> = {
          CONCLUIDA: 'já foi Concluída',
          CANCELADA: 'está Cancelada',
        }
        setAvisoBusca(
          `Esta OS ${statusMsg[os.status] ?? `está com status ${os.status}`} e não pode ser recebida.`,
        )
        return
      }
      setOrdem(os)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao buscar OS'
      toast(msg)
    } finally {
      setBuscando(false)
    }
  }

  async function finalizar() {
    if (!ordem) return

    setFinalizando(true)
    try {
      await api.patch(`/ordens/${ordem.id}/receber`, { fotos })
      toast(`OS ${ordem.sequencial} finalizada com sucesso`)
      limpar()
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao finalizar OS'
      toast(msg)
    } finally {
      setFinalizando(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      buscarOS()
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        maxWidth: 680,
        bgcolor: m3.surfaceContainerLow,
        borderRadius: `${shape.large}px`,
        boxShadow: elev[1],
        p: { xs: 2.5, sm: 4 },
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      {/* Campo sequencial + botão buscar */}
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <TextField
          label="Sequencial *"
          placeholder="Bipe a ordem de serviço"
          value={sequencial}
          onChange={(e) => {
            setSequencial(e.target.value)
            // Limpa resultado anterior ao digitar
            if (ordem || avisoBusca) {
              setOrdem(null)
              setAvisoBusca(null)
            }
          }}
          onKeyDown={handleKeyDown}
          inputRef={sequencialRef}
          autoFocus
          fullWidth
          size="medium"
          disabled={buscando || finalizando}
          slotProps={{ htmlInput: { maxLength: 80, autoComplete: 'off' } }}
        />
        <Button
          variant="outlined"
          size="large"
          onClick={buscarOS}
          disabled={!sequencial.trim() || buscando || finalizando}
          aria-label="Buscar OS"
          sx={{
            minWidth: 56,
            height: 56,
            borderRadius: `${shape.medium}px`,
            borderColor: m3.outline,
            color: m3.primary,
            flexShrink: 0,
            '&:hover': { borderColor: m3.primary },
          }}
        >
          {buscando ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
        </Button>
      </Box>

      {/* Aviso de busca sem resultado / status inválido */}
      {avisoBusca && (
        <Alert
          severity="warning"
          sx={{
            borderRadius: `${shape.medium}px`,
            bgcolor: m3.warningContainer,
            color: m3.onWarningContainer,
            '& .MuiAlert-icon': { color: m3.warning },
          }}
        >
          {avisoBusca}
        </Alert>
      )}

      {/* Resumo da OS encontrada */}
      {ordem && (
        <>
          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography
              variant="subtitle2"
              sx={{
                color: m3.onSurfaceVariant,
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: '.8px',
                textTransform: 'uppercase',
              }}
            >
              OS encontrada
            </Typography>

            <Box
              sx={{
                bgcolor: m3.surfaceContainer,
                borderRadius: `${shape.medium}px`,
                p: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 1.5,
              }}
            >
              <Campo label="Sequencial" valor={ordem.sequencial} />
              <Campo
                label="Status"
                valor={
                  <Chip
                    size="small"
                    label={ordem.status === 'ATENDENDO' ? 'Atendendo' : 'Pendente'}
                    sx={{
                      fontWeight: 500,
                      height: 24,
                      bgcolor:
                        ordem.status === 'ATENDENDO' ? m3.primaryContainer : m3.warningContainer,
                      color:
                        ordem.status === 'ATENDENDO'
                          ? m3.onPrimaryContainer
                          : m3.onWarningContainer,
                    }}
                  />
                }
              />
              <Campo label="Tipo de serviço" valor={ordem.tipoServico?.nome ?? '—'} />
              <Campo label="Equipe" valor={ordem.equipe?.nome ?? '—'} />
              <Campo label="Responsável" valor={ordem.responsavel?.nome ?? '—'} />
              <Campo label="Criado em" valor={formatarData(ordem.criadoEm)} />
            </Box>
          </Box>

          {/* Toggle fotos */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: m3.onSurfaceVariant }}>
              Fotos da execução
            </Typography>
            <ToggleButtonGroup
              value={fotos}
              exclusive
              onChange={(_, v: FotosOS | null) => {
                if (v) setFotos(v)
              }}
              aria-label="Opção de fotos"
              size="large"
              fullWidth
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  borderColor: m3.outlineVariant,
                  color: m3.onSurfaceVariant,
                  gap: 1,
                  py: 1.5,
                },
                '& .Mui-selected': {
                  bgcolor: `${m3.primaryContainer} !important`,
                  color: `${m3.onPrimaryContainer} !important`,
                  borderColor: `${m3.primary} !important`,
                },
              }}
            >
              <ToggleButton value="COM_FOTOS" aria-label="Com fotos">
                <PhotoCameraOutlinedIcon fontSize="small" />
                Com fotos
              </ToggleButton>
              <ToggleButton value="SEM_FOTOS" aria-label="Sem fotos — equipe cobrada">
                <NoPhotographyOutlinedIcon fontSize="small" />
                Sem fotos — equipe cobrada
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Botão finalizar */}
          <Button
            variant="contained"
            fullWidth
            size="large"
            disabled={finalizando}
            onClick={finalizar}
            startIcon={finalizando ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{
              borderRadius: `${shape.full}px`,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: 16,
              bgcolor: m3.primary,
              color: m3.onPrimary,
              '&:hover': { bgcolor: m3.primary, filter: 'brightness(1.08)' },
              '&:disabled': { opacity: 0.5 },
            }}
          >
            {finalizando ? 'Finalizando…' : 'Finalizar serviço'}
          </Button>
        </>
      )}
    </Paper>
  )
}

// -----------------------------------------------------------------------
// AbaAguardandoFotos
// -----------------------------------------------------------------------

interface AbaAguardandoFotosProps {
  m3: M3Scheme
  elev: ElevList
}

function AbaAguardandoFotos({ m3, elev }: AbaAguardandoFotosProps) {
  const [ordens, setOrdens] = useState<OrdemServicoExpandida[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const dados = await api.get<OrdemServicoExpandida[]>(
        '/ordens?status=CONCLUIDA&fotos=SEM_FOTOS',
      )
      setOrdens(dados)
    } catch {
      // falha silenciosa — tabela fica vazia
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: m3.surfaceContainerLow,
        borderRadius: `${shape.large}px`,
        boxShadow: elev[1],
        overflow: 'hidden',
      }}
    >
      {/* Barra de título + atualizar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          borderBottom: `1px solid ${m3.outlineVariant}`,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 500, fontSize: 16 }}>OS concluídas sem fotos</Typography>
          <Typography variant="caption" color="text.secondary">
            Equipes a serem cobradas pelo registro fotográfico
          </Typography>
        </Box>
        <Tooltip title="Atualizar lista">
          <span>
            <IconButton
              onClick={carregar}
              disabled={carregando}
              aria-label="Atualizar lista de OS aguardando fotos"
              sx={{ color: m3.onSurfaceVariant }}
            >
              {carregando ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {carregando ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} sx={{ color: m3.primary }} />
        </Box>
      ) : ordens.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
          <DownloadDoneOutlinedIcon sx={{ fontSize: 48, color: m3.outlineVariant, mb: 1 }} />
          <Typography color="text.secondary">Nenhuma OS aguardando fotos</Typography>
          <Typography variant="caption" color="text.secondary">
            Todas as OS concluídas possuem registro fotográfico
          </Typography>
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
                <TableCell>Sequencial</TableCell>
                <TableCell>Tipo de serviço</TableCell>
                <TableCell>Equipe</TableCell>
                <TableCell>Concluída em</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ordens.map((os) => (
                <TableRow
                  key={os.id}
                  hover
                  sx={{
                    '& .MuiTableCell-root': {
                      borderBottom: `1px solid ${m3.outlineVariant}`,
                      fontSize: 14,
                    },
                    '&:last-child .MuiTableCell-root': { borderBottom: 'none' },
                  }}
                >
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: 14, fontFamily: 'monospace' }}>
                      {os.sequencial}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: m3.onSurfaceVariant }}>
                    {os.tipoServico?.nome ?? '—'}
                  </TableCell>
                  <TableCell sx={{ color: m3.onSurfaceVariant }}>
                    {os.equipe?.nome ?? (
                      <Typography
                        component="span"
                        sx={{ color: m3.outlineVariant, fontSize: 14 }}
                      >
                        Sem equipe
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: m3.onSurfaceVariant, whiteSpace: 'nowrap' }}>
                    {formatarData(os.concluidoEm)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  )
}

// -----------------------------------------------------------------------
// Subcomponente auxiliar — par label/valor no resumo da OS
// -----------------------------------------------------------------------

function Campo({
  label,
  valor,
}: {
  label: string
  valor: React.ReactNode
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}
      >
        {label}
      </Typography>
      {typeof valor === 'string' || typeof valor === 'number' ? (
        <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{valor}</Typography>
      ) : (
        valor
      )}
    </Box>
  )
}
