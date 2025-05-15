import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Permissao, ProjetoEstado } from "@prisma/client";
import { Decimal } from "decimal.js";

// Tipo para verificar permissões de utilizador
type UserWithPermissao = {
  permissao: Permissao;
  id: string;
} & Record<string, any>;

export const gestorRouter = createTRPCRouter({
  // Obter médias de alocações dos recursos humanos para o mês/ano atual
  getMediasAlocacoes: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Verificar se o utilizador é gestor ou admin
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || (user.permissao !== Permissao.GESTOR && user.permissao !== Permissao.ADMIN)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas gestores e administradores podem aceder a estas estatísticas",
          });
        }

        // Obter mês e ano atual
        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1; // JavaScript usa meses 0-11
        const anoAtual = hoje.getFullYear();

        // Buscar todas as alocações do mês/ano atual
        const alocacoes = await ctx.db.alocacaoRecurso.groupBy({
          by: ['userId'],
          where: {
            mes: mesAtual,
            ano: anoAtual,
          },
          _sum: {
            ocupacao: true,
          },
          having: {
            ocupacao: {
              _sum: {
                gt: 0 // Apenas utilizadores com alocação > 0
              }
            }
          }
        });

        // Buscar informações dos utilizadores com alocações
        const userIds = alocacoes.map(a => a.userId);
        const users = await ctx.db.user.findMany({
          where: {
            id: {
              in: userIds
            }
          },
          select: {
            id: true,
            name: true,
            email: true,
          }
        });

        // Mapear utilizadores para facilitar o acesso
        const usersMap = new Map(users.map(u => [u.id, u]));

        // Formatar resposta apenas para utilizadores com alocação > 0
        const mediasAlocacoes = alocacoes
          .map(alocacao => {
            const user = usersMap.get(alocacao.userId);
            if (!user) return null;

            return {
              userId: user.id,
              nome: user.name,
              email: user.email,
              ocupacaoMedia: new Decimal(alocacao._sum.ocupacao || 0).toNumber()
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .sort((a, b) => b.ocupacaoMedia - a.ocupacaoMedia); // Ordenar por ocupação decrescente

        return mediasAlocacoes;

      } catch (error) {
        console.error("Erro ao obter médias de alocações:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter médias de alocações",
          cause: error,
        });
      }
    }),

  // Obter próximos materiais ordenados por data (mês/ano)
  getProximosMateriais: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Verificar se o utilizador é gestor ou admin
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || (user.permissao !== Permissao.GESTOR && user.permissao !== Permissao.ADMIN)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas gestores e administradores podem aceder a estas estatísticas",
          });
        }

        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();

        const materiais = await ctx.db.material.findMany({
          where: {
            OR: [
              {
                ano_utilizacao: anoAtual,
                mes: {
                  gte: mesAtual
                }
              },
              {
                ano_utilizacao: {
                  gt: anoAtual
                }
              }
            ],
            workpackage: {
              projeto: {
                estado: {
                  in: [ProjetoEstado.APROVADO, ProjetoEstado.EM_DESENVOLVIMENTO]
                }
              }
            }
          },
          select: {
            id: true,
            nome: true,
            preco: true,
            quantidade: true,
            rubrica: true,
            estado: true,
            ano_utilizacao: true,
            mes: true,
            workpackage: {
              select: {
                id: true,
                nome: true,
                projeto: {
                  select: {
                    id: true,
                    nome: true,
                    estado: true
                  }
                }
              }
            }
          },
          orderBy: [
            { ano_utilizacao: 'asc' },
            { mes: 'asc' }
          ],
          take: 20
        });

        return materiais.map(material => ({
          id: material.id,
          nome: material.nome,
          preco: material.preco.toNumber(),
          quantidade: material.quantidade,
          custoTotal: material.preco.times(new Decimal(material.quantidade)).toNumber(),
          rubrica: material.rubrica,
          estado: material.estado,
          anoUtilizacao: material.ano_utilizacao,
          mes: material.mes,
          workpackage: {
            id: material.workpackage?.id,
            nome: material.workpackage?.nome,
            projeto: {
              id: material.workpackage?.projeto.id,
              nome: material.workpackage?.projeto.nome,
              estado: material.workpackage?.projeto.estado
            }
          }
        }));

      } catch (error) {
        console.error("Erro ao obter próximos materiais:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter próximos materiais",
          cause: error,
        });
      }
    }),

  // Obter estatísticas de projetos ativos
  getEstatisticasProjetos: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Verificar se o utilizador é gestor ou admin
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || (user.permissao !== Permissao.GESTOR && user.permissao !== Permissao.ADMIN)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas gestores e administradores podem aceder a estas estatísticas",
          });
        }

        // Buscar projetos ativos e suas métricas
        const projetos = await ctx.db.projeto.findMany({
          where: {
            estado: {
              in: [ProjetoEstado.APROVADO, ProjetoEstado.EM_DESENVOLVIMENTO]
            }
          },
          select: {
            id: true,
            nome: true,
            estado: true,
            inicio: true,
            fim: true,
            workpackages: {
              select: {
                id: true,
                estado: true,
                tarefas: {
                  select: {
                    id: true,
                    estado: true,
                    entregaveis: {
                      select: {
                        id: true,
                        estado: true,
                        data: true
                      }
                    }
                  }
                }
              }
            }
          }
        });

        const hoje = new Date();

        return projetos.map(projeto => {
          // Calcular métricas de workpackages
          const totalWorkpackages = projeto.workpackages.length;
          const workpackagesConcluidos = projeto.workpackages.filter(wp => wp.estado).length;

          // Calcular métricas de tarefas
          const totalTarefas = projeto.workpackages.reduce((acc, wp) => acc + wp.tarefas.length, 0);
          const tarefasConcluidas = projeto.workpackages.reduce(
            (acc, wp) => acc + wp.tarefas.filter(t => t.estado).length, 
            0
          );

          // Calcular métricas de entregáveis
          const entregaveisAtrasados = projeto.workpackages.reduce(
            (acc, wp) => acc + wp.tarefas.reduce(
              (tacc, t) => tacc + t.entregaveis.filter(
                e => !e.estado && e.data && new Date(e.data) < hoje
              ).length,
              0
            ),
            0
          );

          return {
            id: projeto.id,
            nome: projeto.nome,
            estado: projeto.estado,
            inicio: projeto.inicio,
            fim: projeto.fim,
            metricas: {
              totalWorkpackages,
              workpackagesConcluidos,
              percentualWorkpackages: totalWorkpackages > 0 
                ? Math.round((workpackagesConcluidos / totalWorkpackages) * 100) 
                : 0,
              totalTarefas,
              tarefasConcluidas,
              percentualTarefas: totalTarefas > 0 
                ? Math.round((tarefasConcluidas / totalTarefas) * 100) 
                : 0,
              entregaveisAtrasados
            }
          };
        });

      } catch (error) {
        console.error("Erro ao obter estatísticas de projetos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter estatísticas de projetos",
          cause: error,
        });
      }
    }),

  // Obter estatísticas gerais para o dashboard do gestor
  getGestorStats: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Verificar se o utilizador é gestor ou admin
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || (user.permissao !== Permissao.GESTOR && user.permissao !== Permissao.ADMIN)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas gestores e administradores podem aceder a estas estatísticas",
          });
        }

        // Obter mês e ano atual
        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();

        // 1. Calcular ocupação média da equipa para o mês atual
        const alocacoes = await ctx.db.alocacaoRecurso.groupBy({
          by: ['userId'],
          where: {
            mes: mesAtual,
            ano: anoAtual,
          },
          _sum: {
            ocupacao: true,
          }
        });

        const somaOcupacoes = alocacoes.reduce(
          (acc, curr) => acc + (curr._sum.ocupacao?.toNumber() || 0),
          0
        );

        const ocupacaoMediaEquipe = alocacoes.length > 0
          ? somaOcupacoes / alocacoes.length
          : 0;

        // 2. Buscar projetos com entregáveis em atraso
        const projetosComEntregaveisAtrasados = await ctx.db.projeto.count({
          where: {
            estado: {
              in: [ProjetoEstado.APROVADO, ProjetoEstado.EM_DESENVOLVIMENTO]
            },
            workpackages: {
              some: {
                tarefas: {
                  some: {
                    entregaveis: {
                      some: {
                        data: {
                          lt: hoje
                        },
                        estado: false
                      }
                    }
                  }
                }
              }
            }
          }
        });

        // 3. Buscar notificações não lidas
        const notificacoesNaoLidas = await ctx.db.notificacao.count({
          where: {
            destinatarioId: user.id,
            estado: "NAO_LIDA"
          }
        });

        return {
          ocupacaoMediaEquipe: Math.round(ocupacaoMediaEquipe * 100) / 100, // Arredondar para 2 casas decimais
          projetosComEntregaveisAtrasados,
          notificacoesNaoLidas,
          mesReferencia: mesAtual,
          anoReferencia: anoAtual
        };

      } catch (error) {
        console.error("Erro ao obter estatísticas do gestor:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter estatísticas",
          cause: error,
        });
      }
    }),
});
