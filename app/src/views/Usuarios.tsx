// View de gestão de usuários — restrita a ADMIN.
// CRUD completo: listar, criar, editar, desativar (DELETE = desativação no backend).

import { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Skeleton from '@mui/material/Skeleton'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined'

import { api, ApiError } from '../lib/api'
import { PAPEIS, PAPEL_LABELS, type Papel, type Equipe, type NovoUsuario, type EditarUsuario, type UsuarioComEquipe } from '../lib/types'
import { formatarData } from '../lib/format'
import { useM3 } from '../theme/useM3'
import { shape } from '../theme/tokens'
import { useToast } from '../components/Toast'

// ---------- estado inicial dos formulários ----------

interface FormCriar {
  nome: string
  login: string
  senha: string
  papel: Papel
  equipeId: string // '' = sem equipe
}

interface FormEditar {
  nome: string
  login: string
  senha: string // opcional — só envia se preenchido
  papel: Papel
  equipeId: string // '' = sem equipe
  ativo: boolean
}

const formCriarVazio = (): FormCriar => ({
  nome: '',
  login: '',
  senha: '',
  papel: 'SUPERVISOR',
  equipeId: '',
})

// ---------- componente principal ----------

export default function Usuarios() {
  const { m3, elev } = useM3()
  const toast = useToast()

  // ---------- dados ----------
  const [usuarios, setUsuarios] = useState<UsuarioComEquipe[]>([])
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroPermissao, setErroPermissao] = useState<string | null>(null)

  // ---------- diálogo criar ----------
  const [dialCriar, setDialCriar] = useState(false)
  const [formCriar, setFormCriar] = useState<FormCriar>(formCriarVazio())
  const [salvandoCriar, setSalvandoCriar] = useState(false)

  // ---------- diálogo editar ----------
  const [dialEditar, setDialEditar] = useState<UsuarioComEquipe | null>(null)
  const [formEditar, setFormEditar] = useState<FormEditar>({
    nome: '',
    login: '',
    senha: '',
    papel: 'SUPERVISOR',
    equipeId: '',
    ativo: true,
  })
  const [salvandoEditar, setSalvandoEditar] = useState(false)

  // ---------- diálogo confirmar desativação ----------
  const [dialDesativar, setDialDesativar] = useState<UsuarioComEquipe | null>(null)
  const [desativando, setDesativando] = useState(false)

  // ---------- busca ----------

  const buscarDados = useCallback(async () => {
    setCarregando(true)
    setErroPermissao(null)
    try {
      const [listaUsuarios, listaEquipes] = await Promise.all([
        api.get<UsuarioComEquipe[]>('/usuarios'),
        api.get<Equipe[]>('/equipes'),
      ])
      setUsuarios(listaUsuarios)
      setEquipes(listaEquipes)
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setErroPermissao('Você não tem permissão para gerenciar usuários. Esta área é restrita a administradores.')
      } else {
        toast(e instanceof ApiError ? e.message : 'Erro ao carregar usuários')
      }
    } finally {
      setCarregando(false)
    }
  }, [toast])

  useEffect(() => {
    buscarDados()
  }, [buscarDados])

  // ---------- criar ----------

  function abrirCriar() {
    setFormCriar(formCriarVazio())
    setDialCriar(true)
  }

  async function salvarCriar() {
    if (!formCriar.nome.trim() || !formCriar.login.trim() || !formCriar.senha.trim()) {
      toast('Preencha os campos obrigatórios: nome, login e senha.')
      return
    }
    setSalvandoCriar(true)
    try {
      const corpo: NovoUsuario = {
        nome: formCriar.nome.trim(),
        login: formCriar.login.trim(),
        senha: formCriar.senha,
        papel: formCriar.papel,
        equipeId: formCriar.equipeId ? Number(formCriar.equipeId) : null,
      }
      await api.post('/usuarios', corpo)
      toast('Usuário criado com sucesso.')
      setDialCriar(false)
      buscarDados()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erro ao criar usuário')
    } finally {
      setSalvandoCriar(false)
    }
  }

  // ---------- editar ----------

  function abrirEditar(u: UsuarioComEquipe) {
    setFormEditar({
      nome: u.nome,
      login: u.login,
      senha: '',
      papel: u.papel,
      equipeId: u.equipeId != null ? String(u.equipeId) : '',
      ativo: u.ativo,
    })
    setDialEditar(u)
  }

  async function salvarEditar() {
    if (!dialEditar) return
    setSalvandoEditar(true)
    try {
      const corpo: EditarUsuario = {
        nome: formEditar.nome.trim() || undefined,
        login: formEditar.login.trim() || undefined,
        papel: formEditar.papel,
        equipeId: formEditar.equipeId ? Number(formEditar.equipeId) : null,
        ativo: formEditar.ativo,
      }
      // Só envia senha se preenchida
      if (formEditar.senha.trim()) {
        corpo.senha = formEditar.senha.trim()
      }
      await api.patch(`/usuarios/${dialEditar.id}`, corpo)
      toast('Usuário atualizado com sucesso.')
      setDialEditar(null)
      buscarDados()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erro ao atualizar usuário')
    } finally {
      setSalvandoEditar(false)
    }
  }

  // ---------- desativar ----------

  async function confirmarDesativar() {
    if (!dialDesativar) return
    setDesativando(true)
    try {
      await api.del(`/usuarios/${dialDesativar.id}`)
      toast('Usuário desativado com sucesso.')
      setDialDesativar(null)
      buscarDados()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erro ao desativar usuário')
    } finally {
      setDesativando(false)
    }
  }

  // ---------- render ----------

  const cardSx = {
    bgcolor: m3.surfaceContainerLow,
    borderRadius: `${shape.large}px`,
    boxShadow: elev[1],
    border: `1px solid ${m3.outlineVariant}`,
  }

  if (erroPermissao) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
        <PersonOffOutlinedIcon sx={{ fontSize: 56, color: m3.onSurfaceVariant }} />
        <Typography variant="h6" color="text.secondary" align="center">
          Acesso restrito
        </Typography>
        <Typography color="text.secondary" align="center" sx={{ maxWidth: 480 }}>
          {erroPermissao}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: m3.onSurface }}>
            Usuários
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie os usuários do sistema
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={abrirCriar}
          sx={{
            bgcolor: m3.primary,
            color: m3.onPrimary,
            borderRadius: `${shape.full}px`,
            px: 3,
            textTransform: 'none',
            fontWeight: 500,
            '&:hover': { bgcolor: m3.primary, filter: 'brightness(0.92)' },
          }}
        >
          Novo usuário
        </Button>
      </Box>

      {/* Tabela */}
      <Paper sx={{ ...cardSx, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="medium" aria-label="Tabela de usuários">
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: m3.surfaceContainer,
                  '& th': {
                    fontWeight: 600,
                    fontSize: 13,
                    color: m3.onSurfaceVariant,
                    borderBottom: `1px solid ${m3.outlineVariant}`,
                    whiteSpace: 'nowrap',
                  },
                }}
              >
                <TableCell>Nome</TableCell>
                <TableCell>Login</TableCell>
                <TableCell>Papel</TableCell>
                <TableCell>Equipe</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Criado em</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {carregando
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton variant="text" width={j === 6 ? 72 : '80%'} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : usuarios.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: m3.onSurfaceVariant }}>
                        Nenhum usuário cadastrado.
                      </TableCell>
                    </TableRow>
                  )
                  : usuarios.map((u) => (
                    <TableRow
                      key={u.id}
                      hover
                      sx={{
                        '& td': {
                          borderBottom: `1px solid ${m3.outlineVariant}`,
                          color: m3.onSurface,
                          fontSize: 14,
                        },
                        opacity: u.ativo ? 1 : 0.55,
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>{u.nome}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{u.login}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={PAPEL_LABELS[u.papel] ?? u.papel}
                          sx={{
                            bgcolor: u.papel === 'ADMIN' ? m3.primaryContainer : m3.secondaryContainer,
                            color: u.papel === 'ADMIN' ? m3.onPrimaryContainer : m3.onSecondaryContainer,
                            fontWeight: 500,
                            height: 24,
                          }}
                        />
                      </TableCell>
                      <TableCell>{u.equipe?.nome ?? <Typography component="span" sx={{ color: m3.onSurfaceVariant, fontSize: 13 }}>—</Typography>}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={u.ativo ? 'Ativo' : 'Inativo'}
                          sx={{
                            bgcolor: u.ativo ? m3.successContainer : m3.surfaceContainerHighest,
                            color: u.ativo ? m3.onSuccessContainer : m3.onSurfaceVariant,
                            fontWeight: 500,
                            height: 24,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatarData(u.criadoEm)}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title="Editar usuário">
                            <IconButton
                              size="small"
                              onClick={() => abrirEditar(u)}
                              aria-label={`Editar ${u.nome}`}
                              sx={{ color: m3.onSurfaceVariant }}
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={u.ativo ? 'Desativar usuário' : 'Usuário já inativo'}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => setDialDesativar(u)}
                                aria-label={`Desativar ${u.nome}`}
                                disabled={!u.ativo}
                                sx={{ color: m3.error }}
                              >
                                <PersonOffOutlinedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ===== Diálogo: Criar usuário ===== */}
      <Dialog
        open={dialCriar}
        onClose={() => !salvandoCriar && setDialCriar(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: m3.surfaceContainerLow,
              borderRadius: `${shape.extraLarge}px`,
              boxShadow: elev[3],
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: m3.onSurface, pb: 1 }}>
          Novo usuário
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField
            label="Nome completo *"
            value={formCriar.nome}
            onChange={(e) => setFormCriar((f) => ({ ...f, nome: e.target.value }))}
            fullWidth
            size="small"
            disabled={salvandoCriar}
            autoFocus
          />
          <TextField
            label="Login *"
            value={formCriar.login}
            onChange={(e) => setFormCriar((f) => ({ ...f, login: e.target.value }))}
            fullWidth
            size="small"
            disabled={salvandoCriar}
            autoComplete="username"
          />
          <TextField
            label="Senha *"
            type="password"
            value={formCriar.senha}
            onChange={(e) => setFormCriar((f) => ({ ...f, senha: e.target.value }))}
            fullWidth
            size="small"
            disabled={salvandoCriar}
            autoComplete="new-password"
          />
          <TextField
            select
            label="Papel *"
            value={formCriar.papel}
            onChange={(e) => setFormCriar((f) => ({ ...f, papel: e.target.value as Papel }))}
            fullWidth
            size="small"
            disabled={salvandoCriar}
          >
            {PAPEIS.map((p) => (
              <MenuItem key={p} value={p}>
                {PAPEL_LABELS[p]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Equipe"
            value={formCriar.equipeId}
            onChange={(e) => setFormCriar((f) => ({ ...f, equipeId: e.target.value }))}
            fullWidth
            size="small"
            disabled={salvandoCriar}
          >
            <MenuItem value="">Sem equipe</MenuItem>
            {equipes.map((eq) => (
              <MenuItem key={eq.id} value={String(eq.id)}>
                {eq.nome}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => setDialCriar(false)}
            disabled={salvandoCriar}
            sx={{ borderRadius: `${shape.full}px`, textTransform: 'none', color: m3.onSurfaceVariant }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={salvarCriar}
            disabled={salvandoCriar}
            startIcon={salvandoCriar ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              bgcolor: m3.primary,
              color: m3.onPrimary,
              borderRadius: `${shape.full}px`,
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': { bgcolor: m3.primary, filter: 'brightness(0.92)' },
            }}
          >
            {salvandoCriar ? 'Salvando…' : 'Criar usuário'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== Diálogo: Editar usuário ===== */}
      <Dialog
        open={dialEditar !== null}
        onClose={() => !salvandoEditar && setDialEditar(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: m3.surfaceContainerLow,
              borderRadius: `${shape.extraLarge}px`,
              boxShadow: elev[3],
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: m3.onSurface, pb: 1 }}>
          Editar usuário
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField
            label="Nome completo"
            value={formEditar.nome}
            onChange={(e) => setFormEditar((f) => ({ ...f, nome: e.target.value }))}
            fullWidth
            size="small"
            disabled={salvandoEditar}
            autoFocus
          />
          <TextField
            label="Login"
            value={formEditar.login}
            onChange={(e) => setFormEditar((f) => ({ ...f, login: e.target.value }))}
            fullWidth
            size="small"
            disabled={salvandoEditar}
            autoComplete="username"
          />
          <TextField
            label="Nova senha (deixe em branco para não alterar)"
            type="password"
            value={formEditar.senha}
            onChange={(e) => setFormEditar((f) => ({ ...f, senha: e.target.value }))}
            fullWidth
            size="small"
            disabled={salvandoEditar}
            autoComplete="new-password"
            helperText="Preencha apenas se quiser redefinir a senha."
          />
          <TextField
            select
            label="Papel"
            value={formEditar.papel}
            onChange={(e) => setFormEditar((f) => ({ ...f, papel: e.target.value as Papel }))}
            fullWidth
            size="small"
            disabled={salvandoEditar}
          >
            {PAPEIS.map((p) => (
              <MenuItem key={p} value={p}>
                {PAPEL_LABELS[p]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Equipe"
            value={formEditar.equipeId}
            onChange={(e) => setFormEditar((f) => ({ ...f, equipeId: e.target.value }))}
            fullWidth
            size="small"
            disabled={salvandoEditar}
          >
            <MenuItem value="">Sem equipe</MenuItem>
            {equipes.map((eq) => (
              <MenuItem key={eq.id} value={String(eq.id)}>
                {eq.nome}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            value={formEditar.ativo ? 'ativo' : 'inativo'}
            onChange={(e) => setFormEditar((f) => ({ ...f, ativo: e.target.value === 'ativo' }))}
            fullWidth
            size="small"
            disabled={salvandoEditar}
          >
            <MenuItem value="ativo">Ativo</MenuItem>
            <MenuItem value="inativo">Inativo</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => setDialEditar(null)}
            disabled={salvandoEditar}
            sx={{ borderRadius: `${shape.full}px`, textTransform: 'none', color: m3.onSurfaceVariant }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={salvarEditar}
            disabled={salvandoEditar}
            startIcon={salvandoEditar ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              bgcolor: m3.primary,
              color: m3.onPrimary,
              borderRadius: `${shape.full}px`,
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': { bgcolor: m3.primary, filter: 'brightness(0.92)' },
            }}
          >
            {salvandoEditar ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== Diálogo: Confirmar desativação ===== */}
      <Dialog
        open={dialDesativar !== null}
        onClose={() => !desativando && setDialDesativar(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: m3.surfaceContainerLow,
              borderRadius: `${shape.extraLarge}px`,
              boxShadow: elev[3],
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: m3.onSurface }}>
          Desativar usuário?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: m3.onSurfaceVariant }}>
            O usuário <strong>{dialDesativar?.nome}</strong> será desativado e não poderá mais acessar o
            sistema. Esta ação pode ser revertida editando o usuário.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => setDialDesativar(null)}
            disabled={desativando}
            sx={{ borderRadius: `${shape.full}px`, textTransform: 'none', color: m3.onSurfaceVariant }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={confirmarDesativar}
            disabled={desativando}
            startIcon={desativando ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              bgcolor: m3.error,
              color: m3.onError,
              borderRadius: `${shape.full}px`,
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': { bgcolor: m3.error, filter: 'brightness(0.92)' },
            }}
          >
            {desativando ? 'Desativando…' : 'Desativar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
