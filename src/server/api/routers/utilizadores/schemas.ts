import { z } from "zod";
import { Permissao, Regime } from "@prisma/client";

export type UserWithPermissao = {
    permissao: Permissao;
    id: string;
  } & Record<string, any>;

export const emailSchema = z.string({ required_error: "Email é obrigatório" }).email("Email inválido");

export const passwordSchema = z
  .string({ required_error: "Password é obrigatória" })
  .min(8, "Password deve ter pelo menos 8 caracteres")
  .max(32, "Password deve ter no máximo 32 caracteres")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    "Password deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial"
  );

export const dateSchema = z.union([
  z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data inválida",
  }),
  z.date(),
  z.null(),
]);

export const utilizadorBaseSchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório").optional(),
    email: emailSchema.optional(),
    n_colaborador: z.number().int().min(0).optional(),
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

export const createUtilizadorSchema = utilizadorBaseSchema
  .extend({
    password: passwordSchema.optional(),
  })
  .passthrough();

export const updateUtilizadorSchema = utilizadorBaseSchema.partial();

export const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  n_colaborador: z.number().int().min(0).optional(),
  atividade: z.string().optional(),
  regime: z.nativeEnum(Regime),
  permissao: z.nativeEnum(Permissao),
  informacoes: z.string().optional().nullable(),
  salario: z.preprocess(
    (v) => (v === "" || v === null ? undefined : Number(v)),
    z.number().min(0, "O salário deve ser positivo").optional()
  ),
});

export const convidarUtilizadorSchema = z.object({
  email: emailSchema,
});

export const findAllUtilizadoresInputSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
}).optional();

export const alocacaoValidationSchema = z.object({
  // Permite string vazia ou UUID válido (string vazia para férias/ausências)
  workpackageId: z.union([
    z.literal(""),  // Para férias/ausências
    z.string().uuid("ID do workpackage inválido") // Para workpackages normais
  ]),
  userId: z.string(),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2000),
  ocupacao: z.number().min(0).max(1),
  ignorarAlocacaoAtual: z.boolean().optional().default(false),
});

export const workpackageUserSchema = z.object({
  workpackageId: z.string(),
  userId: z.string(),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2000),
  ocupacao: z.number().min(0).max(1),
});

export const deleteAlocacaoSchema = z.object({
  workpackageId: z.string(),
  userId: z.string(),
  mes: z.number(),
  ano: z.number(),
});

export type CreateUtilizadorInput = z.infer<typeof createUtilizadorSchema>;
export type UpdateUtilizadorInput = z.infer<typeof updateUtilizadorSchema>;
export type WorkpackageUserInput = z.infer<typeof workpackageUserSchema>;
export type DeleteAlocacaoInput = z.infer<typeof deleteAlocacaoSchema>;

// Schemas de configuração mensal (migrados de configuracoes.ts)
export const configuracaoMensalSchema = z.object({
  mes: z.number()
    .int("O mês deve ser um número inteiro")
    .min(1, "O mês deve ser entre 1 e 12")
    .max(12, "O mês deve ser entre 1 e 12"),
  ano: z.number()
    .int("O ano deve ser um número inteiro")
    .min(2000, "O ano deve ser maior ou igual a 2000")
    .max(2100, "O ano deve ser menor ou igual a 2100"),
  diasUteis: z.number()
    .int("Os dias úteis devem ser um número inteiro")
    .min(0, "Os dias úteis não podem ser negativos")
    .max(31, "Os dias úteis não podem ser maiores que 31"),
  jornadaDiaria: z.number()
    .int("A jornada diária deve ser um número inteiro")
    .min(0, "A jornada diária não pode ser negativa")
    .max(24, "A jornada diária não pode ser maior que 24 horas")
    .optional(),
});

export const configuracaoFilterSchema = z.object({
  ano: z.number().int().optional(),
  mes: z.number().int().min(1).max(12).optional(),
  search: z.string().optional(),
  // Adicione aqui outros campos de paginação se necessário
});

export const addConfigMensalUtilizadorSchema = z.object({
  userId: z.string(),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2000).max(2100),
  diasUteis: z.number().int().min(1).max(31),
  jornadaDiaria: z.number().int().min(0).max(24).optional(),
});

export const removeConfigMensalUtilizadorSchema = z.object({
  configId: z.string(),
});

export type ConfiguracaoMensalInput = z.infer<typeof configuracaoMensalSchema>;
export type ConfiguracaoFilterInput = z.infer<typeof configuracaoFilterSchema>;
