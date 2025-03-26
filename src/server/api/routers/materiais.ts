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
  estado: z.boolean().default(false),
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
        
        // Criar material usando Prisma
        const material = await ctx.db.material.create({
          data: {
            nome: input.nome,
            descricao: input.descricao,
            preco: new Prisma.Decimal(input.preco),
            quantidade: input.quantidade,
            rubrica: input.rubrica,
            ano_utilizacao: input.ano_utilizacao,
            workpackageId: input.workpackageId,
            estado: input.estado,
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
      data: updateMaterialSchema.omit({ workpackageId: true }).optional(),
      workpackageId: z.string().uuid("ID de workpackage inválido").optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, data: inputData = {}, workpackageId } = input;
        
        // Log para debug
        console.log("Material update input:", JSON.stringify(input, null, 2));
        
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
        
        // Definir quais dados serão atualizados
        const data: Prisma.MaterialUpdateInput = {};
        
        // Adicionar campos do objeto data se fornecido
        if (inputData.nome !== undefined) data.nome = inputData.nome;
        if (inputData.descricao !== undefined) data.descricao = inputData.descricao;
        if (inputData.preco !== undefined) data.preco = new Prisma.Decimal(inputData.preco);
        if (inputData.quantidade !== undefined) data.quantidade = inputData.quantidade;
        if (inputData.ano_utilizacao !== undefined) data.ano_utilizacao = inputData.ano_utilizacao;
        if (inputData.rubrica !== undefined) data.rubrica = inputData.rubrica;
        if (inputData.estado !== undefined) data.estado = inputData.estado;
        
        // Adicionar workpackageId se fornecido
        if (workpackageId) {
          // Verificar se o workpackage existe
          const workpackage = await ctx.db.workpackage.findUnique({
            where: { id: workpackageId },
          });
          
          if (!workpackage) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Work Package não encontrado",
            });
          }
          
          data.workpackage = { connect: { id: workpackageId } };
        }
        
        // Log para debug
        console.log("Material update data preparada:", JSON.stringify(data, null, 2));
        
        // Verificar se há dados para atualizar
        if (Object.keys(data).length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Nenhum dado fornecido para atualização",
          });
        }
        
        // Atualizar material
        const material = await ctx.db.material.update({
          where: { id },
          data,
        });
        
        // Log para debug
        console.log("Material atualizado com sucesso:", JSON.stringify(material, null, 2));
        
        return material;
      } catch (error) {
        console.error("Erro na atualização do material:", error);
        
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          console.error(`Prisma Error code: ${error.code}, message: ${error.message}`);
          
          // Mensagem mais específica para erros conhecidos
          if (error.code === 'P2025') {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Material não encontrado",
            });
          }
        }
        
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
    })
}); 