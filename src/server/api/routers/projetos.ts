import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Prisma, ProjetoEstado, Rubrica } from "@prisma/client";
import { handlePrismaError } from "../utils";
import { paginationSchema } from "../schemas/common";
import { Decimal } from "decimal.js";
import { ee } from "./notificacoes";

// Schema base para projeto
export const projetoBaseSchema = z.object({
  nome: z
    .string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(255, "Nome deve ter no máximo 255 caracteres"),
  descricao: z.string().optional(),
  inicio: z.coerce.date().optional(),
  fim: z.coerce.date().optional(),
  estado: z.nativeEnum(ProjetoEstado).optional().default(ProjetoEstado.RASCUNHO),
  overhead: z.coerce.number().min(0).max(100).default(0),
  taxa_financiamento: z.coerce.number().min(0).max(100).default(0),
  valor_eti: z.coerce.number().min(0).default(0),
  financiamentoId: z.coerce
    .number()
    .int("ID do financiamento deve ser um número inteiro")
    .optional(),
});

// Schema para criação de projeto
export const createProjetoSchema = projetoBaseSchema;

// Schema para atualização de projeto
export const updateProjetoSchema = z.object({
  id: z.string().uuid("ID do projeto inválido"),
  nome: z.string().optional(),
  descricao: z.string().optional(),
  inicio: z.date().optional(),
  fim: z.date().optional(),
  overhead: z.number().optional(),
  taxa_financiamento: z.number().optional(),
  valor_eti: z.number().optional(),
  financiamentoId: z.number().optional(),
  estado: z
    .enum(["RASCUNHO", "PENDENTE", "APROVADO", "EM_DESENVOLVIMENTO", "CONCLUIDO"])
    .optional(),
});

// Schema para filtros de projeto
export const projetoFilterSchema = z
  .object({
    search: z.string().optional(),
    estado: z.nativeEnum(ProjetoEstado).optional(),
    financiamentoId: z.coerce
      .number()
      .int("ID do financiamento deve ser um número inteiro")
      .optional(),
  })
  .merge(paginationSchema);

// Schema para validação de datas
export const projetoDateValidationSchema = z
  .object({
    inicio: z.coerce.date().optional(),
    fim: z.coerce.date().optional(),
  })
  .refine(
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
  nome: z
    .string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(255, "Nome deve ter no máximo 255 caracteres"),
  descricao: z.string().optional(),
  inicio: z.date().optional(),
  fim: z.date().optional(),
  estado: z.nativeEnum(ProjetoEstado).optional().default(ProjetoEstado.RASCUNHO),
  financiamentoId: z.number().optional(),
  responsavelId: z.string().optional(),
  overhead: z.number().min(0).max(100).default(0),
  taxa_financiamento: z.number().min(0).max(100).default(0),
  valor_eti: z.number().min(0).default(0),
  rascunhoId: z.string().optional(), 

  // Workpackages e seus sub-dados
  workpackages: z
    .array(
      z.object({
        id: z.string().optional(), // ID temporário fornecido pelo frontend
        nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
        descricao: z.string().optional(),
        inicio: z.date().optional(),
        fim: z.date().optional(),
        estado: z.boolean().optional().default(false),

        // Tarefas do workpackage
        tarefas: z
          .array(
            z.object({
              nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
              descricao: z.string().optional(),
              inicio: z.date().optional(),
              fim: z.date().optional(),
              estado: z.boolean().optional().default(false),

              // Entregáveis da tarefa
              entregaveis: z
                .array(
                  z.object({
                    nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
                    descricao: z.string().optional(),
                    data: z.date().optional(),
                  })
                )
                .optional()
                .default([]),
            })
          )
          .optional()
          .default([]),

        // Materiais do workpackage
        materiais: z
          .array(
            z.object({
              id: z.number().optional(), // ID temporário fornecido pelo frontend
              nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
              preco: z
                .union([z.number(), z.string()])
                .transform((val) => (typeof val === "string" ? parseFloat(val) : val)),
              quantidade: z.number().min(1, "Quantidade deve ser pelo menos 1"),
              rubrica: z.nativeEnum(Rubrica).default(Rubrica.MATERIAIS),
              ano_utilizacao: z
                .number()
                .int()
                .min(2000, "Ano deve ser válido")
                .max(2100, "Ano deve ser válido"),
            })
          )
          .optional()
          .default([]),

        // Alocações de recursos do workpackage
        recursos: z
          .array(
            z.object({
              userId: z.string(),
              mes: z.number().min(1).max(12),
              ano: z.number().int().min(2000).max(2100),
              ocupacao: z
                .union([z.string(), z.number()])
                .transform((val) => (typeof val === "string" ? parseFloat(val) : val)),
              workpackageId: z.string().optional(), // Será preenchido após criar o workpackage
            })
          )
          .optional()
          .default([]),
      })
    )
    .optional()
    .default([]),
});

// Tipos inferidos dos schemas
export type CreateProjetoInput = z.infer<typeof createProjetoSchema>;
export type UpdateProjetoInput = z.infer<typeof updateProjetoSchema>;
export type ProjetoFilterInput = z.infer<typeof projetoFilterSchema>;
export type CreateProjetoCompletoInput = z.infer<typeof createProjetoCompletoSchema>;

// Adicionar stubs temporários para manter compatibilidade
export const projetoRouter = createTRPCRouter({
  // Obter todos os projetos
  findAll: publicProcedure
    .input(projetoFilterSchema.optional().default({}))
    .query(async ({ ctx, input }) => {
      try {
        const { search, estado, financiamentoId, page = 1, limit = 10 } = input;

        const userId = ctx.session?.user?.id;

        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Utilizador não autenticado",
          });
        }

        const user = await ctx.db.user.findUnique({
          where: { id: userId },
          select: { permissao: true },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado",
          });
        }

        const isComum = user.permissao === "COMUM";

        const where: Prisma.ProjetoWhereInput = {
          ...(search && {
            OR: [
              { nome: { contains: search, mode: "insensitive" } },
              { descricao: { contains: search, mode: "insensitive" } },
            ],
          }),
          ...(estado && { estado }),
          ...(financiamentoId && { financiamentoId }),
          // Se for utilizador comum, vai mostrar apenas projetos onde está alocado
          ...(isComum && {
            workpackages: {
              some: {
                recursos: {
                  some: {
                    userId: userId,
                  },
                },
              },
            },
          }),
          tipo: "STANDARD", // <-- garantir que só devolve STANDARD, assim não mostra a atividade económica
        };

        const total = await ctx.db.projeto.count({ where });

        const projetos = await ctx.db.projeto.findMany({
          where,
          orderBy: { nome: "asc" },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            financiamento: true,
            responsavel: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            workpackages: {
              include: {
                tarefas: true,
                recursos: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        salario: true,
                      },
                    },
                  },
                },
                materiais: true,
              },
            },
          },
        });

        // Vai sempre buscar rascunhos do utilizador autenticado
        const rascunhos = await ctx.db.rascunho.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
        });

        // Processar projetos (sem cálculos financeiros)
        const projetosProcessados = projetos.map((projeto) => {
          // Cálculo do progresso físico
          let totalTarefas = 0;
          let tarefasConcluidas = 0;

          projeto.workpackages?.forEach((wp) => {
            totalTarefas += wp.tarefas.length;
            tarefasConcluidas += wp.tarefas.filter((tarefa) => tarefa.estado === true).length;
          });

          const progresso =
            totalTarefas > 0 ? Math.round((tarefasConcluidas / totalTarefas) * 100) : 0;

          return {
            ...projeto,
            progresso,
            responsavel: projeto.responsavel,
          };
        });

        // Processar rascunhos para combinar com a estrutura de projetos
        const rascunhosProcessados = rascunhos.map((rascunho) => ({
          id: rascunho.id,
          nome: rascunho.titulo,
          descricao: "Rascunho",
          estado: ProjetoEstado.RASCUNHO,
          progresso: 0,
          inicio: rascunho.createdAt,
          fim: null,
          updatedAt: rascunho.updatedAt,
          isRascunho: true,
        }));

        // Combinar projetos e rascunhos
        const allItems = [...projetosProcessados, ...rascunhosProcessados];

        return {
          data: {
            items: allItems,
            pagination: {
              total: total + rascunhos.length,
              pages: Math.ceil((total + rascunhos.length) / limit),
              page,
              limit,
            },
          },
        };
      } catch (error) {
        console.error("Erro ao listar projetos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao listar projetos",
          cause: error,
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
            responsavel: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            workpackages: {
              include: {
                tarefas: {
                  include: {
                    entregaveis: true,
                  },
                },
                materiais: true,
                recursos: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        salario: true,
                      },
                    },
                  },
                },
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

        let totalTarefas = 0;
        let tarefasConcluidas = 0;

        projeto.workpackages?.forEach((wp) => {
          totalTarefas += wp.tarefas.length;
          tarefasConcluidas += wp.tarefas.filter((tarefa) => tarefa.estado === true).length;
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
  create: protectedProcedure.input(createProjetoSchema).mutation(async ({ ctx, input }) => {
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
        valor_eti = 0,
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
          connect: { id: userId },
        },
        ...(financiamentoId
          ? {
              financiamento: {
                connect: { id: financiamentoId },
              },
            }
          : {}),
      } as any;

      const projeto = await ctx.db.projeto.create({
        data: createData,
        include: {
          financiamento: true,
          responsavel: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Buscar todos os admins
      const admins = await ctx.db.user.findMany({
        where: {
          permissao: "ADMIN"
        },
        select: {
          id: true
        }
      });

      // Criar notificações
      const notificacoes = [];

      // Notificação para cada admin (exceto se for o próprio criador)
      for (const admin of admins) {
        if (admin.id !== userId) {
          notificacoes.push(
            ctx.db.notificacao.create({
              data: {
                titulo: `Novo projeto criado por ${ctx.session.user.name}`,
                descricao: `Um novo projeto "${nome}" foi criado.`,
                entidade: "PROJETO",
                entidadeId: projeto.id,
                urgencia: "MEDIA",
                destinatario: {
                  connect: { id: admin.id },
                },
                estado: "NAO_LIDA",
              },
            })
          );
        }
      }

      // Criar todas as notificações e emitir eventos
      const notificacoesCriadas = await Promise.all(notificacoes);
      
      // Emitir eventos para cada notificação
      for (const notificacao of notificacoesCriadas) {
        ee.emit("notificacao", notificacao);
      }

      return projeto;
    } catch (error) {
      return handlePrismaError(error);
    }
  }),

  // Atualizar projeto
  update: protectedProcedure.input(updateProjetoSchema).mutation(async ({ ctx, input }) => {
    try {
      // Get the project first to check permissions
      const projeto = await ctx.db.projeto.findUnique({
        where: { id: input.id },
        select: { responsavelId: true },
      });

      if (!projeto) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Projeto não encontrado",
        });
      }

      // Get user with permission
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { permissao: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Utilizador não encontrado",
        });
      }

      // Check if user has permission (admin, gestor or responsavel)
      const isAdmin = user.permissao === "ADMIN";
      const isGestor = user.permissao === "GESTOR";
      const isResponsavel = projeto.responsavelId === ctx.session.user.id;

      if (!isAdmin && !isGestor && !isResponsavel) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sem permissão para editar este projeto",
        });
      }

      // Prepare update data
      const updateData: Prisma.ProjetoUpdateInput = {
        nome: input.nome,
        descricao: input.descricao,
        inicio: input.inicio,
        fim: input.fim,
        overhead: input.overhead,
        taxa_financiamento: input.taxa_financiamento,
        valor_eti: input.valor_eti,
        ...(input.financiamentoId !== undefined && {
          financiamento: input.financiamentoId
            ? {
                connect: { id: input.financiamentoId },
              }
            : { disconnect: true },
        }),
      };

      // Update the project
      const updatedProjeto = await ctx.db.projeto.update({
        where: { id: input.id },
        data: updateData,
        include: {
          responsavel: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          financiamento: true,
          workpackages: {
            include: {
              tarefas: {
                include: {
                  entregaveis: true,
                },
              },
              materiais: true,
              recursos: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      salario: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return updatedProjeto;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error("Erro ao atualizar projeto:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao atualizar projeto",
        cause: error,
      });
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
    .input(
      z.object({
        id: z.string().uuid("ID do projeto inválido"),
        estado: z.nativeEnum(ProjetoEstado),
      })
    )
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
    .input(createProjetoCompletoSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // --- Pre-Transaction Validations ---
        if (input.inicio && input.fim) {
          const parsedDates = projetoDateValidationSchema.safeParse({ inicio: input.inicio, fim: input.fim });
          if (!parsedDates.success) {
            throw new TRPCError({ code: "BAD_REQUEST", message: parsedDates.error.errors.map(e => e.message).join(", ") });
          }
        }
        for (const wp of input.workpackages) {
          if (wp.inicio && wp.fim) {
            if (wp.inicio > wp.fim) throw new TRPCError({ code: "BAD_REQUEST", message: `Workpackage "${wp.nome}": A data de fim deve ser posterior à data de início` });
            if (input.inicio && wp.inicio < input.inicio) throw new TRPCError({ code: "BAD_REQUEST", message: `Workpackage "${wp.nome}": A data de início não pode ser anterior à data de início do projeto` });
            if (input.fim && wp.fim > input.fim) throw new TRPCError({ code: "BAD_REQUEST", message: `Workpackage "${wp.nome}": A data de fim não pode ser posterior à data de fim do projeto` });
          }
          for (const tarefa of wp.tarefas) {
            if (tarefa.inicio && tarefa.fim) {
              if (tarefa.inicio > tarefa.fim) throw new TRPCError({ code: "BAD_REQUEST", message: `Tarefa "${tarefa.nome}": A data de fim deve ser posterior à data de início` });
              if (wp.inicio && tarefa.inicio < wp.inicio) throw new TRPCError({ code: "BAD_REQUEST", message: `Tarefa "${tarefa.nome}": A data de início não pode ser anterior à data de início do workpackage` });
              if (wp.fim && tarefa.fim > wp.fim) throw new TRPCError({ code: "BAD_REQUEST", message: `Tarefa "${tarefa.nome}": A data de fim não pode ser posterior à data de fim do workpackage` });
            }
          }
        }

        // --- Pre-Transaction Data Fetching ---
        const userId = ctx.session.user.id;
        const userName = ctx.session.user.name || "Utilizador";
        const targetUserId = input.responsavelId || userId;

        const userExists = await ctx.db.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
        if (!userExists) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "O utilizador responsável especificado não existe" });
        }

        const admins = await ctx.db.user.findMany({ where: { permissao: "ADMIN" }, select: { id: true } });
        const adminIds = admins.map(a => a.id);

        // --- Database Transaction ---
        // Revert to creating everything nested, except allocations which need WP IDs
        const createdProjeto = await ctx.db.$transaction(async (tx) => {
          // 1. Handle Rascunho
          if (input.rascunhoId) {
            const rascunho = await tx.rascunho.findFirst({ where: { id: input.rascunhoId, userId: ctx.session.user.id } });
            if (rascunho) {
              await tx.rascunho.delete({ where: { id: input.rascunhoId } });
            }
          }

          // 2. Create Projeto with nested WPs, Tarefas, Entregaveis, Materiais
          const projeto = await tx.projeto.create({
            data: {
              nome: input.nome,
              descricao: input.descricao,
              inicio: input.inicio,
              fim: input.fim,
              estado: input.estado,
              overhead: input.overhead,
              taxa_financiamento: input.taxa_financiamento,
              valor_eti: input.valor_eti,
              responsavel: { connect: { id: targetUserId } },
              ...(input.financiamentoId ? { financiamento: { connect: { id: input.financiamentoId } } } : {}),
              workpackages: {
                create: input.workpackages.map((wp) => ({
                  // No frontendId needed now
                  nome: wp.nome,
                  descricao: wp.descricao,
                  inicio: wp.inicio,
                  fim: wp.fim,
                  estado: wp.estado,
                  tarefas: {
                    create: wp.tarefas.map((t) => ({
                      nome: t.nome,
                      descricao: t.descricao,
                      inicio: t.inicio,
                      fim: t.fim,
                      estado: t.estado,
                      entregaveis: {
                        create: t.entregaveis.map((e) => ({
                          nome: e.nome,
                          descricao: e.descricao,
                          data: e.data,
                        })),
                      },
                    })),
                  },
                  // Create materiais nested again
                  materiais: {
                     create: wp.materiais.map((m) => {
                       const priceAsNumber = typeof m.preco === 'string' ? parseFloat(m.preco) : m.preco;
                       if (isNaN(priceAsNumber)) {
                          throw new TRPCError({ code: 'BAD_REQUEST', message: `Preço inválido para material "${m.nome}" no workpackage "${wp.nome}"` });
                       }
                       return {
                         nome: m.nome,
                         preco: new Decimal(priceAsNumber),
                         quantidade: m.quantidade,
                         rubrica: m.rubrica,
                         ano_utilizacao: m.ano_utilizacao,
                       };
                     }),
                  },
                })),
              },
            },
            // Include workpackages to get their IDs for resource allocation
            include: {
              workpackages: { select: { id: true, nome: true } }, // Include nome for mapping
            },
          });

          // 3. Create AlocacaoRecursos (still needs separate loop after WPs are created)
          const allocationPromises: Promise<any>[] = [];
          for (const wpInput of input.workpackages) {
            // Find the corresponding created workpackage using nome (assuming nome is unique within this input context)
            const createdWp = projeto.workpackages.find(pwp => pwp.nome === wpInput.nome);
            if (!createdWp || !wpInput.recursos || wpInput.recursos.length === 0) continue;

            for (const recurso of wpInput.recursos) {
              const ocupacaoAsNumber = typeof recurso.ocupacao === 'string' ? parseFloat(recurso.ocupacao) : recurso.ocupacao;
              if (isNaN(ocupacaoAsNumber)) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: `Ocupação inválida para recurso ${recurso.userId} no workpackage "${wpInput.nome}"` });
              }
              // Add creation to promises array to run concurrently within transaction
              allocationPromises.push(tx.alocacaoRecurso.create({
                data: {
                  workpackageId: createdWp.id,
                  userId: recurso.userId,
                  mes: recurso.mes,
                  ano: recurso.ano,
                  ocupacao: new Decimal(ocupacaoAsNumber),
                },
              }));
            }
          }
          // Execute all allocation creations
          await Promise.all(allocationPromises);

          // Return the created project (only ID needed for post-transaction)
          return { id: projeto.id }; // Return just the ID

        }, { timeout: 10000 }); // Timeout can likely be reduced now

        // --- Post-Transaction Notifications ---
        const notificationPromises: Promise<any>[] = [];
        const recursosAlocadosUnicos = new Set<string>();

        // Use createdProjeto.id which contains the ID returned from transaction
        const projectId = createdProjeto.id;

        notificationPromises.push(ctx.db.notificacao.create({
          data: {
            titulo: `Novo projeto criado: ${input.nome}`,
            descricao: `O projeto "${input.nome}" foi criado e você é o responsável.`,
            entidade: "PROJETO", entidadeId: projectId, urgencia: "MEDIA",
            destinatario: { connect: { id: targetUserId } }, estado: "NAO_LIDA",
          },
        }));

        adminIds.forEach(adminId => {
          if (adminId !== targetUserId) {
            notificationPromises.push(ctx.db.notificacao.create({
              data: {
                titulo: `Novo projeto criado por ${userName}`,
                descricao: `Um novo projeto "${input.nome}" foi criado.`,
                entidade: "PROJETO", entidadeId: projectId, urgencia: "MEDIA",
                destinatario: { connect: { id: adminId } }, estado: "NAO_LIDA",
              },
            }));
          }
        });

        for (const wpInput of input.workpackages) {
          for (const recurso of wpInput.recursos) {
            if (!recursosAlocadosUnicos.has(recurso.userId)) {
              recursosAlocadosUnicos.add(recurso.userId);
              if (recurso.userId !== targetUserId) {
                notificationPromises.push(ctx.db.notificacao.create({
                  data: {
                    titulo: `Nova alocação no projeto ${input.nome}`,
                    descricao: `Você foi alocado no projeto "${input.nome}".`,
                    entidade: "ALOCACAO", entidadeId: projectId,
                    urgencia: "MEDIA",
                    destinatario: { connect: { id: recurso.userId } }, estado: "NAO_LIDA",
                  },
                }));
              }
            }
          }
        }

        try {
          const notificacoesCriadas = await Promise.all(notificationPromises);
          console.log("[Notificações Projeto] Emitting events:", { count: notificacoesCriadas.length, projetoId: projectId });
          notificacoesCriadas.forEach(notificacao => {
            try { ee.emit("notificacao", notificacao); }
            catch (emitError) { console.error(`[Notificações Projeto] Failed to emit event for notification ${notificacao?.id}:`, emitError); }
          });
        } catch (notificationError) {
          console.error("[Notificações Projeto] Failed to create notifications after transaction:", notificationError);
        }

        // --- Return Final Data ---
        const finalProjectData = await ctx.db.projeto.findUnique({
          where: { id: projectId },
          include: {
            financiamento: true,
            responsavel: { select: { id: true, name: true, email: true } },
            workpackages: {
              include: {
                tarefas: { include: { entregaveis: true } },
                materiais: true,
                recursos: { include: { user: { select: { id: true, name: true } } } }
              }
            }
          },
        });

        if (!finalProjectData) {
          console.error(`Failed to fetch created project data post-transaction: ${projectId}`);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Projeto criado, mas ocorreu um erro ao buscar os dados finais." });
        }

        return {
          success: true,
          data: finalProjectData,
        };
      } catch (error) {
        console.error("Erro detalhado ao criar projeto completo:", error);
        if (error instanceof TRPCError) throw error;
        if (error instanceof z.ZodError) {
          const validationErrors = error.errors.map(e => `${e.path.join('.') || 'input'}: ${e.message}`).join('; ');
          throw new TRPCError({ code: "BAD_REQUEST", message: `Erro de validação: ${validationErrors}`, cause: error });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             console.error("Prisma Error Code:", error.code);
        }
        return handlePrismaError(error);
      }
    }),

  // Validar projeto (aprovar ou rejeitar)
  validarProjeto: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid("ID do projeto inválido"),
        aprovar: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id } = input;
        
        // Verificar se o projeto existe
        const projeto = await ctx.db.projeto.findUnique({
          where: { id },
          select: { 
            id: true,
            nome: true,
            estado: true,
            responsavelId: true,
          },
        });

        if (!projeto) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Projeto não encontrado",
          });
        }

        // Verificar se o projeto está em estado que permite validação
        if (projeto.estado !== ProjetoEstado.PENDENTE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Apenas projetos pendentes podem ser validados",
          });
        }

        // Verificar permissões do utilizador (apenas ADMIN ou GESTOR)
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { permissao: true, name: true },
        });

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Utilizador não encontrado",
          });
        }

        const isAdmin = user.permissao === "ADMIN";
        const isGestor = user.permissao === "GESTOR";

        if (!isAdmin && !isGestor) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Sem permissão para validar projetos",
          });
        }

        // Se for para aprovar, atualiza o estado
        if (input.aprovar) {
          // Buscar o projeto completo com todas as relações
          const projetoCompleto = await ctx.db.projeto.findUnique({
            where: { id },
            include: {
              financiamento: true,
              responsavel: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              workpackages: {
                include: {
                  tarefas: {
                    include: {
                      entregaveis: true,
                    },
                  },
                  materiais: true,
                  recursos: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          salario: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          if (!projetoCompleto) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Projeto não encontrado com todas as relações",
            });
          }

          // Atualizar o projeto com o novo estado e guardar o snapshot
          const projetoAtualizado = await ctx.db.projeto.update({
            where: { id },
            data: { 
              estado: ProjetoEstado.APROVADO,
              aprovado: projetoCompleto, // Salvamos o estado completo do projeto
            } as Prisma.ProjetoUpdateInput,
            include: {
              financiamento: true,
              responsavel: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              workpackages: {
                include: {
                  tarefas: {
                    include: {
                      entregaveis: true,
                    },
                  },
                  materiais: true,
                  recursos: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          salario: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          // Criar notificação para o responsável sobre a aprovação
          const notificacaoAprovacao = await ctx.db.notificacao.create({
            data: {
              titulo: `Projeto "${projeto.nome}" foi aprovado`,
              descricao: `O seu projeto "${projeto.nome}" foi aprovado por ${user.name}.`,
              entidade: "PROJETO",
              entidadeId: projeto.id,
              urgencia: "ALTA",
              destinatario: {
                connect: { id: projeto.responsavelId! },
              },
              estado: "NAO_LIDA",
            },
          });

          // Emitir evento de notificação
          ee.emit("notificacao", notificacaoAprovacao);

          return {
            success: true,
            message: `Projeto "${projeto.nome}" aprovado com sucesso`,
            data: projetoAtualizado,
          };
        } 
        // Se não for para aprovar, elimina o projeto
        else {
          // Criar notificação para o responsável sobre a rejeição antes de eliminar
          const notificacaoRejeicao = await ctx.db.notificacao.create({
            data: {
              titulo: `Projeto "${projeto.nome}" foi rejeitado`,
              descricao: `O seu projeto "${projeto.nome}" foi rejeitado por ${user.name} e foi eliminado.`,
              entidade: "PROJETO",
              entidadeId: projeto.id,
              urgencia: "ALTA",
              destinatario: {
                connect: { id: projeto.responsavelId! },
              },
              estado: "NAO_LIDA",
            },
          });

          // Emitir evento de notificação
          ee.emit("notificacao", notificacaoRejeicao);

          // Antes de excluir o projeto, precisamos remover os relacionamentos para evitar violações de chave estrangeira
          // 1. Buscar todos os workpackages relacionados ao projeto
          const workpackages = await ctx.db.workpackage.findMany({
            where: { projetoId: id },
            include: {
              tarefas: {
                include: {
                  entregaveis: true
                }
              },
              recursos: true,
              materiais: true
            }
          });

          // 2. Para cada workpackage, remover seus relacionamentos em uma transação
          await ctx.db.$transaction(async (tx) => {
            for (const wp of workpackages) {
              // 2.1 Remover recursos (alocações)
              if (wp.recursos.length > 0) {
                await tx.alocacaoRecurso.deleteMany({
                  where: { workpackageId: wp.id }
                });
              }

              // 2.2 Remover materiais
              if (wp.materiais.length > 0) {
                await tx.material.deleteMany({
                  where: { workpackageId: wp.id }
                });
              }

              // 2.3 Para cada tarefa, remover seus entregáveis
              for (const tarefa of wp.tarefas) {
                if (tarefa.entregaveis.length > 0) {
                  await tx.entregavel.deleteMany({
                    where: { tarefaId: tarefa.id }
                  });
                }
              }

              // 2.4 Remover tarefas
              if (wp.tarefas.length > 0) {
                await tx.tarefa.deleteMany({
                  where: { workpackageId: wp.id }
                });
              }
            }

            // 3. Remover workpackages
            await tx.workpackage.deleteMany({
              where: { projetoId: id }
            });

            // 4. Finalmente, remover o projeto
            await tx.projeto.delete({
              where: { id }
            });
          });

          return {
            success: true,
            message: `Projeto "${projeto.nome}" rejeitado e eliminado`,
            data: null,
          };
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Erro ao validar projeto:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao validar projeto",
          cause: error,
        });
      }
    }),

  // Obter a atividade económica (única)
  getAtividadeEconomica: publicProcedure.query(async ({ ctx }) => {
    const projeto = await ctx.db.projeto.findFirst({
      where: { tipo: "ATIVIDADE_ECONOMICA" },
      include: {
        workpackages: {
          include: {
            tarefas: {
              include: {
                entregaveis: true,
              },
            },
            materiais: true,
            recursos: {
              include: {
                user: true,
              },
            },
          },
        },
        financiamento: true,
      },
    });
    if (!projeto) {
      throw new Error("Atividade económica não encontrada");
    }

    // Calcular início e fim com base nos workpackages
    let inicio: Date | null = null;
    let fim: Date | null = null;
    if (projeto.workpackages && projeto.workpackages.length > 0) {
      const sortedByStart = projeto.workpackages
        .filter(wp => wp.inicio != null)
        .sort((a, b) => {
          const aDate = wpToDate(a.inicio);
          const bDate = wpToDate(b.inicio);
          return (aDate ? aDate.getTime() : Infinity) - (bDate ? bDate.getTime() : Infinity);
        });
      const sortedByEnd = projeto.workpackages
        .filter(wp => wp.fim != null)
        .sort((a, b) => {
          const aDate = wpToDate(a.fim);
          const bDate = wpToDate(b.fim);
          return (aDate ? aDate.getTime() : Infinity) - (bDate ? bDate.getTime() : Infinity);
        });
      if (sortedByStart.length > 0 && sortedByStart[0]) inicio = wpToDate(sortedByStart[0].inicio);
      if (sortedByEnd.length > 0 && sortedByEnd[sortedByEnd.length - 1]) fim = wpToDate(sortedByEnd[sortedByEnd.length - 1]?.fim);
    }

    function wpToDate(val: any): Date | null {
      if (!val) return null;
      if (val instanceof Date) return val;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }

    return {
      ...projeto,
      inicio,
      fim,
    };
  }),
});
