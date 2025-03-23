import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createPaginatedResponse, handlePrismaError } from "../utils";
import { paginationSchema, getPaginationParams } from "../schemas/common";

// Schemas
const tarefaBaseSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(255, "Nome deve ter no máximo 255 caracteres"),
  workpackageId: z.string().uuid("ID de workpackage inválido"),
  descricao: z.string().optional(),
  inicio: z.date().optional(),
  fim: z.date().optional(),
  estado: z.boolean().default(false),
});

const createTarefaSchema = tarefaBaseSchema;

const updateTarefaSchema = z.object({
  id: z.string(),
  data: z.object({
    nome: z.string().optional(),
    descricao: z.string().nullable().optional(),
    inicio: z.date().nullable().optional(),
    fim: z.date().nullable().optional(),
    estado: z.boolean().optional(),
    workpackageId: z.string().optional(),
  }).strict() // só vai aceitar estes
});

const tarefaFilterSchema = z.object({
  workpackageId: z.string().uuid("ID de workpackage inválido").optional(),
  search: z.string().optional(),
  estado: z.boolean().optional(),
}).merge(paginationSchema);

const tarefaDateValidationSchema = z.object({
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

// Router
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
  getById: protectedProcedure
    .input(z.string().uuid("ID da tarefa inválido"))
    .query(async ({ ctx, input }) => {
      return ctx.db.tarefa.findUnique({
        where: { id: input },
        include: {
          workpackage: {
            include: {
              projeto: true,
            },
          },
          entregaveis: true,
        },
      });
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
    .input(updateTarefaSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input;

      // Verificar se a tarefa existe
      const tarefaExistente = await ctx.db.tarefa.findUnique({
        where: { id },
      });

      if (!tarefaExistente) {
        throw new Error("Tarefa não encontrada");
      }

      // Atualizar apenas os campos fornecidos
      return ctx.db.tarefa.update({
        where: { id },
        data: {
          ...Object.keys(data).length > 0 ? data : {},
        },
      });
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
  updateEntregavel: publicProcedure
    .input(z.object({
      id: z.string(),
      data: z.object({
        nome: z.string().optional(),
        descricao: z.string().optional(),
        data: z.date().optional(),
        anexo: z.string().optional(),
        estado: z.boolean().optional()
      })
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