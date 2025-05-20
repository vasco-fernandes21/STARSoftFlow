import { z } from "zod";
import { ProjetoEstado, Rubrica } from "@prisma/client";
import { paginationSchema } from "../../schemas/common";

// Schemas base para entidades menores (reutilizáveis)
const entregavelSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  descricao: z.string().optional(),
  data: z.date().optional(),
});

const tarefaSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  descricao: z.string().optional(),
  inicio: z.date().optional(),
  fim: z.date().optional(),
  estado: z.boolean().optional().default(false),
  entregaveis: z.array(entregavelSchema).optional().default([]),
});

const materialSchema = z.object({
  id: z.number().optional(), // ID temporário para frontend
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  preco: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "string" ? parseFloat(val) : val)),
  quantidade: z.number().min(1, "Quantidade deve ser pelo menos 1"),
  rubrica: z.nativeEnum(Rubrica).default(Rubrica.MATERIAIS),
  ano_utilizacao: z
    .number()
    .int()
    .min(2000, "Ano deve ser válido")
    .max(2100, "Ano deve ser válido"),
});

const alocacaoRecursoSchema = z.object({
  userId: z.string(),
  mes: z.number().min(1).max(12),
  ano: z.number().int().min(2000).max(2100),
  ocupacao: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === "string" ? parseFloat(val) : val)),
  workpackageId: z.string().optional(),
});

const workpackageSchema = z.object({
  id: z.string().optional(), // ID temporário para frontend
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  descricao: z.string().optional(),
  inicio: z.date().optional(),
  fim: z.date().optional(),
  estado: z.boolean().optional().default(false),
  tarefas: z.array(tarefaSchema).optional().default([]),
  materiais: z.array(materialSchema).optional().default([]),
  recursos: z.array(alocacaoRecursoSchema).optional().default([]),
});

// Schema base para validação de datas
export const dateValidationSchema = z
  .object({
    inicio: z.coerce.date().optional(),
    fim: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.inicio && data.fim) {
        return data.inicio <= data.fim;
      }
      return true;
    },
    {
      message: "A data de fim deve ser posterior à data de início",
      path: ["fim"],
    }
  );

// Schema base para projeto (campos comuns)
export const projetoBaseSchema = z.object({
  nome: z
    .string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(255, "Nome deve ter no máximo 255 caracteres"),
  descricao: z.string().optional(),
  inicio: z.coerce.date().optional(),
  fim: z.coerce.date().optional(),
  estado: z.nativeEnum(ProjetoEstado).optional().default(ProjetoEstado.RASCUNHO),
  overhead: z.coerce.number().min(0).max(100).default(0),
  taxa_financiamento: z.coerce.number().min(0).max(100).default(0),
  valor_eti: z.coerce.number().min(0).default(0),
  financiamentoId: z.coerce
    .number()
    .int("ID do financiamento deve ser um número inteiro")
    .optional(),
});

// Schema para criação de projeto (simples)
export const createProjetoSchema = projetoBaseSchema;

// Schema para criação de projeto completo
export const createProjetoCompletoSchema = projetoBaseSchema.extend({
  responsavelId: z.string().optional(),
  rascunhoId: z.string().optional(),
  workpackages: z.array(workpackageSchema).optional().default([]),
});

// Schema para atualização de projeto
export const updateProjetoSchema = z.object({
  id: z.string().uuid("ID do projeto inválido"),
}).merge(projetoBaseSchema.partial());

// Schema para filtros de projeto
export const projetoFilterSchema = z
  .object({
    search: z.string().optional(),
    estado: z.nativeEnum(ProjetoEstado).optional(),
    financiamentoId: z.coerce
      .number()
      .int("ID do financiamento deve ser um número inteiro")
      .optional(),
  })
  .merge(paginationSchema);

// Tipos inferidos dos schemas
export type CreateProjetoInput = z.infer<typeof createProjetoSchema>;
export type CreateProjetoCompletoInput = z.infer<typeof createProjetoCompletoSchema>;
export type UpdateProjetoInput = z.infer<typeof updateProjetoSchema>;
export type ProjetoFilterInput = z.infer<typeof projetoFilterSchema>;

// Schemas para validação específica
export const validarProjetoSchema = z.object({
  id: z.string().uuid("ID do projeto inválido"),
  aprovar: z.boolean(),
});

export const getTotalAlocacoesSchema = z.object({
  projetoIds: z.array(z.string().uuid("ID de projeto inválido")).min(1, "Pelo menos um ID de projeto é obrigatório"),
  ano: z.number().int().optional(),
});
  