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
      inicio: new Date("2024-09-01"),
      fim: new Date("2025-02-28"),
      estado: false
    }
  });

  const wp2Projeto2 = await prisma.workpackage.create({
    data: {
      projetoId: projeto2.id,
      nome: "WP2 - Arquitetura e Desenvolvimento",
      inicio: new Date("2025-01-01"),
      fim: new Date("2026-02-28"),
      estado: false
    }
  });

  const wp3Projeto2 = await prisma.workpackage.create({
    data: {
      projetoId: projeto2.id,
      nome: "WP3 - Pilotos e Validação",
      inicio: new Date("2025-09-01"),
      fim: new Date("2026-06-30"),
      estado: false
    }
  });

  const wp4Projeto2 = await prisma.workpackage.create({
    data: {
      projetoId: projeto2.id,
      nome: "WP4 - Disseminação e Exploração",
      inicio: new Date("2025-03-01"),
      fim: new Date("2026-08-31"),
      estado: false
    }
  });

  // Tarefas para WP1 do Projeto 2
  await prisma.tarefa.createMany({
    data: [
      {
        workpackageId: wp1Projeto2.id,
        nome: "T1.1 - Análise de estado da arte",
        inicio: new Date("2024-09-01"),
        fim: new Date("2024-10-31"),
        estado: false
      },
      {
        workpackageId: wp1Projeto2.id,
        nome: "T1.2 - Workshops com stakeholders",
        inicio: new Date("2024-11-01"),
        fim: new Date("2025-01-15"),
        estado: false
      },
      {
        workpackageId: wp1Projeto2.id,
        nome: "T1.3 - Definição de especificações técnicas",
        inicio: new Date("2025-01-15"),
        fim: new Date("2025-02-28"),
        estado: false
      }
    ]
  });

  // Projeto 3 - Em estado RASCUNHO
  const projeto3 = await prisma.projeto.create({
    data: {
      nome: "ECO-MANUFATURA - Sistemas de Manufatura Sustentável",
      descricao: "Pesquisa e desenvolvimento de metodologias e ferramentas para otimização de processos de manufatura visando redução de consumo energético e impacto ambiental.",
      inicio: new Date("2024-11-01"),
      fim: new Date("2026-10-31"),
      estado: ProjetoEstado.RASCUNHO,
      financiamentoId: horizonteEuropa.id,
    }
  });

  // Workpackages básicos para Projeto 3 (ainda em rascunho)
  const wp1Projeto3 = await prisma.workpackage.create({
    data: {
      projetoId: projeto3.id,
      nome: "WP1 - Coordenação e Gestão",
      inicio: new Date("2024-11-01"),
      fim: new Date("2026-10-31"),
      estado: false
    }
  });

  const wp2Projeto3 = await prisma.workpackage.create({
    data: {
      projetoId: projeto3.id,
      nome: "WP2 - Análise e Modelação",
      inicio: new Date("2024-11-01"),
      fim: new Date("2025-08-31"),
      estado: false
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
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });