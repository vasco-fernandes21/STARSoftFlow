import { z } from "zod";
import { paginationSchema } from "./common";

/**
 * Schema base para workpackages
 */
export const workpackageBaseSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(255, "Nome deve ter no máximo 255 caracteres"),
  projetoId: z.string().uuid("ID de projeto inválido"),
  inicio: z.date().optional(),
  fim: z.date().optional(),
  estado: z.boolean().default(false),
});

/**
 * Schema para criação de workpackage
 */
export const createWorkpackageSchema = workpackageBaseSchema;

/**
 * Schema para atualização de workpackage
 */
export const updateWorkpackageSchema = workpackageBaseSchema.partial().extend({
  projetoId: z.string().uuid("ID de projeto inválido").optional(),
});

/**
 * Schema para filtros de workpackages
 */
export const workpackageFilterSchema = z.object({
  projetoId: z.string().uuid("ID de projeto inválido").optional(),
  search: z.string().optional(),
  estado: z.boolean().optional(),
}).merge(paginationSchema);

/**
 * Schema para recursos (utilizadores) em workpackages
 */
export const workpackageUserSchema = z.object({
  userId: z.string(),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2000),
  ocupacao: z.number().min(0).max(1),
});

/**
 * Schema para validação de datas de workpackage
 */
export const workpackageDateValidationSchema = z.object({
  inicio: z.date().optional(),
  fim: z.date().optional(),
}).refine(
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