// =====================================================================
// Serviço de auditoria — registrarEvento.
// Regra transversal (CONTRACT.md): TODA mutação (criar/editar/mudar status/
// excluir, login/logout) grava um EventoAuditoria NA MESMA transação Prisma.
// Por isso a função aceita um client de transação (tx) — passe o client
// recebido dentro de prisma.$transaction(async (tx) => { ... }).
// =====================================================================
import type { Prisma, EventoAuditoria } from '@prisma/client'
import type { AcaoAuditoria, EntidadeAuditoria } from '../domain.js'
import { calcularDiff } from './diff.js'

// Client de escrita: aceita tanto o PrismaClient quanto o client de transação.
export type ClientePrisma = Prisma.TransactionClient

export interface RegistrarEventoArgs {
  entidade: EntidadeAuditoria
  entidadeId: number
  acao: AcaoAuditoria
  /** Autor da ação (null para eventos de sistema). */
  autorId: number | null
  /** Snapshot anterior (para diff). Opcional em CRIACAO/LOGIN/LOGOUT. */
  antes?: Record<string, unknown> | null
  /** Snapshot posterior (para diff). Opcional em EXCLUSAO/LOGOUT. */
  depois?: Record<string, unknown> | null
  /** Descrição legível. Se ausente, é gerada a partir de entidade+ação. */
  descricao?: string
}

/**
 * Grava um EventoAuditoria usando o client fornecido (idealmente um tx de
 * prisma.$transaction). Calcula o diff JSON entre `antes`/`depois`.
 *
 * @param args  dados do evento (entidade, entidadeId, acao, autorId, antes, depois)
 * @param tx    PrismaClient OU Prisma.TransactionClient (use o tx da transação)
 * @returns     o EventoAuditoria criado
 */
export async function registrarEvento(
  args: RegistrarEventoArgs,
  tx: ClientePrisma,
): Promise<EventoAuditoria> {
  const { entidade, entidadeId, acao, autorId } = args

  const diffMapa = calcularDiff(args.antes, args.depois)
  const diff = diffMapa ? JSON.stringify(diffMapa) : null
  const descricao = args.descricao ?? descricaoPadrao(entidade, acao, entidadeId)

  return tx.eventoAuditoria.create({
    data: {
      entidade,
      entidadeId,
      acao,
      autorId,
      descricao,
      diff,
    },
  })
}

function descricaoPadrao(
  entidade: EntidadeAuditoria,
  acao: AcaoAuditoria,
  entidadeId: number,
): string {
  const rotuloEntidade: Record<EntidadeAuditoria, string> = {
    OS: 'Ordem de serviço',
    SAIDA: 'Saída',
    FOLHA_ENVIO: 'Folha enviada',
    USUARIO: 'Usuário',
    EQUIPE: 'Equipe',
    TIPO_SERVICO: 'Tipo de serviço',
    PERMISSAO: 'Permissão',
  }
  const rotuloAcao: Record<AcaoAuditoria, string> = {
    CRIACAO: 'criado(a)',
    ATUALIZACAO: 'atualizado(a)',
    MUDANCA_STATUS: 'mudança de status',
    EXCLUSAO: 'excluído(a)/desativado(a)',
    LOGIN: 'login',
    LOGOUT: 'logout',
  }
  if (acao === 'LOGIN' || acao === 'LOGOUT') {
    return `${rotuloEntidade[entidade]} #${entidadeId}: ${rotuloAcao[acao]}`
  }
  return `${rotuloEntidade[entidade]} #${entidadeId}: ${rotuloAcao[acao]}`
}
