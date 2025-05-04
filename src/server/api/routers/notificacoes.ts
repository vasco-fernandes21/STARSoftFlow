import { z } from "zod";
import { EventEmitter } from "events";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { EntidadeNotificacao, UrgenciaNotificacao, EstadoNotificacao, type Notificacao } from "@prisma/client";
import { observable } from "@trpc/server/observable";

// Event emitter para notificações em tempo real
export const ee = new EventEmitter();

// Schema para validação de notificações
const notificacaoSchema = z.object({
  titulo: z.string(),
  descricao: z.string(),
  entidade: z.nativeEnum(EntidadeNotificacao),
  entidadeId: z.string().uuid(),
  urgencia: z.nativeEnum(UrgenciaNotificacao),
});

// Schema para notificações com destinatário
const notificacaoComDestinatarioSchema = notificacaoSchema.extend({
  destinatarioId: z.string(),
});

export const notificacoesRouter = createTRPCRouter({
  // Subscription para receber notificações em tempo real
  onNotificacao: protectedProcedure.subscription(async ({ ctx }) => {
    // Buscar informações do utilizador para os logs
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { username: true }
    });

    console.log("[Notificações SSE] Nova subscrição iniciada", {
      userId: ctx.session.user.id,
      username: user?.username ?? "unknown",
      timestamp: new Date().toISOString(),
    });

    return observable<Notificacao>((emit) => {
      const onNotificacao = (notificacao: Notificacao) => {
        if (notificacao.destinatarioId === ctx.session.user.id) {
          console.log("[Notificações SSE] A emitir notificação", {
            id: notificacao.id,
            destinatarioId: notificacao.destinatarioId,
            destinatarioUsername: user?.username ?? "unknown",
            tipo: notificacao.entidade,
            timestamp: new Date().toISOString(),
          });
          emit.next(notificacao);
        }
      };

      console.log("[Notificações SSE] Listener adicionado", {
        userId: ctx.session.user.id,
        username: user?.username ?? "unknown",
        timestamp: new Date().toISOString(),
      });

      ee.on("notificacao", onNotificacao);

      return () => {
        console.log("[Notificações SSE] Listener removido", {
          userId: ctx.session.user.id,
          username: user?.username ?? "unknown",
          timestamp: new Date().toISOString(),
        });
        ee.off("notificacao", onNotificacao);
      };
    });
  }),

  // Criar nova notificação para o próprio utilizador
  criar: protectedProcedure
    .input(notificacaoSchema)
    .mutation(async ({ ctx, input }) => {
      const notificacao = await ctx.db.notificacao.create({
        data: {
          titulo: input.titulo,
          descricao: input.descricao,
          entidade: input.entidade,
          entidadeId: input.entidadeId,
          urgencia: input.urgencia,
          destinatario: {
            connect: {
              id: ctx.session.user.id,
            },
          },
          estado: EstadoNotificacao.NAO_LIDA,
        },
      });

      // Emitir evento de nova notificação
      ee.emit("notificacao", notificacao);

      return notificacao;
    }),

  // Criar nova notificação para outro utilizador
  criarParaUtilizador: protectedProcedure
    .input(notificacaoComDestinatarioSchema)
    .mutation(async ({ ctx, input }) => {
      const notificacao = await ctx.db.notificacao.create({
        data: {
          titulo: input.titulo,
          descricao: input.descricao,
          entidade: input.entidade,
          entidadeId: input.entidadeId,
          urgencia: input.urgencia,
          destinatario: {
            connect: {
              id: input.destinatarioId,
            },
          },
          estado: EstadoNotificacao.NAO_LIDA,
        },
      });

      // Emitir evento de nova notificação
      ee.emit("notificacao", notificacao);

      return notificacao;
    }),

  // Marcar notificação como lida
  marcarComoLida: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const notificacao = await ctx.db.notificacao.update({
        where: {
          id: input,
          destinatarioId: ctx.session.user.id,
        },
        data: {
          estado: EstadoNotificacao.LIDA,
        },
      });

      return notificacao;
    }),

  // Arquivar notificação
  arquivar: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const notificacao = await ctx.db.notificacao.update({
        where: {
          id: input,
          destinatarioId: ctx.session.user.id,
        },
        data: {
          estado: EstadoNotificacao.ARQUIVADA,
        },
      });

      return notificacao;
    }),

  // Listar notificações do utilizador
  listar: protectedProcedure
    .input(
      z.object({
        estado: z.nativeEnum(EstadoNotificacao).optional(),
        urgencia: z.nativeEnum(UrgenciaNotificacao).optional(),
        entidade: z.nativeEnum(EntidadeNotificacao).optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.notificacao.findMany({
        where: {
          destinatarioId: ctx.session.user.id,
          estado: input?.estado,
          urgencia: input?.urgencia,
          entidade: input?.entidade,
        },
        orderBy: {
          dataEmissao: "desc",
        },
      });
    }),

  // Contar notificações não lidas
  contarNaoLidas: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.notificacao.count({
      where: {
        destinatarioId: ctx.session.user.id,
        estado: EstadoNotificacao.NAO_LIDA,
      },
    });
  }),
});
