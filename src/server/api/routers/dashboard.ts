import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

// Tipos auxiliares
type Context = {
  db: PrismaClient;
};

// Interfaces para retorno de dados
export interface DashboardData {
  projetos: {
    id: string;
    nome: string;
    inicio: Date | null;
    fim: Date | null;
    estado: string;
    workpackages: number;
    totalTarefas: number;
    tarefasConcluidas: number;
    percentualConcluido: number;
  }[];
  projetosAtivos: number;
  projetosPendentes: number;
  tarefasPendentes: number;
  ocupacaoMensal: number;
  entregaveisProximos: EntregavelAlerta[];
  entregaveisMesAtual: EntregavelAlerta[];
  ocupacaoRecursos: OcupacaoRecurso[];
  atividadesRecentes: AtividadeRecente[];
}

export interface EntregavelAlerta {
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
}

export interface OcupacaoRecurso {
  mes: number;
  ano: number;
  ocupacaoMedia: number;
}

export interface AtividadeRecente {
  id: string;
  tipo: string;
  descricao: string;
  data: Date;
  projetoId: string;
  projetoNome: string;
  usuario: {
    id: string;
    name: string | null;
    foto: string | null;
  };
}

// Funções auxiliares
// function calcularProgressoTarefas(workpackages: any[]) { ... }

async function obterDadosDashboard(
  ctx: Context,
  userId: string,
  isAdmin: boolean
): Promise<DashboardData> {
  // Buscar projetos e workpackages do utilizador
  const workpackagesQuery = await ctx.db.workpackage.findMany({
    where: isAdmin
      ? {}
      : {
          recursos: {
            some: { userId },
          },
        },
    include: {
      projeto: true,
      tarefas: true,
      recursos: {
        include: {
          user: true,
        },
      },
    },
  });

  // Agrupar por projeto e calcular métricas
  const projetosMap = new Map();
  workpackagesQuery.forEach((wp) => {
    const projeto = wp.projeto;
    if (!projetosMap.has(projeto.id)) {
      projetosMap.set(projeto.id, {
        ...projeto,
        workpackages: 0,
        totalTarefas: 0,
        tarefasConcluidas: 0,
      });
    }

    const projetoData = projetosMap.get(projeto.id);
    projetoData.workpackages++;
    projetoData.totalTarefas += wp.tarefas.length;
    projetoData.tarefasConcluidas += wp.tarefas.filter((t) => t.estado).length;
  });

  const projetos = Array.from(projetosMap.values()).map((p) => ({
    ...p,
    percentualConcluido:
      p.totalTarefas > 0 ? Math.round((p.tarefasConcluidas / p.totalTarefas) * 100) : 0,
  }));

  // Buscar entregáveis próximos
  const hoje = new Date();
  const entregaveisProximos = await ctx.db.entregavel.findMany({
    where: {
      estado: false,
      OR: [
        { data: { lt: hoje } },
        {
          data: {
            gte: hoje,
            lte: new Date(hoje.setDate(hoje.getDate() + 7)),
          },
        },
      ],
      ...(isAdmin
        ? {}
        : {
            tarefa: {
              workpackage: {
                recursos: {
                  some: { userId },
                },
              },
            },
          }),
    },
    include: {
      tarefa: {
        include: {
          workpackage: {
            include: {
              projeto: true,
            },
          },
        },
      },
    },
    orderBy: { data: "asc" },
  });
  
  // Buscar entregáveis do mês atual
  const dataAtual = new Date();
  const mesAtual = dataAtual.getMonth() + 1; // JavaScript usa meses 0-11
  const anoAtual = dataAtual.getFullYear();
  
  // Primeiro dia do mês atual
  const primeiroDiaMes = new Date(anoAtual, mesAtual - 1, 1);
  // Último dia do mês atual (primeiro dia do próximo mês - 1)
  const ultimoDiaMes = new Date(anoAtual, mesAtual, 0);
  
  const entregaveisMesAtual = await ctx.db.entregavel.findMany({
    where: {
      AND: [
        {
          OR: [
            {
              data: {
                equals: null
              }
            },
            {
              data: {
                gte: primeiroDiaMes,
                lte: ultimoDiaMes
              }
            }
          ]
        },
        isAdmin
          ? {}
          : {
              tarefa: {
                workpackage: {
                  recursos: {
                    some: { userId },
                  },
                },
              },
            },
      ]
    },
    include: {
      tarefa: {
        include: {
          workpackage: {
            include: {
              projeto: true,
            },
          },
        },
      },
    },
    orderBy: { data: "asc" },
  });

  // Buscar atividades recentes
  const tarefas = await ctx.db.tarefa.findMany({
    where: {
      estado: true,
      fim: {
        gte: new Date(hoje.setDate(hoje.getDate() - 7)),
      },
      workpackage: {
        recursos: {
          some: { userId },
        },
      },
    },
    include: {
      workpackage: {
        include: {
          projeto: true,
        },
      },
    },
    take: 5,
    orderBy: { fim: "desc" },
  });

  const atividadesRecentes = tarefas.map((tarefa) => ({
    id: tarefa.id,
    tipo: "tarefa_concluida",
    descricao: `Concluiu a tarefa: ${tarefa.nome}`,
    data: tarefa.fim || new Date(),
    projetoId: tarefa.workpackage.projeto.id,
    projetoNome: tarefa.workpackage.projeto.nome,
    usuario: {
      id: userId,
      name: null,
      foto: null,
    },
  }));

  // Calcular ocupação mensal
  const ocupacaoMensal = await ctx.db.alocacaoRecurso.aggregate({
    where: {
      userId,
      mes: new Date().getMonth() + 1,
      ano: new Date().getFullYear(),
    },
    _sum: {
      ocupacao: true,
    },
  });

  // Buscar ocupação de recursos dos últimos 3 meses
  const dataInicio = new Date();
  dataInicio.setMonth(dataInicio.getMonth() - 3);

  const ocupacaoRecursos = await ctx.db.alocacaoRecurso.groupBy({
    by: ["mes", "ano"],
    where: {
      AND: [
        {
          OR: [
            {
              ano: dataInicio.getFullYear(),
              mes: { gte: dataInicio.getMonth() + 1 },
            },
            {
              ano: new Date().getFullYear(),
              mes: { lte: new Date().getMonth() + 1 },
            },
          ],
        },
        isAdmin ? {} : { userId },
      ],
    },
    _avg: {
      ocupacao: true,
    },
    orderBy: [{ ano: "asc" }, { mes: "asc" }],
  });

  return {
    projetos,
    projetosAtivos: projetos.filter((p) => p.estado === "EM_DESENVOLVIMENTO" || p.estado === "APROVADO").length,
    projetosPendentes: projetos.filter((p) => p.estado === "PENDENTE").length,
    tarefasPendentes: projetos.reduce((acc, p) => acc + (p.totalTarefas - p.tarefasConcluidas), 0),
    ocupacaoMensal: Number(ocupacaoMensal._sum.ocupacao) || 0,
    entregaveisProximos: entregaveisProximos.map((e) => ({
      ...e,
      diasRestantes: e.data
        ? Math.ceil((new Date(e.data).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    })),
    entregaveisMesAtual: entregaveisMesAtual.map((e) => ({
      ...e,
      diasRestantes: e.data
        ? Math.ceil((new Date(e.data).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    })),
    ocupacaoRecursos: ocupacaoRecursos.map((o) => ({
      mes: o.mes,
      ano: o.ano,
      ocupacaoMedia: Math.round((Number(o._avg.ocupacao) || 0) * 100),
    })),
    atividadesRecentes,
  };
}

// Schema para getDespesasMensais
const getDespesasMensaisSchema = z.object({
  ano: z.number(),
  limiteRegistos: z.number().optional(),
});

// Schema para getOpcoesFiltroAno - novo endpoint para pegar anos disponíveis
const getOpcoesFiltroAnoSchema = z.object({
  incluiVazios: z.boolean().default(true),
});

export const dashboardRouter = createTRPCRouter({
  // Dashboard unificado - substitui getUserDashboard
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;
    if (!user?.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Utilizador não autenticado",
      });
    }

    // Check if user has admin role from database
    const dbUser = await ctx.db.user.findUnique({
      where: { id: user.id },
      select: { permissao: true },
    });

    const isAdmin = dbUser?.permissao === "ADMIN";
    return obterDadosDashboard(ctx, user.id, isAdmin);
  }),

  getDespesasMensais: protectedProcedure
    .input(getDespesasMensaisSchema)
    .query(async ({ ctx, input: _input }) => {
      // pegar os ultimos X meses do ano especificado
      const { ano } = _input;

      // buscar despesas de recursos humanos (alocações)
      const despesasRH = await ctx.db.alocacaoRecurso.groupBy({
        by: ["mes", "ano", "userId"],
        where: {
          ano,
        },
        _sum: {
          ocupacao: true,
        },
      });

      // Buscar os salários dos utilizadores
      const userIds = [...new Set(despesasRH.map((d) => d.userId))];
      const usuarios = await ctx.db.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        select: {
          id: true,
          salario: true,
        },
      });

      // Map de userId para salário
      const salarioPorUser = new Map();
      usuarios.forEach((user) => {
        salarioPorUser.set(user.id, user.salario || 2000); // valor padrão se não tiver salário definido
      });

      // buscar despesas de materiais
      const despesasMateriais = await ctx.db.material.groupBy({
        by: ["ano_utilizacao"],
        where: {
          ano_utilizacao: ano,
        },
        _sum: {
          preco: true,
        },
      });

      // Preparar os dados mensais de RH
      const mesesMap = new Map<
        number,
        {
          mes: number;
          ano: number;
          valorRH: number;
        }
      >();

      // Inicializar todos os meses com zero
      for (let mes = 1; mes <= 12; mes++) {
        mesesMap.set(mes, {
          mes,
          ano,
          valorRH: 0,
        });
      }

      // Somar as alocações de recursos multiplicadas pelo salário
      despesasRH.forEach((item) => {
        const { mes, userId } = item;
        const ocupacao = Number(item._sum.ocupacao || 0);
        const salario = salarioPorUser.get(userId) || 2000;
        const custo = ocupacao * salario;

        const dadosMes = mesesMap.get(mes)!;
        dadosMes.valorRH += custo;
      });

      // Converter para array e calcular totais
      const despesasMensais = Array.from(mesesMap.values())
        .sort((a, b) => a.mes - b.mes)
        .map((item) => ({
          mes: item.mes,
          ano: item.ano,
          valorRH: Math.round(item.valorRH),
        }));

      // Calcular totais gerais
      const valorTotalRH = despesasMensais.reduce((acc, curr) => acc + curr.valorRH, 0);
      const valorTotalMateriais = Math.round(Number(despesasMateriais[0]?._sum?.preco || 0));
      const valorTotal = valorTotalRH + valorTotalMateriais;

      return {
        despesasMensais,
        totais: {
          valorTotalMateriais,
          valorTotalRH,
          valorTotal,
        },
      };
    }),

  // Novo endpoint para buscar anos disponíveis para filtro
  getOpcoesFiltroAno: protectedProcedure
    .input(getOpcoesFiltroAnoSchema)
    .query(async ({ ctx, input: _input }) => {
      const anoAtual = new Date().getFullYear();

      // Anos a partir das alocações de recursos
      const anosAlocacoes = await ctx.db.alocacaoRecurso.groupBy({
        by: ["ano"],
        orderBy: {
          ano: "desc",
        },
      });

      // Anos a partir dos materiais
      const anosMateriais = await ctx.db.material.groupBy({
        by: ["ano_utilizacao"],
        orderBy: {
          ano_utilizacao: "desc",
        },
      });

      // Anos a partir dos projetos
      const anosProjetoInicio = await ctx.db.projeto.groupBy({
        by: ["inicio"],
        where: {
          inicio: { not: null },
        },
      });

      const anosProjetoFim = await ctx.db.projeto.groupBy({
        by: ["fim"],
        where: {
          fim: { not: null },
        },
      });

      // Combinar todos os anos em um único conjunto
      const todosAnos = new Set<number>();

      // Sempre incluir o ano atual e o ano anterior
      todosAnos.add(anoAtual);
      todosAnos.add(anoAtual - 1);

      // Adicionar anos das diferentes fontes
      anosAlocacoes.forEach((item) => todosAnos.add(item.ano));
      anosMateriais.forEach((item) => todosAnos.add(item.ano_utilizacao));

      anosProjetoInicio.forEach((item) => {
        if (item.inicio) {
          const ano = new Date(item.inicio).getFullYear();
          todosAnos.add(ano);
        }
      });

      anosProjetoFim.forEach((item) => {
        if (item.fim) {
          const ano = new Date(item.fim).getFullYear();
          todosAnos.add(ano);
        }
      });

      // Converter para array e ordenar descrescente
      const anos = Array.from(todosAnos).sort((a, b) => b - a);

      return {
        anos,
        anoAtual,
      };
    }),

  // Obter próximos eventos (tarefas e entregáveis) de um utilizador
  proximosEventos: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().int().min(1).max(50).optional().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { userId, limit } = input;
        const hoje = new Date();
        
        // 1. Fetch user role
        const dbUser = await ctx.db.user.findUnique({
          where: { id: userId },
          select: { permissao: true },
        });
        const userRole = dbUser?.permissao;

        // 2. Determine relevant workpackage IDs based on role
        let relevantWorkpackageIds: string[] | undefined = undefined;

        if (userRole !== "ADMIN" && userRole !== "GESTOR") { // For UTILIZADOR or other non-privileged roles
          const workpackagesAlocados = await ctx.db.alocacaoRecurso.findMany({
            where: {
              userId,
              workpackage: {
                projeto: {
                  estado: {
                    in: ['APROVADO', 'EM_DESENVOLVIMENTO']
                  }
                }
              }
            },
            select: { workpackageId: true },
            distinct: ['workpackageId'],
          });
          relevantWorkpackageIds = workpackagesAlocados.map(wa => wa.workpackageId);

          if (relevantWorkpackageIds.length === 0) {
            return {
              tarefas: [],
              entregaveis: [],
              eventos: []
            };
          }
        }
        // For ADMIN/GESTOR, relevantWorkpackageIds remains undefined, 
        // so task query fetches from all workpackages in active projects.
        
        // 3. Obter tarefas:
        // - For ADMIN/GESTOR: all non-completed tasks from active projects.
        // - For UTILIZADOR: non-completed tasks from their allocated workpackages in active projects.
        const tarefas = await ctx.db.tarefa.findMany({
          where: {
            estado: false, // Tarefas não concluídas
            workpackage: {
              projeto: {
                estado: {
                  in: ['APROVADO', 'EM_DESENVOLVIMENTO']
                }
              },
              // Apply workpackageId filter only if relevantWorkpackageIds is populated (i.e., for UTILIZADOR)
              ...(relevantWorkpackageIds ? { id: { in: relevantWorkpackageIds } } : {})
            }
          },
          select: {
            id: true,
            nome: true,
            descricao: true,
            inicio: true,
            fim: true,
            estado: true,
            workpackageId: true,
            workpackage: {
              select: {
                id: true,
                nome: true,
                projetoId: true,
                projeto: {
                  select: {
                    id: true,
                    nome: true,
                    estado: true,
                  }
                }
              }
            }
          },
          orderBy: {
            fim: 'asc'
          },
          take: limit, 
        });
        
        // 4. Obter entregáveis dessas tarefas
        const tarefasIds = tarefas.map(t => t.id);
        
        const entregaveis = await ctx.db.entregavel.findMany({
          where: {
            tarefaId: {
              in: tarefasIds
            },
            OR: [
              { 
                data: {
                  gte: hoje
                }
              },
              {
                data: null
              }
            ],
            tarefa: { // Ensures entregaveis are from tasks within active projects
              workpackage: {
                projeto: {
                  estado: {
                    in: ['APROVADO', 'EM_DESENVOLVIMENTO']
                  }
                }
              }
            }
          },
          select: {
            id: true,
            nome: true,
            descricao: true,
            data: true,
            tarefaId: true,
            tarefa: {
              select: {
                id: true,
                nome: true,
                workpackageId: true,
                workpackage: {
                  select: {
                    id: true,
                    nome: true,
                    projetoId: true,
                    projeto: {
                      select: {
                        id: true,
                        nome: true,
                        estado: true,
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
          take: limit,
        });
        
        // 5. Calcular dias restantes e formatar respostas
        const tarefasFormatadas = tarefas.map(tarefa => {
            const diasRestantes = tarefa.fim
              ? Math.ceil((new Date(tarefa.fim).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
              : null;
               
            return {
              id: tarefa.id,
              tipo: 'tarefa',
              nome: tarefa.nome,
              descricao: tarefa.descricao,
              dataLimite: tarefa.fim,
              dataCriacao: tarefa.inicio, // Assuming 'inicio' is creation date for tasks
              diasRestantes,
              workpackage: {
                id: tarefa.workpackage.id,
                nome: tarefa.workpackage.nome,
              },
              projeto: {
                id: tarefa.workpackage.projeto.id,
                nome: tarefa.workpackage.projeto.nome,
              }
            };
          });
        
        const entregaveisFormatados = entregaveis.map(entregavel => {
            const diasRestantes = entregavel.data
              ? Math.ceil((new Date(entregavel.data).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
              : null;
               
            return {
              id: entregavel.id,
              tipo: 'entregavel',
              nome: entregavel.nome,
              descricao: entregavel.descricao,
              dataLimite: entregavel.data,
              diasRestantes,
              tarefaId: entregavel.tarefaId,
              tarefaNome: entregavel.tarefa.nome,
              workpackage: {
                id: entregavel.tarefa.workpackage.id,
                nome: entregavel.tarefa.workpackage.nome,
              },
              projeto: {
                id: entregavel.tarefa.workpackage.projeto.id,
                nome: entregavel.tarefa.workpackage.projeto.nome,
              }
            };
          });
        
        // 6. Combinar resultados ordenados por dias restantes (eventos mais próximos primeiro)
        const todosEventos = [...tarefasFormatadas, ...entregaveisFormatados].sort((a, b) => {
          if (a.diasRestantes === null && b.diasRestantes === null) return 0;
          if (a.diasRestantes === null) return 1; // Items without due date go last
          if (b.diasRestantes === null) return -1; // Items without due date go last
          
          return a.diasRestantes - b.diasRestantes; // Sort by remaining days (ascending)
        });
        
        return {
          eventos: todosEventos.slice(0, limit),
          tarefas: tarefasFormatadas, // Optionally return full lists if needed elsewhere
          entregaveis: entregaveisFormatados // Optionally return full lists
        };
      } catch (error) {
        console.error("Erro ao obter próximos eventos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter próximos eventos",
          cause: error,
        });
      }
    }),
});
