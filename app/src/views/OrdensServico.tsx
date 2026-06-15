// View: Ordens de Serviço — consulta + rastreabilidade (MD3, v3)
// Read-only: SEM criar/editar/excluir/mudar status.
import { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Drawer from '@mui/material/Drawer'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import CloseIcon from '@mui/icons-material/Close'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import { api, ApiError } from '../lib/api'
import {
  STATUS_OS,
  STATUS_OS_LABELS,
  STATUS_OS_COR,
  STATUS_SAIDA_LABELS,
  STATUS_SAIDA_COR,
  FOTOS_LABELS,
  type OrdemServicoExpandida,
  type EventoAuditoriaComAutor,
  type Saida,
  type StatusOS,
} from '../lib/types'
import { formatarData, normalizar } from '../lib/format'
import { useM3 } from '../theme/useM3'
import { shape } from '../theme/tokens'
import { useToast } from '../components/Toast'

// ─── tipos internos ───────────────────────────────────────────────────────────

interface OrdemDetalhe extends OrdemServicoExpandida {
  eventos: EventoAuditoriaComAutor[]
}

// ─── mapa de cores MUI → cor do m3 ───────────────────────────────────────────
// STATUS_OS_COR retorna 'warning' | 'success' | 'error'
// Aqui mapeamos para as cores de fundo/texto reais do m3.

type CorMUI = 'warning' | 'info' | 'primary' | 'success' | 'error'

function useCoresMUI(m3: ReturnType<typeof useM3>['m3']) {
  return {
    bgChip: (cor: CorMUI) => {
      if (cor === 'warning') return m3.warningContainer
      if (cor === 'success') return m3.successContainer
      if (cor === 'error') return m3.errorContainer
      if (cor === 'info') return m3.tertiaryContainer
      return m3.primaryContainer
    },
    fgChip: (cor: CorMUI) => {
      if (cor === 'warning') return m3.onWarningContainer
      if (cor === 'success') return m3.onSuccessContainer
      if (cor === 'error') return m3.onErrorContainer
      if (cor === 'info') return m3.onTertiaryContainer
      return m3.onPrimaryContainer
    },
  }
}

// ─── subcomponente: chip de status OS ────────────────────────────────────────

function ChipStatusOS({ status }: { status: StatusOS }) {
  const { m3 } = useM3()
  const { bgChip, fgChip } = useCoresMUI(m3)
  const cor = STATUS_OS_COR[status]
  return (
    <Chip
      label={STATUS_OS_LABELS[status]}
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: 12,
        height: 24,
        bgcolor: bgChip(cor),
        color: fgChip(cor),
      }}
    />
  )
}

// ─── subcomponente: chip de status Saída ─────────────────────────────────────

function ChipStatusSaida({ status }: { status: Saida['status'] }) {
  const { m3 } = useM3()
  const { bgChip, fgChip } = useCoresMUI(m3)
  const cor = STATUS_SAIDA_COR[status]
  return (
    <Chip
      label={STATUS_SAIDA_LABELS[status]}
      size="small"
      sx={{
        fontWeight: 500,
        fontSize: 11,
        height: 22,
        bgcolor: bgChip(cor),
        color: fgChip(cor),
      }}
    />
  )
}

// ─── subcomponente: Drawer de detalhe ────────────────────────────────────────

interface DrawerDetalheProps {
  aberto: boolean
  detalhe: OrdemDetalhe | null
  carregando: boolean
  onFechar: () => void
}

function DrawerDetalhe({ aberto, detalhe, carregando, onFechar }: DrawerDetalheProps) {
  const { m3, elev } = useM3()

  return (
    <Drawer
      anchor="right"
      open={aberto}
      onClose={onFechar}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 520 },
            bgcolor: m3.surfaceContainerLow,
            boxShadow: elev[3],
            p: 0,
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* ── Cabeçalho do Drawer ──────────────────────────────────────────── */}
      <Box
        sx={{
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${m3.outlineVariant}`,
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 18, lineHeight: 1.3 }}>
            {detalhe ? `OS ${detalhe.sequencial}` : 'Detalhe da OS'}
          </Typography>
          {detalhe && (
            <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
              <ChipStatusOS status={detalhe.status} />
              {detalhe.tipoServico && (
                <Chip
                  label={detalhe.tipoServico.nome}
                  size="small"
                  sx={{ bgcolor: m3.surfaceContainerHighest, color: m3.onSurfaceVariant, fontSize: 11, height: 22 }}
                />
              )}
            </Box>
          )}
        </Box>
        <Tooltip title="Fechar">
          <IconButton onClick={onFechar} size="small" sx={{ color: m3.onSurfaceVariant }}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Conteúdo scrollável ──────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {carregando ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={32} sx={{ color: m3.primary }} />
          </Box>
        ) : !detalhe ? null : (
          <>
            {/* ── Metadados da OS ────────────────────────────────────────── */}
            <Box
              sx={{
                px: 3,
                py: 2.5,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
                bgcolor: m3.surfaceContainerLow,
              }}
            >
              {[
                { label: 'Sequencial', valor: detalhe.sequencial },
                { label: 'Tipo de serviço', valor: detalhe.tipoServico?.nome ?? '—' },
                { label: 'Criado por', valor: detalhe.criadoPor.nome },
                { label: 'Criado em', valor: formatarData(detalhe.criadoEm) },
                {
                  label: 'Concluído em',
                  valor: detalhe.concluidoEm ? formatarData(detalhe.concluidoEm) : '—',
                },
                {
                  label: 'Total de saídas',
                  valor: String(detalhe.saidas.length),
                },
              ].map(({ label, valor }) => (
                <Box key={label}>
                  <Typography
                    variant="caption"
                    sx={{ display: 'block', color: m3.onSurfaceVariant, fontSize: 11, mb: 0.25 }}
                  >
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 500, color: m3.onSurface }}>
                    {valor}
                  </Typography>
                </Box>
              ))}

              {/* Folha à casa */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', color: m3.onSurfaceVariant, fontSize: 11, mb: 0.25 }}
                >
                  Folha enviada à casa
                </Typography>
                {detalhe.enviadaCasaEm ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <HomeOutlinedIcon sx={{ fontSize: 16, color: m3.success }} />
                    <Typography sx={{ fontSize: 14, fontWeight: 500, color: m3.success }}>
                      Enviada em {formatarData(detalhe.enviadaCasaEm)}
                    </Typography>
                  </Box>
                ) : (
                  <Typography sx={{ fontSize: 14, color: m3.onSurfaceVariant }}>
                    Ainda não enviada
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider sx={{ borderColor: m3.outlineVariant }} />

            {/* ── Timeline de saídas ──────────────────────────────────────── */}
            <Box sx={{ px: 2.5, py: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{ px: 0.5, mb: 1.5, fontWeight: 700, fontSize: 13, color: m3.onSurfaceVariant, letterSpacing: '.5px', textTransform: 'uppercase' }}
              >
                Saídas ({detalhe.saidas.length})
              </Typography>

              {detalhe.saidas.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, py: 1 }}>
                  Nenhuma saída registrada.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {detalhe.saidas.map((saida, idx) => {
                    const ultimo = idx === detalhe.saidas.length - 1
                    const pontoCor =
                      saida.status === 'CONCLUIDA'
                        ? m3.successContainer
                        : saida.status === 'EM_CAMPO'
                          ? m3.primaryContainer
                          : saida.status === 'CANCELADA'
                            ? m3.errorContainer
                            : m3.warningContainer

                    return (
                      <Box key={saida.id} sx={{ display: 'flex', gap: 1.5 }}>
                        {/* Linha do tempo */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <Box
                            sx={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              bgcolor: pontoCor,
                              border: `2px solid ${m3.outline}`,
                              mt: '14px',
                              flexShrink: 0,
                            }}
                          />
                          {!ultimo && (
                            <Box sx={{ width: 2, flex: 1, bgcolor: m3.outlineVariant, minHeight: 16, mt: 0.5 }} />
                          )}
                        </Box>

                        {/* Conteúdo da saída */}
                        <Box
                          sx={{
                            flex: 1,
                            pt: 1.5,
                            pb: 2.5,
                          }}
                        >
                          {/* Linha 1: data + tipo */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                            <Typography sx={{ fontSize: 12, color: m3.onSurfaceVariant }}>
                              {formatarData(saida.criadoEm)}
                            </Typography>
                            <Chip
                              label={saida.tipo === 'CAMPO' ? 'Campo' : 'Foto'}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: 10,
                                fontWeight: 600,
                                bgcolor: saida.tipo === 'CAMPO' ? m3.secondaryContainer : m3.tertiaryContainer,
                                color: saida.tipo === 'CAMPO' ? m3.onSecondaryContainer : m3.onTertiaryContainer,
                              }}
                            />
                          </Box>

                          {/* Linha 2: equipe + responsável */}
                          <Typography sx={{ fontSize: 14, fontWeight: 500, color: m3.onSurface, lineHeight: 1.4 }}>
                            {saida.equipe?.nome ?? '—'}
                            {saida.responsavel && (
                              <Typography component="span" sx={{ fontSize: 13, color: m3.onSurfaceVariant, fontWeight: 400 }}>
                                {' · '}{saida.responsavel.nome}
                              </Typography>
                            )}
                          </Typography>

                          {/* Linha 3: desfecho (status) */}
                          <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <ChipStatusSaida status={saida.status} />

                            {/* Fotos */}
                            {saida.fotos !== null && (
                              <Chip
                                label={FOTOS_LABELS[saida.fotos]}
                                size="small"
                                icon={<PhotoCameraOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                                sx={{
                                  height: 22,
                                  fontSize: 11,
                                  bgcolor:
                                    saida.fotos === 'COM_FOTOS'
                                      ? m3.primaryContainer
                                      : m3.surfaceContainerHighest,
                                  color:
                                    saida.fotos === 'COM_FOTOS'
                                      ? m3.onPrimaryContainer
                                      : m3.onSurfaceVariant,
                                }}
                              />
                            )}
                          </Box>

                          {/* Anotações */}
                          {saida.anotacoes && (
                            <Typography
                              sx={{
                                mt: 0.75,
                                fontSize: 13,
                                color: m3.onSurfaceVariant,
                                fontStyle: 'italic',
                                lineHeight: 1.5,
                              }}
                            >
                              {saida.anotacoes}
                            </Typography>
                          )}

                          {/* Recebido em */}
                          {saida.recebidoEm && (
                            <Typography sx={{ mt: 0.5, fontSize: 11, color: m3.onSurfaceVariant }}>
                              Recebido em {formatarData(saida.recebidoEm)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              )}
            </Box>

            <Divider sx={{ borderColor: m3.outlineVariant }} />

            {/* ── Eventos de auditoria ────────────────────────────────────── */}
            <Box sx={{ px: 2.5, py: 2, pb: 4 }}>
              <Typography
                variant="subtitle2"
                sx={{ px: 0.5, mb: 1.5, fontWeight: 700, fontSize: 13, color: m3.onSurfaceVariant, letterSpacing: '.5px', textTransform: 'uppercase' }}
              >
                Auditoria ({detalhe.eventos.length})
              </Typography>

              {detalhe.eventos.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, py: 1 }}>
                  Nenhum evento registrado.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {detalhe.eventos.map((ev, idx) => {
                    const pontoCor =
                      ev.acao === 'CRIACAO'
                        ? m3.primaryContainer
                        : ev.acao === 'EXCLUSAO'
                          ? m3.errorContainer
                          : ev.acao === 'MUDANCA_STATUS'
                            ? m3.tertiaryContainer
                            : m3.surfaceContainerHighest
                    const ultimo = idx === detalhe.eventos.length - 1

                    return (
                      <Box key={ev.id} sx={{ display: 'flex', gap: 1.5 }}>
                        {/* Coluna esquerda: data */}
                        <Box sx={{ flex: '0 0 80px', textAlign: 'right', pt: '14px' }}>
                          <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.4 }}>
                            {formatarData(ev.criadoEm)}
                          </Typography>
                        </Box>
                        {/* Separador visual */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              bgcolor: pontoCor,
                              mt: '16px',
                              flexShrink: 0,
                            }}
                          />
                          {!ultimo && (
                            <Box sx={{ width: 2, flex: 1, bgcolor: m3.outlineVariant, minHeight: 12 }} />
                          )}
                        </Box>
                        {/* Conteúdo */}
                        <Box sx={{ flex: 1, pt: '12px', pb: 1.5 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: m3.onSurface }}>
                            {ev.descricao}
                          </Typography>
                          {ev.autor && (
                            <Typography variant="caption" sx={{ color: m3.onSurfaceVariant }}>
                              por {ev.autor.nome}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  )
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function OrdensServico() {
  const { m3, elev } = useM3()
  const toast = useToast()

  // ── dados principais ──
  const [ordens, setOrdens] = useState<OrdemServicoExpandida[]>([])
  const [carregando, setCarregando] = useState(true)

  // ── filtros ──
  const [filtroBusca, setFiltroBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusOS | 'TODOS'>('TODOS')

  // ── drawer detalhe ──
  const [drawerAberto, setDrawerAberto] = useState(false)
  const [detalhe, setDetalhe] = useState<OrdemDetalhe | null>(null)
  const [detalheCarregando, setDetalheCarregando] = useState(false)

  // ── carregamento de ordens ────────────────────────────────────────────────

  const carregarOrdens = useCallback(async () => {
    setCarregando(true)
    try {
      const dados = await api.get<OrdemServicoExpandida[]>('/ordens')
      setOrdens(dados)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erro ao carregar ordens')
    } finally {
      setCarregando(false)
    }
  }, [toast])

  useEffect(() => {
    carregarOrdens()
  }, [carregarOrdens])

  // ── filtro client-side ────────────────────────────────────────────────────

  const ordensFiltradas = ordens.filter((os) => {
    const matchStatus = filtroStatus === 'TODOS' || os.status === filtroStatus
    if (!matchStatus) return false
    if (!filtroBusca.trim()) return true
    const q = normalizar(filtroBusca)
    return (
      normalizar(os.sequencial).includes(q) ||
      normalizar(os.tipoServico?.nome ?? '').includes(q) ||
      normalizar(os.criadoPor.nome).includes(q)
    )
  })

  // ── abrir drawer de detalhe ───────────────────────────────────────────────

  const abrirDetalhe = async (os: OrdemServicoExpandida) => {
    setDrawerAberto(true)
    setDetalhe(null)
    setDetalheCarregando(true)
    try {
      const dados = await api.get<OrdemDetalhe>(`/ordens/${os.id}`)
      setDetalhe(dados)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erro ao carregar detalhe')
      setDrawerAberto(false)
    } finally {
      setDetalheCarregando(false)
    }
  }

  // ── chips de filtro de status ─────────────────────────────────────────────

  const chipSx = (ativo: boolean) => ({
    borderRadius: `${shape.full}px`,
    fontWeight: 500,
    fontSize: 13,
    cursor: 'pointer',
    height: 32,
    bgcolor: ativo ? m3.secondaryContainer : m3.surfaceContainerHigh,
    color: ativo ? m3.onSecondaryContainer : m3.onSurfaceVariant,
    '&:hover': { bgcolor: ativo ? m3.secondaryContainer : m3.surfaceContainerHighest },
  })

  // ── helpers de coluna ────────────────────────────────────────────────────

  const ultimaSaida = (saidas: OrdemServicoExpandida['saidas']) =>
    saidas.length > 0 ? saidas[saidas.length - 1] : null

  const temFotoPendente = (saidas: OrdemServicoExpandida['saidas']) =>
    saidas.some(
      (s) => s.tipo === 'CAMPO' && s.status === 'CONCLUIDA' && s.fotos === 'SEM_FOTOS',
    )

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Cabeçalho */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 3,
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <AssignmentOutlinedIcon sx={{ color: m3.primary, fontSize: 28 }} />
        <Box>
          <Typography variant="h1" sx={{ fontSize: 22, fontWeight: 500 }}>
            Ordens de Serviço
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {carregando
              ? 'Carregando…'
              : `${ordensFiltradas.length} de ${ordens.length} ${ordens.length === 1 ? 'ordem' : 'ordens'}`}
          </Typography>
        </Box>
      </Box>

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Busca textual */}
        <TextField
          placeholder="Buscar por sequencial, tipo, criador…"
          value={filtroBusca}
          onChange={(e) => setFiltroBusca(e.target.value)}
          size="small"
          sx={{ minWidth: 260, flex: '1 1 260px' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: m3.onSurfaceVariant }} />
                </InputAdornment>
              ),
            },
          }}
        />

        {/* Chips de status */}
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
          <Chip
            label="Todas"
            onClick={() => setFiltroStatus('TODOS')}
            sx={chipSx(filtroStatus === 'TODOS')}
          />
          {STATUS_OS.map((s) => (
            <Chip
              key={s}
              label={STATUS_OS_LABELS[s]}
              onClick={() => setFiltroStatus(s === filtroStatus ? 'TODOS' : s)}
              sx={chipSx(filtroStatus === s)}
            />
          ))}
        </Stack>
      </Box>

      {/* Tabela */}
      <Paper
        elevation={0}
        sx={{
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
        ) : ordensFiltradas.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <AssignmentOutlinedIcon sx={{ fontSize: 48, color: m3.outlineVariant, mb: 1 }} />
            <Typography color="text.secondary">
              {ordens.length === 0
                ? 'Nenhuma ordem de serviço registrada.'
                : 'Nenhuma ordem encontrada para os filtros aplicados.'}
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
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Tipo</TableCell>
                  <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Saídas</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Última saída</TableCell>
                  <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Foto pend.</TableCell>
                  <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Folha</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Criada em</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ordensFiltradas.map((os) => {
                  const ultima = ultimaSaida(os.saidas)
                  const fotoPendente = temFotoPendente(os.saidas)

                  return (
                    <TableRow
                      key={os.id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        '& .MuiTableCell-root': {
                          borderBottom: `1px solid ${m3.outlineVariant}`,
                          fontSize: 14,
                        },
                        '&:last-child .MuiTableCell-root': { borderBottom: 'none' },
                      }}
                      onClick={() => abrirDetalhe(os)}
                    >
                      {/* Sequencial */}
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: 14, color: m3.primary }}>
                          {os.sequencial}
                        </Typography>
                      </TableCell>

                      {/* Status OS */}
                      <TableCell>
                        <ChipStatusOS status={os.status} />
                      </TableCell>

                      {/* Tipo de serviço */}
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="body2" noWrap sx={{ color: os.tipoServico ? 'inherit' : m3.outlineVariant }}>
                          {os.tipoServico?.nome ?? '—'}
                        </Typography>
                      </TableCell>

                      {/* Nº de saídas */}
                      <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Typography
                          sx={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: os.saidas.length > 0 ? m3.onSurface : m3.outlineVariant,
                          }}
                        >
                          {os.saidas.length}
                        </Typography>
                      </TableCell>

                      {/* Última saída */}
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        {ultima ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {ultima.equipe?.nome ?? '—'}
                            </Typography>
                            <ChipStatusSaida status={ultima.status} />
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ color: m3.outlineVariant }}>—</Typography>
                        )}
                      </TableCell>

                      {/* Foto pendente */}
                      <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        {fotoPendente ? (
                          <Tooltip title="Foto pendente: saída concluída sem fotos">
                            <PhotoCameraOutlinedIcon
                              sx={{ fontSize: 20, color: m3.warning }}
                            />
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" sx={{ color: m3.outlineVariant }}>—</Typography>
                        )}
                      </TableCell>

                      {/* Folha à casa */}
                      <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        {os.enviadaCasaEm ? (
                          <Tooltip title={`Folha enviada em ${formatarData(os.enviadaCasaEm)}`}>
                            <HomeOutlinedIcon sx={{ fontSize: 20, color: m3.success }} />
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" sx={{ color: m3.outlineVariant }}>—</Typography>
                        )}
                      </TableCell>

                      {/* Criada em */}
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, color: m3.onSurfaceVariant, whiteSpace: 'nowrap' }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatarData(os.criadoEm)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Drawer: detalhe + timeline */}
      <DrawerDetalhe
        aberto={drawerAberto}
        detalhe={detalhe}
        carregando={detalheCarregando}
        onFechar={() => setDrawerAberto(false)}
      />
    </Box>
  )
}
