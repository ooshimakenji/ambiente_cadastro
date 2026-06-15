import { useCallback, useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined'
import NightsStayOutlinedIcon from '@mui/icons-material/NightsStayOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useM3 } from '../theme/useM3'
import { shape } from '../theme/tokens'
import { api, ApiError } from '../lib/api'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { formatarData } from '../lib/format'
import type { FolhaEnvio, UsuarioComEquipe, NovaFolhaLote, FolhaLoteResultado, Periodo } from '../lib/types'
import { PERIODO_LABELS } from '../lib/types'

// -----------------------------------------------------------------------
// FolhasCasa — Registro de envio de folhas físicas ao Ambiente 2
// -----------------------------------------------------------------------

export default function FolhasCasa() {
  const { m3, elev } = useM3()
  const toast = useToast()
  const { usuario } = useAuth()

  // Form — sessão de lote: período/quem recebeu/descrição compartilhados; vários sequenciais bipados.
  const [sequencial, setSequencial] = useState('')
  const [bipados, setBipados] = useState<string[]>([])
  const [periodo, setPeriodo] = useState<Periodo>('MANHA')
  const [descricao, setDescricao] = useState('')
  const [recebidoPorId, setRecebidoPorId] = useState<number | ''>(usuario?.id ?? '')
  const [enviando, setEnviando] = useState(false)

  // Lista
  const [folhas, setFolhas] = useState<FolhaEnvio[]>([])
  const [carregando, setCarregando] = useState(true)

  // Usuários (só ADMIN)
  const [usuarios, setUsuarios] = useState<UsuarioComEquipe[]>([])
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false)

  const sequencialRef = useRef<HTMLInputElement>(null)

  // Sincroniza recebidoPorId quando o usuário carrega
  useEffect(() => {
    if (usuario && recebidoPorId === '') {
      setRecebidoPorId(usuario.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario])

  // Carrega lista de folhas e, se ADMIN, usuários
  const carregarFolhas = useCallback(async () => {
    setCarregando(true)
    try {
      const dados = await api.get<FolhaEnvio[]>('/folhas')
      // Mais recentes primeiro
      setFolhas([...dados].reverse())
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao carregar folhas'
      toast(msg)
    } finally {
      setCarregando(false)
    }
  }, [toast])

  useEffect(() => {
    carregarFolhas()
  }, [carregarFolhas])

  useEffect(() => {
    if (usuario?.papel !== 'ADMIN') return
    async function carregarUsuarios() {
      setCarregandoUsuarios(true)
      try {
        const dados = await api.get<UsuarioComEquipe[]>('/usuarios')
        setUsuarios(dados.filter((u) => u.ativo))
      } catch {
        // falha silenciosa
      } finally {
        setCarregandoUsuarios(false)
      }
    }
    carregarUsuarios()
  }, [usuario])

  function focarSequencial() {
    setTimeout(() => sequencialRef.current?.focus(), 50)
  }

  // Adiciona o sequencial bipado à lista do lote (dedup, ignora vazio).
  function adicionarBipado() {
    const seq = sequencial.trim()
    if (!seq) return
    if (bipados.includes(seq)) {
      toast(`Sequencial ${seq} já adicionado`)
      setSequencial('')
      focarSequencial()
      return
    }
    setBipados((prev) => [...prev, seq])
    setSequencial('')
    focarSequencial()
  }

  function removerBipado(seq: string) {
    setBipados((prev) => prev.filter((s) => s !== seq))
  }

  function handleSequencialKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      adicionarBipado()
    }
  }

  // Registra todos os bipados de uma vez via POST /folhas/lote.
  async function registrarLote() {
    // Inclui um sequencial pendente no campo, se houver (sem precisar dar Enter antes).
    const seqPendente = sequencial.trim()
    const lista = seqPendente && !bipados.includes(seqPendente) ? [...bipados, seqPendente] : bipados
    if (lista.length === 0) return

    setEnviando(true)
    try {
      const body: NovaFolhaLote = {
        periodo,
        descricao: descricao.trim() || null,
        recebidoPorId: recebidoPorId !== '' ? (recebidoPorId as number) : null,
        sequenciais: lista,
      }
      const res = await api.post<FolhaLoteResultado>('/folhas/lote', body)
      const nCriadas = res.criadas.length
      if (nCriadas > 0) toast(`${nCriadas} folha(s) registrada(s)`)
      if (res.naoEncontradas.length > 0) {
        toast(`Sem OS para: ${res.naoEncontradas.join(', ')}`)
        // Mantém só os não encontrados na lista para o usuário revisar/corrigir.
        setBipados(res.naoEncontradas)
        setSequencial('')
      } else {
        setBipados([])
        setSequencial('')
        setDescricao('')
      }
      focarSequencial()
      carregarFolhas()
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao registrar lote'
      toast(msg)
    } finally {
      setEnviando(false)
    }
  }

  const totalLote = bipados.length + (sequencial.trim() && !bipados.includes(sequencial.trim()) ? 1 : 0)
  const desabilitado = totalLote === 0 || enviando

  return (
    <Box>
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <HomeOutlinedIcon sx={{ color: m3.primary, fontSize: 28 }} />
        <Box>
          <Typography variant="h1" sx={{ fontSize: 22, fontWeight: 500 }}>
            Folhas à Casa
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Rastreabilidade do envio das folhas físicas
          </Typography>
        </Box>
      </Box>

      {/* Aviso de rastreabilidade */}
      <Alert
        severity="info"
        sx={{
          mb: 3,
          maxWidth: 700,
          borderRadius: `${shape.medium}px`,
          bgcolor: m3.primaryContainer,
          color: m3.onPrimaryContainer,
          '& .MuiAlert-icon': { color: m3.primary },
        }}
      >
        Registro de rastreabilidade — não altera o status da OS nem atribui responsabilidade a quem envia.
      </Alert>

      {/* Formulário de bipagem */}
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
          mb: 4,
        }}
      >
        {/* Sequencial — bipe e pressione Enter para adicionar à lista */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            label="Sequencial *"
            placeholder="Bipe a OS e pressione Enter"
            value={sequencial}
            onChange={(e) => setSequencial(e.target.value)}
            onKeyDown={handleSequencialKeyDown}
            inputRef={sequencialRef}
            autoFocus
            fullWidth
            size="medium"
            disabled={enviando}
            helperText="Bipe vários sequenciais — cada Enter adiciona um à lista abaixo"
            slotProps={{ htmlInput: { maxLength: 80, autoComplete: 'off' } }}
          />

          {bipados.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ color: m3.onSurfaceVariant, fontWeight: 600 }}>
                {bipados.length} sequencial(is) na lista
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {bipados.map((seq) => (
                  <Chip
                    key={seq}
                    label={seq}
                    onDelete={enviando ? undefined : () => removerBipado(seq)}
                    disabled={enviando}
                    sx={{
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      bgcolor: m3.secondaryContainer,
                      color: m3.onSecondaryContainer,
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* Período */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: m3.onSurface, fontSize: 15 }}>
            Período *
          </Typography>
          <ToggleButtonGroup
            value={periodo}
            exclusive
            onChange={(_, v: Periodo | null) => {
              if (v) setPeriodo(v)
            }}
            aria-label="Período do envio"
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
            <ToggleButton value="MANHA" aria-label={PERIODO_LABELS.MANHA}>
              <WbSunnyOutlinedIcon fontSize="small" />
              {PERIODO_LABELS.MANHA}
            </ToggleButton>
            <ToggleButton value="TARDE" aria-label={PERIODO_LABELS.TARDE}>
              <NightsStayOutlinedIcon fontSize="small" />
              {PERIODO_LABELS.TARDE}
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Descrição (opcional) */}
        <TextField
          label="Descrição (opcional)"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          fullWidth
          multiline
          rows={2}
          disabled={enviando}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          helperText={`${descricao.length}/500`}
        />

        {/* Quem recebeu — pesquisável (só ADMIN) */}
        {usuario?.papel === 'ADMIN' ? (
          <Autocomplete
            options={usuarios}
            getOptionLabel={(u) => u.nome}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            value={usuarios.find((u) => u.id === recebidoPorId) ?? null}
            onChange={(_e, v) => setRecebidoPorId(v?.id ?? '')}
            disabled={enviando || carregandoUsuarios}
            fullWidth
            noOptionsText="Nenhum usuário encontrado"
            renderInput={(params) => (
              <TextField {...params} label="Quem recebeu" placeholder="Selecione quem recebeu" />
            )}
          />
        ) : (
          <TextField
            label="Quem recebeu"
            value={usuario?.nome ?? ''}
            fullWidth
            disabled
            slotProps={{ htmlInput: { readOnly: true } }}
          />
        )}

        {/* Botão registrar */}
        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={desabilitado}
          onClick={registrarLote}
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
          {enviando
            ? 'Registrando…'
            : totalLote > 0
              ? `Registrar ${totalLote} folha(s)`
              : 'Registrar folhas'}
        </Button>
      </Paper>

      {/* Lista de folhas registradas */}
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
            <Typography sx={{ fontWeight: 500, fontSize: 16 }}>Folhas registradas</Typography>
            <Typography variant="caption" color="text.secondary">
              Histórico de envios (mais recentes primeiro)
            </Typography>
          </Box>
          <Tooltip title="Atualizar lista">
            <span>
              <IconButton
                onClick={carregarFolhas}
                disabled={carregando}
                aria-label="Atualizar lista de folhas"
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
        ) : folhas.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <HomeOutlinedIcon sx={{ fontSize: 48, color: m3.outlineVariant, mb: 1 }} />
            <Typography color="text.secondary">Nenhuma folha registrada ainda</Typography>
            <Typography variant="caption" color="text.secondary">
              Registre o envio de uma folha usando o formulário acima
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
                  <TableCell>Período</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Quem recebeu</TableCell>
                  <TableCell>Registrado por</TableCell>
                  <TableCell>Data</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {folhas.map((folha) => (
                  <TableRow
                    key={folha.id}
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
                        {folha.sequencial ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: m3.onSurfaceVariant }}>
                      {PERIODO_LABELS[folha.periodo]}
                    </TableCell>
                    <TableCell
                      sx={{ color: m3.onSurfaceVariant, maxWidth: 240 }}
                    >
                      <Typography
                        noWrap
                        sx={{ fontSize: 14, color: folha.descricao ? 'inherit' : m3.outlineVariant }}
                      >
                        {folha.descricao ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: m3.onSurfaceVariant }}>
                      {folha.recebidoPor?.nome ?? '—'}
                    </TableCell>
                    <TableCell sx={{ color: m3.onSurfaceVariant }}>
                      {folha.criadoPor?.nome ?? '—'}
                    </TableCell>
                    <TableCell sx={{ color: m3.onSurfaceVariant, whiteSpace: 'nowrap' }}>
                      {formatarData(folha.criadoEm)}
                    </TableCell>
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
