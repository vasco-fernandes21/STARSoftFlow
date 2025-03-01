import { PrismaClient, ProjetoEstado, Permissao, Regime } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 A iniciar seed do banco de dados...');

  // Limpar dados existentes
  console.log('🧹 A limpar tabelas existentes...');
  await prisma.tarefaUser.deleteMany();
  await prisma.tarefa.deleteMany();
  await prisma.material.deleteMany();
  await prisma.workpackage.deleteMany();
  await prisma.projeto.deleteMany();
  await prisma.tipoFinanciamento.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.password.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.user.deleteMany();

  // Criar Utilizadores
  console.log('👤 A criar utilizadores...');
  
  const admin = await prisma.user.create({
    data: {
      name: "Administrador",
      email: "admin@starinstitute.com", 
      emailVerified: new Date(),
      foto: "https://ui-avatars.com/api/?name=Administrator&background=1d4ed8&color=fff",
      atividade: "Administração",
      contratacao: new Date("2020-01-01"),
      username: "admin",
      permissao: Permissao.ADMIN,
      regime: Regime.INTEGRAL
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
  
  console.log('👑 Administrador criado com senha pré-definida');
  console.log('📧 Email: admin@starinstitute.com');
  console.log('🔑 Senha: ' + adminPassword);

  const gestor = await prisma.user.create({
    data: {
      name: "Carlos Oliveira", 
      email: "carlos.oliveira@starinstitute.com",
      emailVerified: new Date(),
      foto: "https://ui-avatars.com/api/?name=Carlos+Oliveira&background=15803d&color=fff",
      atividade: "Gestão de Projetos",
      contratacao: new Date("2020-03-15"),
      username: "carlos.oliveira",
      permissao: Permissao.GESTOR,
      regime: Regime.INTEGRAL
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
        name: "Ana Silva",
        email: "ana.silva@starinstitute.com",
        emailVerified: new Date(),
        foto: "https://ui-avatars.com/api/?name=Ana+Silva&background=0284c7&color=fff",
        atividade: "Engenheira de Software",
        contratacao: new Date("2021-01-10"),
        username: "ana.silva",
        permissao: Permissao.COMUM,
        regime: Regime.INTEGRAL
      }
    }),
    prisma.user.create({
      data: {
        name: "Pedro Santos",
        email: "pedro.santos@starinstitute.com",
        emailVerified: new Date(),
        foto: "https://ui-avatars.com/api/?name=Pedro+Santos&background=0f766e&color=fff",
        atividade: "Desenvolvedor Full-Stack",
        contratacao: new Date("2021-03-22"),
        username: "pedro.santos",
        permissao: Permissao.COMUM,
        regime: Regime.PARCIAL
      }
    }),
    prisma.user.create({
      data: {
        name: "Sofia Martins",
        email: "sofia.martins@starinstitute.com",
        emailVerified: new Date(),
        foto: "https://ui-avatars.com/api/?name=Sofia+Martins&background=7e22ce&color=fff",
        atividade: "UX/UI Designer",
        contratacao: new Date("2022-01-05"),
        username: "sofia.martins",
        permissao: Permissao.COMUM,
        regime: Regime.INTEGRAL
      }
    }),
    prisma.user.create({
      data: {
        name: "João Pereira",
        email: "joao.pereira@starinstitute.com",
        emailVerified: new Date(),
        foto: "https://ui-avatars.com/api/?name=João+Pereira&background=b91c1c&color=fff",
        atividade: "DevOps Engineer",
        contratacao: new Date("2022-06-12"),
        username: "joao.pereira",
        permissao: Permissao.COMUM,
        regime: Regime.PARCIAL
      }
    }),
    prisma.user.create({
      data: {
        name: "Teresa Almeida",
        email: "teresa.almeida@starinstitute.com",
        emailVerified: new Date(),
        foto: "https://ui-avatars.com/api/?name=Teresa+Almeida&background=c2410c&color=fff",
        atividade: "Investigadora",
        contratacao: new Date("2023-02-01"),
        username: "teresa.almeida",
        permissao: Permissao.COMUM,
        regime: Regime.INTEGRAL
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

  // Criar Tipos de Financiamento
  console.log('💰 A criar tipos de financiamento...');
  const [fct, portugal2030, horizonteEuropa, privado, interno] = await Promise.all([
    prisma.tipoFinanciamento.create({
      data: {
        nome: "FCT - Fundação para a Ciência e Tecnologia",
        campos: {
          referencia: "string",
          programaFinanciamento: "string",
          percentagemFinanciamento: "number",
          coordenador: "string",
          valorTotal: "number",
          dataAprovacao: "date"
        }
      }
    }),
    prisma.tipoFinanciamento.create({
      data: {
        nome: "Portugal 2030",
        campos: {
          referenciaCandidatura: "string",
          eixoPrioritario: "string",
          taxaFinanciamento: "number",
          organismo: "string",
          valorAprovado: "number",
          dataDecisao: "date"
        }
      }
    }),
    prisma.tipoFinanciamento.create({
      data: {
        nome: "Horizonte Europa",
        campos: {
          grantAgreementId: "string",
          tipoProjeto: "string",
          consorcio: "array",
          coordenador: "string",
          valorFinanciamento: "number",
          periodoExecucao: "string"
        }
      }
    }),
    prisma.tipoFinanciamento.create({
      data: {
        nome: "Financiamento Privado",
        campos: {
          empresa: "string",
          representante: "string",
          valorContrato: "number",
          modalidadePagamento: "string",
          dataContrato: "date"
        }
      }
    }),
    prisma.tipoFinanciamento.create({
      data: {
        nome: "Interno",
        campos: {
          departamento: "string",
          responsavel: "string",
          orcamento: "number",
          objetivos: "array"
        }
      }
    })
  ]);

  // Após criar os tipos de financiamento
  const tiposFinanciamento = await prisma.tipoFinanciamento.findMany();
  console.log('Tipos de financiamento criados:', tiposFinanciamento);

  if (tiposFinanciamento.length === 0) {
    throw new Error('Tipos de financiamento não foram criados corretamente');
  }

  // Criar Materiais
  console.log('🖥️ A criar materiais...');
  await prisma.material.createMany({
    data: [
      {
        nome: "Laptop Dell XPS 15",
        preco: 1799.99,
        quantidade: 8
      },
      {
        nome: "Monitor Dell UltraSharp 27\"",
        preco: 549.90,
        quantidade: 12
      },
      {
        nome: "Servidor HPE ProLiant DL380 Gen10",
        preco: 6299.00,
        quantidade: 2
      },
      {
        nome: "Impressora HP LaserJet Pro",
        preco: 349.99,
        quantidade: 3
      },
      {
        nome: "Kit Desenvolvimento IoT",
        preco: 189.90,
        quantidade: 15
      },
      {
        nome: "Licença Software Estatístico SPSS",
        preco: 2499.00,
        quantidade: 5
      },
      {
        nome: "Mesa de Reunião",
        preco: 299.00,
        quantidade: 4
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
      estado: ProjetoEstado.ACEITE,
      tipoFinanciamentoId: fct.id,
      detalhesFinanciamento: {
        referencia: "PTDC/CCI-BIO/29168/2023",
        programaFinanciamento: "Projetos de I&D em Todos os Domínios Científicos",
        percentagemFinanciamento: 85,
        coordenador: "STAR Institute",
        valorTotal: 235000,
        dataAprovacao: "2023-01-15"
      }
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
  const tarefasWP1Proj1 = await prisma.tarefa.createMany({
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
  const tarefasWP2Proj1 = await prisma.tarefa.createMany({
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
  const tarefasWP3Proj1 = await prisma.tarefa.createMany({
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
  const tarefasWP4Proj1 = await prisma.tarefa.createMany({
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
      tipoFinanciamentoId: portugal2030.id,
      detalhesFinanciamento: {
        referenciaCandidatura: "NORTE-01-0247-FEDER-045622",
        eixoPrioritario: "Competitividade e Internacionalização",
        taxaFinanciamento: 75,
        organismo: "ANI - Agência Nacional de Inovação",
        valorAprovado: 320000,
        dataDecisao: null // Ainda pendente
      }
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
  const tarefasWP1Proj2 = await prisma.tarefa.createMany({
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
      tipoFinanciamentoId: horizonteEuropa.id,
      detalhesFinanciamento: {
        grantAgreementId: "101058432",
        tipoProjeto: "Research and Innovation Action",
        consorcio: ["STAR Institute", "Universidade do Porto", "Fraunhofer Institute", "Técnico Lisboa", "INESC TEC"],
        coordenador: "STAR Institute",
        valorFinanciamento: 1850000,
        periodoExecucao: "24 meses"
      }
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
      tipoFinanciamentoId: privado.id,
      detalhesFinanciamento: {
        empresa: "Grupo Educacional Futuro",
        representante: "Miguel Costa",
        valorContrato: 95000,
        modalidadePagamento: "Trimestral",
        dataContrato: "2021-11-30"
      }
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

  // Para cada workpackage, associar entre 1 e 4 materiais aleatórios
  for (const workpackage of todosWorkpackages) {
    // Selecionar um número aleatório de materiais (entre 1 e 4)
    const numMateriais = Math.floor(Math.random() * 4) + 1;
    
    // Embaralhar materiais e selecionar alguns aleatoriamente
    const materiaisAleatorios = [...todosMateriais]
      .sort(() => 0.5 - Math.random())
      .slice(0, numMateriais);

    // Atualizar cada material para associá-lo ao workpackage
    for (const material of materiaisAleatorios) {
      await prisma.material.update({
        where: { id: material.id },
        data: { workpackageId: workpackage.id }
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
    
    for (const utilizador of utilizadoresSelecionados) {
      // Criar alocações para cada mês da tarefa
      for (let i = 0; i < duracaoMeses; i++) {
        const data = new Date(inicio);
        data.setMonth(data.getMonth() + i);
        
        // Atribuir uma ocupação entre 0.1 e 1.0
        const ocupacao = parseFloat((Math.random() * 0.9 + 0.1).toFixed(1));
        
        await prisma.tarefaUser.create({
          data: {
            tarefaId: tarefa.id,
            userId: utilizador.id,
            mes: data.getMonth() + 1, // 1-12
            ano: data.getFullYear(),
            ocupacao: ocupacao
          }
        });
      }
    }
  }

  console.log('✅ Seed concluído com sucesso!');
  
  const stats = {
    users: await prisma.user.count(),
    tiposFinanciamento: await prisma.tipoFinanciamento.count(),
    materiais: await prisma.material.count(),
    projetos: await prisma.projeto.count(),
    workpackages: await prisma.workpackage.count(),
    tarefas: await prisma.tarefa.count(),
    alocacoes: await prisma.tarefaUser.count()
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