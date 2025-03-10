import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import type { Prisma } from "@prisma/client";

export const rascunhoRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.rascunho.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.rascunho.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      titulo: z.string(),
      conteudo: z.any(), // Validação específica do conteúdo pode ser adicionada
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new Error("Utilizador não autenticado");
      }

      const data: Prisma.RascunhoUncheckedCreateInput = {
        titulo: input.titulo,
        conteudo: input.conteudo,
        userId: ctx.session.user.id
      };

      return ctx.db.rascunho.create({
        data,
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      titulo: z.string(),
      conteudo: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new Error("Utilizador não autenticado");
      }

      return ctx.db.rascunho.update({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        data: {
          titulo: input.titulo,
          conteudo: input.conteudo,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new Error("Utilizador não autenticado");
      }

      return ctx.db.rascunho.delete({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });
    }),
});