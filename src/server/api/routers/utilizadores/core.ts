import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Permissao } from "@prisma/client";
import { randomUUID } from "crypto";
import { sendPrimeiroAcessoEmail, sendPasswordResetEmail } from "@/emails/utils/email";
import { handlePrismaError } from "@/server/api/utils";
import { listProfilePhotos } from "@/lib/blob";
import { hash } from "bcryptjs";
import {
  createUtilizadorSchema,
  updateUtilizadorSchema,
  convidarUtilizadorSchema,
  findAllUtilizadoresInputSchema,
} from "./schemas";
import type { UserWithPermissao } from "./schemas";


export const coreUtilizadorRouter = createTRPCRouter({
  findAll: protectedProcedure
    .input(findAllUtilizadoresInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        const page = input?.page;
        const limit = input?.limit;
        const hasPagination = typeof page === 'number' && typeof limit === 'number' && page > 0 && limit > 0;
        const users = await ctx.db.user.findMany({
          where: {},
          select: {
            id: true,
            name: true,
            email: true,
            atividade: true,
            contratacao: true,
            username: true,
            permissao: true,
            regime: true,
            emailVerified: true,
          },
          orderBy: { name: "asc" },
          ...(hasPagination && { skip: (page - 1) * limit, take: limit }),
        });
        const totalCount = await ctx.db.user.count({ where: {} });
        const usersWithPhotos = await Promise.all(
          users.map(async (user) => {
            let profilePhotoUrl: string | null = null;
            try {
              const photoBlobs = await listProfilePhotos(user.id);
              if (photoBlobs.blobs.length > 0) {
                profilePhotoUrl = photoBlobs.blobs[0]?.url || null;
              }
            } catch (photoError) {
              // Não quebrar a query principal por causa da foto
            }
            return { ...user, profilePhotoUrl };
          })
        );
        return { items: usersWithPhotos, totalCount };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  findById: protectedProcedure.input(z.string()).query(async ({ ctx, input: id }) => {
    try {
      const user = await ctx.db.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          atividade: true,
          contratacao: true,
          username: true,
          permissao: true,
          regime: true,
          emailVerified: true,
          informacoes: true,
          salario: true,
        },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado" });
      }
      let profilePhotoUrl: string | null = null;
      try {
        const photoBlobs = await listProfilePhotos(user.id);
        if (photoBlobs.blobs.length > 0) {
          profilePhotoUrl = photoBlobs.blobs[0]?.url || null;
        }
      } catch {}
      return { ...user, profilePhotoUrl };
    } catch (error) {
      return handlePrismaError(error);
    }
  }),

  findByUsername: protectedProcedure.input(z.string()).query(async ({ ctx, input: username }) => {
    try {
      const user = await ctx.db.user.findUnique({
        where: { username },
        select: {
          id: true,
          name: true,
          email: true,
          atividade: true,
          contratacao: true,
          username: true,
          permissao: true,
          regime: true,
          emailVerified: true,
          informacoes: true,
          salario: true,
        },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado" });
      }
      return user;
    } catch (error) {
      return handlePrismaError(error);
    }
  }),

  create: protectedProcedure.input(createUtilizadorSchema).mutation(async ({ ctx, input }) => {
    try {
      const user = ctx.session?.user as UserWithPermissao | undefined;
      if (!user || (user.permissao !== Permissao.ADMIN && user.permissao !== Permissao.GESTOR)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Não tem permissões para criar utilizadores" });
      }
      if (!input) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Dados de utilizador não fornecidos" });
      }
      if (input.contratado === true) {
        if (!input.name || !input.name.trim()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Nome é obrigatório para contratado" });
        }
        const newUser = await ctx.db.user.create({
          data: {
            name: input.name,
            informacoes: input.informacoes,
            salario: input.salario,
            contratado: true,
          },
          select: { id: true, name: true, informacoes: true },
        });
        return newUser;
      }
      const { password, ...userData } = input;
      const processedUserData = {
        ...userData,
        contratacao: userData.contratacao
          ? typeof userData.contratacao === "string"
            ? new Date(userData.contratacao)
            : userData.contratacao
          : null,
      };
      const existingUser = await ctx.db.user.findUnique({ where: { email: processedUserData.email } });
      if (existingUser) {
        throw new TRPCError({ code: "CONFLICT", message: `O email ${processedUserData.email} já está registado no sistema.` });
      }
      const token = randomUUID();
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);
      const newUser = await ctx.db.user.create({
        data: {
          ...processedUserData,
          password: password
            ? { create: { hash: await hash(password, 10) } }
            : undefined,
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          atividade: true,
          contratacao: true,
          permissao: true,
          regime: true,
          emailVerified: true,
        },
      });
      if (!password && newUser.email) {
        await ctx.db.verificationToken.create({
          data: { identifier: newUser.email, token, expires: tokenExpiry },
        });
        await sendPrimeiroAcessoEmail(newUser.email, newUser.name || "Utilizador", token);
      }
      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
        atividade: newUser.atividade,
        contratacao: newUser.contratacao ? newUser.contratacao.toISOString() : null,
        permissao: newUser.permissao,
        regime: newUser.regime,
        emailVerified: newUser.emailVerified ? newUser.emailVerified.toISOString() : null,
      };
    } catch (error) {
      return handlePrismaError(error);
    }
  }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: updateUtilizadorSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, data } = input;
        const user = ctx.session.user as UserWithPermissao;
        const isAdmin = user.permissao === Permissao.ADMIN;
        const isGestor = user.permissao === Permissao.GESTOR;
        const isSelf = user.id === id;

        if (!isSelf) {
          if (!isAdmin && !isGestor) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Não tem permissões para atualizar este utilizador" });
          }
          if (data.permissao && !isAdmin && !isGestor) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Não tem permissões para alterar permissões" });
          }
        }

        const updatedUser = await ctx.db.user.update({
          where: { id },
          data,
          select: {
            id: true,
            name: true,
            email: true,
            atividade: true,
            contratacao: true,
            username: true,
            permissao: true,
            regime: true,
          },
        });
        return updatedUser;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),


  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || (user.permissao !== Permissao.ADMIN && user.permissao !== Permissao.GESTOR)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores ou gestores podem apagar utilizadores" });
        }
        const targetUser = await ctx.db.user.findUnique({ where: { id: input.id }, select: { permissao: true } });
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado" });
        }
        if (targetUser.permissao === Permissao.ADMIN || targetUser.permissao === Permissao.GESTOR) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Não é possível apagar administradores ou gestores" });
        }
        await ctx.db.$transaction(async (tx) => {
          await tx.alocacaoRecurso.deleteMany({ where: { userId: input.id } });
          await tx.user.delete({ where: { id: input.id } });
        });
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return handlePrismaError(error);
      }
    }),

  convidarUtilizador: protectedProcedure
    .input(convidarUtilizadorSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || (user.permissao !== Permissao.ADMIN && user.permissao !== Permissao.GESTOR)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Não tem permissões para convidar utilizadores" });
        }
        const existingUser = await ctx.db.user.findUnique({
          where: { email: input.email },
          select: { email: true, name: true },
        });
        if (!existingUser || !existingUser.email) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado" });
        }
        const token = randomUUID();
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + 24);
        await ctx.db.verificationToken.create({
          data: { identifier: existingUser.email, token, expires: tokenExpiry },
        });
        const userName = existingUser.name || "Utilizador";
        await sendPrimeiroAcessoEmail(existingUser.email, userName, token);
        return { success: true, message: "Email de convite enviado com sucesso" };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),


  // Reset de password
  resetPassword: publicProcedure
  .input(z.object({
    email: z.string().email("Email inválido"),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      const { email } = input;

      // Verificar se o utilizador existe
      const user = await ctx.db.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      if (!user || !user.email) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilizador não encontrado",
        });
      }

      // Gerar token
      const token = randomUUID();
      const expires = new Date();
      expires.setHours(expires.getHours() + 24); // Token válido por 24 horas

      // Criar ou atualizar token de reset
      const existingReset = await ctx.db.passwordReset.findFirst({
        where: { email },
      });

      if (existingReset) {
        // Atualizar token existente
        await ctx.db.passwordReset.update({
          where: { id: existingReset.id },
          data: {
            token,
            expires,
          },
        });
      } else {
        // Criar novo token
        await ctx.db.passwordReset.create({
          data: {
            email,
            token,
            expires,
          },
        });
      }

      // Enviar email com link de reset
      await sendPasswordResetEmail(
        user.email,
        user.name || "Utilizador",
        token
      );

      return {
        success: true,
        message: "Email de recuperação enviado com sucesso",
      };
    } catch (error) {
      console.error("Erro no reset de password:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao processar o pedido de recuperação de password",
        cause: error,
      });
    }
  }),

  
  getByWorkpackage: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: workpackageId }) => {
      try {
        const users = await ctx.db.user.findMany({
          where: {
            workpackages: { some: { workpackageId } },
          },
          select: {
            id: true,
            name: true,
            email: true,
            atividade: true,
            regime: true,
            workpackages: {
              where: { workpackageId },
              select: { mes: true, ano: true, ocupacao: true },
              orderBy: [{ ano: "asc" }, { mes: "asc" }],
            },
          },
        });
        return users.map((user) => ({
          ...user,
          alocacoes: user.workpackages.map((wp) => ({ mes: wp.mes, ano: wp.ano, ocupacao: wp.ocupacao })),
        }));
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao obter utilizadores do workpackage", cause: error });
      }
    }),

  getByProjeto: protectedProcedure.input(z.string()).query(async ({ ctx, input: projetoId }) => {
    try {
      const workpackages = await ctx.db.workpackage.findMany({ where: { projetoId }, select: { id: true } });
      const workpackageIds = workpackages.map((wp) => wp.id);
      const users = await ctx.db.user.findMany({
        where: {
          workpackages: { some: { workpackageId: { in: workpackageIds } } },
        },
        select: {
          id: true,
          name: true,
          email: true,
          atividade: true,
          regime: true,
          workpackages: {
            where: { workpackageId: { in: workpackageIds } },
            select: { mes: true, ano: true, ocupacao: true, workpackageId: true },
            orderBy: [{ ano: "asc" }, { mes: "asc" }],
          },
        },
      });
      return users.map((user) => ({
        ...user,
        alocacoes: user.workpackages.map((wp) => ({ mes: wp.mes, ano: wp.ano, ocupacao: wp.ocupacao, workpackageId: wp.workpackageId })),
      }));
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao obter utilizadores do projeto", cause: error });
    }
  }),
  // Obter configuração mensal
  getConfiguracaoMensal: protectedProcedure
    .input(
      z.object({
        mes: z.number().int().min(1).max(12),
        ano: z.number().int().min(2000),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const configuracao = await ctx.db.configuracaoMensal.findFirst({
          where: {
            mes: input.mes,
            ano: input.ano,
          },
        });

        return configuracao;
      } catch (error) {
        console.error("Erro ao obter configuração mensal:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter configuração mensal",
          cause: error,
        });
      }
    }),

  // Listar todas as configurações mensais
  listarConfiguracoesMensais: protectedProcedure
    .input(
      z.object({
        ano: z.number().int().min(2000).optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { ano, limit, cursor } = input;

        const where = ano ? { ano } : undefined;

        const items = await ctx.db.configuracaoMensal.findMany({
          where,
          take: limit + 1,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: [
            { ano: "desc" },
            { mes: "asc" }
          ],
        });

        let nextCursor: typeof cursor | undefined = undefined;
        if (items.length > limit) {
          const nextItem = items.pop();
          nextCursor = nextItem?.id;
        }

        return {
          items,
          nextCursor,
        };
      } catch (error) {
        console.error("Erro ao listar configurações mensais:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao listar configurações mensais",
          cause: error,
        });
      }
    }),
});
