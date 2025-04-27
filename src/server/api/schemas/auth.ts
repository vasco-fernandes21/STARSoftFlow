import { z } from "zod";
import { emailSchema, passwordSchema } from "./utilizador";

/**
 * Schema para login
 */
export const loginSchema = z.object({
  email: z.string({ required_error: "Email é obrigatório" })
    .min(1, "Email é obrigatório")
    .email("Email inválido"),
  password: z.string({ required_error: "Password é obrigatória" })
    .min(1, "Password é obrigatória")
    .min(8, "Password deve ter pelo menos 8 caracteres")
    .max(32, "Password deve ter no máximo 32 caracteres"),
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
export const resetPasswordSchema = z
  .object({
    token: z.string(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirmação de password é obrigatória"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As passwords não coincidem",
    path: ["confirmPassword"],
  });

/**
 * Schema para validação de primeiro acesso
 */
export const primeiroAcessoSchema = z
  .object({
    token: z.string(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirmação de password é obrigatória"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As passwords não coincidem",
    path: ["confirmPassword"],
  });
