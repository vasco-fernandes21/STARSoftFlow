import { z } from "zod";

/**
 * Schema para paginação padrão
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

/**
 * Schema para ordenação
 */
export const sortSchema = z.object({
  field: z.string(),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

/**
 * Tipo genérico para resposta paginada
 */
export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    total: number;
    pages: number;
    page: number;
    limit: number;
  };
};

/**
 * Função para gerar parâmetros de paginação para o Prisma
 */
export const getPaginationParams = (page: number, limit: number) => {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
};
