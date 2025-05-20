import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { handlePrismaError } from "@/server/api/utils";
import { ProjetoEstado } from "@prisma/client"; // Adicionado para ProjetoEstado

// Schema para input de alocação
const workpackageUserSchema = z.object({
  workpackageId: z.string().nullable(), 
  userId: z.string(),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2000),
  ocupacao: z.number().min(0).max(1)
});

export const alocacoesUtilizadorRouter = createTRPCRouter({
  // Adicionar 
  create: protectedProcedure.input(workpackageUserSchema).mutation(async ({ ctx, input }) => {
    try {
      const { workpackageId, userId, mes, ano, ocupacao } = input;
      
      const isFerias = workpackageId === null || workpackageId === undefined;
      
      if (!isFerias && workpackageId) { // Adicionado workpackageId para garantir que não é null
        const wpExists = await ctx.db.workpackage.findUnique({ where: { id: workpackageId } });
        if (!wpExists) {
          throw new TRPCError({ code: "NOT_FOUND", message: `Workpackage ${workpackageId} não encontrado` });
        }
      }
      
      const user = await ctx.db.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: `Utilizador ${userId} não encontrado` });
      }
      
      let result;
      if (workpackageId === null) {
        const existingAlocacao = await ctx.db.alocacaoRecurso.findFirst({
          where: { userId, mes, ano, workpackageId: null },
        });
        if (existingAlocacao) {
          result = await ctx.db.alocacaoRecurso.update({
            where: { id: existingAlocacao.id },
            data: { ocupacao },
          });
        } else {
          result = await ctx.db.alocacaoRecurso.create({
            data: { workpackageId, userId, mes, ano, ocupacao },
          });
        }
      } else {
        result = await ctx.db.alocacaoRecurso.upsert({
          where: {
            workpackageId_userId_mes_ano: {
              workpackageId: workpackageId!, // Afirmar que não é null aqui
              userId,
              mes,
              ano,
            },
          },
          update: { ocupacao },
          create: { workpackageId, userId, mes, ano, ocupacao },
        });
      }
      return result;
    } catch (error) {
      return handlePrismaError(error);
    }
  }),

  // Atualizar alocação de recurso existente
  update: protectedProcedure.input(workpackageUserSchema).mutation(async ({ ctx, input }) => {
    try {
      const { workpackageId, userId, mes, ano, ocupacao } = input;
      
      let alocacaoAtualizada;
      if (workpackageId === null) {
        const alocacaoExistente = await ctx.db.alocacaoRecurso.findFirst({
          where: { userId, mes, ano, workpackageId: null },
        });
        if (!alocacaoExistente) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Alocação (férias/ausência) não encontrada para atualização" });
        }
        alocacaoAtualizada = await ctx.db.alocacaoRecurso.update({
          where: { id: alocacaoExistente.id },
          data: { ocupacao },
        });
      } else {
        const alocacaoExistente = await ctx.db.alocacaoRecurso.findUnique({
          where: {
            workpackageId_userId_mes_ano: {
              workpackageId: workpackageId!, // Afirmar que não é null
              userId,
              mes,
              ano,
            },
          },
        });

        if (!alocacaoExistente) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Alocação não encontrada para atualização" });
        }
        alocacaoAtualizada = await ctx.db.alocacaoRecurso.update({
          where: { id: alocacaoExistente.id }, // Usar o ID primário para update
          data: { ocupacao },
        });
      }
      return alocacaoAtualizada;
    } catch (error) {
      return handlePrismaError(error);
    }
  }),

  // Atualizar alocações em lote
  updateMany: protectedProcedure
    .input(z.array(z.object({
      workpackageId: z.string().nullable(),
      userId: z.string(),
      mes: z.number().int().min(1).max(12),
      ano: z.number().int().min(2000),
      ocupacao: z.number().min(0).max(1),
    })))
    .mutation(async ({ ctx, input }) => {
      try {
        const results = await Promise.all(
          input.map(async (alocacao) => {
            const user = await ctx.db.user.findUnique({ where: { id: alocacao.userId } });
            if (!user) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: `Utilizador ${alocacao.userId} não encontrado`,
              });
            }

            let result;
            // Tratar string vazia como null para workpackageId
            const effectiveWorkpackageId = alocacao.workpackageId === "" ? null : alocacao.workpackageId;

            if (effectiveWorkpackageId === null) {
              const existingAlocacao = await ctx.db.alocacaoRecurso.findFirst({
                where: {
                  userId: alocacao.userId,
                  mes: alocacao.mes,
                  ano: alocacao.ano,
                  workpackageId: null,
                },
              });

              if (existingAlocacao) {
                result = await ctx.db.alocacaoRecurso.update({
                  where: { id: existingAlocacao.id },
                  data: { ocupacao: alocacao.ocupacao },
                });
              } else {
                result = await ctx.db.alocacaoRecurso.create({
                  data: {
                    userId: alocacao.userId,
                    mes: alocacao.mes,
                    ano: alocacao.ano,
                    workpackageId: null,
                    ocupacao: alocacao.ocupacao,
                  },
                });
              }
            } else {
              // Se chegou aqui, effectiveWorkpackageId é uma string não vazia e não nula.
              // Verificar se o workpackage existe antes do upsert
              const wpExists = await ctx.db.workpackage.findUnique({ where: { id: effectiveWorkpackageId } });
              if (!wpExists) {
                throw new TRPCError({ code: "NOT_FOUND", message: `Workpackage ${effectiveWorkpackageId} não encontrado para a alocação.` });
              }

              result = await ctx.db.alocacaoRecurso.upsert({
                where: {
                  workpackageId_userId_mes_ano: {
                    workpackageId: effectiveWorkpackageId, // Agora é garantido que não é null nem string vazia
                    userId: alocacao.userId,
                    mes: alocacao.mes,
                    ano: alocacao.ano,
                  },
                },
                update: { ocupacao: alocacao.ocupacao },
                create: {
                  workpackageId: effectiveWorkpackageId,
                  userId: alocacao.userId,
                  mes: alocacao.mes,
                  ano: alocacao.ano,
                  ocupacao: alocacao.ocupacao,
                },
              });
            }
            return result;
          })
        );
        return results;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        return handlePrismaError(error);
      }
    }),

  // Remover alocação de recurso
  delete: protectedProcedure.input(
    z.object({
      workpackageId: z.string().nullable(),
      userId: z.string(),
      mes: z.number(),
      ano: z.number(),
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      const { workpackageId, userId, mes, ano } = input;
      
      let deletedAlocacao;
      if (workpackageId === null) {
        const alocacaoExistente = await ctx.db.alocacaoRecurso.findFirst({
          where: { userId, mes, ano, workpackageId: null },
        });
        if (!alocacaoExistente) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Alocação (férias/ausência) não encontrada para remoção" });
        }
        deletedAlocacao = await ctx.db.alocacaoRecurso.delete({
          where: { id: alocacaoExistente.id },
        });
      } else {
        const alocacaoExistente = await ctx.db.alocacaoRecurso.findUnique({
          where: {
            workpackageId_userId_mes_ano: {
              workpackageId: workpackageId!, // Afirmar que não é null
              userId,
              mes,
              ano,
            },
          },
        });
        if (!alocacaoExistente) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Alocação não encontrada para remoção" });
        }
        deletedAlocacao = await ctx.db.alocacaoRecurso.delete({
          where: { id: alocacaoExistente.id }, // Usar o ID primário para delete
        });
      }
      
      if (!deletedAlocacao) {
         throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao remover alocação"});
      }
      return { success: true };
    } catch (error) {
      return handlePrismaError(error);
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
                a.workpackage && a.workpackage.projeto &&
                (a.workpackage.projeto.estado === "APROVADO" ||
                 a.workpackage.projeto.estado === "EM_DESENVOLVIMENTO")
            )
            .reduce((sum, a) => sum + Number(a.ocupacao), 0);
          // Soma das ocupações em projetos pendentes
          const ocupacaoPendente = alocacoesMes
            .filter((a) => a.workpackage && a.workpackage.projeto && a.workpackage.projeto.estado === "PENDENTE")
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
        //    e alocações de férias/ausências (workpackageId é null)
        const alocacoesReaisDb = await ctx.db.alocacaoRecurso.findMany({
          where: {
            userId: actualUserId,
            ...(input.ano ? { ano: input.ano } : {}),
            OR: [
              {
                workpackage: {
                  projeto: {
                    estado: { in: validProjectStates },
                  },
                },
              },
              {
                workpackageId: null, // Inclui férias/ausências
              },
            ],
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
        // Processa as alocacoes reais e coleta anos/projetos
        const realData = alocacoesReaisDb.map(alocacao => {
          anosSet.add(alocacao.ano);
          if (alocacao.workpackage && alocacao.workpackage.projeto) {
            projetoIdsSet.add(alocacao.workpackage.projeto.id);
          }
          // Para férias/ausências, workpackage e projeto serão null
          return {
            workpackageId: alocacao.workpackage?.id ?? null,
            workpackageNome: alocacao.workpackage?.nome ?? null,
            projetoId: alocacao.workpackage?.projeto?.id ?? null,
            projetoNome: alocacao.workpackage?.projeto?.nome ?? null,
            projetoEstado: alocacao.workpackage?.projeto?.estado ?? null,
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
          if (alocacao.workpackage && alocacao.workpackage.projeto) {
            projetoIdsSet.add(alocacao.workpackage.projeto.id);
          }
          return {
            workpackageId: alocacao.workpackage?.id ?? null,
            workpackageNome: alocacao.workpackage?.nome ?? null,
            projetoId: alocacao.workpackage?.projeto?.id ?? null,
            projetoNome: alocacao.workpackage?.projeto?.nome ?? null,
            projetoEstado: alocacao.workpackage?.projeto?.estado ?? null,
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
        // Processa as alocacoes submetidas a partir dos snapshots
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