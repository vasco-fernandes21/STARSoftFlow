import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Prisma, Rubrica } from "@prisma/client";
import { z } from "zod";

// Schema base para materiais
const materialBaseSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(255, "Nome deve ter no máximo 255 caracteres"),
  descricao: z.string().optional(),
  preco: z.number().min(0, "Preço deve ser positivo"),
  quantidade: z.number().int().min(1, "Quantidade deve ser pelo menos 1"),
  rubrica: z.nativeEnum(Rubrica),
  ano_utilizacao: z.number().int().min(2024, "Ano de utilização inválido"),
  workpackageId: z.string().uuid("ID de workpackage inválido"),
});

// Schema para criação de material
const createMaterialSchema = materialBaseSchema;

// Schema para atualização de material
const updateMaterialSchema = materialBaseSchema.partial();

export const materialRouter = createTRPCRouter({
  // Criar material
  create: protectedProcedure
    .input(createMaterialSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verificar se o workpackage existe
        const workpackage = await ctx.db.workpackage.findUnique({
          where: { id: input.workpackageId },
        });
        
        if (!workpackage) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Work Package não encontrado",
          });
        }
        
        // Criar material
        const material = await ctx.db.material.create({
          data: {
            nome: input.nome,
            descricao: input.descricao,
            preco: input.preco,
            quantidade: input.quantidade,
            rubrica: input.rubrica,
            ano_utilizacao: input.ano_utilizacao,
            workpackageId: input.workpackageId,
          },
        });
        
        return material;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao criar material",
          cause: error,
        });
      }
    }),

  // Atualizar material
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      workpackageId: z.string().uuid("ID de workpackage inválido"),
      nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(255, "Nome deve ter no máximo 255 caracteres").optional(),
      descricao: z.string().optional().nullable(),
      preco: z.number().min(0, "Preço deve ser positivo").optional(),
      quantidade: z.number().int().min(1, "Quantidade deve ser pelo menos 1").optional(),
      rubrica: z.nativeEnum(Rubrica).optional(),
      ano_utilizacao: z.number().int().min(2024, "Ano de utilização inválido").optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        
        // Verificar se o material existe
        const materialExistente = await ctx.db.material.findUnique({
          where: { id },
        });
        
        if (!materialExistente) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Material não encontrado",
          });
        }
        
        // Atualizar material
        const material = await ctx.db.material.update({
          where: { id },
          data,
        });
        
        return material;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao atualizar material",
          cause: error,
        });
      }
    }),

  // Apagar material
  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input: id }) => {
      try {
        await ctx.db.material.delete({
          where: { id },
        });
        
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao apagar material",
          cause: error,
        });
      }
    }),

  // Obter materiais por workpackage
  getByWorkpackage: protectedProcedure
    .input(z.string().uuid("ID de workpackage inválido"))
    .query(async ({ ctx, input: workpackageId }) => {
      try {
        const materiais = await ctx.db.material.findMany({
          where: { workpackageId },
          orderBy: { nome: "asc" },
        });
        
        return materiais;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar materiais",
          cause: error,
        });
      }
    }),
}); 