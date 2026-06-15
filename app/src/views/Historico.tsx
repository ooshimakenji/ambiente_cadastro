// View de log global de auditoria.
// Busca GET /eventos (com filtros) e GET /usuarios (para o filtro de autor).
// Se o usuário não tiver permissão para /usuarios (403), omite o filtro de autor.

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
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import { api, ApiError } from '../lib/api'
import { useToast } from '../components/Toast'
import { useM3 } from '../theme/useM3'
import { shape } from '../theme/tokens'
import { formatarData } from '../lib/format'
import Filtros from '../components/Filtros'
import type {
  EventoAuditoriaComAutor,
  FiltroEventos,
  Usuario,
} from '../lib/types'

// Labels para entidades e ações (mesmos do Filtros, locais p/ não importar do componente)
const LABEL_ENTIDADE: Record<string, string> = {
  OS: 'OS',
  USUARIO: 'Usuário',
  EQUIPE: 'Equipe',
}

const LABEL_ACAO: Record<string, string> = {
  CRIACAO: 'Criação',
  ATUALIZACAO: 'Atualização',
  MUDANCA_STATUS: 'Mudança de status',
  EXCLUSAO: 'Exclusão',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
}

const COR_ACAO: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
  CRIACAO: 'success',
  ATUALIZACAO: 'info',
  MUDANCA_STATUS: 'primary',
  EXCLUSAO: 'error',
  LOGIN: 'default',
  LOGOUT: 'default',
}

// Converte FiltroEventos para querystring (omite campos undefined/vazios)
function filtroParaQuery(filtro: FiltroEventos): string {
  const params = new URLSearchParams()
  if (filtro.entidade) params.set('entidade', filtro.entidade)
  if (filtro.acao) params.set('acao', filtro.acao)
  if (filtro.autorId !== undefined) params.set('autorId', String(filtro.autorId))
  if (filtro.entidadeId !== undefined) params.set('entidadeId', String(filtro.entidadeId))
  if (filtro.desde) params.set('desde', filtro.desde)
  if (filtro.ate) params.set('ate', filtro.ate)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// Renderiza o diff de um evento: parseia o JSON e lista campo: antes → depois
function DiffViewer({ diff }: { diff: string | null }) {
  if (!diff) return null

  let parsed: Record<string, [unknown, unknown]> | null = null
  try {
    parsed = JSON.parse(diff) as Record<string, [unknown, unknown]>
  } catch {
    // diff malformado — exibe como texto bruto
    return (
      <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {diff}
      </Typography>
    )
  }

  const campos = Object.keys(parsed)
  if (campos.length === 0) return null

  return (
    <Box component="dl" sx={{ m: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      {campos.map((campo) => {
        const [antes, depois] = parsed![campo]
        return (
          <Box key={campo} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Typography
              component="dt"
              variant="caption"
              sx={{ fontWeight: 600, minWidth: 100 }}
            >
              {campo}:
            </Typography>
            <Typography component="dd" variant="caption" sx={{ m: 0 }}>
              <Box component="span" sx={{ opacity: 0.6 }}>
                {String(antes ?? '—')}
              </Box>
              {' → '}
              <Box component="span" sx={{ fontWeight: 500 }}>
                {String(depois ?? '—')}
              </Box>
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}

// Linha da tabela com expansão do diff
function LinhaEvento({ evento }: { evento: EventoAuditoriaComAutor }) {
  const { m3 } = useM3()
  const [expandido, setExpandido] = useState(false)
  const temDiff = !!evento.diff

  return (
    <>
      <TableRow
        hover
        sx={{
          cursor: temDiff ? 'pointer' : 'default',
          '&:last-child td': { border: 0 },
        }}
        onClick={() => temDiff && setExpandido((v) => !v)}
      >
        {/* Expandir */}
        <TableCell sx={{ width: 40, py: 1, pr: 0 }}>
          {temDiff && (
            <Tooltip title={expandido ? 'Ocultar alterações' : 'Ver alterações'}>
              <IconButton size="small" aria-label="expandir diff" tabIndex={-1}>
                {expandido ? (
                  <KeyboardArrowDownIcon fontSize="small" />
                ) : (
                  <KeyboardArrowRightIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          )}
        </TableCell>

        {/* Data/hora */}
        <TableCell sx={{ py: 1, whiteSpace: 'nowrap', color: m3.onSurfaceVariant, fontSize: 13 }}>
          {formatarData(evento.criadoEm)}
        </TableCell>

        {/* Ação */}
        <TableCell sx={{ py: 1 }}>
          <Chip
            label={LABEL_ACAO[evento.acao] ?? evento.acao}
            size="small"
            color={COR_ACAO[evento.acao] ?? 'default'}
            sx={{ fontWeight: 500, height: 22, fontSize: 11 }}
          />
        </TableCell>

        {/* Entidade */}
        <TableCell sx={{ py: 1, fontSize: 13 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <span>{LABEL_ENTIDADE[evento.entidade] ?? evento.entidade}</span>
            <Typography variant="caption" color="text.secondary">
              #{evento.entidadeId}
            </Typography>
          </Box>
        </TableCell>

        {/* Descrição */}
        <TableCell sx={{ py: 1, fontSize: 13 }}>{evento.descricao}</TableCell>

        {/* Autor */}
        <TableCell sx={{ py: 1, fontSize: 13, color: m3.onSurfaceVariant }}>
          {evento.autor?.nome ?? '—'}
        </TableCell>
      </TableRow>

      {/* Linha de diff expandida */}
      {temDiff && (
        <TableRow sx={{ bgcolor: m3.surfaceContainerLowest }}>
          <TableCell colSpan={6} sx={{ pt: 0, pb: expandido ? 1.5 : 0, px: 3, border: 0 }}>
            <Collapse in={expandido} timeout="auto" unmountOnExit>
              <Box sx={{ py: 1 }}>
                <DiffViewer diff={evento.diff} />
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export default function Historico() {
  const toast = useToast()
  const { m3, elev } = useM3()

  const [filtros, setFiltros] = useState<FiltroEventos>({})
  const [eventos, setEventos] = useState<EventoAuditoriaComAutor[]>([])
  const [autores, setAutores] = useState<Usuario[]>([])
  const [carregando, setCarregando] = useState(true)

  // Busca autores uma única vez (ignora se 403)
  useEffect(() => {
    api
      .get<Usuario[]>('/usuarios')
      .then(setAutores)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 403) return // sem permissão, omite filtro
        // outros erros: silencioso (filtro apenas fica escondido)
      })
  }, [])

  // Busca eventos sempre que os filtros mudam
  const buscarEventos = useCallback(
    async (f: FiltroEventos) => {
      setCarregando(true)
      try {
        const dados = await api.get<EventoAuditoriaComAutor[]>(
          `/eventos${filtroParaQuery(f)}`,
        )
        setEventos(dados)
      } catch (e: unknown) {
        const msg = e instanceof ApiError ? e.message : 'Erro ao carregar histórico'
        toast(msg)
        setEventos([])
      } finally {
        setCarregando(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    buscarEventos(filtros)
  }, [filtros, buscarEventos])

  function handleFiltroChange(novoFiltro: FiltroEventos) {
    setFiltros(novoFiltro)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Cabeçalho */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <HistoryOutlinedIcon sx={{ color: m3.primary, fontSize: 28 }} />
        <Box>
          <Typography variant="h1">Histórico</Typography>
          <Typography variant="body2" color="text.secondary">
            Log completo de auditoria do sistema
          </Typography>
        </Box>
      </Box>

      {/* Filtros */}
      <Filtros
        entidade={filtros.entidade}
        acao={filtros.acao}
        autorId={filtros.autorId}
        desde={filtros.desde}
        ate={filtros.ate}
        autores={autores}
        onChange={handleFiltroChange}
      />

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
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress size={36} />
          </Box>
        ) : eventos.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <HistoryOutlinedIcon sx={{ fontSize: 48, color: m3.outlineVariant, mb: 1 }} />
            <Typography color="text.secondary">Nenhum evento encontrado</Typography>
            <Typography variant="caption" color="text.secondary">
              Tente remover ou ajustar os filtros aplicados
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Histórico de auditoria">
              <TableHead>
                <TableRow
                  sx={{
                    '& th': {
                      bgcolor: m3.surfaceContainerHigh,
                      color: m3.onSurfaceVariant,
                      fontWeight: 600,
                      fontSize: 12,
                      letterSpacing: '.5px',
                      textTransform: 'uppercase',
                      py: 1.25,
                      border: 0,
                    },
                  }}
                >
                  <TableCell sx={{ width: 40 }} />
                  <TableCell>Data / Hora</TableCell>
                  <TableCell>Ação</TableCell>
                  <TableCell>Entidade</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Autor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {eventos.map((evento) => (
                  <LinhaEvento key={evento.id} evento={evento} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Rodapé com contagem */}
        {!carregando && eventos.length > 0 && (
          <Box
            sx={{
              px: 2,
              py: 1,
              borderTop: `1px solid ${m3.outlineVariant}`,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {eventos.length} {eventos.length === 1 ? 'evento' : 'eventos'}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
