import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

// Base schema sem transformação
const baseSchema = z.object({
  nome: z.string().trim().min(3, "O nome deve ter pelo menos 3 caracteres").max(255),
  overhead: z.number().min(0).max(100),
  taxa_financiamento: z.number().min(0).max(100),
  valor_eti: z.number().min(0),
});

// Schema para criação
const createFinanciamentoSchema = baseSchema;

// Schema para atualização
const updateFinanciamentoSchema = z.object({
  id: z.number(),
  nome: z.string().trim().min(3, "O nome deve ter pelo menos 3 caracteres").max(255).optional(),
  overhead: z.number().min(0).max(100).optional(),
  taxa_financiamento: z.number().min(0).max(100).optional(),
  valor_eti: z.number().min(0).optional(),
}).transform(data => ({
  id: data.id,
  ...(data.nome && { nome: data.nome }),
  ...(data.overhead !== undefined && { overhead: new Prisma.Decimal(data.overhead) }),
  ...(data.taxa_financiamento !== undefined && { taxa_financiamento: new Prisma.Decimal(data.taxa_financiamento) }),
  ...(data.valor_eti !== undefined && { valor_eti: new Prisma.Decimal(data.valor_eti) }),
}));

const paginationSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(10),
  cursor: z.number().optional(),
});

// Router
export const financiamentoRouter = createTRPCRouter({
  // Obter todos os tipos de financiamento com paginação
  findAll: protectedProcedure.input(paginationSchema).query(async ({ ctx, input }) => {
    const { limit, cursor } = input;

    const items = await ctx.db.financiamento.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: "asc" },
    });

    let nextCursor: typeof cursor | undefined = undefined;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem!.id;
    }

    return {
      items,
      nextCursor,
    };
  }),

  // Obter um tipo de financiamento por ID
  findById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const financiamento = await ctx.db.financiamento.findUnique({
      where: { id: input.id },
    });

    if (!financiamento) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tipo de financiamento não encontrado",
      });
    }

    return financiamento;
  }),

  // Criar um novo tipo de financiamento
  create: protectedProcedure.input(createFinanciamentoSchema).mutation(async ({ ctx, input }) => {
    try {
      // Verificar se já existe um financiamento com o mesmo nome
      const existente = await ctx.db.financiamento.findFirst({
        where: {
          nome: {
            equals: input.nome,
            mode: 'insensitive', // case insensitive
          },
        },
      });

      if (existente) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe um financiamento com este nome",
        });
      }

      return await ctx.db.financiamento.create({
        data: {
          nome: input.nome,
          overhead: input.overhead,
          taxa_financiamento: input.taxa_financiamento,
          valor_eti: input.valor_eti,
        },
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Erro ao criar tipo de financiamento",
        });
      }
      throw error;
    }
  }),

  // Atualizar um tipo de financiamento
  update: protectedProcedure.input(updateFinanciamentoSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    try {
      return await ctx.db.financiamento.update({
        where: { id },
        data: {
          nome: data.nome,
          overhead: data.overhead ? new Prisma.Decimal(data.overhead) : undefined,
          taxa_financiamento: data.taxa_financiamento
            ? new Prisma.Decimal(data.taxa_financiamento)
            : undefined,
          valor_eti: data.valor_eti ? new Prisma.Decimal(data.valor_eti) : undefined,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tipo de financiamento não encontrado",
          });
        }
      }
      throw error;
    }
  }),

  // Eliminar um tipo de financiamento
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verificar se existem projetos usando este tipo de financiamento
        const projetosComFinanciamento = await ctx.db.projeto.count({
          where: { financiamentoId: input.id },
        });

        if (projetosComFinanciamento > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Não é possível eliminar um tipo de financiamento que está a ser usado em projetos",
          });
        }

        return await ctx.db.financiamento.delete({
          where: { id: input.id },
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2025") {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Tipo de financiamento não encontrado",
            });
          }
        }
        throw error;
      }
    }),
});
