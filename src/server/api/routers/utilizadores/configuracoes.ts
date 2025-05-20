import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Decimal } from "decimal.js";
import { Permissao } from "@prisma/client";
import { handlePrismaError } from "../../utils";
import { z } from "zod";
import {
  configuracaoMensalSchema,
  configuracaoFilterSchema,
  addConfigMensalUtilizadorSchema,
  removeConfigMensalUtilizadorSchema,
} from "./schemas";

// Tipo para verificar permissões de utilizador
// (pode ser importado de schemas se preferir)
type UserWithPermissao = {
  permissao: Permissao;
  id: string;
} & Record<string, any>;

export const configuracoesUtilizadorRouter = createTRPCRouter({
  create: protectedProcedure
    .input(configuracaoMensalSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || user.permissao !== Permissao.ADMIN) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não tem permissões para criar configurações",
          });
        }
        const existingConfig = await ctx.db.configuracaoMensal.findFirst({
          where: { mes: input.mes, ano: input.ano },
        });
        if (existingConfig) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Já existe configuração para ${input.mes}/${input.ano}`,
          });
        }
        const newConfig = await ctx.db.configuracaoMensal.create({
          data: {
            mes: input.mes,
            ano: input.ano,
            diasUteis: input.diasUteis,
            ...(input.jornadaDiaria !== undefined ? { jornadaDiaria: input.jornadaDiaria } : {}),
          },
        });
        return newConfig;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid("ID inválido"),
        data: configuracaoMensalSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || user.permissao !== Permissao.ADMIN) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não tem permissões para atualizar configurações",
          });
        }
        const existingConfig = await ctx.db.configuracaoMensal.findUnique({
          where: { id: input.id },
        });
        if (!existingConfig) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Configuração não encontrada",
          });
        }
        if ((input.data.mes && input.data.mes !== existingConfig.mes) ||
            (input.data.ano && input.data.ano !== existingConfig.ano)) {
          const mesAlvo = input.data.mes ?? existingConfig.mes;
          const anoAlvo = input.data.ano ?? existingConfig.ano;
          const duplicateConfig = await ctx.db.configuracaoMensal.findFirst({
            where: {
              mes: mesAlvo,
              ano: anoAlvo,
              id: { not: input.id },
            },
          });
          if (duplicateConfig) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Já existe configuração para ${mesAlvo}/${anoAlvo}`,
            });
          }
        }
        const updatedConfig = await ctx.db.configuracaoMensal.update({
          where: { id: input.id },
          data: input.data,
        });
        return updatedConfig;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  findAll: protectedProcedure
    .input(configuracaoFilterSchema.optional())
    .query(async ({ ctx, input }) => {
      try {
        const { ano, mes } = input || {};
        const page = (input && 'page' in input && typeof input.page === 'number') ? input.page : 1;
        const limit = (input && 'limit' in input && typeof input.limit === 'number') ? input.limit : 10;
        const where = {
          ...(ano ? { ano } : {}),
          ...(mes ? { mes } : {}),
        };
        const skip = (page - 1) * limit;
        const take = limit;
        const [configs, total] = await Promise.all([
          ctx.db.configuracaoMensal.findMany({
            where,
            orderBy: [
              { ano: "desc" },
              { mes: "asc" },
            ],
            skip,
            take,
          }),
          ctx.db.configuracaoMensal.count({ where }),
        ]);
        return {
          items: configs,
          total,
          page,
          limit,
        };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  getByAno: protectedProcedure
    .input(z.number().int())
    .query(async ({ ctx, input: ano }) => {
      try {
        const configs = await ctx.db.configuracaoMensal.findMany({
          where: { ano },
          orderBy: { mes: "asc" },
        });
        return configs;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  delete: protectedProcedure
    .input(z.string().uuid("ID inválido"))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || user.permissao !== Permissao.ADMIN) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não tem permissões para excluir configurações",
          });
        }
        const existingConfig = await ctx.db.configuracaoMensal.findUnique({
          where: { id: input },
        });
        if (!existingConfig) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Configuração não encontrada",
          });
        }
        await ctx.db.configuracaoMensal.delete({ where: { id: input } });
        return { success: true, message: "Configuração excluída com sucesso" };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  findUtilizador: protectedProcedure
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

  createUtilizador: protectedProcedure
    .input(addConfigMensalUtilizadorSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { userId, mes, ano, diasUteis, jornadaDiaria } = input;
        const existingConfig = await ctx.db.configuracaoUtilizadorMensal.findFirst({
          where: { userId, mes, ano },
        });
        if (existingConfig) {
          const updatedConfig = await ctx.db.configuracaoUtilizadorMensal.update({
            where: { id: existingConfig.id },
            data: {
              diasUteis,
              jornadaDiaria,
            },
          });
          return updatedConfig;
        } else {
          const newConfig = await ctx.db.configuracaoUtilizadorMensal.create({
            data: {
              userId,
              mes,
              ano,
              diasUteis,
              jornadaDiaria,
            },
          });
          return newConfig;
        }
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  deleteUtilizador: protectedProcedure
    .input(removeConfigMensalUtilizadorSchema)
    .mutation(async ({ ctx, input }) => {
      try {
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
        const sessionUser = ctx.session.user as UserWithPermissao;
        if (sessionUser.id !== config.userId && sessionUser.permissao !== "ADMIN") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não tem permissão para remover esta configuração",
          });
        }
        await ctx.db.configuracaoUtilizadorMensal.delete({ where: { id: input.configId } });
        return { success: true };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
}); 