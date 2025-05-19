import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Permissao, Regime, ProjetoEstado, Prisma } from "@prisma/client";
import type { Prisma as PrismaTypes } from "@prisma/client";
import { randomUUID } from "crypto";
import { sendPrimeiroAcessoEmail, sendPasswordResetEmail } from "@/emails/utils/email";
import { hash } from "bcryptjs";
import { z } from "zod";
import { handlePrismaError } from "../utils";
import { format } from "date-fns";
import { Decimal } from "decimal.js";
import puppeteer from "puppeteer";
import { RelatorioTemplate } from "@/app/utilizadores/[param]/relatorio/templates/relatorio-template";
import http from "http";
import type net from "net";
import { listProfilePhotos, deleteFile } from "@/lib/blob";
import { put } from "@vercel/blob";
import { BLOB_CONFIG } from "@/lib/config";

// Schemas base
const emailSchema = z.string({ required_error: "Email é obrigatório" }).email("Email inválido");

export const passwordSchema = z
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
    name: z.string().min(1, "Nome é obrigatório").optional(),
    email: emailSchema.optional(),
    atividade: z.string().min(1, "Atividade é obrigatória").optional(),
    contratacao: dateSchema.optional(),
    username: z.string().min(3, "Username deve ter pelo menos 3 caracteres").optional(),
    permissao: z.nativeEnum(Permissao).optional(),
    regime: z.nativeEnum(Regime).optional(),
    contratado: z.boolean().optional(),
    informacoes: z.string().optional(),
    salario: z.preprocess((v) => v === "" || v == null ? undefined : Number(v), z.number().min(0, "Salário deve ser positivo").optional()),
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

// Schema para primeiro acesso
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

// Schema para atualização de utilizador pela página de perfil
const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  atividade: z.string().optional(),
  regime: z.nativeEnum(Regime),
  permissao: z.nativeEnum(Permissao),
  informacoes: z.string().optional().nullable(),
  salario: z.preprocess(
    (v) => (v === "" || v === null ? undefined : Number(v)),
    z.number().min(0, "O salário deve ser positivo").optional()
  ),
});

// Schema para convite de utilizador existente
const convidarUtilizadorSchema = z.object({
  email: emailSchema,
});

// Novo schema de input opcional para findAll
const findAllUtilizadoresInputSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
  // Poderíamos adicionar filtros aqui também, se necessário no futuro
  // search: z.string().optional(), 
  // permissao: z.nativeEnum(Permissao).optional(),
}).optional(); // Torna o objeto input inteiro opcional

// Tipos inferidos dos schemas
export type CreateUtilizadorInput = z.infer<typeof createUtilizadorSchema>;
export type UpdateUtilizadorInput = z.infer<typeof updateUtilizadorSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Exportar os schemas para uso em validações
export {
  changePasswordSchema,
  primeiroAcessoSchema,
};

// Tipo estendido para o utilizador com as propriedades que precisamos
type UserWithPermissao = {
  permissao: Permissao;
  id: string;
  // Outras propriedades do utilizador
} & Record<string, any>;

// Estados válidos para projetos
const validProjectStates = Object.values(ProjetoEstado).filter(
  (estado): estado is ProjetoEstado => 
    estado === ProjetoEstado.APROVADO ||
    estado === ProjetoEstado.EM_DESENVOLVIMENTO ||
    estado === ProjetoEstado.CONCLUIDO
);

// Router
export const utilizadorRouter = createTRPCRouter({
  // Obter todos os utilizadores (agora com paginação opcional)
  findAll: protectedProcedure
    .input(findAllUtilizadoresInputSchema) // Adicionar o input opcional
    .query(async ({ ctx, input }) => {
      try {
        const page = input?.page;
        const limit = input?.limit;

        // Verifica se temos paginação válida
        const hasPagination = typeof page === 'number' && typeof limit === 'number' && page > 0 && limit > 0;

        const whereClause: PrismaTypes.UserWhereInput = {}; // Preparar para filtros futuros, se necessário

        // Buscar utilizadores
        const users = await ctx.db.user.findMany({
          where: whereClause,
          select: {
            id: true,
            name: true,
            email: true,
            atividade: true,
            contratacao: true,
            username: true,
            permissao: true,
            regime: true,
            emailVerified: true,
          },
          orderBy: { name: "asc" },
          ...(hasPagination && { // Adicionar paginação se os parâmetros forem válidos
              skip: (page - 1) * limit,
              take: limit,
          }),
        });

        // Obter a contagem total (respeitando filtros futuros)
        const totalCount = await ctx.db.user.count({
          where: whereClause,
        });


        const usersWithPhotos = await Promise.all(
          users.map(async (user) => {
            let profilePhotoUrl: string | null = null;
            try {
              const photoBlobs = await listProfilePhotos(user.id);
              if (photoBlobs.blobs.length > 0) {
                profilePhotoUrl = photoBlobs.blobs[0]?.url || null;
              }
            } catch (photoError) {
              console.error(`Erro ao buscar foto de perfil para o utilizador ${user.id}:`, photoError);
              // Não quebrar a query principal por causa da foto
            }
            return {
              ...user,
              profilePhotoUrl,
            };
          })
        );

        // Retornar um objeto com os items e a contagem total
        return {
          items: usersWithPhotos,
          totalCount,
        };

      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Atualizar informações do utilizador (para perfil)
  updateUser: protectedProcedure
    .input(updateUserSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...userData } = input;
        
        // Verificar se o utilizador existe
        const existingUser = await ctx.db.user.findUnique({
          where: { id },
        });
        
        if (!existingUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado",
          });
        }
        
        // Verificar permissões do usuário atual
        const sessionUser = ctx.session.user as UserWithPermissao;
        if (sessionUser.id !== id && sessionUser.permissao !== "ADMIN" && sessionUser.permissao !== "GESTOR") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não tem permissão para editar este utilizador",
          });
        }
        
        // Atualizar o utilizador
        const updatedUser = await ctx.db.user.update({
          where: { id },
          data: userData,
        });
        
        return updatedUser;
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
        const whereCondition: PrismaTypes.AlocacaoRecursoWhereInput = {
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
          atividade: true,
          contratacao: true,
          username: true,
          permissao: true,
          regime: true,
          emailVerified: true,
          informacoes: true,
          salario: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilizador não encontrado",
        });
      }

      // Buscar a foto de perfil
      let profilePhotoUrl: string | null = null;
      try {
        const photoBlobs = await listProfilePhotos(user.id);
        if (photoBlobs.blobs.length > 0) {
          profilePhotoUrl = photoBlobs.blobs[0]?.url || null;
        }
      } catch (photoError) {
        console.error(`Erro ao buscar foto de perfil para o utilizador ${user.id}:`, photoError);
        // Não quebrar a query principal por causa da foto
      }

      return {
        ...user,
        profilePhotoUrl,
      };
    } catch (error) {
      return handlePrismaError(error);
    }
  }),

  //Obter por username
  findByUsername: protectedProcedure.input(z.string()).query(async ({ ctx, input: username }) => {
    try {
      const user = await ctx.db.user.findUnique({
        where: { username },
        select: {
          id: true,
          name: true,
          email: true,
          atividade: true,
          contratacao: true,
          username: true,
          permissao: true,
          regime: true,
          emailVerified: true,
          informacoes: true,
          salario: true,
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
      const user = ctx.session?.user as UserWithPermissao | undefined;
      if (!user || user.permissao !== Permissao.ADMIN && user.permissao !== Permissao.GESTOR) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Não tem permissões para criar utilizadores",
        });
      }

      if (!input) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Dados de utilizador não fornecidos",
        });
      }

      // Se contratado minimalista, só exige name e informacoes
      if (input.contratado === true) {
        if (!input.name || !input.name.trim()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Nome é obrigatório para contratado",
          });
        }
        // Criação minimalista
        const newUser = await ctx.db.user.create({
          data: {
            name: input.name,
            informacoes: input.informacoes,
            salario: input.salario,
            contratado: true,
          },
          select: {
            id: true,
            name: true,
            informacoes: true,
          },
        });
        return newUser;
      }

      // Fluxo normal (não contratado minimalista)
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
          message: `O email ${processedUserData.email} já está registado no sistema. Por favor, utilize um email diferente ou contacte o administrador se achar que isto é um erro.`,
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
        const isGestor = user.permissao === Permissao.GESTOR;
        const isSelf = user.id === id;

        if (!isAdmin && !isGestor && !isSelf) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não tem permissões para atualizar este utilizador",
          });
        }

        // Se não for admin, não pode alterar permissões
        if (!isAdmin && !isGestor && data.permissao) {
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
        const isGestor = user.permissao === Permissao.GESTOR;
        const isSelf = user.id === userId;

        if (!isAdmin && !isGestor && !isSelf) {
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
      userId: z.string().optional(), // Reverted to optional userId
      username: z.string().optional(), // Reverted to optional username
      ano: z.number().optional(),
    }).superRefine((data, ctx) => { // Added superRefine back
      if (!data.userId && !data.username) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Either userId or username must be provided",
          path: ["userId"],
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Either userId or username must be provided",
          path: ["username"],
        });
      }
      if (data.userId && data.username) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Provide either userId or username, not both",
          path: ["userId"],
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Provide either userId or username, not both",
          path: ["username"],
        });
      }
    }))
    .query(async ({ ctx, input }) => {
      try {
        let actualUserId: string;

        if (input.username) {
          const user = await ctx.db.user.findUnique({
            where: { username: input.username },
            select: { id: true },
          });
          if (!user) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `User with username '${input.username}' not found.`,
            });
          }
          actualUserId = user.id;
          console.log(`Getting allocations for username: '${input.username}' (resolved to ID: ${actualUserId}), year: ${input.ano ?? 'All'}`);
        } else if (input.userId) {
          actualUserId = input.userId;
          console.log(`Getting allocations for userId: '${actualUserId}', year: ${input.ano ?? 'All'}`);
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User identifier (userId or username) is missing.", // Should be caught by superRefine
          });
        }

        // Interface for snapshot
        interface ApprovedSnapshotResource {
          userId: string;
          mes: number;
          ano: number;
          ocupacao: number;
        }
        interface ApprovedSnapshotWorkpackage {
          id: string;
          nome: string;
          recursos: ApprovedSnapshotResource[];
        }
        interface ApprovedSnapshot {
          workpackages: ApprovedSnapshotWorkpackage[];
        }

        const anosSet = new Set<number>();
        const projetoIdsSet = new Set<string>(); // Initialize set for project IDs

        // 1. Get real allocations (approved, in development, completed)
        const alocacoesReaisDb = await ctx.db.alocacaoRecurso.findMany({
          where: {
            userId: actualUserId,
            ...(input.ano ? { ano: input.ano } : {}),
            workpackage: {
              projeto: {
                estado: { in: validProjectStates },
              },
            },
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

        // 2. Process realData and collect keys/project IDs
        const realData = alocacoesReaisDb.map(alocacao => {
          anosSet.add(alocacao.ano);
          projetoIdsSet.add(alocacao.workpackage.projeto.id); // Populate projetoIdsSet
          return {
            workpackageId: alocacao.workpackage.id,
            workpackageNome: alocacao.workpackage.nome,
            projetoId: alocacao.workpackage.projeto.id,
            projetoNome: alocacao.workpackage.projeto.nome,
            projetoEstado: alocacao.workpackage.projeto.estado as ProjetoEstado,
            mes: alocacao.mes,
            ano: alocacao.ano,
            ocupacao: Number(alocacao.ocupacao.toFixed(3)),
          };
        });
        
        // const relevantProjetoIds = Array.from(new Set(realData.map(r => r.projetoId))); // Old logic, replaced by comprehensive projetoIdsSet

        // 3. Get PENDING allocations
        const alocacoesPendentesDb = await ctx.db.alocacaoRecurso.findMany({
          where: {
            userId: actualUserId,
            ...(input.ano ? { ano: input.ano } : {}),
            workpackage: {
              projeto: {
                estado: ProjetoEstado.PENDENTE,
              },
            },
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

        // 4. Process pendenteData
        const pendenteData = alocacoesPendentesDb.map(alocacao => {
          anosSet.add(alocacao.ano);
          projetoIdsSet.add(alocacao.workpackage.projeto.id); // Populate projetoIdsSet
          return {
            workpackageId: alocacao.workpackage.id,
            workpackageNome: alocacao.workpackage.nome,
            projetoId: alocacao.workpackage.projeto.id,
            projetoNome: alocacao.workpackage.projeto.nome,
            projetoEstado: alocacao.workpackage.projeto.estado as ProjetoEstado,
            mes: alocacao.mes,
            ano: alocacao.ano,
            ocupacao: Number(alocacao.ocupacao.toFixed(3)),
          };
        });


        // 5. Get snapshots for relevant projects
        const projetosComSnapshot = await ctx.db.projeto.findMany({
          where: {
            aprovado: { not: Prisma.DbNull },
          },
          select: {
            id: true,
            nome: true, 
            estado: true, 
            aprovado: true, 
          },
        });

        // 6. Process submitted allocations from snapshots
        const submetidoDataMap = new Map<string, (typeof realData)[0]>(); 

        projetosComSnapshot.forEach(projeto => {
          if (!projeto.aprovado) return; 

          try {
            const snapshotAprovado = projeto.aprovado as unknown as ApprovedSnapshot;
            if (!snapshotAprovado || !Array.isArray(snapshotAprovado.workpackages)) {
              return;
            }
            
            snapshotAprovado.workpackages.forEach(wp => {
              if (!wp.recursos || !Array.isArray(wp.recursos)) return;

              wp.recursos
                .filter(r => r.userId === actualUserId && (!input.ano || r.ano === input.ano))
                .forEach(recurso => {
                  const snapshotKey = `${projeto.id}-${wp.id}-${recurso.mes}-${recurso.ano}`; 
                  
                  if (submetidoDataMap.has(snapshotKey)) {
                    const existing = submetidoDataMap.get(snapshotKey)!;
                    existing.ocupacao = Number((existing.ocupacao + Number(recurso.ocupacao)).toFixed(3));
                  } else {
                    submetidoDataMap.set(snapshotKey, {
                      workpackageId: wp.id, 
                      workpackageNome: wp.nome, 
                      projetoId: projeto.id, 
                      projetoNome: projeto.nome, 
                      projetoEstado: projeto.estado as ProjetoEstado, 
                      mes: recurso.mes,
                      ano: recurso.ano,
                      ocupacao: Number(Number(recurso.ocupacao).toFixed(3)),
                    });
                  }
                  anosSet.add(recurso.ano); 
                });
            });
          } catch (error) {
            // console.error(`Error processing snapshot for project ${projeto.id}:`, error);
          }
        });
        const submetidoData = Array.from(submetidoDataMap.values());
        submetidoData.forEach(item => projetoIdsSet.add(item.projetoId)); // Populate projetoIdsSet from submitted data
        
        const anosAlocados = Array.from(anosSet).sort((a, b) => b - a);
        const projetosIds = Array.from(projetoIdsSet); // Convert set to array
        
        console.log("Final results:", {
          realCount: realData.length,
          submittedCount: submetidoData.length,
          pendingCount: pendenteData.length,
          uniqueYears: anosAlocados,
          projetosIdsCount: projetosIds.length, // Log count of unique project IDs
        });

        return {
          real: realData, 
          submetido: submetidoData,
          pendente: pendenteData,
          anos: anosAlocados,
          projetosIds: projetosIds, // Return the array of project IDs
        };
      } catch (error) {
        console.error("Error in getAlocacoes:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching allocations",
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

  // Obter configuração mensal
  getConfiguracaoMensal: protectedProcedure
    .input(
      z.object({
        mes: z.number().int().min(1).max(12),
        ano: z.number().int().min(2000),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const configuracao = await ctx.db.configuracaoMensal.findFirst({
          where: {
            mes: input.mes,
            ano: input.ano,
          },
        });

        return configuracao;
      } catch (error) {
        console.error("Erro ao obter configuração mensal:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter configuração mensal",
          cause: error,
        });
      }
    }),

  // Listar todas as configurações mensais
  listarConfiguracoesMensais: protectedProcedure
    .input(
      z.object({
        ano: z.number().int().min(2000).optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { ano, limit, cursor } = input;

        const where = ano ? { ano } : undefined;

        const items = await ctx.db.configuracaoMensal.findMany({
          where,
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: [
            { ano: "desc" },
            { mes: "asc" }
          ],
        });

        let nextCursor: typeof cursor | undefined = undefined;
        if (items.length > limit) {
          const nextItem = items.pop();
          nextCursor = nextItem?.id;
        }

        return {
          items,
          nextCursor,
        };
      } catch (error) {
        console.error("Erro ao listar configurações mensais:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao listar configurações mensais",
          cause: error,
        });
      }
    }),

  getRelatorioMensal: protectedProcedure
    .input(
      z.object({
        username: z.string(),
        mes: z.number().min(1).max(12),
        ano: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Buscar utilizador
      const utilizador = await ctx.db.user.findUnique({
        where: { username: input.username },
        select: {
          id: true,
          name: true,
          email: true,
          atividade: true,
          regime: true,
        },
      });

      if (!utilizador) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilizador não encontrado",
        });
      }

      // Calcular datas do mês
      const dataInicio = new Date(input.ano, input.mes - 1, 1);
      const dataFim = new Date(input.ano, input.mes, 0);

      // Buscar configuração baseada no regime do utilizador
      let configuracaoMensal;
      
      if (utilizador.regime === "PARCIAL") {
        // Para regime PARCIAL, buscar na configuração específica do utilizador
        configuracaoMensal = await ctx.db.configuracaoUtilizadorMensal.findFirst({
          where: {
            userId: utilizador.id,
            mes: input.mes,
            ano: input.ano,
          },
          select: {
            diasUteis: true,
            horasPotenciais: true,
            jornadaDiaria: true,
          },
        });
      }
      
      // Se não encontrou configuração específica ou o regime não é PARCIAL,
      // buscar na configuração global
      if (!configuracaoMensal) {
        configuracaoMensal = await ctx.db.configuracaoMensal.findFirst({
          where: {
            mes: input.mes,
            ano: input.ano,
          },
          select: {
            diasUteis: true,
            horasPotenciais: true,
            jornadaDiaria: true,
          },
        });
      }

      // Se não existir configuração, criar uma padrão
      if (!configuracaoMensal) {
        // Calcular dias úteis (simplificado - assumimos 20 dias úteis por mês)
        const diasUteis = 20;
        
        // Calcular horas potenciais (8 horas por dia útil)
        const horasPotenciais = new Decimal(diasUteis * 8);
        
        // Jornada diária padrão
        const jornadaDiaria = 8;

        configuracaoMensal = {
          diasUteis,
          horasPotenciais,
          jornadaDiaria,
        };

        // Criar configuração na base de dados se o utilizador for admin ou gestor
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (user && (user.permissao === Permissao.ADMIN || user.permissao === Permissao.GESTOR)) {
          if (utilizador.regime === "PARCIAL") {
            // Criar configuração específica para o utilizador
            await ctx.db.configuracaoUtilizadorMensal.create({
              data: {
                userId: utilizador.id,
                mes: input.mes,
                ano: input.ano,
                diasUteis,
                horasPotenciais,
                jornadaDiaria,
              },
            });
          } else {
            // Criar configuração global
            await ctx.db.configuracaoMensal.create({
              data: {
                mes: input.mes,
                ano: input.ano,
                diasUteis,
                horasPotenciais,
                jornadaDiaria,
              },
            });
          }
        }
      }

      // Buscar alocações do utilizador
      const alocacoes = await ctx.db.alocacaoRecurso.findMany({
        where: {
          userId: utilizador.id,
          mes: input.mes,
          ano: input.ano,
          workpackage: {
            projeto: {
              estado: {
                in: ['APROVADO', 'EM_DESENVOLVIMENTO', 'CONCLUIDO']
              }
            }
          }
        },
        select: {
          workpackageId: true,
          ocupacao: true,
          workpackage: {
            select: {
              nome: true,
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
        distinct: ['workpackageId'], // Evitar duplicatas
      });

      // Formatar alocações
      const alocacoesFormatadas = alocacoes.map((alocacao) => ({
        workpackageId: alocacao.workpackageId,
        workpackageNome: alocacao.workpackage.nome,
        projetoId: alocacao.workpackage.projeto.id,
        projetoNome: alocacao.workpackage.projeto.nome,
        projetoEstado: alocacao.workpackage.projeto.estado,
        ocupacao: Number(alocacao.ocupacao),
      }));

      // Buscar tarefas do mês
      const tarefas = await ctx.db.tarefa.findMany({
        where: {
          workpackage: {
            recursos: {
              some: {
                userId: utilizador.id,
                mes: input.mes,
                ano: input.ano,
              },
            },
          },
          inicio: {
            gte: dataInicio,
            lte: dataFim,
          },
        },
        select: {
          id: true,
          nome: true,
          descricao: true,
          inicio: true,
          estado: true,
        },
      });

      // Buscar atividades do mês (simulado, pois não existe no schema)
      // Em um sistema real, isso viria de uma tabela de atividades
      const atividades: Array<{
        id: string;
        descricao: string;
        data: Date;
        tipo: "tarefa" | "projeto" | "reunião";
        duracao: number;
      }> = [];

      // Calcular estatísticas
      const tarefasCompletadas = tarefas.filter((t) => t.estado).length;
      const tarefasPendentes = tarefas.filter((t) => !t.estado).length;
      const horasTrabalhadas = alocacoes.reduce((acc, a) => acc + Number(a.ocupacao) * Number(configuracaoMensal.horasPotenciais), 0);
      const produtividade = tarefas.length > 0 ? Math.round((tarefasCompletadas / tarefas.length) * 100) : 0;

      return {
        utilizador: {
          id: utilizador.id,
          nome: utilizador.name || "Utilizador",
          email: utilizador.email || "utilizador@exemplo.com",
          cargo: utilizador.atividade || "Cargo não definido",
        },
        configuracaoMensal: {
          diasUteis: configuracaoMensal.diasUteis,
          horasPotenciais: Number(configuracaoMensal.horasPotenciais),
          jornadaDiaria: configuracaoMensal.jornadaDiaria || 8, // Default to 8 if not set
        },
        alocacoes: alocacoesFormatadas,
        estatisticas: {
          tarefasCompletadas,
          tarefasPendentes,
          horasTrabalhadas,
          produtividade,
        },
        atividades: atividades.map((a) => ({
          ...a,
          data: a.data.toISOString(),
        })),
      };
    }),

  // Gerar PDF do relatório
  gerarRelatorioPDF: protectedProcedure
    .input(
      z.object({
        username: z.string().optional(),
        id: z.string().optional(),
        mes: z.number().min(1).max(12),
        ano: z.number(),
      }).refine(
        (data) => data.username !== undefined || data.id !== undefined,
        {
          message: "É necessário fornecer 'username' ou 'id'.",
          path: ["username"], // Or path: ["id"] or no specific path for a general error
        }
      )
    )
    .mutation(async ({ ctx, input }) => {
      try {
        let reportUsername: string;

        if (input.username) {
          reportUsername = input.username;
        } else if (input.id) {
          const user = await ctx.db.user.findUnique({
            where: { id: input.id },
            select: { username: true, name: true }, // Select username and name as a fallback
          });

          if (!user) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Utilizador com ID ${input.id} não encontrado.`,
            });
          }
          if (!user.username) {
            // Fallback to name if username is not set, or throw error if username is strictly required
            // For this example, let's consider username essential for the report context
             throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Utilizador com ID ${input.id} não possui um nome de utilizador (username) definido.`,
            });
          }
          reportUsername = user.username;
        } else {
          // This case should ideally be caught by Zod's .refine()
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Input inválido: 'username' ou 'id' deve ser fornecido.",
          });
        }

        // Reutilizar a lógica do getRelatorioMensal para obter os dados completos
        const dadosRelatorio = await utilizadorRouter.createCaller(ctx).getRelatorioMensal({
          username: reportUsername,
          mes: input.mes,
          ano: input.ano
        });

        // Gerar HTML do relatório
        const html = await RelatorioTemplate({
          data: dadosRelatorio,
          periodo: { mes: input.mes, ano: input.ano },
        });

        // Iniciar o browser
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        // Criar nova página
        const page = await browser.newPage();

        // Criar um servidor HTTP temporário para servir o HTML
        const server = await new Promise<http.Server>((resolve) => {
          const srv = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
          });
          srv.listen(0, '127.0.0.1', () => resolve(srv));
        });

        // Obter a porta do servidor
        const port = (server.address() as net.AddressInfo).port;

        try {
          // Navegar para a página temporária
          await page.goto(`http://127.0.0.1:${port}`, {
            waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
            timeout: 30000
          });

          // Definir viewport exato para A4 (210 × 297 mm)
          // Conversão exata: 210mm = 8.27" | 297mm = 11.69"
          // A 96 DPI: 8.27" * 96 = 793.92px | 11.69" * 96 = 1122.24px
          await page.setViewport({
            width: 794, // 210mm em pixels a 96 DPI
            height: 1122, // 297mm em pixels a 96 DPI
            deviceScaleFactor: 1.0, // Escala nativa para evitar distorções
          });
          
          // Aguardar para garantir que todos os recursos e estilos sejam carregados
          await page.evaluateHandle('document.fonts.ready');
          // Esperar um tempo para garantir que tudo seja carregado corretamente
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Gerar PDF com tamanho exato A4
          const pdf = await page.pdf({
            width: '210mm',
            height: '297mm',
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
              top: "0mm",
              right: "0mm",
              bottom: "0mm",
              left: "0mm",
            },
            scale: 1.0,
          });

          return {
            pdf: Buffer.from(pdf).toString("base64"),
            filename: `${reportUsername}_${input.mes}_${input.ano}.pdf`,
          };
        } finally {
          // Fechar o browser e o servidor
          await browser.close();
          server.close();
        }
      } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao gerar PDF do relatório",
          cause: error,
        });
      }
    }),

  // Convidar utilizador existente
  convidarUtilizador: protectedProcedure
    .input(convidarUtilizadorSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verificar permissão (apenas admin ou gestor pode convidar utilizadores)
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || user.permissao !== Permissao.ADMIN && user.permissao !== Permissao.GESTOR) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não tem permissões para convidar utilizadores",
          });
        }

        // Verificar se o utilizador existe
        const existingUser = await ctx.db.user.findUnique({
          where: { email: input.email },
          select: {
            email: true,
            name: true,
          }
        });

        if (!existingUser || !existingUser.email) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado",
          });
        }

        // Gerar token para primeiro acesso
        const token = randomUUID();
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + 24);

        // Criar token para primeiro acesso
        await ctx.db.verificationToken.create({
          data: {
            identifier: existingUser.email,
            token,
            expires: tokenExpiry,
          },
        });

        // Enviar email de primeiro acesso
        const userName = existingUser.name || "Utilizador";
        await sendPrimeiroAcessoEmail(existingUser.email, userName, token);

        return {
          success: true,
          message: "Email de convite enviado com sucesso",
        };
      } catch (error) {
        console.error("Erro ao convidar utilizador:", error);
        return handlePrismaError(error);
      }
    }),

  // Reset de password
  resetPassword: publicProcedure
    .input(z.object({
      email: z.string().email("Email inválido"),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { email } = input;

        // Verificar se o utilizador existe
        const user = await ctx.db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
          },
        });

        if (!user || !user.email) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado",
          });
        }

        // Gerar token
        const token = randomUUID();
        const expires = new Date();
        expires.setHours(expires.getHours() + 24); // Token válido por 24 horas

        // Criar ou atualizar token de reset
        const existingReset = await ctx.db.passwordReset.findFirst({
          where: { email },
        });

        if (existingReset) {
          // Atualizar token existente
          await ctx.db.passwordReset.update({
            where: { id: existingReset.id },
            data: {
              token,
              expires,
            },
          });
        } else {
          // Criar novo token
          await ctx.db.passwordReset.create({
            data: {
              email,
              token,
              expires,
            },
          });
        }

        // Enviar email com link de reset
        await sendPasswordResetEmail(
          user.email,
          user.name || "Utilizador",
          token
        );

        return {
          success: true,
          message: "Email de recuperação enviado com sucesso",
        };
      } catch (error) {
        console.error("Erro no reset de password:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao processar o pedido de recuperação de password",
          cause: error,
        });
      }
    }),

  // Apagar utilizador
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = ctx.session?.user as UserWithPermissao | undefined;
        
        // Verificar se o utilizador tem permissão de ADMIN ou GESTOR
        if (!user || user.permissao !== Permissao.ADMIN && user.permissao !== Permissao.GESTOR) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores ou gestores podem apagar utilizadores",
          });
        }

        // Verificar se o utilizador existe
        const targetUser = await ctx.db.user.findUnique({
          where: { id: input.id },
          select: { permissao: true },
        });

        if (!targetUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado",
          });
        }

        // Não permitir apagar administradores ou gestores
        if (targetUser.permissao === Permissao.ADMIN || targetUser.permissao === Permissao.GESTOR) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não é possível apagar administradores ou gestores",
          });
        }

        // Usar uma transação para garantir que todas as operações são feitas ou nenhuma é feita
        await ctx.db.$transaction(async (tx) => {
          // Primeiro apagar todas as alocações do utilizador
          await tx.alocacaoRecurso.deleteMany({
            where: { userId: input.id },
          });

          // Depois apagar o utilizador
          await tx.user.delete({
            where: { id: input.id },
          });
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Erro ao apagar utilizador:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao apagar utilizador",
          cause: error,
        });
      }
    }),


  deleteAllUserPhotos: protectedProcedure
    .input(z.object({ userId: z.string() })) // Input é o ID do utilizador
    .mutation(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user as UserWithPermissao;

        // Verificar se o utilizador logado é o próprio utilizador ou um admin ou gestor
        if (currentUser.id !== input.userId && currentUser.permissao !== Permissao.ADMIN && currentUser.permissao !== Permissao.GESTOR) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não tem permissão para apagar a foto deste utilizador.",
          });
        }

        // Listar todas as fotos existentes na pasta do utilizador
        const existingPhotos = await listProfilePhotos(input.userId);

        // Apagar cada foto encontrada
        if (existingPhotos.blobs.length > 0) {
          const deletePromises = existingPhotos.blobs.map(blob => deleteFile(blob.url));
          await Promise.all(deletePromises);
          console.log(`Apagadas ${existingPhotos.blobs.length} fotos para o utilizador ${input.userId}`);
        }

        return { success: true };

      } catch (error) {
        console.error(`Erro ao apagar fotos de perfil para ${input.userId}:`, error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao apagar fotos de perfil",
          cause: error,
        });
      }
    }),

  uploadProfilePhoto: protectedProcedure
    .input(z.object({
      userId: z.string(),
      file: z.object({
        name: z.string(),
        type: z.string(),
        data: z.string(), // base64 encoded file data
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user as UserWithPermissao;

        // Verificar se o utilizador logado é o próprio utilizador ou um admin ou gestor  
        if (currentUser.id !== input.userId && currentUser.permissao !== Permissao.ADMIN && currentUser.permissao !== Permissao.GESTOR) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não tem permissão para alterar a foto deste utilizador.",
          });
        }

        // Verificar se o tipo de arquivo é permitido
        if (!input.file.type.match(/^image\/(jpeg|png|gif)$/)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Tipo de ficheiro inválido. Apenas imagens (JPEG, PNG, GIF) são permitidas.",
          });
        }

        // Converter base64 para Buffer
        const base64Data = input.file.data.split(',')[1];
        if (!base64Data) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Dados da imagem inválidos",
          });
        }
        const fileBuffer = Buffer.from(base64Data, 'base64');

        // Primeiro apagar fotos antigas
        const existingPhotos = await listProfilePhotos(input.userId);
        if (existingPhotos.blobs.length > 0) {
          const deletePromises = existingPhotos.blobs.map(blob => deleteFile(blob.url));
          await Promise.all(deletePromises);
        }

        // Fazer upload da nova foto
        const blob = await put(
          `${BLOB_CONFIG.PATHS.PROFILE_PHOTOS}/${input.userId}/${input.file.name}`,
          fileBuffer,
          {
            access: 'public',
            contentType: input.file.type,
          }
        );

        return { success: true, url: blob.url };

      } catch (error) {
        console.error("Erro no upload da foto de perfil:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao fazer upload da foto de perfil",
          cause: error,
        });
      }
    }),

  // Atualizar alocações em lote
  updateAlocacoesBatch: protectedProcedure
    .input(z.array(z.object({
      workpackageId: z.string(),
      userId: z.string(),
      mes: z.number().int().min(1).max(12),
      ano: z.number().int().min(2000),
      ocupacao: z.number().min(0).max(1),
    })))
    .mutation(async ({ ctx, input }) => {
      try {
        const results = await Promise.all(
          input.map(async (alocacao) => {
            // Verificar se o workpackage existe
            const workpackage = await ctx.db.workpackage.findUnique({
              where: { id: alocacao.workpackageId },
              include: { projeto: true },
            });

            if (!workpackage) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: `Workpackage ${alocacao.workpackageId} não encontrado`,
              });
            }

            // Verificar se o utilizador existe
            const user = await ctx.db.user.findUnique({
              where: { id: alocacao.userId },
            });

            if (!user) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: `Utilizador ${alocacao.userId} não encontrado`,
              });
            }

            // Buscar outras alocações do mesmo mês/ano (excluindo a atual)
            const outrasAlocacoes = await ctx.db.alocacaoRecurso.findMany({
              where: {
                userId: alocacao.userId,
                mes: alocacao.mes,
                ano: alocacao.ano,
                NOT: {
                  workpackageId: alocacao.workpackageId,
                },
              },
              select: { ocupacao: true },
            });

            // Calcular soma das outras alocações
            const somaOutrasAlocacoes = outrasAlocacoes.reduce(
              (sum, aloc) => sum.add(aloc.ocupacao),
              new Decimal(0)
            );

            // Verificar se a soma total excede 100%
            const novaOcupacaoTotal = somaOutrasAlocacoes.add(new Decimal(alocacao.ocupacao));
            if (novaOcupacaoTotal.greaterThan(1)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `A ocupação total para ${user.name || alocacao.userId} em ${alocacao.mes}/${alocacao.ano} excederia 100% (${novaOcupacaoTotal.times(100).toFixed(0)}%)`,
              });
            }

            // Atualizar ou criar a alocação
            return ctx.db.alocacaoRecurso.upsert({
              where: {
                workpackageId_userId_mes_ano: {
                  workpackageId: alocacao.workpackageId,
                  userId: alocacao.userId,
                  mes: alocacao.mes,
                  ano: alocacao.ano,
                },
              },
              update: {
                ocupacao: new Decimal(alocacao.ocupacao),
              },
              create: {
                workpackageId: alocacao.workpackageId,
                userId: alocacao.userId,
                mes: alocacao.mes,
                ano: alocacao.ano,
                ocupacao: new Decimal(alocacao.ocupacao),
              },
            });
          })
        );

        return results;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao atualizar alocações",
          cause: error,
        });
      }
    }),
});
