import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import type { Workpackage, Tarefa, Projeto, Permissao } from "@prisma/client";

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

export const dashboardRouter = createTRPCRouter({
  // Admin dashboard overview data
  getAdminOverview: protectedProcedure
    .input(periodInputSchema)
    .query(async ({ ctx, input }) => {
      // Verificar se o utilizador tem permissão de admin
      const user = ctx.session.user as SessionUser;
      if (user.permissao !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Permissão de administrador necessária",
        });
      }

      const { period } = input;
      const { startDate, endDate } = getDateRangeForPeriod(period);
      
      try {
        // Obter contagens básicas
        const [
          totalProjetos,
          projetosAtivos,
          projetosConcluidos,
          projetosAtrasados,
          totalUtilizadores,
          utilizadoresIntegral,
          utilizadoresParcial,
          entregaveisPendentes,
          entregaveisAtrasados,
          entregaveisProximos,
          materiaisPorCategoria
        ] = await Promise.all([
          // Contagem de projetos
          ctx.db.projeto.count(),
          ctx.db.projeto.count({ where: { estado: "EM_DESENVOLVIMENTO" } }),
          ctx.db.projeto.count({ where: { estado: "CONCLUIDO" } }),
          ctx.db.projeto.count({ 
            where: { 
              fim: { lt: new Date() },
              estado: { not: "CONCLUIDO" }
            } 
          }),
          
          // Contagem de utilizadores
          ctx.db.user.count(),
          ctx.db.user.count({ where: { regime: "INTEGRAL" } }),
          ctx.db.user.count({ where: { regime: "PARCIAL" } }),
          
          // Contagem de entregáveis
          ctx.db.entregavel.count({ where: { estado: false } }),
          ctx.db.entregavel.count({ 
            where: { 
              data: { lt: new Date() },
              estado: false 
            } 
          }),
          ctx.db.entregavel.count({ 
            where: { 
              data: { 
                gte: new Date(),
                lte: new Date(new Date().setDate(new Date().getDate() + 7))
              },
              estado: false 
            } 
          }),
          
          // Contagem de materiais por categoria
          ctx.db.material.groupBy({
            by: ['rubrica'],
            _sum: {
              preco: true,
              quantidade: true
            },
            _count: {
              id: true
            },
          })
        ]);

        // Obter projetos por estado para o gráfico
        const projetosPorEstado = await ctx.db.projeto.groupBy({
          by: ['estado'],
          _count: {
            id: true
          }
        });

        // Calcular dados financeiros
        const dadosFinanceiros = await calcularDadosFinanceiros(ctx);

        // Obter dados de ocupação mensal
        const ocupacaoMensal = await obterOcupacaoMensal(ctx, startDate, endDate);

        // Obter projetos que precisam de atenção (atrasados ou orçamento excedido)
        const projetosAtencao = await obterProjetosAtencao(ctx);

        return {
          projetos: {
            total: totalProjetos,
            ativos: projetosAtivos,
            concluidos: projetosConcluidos,
            atrasados: projetosAtrasados
          },
          utilizadores: {
            total: totalUtilizadores,
            integral: utilizadoresIntegral,
            parcial: utilizadoresParcial
          },
          entregaveis: {
            pendentes: entregaveisPendentes,
            atrasados: entregaveisAtrasados,
            proximos: entregaveisProximos
          },
          financeiro: dadosFinanceiros,
          projetosPorEstado: projetosPorEstado.map(item => ({
            nome: formatarEstadoProjeto(item.estado),
            valor: item._count.id
          })),
          ocupacaoMensal,
          projetosAtencao,
          materiaisStats: {
            categorias: materiaisPorCategoria.map(item => ({
              categoria: item.rubrica,
              total: item._sum.preco || 0,
              quantidade: item._sum.quantidade || 0,
              count: item._count.id
            }))
          }
        };
      } catch (error) {
        console.error("Erro ao obter dados do dashboard:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter dados do dashboard",
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
    })
});

// Helper functions for data processing
async function calcularDadosFinanceiros(ctx: any) {
  // Obter orçamento total estimado de todos os projetos
  const orcamentoTotalProj = await ctx.db.projeto.aggregate({
    _sum: {
      orcamento: true
    }
  });

  // Calcular custos de recursos humanos
  const custosRH = await ctx.db.alocacaoRecurso.aggregate({
    _sum: {
      custo: true
    }
  });

  // Calcular custos de materiais
  const custosMateriais = await ctx.db.material.aggregate({
    _sum: {
      preco: true
    }
  });

  // Outros custos (simulado como 15% do total para esta demo)
  const custosRHValue = Number(custosRH._sum.custo) || 0;
  const custosMaterialValue = Number(custosMateriais._sum.preco) || 0;
  const custosServicos = (custosRHValue + custosMaterialValue) * 0.15;
  const custosOutros = (custosRHValue + custosMaterialValue) * 0.05;
  
  const gastoTotal = custosRHValue + custosMaterialValue + custosServicos + custosOutros;
  const orcamentoTotal = Number(orcamentoTotalProj._sum.orcamento) || 0;

  // Calcular percentagens
  const rhPct = orcamentoTotal > 0 ? (custosRHValue / gastoTotal) * 100 : 0;
  const materiaisPct = orcamentoTotal > 0 ? (custosMaterialValue / gastoTotal) * 100 : 0;
  const servicosPct = orcamentoTotal > 0 ? (custosServicos / gastoTotal) * 100 : 0;
  const outrosPct = orcamentoTotal > 0 ? (custosOutros / gastoTotal) * 100 : 0;

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

async function obterOcupacaoMensal(ctx: any, startDate: Date, endDate: Date) {
  // Gerar lista de meses entre startDate e endDate
  const meses = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    meses.push({
      mes: currentDate.getMonth() + 1,
      ano: currentDate.getFullYear(),
      nomeMes: currentDate.toLocaleString('pt-PT', { month: 'short' })
    });
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Obter dados de ocupação por mês
  const ocupacaoMensal = [];
  
  for (const { mes, ano, nomeMes } of meses) {
    const ocupacao = await ctx.db.alocacaoRecurso.aggregate({
      where: {
        mes,
        ano
      },
      _avg: {
        ocupacao: true
      }
    });
    
    ocupacaoMensal.push({
      mes: nomeMes,
      ano,
      ocupacao: Math.round(Number(ocupacao._avg.ocupacao) || 0)
    });
  }
  
  return ocupacaoMensal;
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
          tarefas: true
        }
      }
    },
    take: 5
  });

  // Obtém orçamento gasto por projeto para identificar excedentes
  const projsComOrcamento = await Promise.all(
    projetos.map(async (projeto: Projeto & { 
      workpackages: (Workpackage & { tarefas: Tarefa[] })[];
      responsavel?: { name: string | null } | null;
      orcamento?: number | null;
    }) => {
      // Cálculo simplificado de custos (no cenário real seria mais complexo)
      const custoRH = await ctx.db.alocacaoRecurso.aggregate({
        where: {
          workpackage: {
            projetoId: projeto.id
          }
        },
        _sum: {
          custo: true
        }
      });
      
      const custoMateriais = await ctx.db.material.aggregate({
        where: {
          workpackageId: {
            in: projeto.workpackages.map(wp => wp.id)
          }
        },
        _sum: {
          preco: true
        }
      });
      
      const orcamentoGasto = (Number(custoRH._sum.custo) || 0) + (Number(custoMateriais._sum.preco) || 0);
      const percentualOrcamentoGasto = projeto.orcamento ? (orcamentoGasto / projeto.orcamento) * 100 : 0;
      const orcamentoExcedido = percentualOrcamentoGasto > 100;
      
      // Calcular percentual de conclusão do projeto
      const totalTarefas = projeto.workpackages.reduce((acc: number, wp: Workpackage & { tarefas: Tarefa[] }) => acc + wp.tarefas.length, 0);
      const tarefasConcluidas = projeto.workpackages.reduce(
        (acc: number, wp: Workpackage & { tarefas: Tarefa[] }) => acc + wp.tarefas.filter(t => t.estado).length, 0
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