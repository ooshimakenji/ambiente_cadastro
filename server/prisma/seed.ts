// =====================================================================
// Seed idempotente — dashboard_cadastro.
// Cria o ADMIN a partir do .env (ADMIN_LOGIN/SENHA/NOME) via upsert,
// 1-2 equipes e algumas OS de exemplo para validar a UI na Fase 4.
// Rodar: npm run seed  (carrega .env via --env-file e usa tsx).
//
// Idempotência:
//   - Usuário/Equipe via upsert por chave única (login / nome).
//   - OS: criadas só se ainda não existir nenhuma (evita duplicar a cada run).
// =====================================================================
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? 'admin'
  const ADMIN_SENHA = process.env.ADMIN_SENHA ?? 'admin123'
  const ADMIN_NOME = process.env.ADMIN_NOME ?? 'Administrador'

  const senhaHash = await bcrypt.hash(ADMIN_SENHA, 10)

  // ---- ADMIN (upsert por login) ----
  const admin = await prisma.usuario.upsert({
    where: { login: ADMIN_LOGIN },
    update: { nome: ADMIN_NOME, papel: 'ADMIN', ativo: true },
    create: {
      nome: ADMIN_NOME,
      login: ADMIN_LOGIN,
      senhaHash,
      papel: 'ADMIN',
      ativo: true,
    },
  })
  console.log(`ADMIN pronto: #${admin.id} (${admin.login})`)

  // ---- Equipes (Equipe.nome não é @unique; faz upsert manual por nome) ----
  const equipeAlfa = await upsertEquipePorNome('Equipe Alfa', 'Equipe de campo região central')
  const equipeBravo = await upsertEquipePorNome('Equipe Bravo', 'Equipe de campo região sul')
  console.log(`Equipes prontas: #${equipeAlfa.id}, #${equipeBravo.id}`)

  // ---- Tipos de serviço (nome não é @unique; upsert manual por nome) ----
  const tipoCavalete = await upsertTipoPorNome('Cavalete')
  const tipoRedeRamal = await upsertTipoPorNome('Rede/ramal')
  const tipoFaltaAgua = await upsertTipoPorNome("Falta d'água")
  console.log(`Tipos de serviço prontos: #${tipoCavalete.id}, #${tipoRedeRamal.id}, #${tipoFaltaAgua.id}`)

  // ---- Supervisor de exemplo (upsert por login) ----
  const supervisor = await prisma.usuario.upsert({
    where: { login: 'supervisor' },
    update: { nome: 'Supervisor Exemplo', papel: 'SUPERVISOR', ativo: true, equipeId: equipeAlfa.id },
    create: {
      nome: 'Supervisor Exemplo',
      login: 'supervisor',
      senhaHash: await bcrypt.hash('supervisor123', 10),
      papel: 'SUPERVISOR',
      ativo: true,
      equipeId: equipeAlfa.id,
    },
  })
  console.log(`Supervisor pronto: #${supervisor.id} (${supervisor.login})`)

  // ---- OS de exemplo (só se não houver nenhuma) ----
  const totalOS = await prisma.ordemServico.count()
  if (totalOS === 0) {
    const exemplos = [
      {
        // PENDENTE — sem equipe (nasce aguardando atribuição)
        sequencial: '2026090001',
        anotacoes: 'Cliente relatou falta de cavalete na entrada',
        tipoServicoId: tipoCavalete.id,
        status: 'PENDENTE',
        equipeId: null as number | null,
        responsavelId: null as number | null,
        fotos: null as string | null,
      },
      {
        // ATENDENDO — com equipe + responsável (nasceu atribuída)
        sequencial: '2026090002',
        anotacoes: 'Vazamento no ramal predial',
        tipoServicoId: tipoRedeRamal.id,
        status: 'ATENDENDO',
        equipeId: equipeBravo.id,
        responsavelId: supervisor.id,
        fotos: null as string | null,
      },
      {
        // CONCLUIDA com fotos
        sequencial: '2026090003',
        anotacoes: null as string | null,
        tipoServicoId: tipoFaltaAgua.id,
        status: 'CONCLUIDA',
        equipeId: equipeAlfa.id,
        responsavelId: supervisor.id,
        fotos: 'COM_FOTOS' as string | null,
      },
      {
        // CONCLUIDA sem fotos — exercita a aba "Aguardando fotos" (equipe cobrada)
        sequencial: '2026090004',
        anotacoes: 'Finalizada sem fotos — equipe deve enviar depois',
        tipoServicoId: tipoCavalete.id,
        status: 'CONCLUIDA',
        equipeId: equipeBravo.id,
        responsavelId: supervisor.id,
        fotos: 'SEM_FOTOS' as string | null,
      },
    ]

    for (const os of exemplos) {
      const criada = await prisma.ordemServico.create({
        data: {
          ...os,
          criadoPorId: admin.id,
          concluidoEm: os.status === 'CONCLUIDA' ? new Date() : null,
        },
      })
      // Evento de criação para popular a timeline/histórico.
      await prisma.eventoAuditoria.create({
        data: {
          entidade: 'OS',
          entidadeId: criada.id,
          acao: 'CRIACAO',
          autorId: admin.id,
          descricao: `Ordem de serviço ${criada.sequencial} criada (seed)`,
          diff: null,
        },
      })
    }
    console.log(`OS de exemplo criadas: ${exemplos.length}`)
  } else {
    console.log(`OS já existentes (${totalOS}) — pulando criação de exemplos`)
  }

  console.log('Seed concluído.')
}

async function upsertEquipePorNome(nome: string, descricao: string) {
  const existente = await prisma.equipe.findFirst({ where: { nome } })
  if (existente) {
    return prisma.equipe.update({
      where: { id: existente.id },
      data: { descricao, ativo: true },
    })
  }
  return prisma.equipe.create({ data: { nome, descricao, ativo: true } })
}

async function upsertTipoPorNome(nome: string) {
  const existente = await prisma.tipoServico.findFirst({ where: { nome } })
  if (existente) {
    return prisma.tipoServico.update({ where: { id: existente.id }, data: { ativo: true } })
  }
  return prisma.tipoServico.create({ data: { nome, ativo: true } })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Erro no seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
