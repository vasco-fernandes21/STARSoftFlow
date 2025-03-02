import { z } from "zod";
import { Permissao, Regime } from "@prisma/client";
import { paginationSchema } from "./common";

/**
 * Schema para validação de email
 */
export const emailSchema = z
  .string({ required_error: "Email é obrigatório" })
  .email("Email inválido");

/**
 * Schema para validação de password
 */
export const passwordSchema = z
  .string({ required_error: "Password é obrigatória" })
  .min(8, "Password deve ter pelo menos 8 caracteres")
  .max(32, "Password deve ter no máximo 32 caracteres")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    "Password deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial"
  );

/**
 * Schema para validação de data
 */
export const dateSchema = z.union([
  z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data inválida",
  }),
  z.date(),
  z.null(),
]);

/**
 * Schema base para utilizadores
 */
export const utilizadorBaseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: emailSchema,
  foto: z.string().nullable().optional(),
  atividade: z.string().min(1, "Atividade é obrigatória"),
  contratacao: dateSchema,
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  permissao: z.nativeEnum(Permissao),
  regime: z.nativeEnum(Regime)
}).passthrough();

/**
 * Schema para criação de utilizador
 */
export const createUtilizadorSchema = utilizadorBaseSchema.extend({
  password: passwordSchema.optional(),
}).passthrough();

/**
 * Schema para atualização de utilizador
 */
export const updateUtilizadorSchema = utilizadorBaseSchema.partial();

/**
 * Schema para alteração de password
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password atual é obrigatória"),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "Confirmação de password é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As passwords não coincidem",
  path: ["confirmPassword"],
});

/**
 * Schema para filtros de utilizadores
 */
export const utilizadorFilterSchema = z.object({
  search: z.string().optional(),
  permissao: z.nativeEnum(Permissao).optional(),
  regime: z.nativeEnum(Regime).optional(),
}).merge(paginationSchema); 