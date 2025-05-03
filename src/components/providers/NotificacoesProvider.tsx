"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Notificacao, EntidadeNotificacao } from "@prisma/client";
import type { TrackedEnvelope } from "@trpc/server";
import { TRPCError } from "@trpc/server";

interface NotificacoesContextType {
  notificacoes: Notificacao[];
  naoLidas: number;
  marcarComoLida: (id: string) => Promise<void>;
  arquivar: (id: string) => Promise<void>;
  atualizarNotificacoes: () => Promise<void>;
}

const NotificacoesContext = createContext<NotificacoesContextType | null>(null);

export function NotificacoesProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const router = useRouter();

  // Queries e Mutations
  const utils = api.useUtils();
  const { data: notificacoesIniciais } = api.notificacao.listar.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });
  const { data: contagem } = api.notificacao.contarNaoLidas.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });
  const { mutateAsync: marcarComoLidaMutation } = api.notificacao.marcarComoLida.useMutation();
  const { mutateAsync: arquivarMutation } = api.notificacao.arquivar.useMutation();

  // Subscription para notificações em tempo real
  api.notificacao.onNotificacao.useSubscription(
    {
      lastEventId: notificacoes[0]?.id,
    },
    {
      enabled: !!session?.user?.id,
      onData: (envelope: TrackedEnvelope<Notificacao>) => {
        // O envelope é uma tupla [id, data, symbol] - o dado real está no índice 1
        const novaNotificacao = envelope[1];

        // Atualizar estado local
        setNotificacoes((prev) => [novaNotificacao, ...prev]);
        setNaoLidas((prev) => prev + 1);

        // Mostrar toast
        toast(novaNotificacao.titulo, {
          description: novaNotificacao.descricao,
          action: {
            label: "Ver",
            onClick: () => {
              void marcarComoLidaMutation(novaNotificacao.id);

              // Função auxiliar para buscar o ID do projeto
              const buscarIdProjeto = async (entidadeId: string, tipo: EntidadeNotificacao) => {
                try {
                  let projetoId: string | undefined;

                  switch (tipo) {
                    case "WORKPACKAGE":
                      // Workpackage tem relação direta com projeto
                      const wp = await utils.client.workpackage.findById.query({ id: entidadeId });
                      projetoId = wp?.projetoId;
                      break;
                    case "ENTREGAVEL":
                      // Entregável -> Tarefa -> Workpackage -> Projeto
                      // Nota: Assumindo que existe um entregavel.obterPorId.
                      // Se não existir, terá de ser criado.
                      const entregavel = await utils.client.tarefa.entregavelFindById.query({ id: entidadeId });
                      if (entregavel?.tarefa?.workpackage) {
                        projetoId = entregavel.tarefa.workpackage.projetoId;
                      }
                      break;
                    case "TAREFA":
                      // Tarefa -> Workpackage -> Projeto
                      const tarefa = await utils.client.tarefa.findById.query(entidadeId);
                      if (tarefa?.workpackage) {
                        projetoId = tarefa.workpackage.projetoId;
                      }
                      break;
                    default:
                      return undefined;
                  }

                  return projetoId;
                } catch (error) {
                  console.error('Erro ao buscar ID do projeto:', error);
                  // Verificar se o erro é 'NOT_FOUND' para o entregável e tratar
                  if (error instanceof TRPCError && error.code === 'NOT_FOUND' && tipo === 'ENTREGAVEL') {
                    console.warn(`Entregável com ID ${entidadeId} não encontrado ou procedimento 'obterPorId' não existe.`);
                  } else if (error instanceof TRPCError && error.code === 'NOT_FOUND') {
                     console.warn(`Recurso não encontrado para ${tipo} com ID ${entidadeId}.`);
                  }
                  return undefined;
                }
              };

              // Redirecionar com base no tipo de entidade
              switch (novaNotificacao.entidade as EntidadeNotificacao) {
                case "PROJETO":
                  router.push(`/projetos/${novaNotificacao.entidadeId}`);
                  break;
                case "WORKPACKAGE":
                case "ENTREGAVEL":
                case "TAREFA": {
                  void (async () => {
                    const projetoId = await buscarIdProjeto(novaNotificacao.entidadeId, novaNotificacao.entidade);
                    if (projetoId) {
                      router.push(`/projetos/${projetoId}`);
                    } else {
                      // Se não encontrar o projeto (ex: entregável não encontrado), vai para notificações
                      router.push("/notificacoes");
                    }
                  })();
                  break;
                }
                case "ALOCACAO":
                  router.push(`/utilizadores/${novaNotificacao.entidadeId}`);
                  break;
                default:
                  router.push("/notificacoes");
              }
            },
          },
        });
      },
      onError: (err) => {
        console.error('Erro na subscrição:', err);
      },
    },
  );

  // Atualizar estado inicial
  useEffect(() => {
    if (notificacoesIniciais) {
      setNotificacoes(notificacoesIniciais);
    }
  }, [notificacoesIniciais]);

  useEffect(() => {
    if (typeof contagem === "number") {
      setNaoLidas(contagem);
    }
  }, [contagem]);

  // Funções de manipulação
  const marcarComoLida = async (id: string) => {
    await marcarComoLidaMutation(id);
    await utils.notificacao.listar.invalidate();
    await utils.notificacao.contarNaoLidas.invalidate();
  };

  const arquivar = async (id: string) => {
    await arquivarMutation(id);
    await utils.notificacao.listar.invalidate();
    await utils.notificacao.contarNaoLidas.invalidate();
  };

  const atualizarNotificacoes = async () => {
    await utils.notificacao.listar.invalidate();
    await utils.notificacao.contarNaoLidas.invalidate();
  };

  return (
    <NotificacoesContext.Provider
      value={{
        notificacoes,
        naoLidas,
        marcarComoLida,
        arquivar,
        atualizarNotificacoes,
      }}
    >
      {children}
    </NotificacoesContext.Provider>
  );
}

export function useNotificacoes() {
  const context = useContext(NotificacoesContext);
  if (!context) {
    throw new Error("useNotificacoes deve ser usado dentro de NotificacoesProvider");
  }
  return context;
} 