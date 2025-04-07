import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Permissao, Regime } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { sendPrimeiroAcessoEmail } from "@/emails/utils/email";
import { hash } from "bcryptjs";
import { z } from "zod";
import { createPaginatedResponse, handlePrismaError } from "../utils";
import { paginationSchema, getPaginationParams } from "../schemas/common";
import { format } from "date-fns";
import { Decimal } from "decimal.js";

// Schemas base
const emailSchema = z.string({ required_error: "Email é obrigatório" }).email("Email inválido");

const passwordSchema = z
  .string({ required_error: "Password é obrigatória" })
  .min(8, "Password deve ter pelo menos 8 caracteres")
  .max(32, "Password deve ter no máximo 32 caracteres")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    "Password deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial"
  );

const dateSchema = z.union([
  z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data inválida",
  }),
  z.date(),
  z.null(),
]);

// Schema base para utilizador
const utilizadorBaseSchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório"),
    email: emailSchema,
    foto: z.string().nullable().optional(),
    atividade: z.string().min(1, "Atividade é obrigatória"),
    contratacao: dateSchema,
    username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
    permissao: z.nativeEnum(Permissao),
    regime: z.nativeEnum(Regime),
  })
  .passthrough();

// Schema para criação de utilizador
const createUtilizadorSchema = utilizadorBaseSchema
  .extend({
    password: passwordSchema.optional(),
  })
  .passthrough();

// Schema para atualização de utilizador
const updateUtilizadorSchema = utilizadorBaseSchema.partial();

// Schema para alteração de password
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password atual é obrigatória"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirmação de password é obrigatória"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As passwords não coincidem",
    path: ["confirmPassword"],
  });

// Schema para filtros de utilizador
const utilizadorFilterSchema = z
  .object({
    search: z.string().optional(),
    permissao: z.nativeEnum(Permissao).optional(),
    regime: z.nativeEnum(Regime).optional(),
  })
  .merge(paginationSchema);

// Schema para reset de password
const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});

// Schema para definir nova password após reset
const resetPasswordSchema = z
  .object({
    token: z.string(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirmação de password é obrigatória"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As passwords não coincidem",
    path: ["confirmPassword"],
  });

// Schema para validação de primeiro acesso
const primeiroAcessoSchema = z
  .object({
    token: z.string(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirmação de password é obrigatória"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As passwords não coincidem",
    path: ["confirmPassword"],
  });

// Schema para validação de alocação
const alocacaoValidationSchema = z.object({
  workpackageId: z.string().uuid("ID do workpackage inválido"),
  userId: z.string(),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2000),
  ocupacao: z.number().min(0).max(1),
  // Flag para ignorar a alocação atual quando estiver editando
  ignorarAlocacaoAtual: z.boolean().optional().default(false),
});

// Tipos inferidos dos schemas
export type CreateUtilizadorInput = z.infer<typeof createUtilizadorSchema>;
export type UpdateUtilizadorInput = z.infer<typeof updateUtilizadorSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UtilizadorFilterInput = z.infer<typeof utilizadorFilterSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type PrimeiroAcessoInput = z.infer<typeof primeiroAcessoSchema>;

// Exportar os schemas para uso em validações
export {
  changePasswordSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
  primeiroAcessoSchema,
};

// Tipo estendido para o utilizador com as propriedades que precisamos
type UserWithPermissao = {
  permissao: Permissao;
  id: string;
  // Outras propriedades do utilizador
} & Record<string, any>;

// Router
export const utilizadorRouter = createTRPCRouter({
  // Obter todos os utilizadores
  findAll: protectedProcedure
    .input(utilizadorFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        const { search, permissao, regime, page = 1, limit = 10 } = input || {};

        // Construir condições de filtro
        const where: Prisma.UserWhereInput = {
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
                  { email: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
                  { username: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
                ] as Prisma.UserWhereInput[],
              }
            : {}),
          ...(permissao ? { permissao } : {}),
          ...(regime ? { regime } : {}),
        };

        // Parâmetros de paginação
        const { skip, take } = getPaginationParams(page, limit);

        // Executar query com contagem
        const [users, total] = await Promise.all([
          ctx.db.user.findMany({
            where,
            select: {
              id: true,
              name: true,
              email: true,
              foto: true,
              atividade: true,
              contratacao: true,
              username: true,
              permissao: true,
              regime: true,
              emailVerified: true,
            },
            skip,
            take,
            orderBy: { name: "asc" },
          }),
          ctx.db.user.count({ where }),
        ]);

        return createPaginatedResponse(users, total, page, limit);
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Validar alocação em tempo real
  validateAlocacao: protectedProcedure
    .input(alocacaoValidationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { workpackageId, userId, mes, ano, ocupacao, ignorarAlocacaoAtual } = input;

        // Verificar se o workpackage existe
        const workpackage = await ctx.db.workpackage.findUnique({
          where: { id: workpackageId },
          include: { projeto: true },
        });

        if (!workpackage) {
          return {
            isValid: false,
            message: "Workpackage não encontrado",
          };
        }

        // Verificar se o utilizador existe
        const user = await ctx.db.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return {
            isValid: false,
            message: "Utilizador não encontrado",
          };
        }

        // Validar se a data está dentro do período do workpackage
        if (workpackage.inicio && workpackage.fim) {
          const dataAlocacao = new Date(ano, mes - 1); // Mês é 0-indexed em JS
          const inicioMes = new Date(
            workpackage.inicio.getFullYear(),
            workpackage.inicio.getMonth()
          );
          const fimMes = new Date(workpackage.fim.getFullYear(), workpackage.fim.getMonth());

          if (dataAlocacao < inicioMes || dataAlocacao > fimMes) {
            return {
              isValid: false,
              message: `A alocação deve estar dentro do período do workpackage (${format(workpackage.inicio, "MM/yyyy")} - ${format(workpackage.fim, "MM/yyyy")})`,
            };
          }
        }

        // Buscar todas as alocações existentes do utilizador no mesmo mês/ano
        // Excluindo a alocação atual se estiver em modo de edição
        const whereCondition: Prisma.AlocacaoRecursoWhereInput = {
          userId,
          mes,
          ano,
        };

        // Se estiver editando, excluir a alocação atual da verificação
        if (ignorarAlocacaoAtual) {
          whereCondition.NOT = {
            workpackageId,
          };
        }

        const alocacoesExistentes = await ctx.db.alocacaoRecurso.findMany({
          where: whereCondition,
          select: { ocupacao: true },
        });

        // Calcular a soma das alocações existentes
        const somaOcupacoesExistentes = alocacoesExistentes.reduce(
          (sum, aloc) => sum.add(aloc.ocupacao),
          new Decimal(0)
        );

        // Verificar se a soma com a nova alocação excede 100%
        const ocupacaoDecimal = new Decimal(ocupacao);
        const novaOcupacaoTotal = somaOcupacoesExistentes.add(ocupacaoDecimal);

        if (novaOcupacaoTotal.greaterThan(1)) {
          return {
            isValid: false,
            message: `A ocupação total para ${user.name || userId} em ${mes}/${ano} excederia 100% (${novaOcupacaoTotal.times(100).toFixed(0)}%). Ocupação já alocada: ${somaOcupacoesExistentes.times(100).toFixed(0)}%.`,
          };
        }

        // Se o projeto estiver em estado que não permite edição
        if (workpackage.projeto && ["APROVADO", "CONCLUIDO"].includes(workpackage.projeto.estado)) {
          return {
            isValid: false,
            message: `Não é possível modificar alocações em projetos com status ${workpackage.projeto.estado}`,
          };
        }

        // Todas as validações passaram
        return {
          isValid: true,
          message: null,
        };
      } catch (error) {
        console.error("Erro na validação da alocação:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao validar alocação",
          cause: error,
        });
      }
    }),

  getByWorkpackage: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: workpackageId }) => {
      try {
        const users = await ctx.db.user.findMany({
          where: {
            workpackages: {
              some: {
                workpackageId: workpackageId,
              },
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            foto: true,
            atividade: true,
            regime: true,
            workpackages: {
              where: {
                workpackageId: workpackageId,
              },
              select: {
                mes: true,
                ano: true,
                ocupacao: true,
              },
              orderBy: [{ ano: "asc" }, { mes: "asc" }],
            },
          },
        });

        return users.map((user) => ({
          ...user,
          alocacoes: user.workpackages.map((wp) => ({
            mes: wp.mes,
            ano: wp.ano,
            ocupacao: wp.ocupacao,
          })),
        }));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter utilizadores do workpackage",
          cause: error,
        });
      }
    }),

  // Obter utilizador por ID
  findById: protectedProcedure.input(z.string()).query(async ({ ctx, input: id }) => {
    try {
      const user = await ctx.db.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          foto: true,
          atividade: true,
          contratacao: true,
          username: true,
          permissao: true,
          regime: true,
          emailVerified: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilizador não encontrado",
        });
      }

      return user;
    } catch (error) {
      return handlePrismaError(error);
    }
  }),

  //Obter por username
  getByUsername: protectedProcedure.input(z.string()).query(async ({ ctx, input: username }) => {
    try {
      const user = await ctx.db.user.findUnique({
        where: { username },
        select: {
          id: true,
          name: true,
          email: true,
          foto: true,
          atividade: true,
          contratacao: true,
          username: true,
          permissao: true,
          regime: true,
          emailVerified: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilizador não encontrado",
        });
      }

      return user;
    } catch (error) {
      return handlePrismaError(error);
    }
  }),

  // Criar utilizador
  create: protectedProcedure.input(createUtilizadorSchema).mutation(async ({ ctx, input }) => {
    try {
      // Verificar permissão (apenas admin pode criar utilizadores)
      const user = ctx.session?.user as UserWithPermissao | undefined;
      if (!user || user.permissao !== Permissao.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Não tem permissões para criar utilizadores",
        });
      }

      // Verificar se temos dados de entrada
      if (!input) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Dados de utilizador não fornecidos",
        });
      }

      const { password, ...userData } = input;

      if (process.env.NODE_ENV === "development") {
        console.log("Dados recebidos:", JSON.stringify(input, null, 2));
      }

      // Processar a data de contratação
      const processedUserData = {
        ...userData,
        contratacao: userData.contratacao
          ? typeof userData.contratacao === "string"
            ? new Date(userData.contratacao)
            : userData.contratacao
          : null,
      };

      // Verificar se email já existe
      const existingUser = await ctx.db.user.findUnique({
        where: { email: processedUserData.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este email já está registado",
        });
      }

      // Gerar token para primeiro acesso
      const token = randomUUID();
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);

      // Criar utilizador
      const newUser = await ctx.db.user.create({
        data: {
          ...processedUserData,
          password: password
            ? {
                create: {
                  hash: await hash(password, 10),
                },
              }
            : undefined,
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          foto: true,
          atividade: true,
          contratacao: true,
          permissao: true,
          regime: true,
          emailVerified: true,
        },
      });

      // Criar token para primeiro acesso se não tiver password
      if (!password && newUser.email) {
        await ctx.db.verificationToken.create({
          data: {
            identifier: newUser.email,
            token,
            expires: tokenExpiry,
          },
        });

        // Enviar email de primeiro acesso
        await sendPrimeiroAcessoEmail(newUser.email, newUser.name || "Utilizador", token);
      }

      // Serializar resposta para garantir que as datas sejam convertidas para strings
      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
        foto: newUser.foto,
        atividade: newUser.atividade,
        contratacao: newUser.contratacao ? newUser.contratacao.toISOString() : null,
        permissao: newUser.permissao,
        regime: newUser.regime,
        emailVerified: newUser.emailVerified ? newUser.emailVerified.toISOString() : null,
      };
    } catch (error) {
      console.error("Erro na criação de utilizador:", error);
      return handlePrismaError(error);
    }
  }),

  // Atualizar utilizador
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateUtilizadorSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, data } = input;

        // Verificar permissões (admin ou próprio utilizador)
        const user = ctx.session.user as UserWithPermissao;
        const isAdmin = user.permissao === Permissao.ADMIN;
        const isSelf = user.id === id;

        if (!isAdmin && !isSelf) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não tem permissões para atualizar este utilizador",
          });
        }

        // Se não for admin, não pode alterar permissões
        if (!isAdmin && data.permissao) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não tem permissões para alterar permissões",
          });
        }

        // Atualizar utilizador
        const updatedUser = await ctx.db.user.update({
          where: { id },
          data,
          select: {
            id: true,
            name: true,
            email: true,
            foto: true,
            atividade: true,
            contratacao: true,
            username: true,
            permissao: true,
            regime: true,
          },
        });

        return updatedUser;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Atualizar informações (currículo) do utilizador
  updateInformacoes: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        informacoes: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { userId, informacoes } = input;

        // Verificar permissões (admin ou próprio utilizador)
        const user = ctx.session.user as UserWithPermissao;
        const isAdmin = user.permissao === Permissao.ADMIN;
        const isSelf = user.id === userId;

        if (!isAdmin && !isSelf) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não tem permissões para atualizar este utilizador",
          });
        }

        // Atualizar utilizador
        const updatedUser = await ctx.db.user.update({
          where: { id: userId },
          data: { informacoes },
          select: {
            id: true,
            informacoes: true,
          },
        });

        return updatedUser;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Obter ocupação mensal agregada
  getOcupacaoMensal: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        ano: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { userId, ano } = input;

        // Buscar alocações do ano com relações necessárias
        const alocacoes = await ctx.db.alocacaoRecurso.findMany({
          where: {
            userId: userId,
            ano: ano,
          },
          select: {
            mes: true,
            ocupacao: true,
            workpackage: {
              select: {
                projeto: {
                  select: {
                    estado: true,
                  },
                },
              },
            },
          },
        });

        // Organizar por mês
        const meses = Array.from({ length: 12 }, (_, i) => i + 1);
        const ocupacaoPorMes = meses.map((mes) => {
          const alocacoesMes = alocacoes.filter((a) => a.mes === mes);

          // Separar ocupações por estado do projeto
          const ocupacaoAprovada = alocacoesMes
            .filter(
              (a) =>
                a.workpackage.projeto.estado === "APROVADO" ||
                a.workpackage.projeto.estado === "EM_DESENVOLVIMENTO"
            )
            .reduce((sum, a) => sum + Number(a.ocupacao), 0);

          const ocupacaoPendente = alocacoesMes
            .filter((a) => a.workpackage.projeto.estado === "PENDENTE")
            .reduce((sum, a) => sum + Number(a.ocupacao), 0);

          return {
            mes,
            ocupacaoAprovada,
            ocupacaoPendente,
          };
        });

        return ocupacaoPorMes;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Nova função unificada que combina alocações reais e submetidas
  getAlocacoes: protectedProcedure
    .input(z.object({
      userId: z.string(),
      ano: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Interface para snapshot aprovado
        interface ApprovedSnapshot {
          workpackages: Array<{
            id: string;
            nome: string;
            recursos: Array<{
              userId: string;
              mes: number;
              ano: number;
              ocupacao: number;
            }>;
          }>;
        }

        // 1. Buscar alocações reais da tabela (apenas de projetos aprovados/em desenvolvimento/concluídos)
        const alocacoesReais = await ctx.db.alocacaoRecurso.findMany({
          where: {
            userId: input.userId,
            ...(input.ano ? { ano: input.ano } : {}),
            workpackage: {
              projeto: {
                estado: {
                  in: ["APROVADO", "EM_DESENVOLVIMENTO", "CONCLUIDO"]
                }
              }
            }
          },
          select: {
            mes: true,
            ano: true,
            ocupacao: true,
            workpackageId: true,
            workpackage: {
              select: {
                id: true,
                nome: true,
                projetoId: true,
                projeto: {
                  select: {
                    id: true,
                    nome: true,
                    estado: true,
                  },
                },
              },
            },
          },
        });

        // 2. Buscar projetos aprovados com snapshots
        const projetosAprovados = await ctx.db.projeto.findMany({
          where: {
            estado: {
              in: ["APROVADO", "EM_DESENVOLVIMENTO", "CONCLUIDO"]
            },
            workpackages: {
              some: {
                recursos: {
                  some: {
                    userId: input.userId,
                  },
                },
              },
            },
          },
          select: {
            id: true,
            nome: true,
            aprovado: true,
          },
        });

        // 3. Processar alocações reais mantendo 2 casas decimais
        const realData = alocacoesReais.map(alocacao => ({
          workpackageId: alocacao.workpackage.id,
          workpackageNome: alocacao.workpackage.nome,
          projetoId: alocacao.workpackage.projeto.id,
          projetoNome: alocacao.workpackage.projeto.nome,
          projetoEstado: alocacao.workpackage.projeto.estado,
          mes: alocacao.mes,
          ano: alocacao.ano,
          ocupacao: Number(alocacao.ocupacao.toFixed(2)),
        }));

        // Set para armazenar anos únicos
        const anosSet = new Set<number>();

        // 4. Processar alocações submetidas dos snapshots mantendo 2 casas decimais
        const submetidoData = projetosAprovados.flatMap(projeto => {
          if (!projeto.aprovado) return [];

          try {
            const snapshotAprovado = projeto.aprovado as unknown as ApprovedSnapshot;
            
            // Agrupar alocações por workpackage
            const alocacoesPorMes = new Map<string, {
              workpackageId: string;
              workpackageNome: string;
              projetoId: string;
              projetoNome: string;
              mes: number;
              ano: number;
              ocupacao: number;
            }>();

            snapshotAprovado.workpackages.forEach(wp => {
              if (!wp.recursos) return;

              wp.recursos
                .filter(r => r.userId === input.userId)
                .filter(r => !input.ano || r.ano === input.ano)
                .forEach(recurso => {
                  const key = `${recurso.mes}-${recurso.ano}-${wp.id}`;
                  
                  // Adicionar ano ao Set
                  anosSet.add(recurso.ano);
                  
                  // Se já existe uma alocação para este mês/ano/workpackage, somamos
                  if (alocacoesPorMes.has(key)) {
                    const existing = alocacoesPorMes.get(key)!;
                    existing.ocupacao = Number((existing.ocupacao + Number(recurso.ocupacao)).toFixed(2));
                  } else {
                    alocacoesPorMes.set(key, {
                      workpackageId: wp.id,
                      workpackageNome: wp.nome,
                      projetoId: projeto.id,
                      projetoNome: projeto.nome,
                      mes: recurso.mes,
                      ano: recurso.ano,
                      ocupacao: Number(Number(recurso.ocupacao).toFixed(2)),
                    });
                  }
                });
            });

            return Array.from(alocacoesPorMes.values());
          } catch (error) {
            console.error(`Erro ao processar snapshot do projeto ${projeto.id}:`, error);
            return [];
          }
        });

        // Converter Set para array e ordenar
        const anosAlocados = Array.from(anosSet).sort((a, b) => b - a);

        return {
          real: realData,
          submetido: submetidoData,
          anos: anosAlocados,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar alocações",
          cause: error,
        });
      }
    }),

  getByProjeto: protectedProcedure.input(z.string()).query(async ({ ctx, input: projetoId }) => {
    try {
      const workpackages = await ctx.db.workpackage.findMany({
        where: {
          projetoId: projetoId,
        },
        select: {
          id: true,
        },
      });

      const workpackageIds = workpackages.map((wp) => wp.id);

      const users = await ctx.db.user.findMany({
        where: {
          workpackages: {
            some: {
              workpackageId: {
                in: workpackageIds,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          foto: true,
          atividade: true,
          regime: true,
          workpackages: {
            where: {
              workpackageId: {
                in: workpackageIds,
              },
            },
            select: {
              mes: true,
              ano: true,
              ocupacao: true,
              workpackageId: true,
            },
            orderBy: [{ ano: "asc" }, { mes: "asc" }],
          },
        },
      });

      return users.map((user) => ({
        ...user,
        alocacoes: user.workpackages.map((wp) => ({
          mes: wp.mes,
          ano: wp.ano,
          ocupacao: wp.ocupacao,
          workpackageId: wp.workpackageId,
        })),
      }));
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao obter utilizadores do projeto",
        cause: error,
      });
    }
  }),
});
