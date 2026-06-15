// Barra de filtros genérica para o Histórico de auditoria.
// Controlado pelo pai via props; dispara onChange a cada alteração.

import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Autocomplete from '@mui/material/Autocomplete'
import Typography from '@mui/material/Typography'
import { useM3 } from '../theme/useM3'
import { shape } from '../theme/tokens'
import {
  ENTIDADES_AUDITORIA,
  ACOES_AUDITORIA,
  type EntidadeAuditoria,
  type AcaoAuditoria,
  type FiltroEventos,
  type Usuario,
} from '../lib/types'

// Labels legíveis para entidades e ações
const LABEL_ENTIDADE: Record<EntidadeAuditoria, string> = {
  OS: 'Ordem de Serviço',
  SAIDA: 'Saída',
  FOLHA_ENVIO: 'Folha enviada',
  USUARIO: 'Usuário',
  EQUIPE: 'Equipe',
  TIPO_SERVICO: 'Tipo de serviço',
  PERMISSAO: 'Permissão',
}

const LABEL_ACAO: Record<AcaoAuditoria, string> = {
  CRIACAO: 'Criação',
  ATUALIZACAO: 'Atualização',
  MUDANCA_STATUS: 'Mudança de status',
  EXCLUSAO: 'Exclusão',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
}

interface FiltrosProps {
  // Valores controlados
  entidade?: EntidadeAuditoria
  acao?: AcaoAuditoria
  autorId?: number
  desde?: string
  ate?: string
  // Lista de autores para o Autocomplete (pode ser vazia se 403)
  autores?: Usuario[]
  onChange: (f: FiltroEventos) => void
}

export default function Filtros({
  entidade,
  acao,
  autorId,
  desde,
  ate,
  autores = [],
  onChange,
}: FiltrosProps) {
  const { m3 } = useM3()

  // Atualiza um único campo e notifica o pai
  function atualizar(campo: keyof FiltroEventos, valor: string | number | undefined) {
    const atualizado: FiltroEventos = {
      ...(entidade !== undefined && { entidade }),
      ...(acao !== undefined && { acao }),
      ...(autorId !== undefined && { autorId }),
      ...(desde !== undefined && { desde }),
      ...(ate !== undefined && { ate }),
    }

    if (valor === undefined || valor === '') {
      delete atualizado[campo]
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(atualizado as any)[campo] = valor
    }

    onChange(atualizado)
  }

  const autorSelecionado = autores.find((u) => u.id === autorId) ?? null

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: `${shape.small}px`,
      bgcolor: m3.surfaceContainerLow,
    },
  }

  return (
    <Box
      sx={{
        bgcolor: m3.surfaceContainerLow,
        borderRadius: `${shape.large}px`,
        p: 2,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'flex-end',
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ width: '100%', color: m3.onSurfaceVariant, fontWeight: 600, mb: -1 }}
      >
        Filtros
      </Typography>

      {/* Entidade */}
      <TextField
        select
        label="Entidade"
        size="small"
        value={entidade ?? ''}
        onChange={(e) =>
          atualizar('entidade', e.target.value as EntidadeAuditoria | '')
        }
        sx={{ minWidth: 180, ...inputSx }}
      >
        <MenuItem value="">Todas</MenuItem>
        {ENTIDADES_AUDITORIA.map((e) => (
          <MenuItem key={e} value={e}>
            {LABEL_ENTIDADE[e]}
          </MenuItem>
        ))}
      </TextField>

      {/* Ação */}
      <TextField
        select
        label="Ação"
        size="small"
        value={acao ?? ''}
        onChange={(e) =>
          atualizar('acao', e.target.value as AcaoAuditoria | '')
        }
        sx={{ minWidth: 180, ...inputSx }}
      >
        <MenuItem value="">Todas</MenuItem>
        {ACOES_AUDITORIA.map((a) => (
          <MenuItem key={a} value={a}>
            {LABEL_ACAO[a]}
          </MenuItem>
        ))}
      </TextField>

      {/* Autor — só exibe se a lista não estiver vazia (403 = omitido) */}
      {autores.length > 0 && (
        <Autocomplete
          options={autores}
          getOptionLabel={(u) => u.nome}
          value={autorSelecionado}
          onChange={(_e, novoValor) =>
            atualizar('autorId', novoValor?.id)
          }
          size="small"
          sx={{ minWidth: 220 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Autor"
              sx={inputSx}
            />
          )}
          clearOnEscape
          noOptionsText="Nenhum usuário encontrado"
        />
      )}

      {/* Desde */}
      <TextField
        label="Desde"
        type="datetime-local"
        size="small"
        value={desde ? desde.slice(0, 16) : ''}
        onChange={(e) =>
          atualizar('desde', e.target.value ? `${e.target.value}:00.000Z` : undefined)
        }
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 200, ...inputSx }}
      />

      {/* Até */}
      <TextField
        label="Até"
        type="datetime-local"
        size="small"
        value={ate ? ate.slice(0, 16) : ''}
        onChange={(e) =>
          atualizar('ate', e.target.value ? `${e.target.value}:59.999Z` : undefined)
        }
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 200, ...inputSx }}
      />
    </Box>
  )
}
