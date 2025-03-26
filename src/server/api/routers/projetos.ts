import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { ProjetoEstado, Prisma, Rubrica, Rascunho } from "@prisma/client";
import { handlePrismaError, createPaginatedResponse } from "../utils";
import { paginationSchema, getPaginationParams } from "../schemas/common";
import { Decimal } from "decimal.js";

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
  responsavelId: z.string().optional(),
  overhead: z.number().min(0).max(100).default(0),
  taxa_financiamento: z.number().min(0).max(100).default(0),
  valor_eti: z.number().min(0).default(0),
  
  // Workpackages e seus sub-dados
  workpackages: z.array(z.object({
    id: z.string().optional(), // ID temporário fornecido pelo frontend
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
      id: z.number().optional(), // ID temporário fornecido pelo frontend
      nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
      preco: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
      quantidade: z.number().min(1, "Quantidade deve ser pelo menos 1"),
      rubrica: z.nativeEnum(Rubrica).default(Rubrica.MATERIAIS),
      ano_utilizacao: z.number().int().min(2000, "Ano deve ser válido").max(2100, "Ano deve ser válido"),
    })).optional().default([]),
    
    // Alocações de recursos do workpackage
    recursos: z.array(z.object({
      userId: z.string(),
      mes: z.number().min(1).max(12),
      ano: z.number().int().min(2000).max(2100),
      ocupacao: z.union([z.string(), z.number()]).transform(val => 
        typeof val === 'string' ? parseFloat(val) : val
      ),
      workpackageId: z.string().optional(), // Será preenchido após criar o workpackage
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
  findAll: publicProcedure
    .input(
      projetoFilterSchema.extend({
        userId: z.string().optional(),
        apenasAlocados: z.boolean().optional()
      }).optional().default({})
    )
    .query(async ({ ctx, input }) => {
      try {
        const { 
          search, 
          estado, 
          financiamentoId, 
          page = 1, 
          limit = 10, 
          userId, 
          apenasAlocados 
        } = input;
        
        const where: Prisma.ProjetoWhereInput = {
          ...(search && {
            OR: [
              { nome: { contains: search, mode: 'insensitive' } },
              { descricao: { contains: search, mode: 'insensitive' } }
            ]
          }),
          ...(estado && { estado }),
          ...(financiamentoId && { financiamentoId })
        };

        if (apenasAlocados && userId) {
          where.workpackages = {
            some: {
              recursos: {
                some: {
                  userId: userId
                }
              }
            }
          };
        }

        const total = await ctx.db.projeto.count({ where });

        const projetos = await ctx.db.projeto.findMany({
          where,
          orderBy: { nome: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            financiamento: true,
            workpackages: {
              include: {
                tarefas: true,
                recursos: true
              }
            }
          }
        });

        let rascunhos: Rascunho[] = [];
        if (apenasAlocados && userId) {
          rascunhos = await ctx.db.rascunho.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
          });
        }

        const items = projetos.map(projeto => {
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
        });

        return {
          items,
          ...(rascunhos.length > 0 ? { rascunhos } : {}),
          pagination: {
            total,
            pages: Math.ceil(total / limit),
            page,
            limit
          }
        };
      } catch (error) {
        console.error("Erro ao listar projetos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao listar projetos",
          cause: error
        });
      }
    }),
  
  // Obter projeto por ID
  findById: publicProcedure
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
                },
                materiais: true,
                recursos: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        salario: true
                      }
                    },
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

  getFinancas: publicProcedure
    .input(z.object({
      projetoId: z.string().uuid("ID do projeto inválido"),
      ano: z.number().int().min(2000).optional(),
      mes: z.number().int().min(1).max(12).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { projetoId, ano, mes } = input;
      
      const projeto = await ctx.db.projeto.findUnique({
        where: { id: projetoId },
        select: {
          valor_eti: true,
          overhead: true
        }
      });

      if (!projeto) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Projeto não encontrado"
        });
      }

      type AlocacaoWithDetails = {
        id: string;
        userId: string;
        workpackageId: string;
        mes: number;
        ano: number;
        ocupacao: Decimal;
        user: {
          id: string;
          name: string | null;
          salario: Decimal | null;
        };
        workpackage: {
          id: string;
          nome: string;
        };
      };

      const alocacoes = await ctx.db.alocacaoRecurso.findMany({
        where: {
          workpackage: { projetoId },
          ...(ano && { ano }),
          ...(mes && { mes }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              salario: true,
            }
          },
          workpackage: {
            select: {
              id: true,
              nome: true
            }
          }
        }
      }) as AlocacaoWithDetails[];

      const materiais = await ctx.db.material.findMany({
        where: {
          workpackage: { projetoId },
          ...(ano && { ano_utilizacao: ano })
        }
      });

      const custosPorUser = alocacoes.reduce((acc, alocacao) => {
        // Podemos confiar que user e workpackage existem, pois forçamos o tipo com AlocacaoWithDetails
        const user = alocacao.user;
        const workpackage = alocacao.workpackage;
        
        if (!acc[user.id]) {
          acc[user.id] = {
            user: {
              id: user.id,
              name: user.name ?? "Nome Desconhecido",
              salario: user.salario
            },
            totalAlocacao: new Decimal(0),
            custoTotal: new Decimal(0),
            alocacoes: []
          };
        }
        
        if (alocacao.ocupacao) {
          acc[user.id].totalAlocacao = acc[user.id].totalAlocacao.plus(alocacao.ocupacao);
          
          let custo = new Decimal(0);
          if (user.salario) {
            custo = alocacao.ocupacao.times(user.salario);
            acc[user.id].custoTotal = acc[user.id].custoTotal.plus(custo);
          }
          
          // Adicionar detalhe da alocação
          acc[user.id].alocacoes.push({
            alocacaoId: alocacao.id,
            workpackage: {
              id: workpackage.id,
              nome: workpackage.nome
            },
            data: new Date(alocacao.ano, alocacao.mes - 1, 1), // Primeiro dia do mês
            mes: alocacao.mes,
            ano: alocacao.ano,
            horas: alocacao.ocupacao.toNumber(), // Mantendo a precisão original
            custo: custo.toNumber()  // Mantendo a precisão original
          });
        }
        
        return acc;
      }, {} as Record<string, {
        user: { id: string; name: string; salario: Decimal | null };
        totalAlocacao: Decimal;
        custoTotal: Decimal;
        alocacoes: Array<{
          alocacaoId: string;
          workpackage: { id: string; nome: string };
          data: Date;
          mes: number;
          ano: number;
          horas: number;
          custo: number;
        }>;
      }>);

      const totalAlocacao = Object.values(custosPorUser).reduce(
        (sum, item) => sum.plus(item.totalAlocacao), 
        new Decimal(0)
      );
      
      const totalCustoRecursos = Object.values(custosPorUser).reduce(
        (sum, item) => sum.plus(item.custoTotal), 
        new Decimal(0)
      );
      
      const totalCustoMateriais = materiais.reduce(
        (sum, material) => {
          const custoTotal = material.preco.times(new Decimal(material.quantidade));
          return sum.plus(custoTotal);
        },
        new Decimal(0)
      );
      
      const orcamentoEstimado = totalAlocacao.times(projeto.valor_eti || new Decimal(0));
      
      const orcamentoReal = totalCustoRecursos.plus(totalCustoMateriais);

      return {
        detalhesPorUser: Object.values(custosPorUser).map(item => ({
          user: item.user,
          totalAlocacao: item.totalAlocacao.toNumber(), // Mantendo a precisão completa
          custoTotal: item.custoTotal.toNumber(), // Mantendo a precisão completa
          alocacoes: item.alocacoes.sort((a, b) => {
            // Ordenar por ano e depois por mês
            if (a.ano !== b.ano) return a.ano - b.ano;
            return a.mes - b.mes;
          })
        })),
        resumo: {
          totalAlocacao: totalAlocacao.toNumber(), // Mantendo a precisão completa
          orcamento: {
            estimado: orcamentoEstimado.toNumber(), // Mantendo a precisão completa
            real: {
              totalRecursos: totalCustoRecursos.toNumber(), // Mantendo a precisão completa
              totalMateriais: totalCustoMateriais.toNumber(), // Mantendo a precisão completa
              total: orcamentoReal.toNumber() // Mantendo a precisão completa
            }
          }
        }
      };
    }),
  
  // Criar projeto
  create: protectedProcedure
    .input(createProjetoSchema)
    .mutation(async ({ ctx, input }) => {
      try {
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
        
        // Extrair o ID do utilizador da sessão
        const userId = ctx.session.user.id;
        
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
        
        const createData = {
          nome,
          descricao,
          inicio,
          fim,
          estado,
          overhead,
          taxa_financiamento,
          valor_eti,
          // Usar a sintaxe de relacionamento para o responsável
          responsavel: {
            connect: { id: userId }
          },
          ...(financiamentoId ? {
            financiamento: {
              connect: { id: financiamentoId }
            }
          } : {})
        } as any;
        
        const projeto = await ctx.db.projeto.create({
          data: createData,
          include: {
            financiamento: true,
            responsavel: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
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
  
  // Apagar projeto
  delete: protectedProcedure
    .input(z.string().uuid("ID do projeto inválido"))
    .mutation(async ({ ctx, input: id }) => {
      try {
        const workpackages = await ctx.db.workpackage.findMany({
          where: { projetoId: id },
          include: {
            tarefas: true,
          },
        });
        
        for (const wp of workpackages) {
          if (wp.tarefas.length > 0) {
            await ctx.db.tarefa.deleteMany({
              where: { workpackageId: wp.id },
            });
          }
        }
        
        await ctx.db.workpackage.deleteMany({
          where: { projetoId: id },
        });
        
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
        
        const projeto = await ctx.db.projeto.update({
          where: { id },
          data: { estado },
        });
        
        return projeto;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Criar projeto completo com workpackages, tarefas, entregáveis, materiais e alocações
  createCompleto: protectedProcedure
    .input(z.object({
      nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(255, "Nome deve ter no máximo 255 caracteres"),
      descricao: z.string().optional(),
      inicio: z.date().optional(),
      fim: z.date().optional(),
      estado: z.nativeEnum(ProjetoEstado).optional().default(ProjetoEstado.RASCUNHO),
      financiamentoId: z.number().optional(),
      responsavelId: z.string().optional(),
      overhead: z.number().min(0).max(100).default(0),
      taxa_financiamento: z.number().min(0).max(100).default(0),
      valor_eti: z.number().min(0).default(0),
      workpackages: z.array(z.object({
        id: z.string().optional(),
        nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
        descricao: z.string().optional(),
        inicio: z.date().optional(),
        fim: z.date().optional(),
        estado: z.boolean().optional().default(false),
        tarefas: z.array(z.object({
          nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
          descricao: z.string().optional(),
          inicio: z.date().optional(),
          fim: z.date().optional(),
          estado: z.boolean().optional().default(false),
          entregaveis: z.array(z.object({
            nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
            descricao: z.string().optional(),
            data: z.date().optional(),
          })).optional().default([]),
        })).optional().default([]),
        materiais: z.array(z.object({
          id: z.number().optional(),
          nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
          preco: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
          quantidade: z.number().min(1, "Quantidade deve ser pelo menos 1"),
          rubrica: z.nativeEnum(Rubrica).default(Rubrica.MATERIAIS),
          ano_utilizacao: z.number().int().min(2000, "Ano deve ser válido").max(2100, "Ano deve ser válido"),
        })).optional().default([]),
        recursos: z.array(z.object({
          userId: z.string(),
          mes: z.number().min(1).max(12),
          ano: z.number().int().min(2000).max(2100),
          ocupacao: z.union([z.string(), z.number()]).transform(val => 
            typeof val === 'string' ? parseFloat(val) : val
          ),
          workpackageId: z.string().optional(),
        })).optional().default([]),
      })).optional().default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
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
        
        for (const wp of input.workpackages) {
          if (wp.inicio && wp.fim) {
            if (wp.inicio > wp.fim) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Workpackage "${wp.nome}": A data de fim deve ser posterior à data de início`,
              });
            }
            
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
          
          for (const tarefa of wp.tarefas) {
            if (tarefa.inicio && tarefa.fim) {
              if (tarefa.inicio > tarefa.fim) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Tarefa "${tarefa.nome}": A data de fim deve ser posterior à data de início`,
                });
              }
              
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
        
        // Extrair o ID do utilizador da sessão
        const userId = ctx.session.user.id;
        
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
            // Usar a sintaxe de relacionamento do Prisma para o responsável
            responsavel: {
              connect: {
                id: input.responsavelId || userId
              }
            },
            ...(input.financiamentoId ? {
              financiamento: {
                connect: {
                  id: input.financiamentoId
                }
              }
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
            responsavel: {
              select: {
                id: true, 
                name: true,
                email: true
              }
            },
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
        
        for (const wpInput of input.workpackages) {
          if (!wpInput.recursos || wpInput.recursos.length === 0) continue;
          
          const workpackage = projeto.workpackages.find(w => w.nome === wpInput.nome);
          if (!workpackage) continue;
          
          for (const recurso of wpInput.recursos) {
            try {
              await ctx.db.alocacaoRecurso.create({
                data: {
                  workpackageId: workpackage.id,
                  userId: recurso.userId,
                  mes: recurso.mes,
                  ano: recurso.ano,
                  ocupacao: new Decimal(recurso.ocupacao)
                }
              });
            } catch (error) {
              console.error(`Erro ao criar alocação: ${error}`);
            }
          }
        }
        
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