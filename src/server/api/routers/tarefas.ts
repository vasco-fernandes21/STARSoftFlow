import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

// Importar schemas e utilidades
import {
  createTarefaSchema,
  updateTarefaSchema,
  tarefaFilterSchema,
  tarefaDateValidationSchema
} from "../schemas/tarefa";
import { createPaginatedResponse, handlePrismaError } from "../utils";
import { getPaginationParams } from "../schemas/common";

// Schema para criação de entregável
const createEntregavelSchema = z.object({
  tarefaId: z.string(),
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  data: z.date().optional(),
  anexo: z.string().optional(),
});

// Schema para atualização de entregável
const updateEntregavelSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").optional(),
  descricao: z.string().optional(),
  data: z.date().optional(),
  anexo: z.string().optional(),
});

export const tarefaRouter = createTRPCRouter({
  // Obter todas as tarefas
  getAll: publicProcedure
    .input(tarefaFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        const { search, workpackageId, estado, page = 1, limit = 10 } = input || {};
        
        // Construir condições de filtro
        const where: Prisma.TarefaWhereInput = {
          ...(search ? {
            OR: [
              { nome: { contains: search, mode: "insensitive" as Prisma.QueryMode } }
            ] as Prisma.TarefaWhereInput[],
          } : {}),
          ...(workpackageId ? { workpackageId } : {}),
          ...(estado !== undefined ? { estado } : {}),
        };
        
        // Parâmetros de paginação
        const { skip, take } = getPaginationParams(page, limit);
        
        // Executar query com contagem
        const [tarefas, total] = await Promise.all([
          ctx.db.tarefa.findMany({
            where,
            include: {
              workpackage: {
                include: {
                  projeto: true,
                },
              },
              entregaveis: true,
            },
            skip,
            take,
            orderBy: { nome: "asc" },
          }),
          ctx.db.tarefa.count({ where }),
        ]);
        
        return createPaginatedResponse(tarefas, total, page, limit);
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Obter tarefa por ID
  getById: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      try {
        const tarefa = await ctx.db.tarefa.findUnique({
          where: { id },
          include: {
            workpackage: {
              include: {
                projeto: true,
              },
            },
            entregaveis: true,
          },
        });
        
        if (!tarefa) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tarefa não encontrada",
          });
        }
        
        return tarefa;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Obter tarefas por workpackage
  getByWorkpackage: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: workpackageId }) => {
      try {
        const tarefas = await ctx.db.tarefa.findMany({
          where: { workpackageId },
          include: {
            entregaveis: true,
          },
          orderBy: { nome: "asc" },
        });
        
        return tarefas;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Criar tarefa
  create: protectedProcedure
    .input(createTarefaSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Validar datas
        if (input.inicio && input.fim) {
          const { success } = tarefaDateValidationSchema.safeParse({
            inicio: input.inicio,
            fim: input.fim,
          });
          
          if (!success) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A data de fim deve ser posterior à data de início",
            });
          }
        }
        
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
        
        // Criar tarefa
        const tarefa = await ctx.db.tarefa.create({
          data: input,
          include: {
            workpackage: {
              include: {
                projeto: true,
              },
            },
            entregaveis: true,
          },
        });
        
        return tarefa;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Atualizar tarefa
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: updateTarefaSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, data } = input;
        
        // Validar datas
        if (data.inicio && data.fim) {
          const { success } = tarefaDateValidationSchema.safeParse({
            inicio: data.inicio,
            fim: data.fim,
          });
          
          if (!success) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A data de fim deve ser posterior à data de início",
            });
          }
        }
        
        // Atualizar tarefa
        const tarefa = await ctx.db.tarefa.update({
          where: { id },
          data,
          include: {
            workpackage: {
              include: {
                projeto: true,
              },
            },
            entregaveis: true,
          },
        });
        
        return tarefa;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Alternar estado da tarefa (concluída/não concluída)
  toggleEstado: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      try {
        // Buscar tarefa para obter estado atual
        const tarefa = await ctx.db.tarefa.findUnique({
          where: { id },
        });
        
        if (!tarefa) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tarefa não encontrada",
          });
        }
        
        // Atualizar para o estado oposto
        const tarefaAtualizada = await ctx.db.tarefa.update({
          where: { id },
          data: { estado: !tarefa.estado },
          include: {
            entregaveis: true,
          },
        });
        
        return tarefaAtualizada;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Excluir tarefa
  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      try {
        // Os entregáveis serão excluídos automaticamente devido à relação onDelete: Cascade
        await ctx.db.tarefa.delete({
          where: { id },
        });
        
        return { success: true };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
    
  // --- Procedimentos para Entregáveis ---
  
  // Criar entregável
  createEntregavel: protectedProcedure
    .input(createEntregavelSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verificar se a tarefa existe
        const tarefa = await ctx.db.tarefa.findUnique({
          where: { id: input.tarefaId },
        });
        
        if (!tarefa) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tarefa não encontrada",
          });
        }
        
        // Criar entregável
        const entregavel = await ctx.db.entregavel.create({
          data: input,
        });
        
        return entregavel;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
    
  // Atualizar entregável
  updateEntregavel: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: updateEntregavelSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, data } = input;
        
        // Verificar se o entregável existe
        const entregavelExistente = await ctx.db.entregavel.findUnique({
          where: { id },
        });
        
        if (!entregavelExistente) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Entregável não encontrado",
          });
        }
        
        // Atualizar entregável
        const entregavel = await ctx.db.entregavel.update({
          where: { id },
          data,
        });
        
        return entregavel;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
    
  // Obter entregável por ID
  getEntregavelById: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      try {
        const entregavel = await ctx.db.entregavel.findUnique({
          where: { id },
        });
        
        if (!entregavel) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Entregável não encontrado",
          });
        }
        
        return entregavel;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
    
  // Excluir entregável
  deleteEntregavel: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      try {
        await ctx.db.entregavel.delete({
          where: { id },
        });
        
        return { success: true };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
    
  // Listar entregáveis por tarefa
  getEntregaveisByTarefa: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: tarefaId }) => {
      try {
        const entregaveis = await ctx.db.entregavel.findMany({
          where: { tarefaId },
          orderBy: { nome: "asc" },
        });
        
        return entregaveis;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
}); 