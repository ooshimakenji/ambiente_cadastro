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
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import RemoveCircleOutlinedIcon from '@mui/icons-material/RemoveCircleOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import NoPhotographyOutlinedIcon from '@mui/icons-material/NoPhotographyOutlined'
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined'
import { useM3 } from '../theme/useM3'
import { shape } from '../theme/tokens'
import { api, ApiError } from '../lib/api'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { formatarData } from '../lib/format'
import type {
  OrdemServicoExpandida,
  Saida,
  DesfechoSaida,
  Fotos,
  ReceberSaida,
  NovaSaidaFoto,
} from '../lib/types'
import {
  DESFECHO_SAIDA_LABELS,
  FOTOS_LABELS,
  STATUS_OS_LABELS,
  STATUS_SAIDA_LABELS,
} from '../lib/types'

// -----------------------------------------------------------------------
// ReceberOS — Duas abas: Receber OS bipada e lista de Aguardando fotos
// -----------------------------------------------------------------------

export default function ReceberOS() {
  const { m3, elev } = useM3()
  const toast = useToast()
  const { usuario } = useAuth()

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

      {aba === 0 && <AbaReceber m3={m3} elev={elev} toast={toast} usuario={usuario} />}
      {aba === 1 && <AbaAguardandoFotos m3={m3} elev={elev} toast={toast} usuario={usuario} />}
    </Box>
  )
}

// -----------------------------------------------------------------------
// Tipos de prop compartilhados
// -----------------------------------------------------------------------

type M3Scheme = ReturnType<typeof useM3>['m3']
type ElevList = ReturnType<typeof useM3>['elev']

interface AbaReceberProps {
  m3: M3Scheme
  elev: ElevList
  toast: (msg: string) => void
  usuario: ReturnType<typeof useAuth>['usuario']
}

// -----------------------------------------------------------------------
// AbaReceber
// -----------------------------------------------------------------------

function AbaReceber({ m3, elev, toast }: AbaReceberProps) {
  const [sequencial, setSequencial] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [ordem, setOrdem] = useState<OrdemServicoExpandida | null>(null)
  const [saidaAberta, setSaidaAberta] = useState<Saida | null>(null)
  const [avisoBusca, setAvisoBusca] = useState<string | null>(null)

  // Campos do recebimento
  const [desfecho, setDesfecho] = useState<DesfechoSaida>('CONCLUIDA')
  const [fotos, setFotos] = useState<Fotos>('COM_FOTOS')
  const [anotacoes, setAnotacoes] = useState('')
  const [finalizando, setFinalizando] = useState(false)

  const sequencialRef = useRef<HTMLInputElement>(null)

  // Refoca ao montar
  useEffect(() => {
    sequencialRef.current?.focus()
  }, [])

  const limpar = useCallback(() => {
    setSequencial('')
    setOrdem(null)
    setSaidaAberta(null)
    setAvisoBusca(null)
    setDesfecho('CONCLUIDA')
    setFotos('COM_FOTOS')
    setAnotacoes('')
    setTimeout(() => sequencialRef.current?.focus(), 50)
  }, [])

  async function buscarOS() {
    const seq = sequencial.trim()
    if (!seq) return

    setBuscando(true)
    setOrdem(null)
    setSaidaAberta(null)
    setAvisoBusca(null)
    try {
      const lista = await api.get<OrdemServicoExpandida[]>(
        `/ordens?sequencial=${encodeURIComponent(seq)}`,
      )
      if (!lista || lista.length === 0) {
        setAvisoBusca('OS não encontrada.')
        return
      }
      const os = lista[0]
      setOrdem(os)

      // Encontra a saída EM_CAMPO mais recente (saidas vêm em ordem asc;
      // pode haver mais de uma aberta após re-despacho → recebe a última).
      const aberta = [...os.saidas].reverse().find((s) => s.status === 'EM_CAMPO') ?? null
      setSaidaAberta(aberta)

      if (!aberta) {
        setAvisoBusca(
          `OS encontrada, mas não há saída em aberto para receber. Status da OS: ${STATUS_OS_LABELS[os.status]}.`,
        )
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao buscar OS'
      toast(msg)
    } finally {
      setBuscando(false)
    }
  }

  async function confirmarRecebimento() {
    if (!saidaAberta) return

    setFinalizando(true)
    try {
      const body: ReceberSaida = {
        status: desfecho,
        anotacoes: anotacoes.trim() || null,
      }
      if (desfecho === 'CONCLUIDA') {
        body.fotos = fotos
      }
      await api.patch(`/saidas/${saidaAberta.id}/receber`, body)
      toast(`OS ${ordem?.sequencial ?? ''} recebida com sucesso`)
      limpar()
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao receber OS'
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
              setSaidaAberta(null)
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

      {/* Aviso de busca sem resultado / sem saída EM_CAMPO */}
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

      {/* Resumo da OS (mesmo sem saída aberta, mostramos o resumo) */}
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
                    label={STATUS_OS_LABELS[ordem.status]}
                    sx={{
                      fontWeight: 500,
                      height: 24,
                      bgcolor: m3.surfaceContainerHighest,
                      color: m3.onSurface,
                    }}
                  />
                }
              />
              <Campo label="Tipo de serviço" valor={ordem.tipoServico?.nome ?? '—'} />
              <Campo label="Nº de saídas" valor={String(ordem.saidas.length)} />
              {saidaAberta && (
                <>
                  <Campo label="Equipe em campo" valor={saidaAberta.equipe?.nome ?? '—'} />
                  <Campo label="Responsável" valor={saidaAberta.responsavel?.nome ?? '—'} />
                  <Campo
                    label="Saída criada em"
                    valor={formatarData(saidaAberta.criadoEm)}
                  />
                  <Campo
                    label="Status da saída"
                    valor={
                      <Chip
                        size="small"
                        label={STATUS_SAIDA_LABELS[saidaAberta.status]}
                        sx={{
                          fontWeight: 500,
                          height: 24,
                          bgcolor: m3.primaryContainer,
                          color: m3.onPrimaryContainer,
                        }}
                      />
                    }
                  />
                </>
              )}
            </Box>
          </Box>
        </>
      )}

      {/* Fluxo de recebimento (só aparece com saída EM_CAMPO) */}
      {saidaAberta && (
        <>
          <Divider />

          {/* 1. Desfecho */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: m3.onSurface, fontSize: 15 }}>
              Desfecho
            </Typography>
            <ToggleButtonGroup
              value={desfecho}
              exclusive
              onChange={(_, v: DesfechoSaida | null) => {
                if (v) setDesfecho(v)
              }}
              aria-label="Desfecho do atendimento"
              fullWidth
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: 15,
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
              <ToggleButton value="CONCLUIDA" aria-label={DESFECHO_SAIDA_LABELS.CONCLUIDA}>
                <CheckCircleOutlinedIcon fontSize="small" />
                {DESFECHO_SAIDA_LABELS.CONCLUIDA}
              </ToggleButton>
              <ToggleButton value="NAO_REALIZADO" aria-label={DESFECHO_SAIDA_LABELS.NAO_REALIZADO}>
                <RemoveCircleOutlinedIcon fontSize="small" />
                {DESFECHO_SAIDA_LABELS.NAO_REALIZADO}
              </ToggleButton>
              <ToggleButton value="CANCELADA" aria-label={DESFECHO_SAIDA_LABELS.CANCELADA}>
                <CancelOutlinedIcon fontSize="small" />
                {DESFECHO_SAIDA_LABELS.CANCELADA}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* 2. Fotos (só se CONCLUIDA) */}
          {desfecho === 'CONCLUIDA' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: m3.onSurface, fontSize: 15 }}>
                Fotos
              </Typography>
              <ToggleButtonGroup
                value={fotos}
                exclusive
                onChange={(_, v: Fotos | null) => {
                  if (v) setFotos(v)
                }}
                aria-label="Fotos da execução"
                fullWidth
                sx={{
                  '& .MuiToggleButton-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: 15,
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
                <ToggleButton value="COM_FOTOS" aria-label={FOTOS_LABELS.COM_FOTOS}>
                  <PhotoCameraOutlinedIcon fontSize="small" />
                  {FOTOS_LABELS.COM_FOTOS}
                </ToggleButton>
                <ToggleButton value="SEM_FOTOS" aria-label={FOTOS_LABELS.SEM_FOTOS}>
                  <NoPhotographyOutlinedIcon fontSize="small" />
                  {FOTOS_LABELS.SEM_FOTOS}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

          {/* 3. Descrição (opcional) */}
          <TextField
            label="Descrição (opcional)"
            value={anotacoes}
            onChange={(e) => setAnotacoes(e.target.value)}
            fullWidth
            multiline
            rows={2}
            disabled={finalizando}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            helperText={`${anotacoes.length}/1000`}
          />

          {/* Botão confirmar */}
          <Button
            variant="contained"
            fullWidth
            size="large"
            disabled={finalizando}
            onClick={confirmarRecebimento}
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
            {finalizando ? 'Confirmando…' : 'Confirmar recebimento'}
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
  toast: (msg: string) => void
  usuario: ReturnType<typeof useAuth>['usuario']
}

function AbaAguardandoFotos({ m3, elev, toast, usuario }: AbaAguardandoFotosProps) {
  const [ordens, setOrdens] = useState<OrdemServicoExpandida[]>([])
  const [carregando, setCarregando] = useState(true)
  const [regularizando, setRegularizando] = useState<number | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const dados = await api.get<OrdemServicoExpandida[]>('/ordens?aguardandoFotos=true')
      setOrdens(dados)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao carregar lista'
      toast(msg)
    } finally {
      setCarregando(false)
    }
  }, [toast])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function regularizarFoto(os: OrdemServicoExpandida) {
    setRegularizando(os.id)
    try {
      const body: NovaSaidaFoto = {
        responsavelId: usuario?.id ?? null,
      }
      // Cria saída FOTO e recebe em um único fluxo
      const osAtualizada = await api.post<OrdemServicoExpandida>(
        `/ordens/${os.id}/saida-foto`,
        body,
      )
      // A saída FOTO EM_CAMPO é a última saída do tipo FOTO com status EM_CAMPO
      const saidaFoto = osAtualizada.saidas
        .slice()
        .reverse()
        .find((s) => s.tipo === 'FOTO' && s.status === 'EM_CAMPO')

      if (!saidaFoto) {
        toast('Saída de foto criada, mas não foi possível recebê-la automaticamente')
        await carregar()
        return
      }

      await api.patch(`/saidas/${saidaFoto.id}/receber`, {
        status: 'CONCLUIDA',
        fotos: 'COM_FOTOS',
      } satisfies ReceberSaida)

      toast(`Foto regularizada para OS ${os.sequencial}`)
      await carregar()
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao regularizar foto'
      toast(msg)
    } finally {
      setRegularizando(null)
    }
  }

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
                <TableCell>Concluída em</TableCell>
                <TableCell align="right" sx={{ pr: 2 }}>
                  Ação
                </TableCell>
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
                  <TableCell sx={{ color: m3.onSurfaceVariant, whiteSpace: 'nowrap' }}>
                    {formatarData(os.concluidoEm)}
                  </TableCell>
                  <TableCell align="right" sx={{ pr: 1 }}>
                    <Tooltip title="Regularizar foto desta OS">
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={
                            regularizando === os.id ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <AddAPhotoOutlinedIcon fontSize="small" />
                            )
                          }
                          disabled={regularizando !== null}
                          onClick={() => regularizarFoto(os)}
                          sx={{
                            borderRadius: `${shape.full}px`,
                            textTransform: 'none',
                            borderColor: m3.outline,
                            color: m3.primary,
                            fontSize: 13,
                            '&:hover': { borderColor: m3.primary },
                          }}
                        >
                          {regularizando === os.id ? 'Regularizando…' : 'Regularizar foto'}
                        </Button>
                      </span>
                    </Tooltip>
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
