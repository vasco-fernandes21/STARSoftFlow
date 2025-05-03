import { z } from "zod";
import { EventEmitter } from "events";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { EntidadeNotificacao, UrgenciaNotificacao, EstadoNotificacao, type Notificacao } from "@prisma/client";
import { observable } from "@trpc/server/observable";
import { type TrackedEnvelope, tracked } from "@trpc/server";

// Event emitter para notificações em tempo real
const ee = new EventEmitter();

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
  onNotificacao: protectedProcedure
    .input(
      z.object({
        lastEventId: z.string().uuid().nullish(),
      }).optional(),
    )
    .subscription(({ ctx, input }) => {
      return observable<TrackedEnvelope<Notificacao>>((emit) => {
        const onNotificacao = (notificacao: Notificacao) => {
          if (notificacao.destinatarioId === ctx.session.user.id) {
            // Emitir notificação com tracking para SSE
            emit.next(tracked(notificacao.id, notificacao));
          }
        };

        // Primeiro, vamos buscar notificações não lidas desde o último ID
        if (input?.lastEventId) {
          void ctx.db.notificacao.findMany({
            where: {
              id: {
                gt: input.lastEventId,
              },
              destinatarioId: ctx.session.user.id,
              estado: EstadoNotificacao.NAO_LIDA,
            },
            orderBy: {
              dataEmissao: "asc",
            },
          }).then((notificacoes) => {
            for (const notificacao of notificacoes) {
              onNotificacao(notificacao);
            }
          }).catch((error) => {
            console.error("Erro ao buscar notificações perdidas na subscrição:", error);
            emit.error(new Error("Falha ao recuperar histórico de notificações"));
          });
        }

        // Escutar por novas notificações
        ee.on("notificacao", onNotificacao);

        // Cleanup quando a subscription for cancelada
        return () => {
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
