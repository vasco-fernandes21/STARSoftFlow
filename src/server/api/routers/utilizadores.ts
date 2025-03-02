import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Permissao, Regime, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { sendEmail } from "@/lib/email";
import { hash, compare } from "bcrypt";
import { z } from "zod";

// Importar schemas e utilidades
import { 
  createUtilizadorSchema,
  updateUtilizadorSchema,
  utilizadorFilterSchema,
  changePasswordSchema
} from "../schemas/utilizador";
import { 
  resetPasswordRequestSchema,
  resetPasswordSchema,
  primeiroAcessoSchema 
} from "../schemas/auth";
import { createPaginatedResponse, handlePrismaError } from "../utils";
import { getPaginationParams } from "../schemas/common";

// Tipo estendido para o utilizador com as propriedades que precisamos
type UserWithPermissao = {
  permissao: Permissao;
  id: string;
  // Outras propriedades do utilizador
} & Record<string, any>;

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
      try {
        const { email } = input;
        
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
      try {
        const { token, password } = input;
        
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
        
        if (user.password) {
          await ctx.db.password.update({
            where: { userId: user.id },
            data: { hash: hashedPassword },
          });
        } else {
          await ctx.db.password.create({
            data: {
              userId: user.id,
              hash: hashedPassword,
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
      try {
        const { token, password } = input;
        
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
        
        await ctx.db.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
        
        if (user.password) {
          await ctx.db.password.update({
            where: { userId: user.id },
            data: { hash: hashedPassword },
          });
        } else {
          await ctx.db.password.create({
            data: {
              userId: user.id,
              hash: hashedPassword,
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