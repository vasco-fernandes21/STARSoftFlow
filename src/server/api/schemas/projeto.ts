import { z } from "zod";
import { ProjetoEstado } from "@prisma/client";
import { paginationSchema } from "./common";

/**
 * Schema base para projetos
 */
export const projetoBaseSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(255, "Nome deve ter no máximo 255 caracteres"),
  descricao: z.string().optional(),
  inicio: z.date().optional(),
  fim: z.date().optional(),
  estado: z.nativeEnum(ProjetoEstado).optional().default(ProjetoEstado.RASCUNHO),
  financiamentoId: z.number().optional(),
});

/**
 * Schema para criação de projeto
 */
export const createProjetoSchema = projetoBaseSchema;

/**
 * Schema para atualização de projeto
 */
export const updateProjetoSchema = projetoBaseSchema.partial();

/**
 * Schema para filtros de projetos
 */
export const projetoFilterSchema = z.object({
  search: z.string().optional(),
  estado: z.nativeEnum(ProjetoEstado).optional(),
  financiamentoId: z.number().optional(),
}).merge(paginationSchema);

/**
 * Schema para validação de datas de projeto
 */
export const projetoDateValidationSchema = z.object({
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