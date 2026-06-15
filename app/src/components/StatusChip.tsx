import Chip from '@mui/material/Chip'
import { useM3 } from '../theme/useM3'
import { STATUS_OS_COR, STATUS_OS_LABELS, type StatusOS } from '../lib/types'

interface StatusChipProps {
  status: StatusOS
}

export default function StatusChip({ status }: StatusChipProps) {
  const { m3 } = useM3()
  const label = STATUS_OS_LABELS[status]
  const color = STATUS_OS_COR[status]

  const cores =
    color === 'warning'
      ? { bgcolor: m3.warningContainer, color: m3.onWarningContainer }
      : color === 'info'
        ? { bgcolor: m3.primaryContainer, color: m3.onPrimaryContainer }
        : color === 'primary'
          ? { bgcolor: m3.primaryContainer, color: m3.onPrimaryContainer }
          : color === 'success'
            ? { bgcolor: m3.successContainer, color: m3.onSuccessContainer }
            : color === 'error'
              ? { bgcolor: m3.errorContainer, color: m3.onErrorContainer }
              : { bgcolor: m3.surfaceContainerHighest, color: m3.onSurfaceVariant }

  return <Chip size="small" label={label} sx={{ ...cores, fontWeight: 500, height: 24 }} />
}
