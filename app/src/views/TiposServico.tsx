import { useEffect, useState } from 'react'
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
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import TextField from '@mui/material/TextField'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import { useM3 } from '../theme/useM3'
import { shape } from '../theme/tokens'
import { api, ApiError } from '../lib/api'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { formatarData } from '../lib/format'
import type { TipoServico, NovoTipoServico, EditarTipoServico } from '../lib/types'

// -----------------------------------------------------------------------
// TiposServico — CRUD completo (GET / POST / PATCH / DELETE /tipos)
// -----------------------------------------------------------------------

// --- Estado do dialog de criar / editar ---
interface FormState {
  nome: string
  ativo: boolean
}

const formVazio: FormState = { nome: '', ativo: true }

export default function TiposServico() {
  const { m3, elev } = useM3()
  const toast = useToast()
  const { usuario } = useAuth()
  const isAdmin = usuario?.papel === 'ADMIN'

  // Lista
  const [tipos, setTipos] = useState<TipoServico[]>([])
  const [carregando, setCarregando] = useState(true)

  // Dialog criar / editar
  const [dialogAberto, setDialogAberto] = useState(false)
  const [editando, setEditando] = useState<TipoServico | null>(null)
  const [form, setForm] = useState<FormState>(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erroNome, setErroNome] = useState('')

  // Dialog confirmar exclusão
  const [excluindo, setExcluindo] = useState<TipoServico | null>(null)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  // -----------------------------------------------------------------------
  // Carregar lista
  // -----------------------------------------------------------------------
  async function carregar() {
    setCarregando(true)
    try {
      const dados = await api.get<TipoServico[]>('/tipos')
      setTipos(dados)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao carregar tipos de serviço'
      toast(msg)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -----------------------------------------------------------------------
  // Abrir / fechar dialogs
  // -----------------------------------------------------------------------
  function abrirCriar() {
    setEditando(null)
    setForm(formVazio)
    setErroNome('')
    setDialogAberto(true)
  }

  function abrirEditar(tipo: TipoServico) {
    setEditando(tipo)
    setForm({ nome: tipo.nome, ativo: tipo.ativo })
    setErroNome('')
    setDialogAberto(true)
  }

  function fecharDialog() {
    if (salvando) return
    setDialogAberto(false)
  }

  function abrirConfirmarExclusao(tipo: TipoServico) {
    setExcluindo(tipo)
  }

  function fecharConfirmarExclusao() {
    if (confirmandoExclusao) return
    setExcluindo(null)
  }

  // -----------------------------------------------------------------------
  // Salvar (criar ou editar)
  // -----------------------------------------------------------------------
  async function salvar() {
    const nomeLimpo = form.nome.trim()
    if (!nomeLimpo) {
      setErroNome('Nome é obrigatório')
      return
    }
    setErroNome('')
    setSalvando(true)
    try {
      if (editando) {
        const corpo: EditarTipoServico = {
          nome: nomeLimpo,
          ativo: form.ativo,
        }
        await api.patch<TipoServico>(`/tipos/${editando.id}`, corpo)
        toast('Tipo de serviço atualizado com sucesso')
      } else {
        const corpo: NovoTipoServico = {
          nome: nomeLimpo,
        }
        await api.post<TipoServico>('/tipos', corpo)
        toast('Tipo de serviço criado com sucesso')
      }
      setDialogAberto(false)
      await carregar()
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao salvar tipo de serviço'
      toast(msg)
    } finally {
      setSalvando(false)
    }
  }

  // -----------------------------------------------------------------------
  // Excluir
  // -----------------------------------------------------------------------
  async function confirmarExclusao() {
    if (!excluindo) return
    setConfirmandoExclusao(true)
    try {
      await api.del(`/tipos/${excluindo.id}`)
      toast('Tipo de serviço excluído com sucesso')
      setExcluindo(null)
      await carregar()
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao excluir tipo de serviço'
      toast(msg)
    } finally {
      setConfirmandoExclusao(false)
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <Box>
      {/* Cabeçalho da view */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CategoryOutlinedIcon sx={{ color: m3.primary, fontSize: 28 }} />
          <Box>
            <Typography variant="h1" sx={{ fontSize: 22, fontWeight: 500 }}>
              Tipos de Serviço
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gerencie os tipos de serviço disponíveis
            </Typography>
          </Box>
        </Box>

        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={abrirCriar}
            sx={{
              borderRadius: `${shape.full}px`,
              textTransform: 'none',
              fontWeight: 500,
              bgcolor: m3.primary,
              color: m3.onPrimary,
              '&:hover': { bgcolor: m3.primary, filter: 'brightness(1.08)' },
            }}
          >
            Novo tipo
          </Button>
        )}
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
        ) : tipos.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <CategoryOutlinedIcon sx={{ fontSize: 48, color: m3.outlineVariant, mb: 1 }} />
            <Typography color="text.secondary">Nenhum tipo de serviço cadastrado</Typography>
            <Typography variant="caption" color="text.secondary">
              Clique em "Novo tipo" para começar
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
                  <TableCell>Nome</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell>Criado em</TableCell>
                  <TableCell align="right" sx={{ pr: 2 }}>
                    Ações
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tipos.map((tipo) => (
                  <TableRow
                    key={tipo.id}
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
                      <Typography sx={{ fontWeight: 500, fontSize: 14 }}>{tipo.nome}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={tipo.ativo ? 'Ativo' : 'Inativo'}
                        sx={{
                          fontWeight: 500,
                          height: 24,
                          bgcolor: tipo.ativo ? m3.successContainer : m3.surfaceContainerHighest,
                          color: tipo.ativo ? m3.onSuccessContainer : m3.onSurfaceVariant,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: m3.onSurfaceVariant, whiteSpace: 'nowrap' }}>
                      {formatarData(tipo.criadoEm)}
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 1 }}>
                      {isAdmin ? (
                        <>
                          <Tooltip title="Editar tipo">
                            <IconButton
                              size="small"
                              onClick={() => abrirEditar(tipo)}
                              sx={{ color: m3.onSurfaceVariant, mr: 0.5 }}
                              aria-label={`Editar tipo ${tipo.nome}`}
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir tipo">
                            <IconButton
                              size="small"
                              onClick={() => abrirConfirmarExclusao(tipo)}
                              sx={{ color: m3.error }}
                              aria-label={`Excluir tipo ${tipo.nome}`}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <Typography sx={{ color: m3.outlineVariant, fontSize: 13 }}>—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ---------------------------------------------------------------- */}
      {/* Dialog criar / editar                                             */}
      {/* ---------------------------------------------------------------- */}
      <Dialog
        open={dialogAberto}
        onClose={fecharDialog}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              bgcolor: m3.surfaceContainerHigh,
              borderRadius: `${shape.extraLarge}px`,
              boxShadow: elev[3],
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 500, fontSize: 20, pb: 1 }}>
          {editando ? 'Editar tipo de serviço' : 'Novo tipo de serviço'}
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Nome"
            required
            fullWidth
            autoFocus
            value={form.nome}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, nome: e.target.value }))
              if (erroNome) setErroNome('')
            }}
            error={Boolean(erroNome)}
            helperText={erroNome || undefined}
            slotProps={{ htmlInput: { maxLength: 120 } }}
            sx={{ mt: 1 }}
          />

          {/* Toggle ativo — apenas no modo edição */}
          {editando && (
            <FormControlLabel
              control={
                <Switch
                  checked={form.ativo}
                  onChange={(e) => setForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: m3.primary },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      bgcolor: m3.primaryContainer,
                    },
                  }}
                />
              }
              label={form.ativo ? 'Tipo ativo' : 'Tipo inativo'}
              sx={{ color: 'text.secondary', userSelect: 'none' }}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={fecharDialog}
            disabled={salvando}
            sx={{
              borderRadius: `${shape.full}px`,
              textTransform: 'none',
              color: m3.onSurfaceVariant,
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={salvar}
            disabled={salvando}
            startIcon={salvando ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              borderRadius: `${shape.full}px`,
              textTransform: 'none',
              fontWeight: 500,
              bgcolor: m3.primary,
              color: m3.onPrimary,
              '&:hover': { bgcolor: m3.primary, filter: 'brightness(1.08)' },
            }}
          >
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar tipo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------------------------------------------------------- */}
      {/* Dialog confirmar exclusão                                         */}
      {/* ---------------------------------------------------------------- */}
      <Dialog
        open={excluindo !== null}
        onClose={fecharConfirmarExclusao}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: m3.surfaceContainerHigh,
              borderRadius: `${shape.extraLarge}px`,
              boxShadow: elev[3],
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 500, fontSize: 20 }}>Excluir tipo de serviço</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: m3.onSurfaceVariant }}>
            Tem certeza que deseja excluir o tipo de serviço{' '}
            <strong style={{ color: 'inherit' }}>{excluindo?.nome}</strong>? Esta ação não pode ser
            desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={fecharConfirmarExclusao}
            disabled={confirmandoExclusao}
            sx={{
              borderRadius: `${shape.full}px`,
              textTransform: 'none',
              color: m3.onSurfaceVariant,
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={confirmarExclusao}
            disabled={confirmandoExclusao}
            startIcon={confirmandoExclusao ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              borderRadius: `${shape.full}px`,
              textTransform: 'none',
              fontWeight: 500,
              bgcolor: m3.error,
              color: m3.onError,
              '&:hover': { bgcolor: m3.error, filter: 'brightness(1.08)' },
            }}
          >
            {confirmandoExclusao ? 'Excluindo…' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
