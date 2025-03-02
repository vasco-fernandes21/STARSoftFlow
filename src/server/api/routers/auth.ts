import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";
import { Prisma } from "@prisma/client";

// Importar schemas e utilidades
import {
  loginSchema,
  resetPasswordRequestSchema
} from "../schemas/auth";
import { emailSchema, passwordSchema } from "../schemas/utilizador";
import { handlePrismaError } from "../utils";

// Tipo personalizado para o utilizador com campos adicionais
type UserWithAuth = {
  id: string;
  email: string | null;
  name: string | null;
  emailVerified: Date | null;
  // Campos extras para autenticação
  password?: {
    hash: string;
  } | null;
  ativo?: boolean;
  resetToken?: string | null;
  resetTokenExpira?: Date | null;
  primeiroAcessoToken?: string | null;
  primeiroAcessoExpira?: Date | null;
};

// Definir novos schemas diretamente
const resetPasswordSchema = z.object({
  token: z.string(),
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirmação de password é obrigatória"),
  email: z.string().email("Email inválido"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

const primeiroAcessoSchema = z.object({
  token: z.string(),
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirmação de password é obrigatória"),
  email: z.string().email("Email inválido"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

export const authRouter = createTRPCRouter({
  // Login 
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { email, password } = input;
        
        // Buscar utilizador pelo email
        const user = await ctx.db.user.findUnique({
          where: { email },
          include: { password: true },
        }) as unknown as UserWithAuth;
        
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado",
          });
        }
        
        // Verificar se o utilizador está ativo
        if (user.ativo === false) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Conta desativada. Contacte o administrador.",
          });
        }
        
        // Verificar se a password existe (pode não existir se for primeiro acesso)
        if (!user.password) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "É necessário definir uma password (primeiro acesso)",
          });
        }
        
        // Verificar password
        const passwordCorrect = await bcrypt.compare(password, user.password.hash);
        if (!passwordCorrect) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Password incorreta",
          });
        }
        
        // Verificar verificação de email
        if (!user.emailVerified) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Email não verificado",
          });
        }
        
        // Registrar último login
        await ctx.db.user.update({
          where: { id: user.id },
          data: {
            // Use um campo compatível com o modelo ou guarde esta informação em outra tabela
            // ultimoLogin: new Date(),
          },
        });
        
        // Retornar dados do utilizador (excluindo a password)
        const userWithoutPassword = {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          // Outros campos que você queira incluir
        };
        
        return userWithoutPassword;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Obter dados do utilizador atual
  me: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Buscar dados atualizados do utilizador
        const user = await ctx.db.user.findUnique({
          where: { id: userId },
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
  
  // Solicitar redefinição de password
  requestPasswordReset: publicProcedure
    .input(resetPasswordRequestSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { email } = input;
        
        // Buscar utilizador pelo email
        const user = await ctx.db.user.findUnique({
          where: { email },
        }) as unknown as UserWithAuth;
        
        // Se o utilizador não existir, não informamos ao cliente
        // para evitar divulgação de informações sobre quais emails estão cadastrados
        if (!user || user.ativo === false) {
          return { success: true };
        }
        
        // Gerar token único
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(resetToken, 10);
        
        // Salvar token e data de expiração (24 horas)
        const tokenExpira = new Date();
        tokenExpira.setHours(tokenExpira.getHours() + 24);
        
        // Aqui precisamos verificar se nossa tabela tem os campos para resetToken
        // ou usar uma tabela separada para armazenar tokens
        await ctx.db.passwordReset.create({
          data: {
            email: user.email || "",
            token: resetToken,
            expires: tokenExpira,
          }
        });
        
        // Enviar email com link para redefinição
        const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}&email=${email}`;
        
        await sendEmail({
          to: email,
          subject: "Recuperação de Password",
          html: `
            <p>Olá ${user.name || "Utilizador"},</p>
            <p>Foi solicitada a recuperação de password para a sua conta.</p>
            <p>Clique no link abaixo para definir uma nova password:</p>
            <a href="${resetLink}">Redefinir Password</a>
            <p>Este link é válido por 24 horas.</p>
            <p>Se você não solicitou esta alteração, ignore este email.</p>
          `,
        });
        
        return { success: true };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Redefinir password
  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { token, password, email } = input;
        
        // Verificar token na tabela passwordReset
        const resetToken = await ctx.db.passwordReset.findUnique({
          where: { token },
        });
        
        if (!resetToken || resetToken.expires < new Date()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Token inválido ou expirado",
          });
        }
        
        // Buscar utilizador pelo email
        const user = await ctx.db.user.findUnique({
          where: { email },
          include: { password: true },
        });
        
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado",
          });
        }
        
        // Hash da nova password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Atualizar password
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
        
        // Marcar email como verificado
        await ctx.db.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
        
        // Eliminar token
        await ctx.db.passwordReset.delete({
          where: { token },
        });
        
        return { success: true };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Primeiro acesso (ativação de conta)
  primeiroAcesso: publicProcedure
    .input(primeiroAcessoSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { email, token, password } = input;
        
        // Em vez de usar campos personalizados no modelo User,
        // vamos verificar o token na tabela verificationToken
        const verificationToken = await ctx.db.verificationToken.findUnique({
          where: { token },
        });
        
        if (!verificationToken || verificationToken.expires < new Date() || verificationToken.identifier !== email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Token inválido ou expirado",
          });
        }
        
        // Buscar utilizador pelo email
        const user = await ctx.db.user.findUnique({
          where: { email },
          include: { password: true },
        });
        
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado",
          });
        }
        
        // Hash da nova password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Atualizar password
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
        
        // Marcar email como verificado
        await ctx.db.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
        
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