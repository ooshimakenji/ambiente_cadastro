// =====================================================================
// Seed idempotente — ambiental_cadastro (modelo v3: OS multi-saída).
// Cria ADMIN/supervisor + os tipos de serviço e equipes reais (pré-setados,
// extraídos da planilha do dono). NÃO cria OS — a lista de OS nasce vazia;
// as OS entram pela operação (Cadastrar OS) mês a mês.
// Rodar: npm run seed  (carrega .env via --env-file e usa tsx).
//
// Idempotência: tudo via upsert por nome/login — re-rodar não duplica.
// =====================================================================
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { TELAS } from '../src/domain.js'

const prisma = new PrismaClient()

// Permissões default por papel (ADMIN tem tudo, fora da matriz).
// SUPERVISOR: vê todas as telas (edição de cadastros/usuários segue ADMIN-only no backend).
// CAMPO: só Cadastrar + Receber.
const TELAS_CAMPO = ['cadastrar', 'receber'] as const

// Tipos de serviço pré-setados (planilha "SERVIÇOS IMEDIATOS" → aba Apoio).
const TIPOS_SERVICO = [
  'Cavalete', 'Rede/ramal', "Falta d'água", 'Ligação de esgoto', 'Manutenção de esgoto',
  'Serviços especiais', 'Manutenção Hidraulica', 'Sondagem', 'Reclamação', 'Medição de Pressão',
  'Água Suja', 'Serviço de Munck', 'Intervenção Hidrossanitária', 'Manobra de Registro',
  'Abertura chamado plantão', 'Rebaixamento C.I.', 'Torneiro', 'Limpeza', 'Extravasamento de Esgoto CI',
  'Deslocamento de Rede', 'Ampliação de rede de água', 'Desobstrução ramal de esgoto', 'Visita Técnica',
  'Religação', 'Ampliação de rede de esgoto', 'Esgotamento de EE', 'Obras Terceiros', 'Lacrar HD',
]

// Equipes/responsáveis de campo pré-setados (planilha → aba Apoio).
const EQUIPES = [
  'Equipe Alfa', 'Equipe Bravo', 'Aldemir', 'Alisson', 'Anderson', 'Antônio', 'Aurélio', 'CK',
  'Cláudio', 'Diego Santos', 'Edson Rodrigo', 'Emanuel', 'Eric', 'Evens', 'Ewerton', 'Giovane',
  'Hidrojato', 'Igor', 'Israel', 'Itamar', 'Jonathan', 'Leonardo', 'Maciel', 'Maicon', 'Márcio',
  'Matheus', 'Melo', 'Mendonça', 'Morais', 'Nascimento', 'Nilson', 'Nunes', 'Ranan', 'Raziel',
  'Roberto', 'Rodolfo', 'Santos', 'Schneider', 'Fabiano', 'Daniel', 'Maurício', 'Cleverson',
  'Ricardo', 'Leandro', 'Peters', 'Sidney', 'Humberto', 'Floriano', 'Jefferson', 'Pedroso',
  'Rodrigo', 'Serrano', 'Nicholas', 'Bruno', 'Jairo (Xanxerê)', 'Eduardo', 'Gustavo Cadore',
  'Christian', 'Eliseu', 'Lucas', 'Dennis', 'Nantes', 'Foppa', 'Quilante', 'Roberio',
  'João Victor', 'Macedo',
]

async function main() {
  const ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? 'admin'
  const ADMIN_SENHA = process.env.ADMIN_SENHA ?? 'admin123'
  const ADMIN_NOME = process.env.ADMIN_NOME ?? 'Administrador'

  const senhaHash = await bcrypt.hash(ADMIN_SENHA, 10)

  // Atualiza também a senha (senhaHash) p/ manter o admin bootstrap em sincronia
  // com ADMIN_SENHA do .env — garante login previsível após cada seed.
  const admin = await prisma.usuario.upsert({
    where: { login: ADMIN_LOGIN },
    update: { nome: ADMIN_NOME, papel: 'ADMIN', ativo: true, senhaHash },
    create: { nome: ADMIN_NOME, login: ADMIN_LOGIN, senhaHash, papel: 'ADMIN', ativo: true },
  })
  console.log(`ADMIN pronto: #${admin.id} (${admin.login})`)

  const descricoesEquipe: Record<string, string> = {
    'Equipe Alfa': 'Equipe de campo região central',
    'Equipe Bravo': 'Equipe de campo região sul',
  }
  let equipeAlfa = null as Awaited<ReturnType<typeof upsertEquipePorNome>> | null
  for (const nome of EQUIPES) {
    const eq = await upsertEquipePorNome(nome, descricoesEquipe[nome] ?? '')
    if (nome === 'Equipe Alfa') equipeAlfa = eq
  }
  if (!equipeAlfa) equipeAlfa = await upsertEquipePorNome('Equipe Alfa', descricoesEquipe['Equipe Alfa'])
  console.log(`Equipes prontas: ${EQUIPES.length}`)

  for (const nome of TIPOS_SERVICO) {
    await upsertTipoPorNome(nome)
  }
  console.log(`Tipos prontos: ${TIPOS_SERVICO.length}`)

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

  const campo = await prisma.usuario.upsert({
    where: { login: 'campo' },
    update: { nome: 'Operador de Campo', papel: 'CAMPO', ativo: true },
    create: {
      nome: 'Operador de Campo',
      login: 'campo',
      senhaHash: await bcrypt.hash('campo123', 10),
      papel: 'CAMPO',
      ativo: true,
    },
  })
  console.log(`Campo pronto: #${campo.id} (${campo.login})`)

  // Matriz de permissões default (upsert idempotente por [papel, tela]).
  for (const tela of TELAS) {
    await upsertPermissao('SUPERVISOR', tela, true)
    await upsertPermissao('CAMPO', tela, (TELAS_CAMPO as readonly string[]).includes(tela))
  }
  console.log(`Permissões default: SUPERVISOR (todas) + CAMPO (cadastrar, receber).`)

  const totalOS = await prisma.ordemServico.count()
  console.log(`OS no banco: ${totalOS} (seed não cria OS — entram pela operação).`)
  console.log('Seed concluído.')
}

async function upsertEquipePorNome(nome: string, descricao: string) {
  const existente = await prisma.equipe.findFirst({ where: { nome } })
  if (existente) {
    return prisma.equipe.update({ where: { id: existente.id }, data: { descricao, ativo: true } })
  }
  return prisma.equipe.create({ data: { nome, descricao, ativo: true } })
}

async function upsertPermissao(papel: string, tela: string, permitido: boolean) {
  return prisma.permissaoPapel.upsert({
    where: { papel_tela: { papel, tela } },
    update: { permitido },
    create: { papel, tela, permitido },
  })
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
