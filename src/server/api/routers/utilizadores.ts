import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Permissao, Regime, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { sendEmail } from "@/lib/email";
import { hash, compare } from "bcrypt";
import { z } from "zod";
import { createPaginatedResponse, handlePrismaError } from "../utils";
import { paginationSchema, getPaginationParams } from "../schemas/common";

// Schemas base
const emailSchema = z
  .string({ required_error: "Email é obrigatório" })
  .email("Email inválido");

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
const utilizadorBaseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: emailSchema,
  foto: z.string().nullable().optional(),
  atividade: z.string().min(1, "Atividade é obrigatória"),
  contratacao: dateSchema,
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  permissao: z.nativeEnum(Permissao),
  regime: z.nativeEnum(Regime)
}).passthrough();

// Schema para criação de utilizador
const createUtilizadorSchema = utilizadorBaseSchema.extend({
  password: passwordSchema.optional(),
}).passthrough();

// Schema para atualização de utilizador
const updateUtilizadorSchema = utilizadorBaseSchema.partial();

// Schema para alteração de password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password atual é obrigatória"),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "Confirmação de password é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

// Schema para filtros de utilizador
const utilizadorFilterSchema = z.object({
  search: z.string().optional(),
  permissao: z.nativeEnum(Permissao).optional(),
  regime: z.nativeEnum(Regime).optional(),
}).merge(paginationSchema);

// Schema para reset de password
const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});

// Schema para definir nova password após reset
const resetPasswordSchema = z.object({
  token: z.string(),
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirmação de password é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

// Schema para validação de primeiro acesso
const primeiroAcessoSchema = z.object({
  token: z.string(),
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirmação de password é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

// Tipos inferidos dos schemas
export type CreateUtilizadorInput = z.infer<typeof createUtilizadorSchema>;
export type UpdateUtilizadorInput = z.infer<typeof updateUtilizadorSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UtilizadorFilterInput = z.infer<typeof utilizadorFilterSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type PrimeiroAcessoInput = z.infer<typeof primeiroAcessoSchema>;

// Tipo estendido para o utilizador com as propriedades que precisamos
type UserWithPermissao = {
  permissao: Permissao;
  id: string;
  // Outras propriedades do utilizador
} & Record<string, any>;

// Router
export const utilizadorRouter = createTRPCRouter({
  // Obter todos os utilizadores
  getAll: protectedProcedure
    .input(utilizadorFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        const { search, permissao, regime, page = 1, limit = 10 } = input || {};
        
        // Construir condições de filtro
        const where: Prisma.UserWhereInput = {
          ...(search ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
              { email: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
              { username: { contains: search, mode: "insensitive" as Prisma.QueryMode } },
            ] as Prisma.UserWhereInput[],
          } : {}),
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

  getByWorkpackage: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: workpackageId }) => {
      try {
        const users = await ctx.db.user.findMany({
          where: {
            workpackages: {
              some: {
                workpackageId: workpackageId
              }
            }
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
                workpackageId: workpackageId
              },
              select: {
                mes: true,
                ano: true,
                ocupacao: true
              },
              orderBy: [
                { ano: 'asc' },
                { mes: 'asc' }
              ]
            }
          }
        });

        return users.map(user => ({
          ...user,
          alocacoes: user.workpackages.map(wp => ({
            mes: wp.mes,
            ano: wp.ano,
            ocupacao: wp.ocupacao
          }))
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
  getById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: id }) => {
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
  
  // Criar utilizador
  create: protectedProcedure
    .input(createUtilizadorSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verificar permissão (apenas admin pode criar utilizadores)
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || user.permissao !== Permissao.ADMIN) {
          throw new TRPCError({ 
            code: "FORBIDDEN",
            message: "Não tem permissões para criar utilizadores" 
          });
        }
        
        // Verificar se temos dados de entrada
        if (!input) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Dados de utilizador não fornecidos"
          });
        }
        
        const { password, ...userData } = input;
        
        if (process.env.NODE_ENV === 'development') {
          console.log("Dados recebidos:", JSON.stringify(input, null, 2));
        }
        
        // Processar a data de contratação
        const processedUserData = {
          ...userData,
          contratacao: userData.contratacao 
            ? (typeof userData.contratacao === 'string' 
                ? new Date(userData.contratacao) 
                : userData.contratacao)
            : null
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
            password: password ? {
              create: {
                hash: await hash(password, 10),
              },
            } : undefined,
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
          await sendEmail({
            to: newUser.email,
            subject: "Bem-vindo ao Sistema de Gestão de Projetos",
            html: `
              <p>Bem-vindo! Para aceder à sua conta, clique no link: ${process.env.NEXTAUTH_URL}/primeiro-login?token=${token}</p>
            `,
          });
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
          emailVerified: newUser.emailVerified ? newUser.emailVerified.toISOString() : null
        };
      } catch (error) {
        console.error("Erro na criação de utilizador:", error);
        return handlePrismaError(error);
      }
    }),
  
  // Atualizar utilizador
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: updateUtilizadorSchema,
    }))
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
            message: "Não tem permissões para atualizar este utilizador" 
          });
        }
        
        // Se não for admin, não pode alterar permissões
        if (!isAdmin && data.permissao) {
          throw new TRPCError({ 
            code: "FORBIDDEN",
            message: "Não tem permissões para alterar permissões" 
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
  
  // Alterar password
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { currentPassword, newPassword } = input;
        
        // Obter utilizador com password
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          include: { password: true },
        });
        
        if (!user || !user.password) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado",
          });
        }
        
        // Verificar password atual
        const isValidPassword = await compare(currentPassword, user.password.hash);
        
        if (!isValidPassword) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Password atual incorreta",
          });
        }
        
        // Atualizar password
        await ctx.db.password.update({
          where: { userId: user.id },
          data: { hash: await hash(newPassword, 10) },
        });
        
        return { success: true };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Solicitar reset de password
  requestPasswordReset: publicProcedure
    .input(resetPasswordRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const { email } = input as { email: string };
      try {
        // Verificar se utilizador existe
        const user = await ctx.db.user.findUnique({
          where: { email },
        });
        
        if (!user) {
          // Não revelar se o email existe ou não
          return { success: true };
        }
        
        // Gerar token
        const token = randomUUID();
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + 1);
        
        // Guardar token
        await ctx.db.passwordReset.create({
          data: {
            email,
            token,
            expires: tokenExpiry,
          },
        });
        
        // Enviar email
        await sendEmail({
          to: email,
          subject: "Recuperação de Password",
          html: `
            <p>Para redefinir a sua password, clique no link: ${process.env.NEXTAUTH_URL}/reset-password?token=${token}</p>
          `,
        });
        
        return { success: true };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Reset de password
  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const { token, password } = input as { token: string; password: string };
      try {
        // Verificar token
        const resetToken = await ctx.db.passwordReset.findUnique({
          where: { token },
        });
        
        if (!resetToken || resetToken.expires < new Date()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Token inválido ou expirado",
          });
        }
        
        // Obter utilizador
        const user = await ctx.db.user.findUnique({
          where: { email: resetToken.email },
          include: { password: true },
        });
        
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado",
          });
        }
        
        // Atualizar password
        const hashedPassword = await hash(password, 10);
        const hashString = hashedPassword.toString();
        
        if (user.password) {
          await ctx.db.password.update({
            where: { userId: user.id },
            data: { hash: hashString },
          });
        } else {
          await ctx.db.password.create({
            data: {
              userId: user.id,
              hash: hashString,
            },
          });
        }
        
        // Eliminar token
        await ctx.db.passwordReset.delete({
          where: { token },
        });
        
        return { success: true };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Primeiro acesso
  primeiroAcesso: publicProcedure
    .input(primeiroAcessoSchema)
    .mutation(async ({ ctx, input }) => {
      const { token, password } = input as { token: string; password: string };
      try {
        // Verificar token
        const verificationToken = await ctx.db.verificationToken.findUnique({
          where: { token },
        });
        
        if (!verificationToken || verificationToken.expires < new Date()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Token inválido ou expirado",
          });
        }
        
        // Obter utilizador
        const user = await ctx.db.user.findUnique({
          where: { email: verificationToken.identifier },
          include: { password: true },
        });
        
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado",
          });
        }
        
        // Atualizar password e marcar email como verificado
        const hashedPassword = await hash(password, 10);
        const hashString = hashedPassword.toString();
        
        await ctx.db.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
        
        if (user.password) {
          await ctx.db.password.update({
            where: { userId: user.id },
            data: { hash: hashString },
          });
        } else {
          await ctx.db.password.create({
            data: {
              userId: user.id,
              hash: hashString,
            },
          });
        }
        
        // Eliminar token
        await ctx.db.verificationToken.delete({
          where: { token },
        });
        
        return { success: true };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
});