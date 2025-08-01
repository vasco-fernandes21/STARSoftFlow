import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { uploadFeedbackAttachment, listProfilePhotos } from "@/lib/blob";
import { TRPCError } from "@trpc/server";
import { triggerPusherEvent } from "../../lib/pusher";
import { CHANNELS, EVENTS } from "../../../lib/pusher-config";
import type { Feedback, Prisma, Notificacao } from "@prisma/client";
import { BLOB_CONFIG } from "@/lib/config";

// Type for feedback with computed imagemUrl
type FeedbackWithImage = Omit<Feedback, "userId"> & {
  imagemUrl?: string | null;
  user: {
    name: string | null;
    email?: string | null;
    profilePhotoUrl?: string | null;
  };
};

export const feedbackRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        descricao: z.string().min(1),
        image: z
          .object({
            name: z.string(),
            type: z.string(),
            data: z.string(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new Error("Usuário não autenticado");
      }

      try {
        // 1. Create feedback entry first
        const feedback = await ctx.db.feedback.create({
          data: {
            descricao: input.descricao,
            userId: ctx.session.user.id,
          },
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        });

        let imageUrl: string | null = null;

        // 2. If image is provided, upload it to blob storage
        if (input.image) {
          const imageBuffer = Buffer.from(input.image.data, 'base64');
            
          if (!input.image.type.startsWith('image/')) {
            throw new Error('Invalid image type provided.');
          }

          // Upload to blob storage with consistent naming
          const blob = await uploadFeedbackAttachment(
            imageBuffer,
            input.image.type,
            feedback.id,
          );

          imageUrl = blob.url;
        }

        // --- Send notification logic --- 
        const feedbackCreatorId = ctx.session.user.id;
        const feedbackCreatorName = ctx.session.user.name || 'Utilizador';

        try {
          const targetUser = await ctx.db.user.findUnique({
            where: { username: "vasco.fernandes" },
            select: { id: true },
          });

          if (targetUser && targetUser.id !== feedbackCreatorId) {
            const notificacaoParaVasco = await ctx.db.notificacao.create({
              data: {
                titulo: `Novo feedback submetido por ${feedbackCreatorName}`,
                descricao: `Um novo feedback foi submetido: "${input.descricao.substring(0, 50)}..."`,
                entidade: "FEEDBACK",
                entidadeId: feedback.id,
                urgencia: "MEDIA",
                destinatario: {
                  connect: { id: targetUser.id },
                },
                estado: "NAO_LIDA",
              }
            });
            // Enviar notificação via Pusher
            const channelName = `${CHANNELS.NOTIFICACOES_GERAIS}-${targetUser.id}`;
            await triggerPusherEvent(channelName, EVENTS.NOVA_NOTIFICACAO, notificacaoParaVasco as Notificacao);
            console.log(`[Notificação Novo Feedback via Pusher] Emitida para vasco.fernandes (ID: ${targetUser.id})`);
          }
        } catch (notifError: any) {
          console.error("Erro ao criar/emitir notificação de novo feedback para vasco.fernandes:", notifError);
        }
        // --- End Notification ---

        // Return feedback with computed imagemUrl
        return {
          ...feedback,
          imagemUrl: imageUrl,
        } satisfies FeedbackWithImage;

      } catch (error: any) {
        console.error("Error creating feedback or uploading attachment:", error);
        throw new Error("Falha ao criar feedback ou processar anexo.");
      }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const feedbacks = await ctx.db.feedback.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    // Return feedbacks with computed imagemUrl and user profile photo
    const processedFeedbacks = await Promise.all(feedbacks.map(async feedback => {
      // Get feedback image URL
      const imageUrl = BLOB_CONFIG.getUrl(`${BLOB_CONFIG.PATHS.FEEDBACK_IMAGES}/${feedback.id}`);
      
      // Get user profile photo URL
      let profilePhotoUrl: string | null = null;
      try {
        const photoBlobs = await listProfilePhotos(feedback.user.id);
        if (photoBlobs.blobs.length > 0) {
          profilePhotoUrl = photoBlobs.blobs[0]?.url || null;
        }
      } catch (photoError) {
        console.error(`Error fetching profile photo for user ${feedback.user.id}:`, photoError);
      }

      return {
        ...feedback,
        imagemUrl: imageUrl,
        user: {
          ...feedback.user,
          profilePhotoUrl,
        },
      };
    }));

    return processedFeedbacks as FeedbackWithImage[];
  }),

  listAll: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { permissao: true },
    });

    if (!user || !["ADMIN", "GESTOR"].includes(user.permissao)) {
      throw new Error("Não autorizado");
    }

    const feedbacks = await ctx.db.feedback.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            id: true,
          },
        },
      },
    });

    // Return feedbacks with computed imagemUrl and user profile photo
    const processedFeedbacks = await Promise.all(feedbacks.map(async feedback => {
      // Get feedback image URL
      const imageUrl = BLOB_CONFIG.getUrl(`${BLOB_CONFIG.PATHS.FEEDBACK_IMAGES}/${feedback.id}`);
      
      // Get user profile photo URL
      let profilePhotoUrl: string | null = null;
      try {
        const photoBlobs = await listProfilePhotos(feedback.user.id);
        if (photoBlobs.blobs.length > 0) {
          profilePhotoUrl = photoBlobs.blobs[0]?.url || null;
        }
      } catch (photoError) {
        console.error(`Error fetching profile photo for user ${feedback.user.id}:`, photoError);
      }

      return {
        ...feedback,
        imagemUrl: imageUrl,
        user: {
          ...feedback.user,
          profilePhotoUrl,
        },
      };
    }));

    return processedFeedbacks as FeedbackWithImage[];
  }),

  markAsResolved: protectedProcedure
    .input(z.object({ feedbackId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const resolverUser = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { permissao: true, name: true, id: true },
      });

      if (!resolverUser || !["ADMIN", "GESTOR"].includes(resolverUser.permissao)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Não tem permissão para realizar esta ação",
        });
      }

      const feedbackToResolve = await ctx.db.feedback.findUnique({
        where: { id: input.feedbackId },
        select: { userId: true, descricao: true, id: true },
      });

      if (!feedbackToResolve) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feedback não encontrado",
        });
      }

      const updatedFeedback = await ctx.db.feedback.update({
        where: { id: input.feedbackId },
        data: { estado: "RESOLVIDO" },
        include: {
          user: {
            select: {
              name: true,
              id: true,
            },
          },
        },
      });

      // --- Send notification to feedback submitter ---
      if (feedbackToResolve.userId && feedbackToResolve.userId !== resolverUser.id) {
        try {
          const notificacaoParaSubmitter = await ctx.db.notificacao.create({
            data: {
              titulo: "Seu feedback foi resolvido",
              descricao: `O feedback "${feedbackToResolve.descricao.substring(0,50)}..." foi marcado como resolvido por ${resolverUser.name}.`,
              entidade: "FEEDBACK",
              entidadeId: feedbackToResolve.id,
              urgencia: "MEDIA",
              destinatario: {
                connect: { id: feedbackToResolve.userId },
              },
              estado: "NAO_LIDA",
            },
          });
          const channelNameSubmitter = `${CHANNELS.NOTIFICACOES_GERAIS}-${feedbackToResolve.userId}`;
          await triggerPusherEvent(channelNameSubmitter, EVENTS.NOVA_NOTIFICACAO, notificacaoParaSubmitter as Notificacao);
          console.log(`[Notificação Feedback Resolvido via Pusher] Emitida para o submissor (ID: ${feedbackToResolve.userId})`);
        } catch (notifError: any) {
          console.error("Erro ao criar/emitir notificação de feedback resolvido para o submissor:", notifError);
        }
      }
      // --- End Notification ---

      return updatedFeedback;
    }),
});