import { PrismaClient, ProjetoEstado, Permissao, Regime, Rubrica } from "@prisma/client";
import { hash } from "bcryptjs";
import { Decimal } from "decimal.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 A iniciar seed do banco de dados...");

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

  await deleteIfExists(() => prisma.alocacaoRecurso.deleteMany(), "AlocacaoRecurso");
  await deleteIfExists(() => prisma.entregavel.deleteMany(), "Entregavel");
  await deleteIfExists(() => prisma.tarefa.deleteMany(), "Tarefa");
  await deleteIfExists(() => prisma.material.deleteMany(), "Material");
  await deleteIfExists(() => prisma.workpackage.deleteMany(), "Workpackage");
  await deleteIfExists(() => prisma.projeto.deleteMany(), "Projeto");
  await deleteIfExists(() => prisma.financiamento.deleteMany(), "Financiamento");
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
      email: "admin@starinstitute.com",
      emailVerified: new Date(),
      foto: "https://ui-avatars.com/api/?name=Administrator&background=1d4ed8&color=fff",
      atividade: "Administrador",
      contratacao: new Date("2020-01-01"),
      username: "admin",
      permissao: Permissao.ADMIN,
      regime: Regime.INTEGRAL,
      salario: new Decimal(2000.0),
    },
    "admin123"
  );

  const gestor = await createUserWithPassword(
    {
      name: "Helga Carvalho",
      email: "helga.carvalho@starinstitute.com",
      emailVerified: new Date(),
      foto: "https://ui-avatars.com/api/?name=Helga+Carvalho&background=15803d&color=fff",
      atividade: "Administração",
      contratacao: new Date("2020-03-15"),
      username: "helga.carvalho",
      permissao: Permissao.GESTOR,
      regime: Regime.INTEGRAL,
      salario: new Decimal(2000.0),
    },
    "gestor123"
  );

  const commonUsersData = [
    {
      name: "Ricardo Correia",
      email: "ricardo.correia@starinstitute.com",
      foto: "https://ui-avatars.com/api/?name=Ricardo+Correia&background=0284c7&color=fff",
      atividade: "Investigador no Laboratório Digital",
      contratacao: new Date("2021-01-10"),
      username: "ricardo.correia",
      regime: Regime.PARCIAL,
    },
    {
      name: "Ana Isabel Carvalho",
      email: "ana.i.carvalho@starinstitute.com",
      foto: "https://ui-avatars.com/api/?name=Ana+Isabel+Carvalho&background=0f766e&color=fff",
      atividade: "Investigadora no Laboratório Digital",
      contratacao: new Date("2021-03-22"),
      username: "ana.i.carvalho",
      regime: Regime.PARCIAL,
    },
    {
      name: "Ana Claudia Carvalho",
      email: "ana.c.carvalho@starinstitute.com",
      foto: "https://ui-avatars.com/api/?name=Ana+Claudia+Carvalho&background=7e22ce&color=fff",
      atividade: "Investigadora no Laboratório Digital",
      contratacao: new Date("2022-01-05"),
      username: "ana.c.carvalho",
      regime: Regime.INTEGRAL,
    },
    {
      name: "João Lopes",
      email: "joao.lopes@starinstitute.com",
      foto: "https://ui-avatars.com/api/?name=João+Lopes&background=b91c1c&color=fff",
      atividade: "Investigador no Laboratório Digital",
      contratacao: new Date("2022-06-12"),
      username: "joao.lopes",
      regime: Regime.INTEGRAL,
    },
    {
      name: "Filipe Coutinho",
      email: "filipe.coutinho@starinstitute.com",
      foto: "https://ui-avatars.com/api/?name=Filipe+Coutinho&background=c2410c&color=fff",
      atividade: "Investigador no Laboratório Digital",
      contratacao: new Date("2023-02-01"),
      username: "filipe.coutinho",
      regime: Regime.INTEGRAL,
    },
    {
      name: "Rui Coimbra",
      email: "rui.coimbra@starinstitute.com",
      foto: "https://ui-avatars.com/api/?name=Rui+Coimbra&background=0284c7&color=fff",
      atividade: "Investigador no Laboratório Digital",
      contratacao: new Date("2023-02-01"),
      username: "rui.coimbra",
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
          salario: new Decimal(2000.0),
        },
        "password123"
      )
    )
  );

  // Combinar todos os usuários em um array
  const users = [admin, gestor, ...commonUsers];
  console.log(`✅ ${users.length} utilizadores criados.`);

  // --- Criar Tipos de Financiamento ---
  console.log("💰 A criar tipos de financiamento...");
  const financiamentos = await prisma.financiamento.createMany({
    data: [
      {
        nome: "FCT - Fundação para a Ciência e Tecnologia",
        overhead: new Decimal(0.25),
        taxa_financiamento: new Decimal(0.85),
        valor_eti: new Decimal(4432.0),
      },
      {
        nome: "Portugal 2030",
        overhead: new Decimal(0.2),
        taxa_financiamento: new Decimal(0.85),
        valor_eti: new Decimal(4432.0),
      },
      {
        nome: "Horizonte Europa",
        overhead: new Decimal(0.25),
        taxa_financiamento: new Decimal(0.85),
        valor_eti: new Decimal(4432.0),
      },
      {
        nome: "Financiamento Privado",
        overhead: new Decimal(0.15),
        taxa_financiamento: new Decimal(0.85),
        valor_eti: new Decimal(4432.0),
      }
    ],
  });
  const financiamentoMap = await prisma.financiamento.findMany({
    select: { id: true, nome: true },
  });
  const getFinanciamentoId = (nome: string) =>
    financiamentoMap.find((f) => f.nome.startsWith(nome))?.id;
  console.log(`✅ ${financiamentos.count} tipos de financiamento criados.`);

  // --- Criar Materiais Genéricos ---
  console.log("🖥️ A criar materiais genéricos...");
  await prisma.material.createMany({
    data: [
      {
        nome: "Sistema WAAM Industrial",
        preco: new Decimal(75000.0),
        quantidade: 1,
        ano_utilizacao: 2025,
        rubrica: Rubrica.MATERIAIS,
      },
      {
        nome: "Drone DJI Matrice 300 RTK",
        preco: new Decimal(12000.0),
        quantidade: 2,
        ano_utilizacao: 2025,
        rubrica: Rubrica.MATERIAIS,
      },
      {
        nome: "Sistema de Navegação AGV",
        preco: new Decimal(15000.0),
        quantidade: 1,
        ano_utilizacao: 2025,
        rubrica: Rubrica.MATERIAIS,
      },
      {
        nome: "Sensores LiDAR",
        preco: new Decimal(8000.0),
        quantidade: 3,
        ano_utilizacao: 2025,
        rubrica: Rubrica.MATERIAIS,
      },
      {
        nome: "Workstation Dell Precision",
        preco: new Decimal(3500.0),
        quantidade: 4,
        ano_utilizacao: 2025,
        rubrica: Rubrica.MATERIAIS,
      }
    ],
  });
  console.log("✅ Materiais genéricos criados.");

  // --- Criar Projetos ---
  console.log("📋 A criar projetos...");

  const fctId = getFinanciamentoId("FCT");
  const horizonteEuropaId = getFinanciamentoId("Horizonte Europa");
  const portugal2030Id = getFinanciamentoId("Portugal 2030");

  if (!fctId || !horizonteEuropaId || !portugal2030Id) {
    throw new Error("❌ Erro: Não foi possível encontrar IDs de financiamento necessários.");
  }

  // Projeto 1: CONCLUÍDO - INOVC+
  const projetoConcluido = await prisma.projeto.create({
    data: {
      nome: "INOVC+",
      descricao: "Implementação de um Ecossistema de Inovação para a Transferência de Conhecimento na Região Centro.",
      inicio: new Date("2023-01-01"),
      fim: new Date("2025-01-31"),
      estado: ProjetoEstado.CONCLUIDO,
      financiamentoId: fctId,
      valor_eti: new Decimal(4432.0),
      taxa_financiamento: new Decimal(0.85),
      workpackages: {
        create: [
          {
            nome: "WP1 - Análise do Ecossistema Regional",
            inicio: new Date("2023-01-01"),
            fim: new Date("2023-06-30"),
            estado: true,
            tarefas: {
              create: [
                {
                  nome: "T1.1 - Mapeamento de atores",
                  inicio: new Date("2023-01-01"),
                  fim: new Date("2023-03-31"),
                  estado: true,
                },
                {
                  nome: "T1.2 - Análise de capacidades",
                  inicio: new Date("2023-04-01"),
                  fim: new Date("2023-06-30"),
                  estado: true,
                }
              ]
            }
          },
          {
            nome: "WP2 - Desenvolvimento da Plataforma",
            inicio: new Date("2023-07-01"),
            fim: new Date("2024-06-30"),
            estado: true,
            tarefas: {
              create: [
                {
                  nome: "T2.1 - Arquitetura do sistema",
                  inicio: new Date("2023-07-01"),
                  fim: new Date("2023-09-30"),
                  estado: true,
                },
                {
                  nome: "T2.2 - Implementação",
                  inicio: new Date("2023-10-01"),
                  fim: new Date("2024-03-31"),
                  estado: true,
                },
                {
                  nome: "T2.3 - Testes e validação",
                  inicio: new Date("2024-04-01"),
                  fim: new Date("2024-06-30"),
                  estado: true,
                }
              ]
            }
          },
          {
            nome: "WP3 - Piloto e Avaliação",
            inicio: new Date("2024-07-01"),
            fim: new Date("2025-01-31"),
            estado: true,
            tarefas: {
              create: [
                {
                  nome: "T3.1 - Implementação piloto",
                  inicio: new Date("2024-07-01"),
                  fim: new Date("2024-10-31"),
                  estado: true,
                },
                {
                  nome: "T3.2 - Avaliação e relatório final",
                  inicio: new Date("2024-11-01"),
                  fim: new Date("2025-01-31"),
                  estado: true,
                }
              ]
            }
          }
        ]
      }
    }
  });

  // Adicionar mais alocações distribuídas
  const ricardoId = users.find(u => u.name === "Ricardo Correia")?.id;
  const anaIsabelId = users.find(u => u.name === "Ana Isabel Carvalho")?.id;
  const anaClaudiaId = users.find(u => u.name === "Ana Claudia Carvalho")?.id;
  const joaoId = users.find(u => u.name === "João Lopes")?.id;
  const filipeId = users.find(u => u.name === "Filipe Coutinho")?.id;
  const ruiId = users.find(u => u.name === "Rui Coimbra")?.id;

  if (!ricardoId || !anaIsabelId || !anaClaudiaId || !joaoId || !filipeId || !ruiId) {
    throw new Error("❌ Erro: Não foi possível encontrar todos os IDs dos utilizadores.");
  }

  // Função helper para criar alocações
  const createAlocacoes = async (workpackageId: string, alocacoes: Array<{
    userId: string;
    mes: number;
    ano: number;
    ocupacao: number;
  }>) => {
    await prisma.alocacaoRecurso.createMany({
      data: alocacoes.map(a => ({
        workpackageId,
        userId: a.userId,
        mes: a.mes,
        ano: a.ano,
        ocupacao: new Decimal(a.ocupacao)
      }))
    });
  };

  // Projeto 2: EM_DESENVOLVIMENTO - IAMFat
  const projetoEmDesenvolvimento = await prisma.projeto.create({
    data: {
      nome: "IAMFat",
      descricao: "Desenvolvimento de tecnologia WAAM para fabrico de componentes estruturais com alta resistência à fadiga.",
      inicio: new Date("2024-11-01"),
      fim: new Date("2026-12-31"),
      estado: ProjetoEstado.EM_DESENVOLVIMENTO,
      financiamentoId: horizonteEuropaId,
      valor_eti: new Decimal(4432.0),
      taxa_financiamento: new Decimal(0.85),
      workpackages: {
        create: [
          {
            nome: "WP1 - Análise e Requisitos",
            inicio: new Date("2024-11-01"),
            fim: new Date("2025-03-31"),
            estado: true,
            tarefas: {
              create: [
                {
                  nome: "T1.1 - Análise de requisitos",
                  descricao: "Levantamento de requisitos técnicos",
                  inicio: new Date("2024-11-01"),
                  fim: new Date("2025-01-31"),
                  estado: true,
                },
                {
                  nome: "T1.2 - Especificações técnicas",
                  descricao: "Definição das especificações do sistema",
                  inicio: new Date("2025-02-01"),
                  fim: new Date("2025-03-31"),
                  estado: true,
                }
              ]
            }
          },
          {
            nome: "WP2 - Desenvolvimento WAAM",
            inicio: new Date("2025-04-01"),
            fim: new Date("2026-03-31"),
            estado: false,
            tarefas: {
              create: [
                {
                  nome: "T2.1 - Simulação numérica",
                  descricao: "Desenvolvimento de modelos de simulação",
                  inicio: new Date("2025-04-01"),
                  fim: new Date("2025-09-30"),
                  estado: false,
                },
                {
                  nome: "T2.2 - Implementação processo",
                  descricao: "Implementação do processo WAAM",
                  inicio: new Date("2025-10-01"),
                  fim: new Date("2026-03-31"),
                  estado: false,
                }
              ]
            }
          },
          {
            nome: "WP3 - Validação e Testes",
            inicio: new Date("2026-04-01"),
            fim: new Date("2026-09-30"),
            estado: false,
            tarefas: {
              create: [
                {
                  nome: "T3.1 - Testes de fadiga",
                  descricao: "Realização de testes de fadiga",
                  inicio: new Date("2026-04-01"),
                  fim: new Date("2026-06-30"),
                  estado: false,
                },
                {
                  nome: "T3.2 - Validação final",
                  descricao: "Validação final do processo",
                  inicio: new Date("2026-07-01"),
                  fim: new Date("2026-09-30"),
                  estado: false,
                }
              ]
            }
          },
          {
            nome: "WP4 - Disseminação",
            inicio: new Date("2026-10-01"),
            fim: new Date("2026-12-31"),
            estado: false,
            tarefas: {
              create: [
                {
                  nome: "T4.1 - Publicações científicas",
                  descricao: "Preparação e submissão de artigos",
                  inicio: new Date("2026-10-01"),
                  fim: new Date("2026-11-15"),
                  estado: false,
                },
                {
                  nome: "T4.2 - Workshop final",
                  descricao: "Organização do workshop de encerramento",
                  inicio: new Date("2026-11-16"),
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

  // Projeto 3: PENDENTE - GreenAuto
  const projetoPendente = await prisma.projeto.create({
    data: {
      nome: "GreenAuto",
      descricao: "Desenvolvimento de tecnologias avançadas para automação industrial.",
      inicio: new Date("2025-09-01"),
      fim: new Date("2028-11-30"),
      estado: ProjetoEstado.PENDENTE,
      financiamentoId: portugal2030Id,
      valor_eti: new Decimal(5500.0),
      taxa_financiamento: new Decimal(0.85),
      workpackages: {
        create: [
          {
            nome: "WP1 - Análise e Especificações",
            inicio: new Date("2025-09-01"),
            fim: new Date("2026-02-28"),
            estado: false,
            tarefas: {
              create: [
                {
                  nome: "T1.1 - Levantamento de requisitos",
                  descricao: "Análise detalhada dos requisitos do sistema",
                  inicio: new Date("2025-09-01"),
                  fim: new Date("2025-11-30"),
                  estado: false,
                },
                {
                  nome: "T1.2 - Especificações técnicas",
                  descricao: "Definição das especificações técnicas",
                  inicio: new Date("2025-12-01"),
                  fim: new Date("2026-02-28"),
                  estado: false,
                }
              ]
            }
          },
          {
            nome: "WP2 - Desenvolvimento Core",
            inicio: new Date("2026-03-01"),
            fim: new Date("2027-08-31"),
            estado: false,
            tarefas: {
              create: [
                {
                  nome: "T2.1 - Desenvolvimento base",
                  descricao: "Implementação das funcionalidades core",
                  inicio: new Date("2026-03-01"),
                  fim: new Date("2026-11-30"),
                  estado: false,
                },
                {
                  nome: "T2.2 - Integração sistemas",
                  descricao: "Integração com sistemas existentes",
                  inicio: new Date("2026-12-01"),
                  fim: new Date("2027-08-31"),
                  estado: false,
                }
              ]
            }
          },
          {
            nome: "WP3 - Validação",
            inicio: new Date("2027-09-01"),
            fim: new Date("2028-08-31"),
            estado: false,
            tarefas: {
              create: [
                {
                  nome: "T3.1 - Testes piloto",
                  descricao: "Realização de testes piloto",
                  inicio: new Date("2027-09-01"),
                  fim: new Date("2028-02-28"),
                  estado: false,
                },
                {
                  nome: "T3.2 - Validação industrial",
                  descricao: "Validação em ambiente industrial",
                  inicio: new Date("2028-03-01"),
                  fim: new Date("2028-08-31"),
                  estado: false,
                }
              ]
            }
          },
          {
            nome: "WP4 - Disseminação",
            inicio: new Date("2028-06-01"),
            fim: new Date("2028-11-30"),
            estado: false,
            tarefas: {
              create: [
                {
                  nome: "T4.1 - Divulgação científica",
                  descricao: "Publicações e apresentações",
                  inicio: new Date("2028-06-01"),
                  fim: new Date("2028-09-30"),
                  estado: false,
                },
                {
                  nome: "T4.2 - Exploração resultados",
                  descricao: "Plano de exploração e disseminação",
                  inicio: new Date("2028-10-01"),
                  fim: new Date("2028-11-30"),
                  estado: false,
                }
              ]
            }
          }
        ]
      }
    }
  });

  // Projeto 4: APROVADO - DreamFAB
  const projetoAprovado = await prisma.projeto.create({
    data: {
      nome: "DreamFAB",
      descricao: "Desenvolvimento de tecnologias avançadas para fabricação digital e automação industrial.",
      inicio: new Date("2025-09-01"),
      fim: new Date("2028-11-30"),
      estado: ProjetoEstado.APROVADO,
      financiamentoId: horizonteEuropaId,
      valor_eti: new Decimal(5500.0),
      taxa_financiamento: new Decimal(0.85),
      workpackages: {
        create: [
          {
            nome: "WP1 - Análise e Especificações",
            inicio: new Date("2025-09-01"),
            fim: new Date("2026-02-28"),
            estado: false,
            tarefas: {
              create: [
                {
                  nome: "T1.1 - Levantamento de requisitos",
                  descricao: "Análise detalhada dos requisitos do sistema",
                  inicio: new Date("2025-09-01"),
                  fim: new Date("2025-11-30"),
                  estado: false,
                },
                {
                  nome: "T1.2 - Especificações técnicas",
                  descricao: "Definição das especificações técnicas",
                  inicio: new Date("2025-12-01"),
                  fim: new Date("2026-02-28"),
                  estado: false,
                }
              ]
            }
          },
          {
            nome: "WP2 - Desenvolvimento Core",
            inicio: new Date("2026-03-01"),
            fim: new Date("2027-08-31"),
            estado: false,
            tarefas: {
              create: [
                {
                  nome: "T2.1 - Desenvolvimento base",
                  descricao: "Implementação das funcionalidades core",
                  inicio: new Date("2026-03-01"),
                  fim: new Date("2026-11-30"),
                  estado: false,
                },
                {
                  nome: "T2.2 - Integração sistemas",
                  descricao: "Integração com sistemas existentes",
                  inicio: new Date("2026-12-01"),
                  fim: new Date("2027-08-31"),
                  estado: false,
                }
              ]
            }
          },
          {
            nome: "WP3 - Validação",
            inicio: new Date("2027-09-01"),
            fim: new Date("2028-08-31"),
            estado: false,
            tarefas: {
              create: [
                {
                  nome: "T3.1 - Testes piloto",
                  descricao: "Realização de testes piloto",
                  inicio: new Date("2027-09-01"),
                  fim: new Date("2028-02-28"),
                  estado: false,
                },
                {
                  nome: "T3.2 - Validação industrial",
                  descricao: "Validação em ambiente industrial",
                  inicio: new Date("2028-03-01"),
                  fim: new Date("2028-08-31"),
                  estado: false,
                }
              ]
            }
          },
          {
            nome: "WP4 - Disseminação",
            inicio: new Date("2028-06-01"),
            fim: new Date("2028-11-30"),
            estado: false,
            tarefas: {
              create: [
                {
                  nome: "T4.1 - Divulgação científica",
                  descricao: "Publicações e apresentações",
                  inicio: new Date("2028-06-01"),
                  fim: new Date("2028-09-30"),
                  estado: false,
                },
                {
                  nome: "T4.2 - Exploração resultados",
                  descricao: "Plano de exploração e disseminação",
                  inicio: new Date("2028-10-01"),
                  fim: new Date("2028-11-30"),
                  estado: false,
                }
              ]
            }
          }
        ]
      }
    }
  });

  // Buscar workpackages dos projetos após sua criação
  const wp1IAM = await prisma.workpackage.findFirst({
    where: { projetoId: projetoEmDesenvolvimento.id, nome: { contains: "WP1" } }
  });

  const wp2IAM = await prisma.workpackage.findFirst({
    where: { projetoId: projetoEmDesenvolvimento.id, nome: { contains: "WP2" } }
  });

  const wp3IAM = await prisma.workpackage.findFirst({
    where: { projetoId: projetoEmDesenvolvimento.id, nome: { contains: "WP3" } }
  });

  const wp4IAM = await prisma.workpackage.findFirst({
    where: { projetoId: projetoEmDesenvolvimento.id, nome: { contains: "WP4" } }
  });

  const wp1Green = await prisma.workpackage.findFirst({
    where: { projetoId: projetoPendente.id, nome: { contains: "WP1" } }
  });

  const wp2Green = await prisma.workpackage.findFirst({
    where: { projetoId: projetoPendente.id, nome: { contains: "WP2" } }
  });

  const wp3Green = await prisma.workpackage.findFirst({
    where: { projetoId: projetoPendente.id, nome: { contains: "WP3" } }
  });

  const wp4Green = await prisma.workpackage.findFirst({
    where: { projetoId: projetoPendente.id, nome: { contains: "WP4" } }
  });

  const wp1Dream = await prisma.workpackage.findFirst({
    where: { projetoId: projetoAprovado.id, nome: { contains: "WP1" } }
  });

  const wp2Dream = await prisma.workpackage.findFirst({
    where: { projetoId: projetoAprovado.id, nome: { contains: "WP2" } }
  });

  const wp3Dream = await prisma.workpackage.findFirst({
    where: { projetoId: projetoAprovado.id, nome: { contains: "WP3" } }
  });

  const wp4Dream = await prisma.workpackage.findFirst({
    where: { projetoId: projetoAprovado.id, nome: { contains: "WP4" } }
  });

  // Adicionar materiais aos workpackages do DreamFAB
  if (wp1Dream) {
    await prisma.material.createMany({
      data: [
        {
          nome: "Software CAD/CAM Avançado",
          preco: new Decimal(8000.0),
          quantidade: 2,
          ano_utilizacao: 2025,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp1Dream.id,
          estado: false
        },
        {
          nome: "Workstation de Desenvolvimento",
          preco: new Decimal(5000.0),
          quantidade: 2,
          ano_utilizacao: 2025,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp1Dream.id,
          estado: false
        }
      ]
    });
  }

  if (wp2Dream) {
    await prisma.material.createMany({
      data: [
        {
          nome: "Sistema Robótico Industrial",
          preco: new Decimal(45000.0),
          quantidade: 1,
          ano_utilizacao: 2026,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp2Dream.id,
          estado: false
        },
        {
          nome: "Sensores Industriais",
          preco: new Decimal(12000.0),
          quantidade: 1,
          ano_utilizacao: 2026,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp2Dream.id,
          estado: false
        },
        {
          nome: "Sistema de Visão 3D",
          preco: new Decimal(15000.0),
          quantidade: 1,
          ano_utilizacao: 2027,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp2Dream.id,
          estado: false
        }
      ]
    });
  }

  if (wp3Dream) {
    await prisma.material.createMany({
      data: [
        {
          nome: "Equipamento de Teste",
          preco: new Decimal(45000.0),
          quantidade: 1,
          ano_utilizacao: 2027,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp3Dream.id,
          estado: false
        },
        {
          nome: "Sistema de Monitorização",
          preco: new Decimal(28000.0),
          quantidade: 1,
          ano_utilizacao: 2028,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp3Dream.id,
          estado: false
        }
      ]
    });
  }

  if (wp4Dream) {
    await prisma.material.createMany({
      data: [
        {
          nome: "Material Promocional",
          preco: new Decimal(5000.0),
          quantidade: 1,
          ano_utilizacao: 2028,
          rubrica: Rubrica.OUTROS_CUSTOS,
          workpackageId: wp4Dream.id,
          estado: false
        },
        {
          nome: "Organização Eventos",
          preco: new Decimal(15000.0),
          quantidade: 1,
          ano_utilizacao: 2028,
          rubrica: Rubrica.OUTROS_CUSTOS,
          workpackageId: wp4Dream.id,
          estado: false
        }
      ]
    });
  }

  // Adicionar alocações para o DreamFAB
  if (wp1Dream) {
    await createAlocacoes(wp1Dream.id, [
      { userId: ricardoId, mes: 9, ano: 2025, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 9, ano: 2025, ocupacao: 0.3 },
      { userId: joaoId, mes: 9, ano: 2025, ocupacao: 0.3 },
      { userId: filipeId, mes: 9, ano: 2025, ocupacao: 0.4 },
      { userId: ruiId, mes: 9, ano: 2025, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 9, ano: 2025, ocupacao: 0.3 },
      { userId: ricardoId, mes: 10, ano: 2025, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 10, ano: 2025, ocupacao: 0.3 },
      { userId: joaoId, mes: 10, ano: 2025, ocupacao: 0.3 },
      { userId: filipeId, mes: 10, ano: 2025, ocupacao: 0.4 },
      { userId: ruiId, mes: 10, ano: 2025, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 10, ano: 2025, ocupacao: 0.3 },
      { userId: ricardoId, mes: 11, ano: 2025, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 11, ano: 2025, ocupacao: 0.3 },
      { userId: joaoId, mes: 11, ano: 2025, ocupacao: 0.3 },
      { userId: filipeId, mes: 11, ano: 2025, ocupacao: 0.4 },
      { userId: ruiId, mes: 11, ano: 2025, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 11, ano: 2025, ocupacao: 0.3 },
      { userId: ricardoId, mes: 12, ano: 2025, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 12, ano: 2025, ocupacao: 0.3 },
      { userId: joaoId, mes: 12, ano: 2025, ocupacao: 0.3 },
      { userId: filipeId, mes: 12, ano: 2025, ocupacao: 0.4 },
      { userId: ruiId, mes: 12, ano: 2025, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 12, ano: 2025, ocupacao: 0.3 }
    ]);
  }

  if (wp2Dream) {
    await createAlocacoes(wp2Dream.id, [
      { userId: anaClaudiaId, mes: 6, ano: 2028, ocupacao: 0.3 },
      { userId: filipeId, mes: 6, ano: 2028, ocupacao: 0.3 },
      { userId: ruiId, mes: 6, ano: 2028, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 7, ano: 2028, ocupacao: 0.3 },
      { userId: filipeId, mes: 7, ano: 2028, ocupacao: 0.3 },
      { userId: ruiId, mes: 7, ano: 2028, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 8, ano: 2028, ocupacao: 0.3 },
      { userId: filipeId, mes: 8, ano: 2028, ocupacao: 0.3 },
      { userId: ruiId, mes: 8, ano: 2028, ocupacao: 0.3 }
    ]);
  }

  // Adicionar materiais aos workpackages do IAMFat
  if (wp1IAM) {
    await prisma.material.createMany({
      data: [
        {
          nome: "Sistema WAAM Laboratorial",
          preco: new Decimal(15000.0),
          quantidade: 1,
          ano_utilizacao: 2025,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp1IAM.id,
          estado: false
        },
        {
          nome: "Material Base Testes",
          preco: new Decimal(2500.0),
          quantidade: 1,
          ano_utilizacao: 2025,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp1IAM.id,
          estado: true
        },
        {
          nome: "Sensores de Temperatura",
          preco: new Decimal(1500.0),
          quantidade: 4,
          ano_utilizacao: 2025,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp1IAM.id,
          estado: false
        }
      ]
    });
  }

  // Adicionar alocações para o IAMFat
  if (wp1IAM) {
    await createAlocacoes(wp1IAM.id, [
      // Novembro 2024
      { userId: ricardoId, mes: 11, ano: 2024, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 11, ano: 2024, ocupacao: 0.3 },
      { userId: joaoId, mes: 11, ano: 2024, ocupacao: 0.3 },
      { userId: filipeId, mes: 11, ano: 2024, ocupacao: 0.4 },
      { userId: ruiId, mes: 11, ano: 2024, ocupacao: 0.3 },
      // Dezembro 2024
      { userId: ricardoId, mes: 12, ano: 2024, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 12, ano: 2024, ocupacao: 0.3 },
      { userId: joaoId, mes: 12, ano: 2024, ocupacao: 0.3 },
      { userId: filipeId, mes: 12, ano: 2024, ocupacao: 0.4 },
      { userId: ruiId, mes: 12, ano: 2024, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 12, ano: 2024, ocupacao: 0.3 },
      // Janeiro 2025
      { userId: ricardoId, mes: 1, ano: 2025, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 1, ano: 2025, ocupacao: 0.3 },
      { userId: joaoId, mes: 1, ano: 2025, ocupacao: 0.3 },
      { userId: filipeId, mes: 1, ano: 2025, ocupacao: 0.4 },
      { userId: ruiId, mes: 1, ano: 2025, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 1, ano: 2025, ocupacao: 0.3 },
      // Fevereiro 2025
      { userId: ricardoId, mes: 2, ano: 2025, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 2, ano: 2025, ocupacao: 0.3 },
      { userId: joaoId, mes: 2, ano: 2025, ocupacao: 0.3 },
      { userId: filipeId, mes: 2, ano: 2025, ocupacao: 0.4 },
      { userId: ruiId, mes: 2, ano: 2025, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 2, ano: 2025, ocupacao: 0.3 },
      // Março 2025
      { userId: ricardoId, mes: 3, ano: 2025, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 3, ano: 2025, ocupacao: 0.3 },
      { userId: joaoId, mes: 3, ano: 2025, ocupacao: 0.3 },
      { userId: filipeId, mes: 3, ano: 2025, ocupacao: 0.4 },
      { userId: ruiId, mes: 3, ano: 2025, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 3, ano: 2025, ocupacao: 0.3 }
    ]);
  }

  if (wp2IAM) {
    await prisma.material.createMany({
      data: [
        {
          nome: "Sistema WAAM Laboratorial",
          preco: new Decimal(15000.0),
          quantidade: 1,
          ano_utilizacao: 2025,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp2IAM.id,
          estado: false
        },
        {
          nome: "Material Base Testes",
          preco: new Decimal(2500.0),
          quantidade: 1,
          ano_utilizacao: 2025,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp2IAM.id,
          estado: true
        },
        {
          nome: "Sensores de Temperatura",
          preco: new Decimal(1500.0),
          quantidade: 4,
          ano_utilizacao: 2025,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp2IAM.id,
          estado: false
        }
      ]
    });
  }

  if (wp2IAM) {
    await createAlocacoes(wp2IAM.id, [
      // Abril 2025
      { userId: filipeId, mes: 4, ano: 2025, ocupacao: 0.5 },
      { userId: ruiId, mes: 4, ano: 2025, ocupacao: 0.4 },
      { userId: anaClaudiaId, mes: 4, ano: 2025, ocupacao: 0.3 },
      { userId: ricardoId, mes: 4, ano: 2025, ocupacao: 0.3 },
      { userId: joaoId, mes: 4, ano: 2025, ocupacao: 0.3 },
      // Maio 2025
      { userId: filipeId, mes: 5, ano: 2025, ocupacao: 0.5 },
      { userId: ruiId, mes: 5, ano: 2025, ocupacao: 0.4 },
      { userId: anaClaudiaId, mes: 5, ano: 2025, ocupacao: 0.3 },
      { userId: ricardoId, mes: 5, ano: 2025, ocupacao: 0.3 },
      { userId: joaoId, mes: 5, ano: 2025, ocupacao: 0.3 },
      { userId: anaIsabelId, mes: 5, ano: 2025, ocupacao: 0.3 },
      // Junho a Dezembro 2025
      { userId: filipeId, mes: 6, ano: 2025, ocupacao: 0.5 },
      { userId: ruiId, mes: 6, ano: 2025, ocupacao: 0.4 },
      { userId: anaClaudiaId, mes: 6, ano: 2025, ocupacao: 0.3 },
      { userId: ricardoId, mes: 6, ano: 2025, ocupacao: 0.3 },
      { userId: joaoId, mes: 6, ano: 2025, ocupacao: 0.3 },
      { userId: anaIsabelId, mes: 6, ano: 2025, ocupacao: 0.3 }
    ]);
  }

  if (wp3IAM) {
    await createAlocacoes(wp3IAM.id, [
      // Abril 2026
      { userId: joaoId, mes: 4, ano: 2026, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 4, ano: 2026, ocupacao: 0.3 },
      { userId: ricardoId, mes: 4, ano: 2026, ocupacao: 0.3 },
      { userId: filipeId, mes: 4, ano: 2026, ocupacao: 0.4 },
      { userId: ruiId, mes: 4, ano: 2026, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 4, ano: 2026, ocupacao: 0.3 },
      // Maio 2026
      { userId: joaoId, mes: 5, ano: 2026, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 5, ano: 2026, ocupacao: 0.3 },
      { userId: ricardoId, mes: 5, ano: 2026, ocupacao: 0.3 },
      { userId: filipeId, mes: 5, ano: 2026, ocupacao: 0.4 },
      { userId: ruiId, mes: 5, ano: 2026, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 5, ano: 2026, ocupacao: 0.3 },
      // Junho 2026
      { userId: joaoId, mes: 6, ano: 2026, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 6, ano: 2026, ocupacao: 0.3 },
      { userId: ricardoId, mes: 6, ano: 2026, ocupacao: 0.3 },
      { userId: filipeId, mes: 6, ano: 2026, ocupacao: 0.4 },
      { userId: ruiId, mes: 6, ano: 2026, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 6, ano: 2026, ocupacao: 0.3 },
      // Julho 2026
      { userId: joaoId, mes: 7, ano: 2026, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 7, ano: 2026, ocupacao: 0.3 },
      { userId: ricardoId, mes: 7, ano: 2026, ocupacao: 0.3 },
      { userId: filipeId, mes: 7, ano: 2026, ocupacao: 0.4 },
      { userId: ruiId, mes: 7, ano: 2026, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 7, ano: 2026, ocupacao: 0.3 },
      // Agosto 2026
      { userId: joaoId, mes: 8, ano: 2026, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 8, ano: 2026, ocupacao: 0.3 },
      { userId: ricardoId, mes: 8, ano: 2026, ocupacao: 0.3 },
      { userId: filipeId, mes: 8, ano: 2026, ocupacao: 0.4 },
      { userId: ruiId, mes: 8, ano: 2026, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 8, ano: 2026, ocupacao: 0.3 },
      // Setembro 2026
      { userId: joaoId, mes: 9, ano: 2026, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 9, ano: 2026, ocupacao: 0.3 },
      { userId: ricardoId, mes: 9, ano: 2026, ocupacao: 0.3 },
      { userId: filipeId, mes: 9, ano: 2026, ocupacao: 0.4 },
      { userId: ruiId, mes: 9, ano: 2026, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 9, ano: 2026, ocupacao: 0.3 }
    ]);
  }

  if (wp4IAM) {
    await createAlocacoes(wp4IAM.id, [
      // Outubro 2026
      { userId: anaClaudiaId, mes: 10, ano: 2026, ocupacao: 0.4 },
      { userId: filipeId, mes: 10, ano: 2026, ocupacao: 0.4 },
      { userId: ruiId, mes: 10, ano: 2026, ocupacao: 0.4 },
      { userId: joaoId, mes: 10, ano: 2026, ocupacao: 0.3 },
      { userId: anaIsabelId, mes: 10, ano: 2026, ocupacao: 0.3 },
      { userId: ricardoId, mes: 10, ano: 2026, ocupacao: 0.3 },
      // Novembro 2026
      { userId: anaClaudiaId, mes: 11, ano: 2026, ocupacao: 0.4 },
      { userId: filipeId, mes: 11, ano: 2026, ocupacao: 0.4 },
      { userId: ruiId, mes: 11, ano: 2026, ocupacao: 0.4 },
      { userId: joaoId, mes: 11, ano: 2026, ocupacao: 0.3 },
      { userId: anaIsabelId, mes: 11, ano: 2026, ocupacao: 0.3 },
      { userId: ricardoId, mes: 11, ano: 2026, ocupacao: 0.3 },
      // Dezembro 2026
      { userId: anaClaudiaId, mes: 12, ano: 2026, ocupacao: 0.4 },
      { userId: filipeId, mes: 12, ano: 2026, ocupacao: 0.4 },
      { userId: ruiId, mes: 12, ano: 2026, ocupacao: 0.4 },
      { userId: joaoId, mes: 12, ano: 2026, ocupacao: 0.3 },
      { userId: anaIsabelId, mes: 12, ano: 2026, ocupacao: 0.3 },
      { userId: ricardoId, mes: 12, ano: 2026, ocupacao: 0.3 }
    ]);
  }

  // Adicionar alocações para o GreenAuto
  if (wp1Green) {
    await createAlocacoes(wp1Green.id, [
      // Setembro 2025
      { userId: joaoId, mes: 9, ano: 2025, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 9, ano: 2025, ocupacao: 0.3 },
      { userId: ricardoId, mes: 9, ano: 2025, ocupacao: 0.3 },
      { userId: filipeId, mes: 9, ano: 2025, ocupacao: 0.4 },
      { userId: ruiId, mes: 9, ano: 2025, ocupacao: 0.3 },
      // Outubro 2025
      { userId: joaoId, mes: 10, ano: 2025, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 10, ano: 2025, ocupacao: 0.3 },
      { userId: ricardoId, mes: 10, ano: 2025, ocupacao: 0.3 },
      { userId: filipeId, mes: 10, ano: 2025, ocupacao: 0.4 },
      { userId: ruiId, mes: 10, ano: 2025, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 10, ano: 2025, ocupacao: 0.3 },
      // Novembro 2025
      { userId: joaoId, mes: 11, ano: 2025, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 11, ano: 2025, ocupacao: 0.3 },
      { userId: ricardoId, mes: 11, ano: 2025, ocupacao: 0.3 },
      { userId: filipeId, mes: 11, ano: 2025, ocupacao: 0.4 },
      { userId: ruiId, mes: 11, ano: 2025, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 11, ano: 2025, ocupacao: 0.3 },
      // Dezembro 2025
      { userId: joaoId, mes: 12, ano: 2025, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 12, ano: 2025, ocupacao: 0.3 },
      { userId: ricardoId, mes: 12, ano: 2025, ocupacao: 0.3 },
      { userId: filipeId, mes: 12, ano: 2025, ocupacao: 0.4 },
      { userId: ruiId, mes: 12, ano: 2025, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 12, ano: 2025, ocupacao: 0.3 },
      // Janeiro 2026
      { userId: joaoId, mes: 1, ano: 2026, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 1, ano: 2026, ocupacao: 0.3 },
      { userId: ricardoId, mes: 1, ano: 2026, ocupacao: 0.3 },
      { userId: filipeId, mes: 1, ano: 2026, ocupacao: 0.4 },
      { userId: ruiId, mes: 1, ano: 2026, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 1, ano: 2026, ocupacao: 0.3 },
      // Fevereiro 2026
      { userId: joaoId, mes: 2, ano: 2026, ocupacao: 0.4 },
      { userId: anaIsabelId, mes: 2, ano: 2026, ocupacao: 0.3 },
      { userId: ricardoId, mes: 2, ano: 2026, ocupacao: 0.3 },
      { userId: filipeId, mes: 2, ano: 2026, ocupacao: 0.4 },
      { userId: ruiId, mes: 2, ano: 2026, ocupacao: 0.3 },
      { userId: anaClaudiaId, mes: 2, ano: 2026, ocupacao: 0.3 }
    ]);
  }

  if (wp2Green) {
    await createAlocacoes(wp2Green.id, [
      // Março 2026
      { userId: filipeId, mes: 3, ano: 2026, ocupacao: 0.5 },
      { userId: ruiId, mes: 3, ano: 2026, ocupacao: 0.4 },
      { userId: anaClaudiaId, mes: 3, ano: 2026, ocupacao: 0.3 },
      { userId: joaoId, mes: 3, ano: 2026, ocupacao: 0.3 },
      { userId: anaIsabelId, mes: 3, ano: 2026, ocupacao: 0.3 },
      // Abril 2026 a Agosto 2027
      { userId: filipeId, mes: 4, ano: 2026, ocupacao: 0.5 },
      { userId: ruiId, mes: 4, ano: 2026, ocupacao: 0.4 },
      { userId: anaClaudiaId, mes: 4, ano: 2026, ocupacao: 0.3 },
      { userId: joaoId, mes: 4, ano: 2026, ocupacao: 0.3 },
      { userId: anaIsabelId, mes: 4, ano: 2026, ocupacao: 0.3 }
    ]);

    // Adicionar materiais ao WP2
    await prisma.material.createMany({
      data: [
        {
          nome: "Sistema de Navegação AGV",
          preco: new Decimal(8000.0), // Reduced from 15000
          quantidade: 1,
          ano_utilizacao: 2026,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp2Green.id,
          estado: false
        },
        {
          nome: "Sensores LiDAR",
          preco: new Decimal(4000.0), // Reduced from 8000
          quantidade: 3,
          ano_utilizacao: 2026,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp2Green.id,
          estado: false
        },
        {
          nome: "Workstation Dell Precision",
          preco: new Decimal(2000.0), // Reduced from 3500
          quantidade: 4,
          ano_utilizacao: 2026,
          rubrica: Rubrica.MATERIAIS,
          workpackageId: wp2Green.id,
          estado: false
        }
      ]
    });
  }

  if (wp3Green) {
    await createAlocacoes(wp3Green.id, [
      // Setembro 2027 a Agosto 2028
      { userId: anaClaudiaId, mes: 9, ano: 2027, ocupacao: 0.4 },
      { userId: filipeId, mes: 9, ano: 2027, ocupacao: 0.4 },
      { userId: ruiId, mes: 9, ano: 2027, ocupacao: 0.4 },
      { userId: joaoId, mes: 9, ano: 2027, ocupacao: 0.3 },
      { userId: anaIsabelId, mes: 9, ano: 2027, ocupacao: 0.3 },
      { userId: ricardoId, mes: 9, ano: 2027, ocupacao: 0.3 },
      // Outubro 2027
      { userId: anaClaudiaId, mes: 10, ano: 2027, ocupacao: 0.4 },
      { userId: filipeId, mes: 10, ano: 2027, ocupacao: 0.4 },
      { userId: ruiId, mes: 10, ano: 2027, ocupacao: 0.4 },
      { userId: joaoId, mes: 10, ano: 2027, ocupacao: 0.3 },
      { userId: anaIsabelId, mes: 10, ano: 2027, ocupacao: 0.3 },
      { userId: ricardoId, mes: 10, ano: 2027, ocupacao: 0.3 },
      // Novembro 2027
      { userId: anaClaudiaId, mes: 11, ano: 2027, ocupacao: 0.4 },
      { userId: filipeId, mes: 11, ano: 2027, ocupacao: 0.4 },
      { userId: ruiId, mes: 11, ano: 2027, ocupacao: 0.4 },
      { userId: joaoId, mes: 11, ano: 2027, ocupacao: 0.3 },
      { userId: anaIsabelId, mes: 11, ano: 2027, ocupacao: 0.3 },
      { userId: ricardoId, mes: 11, ano: 2027, ocupacao: 0.3 }
    ]);
  }

  if (wp4Green) {
    await createAlocacoes(wp4Green.id, [
      // Junho 2028
      { userId: anaClaudiaId, mes: 6, ano: 2028, ocupacao: 0.4 },
      { userId: filipeId, mes: 6, ano: 2028, ocupacao: 0.4 },
      { userId: ruiId, mes: 6, ano: 2028, ocupacao: 0.4 },
      { userId: joaoId, mes: 6, ano: 2028, ocupacao: 0.3 },
      { userId: anaIsabelId, mes: 6, ano: 2028, ocupacao: 0.3 },
      { userId: ricardoId, mes: 6, ano: 2028, ocupacao: 0.3 },
      // Julho 2028
      { userId: anaClaudiaId, mes: 7, ano: 2028, ocupacao: 0.4 },
      { userId: filipeId, mes: 7, ano: 2028, ocupacao: 0.4 },
      { userId: ruiId, mes: 7, ano: 2028, ocupacao: 0.4 },
      { userId: joaoId, mes: 7, ano: 2028, ocupacao: 0.3 },
      { userId: anaIsabelId, mes: 7, ano: 2028, ocupacao: 0.3 },
      { userId: ricardoId, mes: 7, ano: 2028, ocupacao: 0.3 },
      // Agosto 2028
      { userId: anaClaudiaId, mes: 8, ano: 2028, ocupacao: 0.4 },
      { userId: filipeId, mes: 8, ano: 2028, ocupacao: 0.4 },
      { userId: ruiId, mes: 8, ano: 2028, ocupacao: 0.4 },
      { userId: joaoId, mes: 8, ano: 2028, ocupacao: 0.3 },
      { userId: anaIsabelId, mes: 8, ano: 2028, ocupacao: 0.3 },
      { userId: ricardoId, mes: 8, ano: 2028, ocupacao: 0.3 }
    ]);
  }

  console.log("✅ Alocações e entregáveis criados com sucesso!");

  // --- Estatísticas Finais ---
  const stats = {
    users: await prisma.user.count(),
    financiamentos: await prisma.financiamento.count(),
    materiais: await prisma.material.count(),
    projetos: await prisma.projeto.count(),
    workpackages: await prisma.workpackage.count(),
    tarefas: await prisma.tarefa.count(),
    alocacoes: await prisma.alocacaoRecurso.count(),
    entregaveis: await prisma.entregavel.count(),
  };

  console.log("📊 Estatísticas Finais:");
  console.table(stats);
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