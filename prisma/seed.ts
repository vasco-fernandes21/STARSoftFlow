import { PrismaClient, ProjetoEstado, Permissao, Regime, Rubrica } from '@prisma/client';
import { hash } from 'bcryptjs';
import { Decimal } from "decimal.js";

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 A iniciar seed do banco de dados...');

  // --- Limpar dados existentes --- 
  console.log('🧹 A limpar tabelas existentes...');
  
  // Helper function to safely delete data, ignoring "table not found" errors
  const deleteIfExists = async (deleteFunction: () => Promise<any>, tableName: string) => {
    try {
      await deleteFunction();
    } catch (error: any) {
      if (error.code === 'P2021') { // P2021: Table does not exist
        console.warn(`⚠️ Tabela ${tableName} não existe, a ignorar limpeza.`);
      } else {
        console.error(`❌ Erro grave ao limpar ${tableName}: ${error.message}`);
        throw error; // Re-throw other errors
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
  console.log('✅ Limpeza concluída.');

  // --- Criar Utilizadores --- 
  console.log('👤 A criar utilizadores...');
  
  // Função helper para criar utilizador e password
  const createUserWithPassword = async (userData: any, password: string) => {
    const user = await prisma.user.create({ data: userData });
    const hashedPassword = await hash(password, 12);
    await prisma.password.create({
      data: {
        userId: user.id,
        hash: hashedPassword
      }
    });
    return user;
  };

  const _admin = await createUserWithPassword({
    name: "Vasco Fernandes",
    email: "admin@starinstitute.com", 
    emailVerified: new Date(),
    foto: "https://ui-avatars.com/api/?name=Administrator&background=1d4ed8&color=fff",
    atividade: "Administrador",
    contratacao: new Date("2020-01-01"),
    username: "admin",
    permissao: Permissao.ADMIN,
    regime: Regime.INTEGRAL,
    salario: new Decimal(2000.00)
  }, "admin123");

  const _gestor = await createUserWithPassword({
    name: "Helga Carvalho", 
    email: "helga.carvalho@starinstitute.com",
    emailVerified: new Date(),
    foto: "https://ui-avatars.com/api/?name=Helga+Carvalho&background=15803d&color=fff",
    atividade: "Administração",
    contratacao: new Date("2020-03-15"),
    username: "helga.carvalho",
    permissao: Permissao.GESTOR,
    regime: Regime.INTEGRAL,
    salario: new Decimal(2000.00)
  }, "gestor123");

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
    }
  ];

  const users = await Promise.all(
    commonUsersData.map(userData => 
      createUserWithPassword({
        ...userData,
        emailVerified: new Date(),
        permissao: Permissao.COMUM,
        salario: new Decimal(2000.00) // Default salary for common users
      }, "password123")
    )
  );
  console.log(`✅ ${users.length + 2} utilizadores criados.`);

  // --- Criar Tipos de Financiamento --- 
  console.log('💰 A criar tipos de financiamento...');
  const financiamentos = await prisma.financiamento.createMany({
    data: [
      { nome: "FCT - Fundação para a Ciência e Tecnologia", overhead: new Decimal(0.25), taxa_financiamento: new Decimal(0.85), valor_eti: new Decimal(4432.00) },
      { nome: "Portugal 2030", overhead: new Decimal(0.20), taxa_financiamento: new Decimal(0.85), valor_eti: new Decimal(4432.00) },
      { nome: "Horizonte Europa", overhead: new Decimal(0.25), taxa_financiamento: new Decimal(0.85), valor_eti: new Decimal(4432.00) },
      { nome: "Financiamento Privado", overhead: new Decimal(0.15), taxa_financiamento: new Decimal(0.85), valor_eti: new Decimal(4432.00) },
      { nome: "Interno", overhead: new Decimal(0.10), taxa_financiamento: new Decimal(0.85), valor_eti: new Decimal(4432.00) },
      { nome: "Co-promoção", overhead: new Decimal(0.00), taxa_financiamento: new Decimal(0.85), valor_eti: new Decimal(4432.00) },
      { nome: "RCI", overhead: new Decimal(0.00), taxa_financiamento: new Decimal(0.85), valor_eti: new Decimal(4432.00) },
    ]
  });
  const financiamentoMap = await prisma.financiamento.findMany({ select: { id: true, nome: true } });
  const getFinanciamentoId = (nome: string) => financiamentoMap.find(f => f.nome.startsWith(nome))?.id;
  console.log(`✅ ${financiamentos.count} tipos de financiamento criados.`);

  // --- Criar Materiais Genéricos --- 
  // Note: Materials will be associated later more specifically or randomly
  console.log('🖥️ A criar materiais genéricos...');
  await prisma.material.createMany({
    data: [
      { nome: "Laptop Dell XPS 15", preco: new Decimal(1799.99), quantidade: 8, ano_utilizacao: 2025, rubrica: Rubrica.MATERIAIS },
      { nome: "Monitor Dell UltraSharp 27\"", preco: new Decimal(549.90), quantidade: 12, ano_utilizacao: 2025, rubrica: Rubrica.MATERIAIS },
      { nome: "Servidor HPE ProLiant DL380 Gen10", preco: new Decimal(6299.00), quantidade: 2, ano_utilizacao: 2025, rubrica: Rubrica.MATERIAIS },
      { nome: "Impressora HP LaserJet Pro", preco: new Decimal(349.99), quantidade: 3, ano_utilizacao: 2025, rubrica: Rubrica.MATERIAIS },
      { nome: "Kit Desenvolvimento IoT", preco: new Decimal(189.90), quantidade: 15, ano_utilizacao: 2025, rubrica: Rubrica.MATERIAIS },
      { nome: "Licença Software Estatístico SPSS", preco: new Decimal(2499.00), quantidade: 5, ano_utilizacao: 2025, rubrica: Rubrica.SERVICOS_TERCEIROS },
      { nome: "Mesa de Reunião", preco: new Decimal(299.00), quantidade: 4, ano_utilizacao: 2025, rubrica: Rubrica.OUTROS_CUSTOS }
    ]
  });
  console.log('✅ Materiais genéricos criados.');

  // --- Criar Projetos (Um por estado) --- 
  console.log('📋 A criar projetos (um por estado)...');
  
  const fctId = getFinanciamentoId("FCT");
  const portugal2030Id = getFinanciamentoId("Portugal 2030");
  const horizonteEuropaId = getFinanciamentoId("Horizonte Europa");
  const privadoId = getFinanciamentoId("Financiamento Privado");

  if (!fctId || !portugal2030Id || !horizonteEuropaId || !privadoId) {
    throw new Error('❌ Erro: Não foi possível encontrar IDs de financiamento necessários.');
  }

  // Projeto 1: APROVADO
  const projetoAprovado = await prisma.projeto.create({
    data: {
      nome: "INOVC+",
      descricao: "Implementação de um Ecossistema de Inovação para a Transferência de Conhecimento.",
      inicio: new Date("2023-03-01"),
      fim: new Date("2025-02-28"),
      estado: ProjetoEstado.APROVADO,
      financiamentoId: fctId,
      valor_eti: new Decimal(4432.00),
      taxa_financiamento: new Decimal(0.85),
      workpackages: {
        create: [
          { 
            nome: "WP1 - Recolha e Processamento de Dados", 
            inicio: new Date("2023-03-01"), 
            fim: new Date("2023-08-31"), 
            estado: true, // Concluído
            tarefas: {
              create: [
                { nome: "T1.1 - Definição de protocolos", inicio: new Date("2023-03-01"), fim: new Date("2023-04-15"), estado: true },
                { nome: "T1.2 - Recolha de dados clínicos", inicio: new Date("2023-04-16"), fim: new Date("2023-07-31"), estado: true },
                { nome: "T1.3 - Processamento datasets", inicio: new Date("2023-06-01"), fim: new Date("2023-08-31"), estado: true }
              ]
            }
          },
          { 
            nome: "WP2 - Desenvolvimento de Algoritmos", 
            inicio: new Date("2023-07-01"), 
            fim: new Date("2024-06-30"), 
            estado: false, // Em andamento
            tarefas: {
              create: [
                { nome: "T2.1 - Estado da arte", inicio: new Date("2023-07-01"), fim: new Date("2023-09-30"), estado: true },
                { nome: "T2.2 - Implementação ML/DL", inicio: new Date("2023-10-01"), fim: new Date("2024-03-31"), estado: false },
                { nome: "T2.3 - Otimização e avaliação", inicio: new Date("2024-04-01"), fim: new Date("2024-06-30"), estado: false }
              ]
            }
          },
          { 
            nome: "WP3 - Validação e Testes", 
            inicio: new Date("2024-04-01"), 
            fim: new Date("2024-12-31"), 
            estado: false,
            tarefas: {
              create: [
                { nome: "T3.1 - Configuração ambiente", inicio: new Date("2024-04-01"), fim: new Date("2024-05-31"), estado: false },
                { nome: "T3.2 - Validação com especialistas", inicio: new Date("2024-06-01"), fim: new Date("2024-09-30"), estado: false },
                { nome: "T3.3 - Refinamento e documentação", inicio: new Date("2024-10-01"), fim: new Date("2024-12-31"), estado: false }
              ]
            }
          },
          { 
            nome: "WP4 - Divulgação e Integração", 
            inicio: new Date("2024-10-01"), 
            fim: new Date("2025-02-28"), 
            estado: false,
            tarefas: {
              create: [
                { nome: "T4.1 - Publicações científicas", inicio: new Date("2024-10-01"), fim: new Date("2025-01-31"), estado: false },
                { nome: "T4.2 - Workshops e demonstrações", inicio: new Date("2025-01-01"), fim: new Date("2025-02-28"), estado: false }
              ]
            }
          }
        ]
      }
    }
  });
  console.log(`✅ Projeto APROVADO criado: ${projetoAprovado.nome}`);

  // Projeto 2: EM_DESENVOLVIMENTO
  const projetoEmDesenvolvimento = await prisma.projeto.create({
    data: {
      nome: "SMART-CITY - Plataforma para Cidades Inteligentes",
      descricao: "Desenvolvimento de plataforma open-source para gestão de serviços urbanos.",
      inicio: new Date("2025-04-01"),
      fim: new Date("2027-03-31"),
      estado: ProjetoEstado.EM_DESENVOLVIMENTO,
      financiamentoId: portugal2030Id,
      valor_eti: new Decimal(4432.00),
      taxa_financiamento: new Decimal(0.85),
      workpackages: {
        create: [
          { 
            nome: "WP1 - Requisitos e Especificação", 
            inicio: new Date("2025-04-01"), 
            fim: new Date("2025-09-30"), 
            estado: false,
            tarefas: {
              create: [
                { nome: "T1.1 - Análise estado da arte", inicio: new Date("2025-04-01"), fim: new Date("2025-05-31"), estado: false },
                { nome: "T1.2 - Workshops stakeholders", inicio: new Date("2025-06-01"), fim: new Date("2025-08-15"), estado: false },
                { nome: "T1.3 - Especificações técnicas", inicio: new Date("2025-08-15"), fim: new Date("2025-09-30"), estado: false }
              ]
            }
          },
          { 
            nome: "WP2 - Arquitetura e Desenvolvimento", 
            inicio: new Date("2025-08-01"), 
            fim: new Date("2026-07-31"), 
            estado: false 
          },
          { 
            nome: "WP3 - Pilotos e Validação", 
            inicio: new Date("2026-04-01"), 
            fim: new Date("2027-01-31"), 
            estado: false 
          },
          { 
            nome: "WP4 - Disseminação e Exploração", 
            inicio: new Date("2025-10-01"), 
            fim: new Date("2027-03-31"), 
            estado: false 
          }
        ]
      }
    }
  });
  console.log(`✅ Projeto EM_DESENVOLVIMENTO criado: ${projetoEmDesenvolvimento.nome}`);

  // Projeto 3: CONCLUÍDO
  const projetoConcluido = await prisma.projeto.create({
    data: {
      nome: "EDUSEC - Segurança Cibernética Educacional",
      descricao: "Framework e boas práticas para segurança cibernética em instituições de ensino.",
      inicio: new Date("2022-01-15"),
      fim: new Date("2023-07-31"),
      estado: ProjetoEstado.CONCLUIDO,
      financiamentoId: privadoId,
      valor_eti: new Decimal(4432.00),
      taxa_financiamento: new Decimal(0.85),
      workpackages: {
        create: [
          { 
            nome: "WP1 - Levantamento de Vulnerabilidades", 
            inicio: new Date("2022-01-15"), 
            fim: new Date("2022-04-30"), 
            estado: true,
            tarefas: {
              create: [
                { nome: "T1.1 - Auditoria inicial", inicio: new Date("2022-01-15"), fim: new Date("2022-02-28"), estado: true },
                { nome: "T1.2 - Análise de protocolos", inicio: new Date("2022-03-01"), fim: new Date("2022-04-30"), estado: true }
              ]
            }
          },
          { 
            nome: "WP2 - Desenvolvimento de Framework", 
            inicio: new Date("2022-05-01"), 
            fim: new Date("2023-01-31"), 
            estado: true,
            tarefas: {
              create: [
                { nome: "T2.1 - Definição arquitetura", inicio: new Date("2022-05-01"), fim: new Date("2022-07-31"), estado: true },
                { nome: "T2.2 - Desenvolvimento protocolos", inicio: new Date("2022-08-01"), fim: new Date("2022-11-30"), estado: true },
                { nome: "T2.3 - Ferramentas monitorização", inicio: new Date("2022-10-01"), fim: new Date("2023-01-31"), estado: true }
              ]
            }
          },
          { 
            nome: "WP3 - Implementação e Formação", 
            inicio: new Date("2023-02-01"), 
            fim: new Date("2023-07-31"), 
            estado: true,
            tarefas: {
              create: [
                { nome: "T3.1 - Implementação piloto", inicio: new Date("2023-02-01"), fim: new Date("2023-04-30"), estado: true },
                { nome: "T3.2 - Formação técnica", inicio: new Date("2023-05-01"), fim: new Date("2023-06-30"), estado: true },
                { nome: "T3.3 - Documentação final", inicio: new Date("2023-06-01"), fim: new Date("2023-07-31"), estado: true }
              ]
            }
          }
        ]
      }
    }
  });
  console.log(`✅ Projeto CONCLUIDO criado: ${projetoConcluido.nome}`);

  // Projeto 4: PENDENTE
  const projetoPendente = await prisma.projeto.create({
    data: {
      nome: "NEXGEN - Redes de Comunicação Futuras",
      descricao: "Tecnologias e protocolos para redes de próxima geração.",
      inicio: new Date("2026-06-01"),
      fim: new Date("2029-05-31"),
      estado: ProjetoEstado.PENDENTE,
      financiamentoId: horizonteEuropaId,
      valor_eti: new Decimal(4432.00),
      taxa_financiamento: new Decimal(0.85),
      workpackages: {
        create: [
          { 
            nome: "WP1 - Coordenação e Gestão", 
            inicio: new Date("2026-06-01"), 
            fim: new Date("2029-05-31"), 
            estado: false 
          },
          { 
            nome: "WP2 - Arquitetura de Rede 7G", 
            inicio: new Date("2026-06-01"), 
            fim: new Date("2027-11-30"), 
            estado: false,
            tarefas: {
              create: [
                { nome: "T2.1 - Requisitos rede 7G", inicio: new Date("2026-06-01"), fim: new Date("2026-10-31"), estado: false },
                { nome: "T2.2 - Especificação arquitetura", inicio: new Date("2026-11-01"), fim: new Date("2027-05-31"), estado: false },
                { nome: "T2.3 - Simulação e modelagem", inicio: new Date("2027-06-01"), fim: new Date("2027-11-30"), estado: false }
              ]
            }
          },
          { 
            nome: "WP3 - Protocolos de Segurança Avançados", 
            inicio: new Date("2027-06-01"), 
            fim: new Date("2028-11-30"), 
            estado: false,
            tarefas: {
              create: [
                { nome: "T3.1 - Análise vulnerabilidades", inicio: new Date("2027-06-01"), fim: new Date("2027-10-31"), estado: false },
                { nome: "T3.2 - Protocolos encriptação", inicio: new Date("2027-11-01"), fim: new Date("2028-05-31"), estado: false },
                { nome: "T3.3 - Sistemas deteção intrusão", inicio: new Date("2028-06-01"), fim: new Date("2028-11-30"), estado: false }
              ]
            }
          },
          { 
            nome: "WP4 - Implementação e Validação", 
            inicio: new Date("2028-06-01"), 
            fim: new Date("2029-04-30"), 
            estado: false,
            tarefas: {
              create: [
                { nome: "T4.1 - Implementação protótipo", inicio: new Date("2028-06-01"), fim: new Date("2028-10-31"), estado: false },
                { nome: "T4.2 - Testes validação", inicio: new Date("2028-11-01"), fim: new Date("2029-02-28"), estado: false },
                { nome: "T4.3 - Avaliação desempenho", inicio: new Date("2029-03-01"), fim: new Date("2029-04-30"), estado: false }
              ]
            }
          },
          { 
            nome: "WP5 - Disseminação e Exploração", 
            inicio: new Date("2026-10-01"), 
            fim: new Date("2029-05-31"), 
            estado: false 
          }
        ]
      }
    }
  });
  console.log(`✅ Projeto PENDENTE criado: ${projetoPendente.nome}`);

  // --- Associações Genéricas (Materiais, Alocações, Entregáveis) --- 
  console.log('🔗 A criar associações genéricas (materiais, alocações, entregáveis)...');

  const todosWorkpackages = await prisma.workpackage.findMany();
  const todosMateriaisBase = await prisma.material.findMany({ where: { workpackageId: null } }); // Get only generic materials
  const todosUtilizadores = await prisma.user.findMany({ where: { permissao: { not: Permissao.ADMIN } } });
  const todasTarefas = await prisma.tarefa.findMany();

  // Associar materiais genéricos aleatoriamente aos workpackages
  if (todosMateriaisBase.length > 0) {
    console.log('  - Associando materiais genéricos a workpackages...');
    for (const workpackage of todosWorkpackages) {
      const numMateriais = Math.floor(Math.random() * 3); // 0 to 2 materials per WP
      for (let i = 0; i < numMateriais; i++) {
        const materialModelo = todosMateriaisBase[Math.floor(Math.random() * todosMateriaisBase.length)];
        // Add check for materialModelo before accessing its properties
        if (materialModelo) {
          await prisma.material.create({
            data: {
              nome: `${materialModelo.nome} (WP: ${workpackage.nome.substring(0, 15)})`, // Truncate name if needed
              preco: materialModelo.preco,
              quantidade: Math.floor(Math.random() * 5) + 1, // 1 to 5 units
              ano_utilizacao: materialModelo.ano_utilizacao,
              rubrica: materialModelo.rubrica,
              workpackageId: workpackage.id
            }
          });
        }
      }
    }
  }

  // Associar utilizadores aleatoriamente às tarefas com alocações mensais
  console.log('  - Associando utilizadores a tarefas (com alocações)...');
  const alocacoesExistentes = new Set<string>(); // Track WP-User-Month-Year combinations
  if (todosUtilizadores.length > 0) {
    for (const tarefa of todasTarefas) {
      const inicio = tarefa.inicio || new Date();
      const fim = tarefa.fim || new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0); // Default to end of start month
      const duracaoMeses = Math.max(1, (fim.getFullYear() - inicio.getFullYear()) * 12 + fim.getMonth() - inicio.getMonth() + 1);
      const numUtilizadores = Math.floor(Math.random() * 2) + 1; // 1 or 2 users per task
      const utilizadoresSelecionados = [...todosUtilizadores].sort(() => 0.5 - Math.random()).slice(0, numUtilizadores);
      
      const workpackage = todosWorkpackages.find(wp => wp.id === tarefa.workpackageId);
      if (!workpackage) continue;

      for (const utilizador of utilizadoresSelecionados) {
        for (let i = 0; i < duracaoMeses; i++) {
          const data = new Date(inicio);
          data.setMonth(data.getMonth() + i);
          const mes = data.getMonth() + 1;
          const ano = data.getFullYear();
          const chaveUnica = `${workpackage.id}-${utilizador.id}-${mes}-${ano}`;

          if (!alocacoesExistentes.has(chaveUnica)) {
            alocacoesExistentes.add(chaveUnica);
            const ocupacao = new Decimal((Math.random() * 0.4 + 0.1).toFixed(2)); // 10% to 50%
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
              // Ignore unique constraint violations if the combination was somehow created elsewhere
              if (error.code !== 'P2002') {
                 console.warn(`Não foi possível criar alocação para ${chaveUnica}: ${error.message}`);
              }
            }
          }
        }
      }
    }
  }
  console.log(`  - ${await prisma.alocacaoRecurso.count()} alocações de recursos criadas/atualizadas.`);

  // Criar entregáveis aleatórios para tarefas
  console.log('  - Criando entregáveis...');
  for (const tarefa of todasTarefas) {
    // Create 0 to 2 deliverables per task
    const numEntregaveis = Math.floor(Math.random() * 3);
    for (let i = 0; i < numEntregaveis; i++) {
      let dataEntrega: Date;
      if (tarefa.estado && tarefa.fim) { // Completed task
        dataEntrega = new Date(tarefa.fim);
        dataEntrega.setDate(dataEntrega.getDate() - Math.floor(Math.random() * 15)); // Within last 15 days of task
      } else if (tarefa.inicio) { // Ongoing or pending task
         dataEntrega = new Date(tarefa.inicio);
         dataEntrega.setDate(dataEntrega.getDate() + Math.floor(Math.random() * 30)); // Within first 30 days
         if (dataEntrega > new Date()) dataEntrega = new Date(); // Cap at today if future
      } else {
        dataEntrega = new Date(); // Default to today
      }

      await prisma.entregavel.create({
        data: {
          tarefaId: tarefa.id,
          nome: `Entregável ${i + 1} - ${tarefa.nome.substring(0, 30)}...`,
          descricao: `Entregável ${i + 1} ${tarefa.estado ? 'final' : 'parcial'} para a tarefa ${tarefa.nome}`,
          data: dataEntrega,
          anexo: (i === 0 && Math.random() > 0.5) ? "https://example.com/docs/report.pdf" : null
        }
      });
    }
  }
  console.log(`  - ${await prisma.entregavel.count()} entregáveis criados.`);

  console.log('✅ Seed concluído com sucesso!');
  
  // --- Estatísticas Finais --- 
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

  console.log('📊 Estatísticas Finais:');
  console.table(stats);
}

main()
  .catch(error => {
    console.error('❌ Erro durante o processo de seed:', error);
    process.exit(1);
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  .finally(async () => { 
    await prisma.$disconnect();
    console.log('🔌 Conexão Prisma desconectada.');
  });