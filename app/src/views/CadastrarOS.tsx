import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined'
import { useM3 } from '../theme/useM3'
import { shape } from '../theme/tokens'
import { api, ApiError } from '../lib/api'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { formatarData } from '../lib/format'
import type {
  TipoServico,
  Equipe,
  UsuarioComEquipe,
  OrdemServicoExpandida,
  NovaOrdem,
} from '../lib/types'
import { STATUS_OS_LABELS } from '../lib/types'

// -----------------------------------------------------------------------
// CadastrarOS — Formulário de cadastro/re-despacho de Ordem de Serviço
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

  // Estado de re-despacho: OS já existente encontrada para o sequencial
  const [osExistente, setOsExistente] = useState<OrdemServicoExpandida | null>(null)
  const [buscandoSequencial, setBuscandoSequencial] = useState(false)

  // Listas carregadas da API
  const [tipos, setTipos] = useState<TipoServico[]>([])
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioComEquipe[]>([])
  const [carregando, setCarregando] = useState(true)

  const sequencialRef = useRef<HTMLInputElement>(null)
  // ref para focar o campo de tipo ao pressionar Enter no sequencial sem tipo preenchido
  const tipoInputRef = useRef<HTMLInputElement>(null)

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
    setOsExistente(null)
    // Refoca o campo sequencial para próximo bip
    setTimeout(() => sequencialRef.current?.focus(), 50)
  }

  // Consulta a API para ver se o sequencial já existe
  async function verificarSequencial(seq: string): Promise<OrdemServicoExpandida | null> {
    const seqTrim = seq.trim()
    if (!seqTrim) {
      setOsExistente(null)
      return null
    }
    setBuscandoSequencial(true)
    try {
      const lista = await api.get<OrdemServicoExpandida[]>(
        `/ordens?sequencial=${encodeURIComponent(seqTrim)}`,
      )
      const encontrada = lista && lista.length > 0 ? lista[0] : null
      setOsExistente(encontrada)
      return encontrada
    } catch {
      // falha silenciosa — não bloqueia o cadastro
      setOsExistente(null)
      return null
    } finally {
      setBuscandoSequencial(false)
    }
  }

  // `existente` pode ser passado explicitamente (fluxo Enter) para evitar
  // depender do estado, que ainda não reflete a verificação recém-disparada.
  async function cadastrar(existente?: OrdemServicoExpandida | null) {
    if (!sequencial.trim() || tipoServicoId === '') return

    const os = existente !== undefined ? existente : osExistente
    // Re-despacho de OS cancelada é bloqueado pelo backend (409); avisamos antes.
    if (os && os.status === 'CANCELADA') {
      toast(`OS ${sequencial.trim()} está cancelada — não é possível adicionar saída.`)
      return
    }

    setEnviando(true)
    try {
      const body: NovaOrdem = {
        sequencial: sequencial.trim(),
        tipoServicoId: tipoServicoId as number,
        equipeId: equipeId !== '' ? (equipeId as number) : null,
        responsavelId: responsavelId !== '' ? (responsavelId as number) : null,
        anotacoes: anotacoes.trim() || null,
      }
      await api.post<OrdemServicoExpandida>('/ordens', body)
      const msg = os
        ? `Nova saída criada para OS ${sequencial.trim()}`
        : `OS ${sequencial.trim()} cadastrada com sucesso`
      toast(msg)
      limparForm()
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao cadastrar OS'
      toast(msg)
    } finally {
      setEnviando(false)
    }
  }

  async function handleSequencialKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (!sequencial.trim() || enviando) return
    // Aguarda a verificação para decidir mensagem/bloqueio com dado fresco.
    const encontrada = await verificarSequencial(sequencial)
    if (tipoServicoId === '') {
      // Move foco para o campo de tipo (Autocomplete)
      tipoInputRef.current?.focus()
      return
    }
    // Tudo preenchido (mínimo obrigatório) — submete
    cadastrar(encontrada)
  }

  function handleSequencialBlur() {
    verificarSequencial(sequencial)
  }

  const cancelada = osExistente?.status === 'CANCELADA'
  const desabilitado = !sequencial.trim() || tipoServicoId === '' || enviando || cancelada

  // Resumo da última saída da OS existente
  const ultimaSaida =
    osExistente && osExistente.saidas.length > 0
      ? osExistente.saidas[osExistente.saidas.length - 1]
      : null

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
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <TextField
            label="Sequencial *"
            placeholder="Bipe aqui a ordem de serviço"
            value={sequencial}
            onChange={(e) => {
              setSequencial(e.target.value)
              // Limpa resumo ao digitar novo sequencial
              if (osExistente) setOsExistente(null)
            }}
            onKeyDown={handleSequencialKeyDown}
            onBlur={handleSequencialBlur}
            inputRef={sequencialRef}
            autoFocus
            fullWidth
            size="medium"
            disabled={carregando || enviando}
            slotProps={{ htmlInput: { maxLength: 80, autoComplete: 'off' } }}
          />
          {buscandoSequencial && (
            <CircularProgress size={20} sx={{ mt: 1.8, color: m3.primary, flexShrink: 0 }} />
          )}
        </Box>

        {/* Resumo da OS existente (re-despacho) */}
        {osExistente && (
          <>
            <Box
              sx={{
                bgcolor: m3.secondaryContainer,
                borderRadius: `${shape.medium}px`,
                p: 2,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: m3.onSecondaryContainer,
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: '.8px',
                  textTransform: 'uppercase',
                  display: 'block',
                  mb: 1,
                }}
              >
                OS já existente — re-despacho
              </Typography>
              {cancelada && (
                <Typography
                  sx={{
                    color: m3.error,
                    fontWeight: 600,
                    fontSize: 13,
                    mb: 1,
                  }}
                >
                  OS cancelada — não é possível adicionar nova saída.
                </Typography>
              )}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: m3.onSecondaryContainer, opacity: 0.7 }}>
                    Sequencial
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: m3.onSecondaryContainer }}>
                    {osExistente.sequencial}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: m3.onSecondaryContainer, opacity: 0.7 }}>
                    Status
                  </Typography>
                  <Box>
                    <Chip
                      size="small"
                      label={STATUS_OS_LABELS[osExistente.status]}
                      sx={{
                        fontWeight: 500,
                        height: 22,
                        bgcolor: m3.surfaceContainerHigh,
                        color: m3.onSurface,
                      }}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: m3.onSecondaryContainer, opacity: 0.7 }}>
                    Tipo de serviço
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: m3.onSecondaryContainer }}>
                    {osExistente.tipoServico?.nome ?? '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: m3.onSecondaryContainer, opacity: 0.7 }}>
                    Nº de saídas
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: m3.onSecondaryContainer }}>
                    {osExistente.saidas.length}
                  </Typography>
                </Box>
                {ultimaSaida && (
                  <>
                    <Box>
                      <Typography variant="caption" sx={{ color: m3.onSecondaryContainer, opacity: 0.7 }}>
                        Última saída — Equipe
                      </Typography>
                      <Typography sx={{ fontSize: 14, color: m3.onSecondaryContainer }}>
                        {ultimaSaida.equipe?.nome ?? '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: m3.onSecondaryContainer, opacity: 0.7 }}>
                        Última saída — Desfecho
                      </Typography>
                      <Typography sx={{ fontSize: 14, color: m3.onSecondaryContainer }}>
                        {ultimaSaida.status === 'EM_CAMPO'
                          ? 'Em campo (aberta)'
                          : ultimaSaida.status === 'CONCLUIDA'
                          ? 'Concluída'
                          : ultimaSaida.status === 'NAO_REALIZADO'
                          ? 'Não realizado'
                          : 'Cancelada'}
                      </Typography>
                    </Box>
                    <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                      <Typography variant="caption" sx={{ color: m3.onSecondaryContainer, opacity: 0.7 }}>
                        Última saída em
                      </Typography>
                      <Typography sx={{ fontSize: 14, color: m3.onSecondaryContainer }}>
                        {formatarData(ultimaSaida.criadoEm)}
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
            </Box>
            <Divider />
          </>
        )}

        {/* Tipo de serviço — pesquisável (digite para filtrar) */}
        <Autocomplete
          options={tipos}
          getOptionLabel={(t) => t.nome}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={tipos.find((t) => t.id === tipoServicoId) ?? null}
          onChange={(_e, v) => setTipoServicoId(v?.id ?? '')}
          disabled={carregando || enviando}
          fullWidth
          noOptionsText="Nenhum tipo encontrado"
          renderInput={(params) => (
            <TextField
              {...params}
              label="Tipo de serviço *"
              required
              inputRef={tipoInputRef}
              placeholder="Digite para filtrar"
            />
          )}
        />

        {/* Equipe (opcional) — pesquisável */}
        <Autocomplete
          options={equipes}
          getOptionLabel={(eq) => eq.nome}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={equipes.find((eq) => eq.id === equipeId) ?? null}
          onChange={(_e, v) => setEquipeId(v?.id ?? '')}
          disabled={carregando || enviando}
          fullWidth
          noOptionsText="Nenhuma equipe encontrada"
          renderInput={(params) => (
            <TextField
              {...params}
              label="Equipe"
              placeholder="Sem equipe (OS aberta sem saída)"
              helperText="Com equipe: já abre uma saída em campo. Sem equipe: OS aberta sem saída."
            />
          )}
        />

        {/* Responsável — pesquisável (só ADMIN) */}
        {usuario?.papel === 'ADMIN' ? (
          <Autocomplete
            options={usuarios}
            getOptionLabel={(u) => u.nome}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            value={usuarios.find((u) => u.id === responsavelId) ?? null}
            onChange={(_e, v) => setResponsavelId(v?.id ?? '')}
            disabled={carregando || enviando}
            fullWidth
            noOptionsText="Nenhum usuário encontrado"
            renderInput={(params) => (
              <TextField {...params} label="Responsável" placeholder="Selecione um responsável" />
            )}
          />
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

        {/* Botões: Limpar + submit */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="large"
            disabled={enviando || carregando}
            onClick={limparForm}
            sx={{
              borderRadius: `${shape.full}px`,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: 16,
              color: m3.onSurfaceVariant,
              borderColor: m3.outlineVariant,
              flexShrink: 0,
              px: 3,
            }}
          >
            Limpar
          </Button>
          <Button
            variant="contained"
            fullWidth
            size="large"
            disabled={desabilitado || carregando}
            onClick={() => cadastrar()}
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
              ? osExistente
                ? 'Criando saída…'
                : 'Cadastrando…'
              : osExistente
              ? 'Cadastrar nova saída'
              : 'Cadastrar e atribuir'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
