import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'
import FormHelperText from '@mui/material/FormHelperText'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined'
import { useM3 } from '../theme/useM3'
import { shape } from '../theme/tokens'
import { api, ApiError } from '../lib/api'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import type { TipoServico, Equipe, UsuarioComEquipe, OrdemServico, NovaOrdem } from '../lib/types'

// -----------------------------------------------------------------------
// CadastrarOS — Formulário de cadastro de Ordem de Serviço
// -----------------------------------------------------------------------

export default function CadastrarOS() {
  const { m3, elev } = useM3()
  const toast = useToast()
  const { usuario } = useAuth()

  // Dados do formulário
  const [sequencial, setSequencial] = useState('')
  const [tipoServicoId, setTipoServicoId] = useState<number | ''>('')
  const [equipeId, setEquipeId] = useState<number | ''>('')
  const [responsavelId, setResponsavelId] = useState<number | ''>(usuario?.id ?? '')
  const [anotacoes, setAnotacoes] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Listas carregadas da API
  const [tipos, setTipos] = useState<TipoServico[]>([])
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioComEquipe[]>([])
  const [carregando, setCarregando] = useState(true)

  const sequencialRef = useRef<HTMLInputElement>(null)
  // ref para focar o select de tipo ao pressionar Enter no sequencial sem tipo preenchido
  const tipoSelectRef = useRef<HTMLDivElement>(null)

  // Carregar listas ao montar
  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      try {
        const [tiposData, equipesData] = await Promise.all([
          api.get<TipoServico[]>('/tipos'),
          api.get<Equipe[]>('/equipes'),
        ])
        setTipos(tiposData.filter((t) => t.ativo))
        setEquipes(equipesData.filter((e) => e.ativo))

        // Só carrega usuários se for ADMIN (evita 403)
        if (usuario?.papel === 'ADMIN') {
          const usuariosData = await api.get<UsuarioComEquipe[]>('/usuarios')
          setUsuarios(usuariosData.filter((u) => u.ativo))
        }
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Erro ao carregar dados'
        toast(msg)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sincroniza responsavelId quando o usuário é carregado
  useEffect(() => {
    if (usuario && responsavelId === '') {
      setResponsavelId(usuario.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario])

  function limparForm() {
    setSequencial('')
    setTipoServicoId('')
    setEquipeId('')
    setResponsavelId(usuario?.id ?? '')
    setAnotacoes('')
    // Refoca o campo sequencial para próximo bip
    setTimeout(() => sequencialRef.current?.focus(), 50)
  }

  async function cadastrar() {
    if (!sequencial.trim() || tipoServicoId === '') return

    setEnviando(true)
    try {
      const body: NovaOrdem = {
        sequencial: sequencial.trim(),
        tipoServicoId: tipoServicoId as number,
        equipeId: equipeId !== '' ? (equipeId as number) : null,
        responsavelId: responsavelId !== '' ? (responsavelId as number) : null,
        anotacoes: anotacoes.trim() || null,
      }
      await api.post<OrdemServico>('/ordens', body)
      toast(`OS ${sequencial.trim()} cadastrada com sucesso`)
      limparForm()
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast(`Já existe uma OS com este sequencial`)
      } else {
        const msg = e instanceof ApiError ? e.message : 'Erro ao cadastrar OS'
        toast(msg)
      }
    } finally {
      setEnviando(false)
    }
  }

  function handleSequencialKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (!sequencial.trim()) return
    if (tipoServicoId === '') {
      // Move foco para o select de tipo
      const selectEl = tipoSelectRef.current?.querySelector('div[role="combobox"]') as HTMLElement | null
      selectEl?.focus()
      return
    }
    // Tudo preenchido (mínimo obrigatório) — submete
    cadastrar()
  }

  const desabilitado = !sequencial.trim() || tipoServicoId === '' || enviando

  return (
    <Box>
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <AddCircleOutlineIcon sx={{ color: m3.primary, fontSize: 28 }} />
        <Box>
          <Typography variant="h1" sx={{ fontSize: 22, fontWeight: 500 }}>
            Cadastrar OS
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Registre uma nova Ordem de Serviço
          </Typography>
        </Box>
      </Box>

      {/* Formulário */}
      <Paper
        elevation={0}
        sx={{
          maxWidth: 700,
          bgcolor: m3.surfaceContainerLow,
          borderRadius: `${shape.large}px`,
          boxShadow: elev[1],
          p: { xs: 2.5, sm: 4 },
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {/* Campo sequencial — autoFocus, bip de leitor */}
        <TextField
          label="Sequencial *"
          placeholder="Bipe aqui a ordem de serviço"
          value={sequencial}
          onChange={(e) => setSequencial(e.target.value)}
          onKeyDown={handleSequencialKeyDown}
          inputRef={sequencialRef}
          autoFocus
          fullWidth
          size="medium"
          disabled={carregando || enviando}
          slotProps={{ htmlInput: { maxLength: 80, autoComplete: 'off' } }}
        />

        {/* Tipo de serviço */}
        <FormControl fullWidth required disabled={carregando || enviando} ref={tipoSelectRef}>
          <InputLabel id="tipo-label">Tipo de serviço *</InputLabel>
          <Select
            labelId="tipo-label"
            label="Tipo de serviço *"
            value={tipoServicoId}
            onChange={(e) => setTipoServicoId(e.target.value as number | '')}
          >
            {tipos.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.nome}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Equipe (opcional) */}
        <FormControl fullWidth disabled={carregando || enviando}>
          <InputLabel id="equipe-label">Equipe</InputLabel>
          <Select
            labelId="equipe-label"
            label="Equipe"
            value={equipeId}
            onChange={(e) => setEquipeId(e.target.value as number | '')}
          >
            <MenuItem value="">— Nenhuma (ficará Pendente) —</MenuItem>
            {equipes.map((eq) => (
              <MenuItem key={eq.id} value={eq.id}>
                {eq.nome}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText sx={{ color: m3.onSurfaceVariant }}>
            Sem equipe: OS fica Pendente; com equipe: já entra em Atendimento
          </FormHelperText>
        </FormControl>

        {/* Responsável */}
        {usuario?.papel === 'ADMIN' ? (
          <FormControl fullWidth disabled={carregando || enviando}>
            <InputLabel id="responsavel-label">Responsável</InputLabel>
            <Select
              labelId="responsavel-label"
              label="Responsável"
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value as number | '')}
            >
              {usuarios.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <TextField
            label="Responsável"
            value={usuario?.nome ?? ''}
            fullWidth
            disabled
            slotProps={{ htmlInput: { readOnly: true } }}
          />
        )}

        {/* Anotações */}
        <TextField
          label="Anotações"
          value={anotacoes}
          onChange={(e) => setAnotacoes(e.target.value)}
          fullWidth
          multiline
          rows={3}
          disabled={carregando || enviando}
          slotProps={{ htmlInput: { maxLength: 1000 } }}
          helperText={`${anotacoes.length}/1000`}
        />

        {/* Botão de submit */}
        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={desabilitado || carregando}
          onClick={cadastrar}
          startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : undefined}
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
          {enviando ? 'Cadastrando…' : 'Cadastrar e atribuir'}
        </Button>
      </Paper>
    </Box>
  )
}
