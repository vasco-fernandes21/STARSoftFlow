import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";
import { Prisma } from "@prisma/client";
import { handlePrismaError } from "../utils";
import { generateToken } from "../utils/token";
import { sendPasswordResetEmail, sendPrimeiroAcessoEmail } from "../utils/email";
import { hashPassword, verifyPassword } from "../utils/password";

// Schemas base
const emailSchema = z.string().email("Email inválido");
const passwordSchema = z
  .string()
  .min(8, "A password deve ter pelo menos 8 caracteres")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    "A password deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial"
  );

/**
 * Schema para login
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Schema para reset de password
 */
export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});

/**
 * Schema para definir nova password após reset
 */
export const resetPasswordSchema = z.object({
  email: emailSchema,
  token: z.string(),
  password: passwordSchema,
  confirmPassword: passwordSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

/**
 * Schema para validação de primeiro acesso
 */
export const primeiroAcessoSchema = z.object({
  email: emailSchema,
  token: z.string(),
  password: passwordSchema,
  confirmPassword: passwordSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

// Tipos inferidos dos schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type PrimeiroAcessoInput = z.infer<typeof primeiroAcessoSchema>;

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

export const authRouter = createTRPCRouter({
  // Login 
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
        include: { password: true }
      });

      if (!user || !user.password) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilizador não encontrado",
        });
      }

      const isValid = await verifyPassword(input.password, user.password.hash);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Password incorreta",
        });
      }

      return { user };
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
  resetPasswordRequest: publicProcedure
    .input(resetPasswordRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilizador não encontrado",
        });
      }

      const token = generateToken();
      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}&email=${input.email}`;

      // Criar ou atualizar o token de reset
      await ctx.db.passwordReset.create({
        data: {
          email: input.email,
          token: token,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        },
      });

      await sendPasswordResetEmail(input.email, resetLink);

      return { success: true };
    }),
  
  // Redefinir password
  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      // Verificar token de reset
      const resetToken = await ctx.db.passwordReset.findFirst({
        where: {
          email: input.email,
          token: input.token,
          expires: { gt: new Date() },
        },
      });

      if (!resetToken) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Token inválido ou expirado",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
        include: { password: true }
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilizador não encontrado",
        });
      }

      const hashedPassword = await hashPassword(input.password);

      // Atualizar ou criar password
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

      // Remover token de reset
      await ctx.db.passwordReset.delete({
        where: { token: input.token },
      });

      return { success: true };
    }),
  
  // Primeiro acesso (ativação de conta)
  primeiroAcesso: publicProcedure
    .input(primeiroAcessoSchema)
    .mutation(async ({ ctx, input }) => {
      // Verificar token de verificação
      const verificationToken = await ctx.db.verificationToken.findFirst({
        where: {
          identifier: input.email,
          token: input.token,
          expires: { gt: new Date() },
        },
      });

      if (!verificationToken) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Token inválido ou expirado",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
        include: { password: true }
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilizador não encontrado",
        });
      }

      const hashedPassword = await hashPassword(input.password);

      // Atualizar ou criar password
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

      // Atualizar dados do utilizador
      await ctx.db.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
        },
      });

      // Remover token de verificação
      await ctx.db.verificationToken.delete({
        where: { token: input.token },
      });

      return { success: true };
    }),
}); 