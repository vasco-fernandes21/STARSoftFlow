import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const feedbackRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        descricao: z.string().min(1),
        imagemUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new Error("Usuário não autenticado");
      }

      return ctx.db.feedback.create({
        data: {
          descricao: input.descricao,
          imagemUrl: input.imagemUrl,
          userId: ctx.session.user.id,
        },
      });
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.feedback.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });
  }),

  listAll: protectedProcedure.query(async ({ ctx }) => {
    // Verifica se o usuário é admin ou gestor
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { permissao: true },
    });

    if (!user || !["ADMIN", "GESTOR"].includes(user.permissao)) {
      throw new Error("Não autorizado");
    }

    return ctx.db.feedback.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  }),
});