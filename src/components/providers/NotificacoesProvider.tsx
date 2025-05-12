"use client";

import React, { createContext, useContext, useCallback, ReactNode, useEffect, useState } from "react";
import { type EntidadeNotificacao, type UrgenciaNotificacao, type EstadoNotificacao } from "@prisma/client";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Interface para o objeto de notificação
export interface Notificacao {
  id: string;
  titulo: string;
  descricao: string | null;
  entidade: EntidadeNotificacao;
  entidadeId: string | null;
  urgencia: UrgenciaNotificacao | null;
  estado: EstadoNotificacao;
  createdAt: Date;
  updatedAt: Date;
  destinatarioId: string;
}

// Interface para o contexto de notificações
interface NotificacoesContextType {
  notificacoes: Notificacao[];
  naoLidas: number;
  isLoading: boolean;
  marcarComoLida: (id: string) => Promise<void>;
  arquivar: (id: string) => Promise<void>;
  filtrarPorEstado: (estado?: EstadoNotificacao) => Notificacao[];
}

// Valor default do contexto
const defaultContext: NotificacoesContextType = {
  notificacoes: [],
  naoLidas: 0,
  isLoading: true,
  marcarComoLida: async () => {},
  arquivar: async () => {},
  filtrarPorEstado: () => [],
};

// Criar o contexto
const NotificacoesContext = createContext<NotificacoesContextType>(defaultContext);

// Hook personalizado para usar o contexto
export const useNotificacoes = () => useContext(NotificacoesContext);

/**
 * Busca o ID do projeto associado a uma entidade (WorkPackage, Tarefa, Entregável).
 */
async function buscarIdProjetoRelacionado(
  entidadeId: string,
  tipo: EntidadeNotificacao,
  utils: ReturnType<typeof api.useUtils>,
): Promise<string | undefined> {
  try {
    let projetoId: string | undefined;

    switch (tipo) {
      case "WORKPACKAGE": {
        const wp = await utils.client.workpackage.findById.query({ id: entidadeId });
        projetoId = wp?.projetoId;
        break;
      }
      case "ENTREGAVEL": {
        const entregavel = await utils.client.tarefa.entregavelFindById.query({ id: entidadeId });
        projetoId = entregavel?.tarefa?.workpackage?.projetoId;
        break;
      }
      case "TAREFA": {
        const tarefa = await utils.client.tarefa.findById.query(entidadeId);
        projetoId = tarefa?.workpackage?.projetoId;
        break;
      }
      default:
        return undefined;
    }
    return projetoId;
  } catch (error) {
    console.error(`Erro ao buscar ID do projeto para ${tipo} ${entidadeId}:`, error);
    return undefined;
  }
}

// Provider component
export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const utils = api.useUtils();
  const router = useRouter();
  const [localNaoLidas, setLocalNaoLidas] = useState(0);

  // Buscar notificações
  const { data: notificacoes = [], isLoading } = api.notificacao.listar.useQuery(undefined, {
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchOnWindowFocus: true,
  });

  // Contar não lidas
  const { data: naoLidas = 0 } = api.notificacao.contarNaoLidas.useQuery(undefined, {
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Atualizar contador local quando naoLidas mudar
  useEffect(() => {
    setLocalNaoLidas(naoLidas);
  }, [naoLidas]);

  // Mutações
  const { mutateAsync: mutateMarcarComoLida } = api.notificacao.marcarComoLida.useMutation({
    onSuccess: () => {
      setLocalNaoLidas((prev) => Math.max(0, prev - 1));
      void utils.notificacao.listar.invalidate();
      void utils.notificacao.contarNaoLidas.invalidate();
    },
  });

  const { mutateAsync: mutateArquivar } = api.notificacao.arquivar.useMutation({
    onSuccess: () => {
      void utils.notificacao.listar.invalidate();
      void utils.notificacao.contarNaoLidas.invalidate();
    },
  });

  // Subscrição para notificações em tempo real
  api.notificacao.onNotificacao.useSubscription(undefined, {
    onStarted: () => {
      console.log("[SSE] Conexão iniciada", {
        timestamp: new Date().toISOString()
      });
    },
    onData: (novaNotificacao) => {
      console.log("[SSE] Notificação recebida", {
        id: novaNotificacao.id,
        titulo: novaNotificacao.titulo,
        tipo: novaNotificacao.entidade,
        timestamp: new Date().toISOString()
      });

      // Atualizar contador local imediatamente
      setLocalNaoLidas((prev) => prev + 1);

      // Invalidar queries para atualizar dados
      void utils.notificacao.listar.invalidate();
      void utils.notificacao.contarNaoLidas.invalidate();

      // Mostrar toast imediatamente
      toast(novaNotificacao.titulo, {
        description: novaNotificacao.descricao,
        position: "top-right",
        duration: 5000,
        action: {
          label: "Ver",
          onClick: () => {
            void (async () => {
              try {
                console.log("[SSE] Notificação clicada", {
                  id: novaNotificacao.id,
                  tipo: novaNotificacao.entidade,
                  timestamp: new Date().toISOString()
                });

                // Marcar como lida
                await mutateMarcarComoLida(novaNotificacao.id);

                // Navegar para o item
                const entidade = novaNotificacao.entidade;
                const entidadeId = novaNotificacao.entidadeId;

                switch (entidade) {
                  case "PROJETO":
                    if (entidadeId) router.push(`/projetos/${entidadeId}`);
                    else router.push("/notificacoes");
                    break;
                  case "WORKPACKAGE":
                  case "ENTREGAVEL":
                  case "TAREFA": {
                    if (entidadeId) {
                      const projetoId = await buscarIdProjetoRelacionado(entidadeId, entidade, utils);
                      if (projetoId) {
                        router.push(`/projetos/${projetoId}`);
                      } else {
                        toast.warning("Não foi possível encontrar o projeto associado.");
                        router.push("/notificacoes");
                      }
                    } else {
                      router.push("/notificacoes");
                    }
                    break;
                  }
                  case "ALOCACAO":
                    if (entidadeId) router.push(`/utilizadores/${entidadeId}`);
                    else router.push("/notificacoes");
                    break;
                  default:
                    router.push("/notificacoes");
                }
              } catch (error) {
                console.error("[SSE] Erro ao processar clique", {
                  erro: error instanceof Error ? error.message : "Erro desconhecido",
                  id: novaNotificacao.id,
                  tipo: novaNotificacao.entidade,
                  timestamp: new Date().toISOString()
                });
                toast.error("Ocorreu um erro ao processar a notificação");
              }
            })();
          },
        },
      });
    },
    onError: (error) => {
      console.error("[SSE] Erro na conexão", {
        erro: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString()
      });
      toast.error("Erro ao receber notificações em tempo real", {
        position: "top-right"
      });
    },
  });

  // Log quando o componente é montado/desmontado
  useEffect(() => {
    console.log("[SSE] Provider montado", {
      timestamp: new Date().toISOString()
    });

    return () => {
      console.log("[SSE] Provider desmontado", {
        timestamp: new Date().toISOString()
      });
    };
  }, []);

  // Funções auxiliares
  const marcarComoLida = useCallback(async (id: string) => {
    await mutateMarcarComoLida(id);
  }, [mutateMarcarComoLida]);

  const arquivar = useCallback(async (id: string) => {
    await mutateArquivar(id);
  }, [mutateArquivar]);

  const filtrarPorEstado = useCallback((estado?: EstadoNotificacao) => {
    if (!estado) return notificacoes;
    return notificacoes.filter((n) => n.estado === estado);
  }, [notificacoes]);

  // Valor do contexto
  const value = {
    notificacoes,
    naoLidas: localNaoLidas,
    isLoading,
    marcarComoLida,
    arquivar,
    filtrarPorEstado,
  };

  return <NotificacoesContext.Provider value={value}>{children}</NotificacoesContext.Provider>;
} 