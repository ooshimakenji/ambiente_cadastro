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
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import { useM3 } from '../theme/useM3'
import { shape } from '../theme/tokens'
import { api, ApiError } from '../lib/api'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { formatarData } from '../lib/format'
import type { Equipe, NovaEquipe, EditarEquipe } from '../lib/types'

// -----------------------------------------------------------------------
// Equipes — CRUD completo (GET / POST / PATCH / DELETE /equipes)
// -----------------------------------------------------------------------

// --- Estado do dialog de criar / editar ---
interface FormState {
  nome: string
  descricao: string
  ativo: boolean
}

const formVazio: FormState = { nome: '', descricao: '', ativo: true }

export default function Equipes() {
  const { m3, elev } = useM3()
  const toast = useToast()
  const { usuario } = useAuth()
  const isAdmin = usuario?.papel === 'ADMIN'

  // Lista
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [carregando, setCarregando] = useState(true)

  // Dialog criar / editar
  const [dialogAberto, setDialogAberto] = useState(false)
  const [editando, setEditando] = useState<Equipe | null>(null)
  const [form, setForm] = useState<FormState>(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [erroNome, setErroNome] = useState('')

  // Dialog confirmar exclusão
  const [excluindo, setExcluindo] = useState<Equipe | null>(null)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  // -----------------------------------------------------------------------
  // Carregar lista
  // -----------------------------------------------------------------------
  async function carregar() {
    setCarregando(true)
    try {
      const dados = await api.get<Equipe[]>('/equipes')
      setEquipes(dados)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao carregar equipes'
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

  function abrirEditar(equipe: Equipe) {
    setEditando(equipe)
    setForm({ nome: equipe.nome, descricao: equipe.descricao ?? '', ativo: equipe.ativo })
    setErroNome('')
    setDialogAberto(true)
  }

  function fecharDialog() {
    if (salvando) return
    setDialogAberto(false)
  }

  function abrirConfirmarExclusao(equipe: Equipe) {
    setExcluindo(equipe)
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
        const corpo: EditarEquipe = {
          nome: nomeLimpo,
          descricao: form.descricao.trim() || null,
          ativo: form.ativo,
        }
        await api.patch<Equipe>(`/equipes/${editando.id}`, corpo)
        toast('Equipe atualizada com sucesso')
      } else {
        const corpo: NovaEquipe = {
          nome: nomeLimpo,
          descricao: form.descricao.trim() || null,
        }
        await api.post<Equipe>('/equipes', corpo)
        toast('Equipe criada com sucesso')
      }
      setDialogAberto(false)
      await carregar()
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao salvar equipe'
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
      await api.del(`/equipes/${excluindo.id}`)
      toast('Equipe excluída com sucesso')
      setExcluindo(null)
      await carregar()
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao excluir equipe'
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
          <GroupOutlinedIcon sx={{ color: m3.primary, fontSize: 28 }} />
          <Box>
            <Typography variant="h1" sx={{ fontSize: 22, fontWeight: 500 }}>
              Equipes
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gerencie as equipes de campo
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
            Nova equipe
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
        ) : equipes.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <GroupOutlinedIcon sx={{ fontSize: 48, color: m3.outlineVariant, mb: 1 }} />
            <Typography color="text.secondary">Nenhuma equipe cadastrada</Typography>
            <Typography variant="caption" color="text.secondary">
              Clique em "Nova equipe" para começar
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
                  <TableCell>Descrição</TableCell>
                  <TableCell align="center">Situação</TableCell>
                  <TableCell>Criado em</TableCell>
                  <TableCell align="right" sx={{ pr: 2 }}>
                    Ações
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {equipes.map((equipe) => (
                  <TableRow
                    key={equipe.id}
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
                      <Typography sx={{ fontWeight: 500, fontSize: 14 }}>{equipe.nome}</Typography>
                    </TableCell>
                    <TableCell sx={{ color: m3.onSurfaceVariant, maxWidth: 320 }}>
                      <Typography
                        noWrap
                        sx={{ fontSize: 14, color: equipe.descricao ? 'inherit' : m3.outlineVariant }}
                      >
                        {equipe.descricao ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={equipe.ativo ? 'Ativa' : 'Inativa'}
                        sx={{
                          fontWeight: 500,
                          height: 24,
                          bgcolor: equipe.ativo ? m3.successContainer : m3.surfaceContainerHighest,
                          color: equipe.ativo ? m3.onSuccessContainer : m3.onSurfaceVariant,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: m3.onSurfaceVariant, whiteSpace: 'nowrap' }}>
                      {formatarData(equipe.criadoEm)}
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 1 }}>
                      {isAdmin ? (
                        <>
                          <Tooltip title="Editar equipe">
                            <IconButton
                              size="small"
                              onClick={() => abrirEditar(equipe)}
                              sx={{ color: m3.onSurfaceVariant, mr: 0.5 }}
                              aria-label={`Editar equipe ${equipe.nome}`}
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir equipe">
                            <IconButton
                              size="small"
                              onClick={() => abrirConfirmarExclusao(equipe)}
                              sx={{ color: m3.error }}
                              aria-label={`Excluir equipe ${equipe.nome}`}
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
          {editando ? 'Editar equipe' : 'Nova equipe'}
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

          <TextField
            label="Descrição"
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            value={form.descricao}
            onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            helperText={`${form.descricao.length}/500`}
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
              label={form.ativo ? 'Equipe ativa' : 'Equipe inativa'}
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
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar equipe'}
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
        <DialogTitle sx={{ fontWeight: 500, fontSize: 20 }}>Excluir equipe</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: m3.onSurfaceVariant }}>
            Tem certeza que deseja excluir a equipe{' '}
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
