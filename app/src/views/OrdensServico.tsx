// View: Ordens de Serviço — gestão com timeline de auditoria (MD3)
import { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import Drawer from '@mui/material/Drawer'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemText from '@mui/material/ListItemText'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import HistoryIcon from '@mui/icons-material/History'
import SearchIcon from '@mui/icons-material/Search'
import InputAdornment from '@mui/material/InputAdornment'
import { api, ApiError } from '../lib/api'
import {
  STATUS_OS,
  STATUS_OS_LABELS,
  type EditarOrdem,
  type Equipe,
  type EventoAuditoriaComAutor,
  type MudarStatusOrdem,
  type OrdemServicoExpandida,
  type StatusOS,
  type TipoServico,
  type Usuario,
} from '../lib/types'
import { formatarData, normalizar } from '../lib/format'
import { useM3 } from '../theme/useM3'
import { shape } from '../theme/tokens'
import StatusChip from '../components/StatusChip'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'

// ─── tipos internos ───────────────────────────────────────────────────────────

interface OrdemDetalhe extends OrdemServicoExpandida {
  eventos: EventoAuditoriaComAutor[]
}

// ─── helpers de formulário de edição ─────────────────────────────────────────

interface FormEditar {
  tipoServicoId: number | null
  equipeId: number | null
  responsavelId: number | null
  anotacoes: string
}

const FORM_EDITAR_VAZIO: FormEditar = {
  tipoServicoId: null,
  equipeId: null,
  responsavelId: null,
  anotacoes: '',
}

// ─── subcomponente: Dialog de edição (formulário enxuto) ──────────────────────

interface DialogEditarOSProps {
  aberto: boolean
  inicial: FormEditar
  tipos: TipoServico[]
  equipes: Equipe[]
  usuarios: Usuario[]
  usuariosCarregando: boolean
  usuariosForbidden: boolean
  salvando: boolean
  onFechar: () => void
  onSalvar: (dados: EditarOrdem) => void
}

function DialogEditarOS({
  aberto,
  inicial,
  tipos,
  equipes,
  usuarios,
  usuariosCarregando,
  usuariosForbidden,
  salvando,
  onFechar,
  onSalvar,
}: DialogEditarOSProps) {
  const { m3 } = useM3()
  const [form, setForm] = useState<FormEditar>({ ...FORM_EDITAR_VAZIO, ...inicial })

  useEffect(() => {
    if (aberto) setForm({ ...FORM_EDITAR_VAZIO, ...inicial })
  }, [aberto, inicial])

  const set = <K extends keyof FormEditar>(campo: K, valor: FormEditar[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }))

  const tipoSelecionado = tipos.find((t) => t.id === form.tipoServicoId) ?? null
  const equipeSelecionada = equipes.find((e) => e.id === form.equipeId) ?? null
  const responsavelSelecionado = usuarios.find((u) => u.id === form.responsavelId) ?? null

  const handleSubmit = () => {
    const dados: EditarOrdem = {
      tipoServicoId: form.tipoServicoId ?? undefined,
      equipeId: form.equipeId,
      responsavelId: form.responsavelId,
      anotacoes: form.anotacoes.trim() || null,
    }
    onSalvar(dados)
  }

  return (
    <Dialog
      open={aberto}
      onClose={salvando ? undefined : onFechar}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: { bgcolor: m3.surfaceContainerHigh, borderRadius: `${shape.extraLarge}px` },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>Editar Ordem de Serviço</DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        {/* Tipo de serviço */}
        <Autocomplete
          options={tipos}
          getOptionLabel={(t) => t.nome}
          value={tipoSelecionado}
          onChange={(_, v) => set('tipoServicoId', v?.id ?? null)}
          disabled={salvando}
          renderInput={(params) => <TextField {...params} label="Tipo de serviço" size="small" />}
        />

        {/* Equipe */}
        <Autocomplete
          options={equipes}
          getOptionLabel={(e) => e.nome}
          value={equipeSelecionada}
          onChange={(_, v) => set('equipeId', v?.id ?? null)}
          disabled={salvando}
          renderInput={(params) => <TextField {...params} label="Equipe" size="small" />}
        />

        {/* Responsável — omitido se 403 */}
        {!usuariosForbidden && (
          <Autocomplete
            options={usuarios}
            getOptionLabel={(u) => u.nome}
            value={responsavelSelecionado}
            onChange={(_, v) => set('responsavelId', v?.id ?? null)}
            loading={usuariosCarregando}
            disabled={salvando || usuariosCarregando}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Responsável"
                size="small"
                slotProps={{
                  input: {
                    ...params.slotProps?.input,
                    endAdornment: (
                      <>
                        {usuariosCarregando ? <CircularProgress size={16} /> : null}
                        {(params.slotProps?.input as { endAdornment?: React.ReactNode })?.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />
        )}

        {/* Anotações */}
        <TextField
          label="Anotações"
          value={form.anotacoes}
          onChange={(e) => set('anotacoes', e.target.value)}
          fullWidth
          size="small"
          multiline
          rows={3}
          disabled={salvando}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onFechar} disabled={salvando} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={salvando}
          startIcon={salvando ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {salvando ? 'Salvando…' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── subcomponente: Dialog de confirmação de cancelamento ─────────────────────

interface DialogCancelarProps {
  aberto: boolean
  ordem: OrdemServicoExpandida | null
  salvando: boolean
  onFechar: () => void
  onConfirmar: () => void
}

function DialogCancelar({ aberto, ordem, salvando, onFechar, onConfirmar }: DialogCancelarProps) {
  const { m3 } = useM3()
  return (
    <Dialog
      open={aberto}
      onClose={salvando ? undefined : onFechar}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: { bgcolor: m3.surfaceContainerHigh, borderRadius: `${shape.extraLarge}px` },
        },
      }}
    >
      <DialogTitle>Cancelar ordem de serviço</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Tem certeza que deseja cancelar a OS{' '}
          <strong>{ordem?.sequencial}</strong>? O status será alterado para "Cancelada".
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onFechar} disabled={salvando} color="inherit">
          Voltar
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirmar}
          disabled={salvando}
          startIcon={salvando ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {salvando ? 'Cancelando…' : 'Cancelar OS'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── subcomponente: Dialog de confirmação de exclusão ─────────────────────────

interface DialogExcluirProps {
  aberto: boolean
  ordem: OrdemServicoExpandida | null
  excluindo: boolean
  onFechar: () => void
  onConfirmar: () => void
}

function DialogExcluir({ aberto, ordem, excluindo, onFechar, onConfirmar }: DialogExcluirProps) {
  const { m3 } = useM3()
  return (
    <Dialog
      open={aberto}
      onClose={excluindo ? undefined : onFechar}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: { bgcolor: m3.surfaceContainerHigh, borderRadius: `${shape.extraLarge}px` },
        },
      }}
    >
      <DialogTitle>Excluir ordem de serviço</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Tem certeza que deseja excluir a OS{' '}
          <strong>{ordem?.sequencial}</strong>? Esta ação não pode ser desfeita.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onFechar} disabled={excluindo} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirmar}
          disabled={excluindo}
          startIcon={excluindo ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {excluindo ? 'Excluindo…' : 'Excluir'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── subcomponente: Menu de ações por linha ───────────────────────────────────

interface MenuAcoesProps {
  os: OrdemServicoExpandida
  isAdmin: boolean
  salvandoId: number | null
  onAtender: (os: OrdemServicoExpandida) => void
  onCancelar: (os: OrdemServicoExpandida) => void
  onEditar: (os: OrdemServicoExpandida) => void
  onExcluir: (os: OrdemServicoExpandida) => void
  onHistorico: (os: OrdemServicoExpandida) => void
}

function MenuAcoes({
  os,
  isAdmin,
  salvandoId,
  onAtender,
  onCancelar,
  onEditar,
  onExcluir,
  onHistorico,
}: MenuAcoesProps) {
  const { m3 } = useM3()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const aberto = Boolean(anchorEl)
  const salvandoEste = salvandoId === os.id

  const fechar = () => setAnchorEl(null)

  const podeCancelar = os.status === 'PENDENTE' || os.status === 'ATENDENDO'
  const podeAtender = os.status === 'PENDENTE'

  return (
    <>
      <Tooltip title="Ações">
        <span>
          <IconButton
            size="small"
            disabled={salvandoEste}
            onClick={(e) => {
              e.stopPropagation()
              setAnchorEl(e.currentTarget)
            }}
            sx={{ color: m3.onSurfaceVariant }}
          >
            {salvandoEste ? <CircularProgress size={16} /> : <MoreVertIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={aberto}
        onClose={fechar}
        onClick={(e) => e.stopPropagation()}
        slotProps={{
          paper: {
            sx: {
              bgcolor: m3.surfaceContainerHigh,
              borderRadius: `${shape.medium}px`,
              minWidth: 160,
            },
          },
        }}
      >
        {/* Ver histórico */}
        <MenuItem
          onClick={() => {
            fechar()
            onHistorico(os)
          }}
          dense
        >
          <HistoryIcon fontSize="small" sx={{ mr: 1.5, color: m3.onSurfaceVariant }} />
          <ListItemText primary="Ver histórico" />
        </MenuItem>

        {/* Atender — somente PENDENTE */}
        {podeAtender && (
          <MenuItem
            onClick={() => {
              fechar()
              onAtender(os)
            }}
            dense
          >
            <ListItemText
              primary="Atender"
              slotProps={{ primary: { sx: { color: m3.primary, fontWeight: 600 } } }}
            />
          </MenuItem>
        )}

        {/* Editar */}
        <MenuItem
          onClick={() => {
            fechar()
            onEditar(os)
          }}
          dense
        >
          <EditOutlinedIcon fontSize="small" sx={{ mr: 1.5, color: m3.onSurfaceVariant }} />
          <ListItemText primary="Editar" />
        </MenuItem>

        {/* Cancelar — PENDENTE ou ATENDENDO */}
        {podeCancelar && (
          <MenuItem
            onClick={() => {
              fechar()
              onCancelar(os)
            }}
            dense
            sx={{ color: 'error.main' }}
          >
            <ListItemText
              primary="Cancelar OS"
              slotProps={{ primary: { sx: { color: 'error.main' } } }}
            />
          </MenuItem>
        )}

        {/* Excluir — somente ADMIN */}
        {isAdmin && (
          <MenuItem
            onClick={() => {
              fechar()
              onExcluir(os)
            }}
            dense
            sx={{ color: 'error.main' }}
          >
            <DeleteOutlineIcon fontSize="small" sx={{ mr: 1.5 }} />
            <ListItemText
              primary="Excluir"
              slotProps={{ primary: { sx: { color: 'error.main' } } }}
            />
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

// ─── subcomponente: Drawer de detalhe + timeline ──────────────────────────────

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
            width: { xs: '100%', sm: 480 },
            bgcolor: m3.surfaceContainerLow,
            boxShadow: elev[3],
            p: 0,
          },
        },
      }}
    >
      <Box sx={{ p: 3, borderBottom: `1px solid ${m3.outlineVariant}` }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {detalhe ? `OS ${detalhe.sequencial}` : 'Detalhe da OS'}
        </Typography>
        {detalhe && (
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <StatusChip status={detalhe.status} />
            {detalhe.equipe && (
              <Chip
                label={detalhe.equipe.nome}
                size="small"
                sx={{ bgcolor: m3.surfaceContainerHigh, color: m3.onSurfaceVariant }}
              />
            )}
            {detalhe.responsavel && (
              <Chip
                label={detalhe.responsavel.nome}
                size="small"
                variant="outlined"
                sx={{ color: m3.onSurfaceVariant, borderColor: m3.outlineVariant }}
              />
            )}
          </Box>
        )}
      </Box>

      {/* Metadados resumidos */}
      {detalhe && (
        <Box sx={{ px: 3, py: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          {[
            { label: 'Sequencial', valor: detalhe.sequencial },
            { label: 'Tipo de serviço', valor: detalhe.tipoServico?.nome ?? '—' },
            { label: 'Criado por', valor: detalhe.criadoPor.nome },
            { label: 'Criado em', valor: formatarData(detalhe.criadoEm) },
            { label: 'Atualizado em', valor: formatarData(detalhe.atualizadoEm) },
            { label: 'Concluído em', valor: detalhe.concluidoEm ? formatarData(detalhe.concluidoEm) : '—' },
          ].map(({ label, valor }) => (
            <Box key={label}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {valor || '—'}
              </Typography>
            </Box>
          ))}
          {detalhe.anotacoes && (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Anotações
              </Typography>
              <Typography variant="body2">{detalhe.anotacoes}</Typography>
            </Box>
          )}
        </Box>
      )}

      <Divider />

      {/* Timeline de eventos */}
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="subtitle2" sx={{ px: 1, mb: 1, fontWeight: 600, color: m3.onSurfaceVariant }}>
          Histórico de eventos
        </Typography>

        {carregando ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : !detalhe || detalhe.eventos.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2 }}>
            Nenhum evento registrado.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
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
                  <Box sx={{ flex: '0 0 90px', textAlign: 'right', pt: '12px' }}>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.4 }}>
                      {formatarData(ev.criadoEm)}
                    </Typography>
                  </Box>
                  {/* Separador visual */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: pontoCor,
                        mt: '12px',
                        flexShrink: 0,
                      }}
                    />
                    {!ultimo && (
                      <Box sx={{ width: 2, flex: 1, bgcolor: m3.outlineVariant, minHeight: 16 }} />
                    )}
                  </Box>
                  {/* Conteúdo */}
                  <Box sx={{ flex: 1, pt: '10px', pb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                      {ev.descricao}
                    </Typography>
                    {ev.autor && (
                      <Typography variant="caption" color="text.secondary">
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
    </Drawer>
  )
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function OrdensServico() {
  const { m3, elev } = useM3()
  const toast = useToast()
  const { usuario } = useAuth()

  // ── dados principais ──
  const [ordens, setOrdens] = useState<OrdemServicoExpandida[]>([])
  const [carregando, setCarregando] = useState(true)

  // ── dados auxiliares ──
  const [tipos, setTipos] = useState<TipoServico[]>([])
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [usuariosCarregando, setUsuariosCarregando] = useState(false)
  const [usuariosForbidden, setUsuariosForbidden] = useState(false)

  // ── filtros ──
  const [filtroBusca, setFiltroBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusOS | 'TODOS'>('TODOS')

  // ── dialogs de ação ──
  const [dialogEditar, setDialogEditar] = useState<OrdemServicoExpandida | null>(null)
  const [dialogCancelar, setDialogCancelar] = useState<OrdemServicoExpandida | null>(null)
  const [dialogExcluir, setDialogExcluir] = useState<OrdemServicoExpandida | null>(null)

  // ── drawer detalhe ──
  const [drawerAberto, setDrawerAberto] = useState(false)
  const [detalhe, setDetalhe] = useState<OrdemDetalhe | null>(null)
  const [detalheCarregando, setDetalheCarregando] = useState(false)

  // ── estados de mutação ──
  const [salvando, setSalvando] = useState(false)
  const [salvandoId, setSalvandoId] = useState<number | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  // ── carregamento de ordens ─────────────────────────────────────────────────

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

  // ── carregamento de tipos ──────────────────────────────────────────────────

  const carregarTipos = useCallback(async () => {
    try {
      const dados = await api.get<TipoServico[]>('/tipos')
      setTipos(dados)
    } catch {
      // silencioso
    }
  }, [])

  // ── carregamento de equipes ────────────────────────────────────────────────

  const carregarEquipes = useCallback(async () => {
    try {
      const dados = await api.get<Equipe[]>('/equipes')
      setEquipes(dados)
    } catch {
      // silencioso
    }
  }, [])

  // ── carregamento de usuários (403 → omitir select) ─────────────────────────

  const carregarUsuarios = useCallback(async () => {
    setUsuariosCarregando(true)
    try {
      const dados = await api.get<Usuario[]>('/usuarios')
      setUsuarios(dados)
      setUsuariosForbidden(false)
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setUsuariosForbidden(true)
      }
    } finally {
      setUsuariosCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarOrdens()
    carregarTipos()
    carregarEquipes()
    carregarUsuarios()
  }, [carregarOrdens, carregarTipos, carregarEquipes, carregarUsuarios])

  // ── filtro client-side ─────────────────────────────────────────────────────

  const ordensFiltradas = ordens.filter((os) => {
    const matchStatus = filtroStatus === 'TODOS' || os.status === filtroStatus
    if (!matchStatus) return false
    if (!filtroBusca.trim()) return true
    const q = normalizar(filtroBusca)
    return (
      normalizar(os.sequencial).includes(q) ||
      normalizar(os.tipoServico?.nome ?? '').includes(q) ||
      normalizar(os.equipe?.nome ?? '').includes(q) ||
      normalizar(os.responsavel?.nome ?? '').includes(q)
    )
  })

  // ── atender OS (PENDENTE → ATENDENDO) ────────────────────────────────────

  const handleAtender = async (os: OrdemServicoExpandida) => {
    setSalvandoId(os.id)
    try {
      const corpo: MudarStatusOrdem = { status: 'ATENDENDO' }
      await api.patch(`/ordens/${os.id}/status`, corpo)
      toast(`OS ${os.sequencial} em atendimento`)
      await carregarOrdens()
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast('Transição inválida')
      } else {
        toast(e instanceof ApiError ? e.message : 'Erro ao atender ordem')
      }
    } finally {
      setSalvandoId(null)
    }
  }

  // ── confirmar cancelamento ────────────────────────────────────────────────

  const handleCancelar = async () => {
    if (!dialogCancelar) return
    setSalvando(true)
    try {
      const corpo: MudarStatusOrdem = { status: 'CANCELADA' }
      await api.patch(`/ordens/${dialogCancelar.id}/status`, corpo)
      toast(`OS ${dialogCancelar.sequencial} cancelada`)
      setDialogCancelar(null)
      await carregarOrdens()
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast('Transição inválida')
      } else {
        toast(e instanceof ApiError ? e.message : 'Erro ao cancelar ordem')
      }
    } finally {
      setSalvando(false)
    }
  }

  // ── editar OS ─────────────────────────────────────────────────────────────

  const handleEditar = async (dados: EditarOrdem) => {
    if (!dialogEditar) return
    setSalvando(true)
    try {
      await api.patch(`/ordens/${dialogEditar.id}`, dados)
      toast('Ordem de serviço atualizada')
      setDialogEditar(null)
      await carregarOrdens()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erro ao editar ordem')
    } finally {
      setSalvando(false)
    }
  }

  // ── excluir OS ────────────────────────────────────────────────────────────

  const handleExcluir = async () => {
    if (!dialogExcluir) return
    setExcluindo(true)
    try {
      await api.del(`/ordens/${dialogExcluir.id}`)
      toast('Ordem de serviço excluída')
      setDialogExcluir(null)
      await carregarOrdens()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erro ao excluir ordem')
    } finally {
      setExcluindo(false)
    }
  }

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
    cursor: 'pointer',
    bgcolor: ativo ? m3.secondaryContainer : m3.surfaceContainerHigh,
    color: ativo ? m3.onSecondaryContainer : m3.onSurfaceVariant,
    '&:hover': { bgcolor: ativo ? m3.secondaryContainer : m3.surfaceContainerHighest },
  })

  const isAdmin = usuario?.papel === 'ADMIN'

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Ordens de Serviço
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {carregando ? 'Carregando…' : `${ordensFiltradas.length} de ${ordens.length} ordens`}
          </Typography>
        </Box>
      </Box>

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Busca textual */}
        <TextField
          placeholder="Buscar por sequencial, tipo, equipe, responsável…"
          value={filtroBusca}
          onChange={(e) => setFiltroBusca(e.target.value)}
          size="small"
          sx={{ minWidth: 280, flex: '1 1 280px' }}
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
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Chip
            label="Todos"
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
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: m3.surfaceContainerHigh, fontWeight: 600, fontSize: 13 } }}>
                <TableCell sx={{ width: 120 }}>Sequencial</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Equipe</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Responsável</TableCell>
                <TableCell>Status</TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Fotos</TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Criada em</TableCell>
                <TableCell align="right" sx={{ width: 56 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : ordensFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {ordens.length === 0
                      ? 'Nenhuma ordem de serviço cadastrada.'
                      : 'Nenhuma ordem encontrada para os filtros aplicados.'}
                  </TableCell>
                </TableRow>
              ) : (
                ordensFiltradas.map((os) => (
                  <TableRow
                    key={os.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:last-child td': { border: 0 },
                    }}
                    onClick={() => abrirDetalhe(os)}
                  >
                    {/* Sequencial */}
                    <TableCell sx={{ fontWeight: 600, color: m3.onSurfaceVariant }}>
                      {os.sequencial}
                    </TableCell>

                    {/* Tipo de serviço */}
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {os.tipoServico?.nome ?? '—'}
                      </Typography>
                    </TableCell>

                    {/* Equipe */}
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2">{os.equipe?.nome ?? '—'}</Typography>
                    </TableCell>

                    {/* Responsável */}
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2">{os.responsavel?.nome ?? '—'}</Typography>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusChip status={os.status} />
                    </TableCell>

                    {/* Fotos — chip apenas quando CONCLUIDA */}
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      {os.status === 'CONCLUIDA' && os.fotos != null ? (
                        <Chip
                          label={os.fotos === 'COM_FOTOS' ? 'Com fotos' : 'Sem fotos'}
                          size="small"
                          sx={{
                            bgcolor: os.fotos === 'COM_FOTOS' ? m3.primaryContainer : m3.surfaceContainerHigh,
                            color: os.fotos === 'COM_FOTOS' ? m3.onPrimaryContainer : m3.onSurfaceVariant,
                            fontSize: 11,
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>

                    {/* Criada em */}
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatarData(os.criadoEm)}
                      </Typography>
                    </TableCell>

                    {/* Ações */}
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <MenuAcoes
                        os={os}
                        isAdmin={isAdmin}
                        salvandoId={salvandoId}
                        onAtender={handleAtender}
                        onCancelar={(o) => setDialogCancelar(o)}
                        onEditar={(o) => setDialogEditar(o)}
                        onExcluir={(o) => setDialogExcluir(o)}
                        onHistorico={abrirDetalhe}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog: editar OS */}
      <DialogEditarOS
        aberto={dialogEditar !== null}
        inicial={
          dialogEditar
            ? {
                tipoServicoId: dialogEditar.tipoServicoId,
                equipeId: dialogEditar.equipeId,
                responsavelId: dialogEditar.responsavelId,
                anotacoes: dialogEditar.anotacoes ?? '',
              }
            : FORM_EDITAR_VAZIO
        }
        tipos={tipos}
        equipes={equipes}
        usuarios={usuarios}
        usuariosCarregando={usuariosCarregando}
        usuariosForbidden={usuariosForbidden}
        salvando={salvando}
        onFechar={() => setDialogEditar(null)}
        onSalvar={handleEditar}
      />

      {/* Dialog: confirmar cancelamento */}
      <DialogCancelar
        aberto={dialogCancelar !== null}
        ordem={dialogCancelar}
        salvando={salvando}
        onFechar={() => setDialogCancelar(null)}
        onConfirmar={handleCancelar}
      />

      {/* Dialog: confirmar exclusão */}
      <DialogExcluir
        aberto={dialogExcluir !== null}
        ordem={dialogExcluir}
        excluindo={excluindo}
        onFechar={() => setDialogExcluir(null)}
        onConfirmar={handleExcluir}
      />

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
