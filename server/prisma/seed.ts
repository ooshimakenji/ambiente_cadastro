// =====================================================================
// Seed idempotente — ambiental_cadastro (modelo v3: OS multi-saída).
// Cria ADMIN/supervisor, equipes, tipos, e cenários de OS com saídas:
//   - OS com 2 saídas (NAO_REALIZADO depois CONCLUIDA com fotos)
//   - OS CONCLUIDA com SEM_FOTOS (aguardando fotos)
//   - OS com FolhaEnvio (enviadaCasaEm setado)
//   - OS ABERTA em campo (saída EM_CAMPO)
// Rodar: npm run seed  (carrega .env via --env-file e usa tsx).
//
// Idempotência: Usuário/Equipe/Tipo via upsert por chave; OS criadas só se
// ainda não existir nenhuma (evita duplicar a cada run).
// =====================================================================
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? 'admin'
  const ADMIN_SENHA = process.env.ADMIN_SENHA ?? 'admin123'
  const ADMIN_NOME = process.env.ADMIN_NOME ?? 'Administrador'

  const senhaHash = await bcrypt.hash(ADMIN_SENHA, 10)

  const admin = await prisma.usuario.upsert({
    where: { login: ADMIN_LOGIN },
    update: { nome: ADMIN_NOME, papel: 'ADMIN', ativo: true },
    create: { nome: ADMIN_NOME, login: ADMIN_LOGIN, senhaHash, papel: 'ADMIN', ativo: true },
  })
  console.log(`ADMIN pronto: #${admin.id} (${admin.login})`)

  const equipeAlfa = await upsertEquipePorNome('Equipe Alfa', 'Equipe de campo região central')
  const equipeBravo = await upsertEquipePorNome('Equipe Bravo', 'Equipe de campo região sul')
  console.log(`Equipes prontas: #${equipeAlfa.id}, #${equipeBravo.id}`)

  const tipoCavalete = await upsertTipoPorNome('Cavalete')
  const tipoRedeRamal = await upsertTipoPorNome('Rede/ramal')
  const tipoFaltaAgua = await upsertTipoPorNome("Falta d'água")
  console.log(`Tipos prontos: #${tipoCavalete.id}, #${tipoRedeRamal.id}, #${tipoFaltaAgua.id}`)

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

  const totalOS = await prisma.ordemServico.count()
  if (totalOS > 0) {
    console.log(`OS já existentes (${totalOS}) — pulando criação de exemplos`)
    console.log('Seed concluído.')
    return
  }

  const agora = new Date()
  const ontem = new Date(agora.getTime() - 24 * 3600 * 1000)

  // --- Cenário 1: OS ABERTA com saída EM_CAMPO ---
  const os1 = await prisma.ordemServico.create({
    data: { sequencial: '2026090001', tipoServicoId: tipoCavalete.id, status: 'ABERTA', criadoPorId: admin.id },
  })
  await prisma.saida.create({
    data: {
      ordemId: os1.id,
      equipeId: equipeAlfa.id,
      responsavelId: supervisor.id,
      status: 'EM_CAMPO',
      tipo: 'CAMPO',
      anotacoes: 'Cliente relatou falta de cavalete na entrada',
      criadoPorId: admin.id,
    },
  })

  // --- Cenário 2: OS com 2 saídas — NAO_REALIZADO (batedor) depois CONCLUIDA c/ fotos ---
  const os2 = await prisma.ordemServico.create({
    data: {
      sequencial: '2026090002',
      tipoServicoId: tipoRedeRamal.id,
      status: 'CONCLUIDA',
      concluidoEm: agora,
      criadoPorId: admin.id,
    },
  })
  await prisma.saida.create({
    data: {
      ordemId: os2.id,
      equipeId: equipeBravo.id,
      responsavelId: supervisor.id,
      status: 'NAO_REALIZADO',
      tipo: 'CAMPO',
      anotacoes: 'Local sem acesso — visita (batedor)',
      criadoPorId: admin.id,
      criadoEm: ontem,
      recebidoEm: ontem,
    },
  })
  await prisma.saida.create({
    data: {
      ordemId: os2.id,
      equipeId: equipeAlfa.id,
      responsavelId: supervisor.id,
      status: 'CONCLUIDA',
      fotos: 'COM_FOTOS',
      tipo: 'CAMPO',
      anotacoes: 'Refeito e concluído',
      criadoPorId: admin.id,
      recebidoEm: agora,
    },
  })

  // --- Cenário 3: OS CONCLUIDA SEM_FOTOS (aguardando fotos) ---
  const os3 = await prisma.ordemServico.create({
    data: {
      sequencial: '2026090003',
      tipoServicoId: tipoFaltaAgua.id,
      status: 'CONCLUIDA',
      concluidoEm: agora,
      criadoPorId: admin.id,
    },
  })
  await prisma.saida.create({
    data: {
      ordemId: os3.id,
      equipeId: equipeBravo.id,
      responsavelId: supervisor.id,
      status: 'CONCLUIDA',
      fotos: 'SEM_FOTOS',
      tipo: 'CAMPO',
      anotacoes: 'Finalizada sem fotos — equipe deve regularizar',
      criadoPorId: admin.id,
      recebidoEm: agora,
    },
  })

  // --- Cenário 4: OS com FolhaEnvio (folha já foi à casa) ---
  const os4 = await prisma.ordemServico.create({
    data: {
      sequencial: '2026090004',
      tipoServicoId: tipoCavalete.id,
      status: 'CONCLUIDA',
      concluidoEm: ontem,
      enviadaCasaEm: agora,
      criadoPorId: admin.id,
    },
  })
  await prisma.saida.create({
    data: {
      ordemId: os4.id,
      equipeId: equipeAlfa.id,
      responsavelId: supervisor.id,
      status: 'CONCLUIDA',
      fotos: 'COM_FOTOS',
      tipo: 'CAMPO',
      criadoPorId: admin.id,
      criadoEm: ontem,
      recebidoEm: ontem,
    },
  })
  await prisma.folhaEnvio.create({
    data: {
      ordemId: os4.id,
      descricao: 'Folha física entregue no ambiente 2',
      periodo: 'MANHA',
      recebidoPorId: admin.id,
      criadoPorId: supervisor.id,
    },
  })

  // Eventos de criação (timeline/histórico).
  for (const os of [os1, os2, os3, os4]) {
    await prisma.eventoAuditoria.create({
      data: {
        entidade: 'OS',
        entidadeId: os.id,
        acao: 'CRIACAO',
        autorId: admin.id,
        descricao: `Ordem de serviço ${os.sequencial} criada (seed)`,
        diff: null,
      },
    })
  }

  console.log('OS de exemplo criadas: 4 (multi-saída, aguardando fotos, folha enviada).')
  console.log('Seed concluído.')
}

async function upsertEquipePorNome(nome: string, descricao: string) {
  const existente = await prisma.equipe.findFirst({ where: { nome } })
  if (existente) {
    return prisma.equipe.update({ where: { id: existente.id }, data: { descricao, ativo: true } })
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
