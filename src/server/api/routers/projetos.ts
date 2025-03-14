import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { ProjetoEstado, Prisma, Rubrica } from "@prisma/client";
import { handlePrismaError, createPaginatedResponse } from "../utils";
import { paginationSchema, getPaginationParams } from "../schemas/common";

// Schema base para projeto
export const projetoBaseSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(255, "Nome deve ter no máximo 255 caracteres"),
  descricao: z.string().optional(),
  inicio: z.coerce.date().optional(),
  fim: z.coerce.date().optional(),
  estado: z.nativeEnum(ProjetoEstado).optional().default(ProjetoEstado.RASCUNHO),
  overhead: z.coerce.number().min(0).max(100).default(0),
  taxa_financiamento: z.coerce.number().min(0).max(100).default(0),
  valor_eti: z.coerce.number().min(0).default(0),
  financiamentoId: z.coerce.number().int("ID do financiamento deve ser um número inteiro").optional(),
});

// Schema para criação de projeto
export const createProjetoSchema = projetoBaseSchema;

// Schema para atualização de projeto
export const updateProjetoSchema = projetoBaseSchema.partial();

// Schema para filtros de projeto
export const projetoFilterSchema = z.object({
  search: z.string().optional(),
  estado: z.nativeEnum(ProjetoEstado).optional(),
  financiamentoId: z.coerce.number().int("ID do financiamento deve ser um número inteiro").optional(),
}).merge(paginationSchema);

// Schema para validação de datas
export const projetoDateValidationSchema = z.object({
  inicio: z.coerce.date().optional(),
  fim: z.coerce.date().optional(),
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

// Schema para criação de projeto completo
export const createProjetoCompletoSchema = z.object({
  // Dados básicos do projeto
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(255, "Nome deve ter no máximo 255 caracteres"),
  descricao: z.string().optional(),
  inicio: z.date().optional(),
  fim: z.date().optional(),
  estado: z.nativeEnum(ProjetoEstado).optional().default(ProjetoEstado.RASCUNHO),
  financiamentoId: z.number().optional(),
  overhead: z.number().min(0).max(100).default(0),
  taxa_financiamento: z.number().min(0).max(100).default(0),
  valor_eti: z.number().min(0).default(0),
  
  // Workpackages e seus sub-dados
  workpackages: z.array(z.object({
    nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    descricao: z.string().optional(),
    inicio: z.date().optional(),
    fim: z.date().optional(),
    estado: z.boolean().optional().default(false),
    
    // Tarefas do workpackage
    tarefas: z.array(z.object({
      nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
      descricao: z.string().optional(),
      inicio: z.date().optional(),
      fim: z.date().optional(),
      estado: z.boolean().optional().default(false),
      
      // Entregáveis da tarefa
      entregaveis: z.array(z.object({
        nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
        descricao: z.string().optional(),
        data: z.date().optional(),
      })).optional().default([]),
    })).optional().default([]),
    
    // Materiais do workpackage
    materiais: z.array(z.object({
      nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
      preco: z.number().min(0, "Preço deve ser um valor positivo"),
      quantidade: z.number().min(1, "Quantidade deve ser pelo menos 1"),
      rubrica: z.nativeEnum(Rubrica).default(Rubrica.MATERIAIS),
      ano_utilizacao: z.number().int().min(2000, "Ano deve ser válido").max(2100, "Ano deve ser válido"),
    })).optional().default([]),
  })).optional().default([]),
});

// Tipos inferidos dos schemas
export type CreateProjetoInput = z.infer<typeof createProjetoSchema>;
export type UpdateProjetoInput = z.infer<typeof updateProjetoSchema>;
export type ProjetoFilterInput = z.infer<typeof projetoFilterSchema>;
export type CreateProjetoCompletoInput = z.infer<typeof createProjetoCompletoSchema>;

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
            select: {
              id: true,
              nome: true,
              descricao: true,
              inicio: true,
              fim: true,
              estado: true,
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
        const projetosComProgresso = projetos.map(projeto => {
          // Contar total de tarefas e tarefas concluídas
          let totalTarefas = 0;
          let tarefasConcluidas = 0;

          // Percorrer todos os workpackages e suas tarefas
          projeto.workpackages?.forEach(wp => {
            totalTarefas += wp.tarefas.length;
            tarefasConcluidas += wp.tarefas.filter(tarefa => tarefa.estado === true).length;
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
    .input(z.string().uuid("ID do projeto inválido"))
    .query(async ({ ctx, input: id }) => {
      try {
        const projeto = await ctx.db.projeto.findUnique({
          where: { id },
          include: {
            financiamento: true,
            workpackages: {
              include: {
                tarefas: {
                  include: {
                    entregaveis: true
                  }
                }
              }
            }
          }
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
        
        // Extrair os dados de input
        const { 
          nome, 
          descricao, 
          inicio, 
          fim, 
          estado = ProjetoEstado.RASCUNHO, 
          financiamentoId,
          overhead = 0, 
          taxa_financiamento = 0, 
          valor_eti = 0 
        } = input;
        
        // Criar projeto (forçando o tipo para contornar problemas com o TypeScript)
        const createData = {
          nome,
          descricao,
          inicio,
          fim,
          estado,
          overhead,
          taxa_financiamento,
          valor_eti,
          ...(financiamentoId ? {
            financiamento: {
              connect: { id: financiamentoId }
            }
          } : {})
        } as any; // Usando cast para contornar problemas de tipo
        
        const projeto = await ctx.db.projeto.create({
          data: createData,
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
      id: z.string().uuid("ID do projeto inválido"),
      data: updateProjetoSchema,
    }))
    .mutation(async ({ ctx, input: { id, data } }) => {
      try {
        // Validar datas
        if (data.inicio && data.fim) {
          const dateValidation = projetoDateValidationSchema.safeParse({ inicio: data.inicio, fim: data.fim });
          if (!dateValidation.success) {
            return {
              success: false,
              error: {
                message: "Erro de validação",
                errors: dateValidation.error.flatten().fieldErrors,
              },
            };
          }
        }
        
        // Construir dados de atualização
        const updateData: Prisma.ProjetoUpdateInput = {
          nome: data.nome,
          descricao: data.descricao,
          inicio: data.inicio,
          fim: data.fim,
          estado: data.estado,
          overhead: data.overhead,
          taxa_financiamento: data.taxa_financiamento,
          valor_eti: data.valor_eti,
          ...(data.financiamentoId !== undefined && {
            financiamento: data.financiamentoId ? {
              connect: { id: data.financiamentoId }
            } : { disconnect: true }
          }),
        };
        
        // Atualizar projeto
        const projeto = await ctx.db.projeto.update({
          where: { id },
          data: updateData,
          include: {
            financiamento: true,
          },
        });
        
        return {
          success: true,
          data: projeto
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            success: false,
            error: {
              message: "Erro de validação",
              errors: error.flatten().fieldErrors,
            },
          };
        }
        return handlePrismaError(error);
      }
    }),
  
  // Excluir projeto
  delete: protectedProcedure
    .input(z.string().uuid("ID do projeto inválido"))
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
      id: z.string().uuid("ID do projeto inválido"),
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
  
  // Criar projeto completo com workpackages, tarefas, entregáveis e materiais
  createCompleto: protectedProcedure
    .input(z.object({
      // Dados básicos do projeto
      nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(255, "Nome deve ter no máximo 255 caracteres"),
      descricao: z.string().optional(),
      inicio: z.date().optional(),
      fim: z.date().optional(),
      estado: z.nativeEnum(ProjetoEstado).optional().default(ProjetoEstado.RASCUNHO),
      financiamentoId: z.number().optional(),
      overhead: z.number().min(0).max(100).default(0),
      taxa_financiamento: z.number().min(0).max(100).default(0),
      valor_eti: z.number().min(0).default(0),
      
      // Workpackages e seus sub-dados
      workpackages: z.array(z.object({
        nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
        descricao: z.string().optional(),
        inicio: z.date().optional(),
        fim: z.date().optional(),
        estado: z.boolean().optional().default(false),
        
        // Tarefas do workpackage
        tarefas: z.array(z.object({
          nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
          descricao: z.string().optional(),
          inicio: z.date().optional(),
          fim: z.date().optional(),
          estado: z.boolean().optional().default(false),
          
          // Entregáveis da tarefa
          entregaveis: z.array(z.object({
            nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
            descricao: z.string().optional(),
            data: z.date().optional(),
          })).optional().default([]),
        })).optional().default([]),
        
        // Materiais do workpackage
        materiais: z.array(z.object({
          nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
          preco: z.number().min(0, "Preço deve ser um valor positivo"),
          quantidade: z.number().min(1, "Quantidade deve ser pelo menos 1"),
          rubrica: z.nativeEnum(Rubrica).default(Rubrica.MATERIAIS),
          ano_utilizacao: z.number().int().min(2000, "Ano deve ser válido").max(2100, "Ano deve ser válido"),
        })).optional().default([]),
      })).optional().default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Validar datas do projeto
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
        
        // Validar datas dos workpackages
        for (const wp of input.workpackages) {
          if (wp.inicio && wp.fim) {
            if (wp.inicio > wp.fim) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Workpackage "${wp.nome}": A data de fim deve ser posterior à data de início`,
              });
            }
            
            // Verificar se as datas do workpackage estão dentro do período do projeto
            if (input.inicio && wp.inicio < input.inicio) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Workpackage "${wp.nome}": A data de início não pode ser anterior à data de início do projeto`,
              });
            }
            
            if (input.fim && wp.fim > input.fim) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Workpackage "${wp.nome}": A data de fim não pode ser posterior à data de fim do projeto`,
              });
            }
          }
          
          // Validar datas das tarefas
          for (const tarefa of wp.tarefas) {
            if (tarefa.inicio && tarefa.fim) {
              if (tarefa.inicio > tarefa.fim) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Tarefa "${tarefa.nome}": A data de fim deve ser posterior à data de início`,
                });
              }
              
              // Verificar se as datas da tarefa estão dentro do período do workpackage
              if (wp.inicio && tarefa.inicio < wp.inicio) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Tarefa "${tarefa.nome}": A data de início não pode ser anterior à data de início do workpackage`,
                });
              }
              
              if (wp.fim && tarefa.fim > wp.fim) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Tarefa "${tarefa.nome}": A data de fim não pode ser posterior à data de fim do workpackage`,
                });
              }
            }
          }
        }
        
        // Criar projeto com todos os sub-dados
        const projeto = await ctx.db.projeto.create({
          data: {
            nome: input.nome,
            descricao: input.descricao,
            inicio: input.inicio,
            fim: input.fim,
            estado: input.estado,
            overhead: input.overhead,
            taxa_financiamento: input.taxa_financiamento,
            valor_eti: input.valor_eti,
            ...(input.financiamentoId ? {
              financiamentoId: input.financiamentoId
            } : {}),
            workpackages: {
              create: input.workpackages.map(wp => ({
                nome: wp.nome,
                descricao: wp.descricao,
                inicio: wp.inicio,
                fim: wp.fim,
                estado: wp.estado,
                tarefas: {
                  create: wp.tarefas.map(t => ({
                    nome: t.nome,
                    descricao: t.descricao,
                    inicio: t.inicio,
                    fim: t.fim,
                    estado: t.estado,
                    entregaveis: {
                      create: t.entregaveis.map(e => ({
                        nome: e.nome,
                        descricao: e.descricao,
                        data: e.data
                      }))
                    }
                  }))
                },
                materiais: {
                  create: wp.materiais.map(m => ({
                    nome: m.nome,
                    preco: m.preco,
                    quantidade: m.quantidade,
                    rubrica: m.rubrica,
                    ano_utilizacao: m.ano_utilizacao
                  }))
                }
              }))
            }
          },
          include: {
            financiamento: true,
            workpackages: {
              include: {
                tarefas: {
                  include: {
                    entregaveis: true
                  }
                },
                materiais: true
              }
            }
          }
        });
        
        return {
          success: true,
          data: projeto
        };
      } catch (error) {
        console.error("Erro ao criar projeto completo:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        return handlePrismaError(error);
      }
    }),
});