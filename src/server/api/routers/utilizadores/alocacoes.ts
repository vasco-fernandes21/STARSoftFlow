import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Decimal } from "decimal.js";
import { handlePrismaError } from "../../utils";
import { ProjetoEstado } from "@prisma/client";

// Schema para input de alocação
const workpackageUserSchema = z.object({
  workpackageId: z.string(),
  userId: z.string(),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2000),
  ocupacao: z.number().min(0).max(1),
});

export const alocacoesUtilizadorRouter = createTRPCRouter({
  // Adicionar 
  create: protectedProcedure.input(workpackageUserSchema).mutation(async ({ ctx, input }) => {
    try {
      const { workpackageId, userId, mes, ano, ocupacao } = input;
      const workpackage = await ctx.db.workpackage.findUnique({ where: { id: workpackageId } });
      if (!workpackage) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workpackage não encontrado" });
      }
      const user = await ctx.db.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado" });
      }
      const alocacao = await ctx.db.alocacaoRecurso.upsert({
        where: {
          workpackageId_userId_mes_ano: {
            workpackageId,
            userId,
            mes,
            ano,
          },
        },
        update: { ocupacao },
        create: { workpackageId, userId, mes, ano, ocupacao },
      });
      return alocacao;
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao adicionar ou atualizar alocação", cause: error });
    }
  }),

  // Atualizar alocação de recurso existente
  update: protectedProcedure.input(workpackageUserSchema).mutation(async ({ ctx, input }) => {
    try {
      const { workpackageId, userId, mes, ano, ocupacao } = input;
      const alocacaoExistente = await ctx.db.alocacaoRecurso.findUnique({
        where: {
          workpackageId_userId_mes_ano: {
            workpackageId,
            userId,
            mes,
            ano,
          },
        },
      });
      if (!alocacaoExistente) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Alocação não encontrada" });
      }
      const alocacao = await ctx.db.alocacaoRecurso.update({
        where: {
          workpackageId_userId_mes_ano: {
            workpackageId,
            userId,
            mes,
            ano,
          },
        },
        data: { ocupacao },
      });
      return alocacao;
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao atualizar alocação", cause: error });
    }
  }),

  // Atualizar alocações em lote
  updateMany: protectedProcedure
    .input(z.array(z.object({
      workpackageId: z.string(),
      userId: z.string(),
      mes: z.number().int().min(1).max(12),
      ano: z.number().int().min(2000),
      ocupacao: z.number().min(0).max(1),
    })))
    .mutation(async ({ ctx, input }) => {
      try {
        const results = await Promise.all(
          input.map(async (alocacao) => {
            const workpackage = await ctx.db.workpackage.findUnique({ where: { id: alocacao.workpackageId }, include: { projeto: true } });
            if (!workpackage) {
              throw new TRPCError({ code: "NOT_FOUND", message: `Workpackage ${alocacao.workpackageId} não encontrado` });
            }
            const user = await ctx.db.user.findUnique({ where: { id: alocacao.userId } });
            if (!user) {
              throw new TRPCError({ code: "NOT_FOUND", message: `Utilizador ${alocacao.userId} não encontrado` });
            }
            const outrasAlocacoes = await ctx.db.alocacaoRecurso.findMany({
              where: {
                userId: alocacao.userId,
                mes: alocacao.mes,
                ano: alocacao.ano,
                NOT: { workpackageId: alocacao.workpackageId },
              },
              select: { ocupacao: true },
            });
            const somaOutrasAlocacoes = outrasAlocacoes.reduce((sum, aloc) => sum.add(aloc.ocupacao), new Decimal(0));
            const novaOcupacaoTotal = somaOutrasAlocacoes.add(new Decimal(alocacao.ocupacao));
            if (novaOcupacaoTotal.greaterThan(1)) {
              throw new TRPCError({ code: "BAD_REQUEST", message: `A ocupação total para ${user.name || alocacao.userId} em ${alocacao.mes}/${alocacao.ano} excederia 100% (${novaOcupacaoTotal.times(100).toFixed(0)}%)` });
            }
            return ctx.db.alocacaoRecurso.upsert({
              where: {
                workpackageId_userId_mes_ano: {
                  workpackageId: alocacao.workpackageId,
                  userId: alocacao.userId,
                  mes: alocacao.mes,
                  ano: alocacao.ano,
                },
              },
              update: { ocupacao: new Decimal(alocacao.ocupacao) },
              create: {
                workpackageId: alocacao.workpackageId,
                userId: alocacao.userId,
                mes: alocacao.mes,
                ano: alocacao.ano,
                ocupacao: new Decimal(alocacao.ocupacao),
              },
            });
          })
        );
        return results;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return handlePrismaError(error);
      }
    }),

  // Remover alocação de recurso
  delete: protectedProcedure.input(
    z.object({
      workpackageId: z.string(),
      userId: z.string(),
      mes: z.number(),
      ano: z.number(),
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      const { workpackageId, userId, mes, ano } = input;
      const alocacao = await ctx.db.alocacaoRecurso.findUnique({
        where: {
          workpackageId_userId_mes_ano: {
            workpackageId,
            userId,
            mes,
            ano,
          },
        },
      });
      if (!alocacao) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Alocação não encontrada" });
      }
      await ctx.db.alocacaoRecurso.delete({
        where: {
          workpackageId_userId_mes_ano: {
            workpackageId,
            userId,
            mes,
            ano,
          },
        },
      });
      return { success: true };
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao remover alocação", cause: error });
    }
  }),

  findAll: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        ano: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { userId, ano } = input;
        // Procurar todas as alocações do utilizador para o ano especificado
        const alocacoes = await ctx.db.alocacaoRecurso.findMany({
          where: { userId, ano },
          select: {
            mes: true,
            ocupacao: true,
            workpackage: {
              select: {
                projeto: {
                  select: { estado: true },
                },
              },
            },
          },
        });
        // Para cada mês, calcular a soma das ocupações por estado do projeto
        const meses = Array.from({ length: 12 }, (_, i) => i + 1);
        const ocupacaoPorMes = meses.map((mes) => {
          const alocacoesMes = alocacoes.filter((a) => a.mes === mes);
          // Soma das ocupações em projetos aprovados ou em desenvolvimento
          const ocupacaoAprovada = alocacoesMes
            .filter(
              (a) =>
                a.workpackage.projeto.estado === "APROVADO" ||
                a.workpackage.projeto.estado === "EM_DESENVOLVIMENTO"
            )
            .reduce((sum, a) => sum + Number(a.ocupacao), 0);
          // Soma das ocupações em projetos pendentes
          const ocupacaoPendente = alocacoesMes
            .filter((a) => a.workpackage.projeto.estado === "PENDENTE")
            .reduce((sum, a) => sum + Number(a.ocupacao), 0);
          return { mes, ocupacaoAprovada, ocupacaoPendente };
        });
        // Retorna um array com a ocupação por mês, separando aprovada e pendente
        return ocupacaoPorMes;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  findCompleto: protectedProcedure
    .input(z.object({
      userId: z.string().optional(),
      username: z.string().optional(),
      ano: z.number().optional(),
    }).superRefine((data, ctx) => {
      if (!data.userId && !data.username) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Either userId or username must be provided",
          path: ["userId"],
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Either userId or username must be provided",
          path: ["username"],
        });
      }
      if (data.userId && data.username) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Provide either userId or username, not both",
          path: ["userId"],
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Provide either userId or username, not both",
          path: ["username"],
        });
      }
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Estados de projeto considerados "reais"
        const validProjectStates = [
          ProjetoEstado.APROVADO,
          ProjetoEstado.EM_DESENVOLVIMENTO,
          ProjetoEstado.CONCLUIDO,
        ];
        // Determina o ID do utilizador a consultar
        let actualUserId: string;
        if (input.username) {
          // Busca o utilizador pelo username
          const user = await ctx.db.user.findUnique({
            where: { username: input.username },
            select: { id: true },
          });
          if (!user) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `User with username '${input.username}' not found.`,
            });
          }
          actualUserId = user.id;
        } else if (input.userId) {
          actualUserId = input.userId;
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User identifier (userId or username) is missing.",
          });
        }
        // Sets para coletar anos e projetos únicos
        const anosSet = new Set<number>();
        const projetoIdsSet = new Set<string>();
        // 1. Procurar alocações reais (projetos aprovados, em desenvolvimento ou concluídos)
        const alocacoesReaisDb = await ctx.db.alocacaoRecurso.findMany({
          where: {
            userId: actualUserId,
            ...(input.ano ? { ano: input.ano } : {}),
            workpackage: {
              projeto: {
                estado: { in: validProjectStates },
              },
            },
          },
          select: {
            mes: true,
            ano: true,
            ocupacao: true,
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
                  },
                },
              },
            },
          },
        });
        // Processa as alocações reais e coleta anos/projetos
        const realData = alocacoesReaisDb.map(alocacao => {
          anosSet.add(alocacao.ano);
          projetoIdsSet.add(alocacao.workpackage.projeto.id);
          return {
            workpackageId: alocacao.workpackage.id,
            workpackageNome: alocacao.workpackage.nome,
            projetoId: alocacao.workpackage.projeto.id,
            projetoNome: alocacao.workpackage.projeto.nome,
            projetoEstado: alocacao.workpackage.projeto.estado,
            mes: alocacao.mes,
            ano: alocacao.ano,
            ocupacao: Number(alocacao.ocupacao.toFixed(3)),
          };
        });
        // 2. Procurar alocações pendentes (projetos em estado PENDENTE)
        const alocacoesPendentesDb = await ctx.db.alocacaoRecurso.findMany({
          where: {
            userId: actualUserId,
            ...(input.ano ? { ano: input.ano } : {}),
            workpackage: {
              projeto: {
                estado: ProjetoEstado.PENDENTE,
              },
            },
          },
          select: {
            mes: true,
            ano: true,
            ocupacao: true,
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
                  },
                },
              },
            },
          },
        });
        // Processa as alocações pendentes
        const pendenteData = alocacoesPendentesDb.map(alocacao => {
          anosSet.add(alocacao.ano);
          projetoIdsSet.add(alocacao.workpackage.projeto.id);
          return {
            workpackageId: alocacao.workpackage.id,
            workpackageNome: alocacao.workpackage.nome,
            projetoId: alocacao.workpackage.projeto.id,
            projetoNome: alocacao.workpackage.projeto.nome,
            projetoEstado: alocacao.workpackage.projeto.estado,
            mes: alocacao.mes,
            ano: alocacao.ano,
            ocupacao: Number(alocacao.ocupacao.toFixed(3)),
          };
        });
        // 3. Procurar snapshots de projetos aprovados (alocações submetidas)
        const projetosComSnapshot = await ctx.db.projeto.findMany({
          where: { aprovado: { not: undefined } },
          select: { id: true, nome: true, estado: true, aprovado: true },
        });
        // Processa as alocações submetidas a partir dos snapshots
        const submetidoDataMap = new Map();
        projetosComSnapshot.forEach(projeto => {
          const aprovado = projeto.aprovado as any;
          // Garante que aprovado é um objeto com workpackages
          if (!aprovado || typeof aprovado !== "object" || !('workpackages' in aprovado) || !Array.isArray(aprovado.workpackages)) return;
          try {
            aprovado.workpackages.forEach((wp: any) => {
              if (!wp.recursos || !Array.isArray(wp.recursos)) return;
              wp.recursos
                .filter((r: any) => r.userId === actualUserId && (!input.ano || r.ano === input.ano))
                .forEach((recurso: any) => {
                  const snapshotKey = `${projeto.id}-${wp.id}-${recurso.mes}-${recurso.ano}`;
                  if (submetidoDataMap.has(snapshotKey)) {
                    const existing = submetidoDataMap.get(snapshotKey);
                    existing.ocupacao = Number((existing.ocupacao + Number(recurso.ocupacao)).toFixed(3));
                  } else {
                    submetidoDataMap.set(snapshotKey, {
                      workpackageId: wp.id,
                      workpackageNome: wp.nome,
                      projetoId: projeto.id,
                      projetoNome: projeto.nome,
                      projetoEstado: projeto.estado,
                      mes: recurso.mes,
                      ano: recurso.ano,
                      ocupacao: Number(Number(recurso.ocupacao).toFixed(3)),
                    });
                  }
                  anosSet.add(recurso.ano);
                });
            });
          } catch (error) {
            // erro ao processar snapshot
          }
        });
        const submetidoData = Array.from(submetidoDataMap.values());
        submetidoData.forEach((item: any) => projetoIdsSet.add(item.projetoId));
        // Ordena os anos de forma decrescente
        const anosAlocados = Array.from(anosSet).sort((a, b) => b - a);
        // Lista de IDs de projetos únicos
        const projetosIds = Array.from(projetoIdsSet);
        // Retorna as alocações reais, submetidas, pendentes, anos e projetos
        return {
          real: realData,
          submetido: submetidoData,
          pendente: pendenteData,
          anos: anosAlocados,
          projetosIds: projetosIds,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching allocations",
          cause: error,
        });
      }
    }),
});