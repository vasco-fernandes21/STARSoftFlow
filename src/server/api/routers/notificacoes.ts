import { z } from "zod";
// import { EventEmitter } from "events"; // Remover EventEmitter
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { EntidadeNotificacao, UrgenciaNotificacao, EstadoNotificacao} from "@prisma/client";
// import { observable } from "@trpc/server/observable"; // Remover observable
import { pusherServer, triggerPusherEvent } from "../../lib/pusher";
import { CHANNELS, EVENTS } from "../../../lib/pusher-config";
import { TRPCError } from "@trpc/server";

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
  // Subscription para receber notificações em tempo real - REMOVIDA
  /* 
onNotificacao: protectedProcedure.subscription(async ({ ctx }) => {
    // ...código anterior da subscrição...
  }),
  */

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

      const channelName = `${CHANNELS.NOTIFICACOES_GERAIS}-${notificacao.destinatarioId}`;
      await triggerPusherEvent(channelName, EVENTS.NOVA_NOTIFICACAO, notificacao);

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

      const channelName = `${CHANNELS.NOTIFICACOES_GERAIS}-${notificacao.destinatarioId}`;
      await triggerPusherEvent(channelName, EVENTS.NOVA_NOTIFICACAO, notificacao);

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

  // Apagar notificação
  apagar: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const notificacao = await ctx.db.notificacao.delete({
        where: {
          id: input,
          destinatarioId: ctx.session.user.id,
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
          createdAt: "desc",
        },
      });
    }),


  // Apagar múltiplas notificações
  apagarMuitas: protectedProcedure
  .input(z.object({ ids: z.array(z.string().uuid()) }))
  .mutation(async ({ ctx, input }) => {
    const { count } = await ctx.db.notificacao.deleteMany({
      where: {
        id: {
          in: input.ids,
        },
        destinatarioId: ctx.session.user.id,
      },
    });
    // Optionally, you could emit an event or handle success/failure logging here
    // For now, just return the count of deleted items.
    return { count };
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

  // Procedure para autenticar canais privados do Pusher
  autenticarPusher: protectedProcedure
    .input(
      z.object({
        socket_id: z.string(),
        channel_name: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      const { socket_id, channel_name } = input;
      const session = ctx.session;

      if (!session || !session.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Utilizador não autenticado.",
        });
      }

      const expectedChannel = `${CHANNELS.NOTIFICACOES_GERAIS}-${session.user.id}`;
      if (channel_name !== expectedChannel) {
        console.warn(
          `[Pusher Auth tRPC] Tentativa de subscrição não autorizada: Utilizador ${session.user.id} tentou subscrever o canal ${channel_name}. Esperado: ${expectedChannel}`
        );
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Não autorizado a subscrever este canal.",
        });
      }

      try {
        const authResponse = pusherServer.authorizeChannel(socket_id, channel_name /*, presenceData */);
        console.log(
          `[Pusher Auth tRPC] Autorização bem-sucedida para socket ${socket_id} no canal ${channel_name} para o utilizador ${session.user.name}`
        );
        return authResponse;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        console.error(
          `[Pusher Auth tRPC] Erro ao autorizar canal ${channel_name} para socket ${socket_id}:`,
          errorMessage,
          error
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao autorizar canal Pusher.",
          cause: error,
        });
      }
    }),
});
