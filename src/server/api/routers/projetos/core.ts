import { z } from "zod";
import { protectedProcedure, publicProcedure, createTRPCRouter } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { Prisma, ProjetoEstado, type Notificacao } from "@prisma/client";
import { handlePrismaError } from "../../utils";
import { Decimal } from "decimal.js";
import { triggerPusherEvent, CHANNELS, EVENTS } from "../../../lib/pusher";
import { projetoFilterSchema, createProjetoCompletoSchema, dateValidationSchema, updateProjetoSchema } from "./schemas";

export const coreProjetoRouter = createTRPCRouter({
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
        tipo: "STANDARD" as const, // <-- garantir que só devolve STANDARD, assim não mostra a atividade económica
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

// Criar projeto completo com workpackages, tarefas, entregáveis, materiais e alocações
create: protectedProcedure
  .input(createProjetoCompletoSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      // --- Pre-Transaction Validations ---
      if (input.inicio && input.fim) {
        const parsedDates = dateValidationSchema.safeParse({ inicio: input.inicio, fim: input.fim });
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

      // Use createdProjeto.id which contains the ID returned from transaction
      const projectId = createdProjeto.id;

      // Notificações para os admins
      adminIds.forEach(adminId => {
        if (adminId !== targetUserId) { // Não notificar o admin se ele for o responsável (já notificado acima)
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

      try {
        const notificacoesCriadas: Notificacao[] = await Promise.all(notificationPromises);
        console.log("[Notificações Projeto] Emitting events via Pusher:", { count: notificacoesCriadas.length, projetoId: projectId });
        for (const notificacao of notificacoesCriadas) {
          if (notificacao && notificacao.destinatarioId) { 
            try { 
              const channelName = `${CHANNELS.NOTIFICACOES_GERAIS}-${notificacao.destinatarioId}`;
              await triggerPusherEvent(channelName, EVENTS.NOVA_NOTIFICACAO, notificacao);
            }
            catch (emitError) { console.error(`[Notificações Projeto] Failed to emit Pusher event for notification ${notificacao?.id}:`, emitError); }
          } else {
            console.warn("[Notificações Projeto] Skipping Pusher event for notification due to missing data:", notificacao);
          }
        }
      } catch (notificationError) {
        console.error("[Notificações Projeto] Failed to create/emit notifications after transaction:", notificationError);
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
      // Verificar se o projeto existe primeiro
      const projetoExistente = await ctx.db.projeto.findUnique({
        where: { id },
      });

      if (!projetoExistente) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Projeto não encontrado",
        });
      }

      // Buscar workpackages do projeto
      const workpackages = await ctx.db.workpackage.findMany({
        where: { projetoId: id },
        include: {
          tarefas: true,
        },
      });

      // Apagar tarefas dos workpackages
      for (const wp of workpackages) {
        if (wp.tarefas.length > 0) {
          await ctx.db.tarefa.deleteMany({
            where: { workpackageId: wp.id },
          });
        }
      }

      // Apagar workpackages
      await ctx.db.workpackage.deleteMany({
        where: { projetoId: id },
      });

      // Apagar o projeto
      await ctx.db.projeto.delete({
        where: { id },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      
      console.error("Erro ao apagar projeto:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao apagar projeto",
        cause: error,
      });
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

        // Nova lógica: se a data de início já passou ou é hoje, estado = EM_DESENVOLVIMENTO
        let novoEstado: ProjetoEstado = ProjetoEstado.APROVADO;
        if (projetoCompleto.inicio) {
          const hoje = new Date();
          const inicioProjeto = new Date(projetoCompleto.inicio);
          // Ignorar horas/minutos/segundos para comparação de datas
          hoje.setHours(0,0,0,0);
          inicioProjeto.setHours(0,0,0,0);
          if (inicioProjeto <= hoje) {
            novoEstado = ProjetoEstado.EM_DESENVOLVIMENTO;
          }
        }

        // Atualizar o projeto com o novo estado e guardar o snapshot
        const projetoAtualizado = await ctx.db.projeto.update({
          where: { id },
          data: { 
            estado: novoEstado,
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

        // Criar notificação para o responsável sobre a aprovação se existir responsável
        if (projeto.responsavelId) {
          const notificacaoAprovacao = await ctx.db.notificacao.create({
            data: {
              titulo: `Candidatura "${projeto.nome}" aprovada`,
              descricao: `A sua candidatura "${projeto.nome}" foi aprovada por ${user.name}.`,
              entidade: "PROJETO", 
              entidadeId: projeto.id,
              urgencia: "ALTA",
              destinatario: {
                connect: { id: projeto.responsavelId },
              },
              estado: "NAO_LIDA",
            },
          });
          const channelNameAprovacao = `${CHANNELS.NOTIFICACOES_GERAIS}-${notificacaoAprovacao.destinatarioId}`;
          await triggerPusherEvent(channelNameAprovacao, EVENTS.NOVA_NOTIFICACAO, notificacaoAprovacao);
        }


        return {
          success: true,
          message: `Candidatura "${projeto.nome}" aprovada`,
          data: projetoAtualizado,
        };
      } 
      // Se não for para aprovar, elimina o projeto
      else {
        // Criar notificação para o responsável sobre a rejeição antes de eliminar
        if (projeto.responsavelId) { // Verificar se o responsável existe
          const notificacaoRejeicao = await ctx.db.notificacao.create({
            data: {
              titulo: `Candidatura "${projeto.nome}" foi rejeitada`,
              descricao: `A sua candidatura "${projeto.nome}" foi rejeitada por ${user.name}.`,
              entidade: "PROJETO",
              entidadeId: projeto.id,
              urgencia: "ALTA",
              destinatario: {
                connect: { id: projeto.responsavelId }, // Adicionado '!' porque verificamos acima
              },
              estado: "NAO_LIDA",
            },
          });

          // Emitir evento de notificação
          const channelNameRejeicao = `${CHANNELS.NOTIFICACOES_GERAIS}-${notificacaoRejeicao.destinatarioId}`;
          await triggerPusherEvent(channelNameRejeicao, EVENTS.NOVA_NOTIFICACAO, notificacaoRejeicao);
        } else {
          console.warn(`[Notificações Projeto] Tentativa de notificar rejeição para projeto sem responsável: ${projeto.id}`);
        }

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
          message: `Candidatura "${projeto.nome}" rejeitada`,
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
});