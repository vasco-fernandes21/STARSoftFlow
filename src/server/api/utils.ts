import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import type { PaginatedResponse } from "./schemas/common";
import { format, addMonths, differenceInMonths } from "date-fns";
import { pt } from "date-fns/locale";

/**
 * Classe de erro personalizada que estende TRPCError
 */
export class AppError extends TRPCError {
  constructor(code: TRPCError["code"], message: string) {
    super({ code, message });
  }
}

/**
 * Função para tratar erros do Prisma
 */
export const handlePrismaError = (error: unknown): never => {
  // Log do erro para depuração
  if (process.env.NODE_ENV === 'development') {
    console.error("Erro detalhado:", error);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Erros específicos do Prisma
    if (error.code === "P2002") {
      const target = error.meta?.target as string[] || [];
      const field = target.length > 0 ? target[0] : "campo";
      throw new AppError("CONFLICT", `Já existe um registo com este valor único no campo ${field}`);
    }
    if (error.code === "P2025") {
      throw new AppError("NOT_FOUND", "Registo não encontrado");
    }
    if (error.code === "P2003") {
      throw new AppError("BAD_REQUEST", "Referência inválida para outro registo");
    }
  }
  
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof Error) {
    throw new AppError("INTERNAL_SERVER_ERROR", `Erro: ${error.message}`);
  }

  // Erro genérico
  throw new AppError("INTERNAL_SERVER_ERROR", "Ocorreu um erro interno");
};

/**
 * Função para criar uma resposta paginada
 */
export const createPaginatedResponse = <T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> => {
  return {
    items,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      page,
      limit,
    },
  };
};

/**
 * Tipo para condições de pesquisa
 */
type SearchCondition = {
  OR: {
    [key: string]: {
      contains: string;
      mode: "insensitive";
    };
  }[];
};

/**
 * Função para construir condições de pesquisa para Prisma
 */
export const buildSearchCondition = <T extends Record<string, any>>(
  search: string | undefined,
  fields: Array<keyof T>
): SearchCondition | undefined => {
  if (!search) return undefined;

  return {
    OR: fields.map(field => ({
      [field as string]: {
        contains: search,
        mode: "insensitive",
      },
    })),
  };
};

/**
 * Função para converter datas em objetos para ISO strings
 */
export const serializeObject = <T>(obj: T): T => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const result = { ...obj } as any;
  
  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      const value = result[key];
      
      if (value instanceof Date) {
        result[key] = value.toISOString();
      } else if (value !== null && typeof value === 'object') {
        result[key] = serializeObject(value);
      }
    }
  }
  
  return result as T;
};

export function gerarMesesEntreDatas(dataInicio: Date, dataFim: Date): {
  chave: string;
  nome: string;
  mesNumero: number;
  ano: number;
  data: Date;
  formatado: string;
}[] {
  const meses = [];
  const numMeses = differenceInMonths(dataFim, dataInicio) + 1;
  
  for (let i = 0; i < numMeses; i++) {
    const data = addMonths(dataInicio, i);
    const mesNumero = data.getMonth() + 1;
    const ano = data.getFullYear();
    const nome = format(data, 'MMM', { locale: pt });
    const chave = `${mesNumero}-${ano}`;
    const formatado = `${nome.charAt(0).toUpperCase() + nome.slice(1, 3)}/${String(ano).slice(2)}`;
    
    meses.push({
      chave,
      nome,
      mesNumero,
      ano,
      data,
      formatado
    });
  }
  
  return meses;
} 