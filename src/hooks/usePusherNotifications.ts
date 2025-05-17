"use client";

import { useCallback, useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { type Channel } from 'pusher-js';
import { CHANNELS, EVENTS } from "../lib/pusher-config";
import { type EntidadeNotificacao, type Notificacao as PrismaNotificacao } from "@prisma/client";
import { pusherSingleton } from "../lib/pusher-singleton";

export type Notificacao = PrismaNotificacao;

// Função auxiliar movida para cá ou importada de um utilitário, se usada em mais locais.
async function buscarIdProjetoRelacionado(
  entidadeId: string,
  tipo: EntidadeNotificacao,
  utils: ReturnType<typeof api.useUtils>,
): Promise<string | undefined> {
  try {
    let projetoId: string | undefined;
    switch (tipo) {
      case "WORKPACKAGE":
        const wp = await utils.client.workpackage.findById.query({ id: entidadeId });
        projetoId = wp?.projetoId;
        break;
      case "ENTREGAVEL":
        const entregavel = await utils.client.tarefa.entregavelFindById.query({ id: entidadeId });
        projetoId = entregavel?.tarefa?.workpackage?.projetoId;
        break;
      case "TAREFA":
        const tarefa = await utils.client.tarefa.findById.query(entidadeId);
        projetoId = tarefa?.workpackage?.projetoId;
        break;
      default:
        return undefined;
    }
    return projetoId;
  } catch (error) {
    console.error(`[usePusherNotifications] Erro ao buscar ID do projeto para ${tipo} ${entidadeId}:`, error);
    return undefined;
  }
}

export function usePusherNotifications() {
  const utils = api.useUtils();
  const router = useRouter();
  const { data: session } = useSession();
  const channelRef = useRef<Channel | null>(null);

  const { mutateAsync: mutateMarcarComoLida } = api.notificacao.marcarComoLida.useMutation({
    onSuccess: () => {
      utils.notificacao.listar.invalidate();
      utils.notificacao.contarNaoLidas.invalidate();
    },
    onError: (error) => {
      console.error("[usePusherNotifications] Erro ao marcar como lida:", error);
      toast.error("Erro ao marcar notificação como lida.");
    }
  });

  const { mutateAsync: doPusherAuth } = api.notificacao.autenticarPusher.useMutation();

  const pusherAuthorizer = useCallback(
    (channel: { name: string }, options: unknown) => {
      return {
        authorize: async (socketId: string, callback: (error: Error | null, authData: { auth: string } | null) => void) => {
          try {
            const authData = await doPusherAuth({
              socket_id: socketId,
              channel_name: channel.name,
            });
            console.log(`[Pusher Authorizer - Hook] Nova autorização para socket: ${socketId}`);
            callback(null, authData as { auth: string });
          } catch (error) {
            const trpcError = error as { message?: string };
            console.error(`[Pusher Authorizer - Hook] Falha na autorização para socket: ${socketId}:`, trpcError.message);
            callback(new Error(`Falha na autorização: ${trpcError.message || 'Erro desconhecido'}`), null);
          }
        },
      };
    },
    [doPusherAuth]
  );

  useEffect(() => {
    if (!session?.user?.id || !process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
      if (channelRef.current) {
        pusherSingleton.disconnect(session?.user?.id || '');
        channelRef.current = null;
      }
      return;
    }

    const { instance: pusherInstance } = pusherSingleton.getConnection(
      session.user.id,
      process.env.NEXT_PUBLIC_PUSHER_KEY,
      process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      pusherAuthorizer
    );

    const channelName = `${CHANNELS.NOTIFICACOES_GERAIS}-${session.user.id}`;
    const subscribedChannel = pusherInstance.subscribe(channelName);
    channelRef.current = subscribedChannel;
    pusherSingleton.setChannel(session.user.id, subscribedChannel);

    subscribedChannel.bind(EVENTS.NOVA_NOTIFICACAO, (novaNotificacao: Notificacao) => {
      console.log("[Pusher Hook] Notificação recebida:", novaNotificacao);
      utils.notificacao.listar.invalidate();
      utils.notificacao.contarNaoLidas.invalidate();

      toast(novaNotificacao.titulo, {
        description: novaNotificacao.descricao,
        position: "top-right",
        duration: 5000,
        action: {
          label: "Ver",
          onClick: () => {
            void (async () => {
              try {
                await mutateMarcarComoLida(novaNotificacao.id);
                const entidade = novaNotificacao.entidade;
                const entidadeId = novaNotificacao.entidadeId;
                switch (entidade) {
                  case "PROJETO":
                    if (entidadeId) router.push(`/projetos/${entidadeId}`);
                    else router.push("/notificacoes");
                    break;
                  case "WORKPACKAGE":
                  case "ENTREGAVEL":
                  case "TAREFA":
                    if (entidadeId) {
                      const projetoId = await buscarIdProjetoRelacionado(entidadeId, entidade, utils);
                      if (projetoId) router.push(`/projetos/${projetoId}`);
                      else {
                        toast.warning("Não foi possível encontrar o projeto associado.");
                        router.push("/notificacoes");
                      }
                    } else router.push("/notificacoes");
                    break;
                  case "ALOCACAO":
                    if (entidadeId) router.push(`/projetos/${entidadeId}`);
                    else router.push("/notificacoes");
                    break;
                  default:
                    router.push("/notificacoes");
                }
              } catch (error) {
                console.error("[Pusher Hook] Erro ao processar clique na notificação:", error);
                toast.error("Ocorreu um erro ao processar a notificação");
              }
            })();
          },
        },
      });
    });

    subscribedChannel.bind('pusher:subscription_succeeded', () => {
      console.log(`[Pusher Hook] Subscrição bem-sucedida ao canal: ${channelName}`);
    });

    subscribedChannel.bind('pusher:subscription_error', (status: number) => {
      console.error(`[Pusher Hook] Erro na subscrição ao canal ${channelName}, status: ${status}`);
      toast.error(`Erro (${status}) ao subscrever notificações. Tente recarregar a página.`);
    });

    return () => {
      if (session?.user?.id) {
        pusherSingleton.disconnect(session.user.id);
        channelRef.current = null;
      }
    };
  }, [session?.user?.id, pusherAuthorizer, utils, router, mutateMarcarComoLida]);
} 