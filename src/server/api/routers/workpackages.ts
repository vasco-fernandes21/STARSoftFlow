import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Prisma, Rubrica } from "@prisma/client";
import { z } from "zod";
import { paginationSchema } from "../schemas/common";

// Schemas
const workpackageBaseSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(255, "Nome deve ter no máximo 255 caracteres"),
  projetoId: z.string().uuid("ID de projeto inválido"),
  inicio: z.date().optional(),
  fim: z.date().optional(),
  estado: z.boolean().default(false),
  descricao: z.string().optional(),
});

const createWorkpackageSchema = workpackageBaseSchema;

const updateWorkpackageSchema = workpackageBaseSchema.partial().extend({
  id: z.string().uuid("ID do workpackage inválido"),
  projetoId: z.string().uuid("ID de projeto inválido").optional(),
});

const workpackageFilterSchema = z.object({
  projetoId: z.string().uuid("ID de projeto inválido").optional(),
  search: z.string().optional(),
  estado: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).default(10)
}).merge(paginationSchema);

const workpackageUserSchema = z.object({
  workpackageId: z.string().uuid("ID do workpackage inválido"),
  userId: z.string(),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2000),
  ocupacao: z.coerce.number().min(0).max(1).transform(val => new Prisma.Decimal(val)),
});

const workpackageDateValidationSchema = z.object({
  inicio: z.date().optional(),
  fim: z.date().optional(),
}).refine(
  (data) => {
    if (data.inicio && data.fim) {
      return data.inicio <= data.fim;
    }
    return true;
  },
  {
    message: "A data de fim deve ser posterior à data de início",
    path: ["fim"],
  }
);

const materialSchema = z.object({
  workpackageId: z.string().uuid(),
  nome: z.string().min(1, "Nome é obrigatório"),
  preco: z.coerce.number().min(0, "Preço deve ser maior que 0").transform(val => new Prisma.Decimal(val)),
  quantidade: z.number().int().min(1, "Quantidade deve ser maior que 0"),
  rubrica: z.nativeEnum(Rubrica),
  ano_utilizacao: z.number().int().min(2024, "Ano deve ser 2024 ou superior")
});

// Router
export const workpackageRouter = createTRPCRouter({
  findAll: protectedProcedure
    .input(workpackageFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      const { search, projetoId, page = 1, limit = 10 } = input || {};
      
      const skip = (page - 1) * limit;
      
      const where: Prisma.WorkpackageWhereInput = {
        ...(search && {
          OR: [
            { nome: { contains: search, mode: "insensitive" } },
            { descricao: { contains: search, mode: "insensitive" } }
          ]
        }),
        ...(projetoId && { projetoId })
      };

      const [workpackages, total] = await Promise.all([
        ctx.db.workpackage.findMany({
          where,
          include: {
            projeto: true,
            tarefas: true,
            recursos: true,
            materiais: true
          },
          skip,
          take: limit,
          orderBy: { nome: "asc" }
        }),
        ctx.db.workpackage.count({ where })
      ]);

      const workpackagesProcessados = workpackages.map(wp => {
        const totalTarefas = wp.tarefas.length;
        const tarefasConcluidas = wp.tarefas.filter(t => t.estado).length;
        const progresso = totalTarefas > 0 ? tarefasConcluidas / totalTarefas : 0;

        return {
          ...wp,
          progresso
        };
      });

      return {
        items: workpackagesProcessados,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    }),

  findById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const workpackage = await ctx.db.workpackage.findUnique({
        where: { id: input.id },
        include: {
          projeto: true,
          tarefas: {
            include: {
              entregaveis: true
            }
          },
          materiais: true,
          recursos: {
            include: {
              user: true
            }
          }
        }
      });

      if (!workpackage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workpackage não encontrado"
        });
      }

      return workpackage;
    }),

  create: protectedProcedure
    .input(createWorkpackageSchema)
    .mutation(async ({ ctx, input }) => {
      // Validar datas se ambas estiverem presentes
      if (input.inicio && input.fim) {
        const validation = workpackageDateValidationSchema.safeParse({
          inicio: input.inicio,
          fim: input.fim
        });

        if (!validation.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validation.error.errors[0]?.message || "Erro na validação das datas"
          });
        }
      }

      // Verificar se o projeto existe
      const projeto = await ctx.db.projeto.findUnique({
        where: { id: input.projetoId }
      });

      if (!projeto) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Projeto não encontrado"
        });
      }

      // Create the workpackage with the right field structure
      return ctx.db.workpackage.create({
        data: {
          nome: input.nome,
          projeto: {
            connect: {
              id: input.projetoId
            }
          },
          descricao: input.descricao,
          inicio: input.inicio,
          fim: input.fim,
          estado: input.estado ?? false
        },
        include: {
          projeto: true,
          tarefas: true,
          recursos: true,
          materiais: true
        }
      });
    }),

  update: protectedProcedure
    .input(updateWorkpackageSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Validar datas se ambas estiverem presentes
      if (data.inicio && data.fim) {
        const validation = workpackageDateValidationSchema.safeParse({
          inicio: data.inicio,
          fim: data.fim
        });

        if (!validation.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validation.error.errors[0]?.message || "Erro na validação das datas"
          });
        }
      }

      return ctx.db.workpackage.update({
        where: { id },
        data,
        include: {
          projeto: true,
          tarefas: true,
          recursos: true,
          materiais: true
        }
      });
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      // Verificar se o workpackage existe
      const workpackage = await ctx.db.workpackage.findUnique({
        where: { id }
      });

      if (!workpackage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workpackage não encontrado"
        });
      }

      // Apagar o workpackage e todas as suas relações
      await ctx.db.workpackage.delete({
        where: { id }
      });

      return { success: true };
    }),

  addMaterial: protectedProcedure
    .input(materialSchema)
    .mutation(async ({ ctx, input }) => {
      // Verifica se o workpackage existe
      const workpackage = await ctx.db.workpackage.findUnique({
        where: { id: input.workpackageId }
      });

      if (!workpackage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workpackage não encontrado"
        });
      }

      // Cria o material
      const material = await ctx.db.material.create({
        data: {
          nome: input.nome,
          preco: input.preco,
          quantidade: input.quantidade,
          rubrica: input.rubrica,
          ano_utilizacao: input.ano_utilizacao,
          workpackageId: input.workpackageId
        }
      });

      return material;
    }),

  removeMaterial: protectedProcedure
    .input(z.object({
      workpackageId: z.string().uuid(),
      materialId: z.number()
    }))
    .mutation(async ({ ctx, input }) => {
      // Verifica se o material existe e pertence ao workpackage
      const material = await ctx.db.material.findFirst({
        where: {
          id: input.materialId,
          workpackageId: input.workpackageId
        }
      });

      if (!material) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Material não encontrado ou não pertence a este workpackage"
        });
      }

      // Remove o material
      await ctx.db.material.delete({
        where: { id: input.materialId }
      });

      return { success: true };
    }),

  // Adicionar ou atualizar alocação de recurso (upsert)
  addAlocacao: protectedProcedure
    .input(workpackageUserSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { workpackageId, userId, mes, ano, ocupacao } = input;

        // Verificar se o workpackage existe
        const workpackage = await ctx.db.workpackage.findUnique({
          where: { id: workpackageId }
        });

        if (!workpackage) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workpackage não encontrado"
          });
        }

        // Verificar se o utilizador existe
        const user = await ctx.db.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado"
          });
        }

        // Usar upsert para criar ou atualizar a alocação
        const alocacao = await ctx.db.alocacaoRecurso.upsert({
          where: {
            workpackageId_userId_mes_ano: {
              workpackageId,
              userId,
              mes,
              ano
            }
          },
          update: {
            ocupacao
          },
          create: {
            workpackageId,
            userId,
            mes,
            ano,
            ocupacao
          }
        });

        return alocacao;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao adicionar ou atualizar alocação",
          cause: error,
        });
      }
    }),

  // Atualizar alocação de recurso existente
  updateAlocacao: protectedProcedure
    .input(workpackageUserSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { workpackageId, userId, mes, ano, ocupacao } = input;

        // Verificar se a alocação existe
        const alocacaoExistente = await ctx.db.alocacaoRecurso.findUnique({
          where: {
            workpackageId_userId_mes_ano: {
              workpackageId,
              userId,
              mes,
              ano
            }
          }
        });

        if (!alocacaoExistente) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Alocação não encontrada"
          });
        }

        // Atualizar a alocação
        const alocacao = await ctx.db.alocacaoRecurso.update({
          where: {
            workpackageId_userId_mes_ano: {
              workpackageId,
              userId,
              mes,
              ano
            }
          },
          data: {
            ocupacao
          }
        });

        return alocacao;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao atualizar alocação",
          cause: error,
        });
      }
    }),

  // Remover alocação de recurso
  removeAlocacao: protectedProcedure
    .input(z.object({
      workpackageId: z.string(),
      userId: z.string(),
      mes: z.number(),
      ano: z.number()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { workpackageId, userId, mes, ano } = input;

        // Verificar se a alocação existe
        const alocacao = await ctx.db.alocacaoRecurso.findUnique({
          where: {
            workpackageId_userId_mes_ano: {
              workpackageId,
              userId,
              mes,
              ano
            }
          }
        });

        if (!alocacao) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Alocação não encontrada"
          });
        }

        await ctx.db.alocacaoRecurso.delete({
          where: {
            workpackageId_userId_mes_ano: {
              workpackageId,
              userId,
              mes,
              ano
            }
          }
        });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao remover alocação",
          cause: error,
        });
      }
    })
}); 