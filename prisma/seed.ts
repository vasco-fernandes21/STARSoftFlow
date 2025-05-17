import { PrismaClient, Permissao, Regime } from "@prisma/client";
import { hash } from "bcryptjs";
import { Decimal } from "decimal.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 A iniciar seed da base de dados...");

  // --- Limpar dados existentes ---
  console.log("🧹 A limpar tabelas existentes...");

  // Helper function to safely delete data
  const deleteIfExists = async (deleteFunction: () => Promise<any>, tableName: string) => {
    try {
      await deleteFunction();
    } catch (error: any) {
      if (error.code === "P2021") {
        console.warn(`⚠️ Tabela ${tableName} não existe, a ignorar limpeza.`);
      } else {
        console.error(`❌ Erro grave ao limpar ${tableName}: ${error.message}`);
        throw error;
      }
    }
  };

  await deleteIfExists(() => prisma.verificationToken.deleteMany(), "VerificationToken");
  await deleteIfExists(() => prisma.session.deleteMany(), "Session");
  await deleteIfExists(() => prisma.account.deleteMany(), "Account");
  await deleteIfExists(() => prisma.password.deleteMany(), "Password");
  await deleteIfExists(() => prisma.passwordReset.deleteMany(), "PasswordReset");
  await deleteIfExists(() => prisma.user.deleteMany(), "User");
  console.log("✅ Limpeza concluída.");

  // --- Criar Utilizadores ---
  console.log("👤 A criar utilizadores...");

  // Função helper para criar utilizador e password
  const createUserWithPassword = async (userData: any, password: string) => {
    const user = await prisma.user.create({ data: userData });
    const hashedPassword = await hash(password, 12);
    await prisma.password.create({
      data: {
        userId: user.id,
        hash: hashedPassword,
      },
    });
    return user;
  };

  // Criar admin e gestor primeiro
  const admin = await createUserWithPassword(
    {
      name: "Vasco Fernandes",
      email: "admin@starinstitute.pt",
      emailVerified: new Date(),
      atividade: "Administrador",
      contratacao: new Date("2020-01-01"),
      username: "vasco.fernandes",
      permissao: Permissao.ADMIN,
      regime: Regime.INTEGRAL,
      salario: new Decimal(2000.0),
    },  
    "admin123"
  );

  const gestor = await createUserWithPassword(
    {
      name: "Gestor",
      email: "gestor@starinstitute.pt",
      emailVerified: new Date(),
      atividade: "Gestor",
      contratacao: new Date("2020-03-15"),
      username: "gestor",
      permissao: Permissao.GESTOR,
      regime: Regime.INTEGRAL,
      salario: new Decimal(3500.0),
    },
    "gestor123"
  );

  const comum = await createUserWithPassword(
    {
      name: "Comum",
      email: "comum@starinstitute.pt",
      emailVerified: new Date(),
      atividade: "Comum",
      contratacao: new Date("2020-03-15"),
      username: "comum",
      permissao: Permissao.COMUM,
      regime: Regime.INTEGRAL,
      salario: new Decimal(2000.0),
    },
    "comum123"
  )

  const commonUsersData = [
    {
      name: "Helga Carvalho",
      email: "helga.carvalho@starinstitute.pt",
      atividade: "Project Management Office e Contratação Pública",
      contratacao: new Date("2020-03-15"),
      username: "helga.carvalho",
      permissao: Permissao.GESTOR,
      regime: Regime.INTEGRAL,
      salario: new Decimal(3500.0),
    },
    {
      name: "Ricardo Correia",
      email: "ricardo.correia@starinstitute.pt",
      atividade: "Investigador no Laboratório Digital",
      contratacao: new Date("2021-01-10"),
      username: "ricardo.correia",
      regime: Regime.PARCIAL,
      salario: new Decimal(2000.0),
    },
    
    {
      name: "Ana Isabel Carvalho",
      email: "ana.i.carvalho@starinstitute.pt",
      atividade: "Investigadora no Laboratório Digital",
      contratacao: new Date("2021-03-22"),
      username: "ana.i.carvalho",
      regime: Regime.PARCIAL,
    },
    {
      name: "Ana Claudia Carvalho",
      email: "ana.c.carvalho@starinstitute.pt",
      atividade: "Investigadora no Laboratório Digital",
      contratacao: new Date("2022-01-05"),
      username: "ana.c.carvalho",
      regime: Regime.INTEGRAL,
    },
    {
      name: "João Lopes",
      email: "joao.lopes@starinstitute.pt",
      atividade: "Investigador no Laboratório Digital",
      contratacao: new Date("2022-06-12"),
      username: "joao.lopes",
      regime: Regime.INTEGRAL,
    },
    {
      name: "Filipe Coutinho",
      email: "filipe.coutinho@starinstitute.pt",
      atividade: "Investigador no Laboratório Digital",
      contratacao: new Date("2023-02-01"),
      username: "filipe.coutinho",
      regime: Regime.INTEGRAL,
    },
    {
      name: "Rui Coimbra",
      email: "rui.coimbra@starinstitute.pt",
      atividade: "Investigador no Laboratório Digital",
      contratacao: new Date("2023-02-01"),
      username: "rui.coimbra",
      regime: Regime.INTEGRAL,
    },
    {
      name: "Elisio Oliveira",
      email: "elisio.oliveira@starinstitute.pt",
      atividade: "Investigador",
      contratacao: new Date("2023-01-01"),
      username: "elisio.oliveira",
      regime: Regime.INTEGRAL,
      permissao: Permissao.ADMIN,
    },
    {
      name: "Luis Almeida",
      email: "luis.almeida@starinstitute.pt",
      atividade: "Investigador",
      contratacao: new Date("2023-01-01"),
      username: "luis.almeida",
      regime: Regime.INTEGRAL,
    },
    {
      name: "Mafalda lisboa",
      email: "mafalda.lisboa@starinstitute.pt",
      atividade: "Investigadora",
      contratacao: new Date("2023-06-01"),
      username: "mafalda.lisboa",
      regime: Regime.INTEGRAL,
    },
    {
      name: "Domingos Moreia",
      email: "domingos.moreia@starinstitute.pt",
      atividade: "Investigador",
      contratacao: new Date("2023-08-01"),
      username: "domingos.moreia",
      regime: Regime.INTEGRAL,
    },
    {
      name: "Carlos Mesquita",
      email: "carlos.mesquita@starinstitute.pt",
      atividade: "Investigador",
      contratacao: new Date("2023-09-01"),
      username: "carlos.mesquita",
      regime: Regime.INTEGRAL,
    },
    {
      name: "José Carlos Lopes",
      email: "jose.c.lopes@starinstitute.pt",
      atividade: "Investigador",
      contratacao: new Date("2023-11-01"),
      username: "jose.c.lopes",
      regime: Regime.INTEGRAL,
      salario: new Decimal(5500.0),
    },
    {
      name: "Joana Matos",
      email: "joana.matos@starinstitute.pt",
      atividade: "Investigadora",
      contratacao: new Date("2023-12-01"),
      username: "joana.matos",
      regime: Regime.INTEGRAL,
      salario: new Decimal(2500.0),
    },
    {
      name: "Mariana Domingos",
      email: "mariana.domingos@starinstitute.pt",
      atividade: "Investigadora",
      contratacao: new Date("2024-01-01"),
      username: "mariana.domingos",
      regime: Regime.INTEGRAL,
      salario: new Decimal(3500.0),
    },
    {
      name: "Carla Gomes",
      email: "carla.gomes@starinstitute.pt",
      atividade: "Investigadora",
      contratacao: new Date("2024-01-01"),
      username: "carla.gomes",
      regime: Regime.INTEGRAL,
      salario: new Decimal(3250.0),
    },
    {
      name: "Nelson Lorenzoni",
      email: "nelson.lorenzoni@starinstitute.pt",
      atividade: "Investigador",
      contratacao: new Date("2024-01-01"),
      username: "nelson.lorenzoni",
      regime: Regime.INTEGRAL,
      salario: new Decimal(3500.0),
    },
    {
      name: "André Fernandes",
      email: "andre.fernandes@starinstitute.pt",
      atividade: "Investigador",
      contratacao: new Date("2024-08-01"),
      username: "andre.fernandes",
      regime: Regime.INTEGRAL,
    },
    {
      name: "Pedro Soares",
      email: "pedro.soares@starinstitute.pt",
      atividade: "Investigador",
      contratacao: new Date("2024-09-01"),
      username: "pedro.soares",
      regime: Regime.INTEGRAL,
    },
    {
      name: "Ricardo Carvalho",
      email: "ricardo.carvalho@starinstitute.pt",
      atividade: "Investigador",
      contratacao: new Date("2024-12-01"),
      username: "ricardo.carvalho",
      regime: Regime.INTEGRAL,
      salario: new Decimal(1700.0),
    },
    {
      name: "Filipe Ramalho",
      email: "filipe.ramalho@starinstitute.pt",
      atividade: "Investigador",
      contratacao: new Date("2025-02-01"),
      username: "filipe.ramalho",
      regime: Regime.INTEGRAL,
    },
  ];

  const commonUsers = await Promise.all(
    commonUsersData.map((userData) =>
      createUserWithPassword(
        {
          ...userData,
          emailVerified: new Date(),
          permissao: Permissao.COMUM,
        },
        "password123"
      )
    )
  );

  // Combinar todos os usuários em um array
  const users = [admin, gestor, comum, ...commonUsers];
  console.log(`✅ ${users.length} utilizadores criados.`);

  // --- Estatísticas Finais ---
  const stats = {
    users: await prisma.user.count(),
  };

  console.log("📊 Estatísticas Finais:");
  console.table(stats);

  // --- Criar Projeto Atividade Económica ---
  console.log("📋 A criar projeto Atividade Económica...");
  await prisma.projeto.create({
    data: {
      nome: "Atividade Económica",
      descricao: "Projeto para gestão de atividades económicas",
      tipo: "ATIVIDADE_ECONOMICA",
      inicio: new Date("2025-01-01"),
      fim: new Date("2026-12-31"),
      estado: "APROVADO",
      workpackages: {
        create: [
          {
            nome: "Workpackage 1",
            inicio: new Date("2025-01-01"),
            fim: new Date("2025-12-31"),
            estado: false,
            tarefas: {
              create: [
                {
                  nome: "Tarefa 1.1",
                  descricao: "Gestão de contratos e parcerias",
                  inicio: new Date("2025-01-01"),
                  fim: new Date("2025-06-30"),
                  estado: false,
                },
                {
                  nome: "Tarefa 1.2",
                  descricao: "Monitorização de indicadores financeiros",
                  inicio: new Date("2025-07-01"),
                  fim: new Date("2025-12-31"),
                  estado: false,
                }
              ]
            }
          },
          {
            nome: "Workpackage 2",
            inicio: new Date("2025-07-01"),
            fim: new Date("2026-06-30"),
            estado: false,
            tarefas: {
              create: [
                {
                  nome: "Tarefa 2.1",
                  descricao: "Desenvolvimento de propostas comerciais",
                  inicio: new Date("2025-07-01"),
                  fim: new Date("2025-12-31"),
                  estado: false,
                },
                {
                  nome: "Tarefa 2.2",
                  descricao: "Análise de mercado e oportunidades",
                  inicio: new Date("2026-01-01"),
                  fim: new Date("2026-06-30"),
                  estado: false,
                }
              ]
            }
          },
          {
            nome: "Workpackage 3",
            inicio: new Date("2026-01-01"),
            fim: new Date("2026-12-31"),
            estado: false,
            tarefas: {
              create: [
                {
                  nome: "Tarefa 3.1",
                  descricao: "Gestão de propriedade intelectual",
                  inicio: new Date("2026-01-01"),
                  fim: new Date("2026-06-30"),
                  estado: false,
                },
                {
                  nome: "Tarefa 3.2",
                  descricao: "Desenvolvimento de planos de negócio",
                  inicio: new Date("2026-07-01"),
                  fim: new Date("2026-12-31"),
                  estado: false,
                }
              ]
            }
          }
        ]
      }
    }
  });
  console.log("✅ Projeto Atividade Económica criado com sucesso!");
}

main()
  .catch((error) => {
    console.error("❌ Erro durante o processo de seed:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect().then(() => {
      console.log("🔌 Conexão Prisma desconectada.");
    });
  }); 