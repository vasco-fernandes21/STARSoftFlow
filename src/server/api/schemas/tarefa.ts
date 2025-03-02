import { z } from "zod";
import { paginationSchema } from "./common";

/**
 * Schema base para tarefas
 */
export const tarefaBaseSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(255, "Nome deve ter no máximo 255 caracteres"),
  workpackageId: z.string().uuid("ID de workpackage inválido"),
  inicio: z.date().optional(),
  fim: z.date().optional(),
  estado: z.boolean().default(false),
});

/**
 * Schema para criação de tarefa
 */
export const createTarefaSchema = tarefaBaseSchema;

/**
 * Schema para atualização de tarefa
 */
export const updateTarefaSchema = tarefaBaseSchema.partial().extend({
  workpackageId: z.string().uuid("ID de workpackage inválido").optional(),
});

/**
 * Schema para filtros de tarefas
 */
export const tarefaFilterSchema = z.object({
  workpackageId: z.string().uuid("ID de workpackage inválido").optional(),
  search: z.string().optional(),
  estado: z.boolean().optional(),
}).merge(paginationSchema);

/**
 * Schema para validação de datas de tarefa
 */
export const tarefaDateValidationSchema = z.object({
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