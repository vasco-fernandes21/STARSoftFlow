import { z } from "zod";

/**
 * Schema para paginação padrão
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
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
