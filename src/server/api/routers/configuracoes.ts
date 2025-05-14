import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Permissao } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { createPaginatedResponse, handlePrismaError } from "../utils";
import { paginationSchema, getPaginationParams } from "../schemas/common";
import { Decimal } from "decimal.js";

// Tipo para verificar permissões de utilizador
type UserWithPermissao = {
  permissao: Permissao;
  id: string;
} & Record<string, any>;

// Schema para validação de dados de configuração mensal
const configuracaoMensalSchema = z.object({
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
  horasPotenciais: z.number()
    .min(0, "As horas potenciais não podem ser negativas")
    .max(1000, "As horas potenciais não podem ser maiores que 1000"),
  jornadaDiaria: z.number()
    .int("A jornada diária deve ser um número inteiro")
    .min(0, "A jornada diária não pode ser negativa")
    .max(24, "A jornada diária não pode ser maior que 24 horas")
    .optional(),
});

// Schema para filtros de pesquisa
const configuracaoFilterSchema = z.object({
  ano: z.number().int().optional(),
  mes: z.number().int().min(1).max(12).optional(),
  search: z.string().optional(),
}).merge(paginationSchema);

// Schema para adição de configuração mensal do utilizador
const addConfigMensalUtilizadorSchema = z.object({
  userId: z.string(),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2000).max(2100),
  diasUteis: z.number().int().min(1).max(31),
  horasPotenciais: z.number().min(0),
  jornadaDiaria: z.number().int().min(0).max(24).optional(),
});

// Schema para remoção de configuração mensal do utilizador
const removeConfigMensalUtilizadorSchema = z.object({
  configId: z.string(),
});

// Tipos inferidos dos schemas
export type ConfiguracaoMensalInput = z.infer<typeof configuracaoMensalSchema>;
export type ConfiguracaoFilterInput = z.infer<typeof configuracaoFilterSchema>;

export const configuracaoRouter = createTRPCRouter({
  // Criar nova configuração mensal
  create: protectedProcedure
    .input(configuracaoMensalSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verificar permissões (apenas admin pode criar configurações)
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || user.permissao !== Permissao.ADMIN) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não tem permissões para criar configurações",
          });
        }

        // Verificar se já existe configuração para este mês/ano
        const existingConfig = await ctx.db.configuracaoMensal.findFirst({
          where: {
            mes: input.mes,
            ano: input.ano
          }
        });

        if (existingConfig) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Já existe configuração para ${input.mes}/${input.ano}`,
          });
        }

        // Criar nova configuração
        const newConfig = await ctx.db.configuracaoMensal.create({
          data: {
            mes: input.mes,
            ano: input.ano,
            diasUteis: input.diasUteis,
            horasPotenciais: new Decimal(input.horasPotenciais),
            ...(input.jornadaDiaria !== undefined ? { jornadaDiaria: input.jornadaDiaria } : {})
          }
        });

        return newConfig;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Atualizar configuração existente
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid("ID inválido"),
      data: configuracaoMensalSchema.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verificar permissões (apenas admin pode atualizar configurações)
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || user.permissao !== Permissao.ADMIN) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não tem permissões para atualizar configurações",
          });
        }

        // Verificar se a configuração existe
        const existingConfig = await ctx.db.configuracaoMensal.findUnique({
          where: { id: input.id }
        });

        if (!existingConfig) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Configuração não encontrada",
          });
        }

        // Se estiver a mudar o mês ou ano, verificar se já existe para essa combinação
        if ((input.data.mes && input.data.mes !== existingConfig.mes) || 
            (input.data.ano && input.data.ano !== existingConfig.ano)) {
          
          const mesAlvo = input.data.mes ?? existingConfig.mes;
          const anoAlvo = input.data.ano ?? existingConfig.ano;
          
          const duplicateConfig = await ctx.db.configuracaoMensal.findFirst({
            where: {
              mes: mesAlvo,
              ano: anoAlvo,
              id: { not: input.id }
            }
          });

          if (duplicateConfig) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Já existe configuração para ${mesAlvo}/${anoAlvo}`,
            });
          }
        }

        // Atualizar configuração
        const updatedConfig = await ctx.db.configuracaoMensal.update({
          where: { id: input.id },
          data: input.data,
        });

        return updatedConfig;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Obter configuração por ID
  getById: protectedProcedure
    .input(z.string().uuid("ID inválido"))
    .query(async ({ ctx, input }) => {
      try {
        const config = await ctx.db.configuracaoMensal.findUnique({
          where: { id: input }
        });

        if (!config) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Configuração não encontrada",
          });
        }

        return config;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Obter configuração específica por mês/ano
  getByMesAno: protectedProcedure
    .input(z.object({
      mes: z.number().int().min(1).max(12),
      ano: z.number().int()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const config = await ctx.db.configuracaoMensal.findFirst({
          where: {
            mes: input.mes,
            ano: input.ano
          }
        });

        if (!config) {
          // Não lançamos erro caso não exista, apenas retornamos null
          // para que o cliente possa verificar e agir de acordo
          return null;
        }

        return config;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Listar todas as configurações com filtros e paginação
  findAll: protectedProcedure
    .input(configuracaoFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        const { ano, mes, page = 1, limit = 10 } = input || {};

        // Construir condições de filtro
        const where: Prisma.ConfiguracaoMensalWhereInput = {
          ...(ano ? { ano } : {}),
          ...(mes ? { mes } : {}),
        };

        // Parâmetros de paginação
        const { skip, take } = getPaginationParams(page, limit);

        // Executar query com contagem
        const [configs, total] = await Promise.all([
          ctx.db.configuracaoMensal.findMany({
            where,
            orderBy: [
              { ano: "desc" },
              { mes: "asc" }
            ],
            skip,
            take,
          }),
          ctx.db.configuracaoMensal.count({ where }),
        ]);

        return createPaginatedResponse(configs, total, page, limit);
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Obter configurações de um ano específico
  getByAno: protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: ano }) => {
      try {
        const configs = await ctx.db.configuracaoMensal.findMany({
          where: { ano },
          orderBy: { mes: "asc" }
        });

        return configs;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Excluir configuração
  delete: protectedProcedure
    .input(z.string().uuid("ID inválido"))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verificar permissões (apenas admin pode excluir configurações)
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || user.permissao !== Permissao.ADMIN) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não tem permissões para excluir configurações",
          });
        }

        // Verificar se a configuração existe
        const existingConfig = await ctx.db.configuracaoMensal.findUnique({
          where: { id: input }
        });

        if (!existingConfig) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Configuração não encontrada",
          });
        }

        // Excluir configuração
        await ctx.db.configuracaoMensal.delete({
          where: { id: input }
        });

        return { success: true, message: "Configuração excluída com sucesso" };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
    
  // Obter as configurações do ano atual e anterior para comparação
  getComparativoAnual: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const anoAtual = new Date().getFullYear();
        const anoAnterior = anoAtual - 1;
        
        // Buscar configurações dos dois anos
        const [configsAnoAtual, configsAnoAnterior] = await Promise.all([
          ctx.db.configuracaoMensal.findMany({
            where: { ano: anoAtual },
            orderBy: { mes: "asc" }
          }),
          ctx.db.configuracaoMensal.findMany({
            where: { ano: anoAnterior },
            orderBy: { mes: "asc" }
          })
        ]);
        
        // Calcular totais para comparação
        const totalDiasUteisAtual = configsAnoAtual.reduce((sum, cfg) => sum + cfg.diasUteis, 0);
        const totalHorasAtual = configsAnoAtual.reduce((sum, cfg) => sum + Number(cfg.horasPotenciais), 0);
        
        const totalDiasUteisAnterior = configsAnoAnterior.reduce((sum, cfg) => sum + cfg.diasUteis, 0);
        const totalHorasAnterior = configsAnoAnterior.reduce((sum, cfg) => sum + Number(cfg.horasPotenciais), 0);
        
        // Retornar o comparativo estruturado
        return {
          anoAtual: {
            ano: anoAtual,
            configuracoes: configsAnoAtual,
            totalDiasUteis: totalDiasUteisAtual,
            totalHorasPotenciais: totalHorasAtual
          },
          anoAnterior: {
            ano: anoAnterior,
            configuracoes: configsAnoAnterior,
            totalDiasUteis: totalDiasUteisAnterior,
            totalHorasPotenciais: totalHorasAnterior
          }
        };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  // Obter configurações mensais do utilizador
  getConfigMensalUtilizador: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const configs = await ctx.db.configuracaoUtilizadorMensal.findMany({
          where: { userId: input.userId },
          orderBy: [
            { ano: "desc" },
            { mes: "desc" },
          ],
        });
        
        return configs;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
    
  // Adicionar configuração mensal do utilizador
  addConfigMensalUtilizador: protectedProcedure
    .input(addConfigMensalUtilizadorSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { userId, mes, ano, diasUteis, horasPotenciais, jornadaDiaria } = input;
        
        // Verificar se já existe uma configuração para este mês/ano
        const existingConfig = await ctx.db.configuracaoUtilizadorMensal.findFirst({
          where: {
            userId,
            mes,
            ano,
          },
        });
        
        if (existingConfig) {
          // Atualizar configuração existente
          const updatedConfig = await ctx.db.configuracaoUtilizadorMensal.update({
            where: { id: existingConfig.id },
            data: {
              diasUteis,
              horasPotenciais: new Decimal(horasPotenciais),
              jornadaDiaria,
            },
          });
          
          return updatedConfig;
        } else {
          // Criar nova configuração
          const newConfig = await ctx.db.configuracaoUtilizadorMensal.create({
            data: {
              userId,
              mes,
              ano,
              diasUteis,
              horasPotenciais: new Decimal(horasPotenciais),
              jornadaDiaria,
            },
          });
          
          return newConfig;
        }
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
    
  // Remover configuração mensal do utilizador
  removeConfigMensalUtilizador: protectedProcedure
    .input(removeConfigMensalUtilizadorSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verificar se a configuração existe
        const config = await ctx.db.configuracaoUtilizadorMensal.findUnique({
          where: { id: input.configId },
          include: { user: true },
        });
        
        if (!config) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Configuração não encontrada",
          });
        }
        
        // Verificar permissões
        const sessionUser = ctx.session.user as UserWithPermissao;
        if (sessionUser.id !== config.userId && sessionUser.permissao !== "ADMIN") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não tem permissão para remover esta configuração",
          });
        }
        
        // Remover a configuração
        await ctx.db.configuracaoUtilizadorMensal.delete({
          where: { id: input.configId },
        });
        
        return { success: true };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
});
