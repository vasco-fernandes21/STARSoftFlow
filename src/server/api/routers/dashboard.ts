import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import type { Workpackage, Tarefa, Projeto, Permissao, PrismaClient, Prisma } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";

// tipos auxiliares
type Context = {
  db: PrismaClient;
};

export type ProjetoFinanceiro = {
  id: string;
  nome: string;
  responsavel: string;
  orcamento: number;
  orcamentoGasto: number;
  percentualGasto: number;
  percentualConcluido: number;
};

export type EntregavelAlerta = {
  id: string;
  nome: string;
  descricao: string | null;
  data: Date | null;
  estado: boolean;
  diasRestantes: number;
  tarefa: {
    id: string;
    nome: string;
    workpackage: {
      id: string;
      nome: string;
      projeto: {
        id: string;
        nome: string;
      };
    };
  };
};

// funções para cálculos financeiros
async function calcularProgressoFinanceiroProjetos(
  ctx: Context,
  userId?: string,
  limit = 10
): Promise<ProjetoFinanceiro[]> {
  // Modificar a condição where para garantir que estamos buscando apenas projetos em desenvolvimento
  const where: Prisma.ProjetoWhereInput = {
    estado: "EM_DESENVOLVIMENTO",
    // Se tiver userId, filtrar pelos workpackages aos quais o usuário está associado
    ...(userId && {
      workpackages: {
        some: {
          recursos: {
            some: { userId }
          }
        }
      }
    })
  };

  try {
    // Buscar projetos com todas as informações necessárias
    const projetos = await ctx.db.projeto.findMany({
      where,
      select: {
        id: true,
        nome: true,
        valor_eti: true,
        responsavel: {
          select: { name: true }
        },
        workpackages: {
          include: {
            tarefas: true,
            recursos: {
              select: {
                ocupacao: true,
                user: { select: { salario: true } }
              }
            },
            materiais: {
              where: { estado: true }, // Apenas materiais já adquiridos
              select: {
                preco: true,
                quantidade: true
              }
            }
          }
        }
      },
      take: limit,
      orderBy: {
        id: 'desc' // Ordenar por ID é seguro
      }
    });

    console.log(`Encontrados ${projetos.length} projetos em desenvolvimento`);

    // Mapear projetos para o formato ProjetoFinanceiro
    return projetos.map(projeto => {
      // Usar type assertion para garantir que o TypeScript reconheça as propriedades
      const projetoTyped = projeto as any;
      
      // calcular custos de RH e materiais
      const { custosRH, custosMateriais } = calcularCustosWorkpackages(projetoTyped.workpackages);
      // calcular percentual de conclusão baseado nas tarefas
      const { percentual: percentualConcluido } = calcularProgressoTarefas(projetoTyped.workpackages);

      const orcamento = Number(projeto.valor_eti) || 0;
      const orcamentoGasto = custosRH + custosMateriais;

      return {
        id: projeto.id,
        nome: projeto.nome,
        responsavel: projetoTyped.responsavel?.name || "Não definido",
        orcamento,
        orcamentoGasto,
        percentualGasto: orcamento > 0 ? Math.round((orcamentoGasto / orcamento) * 100) : 0,
        percentualConcluido
      };
    });
  } catch (error) {
    console.error("Erro ao calcular progresso financeiro dos projetos:", error);
    // Em caso de erro, retornar uma lista vazia em vez de lançar exceção
    return [];
  }
}

// função para obter alertas de entregáveis
async function obterAlertasEntregaveis(
  ctx: Context,
  userId?: string,
  diasAlerta = 7 // dias para considerar como alerta
): Promise<EntregavelAlerta[]> {
  const where: Prisma.EntregavelWhereInput = {
    estado: false,
    OR: [
      // entregáveis atrasados
      {
        data: { lt: new Date() }
      },
      // entregáveis próximos do prazo
      {
        data: {
          gte: new Date(),
          lte: new Date(new Date().setDate(new Date().getDate() + diasAlerta))
        }
      }
    ]
  };

  // filtrar por user se necessário
  if (userId) {
    where.tarefa = {
      workpackage: {
        recursos: {
          some: { userId }
        }
      }
    };
  }

  const entregaveis = await ctx.db.entregavel.findMany({
    where,
    select: {
      id: true,
      nome: true,
      descricao: true,
      data: true,
      estado: true,
      tarefa: {
        select: {
          id: true,
          nome: true,
          workpackage: {
            select: {
              id: true,
              nome: true,
              projeto: {
                select: {
                  id: true,
                  nome: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { data: 'asc' }
  });

  return entregaveis.map(e => ({
    ...e,
    diasRestantes: e.data 
      ? Math.ceil((new Date(e.data).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 0
  }));
}

// função para obter ocupação de recursos
async function calcularOcupacaoRecursos(
  ctx: Context,
  userId?: string,
  meses = 3 // número de meses a considerar
) {
  const dataInicio = new Date();
  dataInicio.setMonth(dataInicio.getMonth() - meses);
  
  const where: Prisma.AlocacaoRecursoWhereInput = {
    AND: [
      {
        OR: [
          {
            ano: dataInicio.getFullYear(),
            mes: { gte: dataInicio.getMonth() + 1 }
          },
          {
            ano: new Date().getFullYear(),
            mes: { lte: new Date().getMonth() + 1 }
          }
        ]
      }
    ]
  };

  if (userId) {
    where.userId = userId;
  }

  const ocupacoes = await ctx.db.alocacaoRecurso.groupBy({
    by: ['mes', 'ano'],
    where,
    _avg: {
      ocupacao: true
    },
    orderBy: [
      { ano: 'asc' },
      { mes: 'asc' }
    ]
  });

  return ocupacoes.map(o => ({
    mes: o.mes,
    ano: o.ano,
    ocupacaoMedia: Math.round((Number(o._avg.ocupacao) || 0) * 100)
  }));
}

// Tipo para a sessão do utilizador com permissão
type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  permissao: Permissao;
};

// Input schema for period selection
const periodInputSchema = z.object({
  period: z.enum(["month", "quarter", "year"]).default("month"),
});

// Helper function to get date range based on period
function getDateRangeForPeriod(period: "month" | "quarter" | "year") {
  const now = new Date();
  const startDate = new Date();
  
  if (period === "month") {
    startDate.setMonth(now.getMonth() - 1);
  } else if (period === "quarter") {
    startDate.setMonth(now.getMonth() - 3);
  } else if (period === "year") {
    startDate.setFullYear(now.getFullYear() - 1);
  }
  
  return { startDate, endDate: now };
}

// Schemas
const periodoSchema = z.object({
  limiteRegistos: z.number().min(1).max(100).default(10)
});

// Middleware de verificação de admin
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const user = ctx.session.user as SessionUser;
  if (user.permissao !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Permissão de administrador necessária",
    });
  }
  return next();
});

// Helpers para queries comuns
async function getProjetoBase(ctx: Context, where: Prisma.ProjetoWhereInput = {}) {
  return ctx.db.projeto.findMany({
    where,
    select: {
      id: true,
      nome: true,
      valor_eti: true,
      responsavel: {
        select: { name: true }
      },
      workpackages: {
        include: {
          tarefas: true,
          recursos: {
            select: {
              ocupacao: true,
              user: { select: { salario: true } }
            }
          },
          materiais: {
            where: { estado: true },
            select: {
              preco: true,
              quantidade: true
            }
          }
        }
      }
    }
  });
}

// Helper para cálculos financeiros
function calcularCustosWorkpackages(workpackages: any[]) {
  const custosRH = workpackages.reduce(
    (acc, wp) => acc + wp.recursos.reduce((sum: number, r: any) => {
      const salario = r.user.salario ? Number(r.user.salario) : 0;
      const ocupacao = Number(r.ocupacao) || 0;
      return sum + (salario * ocupacao);
    }, 0),
    0
  );

  const custosMateriais = workpackages.reduce(
    (acc, wp) => acc + wp.materiais.reduce((sum: number, m: any) => {
      const preco = Number(m.preco) || 0;
      const quantidade = m.quantidade || 0;
      return sum + (preco * quantidade);
    }, 0),
    0
  );

  return { custosRH, custosMateriais };
}

// Helper para cálculo de progresso
function calcularProgressoTarefas(workpackages: any[]) {
  const totalTarefas = workpackages.reduce((acc, wp) => acc + wp.tarefas.length, 0);
  const tarefasConcluidas = workpackages.reduce(
    (acc, wp) => acc + wp.tarefas.filter((t: any) => t.estado).length, 0
  );
  
  return {
    total: totalTarefas,
    concluidas: tarefasConcluidas,
    percentual: totalTarefas > 0 ? Math.round((tarefasConcluidas / totalTarefas) * 100) : 0
  };
}

// Helper para datas
function getDateRange(period: "month" | "quarter" | "year" | number) {
  const endDate = new Date();
  const startDate = new Date();
  
  if (typeof period === "number") {
    startDate.setDate(endDate.getDate() - period);
  } else {
    switch (period) {
      case "month":
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }
  }
  
  return { startDate, endDate };
}

// Helpers específicos para o AdminOverview
async function getProjetosStats(ctx: Context) {
  return {
    total: await ctx.db.projeto.count(),
    ativos: await ctx.db.projeto.count({ where: { estado: "EM_DESENVOLVIMENTO" } }),
    concluidos: await ctx.db.projeto.count({ where: { estado: "CONCLUIDO" } }),
    atrasados: await ctx.db.projeto.count({ 
      where: { 
        fim: { lt: new Date() },
        estado: { not: "CONCLUIDO" }
      } 
    })
  };
}

async function getUtilizadoresStats(ctx: Context) {
  return {
    total: await ctx.db.user.count(),
    integral: await ctx.db.user.count({ where: { regime: "INTEGRAL" } }),
    parcial: await ctx.db.user.count({ where: { regime: "PARCIAL" } })
  };
}

async function getEntregaveisStats(ctx: Context) {
  const hoje = new Date();
  const proximaSemana = new Date(hoje.setDate(hoje.getDate() + 7));

  return {
    pendentes: await ctx.db.entregavel.count({ where: { estado: false } }),
    atrasados: await ctx.db.entregavel.count({ 
      where: { 
        data: { lt: new Date() },
        estado: false 
      } 
    }),
    proximos: await ctx.db.entregavel.count({ 
      where: { 
        data: { 
          gte: new Date(),
          lte: proximaSemana
        },
        estado: false 
      } 
    })
  };
}

async function getMateriaisStats(ctx: Context) {
  // apenas materiais já comprados
  const materiaisPorCategoria = await ctx.db.material.groupBy({
    by: ['rubrica'],
    _sum: {
      preco: true,
      quantidade: true
    },
    _count: {
      id: true
    },
    where: {
      estado: true
    },
  });

  return {
    categorias: materiaisPorCategoria.map(item => ({
      categoria: item.rubrica,
      total: Number(item._sum.preco) || 0,
      quantidade: Number(item._sum.quantidade) || 0,
      count: item._count.id
    }))
  };
}

async function getProjetosPorEstado(ctx: Context) {
  const projetosPorEstado = await ctx.db.projeto.groupBy({
    by: ['estado'],
    _count: {
      id: true
    }
  });

  return projetosPorEstado.map(item => ({
    nome: formatarEstadoProjeto(item.estado),
    valor: item._count.id
  }));
}

export const dashboardRouter = createTRPCRouter({
  // Admin dashboard overview data
  getAdminOverview: adminProcedure
    .query(async ({ ctx }) => {
      try {
        // Executar todas as queries em paralelo
        const [
          projetos,
          utilizadores,
          entregaveis,
          materiaisStats,
          projetosPorEstado,
          dadosFinanceiros,
          ocupacaoMensal,
          projetosAtencao
        ] = await Promise.all([
          getProjetosStats(ctx),
          getUtilizadoresStats(ctx),
          getEntregaveisStats(ctx),
          getMateriaisStats(ctx),
          getProjetosPorEstado(ctx),
          calcularDadosFinanceiros(ctx),
          obterOcupacaoMensal(ctx),
          obterProjetosAtencao(ctx)
        ]);

        return {
          projetos,
          utilizadores,
          entregaveis,
          financeiro: dadosFinanceiros,
          projetosPorEstado,
          ocupacaoMensal,
          projetosAtencao,
          materiaisStats
        };
      } catch (error) {
        console.error("Erro ao obter dados do dashboard:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter dados do dashboard",
        });
      }
    }),

  // Obter detalhes financeiros de um projeto específico
  getProjetoFinancas: adminProcedure
    .input(z.object({
      projetoId: z.string().uuid("ID do projeto inválido")
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { projetoId } = input;
        const detalhesFinanceiros = await calcularDetalhesFinanceirosProjeto(ctx, projetoId);
        return detalhesFinanceiros;
      } catch (error) {
        console.error("Erro ao obter detalhes financeiros do projeto:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter detalhes financeiros do projeto",
        });
      }
    }),

  // User dashboard data (for common users)
  getUserDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      const user = ctx.session.user as SessionUser;
      const userId = user.id;
      
      try {
        // Obter workpackages do utilizador
        const workpackagesUtilizador = await ctx.db.alocacaoRecurso.findMany({
          where: {
            userId
          },
          select: {
            workpackageId: true,
            workpackage: {
              include: {
                projeto: {
                  include: {
                    workpackages: {
                      include: {
                        tarefas: true
                      }
                    }
                  }
                }
              }
            }
          }
        });

        // Obter entregáveis próximos relevantes para o utilizador
        const entregaveisProximos = await ctx.db.entregavel.findMany({
          where: {
            estado: false,
            data: {
              gte: new Date(),
              lte: new Date(new Date().setDate(new Date().getDate() + 30))
            },
            tarefa: {
              workpackage: {
                recursos: {
                  some: {
                    userId
                  }
                }
              }
            }
          },
          include: {
            tarefa: {
              include: {
                workpackage: {
                  include: {
                    projeto: {
                      select: {
                        id: true,
                        nome: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            data: 'asc'
          },
          take: 10
        });

        // Extrair e remover duplicatas dos projetos
        const projetos = workpackagesUtilizador
          .map(wp => wp.workpackage.projeto)
          .filter((projeto, index, self) => 
            index === self.findIndex(p => p.id === projeto.id)
          );

        // Calcular estatísticas de tarefas
        const tarefasPendentes = projetos.flatMap(p => 
          p.workpackages.flatMap(wp => 
            wp.tarefas.filter(t => !t.estado)
          )
        );
        
        const tarefasUrgentes = tarefasPendentes.filter(t => 
          t.fim && new Date(t.fim) < new Date(new Date().setDate(new Date().getDate() + 3))
        );

        // Calcular ocupação mensal do utilizador
        const now = new Date();
        const mesAtual = now.getMonth() + 1;
        const anoAtual = now.getFullYear();

        const ocupacaoMensal = await ctx.db.alocacaoRecurso.aggregate({
          where: {
            userId,
            mes: mesAtual,
            ano: anoAtual
          },
          _sum: {
            ocupacao: true
          }
        });

        return {
          entregaveisProximos,
          tarefasPendentes: tarefasPendentes.length,
          tarefasPendentesUrgentes: tarefasUrgentes.length,
          projetos: projetos.map(p => ({
            id: p.id,
            nome: p.nome,
            inicio: p.inicio,
            fim: p.fim,
            estado: p.estado,
            workpackages: p.workpackages.length,
            totalTarefas: p.workpackages.reduce((acc: number, wp: Workpackage & { tarefas: Tarefa[] }) => acc + wp.tarefas.length, 0),
            tarefasConcluidas: p.workpackages.reduce(
              (acc: number, wp: Workpackage & { tarefas: Tarefa[] }) => acc + wp.tarefas.filter(t => t.estado).length, 0
            ),
            percentualConcluido: Math.round(
              (p.workpackages.reduce((acc: number, wp: Workpackage & { tarefas: Tarefa[] }) => acc + wp.tarefas.filter(t => t.estado).length, 0) /
              Math.max(1, p.workpackages.reduce((acc: number, wp: Workpackage & { tarefas: Tarefa[] }) => acc + wp.tarefas.length, 0))) * 100
            )
          })),
          projetosAtivos: projetos.filter(p => p.estado === "EM_DESENVOLVIMENTO").length,
          ocupacaoMensal: Number(ocupacaoMensal._sum.ocupacao) || 0,
          participacaoProjetos: Math.round((projetos.length / (await ctx.db.projeto.count())) * 100)
        };
      } catch (error) {
        console.error("Erro ao obter dados do dashboard do utilizador:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter dados do dashboard",
        });
      }
    }),
    
  // Get recent activities for the dashboard
  getAtividadesRecentes: protectedProcedure
    .query(async ({ ctx }) => {
      const user = ctx.session.user as SessionUser;
      const userId = user.id;
      
      try {
        // Simulated activities (in a real app, you would have an activities table)
        // This is a placeholder for demonstration
        const atividades = [
          {
            id: "1",
            tipo: "tarefa_concluida",
            descricao: "concluiu uma tarefa em DreamFAB",
            data: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            projetoId: "proj1",
            projetoNome: "DreamFAB",
            usuario: {
              id: userId,
              name: user.name,
              foto: null
            }
          },
          {
            id: "2",
            tipo: "entregavel_submetido",
            descricao: "submeteu um entregável para IAMFat",
            data: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            projetoId: "proj2",
            projetoNome: "IAMFat",
            usuario: {
              id: userId,
              name: user.name,
              foto: null
            }
          },
          {
            id: "3",
            tipo: "comentario",
            descricao: "comentou no projeto INOVC+",
            data: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
            projetoId: "proj3",
            projetoNome: "INOVC+",
            usuario: {
              id: "user2",
              name: "Maria Santos",
              foto: null
            }
          }
        ];
        
        return atividades;
      } catch (error) {
        console.error("Erro ao obter atividades recentes:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter atividades recentes",
        });
      }
    }),

  // Get upcoming tasks and deliverables with permission check
  getProximasTarefasEntregaveis: protectedProcedure
    .input(z.object({
      dias: z.number().default(30), // Período em dias para buscar tarefas/entregáveis
      limite: z.number().default(10) // Limite de resultados
    }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user as SessionUser;
      const userId = user.id;
      const { dias, limite } = input;
      
      try {
        // Define a data limite para tarefas e entregáveis próximos
        const dataLimite = new Date(new Date().setDate(new Date().getDate() + dias));
        
        // Verificar permissões do utilizador
        const isComum = user.permissao === "COMUM";
        
        // Definir filtro base para tarefas (não concluídas e prazo de entrega dentro do período)
        const tarefasWhere: any = {
          estado: false,
          fim: {
            gte: new Date(),
            lte: dataLimite
          }
        };
        
        // Definir filtro base para entregáveis
        const entregaveisWhere: any = {
          estado: false,
          data: {
            gte: new Date(),
            lte: dataLimite
          }
        };
        
        // Adicionar filtro para utilizadores comuns (apenas projetos alocados)
        if (isComum) {
          // Obter IDs dos workpackages onde o utilizador está alocado
          const workpackagesAlocados = await ctx.db.alocacaoRecurso.findMany({
            where: { userId },
            select: { workpackageId: true }
          });
          
          const workpackageIds = workpackagesAlocados.map(w => w.workpackageId);
          
          // Filtrar tarefas para apenas workpackages alocados
          tarefasWhere.workpackageId = { in: workpackageIds };
          
          // Filtrar entregáveis para apenas tarefas em workpackages alocados
          entregaveisWhere.tarefa = {
            workpackageId: { in: workpackageIds }
          };
        }
        
        // Buscar tarefas próximas
        const tarefasProximas = await ctx.db.tarefa.findMany({
          where: tarefasWhere,
          include: {
            workpackage: {
              include: {
                projeto: {
                  select: {
                    id: true,
                    nome: true
                  }
                }
              }
            }
          },
          orderBy: { fim: 'asc' },
          take: limite
        });
        
        // Buscar entregáveis próximos
        const entregaveisProximos = await ctx.db.entregavel.findMany({
          where: entregaveisWhere,
          include: {
            tarefa: {
              include: {
                workpackage: {
                  include: {
                    projeto: {
                      select: {
                        id: true,
                        nome: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: { data: 'asc' },
          take: limite
        });
        
        // Formatar os resultados
        return {
          tarefas: tarefasProximas.map(tarefa => {
            // Acesso seguro aos dados da workpackage e projeto
            const workpackage = tarefa.workpackage;
            const projeto = workpackage.projeto;
            
            return {
              id: tarefa.id,
              nome: tarefa.nome,
              descricao: tarefa.descricao,
              fim: tarefa.fim,
              estado: tarefa.estado,
              projeto: {
                id: projeto.id,
                nome: projeto.nome
              },
              workpackage: {
                id: workpackage.id,
                nome: workpackage.nome
              },
              diasRestantes: Math.ceil((new Date(tarefa.fim || new Date()).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            };
          }),
          entregaveis: entregaveisProximos.map(entregavel => {
            // Acesso seguro aos dados da tarefa, workpackage e projeto
            const tarefa = entregavel.tarefa;
            const workpackage = tarefa.workpackage;
            const projeto = workpackage.projeto;
            
            return {
              id: entregavel.id,
              nome: entregavel.nome,
              descricao: entregavel.descricao,
              data: entregavel.data,
              tarefa: {
                id: tarefa.id,
                nome: tarefa.nome
              },
              projeto: {
                id: projeto.id,
                nome: projeto.nome
              },
              diasRestantes: Math.ceil((new Date(entregavel.data || new Date()).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            };
          })
        };
      } catch (error) {
        console.error("Erro ao obter próximas tarefas e entregáveis:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter próximas tarefas e entregáveis",
        });
      }
    }),

  // Progresso financeiro dos projetos
  getProjetosProgresso: protectedProcedure
    .input(periodoSchema.optional())
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user as SessionUser;
      const userId = user.permissao === "COMUM" ? user.id : undefined;
      const limit = input?.limiteRegistos ?? 10;

      try {
        const resultado = await calcularProgressoFinanceiroProjetos(ctx, userId, limit);
        console.log(`Projetos encontrados: ${resultado.length}`);
        return resultado;
      } catch (error) {
        console.error("Erro ao obter progresso dos projetos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter progresso financeiro dos projetos"
        });
      }
    }),

  // Alertas de entregáveis (próximos e atrasados)
  getAlertasEntregaveis: protectedProcedure
    .input(z.object({
      diasAlerta: z.number().min(1).max(30).default(7),
      limiteRegistos: z.number().min(1).max(100).default(10)
    }).optional())
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user as SessionUser;
      const userId = user.permissao === "COMUM" ? user.id : undefined;
      const diasAlerta = input?.diasAlerta ?? 7;
      const limite = input?.limiteRegistos ?? 10;

      return obterAlertasEntregaveis(ctx, userId, diasAlerta);
    }),

  // Ocupação de recursos
  getOcupacaoRecursos: protectedProcedure
    .input(z.object({ 
      meses: z.number().min(1).max(12).default(3) 
    }).optional())
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user as SessionUser;
      const userId = user.permissao === "COMUM" ? user.id : undefined;
      const meses = input?.meses ?? 3;

      return calcularOcupacaoRecursos(ctx, userId, meses);
    }),

  // Get monthly expenses data
  getDespesasMensais: protectedProcedure
    .input(z.object({
      ano: z.number().optional().default(() => new Date().getFullYear()),
      limiteRegistos: z.number().optional().default(12)
    }))
    .query(async ({ ctx, input }) => {
      const { ano, limiteRegistos } = input;
      
      try {
        // Obter dados de alocação de recursos por mês
        const alocacoesPorMes = await ctx.db.alocacaoRecurso.groupBy({
          by: ['mes', 'ano'],
          _sum: {
            ocupacao: true
          },
          where: {
            ano: {
              lte: ano
            }
          },
          orderBy: [
            { ano: 'desc' },
            { mes: 'desc' }
          ],
          having: {
            ano: {
              lte: ano
            }
          },
          take: limiteRegistos
        });
        
        // Obter dados de materiais agrupados por ano de utilização (apenas materiais já comprados)
        const materiaisPorAno = await ctx.db.material.groupBy({
          by: ['ano_utilizacao'],
          _sum: {
            preco: true
          },
          where: {
            estado: true // Apenas materiais já comprados
          },
          orderBy: {
            ano_utilizacao: 'desc'
          },
          take: limiteRegistos
        });
        
        // Mapear os meses e combinar os dados
        const mesesNomes = [
          'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ];
        
        // Para obter salário médio dos recursos (simplificação)
        const salarioMedio = await ctx.db.user.aggregate({
          _avg: {
            salario: true
          }
        });
        
        const valorSalarioMedio = Number(salarioMedio._avg.salario) || 3000; // fallback para um valor padrão
        
        // Processar dados de alocações
        const mapaAlocacoes = new Map();
        for (const item of alocacoesPorMes) {
          const chave = `${item.ano}-${item.mes}`;
          // Considerando que ocupação é uma percentagem (0-1), multiplicamos pelo salário médio
          const valorRH = Number(item._sum.ocupacao) * valorSalarioMedio || 0;
          
          mapaAlocacoes.set(chave, {
            mes: mesesNomes[item.mes - 1],
            ano: item.ano,
            valorRH,
            valorMateriais: 0,
            valorTotal: valorRH
          });
        }
        
        // Processar dados de materiais por ano, distribuindo valores por mês (simplificação)
        for (const item of materiaisPorAno) {
          const anoUtilizacao = item.ano_utilizacao;
          const valorMaterialPorMes = Number(item._sum.preco) / 12 || 0; // Simplificação: dividir o valor anual por 12 meses
          
          // Distribuir o valor por cada mês do ano
          for (let mes = 1; mes <= 12; mes++) {
            const chave = `${anoUtilizacao}-${mes}`;
            
            if (mapaAlocacoes.has(chave)) {
              const dadosExistentes = mapaAlocacoes.get(chave);
              mapaAlocacoes.set(chave, {
                ...dadosExistentes,
                valorMateriais: dadosExistentes.valorMateriais + valorMaterialPorMes,
                valorTotal: dadosExistentes.valorRH + dadosExistentes.valorMateriais + valorMaterialPorMes
              });
            } else {
              mapaAlocacoes.set(chave, {
                mes: mesesNomes[mes - 1],
                ano: anoUtilizacao,
                valorRH: 0,
                valorMateriais: valorMaterialPorMes,
                valorTotal: valorMaterialPorMes
              });
            }
          }
        }
        
        // Converter mapa para array e ordenar
        let despesasMensais = Array.from(mapaAlocacoes.values());
        despesasMensais.sort((a, b) => {
          if (a.ano !== b.ano) return a.ano - b.ano;
          return mesesNomes.indexOf(a.mes) - mesesNomes.indexOf(b.mes);
        });
        
        // Retornar apenas os últimos X meses definidos pelo limiteRegistos
        despesasMensais = despesasMensais.slice(0, limiteRegistos);
        
        return despesasMensais;
      } catch (error) {
        console.error("Erro ao obter dados de despesas mensais:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter dados de despesas mensais",
        });
      }
    }),
    
  // Obter comparativo de gastos (materiais vs recursos) por projeto
  getGastosComparativoPorProjeto: protectedProcedure
    .query(async ({ ctx }) => {
      const { Decimal } = await import("decimal.js");
      const { calcularAlocacoesPassadas } = await import("../utils");
      
      try {
        // Obter todos os projetos ativos
        const projetos = await ctx.db.projeto.findMany({
          where: {
            estado: "EM_DESENVOLVIMENTO"
          },
          select: {
            id: true,
            nome: true,
          }
        });
        
        // Para cada projeto, calcular gastos de materiais vs recursos
        const projetosComGastos = await Promise.all(
          projetos.map(async (projeto) => {
            // Obter todas as alocações do projeto
            const alocacoes = await ctx.db.alocacaoRecurso.findMany({
              where: {
                workpackage: { projetoId: projeto.id }
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    salario: true
                  }
                }
              }
            });
            
            // Obter os materiais já adquiridos (estado = true)
            const materiaisAdquiridos = await ctx.db.material.findMany({
              where: {
                workpackage: { projetoId: projeto.id },
                estado: true // Apenas materiais já comprados
              }
            });
            
            // Calcular alocações que já ocorreram (meses passados)
            const hoje = new Date();
            const anoAtual = hoje.getFullYear();
            const mesAtual = hoje.getMonth() + 1;
            
            // Usar a função auxiliar para calcular alocações passadas
            const { custos: custosAlocacoesPassadas } = 
              calcularAlocacoesPassadas(alocacoes, anoAtual, mesAtual);
            
            // Calcular custo total de materiais adquiridos
            const custoMaterialAdquirido = materiaisAdquiridos.reduce(
              (sum: typeof Decimal.prototype, material: any) => {
                const custoTotal = material.preco.times(new Decimal(material.quantidade));
                return sum.plus(custoTotal);
              },
              new Decimal(0)
            );
            
            // Calcular percentagens
            const totalGasto = custosAlocacoesPassadas.plus(custoMaterialAdquirido);
            
            let percentagemMateriais = 0;
            let percentagemRecursos = 0;
            
            if (!totalGasto.isZero()) {
              percentagemMateriais = custoMaterialAdquirido.dividedBy(totalGasto).times(100).toNumber();
              percentagemRecursos = custosAlocacoesPassadas.dividedBy(totalGasto).times(100).toNumber();
            }
            
            return {
              id: projeto.id,
              nome: projeto.nome,
              gastos: {
                materiais: custoMaterialAdquirido.toNumber(),
                recursos: custosAlocacoesPassadas.toNumber(),
                total: totalGasto.toNumber()
              },
              percentagens: {
                materiais: Math.round(percentagemMateriais),
                recursos: Math.round(percentagemRecursos)
              }
            };
          })
        );
        
        return projetosComGastos;
      } catch (error) {
        console.error("Erro ao obter comparativo de gastos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter comparativo de gastos por projeto",
        });
      }
    })
});

// Helper functions for data processing
async function calcularDadosFinanceiros(ctx: any) {
  // Obter orçamento total estimado de todos os projetos
  const orcamentoTotalProj = await ctx.db.projeto.aggregate({
    _sum: {
      valor_eti: true
    }
  });

  // Calcular custos de recursos humanos (não há campo custo, então fazemos um cálculo aproximado)
  // Usando abordagem alternativa pois não podemos fazer cálculos diretos no aggregate
  const alocacoes = await ctx.db.alocacaoRecurso.findMany({
    include: {
      user: {
        select: {
          salario: true
        }
      }
    }
  });
  
  let custosRHValue = 0;
  for (const alocacao of alocacoes) {
    if (alocacao.user?.salario) {
      const salario = Number(alocacao.user.salario);
      const ocupacao = Number(alocacao.ocupacao);
      custosRHValue += salario * ocupacao;
    }
  }

  // Calcular custos de materiais (apenas os que já foram comprados)
  const custosMateriais = await ctx.db.material.aggregate({
    _sum: {
      preco: true
    },
    where: {
      estado: true // Apenas materiais já comprados
    }
  });

  // Outros custos (simulado como 15% do total para esta demo)
  const custosMaterialValue = Number(custosMateriais._sum.preco) || 0;
  const custosServicos = (custosRHValue + custosMaterialValue) * 0.15;
  const custosOutros = (custosRHValue + custosMaterialValue) * 0.05;
  
  const gastoTotal = custosRHValue + custosMaterialValue + custosServicos + custosOutros;
  const orcamentoTotal = Number(orcamentoTotalProj._sum.valor_eti) || 0;

  // Calcular percentagens
  const rhPct = gastoTotal > 0 ? (custosRHValue / gastoTotal) * 100 : 0;
  const materiaisPct = gastoTotal > 0 ? (custosMaterialValue / gastoTotal) * 100 : 0;
  const servicosPct = gastoTotal > 0 ? (custosServicos / gastoTotal) * 100 : 0;
  const outrosPct = gastoTotal > 0 ? (custosOutros / gastoTotal) * 100 : 0;

  return {
    orcamentoTotal,
    gastoTotal,
    distribuicao: {
      rh: custosRHValue,
      materiais: custosMaterialValue,
      servicos: custosServicos,
      outros: custosOutros
    },
    distribuicaoPct: {
      rh: Math.round(rhPct),
      materiais: Math.round(materiaisPct),
      servicos: Math.round(servicosPct),
      outros: Math.round(outrosPct)
    }
  };
}

async function obterOcupacaoMensal(ctx: Context) {
  const hoje = new Date();
  const ultimosMeses = 6; // período fixo de 6 meses
  
  const ocupacoes = await ctx.db.alocacaoRecurso.groupBy({
    by: ['mes', 'ano'],
    where: {
      OR: [
        {
          ano: hoje.getFullYear(),
          mes: { lte: hoje.getMonth() + 1 }
        },
        {
          ano: hoje.getFullYear() - 1,
          mes: { gt: hoje.getMonth() + 1 - ultimosMeses }
        }
      ]
    },
    _avg: {
      ocupacao: true
    },
    orderBy: [
      { ano: 'asc' },
      { mes: 'asc' }
    ],
    take: ultimosMeses
  });

  return ocupacoes.map(o => ({
    mes: o.mes,
    ano: o.ano,
    ocupacaoMedia: Math.round((Number(o._avg.ocupacao) || 0) * 100)
  }));
}

async function obterProjetosAtencao(ctx: any) {
  // Obter projetos com problemas (atrasados ou orçamento excedido)
  const projetos = await ctx.db.projeto.findMany({
    where: {
      OR: [
        // Projetos atrasados
        {
          fim: { lt: new Date() },
          estado: { not: "CONCLUIDO" }
        },
        // Projetos com workpackages atrasados
        {
          workpackages: {
            some: {
              fim: { lt: new Date() },
              estado: false
            }
          }
        },
      ]
    },
    include: {
      responsavel: {
        select: {
          name: true
        }
      },
      workpackages: {
        include: {
          tarefas: true,
          recursos: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  salario: true
                }
              }
            }
          },
          materiais: {
            where: {
              estado: true // Apenas materiais já comprados
            }
          }
        }
      }
    },
    take: 5 // Limitando a 5 projetos para manter a UI limpa
  });

  // Obtém orçamento gasto por projeto para identificar excedentes
  const projsComOrcamento = await Promise.all(
    projetos.map(async (projeto: Projeto & { 
      workpackages: (Workpackage & { 
        tarefas: Tarefa[];
        recursos: {
          ocupacao?: any;
          user: {
            id: string;
            name: string | null;
            salario: any;
          };
        }[];
        materiais: any[];
      })[];
      responsavel?: { name: string | null } | null;
      valor_eti?: any;
    }) => {
      // Cálculo simplificado de custos usando os recursos já incluídos
      let custoRH = 0;
      for (const wp of projeto.workpackages) {
        for (const recurso of wp.recursos) {
          if (recurso.user?.salario) {
            // Aqui estamos supondo que a ocupação está no recurso
            const salario = Number(recurso.user.salario);
            const ocupacao = Number(recurso.ocupacao || 0);
            custoRH += salario * ocupacao;
          }
        }
      }
      
      // Cálculo simplificado de custos de materiais usando os materiais já incluídos
      let custoMateriais = 0;
      for (const wp of projeto.workpackages) {
        for (const material of wp.materiais) {
          const preco = Number(material.preco) || 0;
          const quantidade = Number(material.quantidade) || 0;
          custoMateriais += preco * quantidade;
        }
      }
      
      const orcamentoGasto = custoRH + custoMateriais;
      const valorEti = Number(projeto.valor_eti) || 0;
      const percentualOrcamentoGasto = valorEti > 0 ? (orcamentoGasto / valorEti) * 100 : 0;
      const orcamentoExcedido = percentualOrcamentoGasto > 100;
      
      // Calcular percentual de conclusão do projeto
      const totalTarefas = projeto.workpackages.reduce((acc: number, wp) => acc + wp.tarefas.length, 0);
      const tarefasConcluidas = projeto.workpackages.reduce(
        (acc: number, wp) => acc + wp.tarefas.filter(t => t.estado).length, 0
      );
      const percentualConcluido = totalTarefas > 0 ? (tarefasConcluidas / totalTarefas) * 100 : 0;
      
      return {
        id: projeto.id,
        nome: projeto.nome,
        responsavel: projeto.responsavel?.name || "Não definido",
        atrasado: projeto.fim ? new Date(projeto.fim) < new Date() && projeto.estado !== "CONCLUIDO" : false,
        orcamentoExcedido,
        percentualConcluido: Math.round(percentualConcluido),
        percentualOrcamentoGasto: Math.round(percentualOrcamentoGasto)
      };
    })
  );

  return projsComOrcamento;
}

function formatarEstadoProjeto(estado: unknown) {
  const estadoStr = String(estado);
  const mapeamento: Record<string, string> = {
    "EM_DESENVOLVIMENTO": "Em Desenvolvimento",
    "CONCLUIDO": "Concluído",
    "EM_ANALISE": "Em Análise",
    "CANCELADO": "Cancelado",
    "EM_PAUSA": "Em Pausa",
    "RASCUNHO": "Rascunho",
    "PENDENTE": "Pendente",
    "APROVADO": "Aprovado"
  };
  
  return mapeamento[estadoStr] || estadoStr;
}

// Nova função para calcular detalhes financeiros de um projeto específico,
// adaptada do código de projetos.ts (getFinancas)
async function calcularDetalhesFinanceirosProjeto(ctx: any, projetoId: string) {
  const { Decimal } = await import("decimal.js");
  const { calcularAlocacoesPassadas } = await import("../utils");
  
  const projeto = await ctx.db.projeto.findUnique({
    where: { id: projetoId },
    select: {
      valor_eti: true,
      overhead: true
    }
  });

  if (!projeto) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Projeto não encontrado"
    });
  }

  type AlocacaoWithDetails = {
    id: string;
    userId: string;
    workpackageId: string;
    mes: number;
    ano: number;
    ocupacao: typeof Decimal.prototype;
    user: {
      id: string;
      name: string | null;
      salario: typeof Decimal.prototype | null;
    };
    workpackage: {
      id: string;
      nome: string;
    };
  };

  const alocacoes = await ctx.db.alocacaoRecurso.findMany({
    where: {
      workpackage: { projetoId },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          salario: true,
        }
      },
      workpackage: {
        select: {
          id: true,
          nome: true
        }
      }
    }
  }) as AlocacaoWithDetails[];

  const materiais = await ctx.db.material.findMany({
    where: {
      workpackage: { projetoId },
    }
  });

  // Materiais já adquiridos (com estado true)
  const materiaisAdquiridos = await ctx.db.material.findMany({
    where: {
      workpackage: { projetoId },
      estado: true
    }
  });

  const custoMaterialAdquirido = materiaisAdquiridos.reduce(
    (sum: typeof Decimal.prototype, material: any) => {
      const custoTotal = material.preco.times(new Decimal(material.quantidade));
      return sum.plus(custoTotal);
    },
    new Decimal(0)
  );

  // Calcular alocações que já ocorreram (meses passados)
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  // Usar a função auxiliar para calcular alocações passadas
  const { custos: custosAlocacoesPassadas, etis: etisAlocacoesPassadas } = 
    calcularAlocacoesPassadas(alocacoes, anoAtual, mesAtual);

  // Processar custos por utilizador (adaptado da função original)
  const custosPorUser = alocacoes.reduce((acc, alocacao) => {
    const user = alocacao.user;
    const workpackage = alocacao.workpackage;
    
    if (!acc[user.id]) {
      acc[user.id] = {
        user: {
          id: user.id,
          name: user.name ?? "Nome Desconhecido",
          salario: user.salario
        },
        totalAlocacao: new Decimal(0),
        custoTotal: new Decimal(0),
        alocacoes: []
      };
    }
    
    if (alocacao.ocupacao) {
      const userEntry = acc[user.id];
      
      if (userEntry) {
        userEntry.totalAlocacao = userEntry.totalAlocacao.plus(alocacao.ocupacao);
        
        let custo = new Decimal(0);
        if (user.salario) {
          custo = alocacao.ocupacao.times(user.salario);
          userEntry.custoTotal = userEntry.custoTotal.plus(custo);
        }
        
        // Adicionar detalhe da alocação
        userEntry.alocacoes.push({
          alocacaoId: alocacao.id,
          workpackage: {
            id: workpackage.id,
            nome: workpackage.nome
          },
          data: new Date(alocacao.ano, alocacao.mes - 1, 1), // Primeiro dia do mês
          mes: alocacao.mes,
          ano: alocacao.ano,
          etis: alocacao.ocupacao.toNumber(), // ETIs em vez de horas
          custo: custo.toNumber()
        });
      }
    }
    
    return acc;
  }, {} as Record<string, {
    user: { id: string; name: string; salario: typeof Decimal.prototype | null };
    totalAlocacao: typeof Decimal.prototype;
    custoTotal: typeof Decimal.prototype;
    alocacoes: Array<{
      alocacaoId: string;
      workpackage: { id: string; nome: string };
      data: Date;
      mes: number;
      ano: number;
      etis: number;
      custo: number;
    }>;
  }>);

  const totalAlocacao = Object.values(custosPorUser).reduce(
    (sum, item) => sum.plus(item.totalAlocacao), 
    new Decimal(0)
  );
  
  const totalCustoRecursos = Object.values(custosPorUser).reduce(
    (sum, item) => sum.plus(item.custoTotal), 
    new Decimal(0)
  );
  
  const totalCustoMateriais = materiais.reduce(
    (sum: typeof Decimal.prototype, material: any) => {
      const custoTotal = material.preco.times(new Decimal(material.quantidade));
      return sum.plus(custoTotal);
    },
    new Decimal(0)
  );
  
  const orcamentoEstimado = totalAlocacao.times(projeto.valor_eti || new Decimal(0));
  
  const orcamentoReal = totalCustoRecursos.plus(totalCustoMateriais);

  return {
    resumo: {
      totalAlocacao: totalAlocacao.toNumber(),
      orcamento: {
        estimado: orcamentoEstimado.toNumber(),
        real: {
          totalRecursos: totalCustoRecursos.toNumber(),
          totalMateriais: totalCustoMateriais.toNumber(),
          total: orcamentoReal.toNumber()
        }
      }
    },
    custosRealizados: {
      alocacoes: {
        custo: custosAlocacoesPassadas.toNumber(),
        etis: etisAlocacoesPassadas.toNumber()
      },
      materiais: {
        custo: custoMaterialAdquirido.toNumber(),
        quantidade: materiaisAdquiridos.length
      },
      total: custosAlocacoesPassadas.plus(custoMaterialAdquirido).toNumber(),
      // Calcular percentagem em relação ao orçamento real
      percentagemReal: orcamentoReal.greaterThan(0)
        ? (custosAlocacoesPassadas.plus(custoMaterialAdquirido).dividedBy(orcamentoReal).times(100)).toNumber()
        : 0,
      // Calcular percentagem em relação ao orçamento estimado
      percentagemEstimado: orcamentoEstimado.greaterThan(0)
        ? (custosAlocacoesPassadas.plus(custoMaterialAdquirido).dividedBy(orcamentoEstimado).times(100)).toNumber()
        : 0
    }
  };
} 