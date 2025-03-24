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
  // Operações CRUD básicas
  findAll: publicProcedure
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
  
  findById: protectedProcedure
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
  
  findByWorkpackage: publicProcedure
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
        
        // Atualizar estado do workpackage
        await atualizarEstadoWorkpackage(ctx, input.workpackageId);
        
        return tarefa;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  update: protectedProcedure
    .input(updateTarefaSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input;

      try {
        // Verificar se a tarefa existe
        const tarefaExistente = await ctx.db.tarefa.findUnique({
          where: { id },
          include: {
            workpackage: true,
            entregaveis: true
          }
        });

        if (!tarefaExistente) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tarefa não encontrada"
          });
        }

        // Atualizar apenas os campos fornecidos
        const tarefaAtualizada = await ctx.db.tarefa.update({
          where: { id },
          data: {
            ...Object.keys(data).length > 0 ? data : {},
          },
          include: {
            entregaveis: true
          }
        });

        // Se o estado da tarefa foi alterado, atualizar o estado do workpackage
        if (data.estado !== undefined) {
          await atualizarEstadoWorkpackage(ctx, tarefaExistente.workpackage.id);
        }

        return tarefaAtualizada;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      try {
        // Obter a tarefa para saber o workpackageId
        const tarefa = await ctx.db.tarefa.findUnique({
          where: { id },
          select: { workpackageId: true }
        });
        
        if (!tarefa) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tarefa não encontrada",
          });
        }
        
        const workpackageId = tarefa.workpackageId;
        
        // Apagar a tarefa (entregáveis serão excluídos por cascade)
        await ctx.db.tarefa.delete({
          where: { id },
        });
        
        // Atualizar estado do workpackage
        await atualizarEstadoWorkpackage(ctx, workpackageId);
        
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
    
  // Apagar entregável
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

// Função auxiliar para atualizar o estado do workpackage com base no estado das tarefas
async function atualizarEstadoWorkpackage(ctx: any, workpackageId: string) {
  // Buscar todas as tarefas do workpackage
  const tarefas = await ctx.db.tarefa.findMany({
    where: { workpackageId }
  });
  
  // Se não houver tarefas, considerar como concluído
  // Se houver tarefas, verificar se todas estão concluídas
  const todasConcluidas = tarefas.length === 0 ? true : tarefas.every((t: {estado: boolean}) => t.estado === true);
  
  // Atualizar o estado do workpackage
  await ctx.db.workpackage.update({
    where: { id: workpackageId },
    data: { estado: todasConcluidas }
  });
  
  console.log(`Workpackage ${workpackageId} atualizado para estado: ${todasConcluidas}`);
} 