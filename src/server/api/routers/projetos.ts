import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { ProjetoEstado, Prisma, Projeto, Workpackage, Tarefa } from "@prisma/client";
import { z } from "zod";

// Importar schemas e utilidades
import { 
  createProjetoSchema, 
  updateProjetoSchema, 
  projetoFilterSchema,
  projetoDateValidationSchema
} from "@/server/api/schemas/projeto";
import { createPaginatedResponse, handlePrismaError } from "@/server/api/utils";
import { getPaginationParams } from "@/server/api/schemas/common";

// Definir tipos para os objetos com relações incluídas
type ProjetoWithRelations = Projeto & {
  financiamento: any;
  workpackages: (Workpackage & {
    tarefas: Tarefa[];
  })[];
};

export const projetoRouter = createTRPCRouter({
  // Obter todos os projetos
  getAll: publicProcedure
    .input(projetoFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        const { search, estado, financiamentoId, page = 1, limit = 10 } = input || {};
        
        // Construir condições de filtro
        const where: Prisma.ProjetoWhereInput = {
          ...(search ? {
            OR: [
              { nome: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
              { descricao: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
            ],
          } : {}),
          ...(estado ? { estado } : {}),
          ...(financiamentoId ? { financiamentoId } : {}),
        };
        
        // Parâmetros de paginação
        const { skip, take } = getPaginationParams(page, limit);
        
        // Executar query com contagem
        const [projetos, total] = await Promise.all([
          ctx.db.projeto.findMany({
            where,
            include: {
              financiamento: true,
              workpackages: {
                include: {
                  tarefas: true,
                },
              },
            },
            skip,
            take,
            orderBy: { nome: "asc" },
          }),
          ctx.db.projeto.count({ where }),
        ]);
        
        // Processar dados para incluir progresso
        const projetosComProgresso = projetos.map((projeto: ProjetoWithRelations) => {
          // Contar total de tarefas e tarefas concluídas
          let totalTarefas = 0;
          let tarefasConcluidas = 0;

          // Percorrer todos os workpackages e suas tarefas
          projeto.workpackages?.forEach((wp) => {
            totalTarefas += wp.tarefas.length;
            tarefasConcluidas += wp.tarefas.filter((tarefa) => tarefa.estado === true).length;
          });

          // Calcular o progresso (evitar divisão por zero)
          const progresso = totalTarefas > 0 ? tarefasConcluidas / totalTarefas : 0;

          // Retornar projeto com o campo progresso adicionado
          return {
            ...projeto,
            progresso,
          };
        });
        
        return createPaginatedResponse(projetosComProgresso, total, page, limit);
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Obter projeto por ID
  getById: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
      try {
        const projeto = await ctx.db.projeto.findUnique({
          where: { id },
          include: {
            financiamento: true,
            workpackages: {
              include: {
                tarefas: true,
              },
            },
          },
        });
        
        if (!projeto) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Projeto não encontrado",
          });
        }
        
        // Calcular progresso
        let totalTarefas = 0;
        let tarefasConcluidas = 0;

        projeto.workpackages?.forEach(wp => {
          totalTarefas += wp.tarefas.length;
          tarefasConcluidas += wp.tarefas.filter(tarefa => tarefa.estado === true).length;
        });

        const progresso = totalTarefas > 0 ? tarefasConcluidas / totalTarefas : 0;
        
        return {
          ...projeto,
          progresso,
        };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Criar projeto
  create: protectedProcedure
    .input(createProjetoSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Validar datas
        if (input.inicio && input.fim) {
          const { success } = projetoDateValidationSchema.safeParse({
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
        
        // Criar projeto
        const projeto = await ctx.db.projeto.create({
          data: input,
          include: {
            financiamento: true,
          },
        });
        
        return projeto;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Atualizar projeto
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: updateProjetoSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, data } = input;
        
        // Validar datas
        if (data.inicio && data.fim) {
          const { success } = projetoDateValidationSchema.safeParse({
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
        
        // Atualizar projeto
        const projeto = await ctx.db.projeto.update({
          where: { id },
          data,
          include: {
            financiamento: true,
          },
        });
        
        return projeto;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Excluir projeto
  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      try {
        // Verificar se existe workpackages e tarefas associados
        const workpackages = await ctx.db.workpackage.findMany({
          where: { projetoId: id },
          include: {
            tarefas: true,
          },
        });
        
        // Excluir tarefas primeiro
        for (const wp of workpackages) {
          if (wp.tarefas.length > 0) {
            await ctx.db.tarefa.deleteMany({
              where: { workpackageId: wp.id },
            });
          }
        }
        
        // Excluir workpackages
        await ctx.db.workpackage.deleteMany({
          where: { projetoId: id },
        });
        
        // Excluir projeto
        await ctx.db.projeto.delete({
          where: { id },
        });
        
        return { success: true };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Alterar estado do projeto
  updateEstado: protectedProcedure
    .input(z.object({
      id: z.string(),
      estado: z.nativeEnum(ProjetoEstado),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, estado } = input;
        
        // Atualizar estado
        const projeto = await ctx.db.projeto.update({
          where: { id },
          data: { estado },
        });
        
        return projeto;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
});