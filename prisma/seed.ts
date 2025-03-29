import { PrismaClient, ProjetoEstado, Permissao, Regime, Rubrica } from '@prisma/client';
import { hash } from 'bcryptjs';
import { Decimal } from "decimal.js";

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 A iniciar seed do banco de dados...');

  // Limpar dados existentes
  console.log('🧹 A limpar tabelas existentes...');
  
  const deleteIfExists = async (deleteFunction: () => Promise<any>) => {
    try {
      await deleteFunction();
    } catch (error: any) {
      // Ignorar apenas erros de tabela não existente (P2021)
      if (error.code === 'P2021') {
        console.warn(`⚠️ Tabela não existe, a ignorar... (${error.meta?.table})`);
      } else {
        console.error(`❌ Erro grave ao limpar dados: ${error.message}`);
        throw error; // Relançar outros erros
      }
    }
  };

  await deleteIfExists(() => prisma.alocacaoRecurso.deleteMany());
  await deleteIfExists(() => prisma.entregavel.deleteMany());
  await deleteIfExists(() => prisma.tarefa.deleteMany());
  await deleteIfExists(() => prisma.material.deleteMany());
  await deleteIfExists(() => prisma.workpackage.deleteMany());
  await deleteIfExists(() => prisma.projeto.deleteMany());
  await deleteIfExists(() => prisma.financiamento.deleteMany());
  await deleteIfExists(() => prisma.verificationToken.deleteMany());
  await deleteIfExists(() => prisma.session.deleteMany());
  await deleteIfExists(() => prisma.account.deleteMany());
  await deleteIfExists(() => prisma.password.deleteMany());
  await deleteIfExists(() => prisma.passwordReset.deleteMany());
  await deleteIfExists(() => prisma.user.deleteMany());

  // Criar Utilizadores
  console.log('👤 A criar utilizadores...');
  
  const admin = await prisma.user.create({
    data: {
      name: "Vasco Fernandes",
      email: "admin@starinstitute.com", 
      emailVerified: new Date(),
      foto: "https://ui-avatars.com/api/?name=Administrator&background=1d4ed8&color=fff",
      atividade: "Administrador",
      contratacao: new Date("2020-01-01"),
      username: "admin",
      permissao: Permissao.ADMIN,
      regime: Regime.INTEGRAL,
      salario: new Decimal(5000.00) // Valor de pagamento para o admin
    }
  });

  // Criar password para o administrador
  const adminPassword = "admin123"; 
  const hashedPassword = await hash(adminPassword, 12);
  
  // Criar entrada na tabela Password
  await prisma.password.create({
    data: {
      userId: admin.id,
      hash: hashedPassword
    }
  });

  const gestor = await prisma.user.create({
    data: {
      name: "Helga Carvalho", 
      email: "helga.carvalho@starinstitute.com",
      emailVerified: new Date(),
      foto: "https://ui-avatars.com/api/?name=Helga+Carvalho&background=15803d&color=fff",
      atividade: "Administração",
      contratacao: new Date("2020-03-15"),
      username: "helga.carvalho",
      permissao: Permissao.GESTOR,
      regime: Regime.INTEGRAL,
      salario: new Decimal(4500.00) // Valor de pagamento para o gestor
    }
  });

  // Criar password para o gestor
  await prisma.password.create({
    data: {
      userId: gestor.id,
      hash: await hash("gestor123", 12)
    }
  });

  // Criar utilizadores regulares
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Ricardo Correia",
        email: "ricardo.correia@starinstitute.com",
        emailVerified: new Date(),
        foto: "https://ui-avatars.com/api/?name=Ricardo+Correia&background=0284c7&color=fff",
        atividade: "Investigador no Laboratório Digital",
        contratacao: new Date("2021-01-10"),
        username: "ricardo.correia",
        permissao: Permissao.COMUM,
        regime: Regime.PARCIAL,
        salario: new Decimal(3000.00) // Valor de pagamento para o utilizador
      }
    }),
    prisma.user.create({
      data: {
        name: "Ana Isabel Carvalho",
        email: "ana.i.carvalho@starinstitute.com",
        emailVerified: new Date(),
        foto: "https://ui-avatars.com/api/?name=Ana+Isabel+Carvalho&background=0f766e&color=fff",
        atividade: "Investigadora no Laboratório Digital",
        contratacao: new Date("2021-03-22"),
        username: "ana.i.carvalho",
        permissao: Permissao.COMUM,
        regime: Regime.PARCIAL,
        salario: new Decimal(3200.00) // Valor de pagamento para o utilizador
      }
    }),
    prisma.user.create({
      data: {
        name: "Ana Claudia Carvalho",
        email: "ana.c.carvalho@starinstitute.com",
        emailVerified: new Date(),
        foto: "https://ui-avatars.com/api/?name=Ana+Claudia+Carvalho&background=7e22ce&color=fff",
        atividade: "Investigadora no Laboratório Digital",
        contratacao: new Date("2022-01-05"),
        username: "ana.c.carvalho",
        permissao: Permissao.COMUM,
        regime: Regime.INTEGRAL,
        salario: new Decimal(3500.00) // Valor de pagamento para o utilizador
      }
    }),
    prisma.user.create({
      data: {
        name: "João Lopes",
        email: "joao.lopes@starinstitute.com",
        emailVerified: new Date(),
        foto: "https://ui-avatars.com/api/?name=João+Lopes&background=b91c1c&color=fff",
        atividade: "Investigador no Laboratório Digital",
        contratacao: new Date("2022-06-12"),
        username: "joao.lopes",
        permissao: Permissao.COMUM,
        regime: Regime.INTEGRAL,
        salario: new Decimal(3400.00) // Valor de pagamento para o utilizador
      }
    }),
    prisma.user.create({
      data: {
        name: "Filipe Coutinho",
        email: "filipe.coutinho@starinstitute.com",
        emailVerified: new Date(),
        foto: "https://ui-avatars.com/api/?name=Filipe+Coutinho&background=c2410c&color=fff",
        atividade: "Investigador no Laboratório Digital",
        contratacao: new Date("2023-02-01"),
        username: "filipe.coutinho",
        permissao: Permissao.COMUM,
        regime: Regime.INTEGRAL,
        salario: new Decimal(3600.00) // Valor de pagamento para o utilizador
      }
    }),
    prisma.user.create({
      data: {
        name: "Rui Coimbra",
        email: "rui.coimbra@starinstitute.com",
        emailVerified: new Date(),
        foto: "https://ui-avatars.com/api/?name=Rui+Coimbra&background=0284c7&color=fff",
        atividade: "Investigador no Laboratório Digital",
        contratacao: new Date("2023-02-01"),
        username: "rui.coimbra",
        permissao: Permissao.COMUM,
        regime: Regime.INTEGRAL,
        salario: new Decimal(3700.00) // Valor de pagamento para o utilizador
      }
    })
  ]);

  // Criar passwords para os utilizadores regulares
  for (const user of users) {
    await prisma.password.create({
      data: {
        userId: user.id,
        hash: await hash("password123", 12)
      }
    });
  }

  const [fct, portugal2030, horizonteEuropa, privado, interno] = await Promise.all([
    prisma.financiamento.create({
      data: {
        nome: "FCT - Fundação para a Ciência e Tecnologia",
        overhead: new Decimal(25.00),
        taxa_financiamento: new Decimal(85.00),
        valor_eti: new Decimal(4500.00)
      }
    }),
    prisma.financiamento.create({
      data: {
        nome: "Portugal 2030",
        overhead: new Decimal(20.00),
        taxa_financiamento: new Decimal(75.00),
        valor_eti: new Decimal(4200.00)
      }
    }),
    prisma.financiamento.create({
      data: {
        nome: "Horizonte Europa",
        overhead: new Decimal(25.00),
        taxa_financiamento: new Decimal(100.00),
        valor_eti: new Decimal(5000.00)
      }
    }),
    prisma.financiamento.create({
      data: {
        nome: "Financiamento Privado",
        overhead: new Decimal(15.00),
        taxa_financiamento: new Decimal(100.00),
        valor_eti: new Decimal(4800.00)
      }
    }),
    prisma.financiamento.create({
      data: {
        nome: "Interno",
        overhead: new Decimal(10.00),
        taxa_financiamento: new Decimal(100.00),
        valor_eti: new Decimal(4000.00)
      }
    })
  ]);

  // Após criar os tipos de financiamento
  const tiposFinanciamento = await prisma.financiamento.findMany();

  if (tiposFinanciamento.length === 0) {
    throw new Error('Tipos de financiamento não foram criados corretamente');
  }

  // Criar Materiais
  console.log('🖥️ A criar materiais...');
  await prisma.material.createMany({
    data: [
      {
        nome: "Laptop Dell XPS 15",
        preco: new Decimal(1799.99),
        quantidade: 8,
        ano_utilizacao: 2025,
        rubrica: Rubrica.MATERIAIS
      },
      {
        nome: "Monitor Dell UltraSharp 27\"",
        preco: new Decimal(549.90),
        quantidade: 12,
        ano_utilizacao: 2025,
        rubrica: Rubrica.MATERIAIS
      },
      {
        nome: "Servidor HPE ProLiant DL380 Gen10",
        preco: new Decimal(6299.00),
        quantidade: 2,
        ano_utilizacao: 2025,
        rubrica: Rubrica.MATERIAIS
      },
      {
        nome: "Impressora HP LaserJet Pro",
        preco: new Decimal(349.99),
        quantidade: 3,
        ano_utilizacao: 2025,
        rubrica: Rubrica.MATERIAIS
      },
      {
        nome: "Kit Desenvolvimento IoT",
        preco: new Decimal(189.90),
        quantidade: 15,
        ano_utilizacao: 2025,
        rubrica: Rubrica.MATERIAIS
      },
      {
        nome: "Licença Software Estatístico SPSS",
        preco: new Decimal(2499.00),
        quantidade: 5,
        ano_utilizacao: 2025,
        rubrica: Rubrica.SERVICOS_TERCEIROS
      },
      {
        nome: "Mesa de Reunião",
        preco: new Decimal(299.00),
        quantidade: 4,
        ano_utilizacao: 2025,
        rubrica: Rubrica.OUTROS_CUSTOS
      }
    ]
  });

  // Criar Projetos
  console.log('📋 A criar projetos com workpackages e tarefas...');
  
  // Projeto 1 - Em estado ACEITE (em andamento)
  const projeto1 = await prisma.projeto.create({
    data: {
      nome: "INOVC+",
      descricao: "O INOVC+ é um projeto-piloto estratégico para Região Centro que consiste na implementação e consolidação de um Ecossistema de Inovação para a Transferência de Conhecimento e Tecnologia que, num contexto de trabalho em rede, potencia a valorização e a transferência de conhecimento e de resultados de I&D+I para a economia da região centro.",
      inicio: new Date("2023-03-01"),
      fim: new Date("2025-02-28"),
      estado: ProjetoEstado.APROVADO,
      financiamentoId: fct.id,
    }
  });

  // Workpackages para Projeto 1
  const wp1Projeto1 = await prisma.workpackage.create({
    data: {
      projetoId: projeto1.id,
      nome: "WP1 - Recolha e Processamento de Dados",
      inicio: new Date("2023-03-01"),
      fim: new Date("2023-08-31"),
      estado: true // Já concluído
    }
  });

  const wp2Projeto1 = await prisma.workpackage.create({
    data: {
      projetoId: projeto1.id,
      nome: "WP2 - Desenvolvimento de Algoritmos",
      inicio: new Date("2023-07-01"),
      fim: new Date("2024-06-30"),
      estado: false // Em andamento
    }
  });

  const wp3Projeto1 = await prisma.workpackage.create({
    data: {
      projetoId: projeto1.id,
      nome: "WP3 - Validação e Testes",
      inicio: new Date("2024-04-01"),
      fim: new Date("2024-12-31"),
      estado: false // Ainda não iniciado completamente
    }
  });

  const wp4Projeto1 = await prisma.workpackage.create({
    data: {
      projetoId: projeto1.id,
      nome: "WP4 - Divulgação e Integração",
      inicio: new Date("2024-10-01"),
      fim: new Date("2025-02-28"),
      estado: false // Ainda não iniciado
    }
  });

  // Tarefas para WP1 do Projeto 1
  await prisma.tarefa.createMany({
    data: [
      {
        workpackageId: wp1Projeto1.id,
        nome: "T1.1 - Definição de protocolos de recolha",
        inicio: new Date("2023-03-01"),
        fim: new Date("2023-04-15"),
        estado: true
      },
      {
        workpackageId: wp1Projeto1.id,
        nome: "T1.2 - Recolha de dados clínicos",
        inicio: new Date("2023-04-16"),
        fim: new Date("2023-07-31"),
        estado: true
      },
      {
        workpackageId: wp1Projeto1.id,
        nome: "T1.3 - Processamento e anotação de datasets",
        inicio: new Date("2023-06-01"),
        fim: new Date("2023-08-31"),
        estado: true
      }
    ]
  });

  // Tarefas para WP2 do Projeto 1
  await prisma.tarefa.createMany({
    data: [
      {
        workpackageId: wp2Projeto1.id,
        nome: "T2.1 - Estado da arte e definição de requisitos",
        inicio: new Date("2023-07-01"),
        fim: new Date("2023-09-30"),
        estado: true
      },
      {
        workpackageId: wp2Projeto1.id,
        nome: "T2.2 - Implementação de modelos de ML/DL",
        inicio: new Date("2023-10-01"),
        fim: new Date("2024-03-31"),
        estado: false
      },
      {
        workpackageId: wp2Projeto1.id,
        nome: "T2.3 - Otimização e avaliação de performance",
        inicio: new Date("2024-04-01"),
        fim: new Date("2024-06-30"),
        estado: false
      }
    ]
  });

  // Tarefas para WP3 do Projeto 1
  await prisma.tarefa.createMany({
    data: [
      {
        workpackageId: wp3Projeto1.id,
        nome: "T3.1 - Configuração do ambiente de validação",
        inicio: new Date("2024-04-01"),
        fim: new Date("2024-05-31"),
        estado: false
      },
      {
        workpackageId: wp3Projeto1.id,
        nome: "T3.2 - Validação com especialistas",
        inicio: new Date("2024-06-01"),
        fim: new Date("2024-09-30"),
        estado: false
      },
      {
        workpackageId: wp3Projeto1.id,
        nome: "T3.3 - Refinamento e documentação",
        inicio: new Date("2024-10-01"),
        fim: new Date("2024-12-31"),
        estado: false
      }
    ]
  });

  // Tarefas para WP4 do Projeto 1
  await prisma.tarefa.createMany({
    data: [
      {
        workpackageId: wp4Projeto1.id,
        nome: "T4.1 - Preparação de publicações científicas",
        inicio: new Date("2024-10-01"),
        fim: new Date("2025-01-31"),
        estado: false
      },
      {
        workpackageId: wp4Projeto1.id,
        nome: "T4.2 - Workshops e demonstrações",
        inicio: new Date("2025-01-01"),
        fim: new Date("2025-02-28"),
        estado: false
      }
    ]
  });

  // Projeto 2 - Em estado PENDENTE
  const projeto2 = await prisma.projeto.create({
    data: {
      nome: "SMART-CITY - Plataforma Integrada para Cidades Inteligentes",
      descricao: "Desenvolvimento de uma plataforma de código aberto para integração e gestão de serviços urbanos inteligentes, focando em mobilidade, energia e ambiente.",
      inicio: new Date("2024-09-01"),
      fim: new Date("2026-08-31"),
      estado: ProjetoEstado.PENDENTE,
      financiamentoId: portugal2030.id,
    }
  });

  // Workpackages para Projeto 2
  const wp1Projeto2 = await prisma.workpackage.create({
    data: {
      projetoId: projeto2.id,
      nome: "WP1 - Levantamento de Requisitos e Especificação",
      inicio: new Date("2025-04-01"),
      fim: new Date("2025-09-30"),
      estado: false
    }
  });

  const wp2Projeto2 = await prisma.workpackage.create({
    data: {
      projetoId: projeto2.id,
      nome: "WP2 - Arquitetura e Desenvolvimento",
      inicio: new Date("2025-08-01"),
      fim: new Date("2026-07-31"),
      estado: false
    }
  });

  const wp3Projeto2 = await prisma.workpackage.create({
    data: {
      projetoId: projeto2.id,
      nome: "WP3 - Pilotos e Validação",
      inicio: new Date("2026-04-01"),
      fim: new Date("2027-01-31"),
      estado: false
    }
  });

  const wp4Projeto2 = await prisma.workpackage.create({
    data: {
      projetoId: projeto2.id,
      nome: "WP4 - Disseminação e Exploração",
      inicio: new Date("2025-10-01"),
      fim: new Date("2027-03-31"),
      estado: false
    }
  });

  // Tarefas para WP1 do Projeto 2
  await prisma.tarefa.createMany({
    data: [
      {
        workpackageId: wp1Projeto2.id,
        nome: "T1.1 - Análise de estado da arte",
        inicio: new Date("2025-04-01"),
        fim: new Date("2025-05-31"),
        estado: false
      },
      {
        workpackageId: wp1Projeto2.id,
        nome: "T1.2 - Workshops com stakeholders",
        inicio: new Date("2025-06-01"),
        fim: new Date("2025-08-15"),
        estado: false
      },
      {
        workpackageId: wp1Projeto2.id,
        nome: "T1.3 - Definição de especificações técnicas",
        inicio: new Date("2025-08-15"),
        fim: new Date("2025-09-30"),
        estado: false
      }
    ]
  });

  // Projeto 3 - Em estado EM_DESENVOLVIMENTO (agora em desenvolvimento)
  const projeto3 = await prisma.projeto.create({
    data: {
      nome: "ECO-MANUFATURA - Sistemas de Manufatura Sustentável",
      descricao: "Pesquisa e desenvolvimento de metodologias e ferramentas para otimização de processos de manufatura visando redução de consumo energético e impacto ambiental.",
      inicio: new Date("2025-06-15"),
      fim: new Date("2028-05-31"),
      estado: ProjetoEstado.EM_DESENVOLVIMENTO, // Alterado para EM_DESENVOLVIMENTO
      financiamentoId: horizonteEuropa.id,
    }
  });

  // Workpackages básicos para Projeto 3 (agora em desenvolvimento)
  const wp1Projeto3 = await prisma.workpackage.create({
    data: {
      projetoId: projeto3.id,
      nome: "WP1 - Coordenação e Gestão",
      inicio: new Date("2025-06-15"),
      fim: new Date("2028-05-31"),
      estado: false
    }
  });

  const wp2Projeto3 = await prisma.workpackage.create({
    data: {
      projetoId: projeto3.id,
      nome: "WP2 - Análise e Modelação",
      inicio: new Date("2025-06-15"),
      fim: new Date("2026-06-30"),
      estado: false
    }
  });

  const wp3Projeto3 = await prisma.workpackage.create({
    data: {
      projetoId: projeto3.id,
      nome: "WP3 - Desenvolvimento de Sistemas",
      inicio: new Date("2026-01-01"),
      fim: new Date("2027-06-30"),
      estado: false
    }
  });

  const wp4Projeto3 = await prisma.workpackage.create({
    data: {
      projetoId: projeto3.id,
      nome: "WP4 - Validação e Implementação",
      inicio: new Date("2027-01-01"),
      fim: new Date("2028-05-31"),
      estado: false
    }
  });

  // Tarefas para WP4 do Projeto 3
  await prisma.tarefa.createMany({
    data: [
      {
        workpackageId: wp4Projeto3.id,
        nome: "T4.1 - Implementação em ambiente piloto",
        inicio: new Date("2027-01-01"),
        fim: new Date("2027-09-30"),
        estado: false
      },
      {
        workpackageId: wp4Projeto3.id,
        nome: "T4.2 - Validação e avaliação de impacto",
        inicio: new Date("2027-10-01"),
        fim: new Date("2028-03-31"),
        estado: false
      },
      {
        workpackageId: wp4Projeto3.id,
        nome: "T4.3 - Documentação e relatório final",
        inicio: new Date("2028-04-01"),
        fim: new Date("2028-05-31"),
        estado: false
      }
    ]
  });

  // Materiais para Projeto 3
  await prisma.material.create({
    data: {
      nome: "Sensores IoT industriais",
      preco: new Decimal(12500.00),
      quantidade: 15,
      ano_utilizacao: 2026,
      rubrica: Rubrica.MATERIAIS,
      workpackageId: wp3Projeto3.id
    }
  });

  await prisma.material.create({
    data: {
      nome: "Software de modelação de processos industriais",
      preco: new Decimal(8800.00),
      quantidade: 1,
      ano_utilizacao: 2026,
      rubrica: Rubrica.SERVICOS_TERCEIROS,
      workpackageId: wp2Projeto3.id
    }
  });

  await prisma.material.create({
    data: {
      nome: "Equipamento de medição de consumo energético",
      preco: new Decimal(7500.00),
      quantidade: 2,
      ano_utilizacao: 2027,
      rubrica: Rubrica.MATERIAIS,
      workpackageId: wp4Projeto3.id
    }
  });

  // Projeto 4 - Um projeto CONCLUÍDO
  const projeto4 = await prisma.projeto.create({
    data: {
      nome: "EDUSEC - Segurança Cibernética em Ambientes Educacionais",
      descricao: "Desenvolvimento de um framework e conjunto de boas práticas para proteção de dados e implementação de segurança cibernética em instituições de ensino.",
      inicio: new Date("2022-01-15"),
      fim: new Date("2023-07-31"),
      estado: ProjetoEstado.CONCLUIDO,
      financiamentoId: privado.id,
    }
  });

  // Workpackages para Projeto 4
  const wp1Projeto4 = await prisma.workpackage.create({
    data: {
      projetoId: projeto4.id,
      nome: "WP1 - Levantamento de Vulnerabilidades",
      inicio: new Date("2022-01-15"),
      fim: new Date("2022-04-30"),
      estado: true
    }
  });

  const wp2Projeto4 = await prisma.workpackage.create({
    data: {
      projetoId: projeto4.id,
      nome: "WP2 - Desenvolvimento de Framework",
      inicio: new Date("2022-05-01"),
      fim: new Date("2023-01-31"),
      estado: true
    }
  });

  const wp3Projeto4 = await prisma.workpackage.create({
    data: {
      projetoId: projeto4.id,
      nome: "WP3 - Implementação e Formação",
      inicio: new Date("2023-02-01"),
      fim: new Date("2023-07-31"),
      estado: true
    }
  });

  // Tarefas para WP1 do Projeto 4
  await prisma.tarefa.createMany({
    data: [
      {
        workpackageId: wp1Projeto4.id,
        nome: "T1.1 - Auditoria inicial de segurança",
        inicio: new Date("2022-01-15"),
        fim: new Date("2022-02-28"),
        estado: true
      },
      {
        workpackageId: wp1Projeto4.id,
        nome: "T1.2 - Análise de protocolos existentes",
        inicio: new Date("2022-03-01"),
        fim: new Date("2022-04-30"),
        estado: true
      }
    ]
  });

  // Tarefas para WP2 do Projeto 4
  await prisma.tarefa.createMany({
    data: [
      {
        workpackageId: wp2Projeto4.id,
        nome: "T2.1 - Definição de arquitetura de segurança",
        inicio: new Date("2022-05-01"),
        fim: new Date("2022-07-31"),
        estado: true
      },
      {
        workpackageId: wp2Projeto4.id,
        nome: "T2.2 - Desenvolvimento de protocolos",
        inicio: new Date("2022-08-01"),
        fim: new Date("2022-11-30"),
        estado: true
      },
      {
        workpackageId: wp2Projeto4.id,
        nome: "T2.3 - Desenvolvimento de ferramentas de monitorização",
        inicio: new Date("2022-10-01"),
        fim: new Date("2023-01-31"),
        estado: true
      }
    ]
  });

  // Tarefas para WP3 do Projeto 4
  await prisma.tarefa.createMany({
    data: [
      {
        workpackageId: wp3Projeto4.id,
        nome: "T3.1 - Implementação piloto",
        inicio: new Date("2023-02-01"),
        fim: new Date("2023-04-30"),
        estado: true
      },
      {
        workpackageId: wp3Projeto4.id,
        nome: "T3.2 - Formação técnica",
        inicio: new Date("2023-05-01"),
        fim: new Date("2023-06-30"),
        estado: true
      },
      {
        workpackageId: wp3Projeto4.id,
        nome: "T3.3 - Documentação e entrega final",
        inicio: new Date("2023-06-01"),
        fim: new Date("2023-07-31"),
        estado: true
      }
    ]
  });

  // Recuperar todos os workpackages e materiais
  const todosWorkpackages = await prisma.workpackage.findMany();
  const todosMateriais = await prisma.material.findMany();

  console.log('🔧 A associar materiais aos workpackages...');

  // Para cada workpackage, criar entre 1 e 4 materiais específicos
  for (const workpackage of todosWorkpackages) {
    // Selecionar um número aleatório de materiais (entre 1 e 4)
    const numMateriais = Math.floor(Math.random() * 4) + 1;
    
    // Verificar se há materiais disponíveis
    if (todosMateriais.length === 0) {
      console.warn('Não há materiais disponíveis para associar aos workpackages');
      break;
    }
    
    // Criar materiais específicos para este workpackage
    for (let i = 0; i < numMateriais; i++) {
      // Selecionar um material aleatório como modelo (com verificação de segurança)
      const indiceAleatorio = Math.floor(Math.random() * todosMateriais.length);
      const materialModelo = todosMateriais[indiceAleatorio];
      
      // Verificar se o materialModelo foi encontrado
      if (!materialModelo) {
        console.warn(`Não foi possível encontrar um material modelo no índice ${indiceAleatorio}`);
        continue;
      }
      
      await prisma.material.create({
        data: {
          nome: `${materialModelo.nome} (WP ${workpackage.nome.split(' ')[0]})`,
          preco: materialModelo.preco,
          quantidade: Math.floor(Math.random() * 10) + 1,
          ano_utilizacao: materialModelo.ano_utilizacao,
          rubrica: materialModelo.rubrica,
          workpackageId: workpackage.id
        }
      });
    }
  }

  console.log('🏗️ A criar o projeto VIRTUA...');
  
  // Projeto VIRTUA
  const projetoVirtua = await prisma.projeto.create({
    data: {
      nome: "VIRTUA",
      descricao: "Projeto de inovação em tecnologias de virtualização e automação para ambientes industriais",
      inicio: new Date("2025-06-01"),
      fim: new Date("2028-05-31"),
      estado: ProjetoEstado.EM_DESENVOLVIMENTO, // Alterar para EM_DESENVOLVIMENTO
      financiamentoId: fct.id,
    }
  });

  // Workpackages para Projeto VIRTUA
  const wpA1Virtua = await prisma.workpackage.create({
    data: {
      projetoId: projetoVirtua.id,
      nome: "A1 - Estudos Preliminares e Definição de Especificações Técnicas",
      inicio: new Date("2025-06-01"),
      fim: new Date("2026-02-28"),
      estado: false
    }
  });

  // Tarefas para WP A1 do Projeto VIRTUA
  await prisma.tarefa.createMany({
    data: [
      {
        workpackageId: wpA1Virtua.id,
        nome: "T1.1 - Levantamento do estado da arte",
        inicio: new Date("2025-06-01"),
        fim: new Date("2025-08-15"),
        estado: false
      },
      {
        workpackageId: wpA1Virtua.id,
        nome: "T1.2 - Análise de requisitos",
        inicio: new Date("2025-08-01"),
        fim: new Date("2025-10-31"),
        estado: false
      },
      {
        workpackageId: wpA1Virtua.id,
        nome: "T1.3 - Definição de especificações técnicas",
        inicio: new Date("2025-11-01"),
        fim: new Date("2026-02-28"),
        estado: false
      }
    ]
  });

  const wpA2Virtua = await prisma.workpackage.create({
    data: {
      projetoId: projetoVirtua.id,
      nome: "A2 - Sistema de localização com utilização de tags passivas",
      inicio: null,
      fim: null,
      estado: false
    }
  });

  const wpA3Virtua = await prisma.workpackage.create({
    data: {
      projetoId: projetoVirtua.id,
      nome: "A3 - Sistema de robots / veículos autónomos",
      inicio: new Date("2025-10-01"),
      fim: new Date("2027-08-31"),
      estado: false
    }
  });

  // Tarefas para WP A3 do Projeto VIRTUA
  await prisma.tarefa.createMany({
    data: [
      {
        workpackageId: wpA3Virtua.id,
        nome: "T3.1 - Desenvolvimento de sistemas de navegação",
        inicio: new Date("2025-10-01"),
        fim: new Date("2026-06-30"),
        estado: false
      },
      {
        workpackageId: wpA3Virtua.id,
        nome: "T3.2 - Implementação de algoritmos de controlo autónomo",
        inicio: new Date("2026-05-01"),
        fim: new Date("2027-02-28"),
        estado: false
      },
      {
        workpackageId: wpA3Virtua.id,
        nome: "T3.3 - Testes de integração e validação",
        inicio: new Date("2027-03-01"),
        fim: new Date("2027-08-31"),
        estado: false
      }
    ]
  });

  const wpA4Virtua = await prisma.workpackage.create({
    data: {
      projetoId: projetoVirtua.id,
      nome: "A4 - Implementação de rede 5G e comunicações M2M",
      inicio: null,
      fim: null,
      estado: false
    }
  });

  const wpA5Virtua = await prisma.workpackage.create({
    data: {
      projetoId: projetoVirtua.id,
      nome: "A5 - Desenvolvimento e upgrade de plataforma",
      inicio: null,
      fim: null,
      estado: false
    }
  });

  const wpA6Virtua = await prisma.workpackage.create({
    data: {
      projetoId: projetoVirtua.id,
      nome: "A6 - Integração e demonstração",
      inicio: new Date("2027-07-01"),
      fim: new Date("2028-03-31"),
      estado: false
    }
  });

  const wpA7Virtua = await prisma.workpackage.create({
    data: {
      projetoId: projetoVirtua.id,
      nome: "A7 - Comunicação, disseminação e valorização",
      inicio: new Date("2026-03-01"),
      fim: new Date("2028-05-31"),
      estado: false
    }
  });

  const wpA8Virtua = await prisma.workpackage.create({
    data: {
      projetoId: projetoVirtua.id,
      nome: "A8 - Gestão e coordenação do projeto",
      inicio: new Date("2025-06-01"),
      fim: new Date("2028-05-31"),
      estado: false
    }
  });

  // Criação de materiais para o workpackage A1
  await prisma.material.create({
    data: {
      nome: "Laptop para desenvolvimento",
      preco: new Decimal(1800.00),
      quantidade: 3,
      ano_utilizacao: 2025,
      rubrica: Rubrica.MATERIAIS,
      workpackageId: wpA1Virtua.id
    }
  });

  await prisma.material.create({
    data: {
      nome: "Software de simulação",
      preco: new Decimal(5000.00),
      quantidade: 1,
      ano_utilizacao: 2025,
      rubrica: Rubrica.SERVICOS_TERCEIROS,
      workpackageId: wpA1Virtua.id
    }
  });

  // Criação de materiais para o workpackage A3
  await prisma.material.create({
    data: {
      nome: "Sistema de carregamento de Drones - Skycharge",
      preco: new Decimal(6250.00),
      quantidade: 1,
      ano_utilizacao: 2026,
      rubrica: Rubrica.MATERIAIS,
      workpackageId: wpA3Virtua.id
    }
  });

  await prisma.material.create({
    data: {
      nome: "Material para estrutura AGV",
      preco: new Decimal(30000.00),
      quantidade: 1,
      ano_utilizacao: 2026,
      rubrica: Rubrica.CUSTOS_ESTRUTURA,
      workpackageId: wpA3Virtua.id
    }
  });

  await prisma.material.create({
    data: {
      nome: "LiDAR (3D)",
      preco: new Decimal(5000.00),
      quantidade: 1,
      ano_utilizacao: 2026,
      rubrica: Rubrica.MATERIAIS,
      workpackageId: wpA3Virtua.id
    }
  });

  await prisma.material.create({
    data: {
      nome: "Unidade de Controlo",
      preco: new Decimal(2000.00),
      quantidade: 1,
      ano_utilizacao: 2026,
      rubrica: Rubrica.MATERIAIS,
      workpackageId: wpA3Virtua.id
    }
  });

  await prisma.material.create({
    data: {
      nome: "Motores, Encoders?",
      preco: new Decimal(400.00),
      quantidade: 1,
      ano_utilizacao: 2026,
      rubrica: Rubrica.MATERIAIS,
      workpackageId: wpA3Virtua.id
    }
  });

  await prisma.material.create({
    data: {
      nome: "Bateria (ref Flow - LiFePo4 1.5 kWh (@48 Vdc)\t)",
      preco: new Decimal(400.00),
      quantidade: 1,
      ano_utilizacao: 2026,
      rubrica: Rubrica.MATERIAIS,
      workpackageId: wpA3Virtua.id
    }
  });

  await prisma.material.create({
    data: {
      nome: "Componentes (inversor, conversor, BMS)",
      preco: new Decimal(1200.00),
      quantidade: 1,
      ano_utilizacao: 2026,
      rubrica: Rubrica.MATERIAIS,
      workpackageId: wpA3Virtua.id
    }
  });

  // Criação de material para o workpackage A7
  await prisma.material.create({
    data: {
      nome: "Conferência",
      preco: new Decimal(2000.00),
      quantidade: 1,
      ano_utilizacao: 2027,
      rubrica: Rubrica.DESLOCACAO_ESTADIAS,
      workpackageId: wpA7Virtua.id
    }
  });

  // Atualizar as datas dos projetos existentes para estarem antes de março de 2025 ou entre 2025-2030
  if (projeto1) {
    await prisma.projeto.update({
      where: { id: projeto1.id },
      data: {
        inicio: new Date("2023-03-01"),
        fim: new Date("2025-02-28")
      }
    });
  }

  if (projeto2) {
    await prisma.projeto.update({
      where: { id: projeto2.id },
      data: {
        inicio: new Date("2025-04-01"), // Projeto em desenvolvimento que começa após 15 de março de 2025
        fim: new Date("2027-03-31"),
        estado: ProjetoEstado.EM_DESENVOLVIMENTO // Alterar para EM_DESENVOLVIMENTO
      }
    });
  }

  if (projeto3) {
    await prisma.projeto.update({
      where: { id: projeto3.id },
      data: {
        inicio: new Date("2025-06-15"), // Projeto em desenvolvimento que começa após 15 de março de 2025
        fim: new Date("2028-05-31"),
        estado: ProjetoEstado.APROVADO // Mudar para APROVADO para indicar que está em desenvolvimento
      }
    });
  }

  if (projeto4) {
    await prisma.projeto.update({
      where: { id: projeto4.id },
      data: {
        inicio: new Date("2022-01-15"),
        fim: new Date("2023-07-31")
      }
    });
  }

  // Criar alocações para o projeto VIRTUA
  console.log('👥 A criar alocações para o projeto VIRTUA...');
  
  // Recuperar os utilizadores específicos para alocação
  const ricardoCorreia = await prisma.user.findFirst({
    where: { username: "ricardo.correia" }
  });
  
  const anaIsabelCarvalho = await prisma.user.findFirst({
    where: { username: "ana.i.carvalho" }
  });
  
  const anaClaudiaCarvalho = await prisma.user.findFirst({
    where: { username: "ana.c.carvalho" }
  });
  
  const joaoLopes = await prisma.user.findFirst({
    where: { username: "joao.lopes" }
  });
  
  const ruiCoimbra = await prisma.user.findFirst({
    where: { username: "rui.coimbra" }
  });
  
  const filipeCoutinho = await prisma.user.findFirst({
    where: { username: "filipe.coutinho" }
  });
  
  // Verificar se encontrou todos os utilizadores
  if (!ricardoCorreia || !anaIsabelCarvalho || !anaClaudiaCarvalho || 
      !joaoLopes || !ruiCoimbra || !filipeCoutinho) {
    console.warn('⚠️ Não foi possível encontrar todos os utilizadores necessários para o projeto VIRTUA.');
  }
  
  // Função para criar alocações em massa
  const criarAlocacoesMassa = async (alocacoes: Array<{
    workpackageId: string;
    userId: string;
    mes: number;
    ano: number;
    ocupacao: string;
  }>): Promise<void> => {
    console.log(`📊 Criando ${alocacoes.length} alocações de recursos...`);
    let contador = 0;
    
    for (const alocacao of alocacoes) {
      try {
        await prisma.alocacaoRecurso.create({
          data: {
            workpackageId: alocacao.workpackageId,
            userId: alocacao.userId,
            mes: alocacao.mes,
            ano: alocacao.ano,
            ocupacao: new Decimal(alocacao.ocupacao)
          }
        });
        contador++;
      } catch (error: any) {
        console.warn(`Erro ao criar alocação: ${error.message}`);
      }
    }
    
    console.log(`✅ ${contador} alocações criadas com sucesso.`);
  };

  // Alocações para WP A1
  if (wpA1Virtua && ricardoCorreia && anaIsabelCarvalho && anaClaudiaCarvalho && 
      joaoLopes && filipeCoutinho && ruiCoimbra) {
    const alocacoesA1 = [
      // Alocações para Ricardo Correia (user1)
      { userId: ricardoCorreia.id, mes: 6, ano: 2025, ocupacao: "0.25", workpackageId: wpA1Virtua.id },
      { userId: ricardoCorreia.id, mes: 7, ano: 2025, ocupacao: "0.25", workpackageId: wpA1Virtua.id },
      { userId: ricardoCorreia.id, mes: 9, ano: 2025, ocupacao: "0.25", workpackageId: wpA1Virtua.id },
      { userId: ricardoCorreia.id, mes: 10, ano: 2025, ocupacao: "0.2", workpackageId: wpA1Virtua.id },
      { userId: ricardoCorreia.id, mes: 11, ano: 2025, ocupacao: "0.2", workpackageId: wpA1Virtua.id },
      { userId: ricardoCorreia.id, mes: 12, ano: 2025, ocupacao: "0.2", workpackageId: wpA1Virtua.id },
      
      // Alocações para Ana Isabel Carvalho (user2)
      { userId: anaIsabelCarvalho.id, mes: 6, ano: 2025, ocupacao: "0.175", workpackageId: wpA1Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 7, ano: 2025, ocupacao: "0.175", workpackageId: wpA1Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 9, ano: 2025, ocupacao: "0.175", workpackageId: wpA1Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 10, ano: 2025, ocupacao: "0.1", workpackageId: wpA1Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 11, ano: 2025, ocupacao: "0.1", workpackageId: wpA1Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 12, ano: 2025, ocupacao: "0.05", workpackageId: wpA1Virtua.id },
      
      // Alocações para Ana Claudia Carvalho (user3)
      { userId: anaClaudiaCarvalho.id, mes: 6, ano: 2025, ocupacao: "0.125", workpackageId: wpA1Virtua.id },
      { userId: anaClaudiaCarvalho.id, mes: 7, ano: 2025, ocupacao: "0.125", workpackageId: wpA1Virtua.id },
      { userId: anaClaudiaCarvalho.id, mes: 9, ano: 2025, ocupacao: "0.125", workpackageId: wpA1Virtua.id },
      { userId: anaClaudiaCarvalho.id, mes: 10, ano: 2025, ocupacao: "0.125", workpackageId: wpA1Virtua.id },
      { userId: anaClaudiaCarvalho.id, mes: 11, ano: 2025, ocupacao: "0.125", workpackageId: wpA1Virtua.id },
      { userId: anaClaudiaCarvalho.id, mes: 12, ano: 2025, ocupacao: "0.125", workpackageId: wpA1Virtua.id },
      
      // Alocações para João Lopes (user4)
      { userId: joaoLopes.id, mes: 6, ano: 2025, ocupacao: "0.2", workpackageId: wpA1Virtua.id },
      { userId: joaoLopes.id, mes: 7, ano: 2025, ocupacao: "0.2", workpackageId: wpA1Virtua.id },
      { userId: joaoLopes.id, mes: 9, ano: 2025, ocupacao: "0.2", workpackageId: wpA1Virtua.id },
      { userId: joaoLopes.id, mes: 10, ano: 2025, ocupacao: "0.125", workpackageId: wpA1Virtua.id },
      { userId: joaoLopes.id, mes: 11, ano: 2025, ocupacao: "0.125", workpackageId: wpA1Virtua.id },
      { userId: joaoLopes.id, mes: 12, ano: 2025, ocupacao: "0.125", workpackageId: wpA1Virtua.id },
      
      // Alocações para Filipe Coutinho (user5)
      { userId: filipeCoutinho.id, mes: 6, ano: 2025, ocupacao: "0.05", workpackageId: wpA1Virtua.id },
      { userId: filipeCoutinho.id, mes: 7, ano: 2025, ocupacao: "0.05", workpackageId: wpA1Virtua.id },
      { userId: filipeCoutinho.id, mes: 9, ano: 2025, ocupacao: "0.05", workpackageId: wpA1Virtua.id },
      { userId: filipeCoutinho.id, mes: 10, ano: 2025, ocupacao: "0.05", workpackageId: wpA1Virtua.id },
      { userId: filipeCoutinho.id, mes: 11, ano: 2025, ocupacao: "0.05", workpackageId: wpA1Virtua.id },
      { userId: filipeCoutinho.id, mes: 12, ano: 2025, ocupacao: "0.05", workpackageId: wpA1Virtua.id },
      
      // Alocações para Rui Coimbra (user6)
      { userId: ruiCoimbra.id, mes: 6, ano: 2025, ocupacao: "0.1", workpackageId: wpA1Virtua.id },
      { userId: ruiCoimbra.id, mes: 7, ano: 2025, ocupacao: "0.1", workpackageId: wpA1Virtua.id },
      { userId: ruiCoimbra.id, mes: 9, ano: 2025, ocupacao: "0.1", workpackageId: wpA1Virtua.id },
      { userId: ruiCoimbra.id, mes: 10, ano: 2025, ocupacao: "0.1", workpackageId: wpA1Virtua.id },
      { userId: ruiCoimbra.id, mes: 11, ano: 2025, ocupacao: "0.1", workpackageId: wpA1Virtua.id },
      { userId: ruiCoimbra.id, mes: 12, ano: 2025, ocupacao: "0.1", workpackageId: wpA1Virtua.id }
    ];
    
    await criarAlocacoesMassa(alocacoesA1);
  }

  // Alocações para WP A3
  if (wpA3Virtua && ricardoCorreia && anaIsabelCarvalho && anaClaudiaCarvalho && 
      joaoLopes && filipeCoutinho && ruiCoimbra) {
    const alocacoesA3 = [
      // Alocações para Ricardo Correia em 2025
      { userId: ricardoCorreia.id, mes: 10, ano: 2025, ocupacao: "0.25", workpackageId: wpA3Virtua.id },
      { userId: ricardoCorreia.id, mes: 11, ano: 2025, ocupacao: "0.25", workpackageId: wpA3Virtua.id },
      { userId: ricardoCorreia.id, mes: 12, ano: 2025, ocupacao: "0.25", workpackageId: wpA3Virtua.id },
      
      // Alocações para Ricardo Correia em 2026
      { userId: ricardoCorreia.id, mes: 1, ano: 2026, ocupacao: "0.5", workpackageId: wpA3Virtua.id },
      { userId: ricardoCorreia.id, mes: 2, ano: 2026, ocupacao: "0.5", workpackageId: wpA3Virtua.id },
      { userId: ricardoCorreia.id, mes: 3, ano: 2026, ocupacao: "0.5", workpackageId: wpA3Virtua.id },
      
      // Alocações para Ana Isabel Carvalho em 2025
      { userId: anaIsabelCarvalho.id, mes: 10, ano: 2025, ocupacao: "0.25", workpackageId: wpA3Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 11, ano: 2025, ocupacao: "0.25", workpackageId: wpA3Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 12, ano: 2025, ocupacao: "0.25", workpackageId: wpA3Virtua.id },
      
      // Alocações para Ana Isabel Carvalho em 2026
      { userId: anaIsabelCarvalho.id, mes: 1, ano: 2026, ocupacao: "0.5", workpackageId: wpA3Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 2, ano: 2026, ocupacao: "0.5", workpackageId: wpA3Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 3, ano: 2026, ocupacao: "0.5", workpackageId: wpA3Virtua.id },
      
      // Alocações para Ana Claudia Carvalho em 2025
      { userId: anaClaudiaCarvalho.id, mes: 10, ano: 2025, ocupacao: "0.25", workpackageId: wpA3Virtua.id },
      { userId: anaClaudiaCarvalho.id, mes: 11, ano: 2025, ocupacao: "0.25", workpackageId: wpA3Virtua.id },
      { userId: anaClaudiaCarvalho.id, mes: 12, ano: 2025, ocupacao: "0.25", workpackageId: wpA3Virtua.id },
      
      // Alocações para Ana Claudia Carvalho em 2026
      { userId: anaClaudiaCarvalho.id, mes: 1, ano: 2026, ocupacao: "0.5", workpackageId: wpA3Virtua.id },
      { userId: anaClaudiaCarvalho.id, mes: 2, ano: 2026, ocupacao: "0.5", workpackageId: wpA3Virtua.id },
      { userId: anaClaudiaCarvalho.id, mes: 3, ano: 2026, ocupacao: "0.5", workpackageId: wpA3Virtua.id }
    ];
    
    await criarAlocacoesMassa(alocacoesA3);
  }

  // Alocações para WP A6
  if (wpA6Virtua && ricardoCorreia && anaIsabelCarvalho && anaClaudiaCarvalho && joaoLopes) {
    const alocacoesA6 = [
      // Alocações para Ricardo Correia em 2027-2028
      { userId: ricardoCorreia.id, mes: 7, ano: 2027, ocupacao: "0.3", workpackageId: wpA6Virtua.id },
      { userId: ricardoCorreia.id, mes: 9, ano: 2027, ocupacao: "0.5", workpackageId: wpA6Virtua.id },
      { userId: ricardoCorreia.id, mes: 10, ano: 2027, ocupacao: "0.5", workpackageId: wpA6Virtua.id },
      { userId: ricardoCorreia.id, mes: 11, ano: 2027, ocupacao: "0.5", workpackageId: wpA6Virtua.id },
      { userId: ricardoCorreia.id, mes: 12, ano: 2027, ocupacao: "0.5", workpackageId: wpA6Virtua.id },
      { userId: ricardoCorreia.id, mes: 1, ano: 2028, ocupacao: "0.5", workpackageId: wpA6Virtua.id },
      { userId: ricardoCorreia.id, mes: 2, ano: 2028, ocupacao: "0.5", workpackageId: wpA6Virtua.id },
      { userId: ricardoCorreia.id, mes: 3, ano: 2028, ocupacao: "0.5", workpackageId: wpA6Virtua.id },
      
      // Alocações para Ana Isabel Carvalho em 2027-2028
      { userId: anaIsabelCarvalho.id, mes: 7, ano: 2027, ocupacao: "0.5", workpackageId: wpA6Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 9, ano: 2027, ocupacao: "0.5", workpackageId: wpA6Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 10, ano: 2027, ocupacao: "0.5", workpackageId: wpA6Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 11, ano: 2027, ocupacao: "0.5", workpackageId: wpA6Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 12, ano: 2027, ocupacao: "0.5", workpackageId: wpA6Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 1, ano: 2028, ocupacao: "0.5", workpackageId: wpA6Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 2, ano: 2028, ocupacao: "0.5", workpackageId: wpA6Virtua.id },
      { userId: anaIsabelCarvalho.id, mes: 3, ano: 2028, ocupacao: "0.5", workpackageId: wpA6Virtua.id }
    ];
    
    await criarAlocacoesMassa(alocacoesA6);
  }

  // Alocações para WP A7
  if (wpA7Virtua && ricardoCorreia && gestor) {
    const alocacoesA7 = [
      // Algumas alocações para comunicação e divulgação
      { userId: ricardoCorreia.id, mes: 3, ano: 2026, ocupacao: "0.1", workpackageId: wpA7Virtua.id },
      { userId: ricardoCorreia.id, mes: 4, ano: 2026, ocupacao: "0.1", workpackageId: wpA7Virtua.id },
      { userId: ricardoCorreia.id, mes: 5, ano: 2026, ocupacao: "0.1", workpackageId: wpA7Virtua.id },
      
      { userId: gestor.id, mes: 3, ano: 2026, ocupacao: "0.1", workpackageId: wpA7Virtua.id },
      { userId: gestor.id, mes: 4, ano: 2026, ocupacao: "0.1", workpackageId: wpA7Virtua.id },
      { userId: gestor.id, mes: 5, ano: 2026, ocupacao: "0.1", workpackageId: wpA7Virtua.id }
    ];
    
    await criarAlocacoesMassa(alocacoesA7);
  }

  // Alocações para WP A8 (Gestão)
  if (wpA8Virtua && ricardoCorreia && gestor) {
    const alocacoesA8 = [
      // Alocações de gestão contínuas
      { userId: ricardoCorreia.id, mes: 6, ano: 2025, ocupacao: "0.1", workpackageId: wpA8Virtua.id },
      { userId: ricardoCorreia.id, mes: 7, ano: 2025, ocupacao: "0.1", workpackageId: wpA8Virtua.id },
      { userId: ricardoCorreia.id, mes: 9, ano: 2025, ocupacao: "0.1", workpackageId: wpA8Virtua.id },
      
      { userId: gestor.id, mes: 6, ano: 2025, ocupacao: "0.1", workpackageId: wpA8Virtua.id },
      { userId: gestor.id, mes: 7, ano: 2025, ocupacao: "0.1", workpackageId: wpA8Virtua.id },
      { userId: gestor.id, mes: 9, ano: 2025, ocupacao: "0.1", workpackageId: wpA8Virtua.id }
    ];
    
    await criarAlocacoesMassa(alocacoesA8);
  }

  // Recuperar todas as tarefas
  const todasTarefas = await prisma.tarefa.findMany();
  
  // Recuperar todos os utilizadores para associar às tarefas
  const todosUtilizadores = await prisma.user.findMany({
    where: {
      permissao: { not: Permissao.ADMIN } // Não inclui admin nas tarefas
    }
  });

  console.log('👥 A associar utilizadores às tarefas...');
  
  // Conjunto para rastrear combinações já usadas
  const alocacoesExistentes = new Set();

  // Distribuir utilizadores pelas tarefas com ocupação variável
  for (const tarefa of todasTarefas) {
    // Determinar o período da tarefa
    const inicio = tarefa.inicio || new Date();
    const fim = tarefa.fim || new Date();
    
    // Calcular a duração em meses
    const duracaoMeses = Math.max(
      1,
      (fim.getFullYear() - inicio.getFullYear()) * 12 + 
      fim.getMonth() - inicio.getMonth() + 1
    );
    
    // Selecionar entre 1 e 3 utilizadores aleatoriamente para esta tarefa
    const numUtilizadores = Math.floor(Math.random() * 3) + 1;
    const utilizadoresSelecionados = [...todosUtilizadores]
      .sort(() => 0.5 - Math.random())
      .slice(0, numUtilizadores);
    
    // Obter o workpackage da tarefa para associar os utilizadores
    const workpackage = await prisma.workpackage.findUnique({
      where: { id: tarefa.workpackageId }
    });
    
    if (!workpackage) continue;
    
    for (const utilizador of utilizadoresSelecionados) {
      // Criar alocações para cada mês da tarefa
      for (let i = 0; i < duracaoMeses; i++) {
        const data = new Date(inicio);
        data.setMonth(data.getMonth() + i);
        
        const mes = data.getMonth() + 1; // 1-12
        const ano = data.getFullYear();
        
        // Criar uma chave única para verificar duplicações
        const chaveUnica = `${workpackage.id}-${utilizador.id}-${mes}-${ano}`;
        
        // Verificar se esta combinação já existe
        if (!alocacoesExistentes.has(chaveUnica)) {
          // Adicionar ao conjunto para evitar duplicações
          alocacoesExistentes.add(chaveUnica);
          
          // Atribuir uma ocupação entre 0.1 e 1.0
          const ocupacao = new Decimal((Math.random() * 0.9 + 0.1).toFixed(1));
          
          try {
            await prisma.alocacaoRecurso.create({
              data: {
                workpackageId: workpackage.id,
                userId: utilizador.id,
                mes: mes,
                ano: ano,
                ocupacao: ocupacao
              }
            });
          } catch (error: any) {
            console.warn(`Não foi possível criar alocação para ${chaveUnica}: ${error.message}`);
            // Continuar com as próximas alocações mesmo se esta falhar
          }
        }
      }
    }
  }

  // Criar entregáveis para algumas tarefas
  console.log('📦 A criar entregáveis para as tarefas...');
  
  // Criar entregáveis para tarefas concluídas
  const tarefasConcluidas = todasTarefas.filter(tarefa => tarefa.estado);
  
  for (const tarefa of tarefasConcluidas) {
    // Criar 1 a 3 entregáveis para cada tarefa concluída
    const numEntregaveis = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numEntregaveis; i++) {
      const dataEntrega = tarefa.fim ? new Date(tarefa.fim) : new Date();
      dataEntrega.setDate(dataEntrega.getDate() - Math.floor(Math.random() * 30)); // Data aleatória nos últimos 30 dias da tarefa
      
      await prisma.entregavel.create({
        data: {
          tarefaId: tarefa.id,
          nome: `Entregável ${i+1} - ${tarefa.nome}`,
          descricao: `Descrição detalhada do entregável ${i+1} para a tarefa "${tarefa.nome}"`,
          data: dataEntrega,
          anexo: i === 0 ? "https://example.com/docs/entregavel.pdf" : null
        }
      });
    }
  }
  
  // Criar alguns entregáveis para tarefas em andamento
  const tarefasEmAndamento = todasTarefas.filter(tarefa => !tarefa.estado);
  
  for (const tarefa of tarefasEmAndamento) {
    // 50% de chance de ter um entregável parcial
    if (Math.random() > 0.5) {
      const hoje = new Date();
      
      await prisma.entregavel.create({
        data: {
          tarefaId: tarefa.id,
          nome: `Versão preliminar - ${tarefa.nome}`,
          descricao: "Este é um entregável parcial ou preliminar que ainda está a ser desenvolvido.",
          data: hoje,
          anexo: null
        }
      });
    }
  }

  // Projeto 5 - Novo projeto com datas entre 2026-2029
  console.log('📋 A criar projeto adicional (NEXGEN)...');
  
  const projeto5 = await prisma.projeto.create({
    data: {
      nome: "NEXGEN - Próxima Geração de Redes de Comunicação",
      descricao: "Desenvolvimento de novas tecnologias e protocolos para redes de comunicação de próxima geração, focando em eficiência energética, segurança e alta disponibilidade.",
      inicio: new Date("2026-06-01"),
      fim: new Date("2029-05-31"),
      estado: ProjetoEstado.PENDENTE,
      financiamentoId: horizonteEuropa.id,
    }
  });

  // Workpackages para Projeto 5
  const wp1Projeto5 = await prisma.workpackage.create({
    data: {
      projetoId: projeto5.id,
      nome: "WP1 - Coordenação e Gestão",
      inicio: new Date("2026-06-01"),
      fim: new Date("2029-05-31"),
      estado: false
    }
  });

  const wp2Projeto5 = await prisma.workpackage.create({
    data: {
      projetoId: projeto5.id,
      nome: "WP2 - Arquitetura de Rede 7G",
      inicio: new Date("2026-06-01"),
      fim: new Date("2027-11-30"),
      estado: false
    }
  });

  const wp3Projeto5 = await prisma.workpackage.create({
    data: {
      projetoId: projeto5.id,
      nome: "WP3 - Protocolos de Segurança Avançados",
      inicio: new Date("2027-06-01"),
      fim: new Date("2028-11-30"),
      estado: false
    }
  });

  const wp4Projeto5 = await prisma.workpackage.create({
    data: {
      projetoId: projeto5.id,
      nome: "WP4 - Implementação e Validação",
      inicio: new Date("2028-06-01"),
      fim: new Date("2029-04-30"),
      estado: false
    }
  });

  const wp5Projeto5 = await prisma.workpackage.create({
    data: {
      projetoId: projeto5.id,
      nome: "WP5 - Disseminação e Exploração",
      inicio: new Date("2026-10-01"),
      fim: new Date("2029-05-31"),
      estado: false
    }
  });

  // Tarefas para WP2 do Projeto 5
  await prisma.tarefa.createMany({
    data: [
      {
        workpackageId: wp2Projeto5.id,
        nome: "T2.1 - Definição de requisitos da rede 7G",
        inicio: new Date("2026-06-01"),
        fim: new Date("2026-10-31"),
        estado: false
      },
      {
        workpackageId: wp2Projeto5.id,
        nome: "T2.2 - Especificação da arquitetura",
        inicio: new Date("2026-11-01"),
        fim: new Date("2027-05-31"),
        estado: false
      },
      {
        workpackageId: wp2Projeto5.id,
        nome: "T2.3 - Simulação e modelagem",
        inicio: new Date("2027-06-01"),
        fim: new Date("2027-11-30"),
        estado: false
      }
    ]
  });

  // Tarefas para WP3 do Projeto 5
  await prisma.tarefa.createMany({
    data: [
      {
        workpackageId: wp3Projeto5.id,
        nome: "T3.1 - Análise de vulnerabilidades em redes 7G",
        inicio: new Date("2027-06-01"),
        fim: new Date("2027-10-31"),
        estado: false
      },
      {
        workpackageId: wp3Projeto5.id,
        nome: "T3.2 - Desenvolvimento de protocolos de encriptação avançada",
        inicio: new Date("2027-11-01"),
        fim: new Date("2028-05-31"),
        estado: false
      },
      {
        workpackageId: wp3Projeto5.id,
        nome: "T3.3 - Implementação de sistemas de deteção de intrusão",
        inicio: new Date("2028-06-01"),
        fim: new Date("2028-11-30"),
        estado: false
      }
    ]
  });

  // Tarefas para WP4 do Projeto 5
  await prisma.tarefa.createMany({
    data: [
      {
        workpackageId: wp4Projeto5.id,
        nome: "T4.1 - Implementação de protótipo de rede 7G",
        inicio: new Date("2028-06-01"),
        fim: new Date("2028-10-31"),
        estado: false
      },
      {
        workpackageId: wp4Projeto5.id,
        nome: "T4.2 - Testes de validação em ambiente controlado",
        inicio: new Date("2028-11-01"),
        fim: new Date("2029-02-28"),
        estado: false
      },
      {
        workpackageId: wp4Projeto5.id,
        nome: "T4.3 - Avaliação de desempenho e ajustes finais",
        inicio: new Date("2029-03-01"),
        fim: new Date("2029-04-30"),
        estado: false
      }
    ]
  });

  // Materiais para o Projeto 5
  await prisma.material.create({
    data: {
      nome: "Servidores de alto desempenho",
      preco: new Decimal(15000.00),
      quantidade: 4,
      ano_utilizacao: 2026,
      rubrica: Rubrica.MATERIAIS,
      workpackageId: wp2Projeto5.id
    }
  });

  await prisma.material.create({
    data: {
      nome: "Software de simulação de redes",
      preco: new Decimal(8500.00),
      quantidade: 1,
      ano_utilizacao: 2026,
      rubrica: Rubrica.SERVICOS_TERCEIROS,
      workpackageId: wp2Projeto5.id
    }
  });

  await prisma.material.create({
    data: {
      nome: "Dispositivos de teste de rede",
      preco: new Decimal(12000.00),
      quantidade: 2,
      ano_utilizacao: 2027,
      rubrica: Rubrica.MATERIAIS,
      workpackageId: wp3Projeto5.id
    }
  });

  await prisma.material.create({
    data: {
      nome: "Participação em conferências internacionais",
      preco: new Decimal(5000.00),
      quantidade: 3,
      ano_utilizacao: 2028,
      rubrica: Rubrica.DESLOCACAO_ESTADIAS,
      workpackageId: wp5Projeto5.id
    }
  });

  // Adicionar alocações para o projeto NEXGEN
  console.log('👥 A criar alocações para o projeto NEXGEN...');
  
  // Alocações para WP2 do projeto NEXGEN
  if (wp2Projeto5 && ricardoCorreia && anaClaudiaCarvalho && joaoLopes) {
    const alocacoesWP2NEXGEN = [
      // Alocações para Ricardo Correia em 2026
      { userId: ricardoCorreia.id, mes: 6, ano: 2026, ocupacao: "0.3", workpackageId: wp2Projeto5.id },
      { userId: ricardoCorreia.id, mes: 7, ano: 2026, ocupacao: "0.3", workpackageId: wp2Projeto5.id },
      { userId: ricardoCorreia.id, mes: 8, ano: 2026, ocupacao: "0.3", workpackageId: wp2Projeto5.id },
      { userId: ricardoCorreia.id, mes: 9, ano: 2026, ocupacao: "0.3", workpackageId: wp2Projeto5.id },
      
      // Alocações para Ana Claudia Carvalho em 2026
      { userId: anaClaudiaCarvalho.id, mes: 6, ano: 2026, ocupacao: "0.25", workpackageId: wp2Projeto5.id },
      { userId: anaClaudiaCarvalho.id, mes: 7, ano: 2026, ocupacao: "0.25", workpackageId: wp2Projeto5.id },
      { userId: anaClaudiaCarvalho.id, mes: 8, ano: 2026, ocupacao: "0.25", workpackageId: wp2Projeto5.id },
      { userId: anaClaudiaCarvalho.id, mes: 9, ano: 2026, ocupacao: "0.25", workpackageId: wp2Projeto5.id },
      
      // Alocações para João Lopes em 2026
      { userId: joaoLopes.id, mes: 6, ano: 2026, ocupacao: "0.2", workpackageId: wp2Projeto5.id },
      { userId: joaoLopes.id, mes: 7, ano: 2026, ocupacao: "0.2", workpackageId: wp2Projeto5.id },
      { userId: joaoLopes.id, mes: 8, ano: 2026, ocupacao: "0.2", workpackageId: wp2Projeto5.id },
      { userId: joaoLopes.id, mes: 9, ano: 2026, ocupacao: "0.2", workpackageId: wp2Projeto5.id }
    ];
    
    await criarAlocacoesMassa(alocacoesWP2NEXGEN);
  }

  // Alocações para WP1 do projeto NEXGEN (Coordenação e Gestão)
  if (wp1Projeto5 && gestor && anaIsabelCarvalho) {
    const alocacoesWP1NEXGEN = [
      // Alocações para a gestora (Helga Carvalho) em 2026
      { userId: gestor.id, mes: 6, ano: 2026, ocupacao: "0.15", workpackageId: wp1Projeto5.id },
      { userId: gestor.id, mes: 7, ano: 2026, ocupacao: "0.15", workpackageId: wp1Projeto5.id },
      { userId: gestor.id, mes: 8, ano: 2026, ocupacao: "0.15", workpackageId: wp1Projeto5.id },
      { userId: gestor.id, mes: 9, ano: 2026, ocupacao: "0.15", workpackageId: wp1Projeto5.id },
      { userId: gestor.id, mes: 10, ano: 2026, ocupacao: "0.15", workpackageId: wp1Projeto5.id },
      { userId: gestor.id, mes: 11, ano: 2026, ocupacao: "0.15", workpackageId: wp1Projeto5.id },
      { userId: gestor.id, mes: 12, ano: 2026, ocupacao: "0.15", workpackageId: wp1Projeto5.id },
      
      // Alocações para o suporte administrativo (Ana Isabel Carvalho) em 2026
      { userId: anaIsabelCarvalho.id, mes: 6, ano: 2026, ocupacao: "0.1", workpackageId: wp1Projeto5.id },
      { userId: anaIsabelCarvalho.id, mes: 7, ano: 2026, ocupacao: "0.1", workpackageId: wp1Projeto5.id },
      { userId: anaIsabelCarvalho.id, mes: 8, ano: 2026, ocupacao: "0.1", workpackageId: wp1Projeto5.id },
      { userId: anaIsabelCarvalho.id, mes: 9, ano: 2026, ocupacao: "0.1", workpackageId: wp1Projeto5.id },
      { userId: anaIsabelCarvalho.id, mes: 10, ano: 2026, ocupacao: "0.1", workpackageId: wp1Projeto5.id },
      { userId: anaIsabelCarvalho.id, mes: 11, ano: 2026, ocupacao: "0.1", workpackageId: wp1Projeto5.id },
      { userId: anaIsabelCarvalho.id, mes: 12, ano: 2026, ocupacao: "0.1", workpackageId: wp1Projeto5.id }
    ];
    
    await criarAlocacoesMassa(alocacoesWP1NEXGEN);
  }

  // Alocações para WP3 do projeto NEXGEN
  if (wp3Projeto5 && filipeCoutinho && ruiCoimbra) {
    const alocacoesWP3NEXGEN = [
      // Alocações para Filipe Coutinho em 2027
      { userId: filipeCoutinho.id, mes: 6, ano: 2027, ocupacao: "0.4", workpackageId: wp3Projeto5.id },
      { userId: filipeCoutinho.id, mes: 7, ano: 2027, ocupacao: "0.4", workpackageId: wp3Projeto5.id },
      { userId: filipeCoutinho.id, mes: 8, ano: 2027, ocupacao: "0.4", workpackageId: wp3Projeto5.id },
      { userId: filipeCoutinho.id, mes: 9, ano: 2027, ocupacao: "0.4", workpackageId: wp3Projeto5.id },
      { userId: filipeCoutinho.id, mes: 10, ano: 2027, ocupacao: "0.4", workpackageId: wp3Projeto5.id },
      
      // Alocações para Rui Coimbra em 2027
      { userId: ruiCoimbra.id, mes: 6, ano: 2027, ocupacao: "0.35", workpackageId: wp3Projeto5.id },
      { userId: ruiCoimbra.id, mes: 7, ano: 2027, ocupacao: "0.35", workpackageId: wp3Projeto5.id },
      { userId: ruiCoimbra.id, mes: 8, ano: 2027, ocupacao: "0.35", workpackageId: wp3Projeto5.id },
      { userId: ruiCoimbra.id, mes: 9, ano: 2027, ocupacao: "0.35", workpackageId: wp3Projeto5.id },
      { userId: ruiCoimbra.id, mes: 10, ano: 2027, ocupacao: "0.35", workpackageId: wp3Projeto5.id }
    ];
    
    await criarAlocacoesMassa(alocacoesWP3NEXGEN);
  }

  // Alocações para o projeto ECO-MANUFATURA (projeto3)
  console.log('👥 A criar alocações para o projeto ECO-MANUFATURA...');
  
  // Alocações para WP2 do projeto ECO-MANUFATURA
  if (wp2Projeto3 && ricardoCorreia && joaoLopes) {
    const alocacoesWP2ECO = [
      // Alocações para Ricardo Correia em 2025
      { userId: ricardoCorreia.id, mes: 7, ano: 2025, ocupacao: "0.3", workpackageId: wp2Projeto3.id },
      { userId: ricardoCorreia.id, mes: 8, ano: 2025, ocupacao: "0.3", workpackageId: wp2Projeto3.id },
      { userId: ricardoCorreia.id, mes: 9, ano: 2025, ocupacao: "0.3", workpackageId: wp2Projeto3.id },
      { userId: ricardoCorreia.id, mes: 10, ano: 2025, ocupacao: "0.3", workpackageId: wp2Projeto3.id },
      { userId: ricardoCorreia.id, mes: 11, ano: 2025, ocupacao: "0.3", workpackageId: wp2Projeto3.id },
      { userId: ricardoCorreia.id, mes: 12, ano: 2025, ocupacao: "0.3", workpackageId: wp2Projeto3.id },
      
      // Alocações para João Lopes em 2025
      { userId: joaoLopes.id, mes: 7, ano: 2025, ocupacao: "0.25", workpackageId: wp2Projeto3.id },
      { userId: joaoLopes.id, mes: 8, ano: 2025, ocupacao: "0.25", workpackageId: wp2Projeto3.id },
      { userId: joaoLopes.id, mes: 9, ano: 2025, ocupacao: "0.25", workpackageId: wp2Projeto3.id },
      { userId: joaoLopes.id, mes: 10, ano: 2025, ocupacao: "0.25", workpackageId: wp2Projeto3.id },
      { userId: joaoLopes.id, mes: 11, ano: 2025, ocupacao: "0.25", workpackageId: wp2Projeto3.id },
      { userId: joaoLopes.id, mes: 12, ano: 2025, ocupacao: "0.25", workpackageId: wp2Projeto3.id }
    ];
    
    await criarAlocacoesMassa(alocacoesWP2ECO);
  }
  
  // Alocações para WP3 do projeto ECO-MANUFATURA
  if (wp3Projeto3 && anaClaudiaCarvalho && ruiCoimbra) {
    const alocacoesWP3ECO = [
      // Alocações para Ana Claudia Carvalho em 2026
      { userId: anaClaudiaCarvalho.id, mes: 1, ano: 2026, ocupacao: "0.35", workpackageId: wp3Projeto3.id },
      { userId: anaClaudiaCarvalho.id, mes: 2, ano: 2026, ocupacao: "0.35", workpackageId: wp3Projeto3.id },
      { userId: anaClaudiaCarvalho.id, mes: 3, ano: 2026, ocupacao: "0.35", workpackageId: wp3Projeto3.id },
      { userId: anaClaudiaCarvalho.id, mes: 4, ano: 2026, ocupacao: "0.35", workpackageId: wp3Projeto3.id },
      
      // Alocações para Rui Coimbra em 2026
      { userId: ruiCoimbra.id, mes: 3, ano: 2026, ocupacao: "0.4", workpackageId: wp3Projeto3.id },
      { userId: ruiCoimbra.id, mes: 4, ano: 2026, ocupacao: "0.4", workpackageId: wp3Projeto3.id },
      { userId: ruiCoimbra.id, mes: 5, ano: 2026, ocupacao: "0.4", workpackageId: wp3Projeto3.id },
      { userId: ruiCoimbra.id, mes: 6, ano: 2026, ocupacao: "0.4", workpackageId: wp3Projeto3.id }
    ];
    
    await criarAlocacoesMassa(alocacoesWP3ECO);
  }
  
  // Alocações para WP1 (Gestão) do projeto ECO-MANUFATURA
  if (wp1Projeto3 && gestor && anaIsabelCarvalho) {
    const alocacoesWP1ECO = [
      // Alocações para gestor
      { userId: gestor.id, mes: 6, ano: 2025, ocupacao: "0.1", workpackageId: wp1Projeto3.id },
      { userId: gestor.id, mes: 7, ano: 2025, ocupacao: "0.1", workpackageId: wp1Projeto3.id },
      { userId: gestor.id, mes: 8, ano: 2025, ocupacao: "0.1", workpackageId: wp1Projeto3.id },
      { userId: gestor.id, mes: 9, ano: 2025, ocupacao: "0.1", workpackageId: wp1Projeto3.id },
      
      // Alocações para Ana Isabel Carvalho (suporte administrativo)
      { userId: anaIsabelCarvalho.id, mes: 6, ano: 2025, ocupacao: "0.15", workpackageId: wp1Projeto3.id },
      { userId: anaIsabelCarvalho.id, mes: 7, ano: 2025, ocupacao: "0.15", workpackageId: wp1Projeto3.id },
      { userId: anaIsabelCarvalho.id, mes: 8, ano: 2025, ocupacao: "0.15", workpackageId: wp1Projeto3.id },
      { userId: anaIsabelCarvalho.id, mes: 9, ano: 2025, ocupacao: "0.15", workpackageId: wp1Projeto3.id }
    ];
    
    await criarAlocacoesMassa(alocacoesWP1ECO);
  }

  console.log('✅ Seed concluído com sucesso!');
  
  const stats = {
    users: await prisma.user.count(),
    financiamentos: await prisma.financiamento.count(),
    materiais: await prisma.material.count(),
    projetos: await prisma.projeto.count(),
    workpackages: await prisma.workpackage.count(),
    tarefas: await prisma.tarefa.count(),
    alocacoes: await prisma.alocacaoRecurso.count(),
    entregaveis: await prisma.entregavel.count()
  };

  console.log('📊 Estatísticas:');
  console.table(stats);
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    // Correção do erro "Promise returned in function argument where a void return was expected"
    prisma.$disconnect().catch(() => {
      console.error('Erro ao desconectar do Prisma');
    });
  });