import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

// Importar schemas e utilidades
import {
  createWorkpackageSchema,
  updateWorkpackageSchema,
  workpackageFilterSchema,
  workpackageDateValidationSchema,
  workpackageUserSchema
} from "../schemas/workpackage";
import { createPaginatedResponse, handlePrismaError } from "../utils";
import { getPaginationParams } from "../schemas/common";

// Tipos para superar as restrições do Prisma
type WorkpackageWithRelations = Prisma.WorkpackageGetPayload<{
  include: {
    projeto: true;
    tarefas: true;
  }
}> & {
  responsavel?: any; // Adicionamos como any pois não temos acesso ao tipo exato do modelo
};

export const workpackageRouter = createTRPCRouter({
  // Obter todos os workpackages
  getAll: publicProcedure
    .input(workpackageFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        const { search, projetoId, page = 1, limit = 10 } = input || {};
        const responsavelId = input?.responsavelId;
        
        // Construir condições de filtro
        const where: Prisma.WorkpackageWhereInput = {
          ...(search ? {
            OR: [
              { nome: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
              { descricao: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
            ] as Prisma.WorkpackageWhereInput[],
          } : {}),
          ...(projetoId ? { projetoId } : {}),
          ...(responsavelId ? { responsavelId } : {}),
        };
        
        // Parâmetros de paginação
        const { skip, take } = getPaginationParams(page, limit);
        
        // Executar query com contagem
        const [workpackages, total] = await Promise.all([
          ctx.db.workpackage.findMany({
            where,
            include: {
              projeto: true,
              tarefas: true,
              // Necessário verificar se o modelo suporta esta relação
              ...(ctx.db.workpackage.fields.responsavelId ? { responsavel: true } : {}),
            },
            skip,
            take,
            orderBy: { nome: "asc" },
          }),
          ctx.db.workpackage.count({ where }),
        ]);
        
        // Processar dados para incluir progresso
        const workpackagesComProgresso = workpackages.map((workpackage: WorkpackageWithRelations) => {
          // Contar total de tarefas e tarefas concluídas
          const totalTarefas = workpackage.tarefas?.length || 0;
          const tarefasConcluidas = workpackage.tarefas?.filter(tarefa => tarefa.estado === true).length || 0;
          
          // Calcular o progresso (evitar divisão por zero)
          const progresso = totalTarefas > 0 ? tarefasConcluidas / totalTarefas : 0;
          
          // Retornar workpackage com o campo progresso adicionado
          return {
            ...workpackage,
            progresso,
          };
        });
        
        return createPaginatedResponse(workpackagesComProgresso, total, page, limit);
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Obter workpackage por ID
  getById: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      try {
        const workpackage = await ctx.db.workpackage.findUnique({
          where: { id },
          include: {
            projeto: true,
            tarefas: {
              include: {
                ...(ctx.db.tarefa.fields.responsavelId ? { responsavel: true } : {}),
              },
            },
            ...(ctx.db.workpackage.fields.responsavelId ? { responsavel: true } : {}),
          },
        }) as WorkpackageWithRelations;
        
        if (!workpackage) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Work Package não encontrado",
          });
        }
        
        // Calcular progresso
        const totalTarefas = workpackage.tarefas?.length || 0;
        const tarefasConcluidas = workpackage.tarefas?.filter(tarefa => tarefa.estado === true).length || 0;
        const progresso = totalTarefas > 0 ? tarefasConcluidas / totalTarefas : 0;
        
        return {
          ...workpackage,
          progresso,
        };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Obter workpackages por projeto
  getByProjeto: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: projetoId }) => {
      try {
        const workpackages = await ctx.db.workpackage.findMany({
          where: { projetoId },
          include: {
            tarefas: true,
            ...(ctx.db.workpackage.fields.responsavelId ? { responsavel: true } : {}),
          },
          orderBy: { nome: "asc" },
        }) as WorkpackageWithRelations[];
        
        // Processar dados para incluir progresso
        const workpackagesComProgresso = workpackages.map(workpackage => {
          // Contar total de tarefas e tarefas concluídas
          const totalTarefas = workpackage.tarefas?.length || 0;
          const tarefasConcluidas = workpackage.tarefas?.filter(tarefa => tarefa.estado === true).length || 0;
          
          // Calcular o progresso (evitar divisão por zero)
          const progresso = totalTarefas > 0 ? tarefasConcluidas / totalTarefas : 0;
          
          // Retornar workpackage com o campo progresso adicionado
          return {
            ...workpackage,
            progresso,
          };
        });
        
        return workpackagesComProgresso;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Criar workpackage
  create: protectedProcedure
    .input(createWorkpackageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Validar datas
        if (input.inicio && input.fim) {
          const { success } = workpackageDateValidationSchema.safeParse({
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
        
        // Verificar se o projeto existe
        const projeto = await ctx.db.projeto.findUnique({
          where: { id: input.projetoId },
        });
        
        if (!projeto) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Projeto não encontrado",
          });
        }
        
        // Criar workpackage
        const workpackage = await ctx.db.workpackage.create({
          data: input,
          include: {
            projeto: true,
            ...(ctx.db.workpackage.fields.responsavelId ? { responsavel: true } : {}),
          },
        });
        
        return workpackage;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Atualizar workpackage
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: updateWorkpackageSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, data } = input;
        
        // Validar datas
        if (data.inicio && data.fim) {
          const { success } = workpackageDateValidationSchema.safeParse({
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
        
        // Atualizar workpackage
        const workpackage = await ctx.db.workpackage.update({
          where: { id },
          data,
          include: {
            projeto: true,
            ...(ctx.db.workpackage.fields.responsavelId ? { responsavel: true } : {}),
          },
        });
        
        return workpackage;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Excluir workpackage
  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      try {
        // Verificar se existem tarefas associadas
        const tarefas = await ctx.db.tarefa.findMany({
          where: { workpackageId: id },
        });
        
        // Excluir tarefas primeiro
        if (tarefas.length > 0) {
          await ctx.db.tarefa.deleteMany({
            where: { workpackageId: id },
          });
        }
        
        // Excluir workpackage
        await ctx.db.workpackage.delete({
          where: { id },
        });
        
        return { success: true };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Atribuir responsável
  atribuirResponsavel: protectedProcedure
    .input(workpackageUserSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { workpackageId, userId } = input;
        
        // Verificar se o utilizador existe
        const user = await ctx.db.user.findUnique({
          where: { id: userId },
        });
        
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado",
          });
        }
        
        // Atualizar o workpackage
        const workpackage = await ctx.db.workpackage.update({
          where: { id: workpackageId },
          data: { responsavelId: userId },
          include: {
            ...(ctx.db.workpackage.fields.responsavelId ? { responsavel: true } : {}),
          },
        });
        
        return workpackage;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
}); 