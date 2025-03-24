import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/trpc/react";
import { toast } from "sonner";

// Types for updates
interface WorkpackageUpdate {
  id: string;
  [key: string]: any;
}

interface TarefaUpdate {
  id: string;
  data: {
    workpackageId?: string;
    nome?: string;
    descricao?: string | null;
    inicio?: Date | null;
    fim?: Date | null;
    estado?: boolean;
    [key: string]: any;
  };
}

export function useMutations(projetoId?: string) {
  const queryClient = useQueryClient();

  // Helper function to invalidate project-related queries
  const invalidateProjetoRelatedQueries = async (specificProjetoId?: string) => {
    const targetProjetoId = specificProjetoId || projetoId;
    
    if (targetProjetoId) {
      await queryClient.invalidateQueries({
        queryKey: ['projeto.findById', targetProjetoId],
        refetchType: 'all'
      });

      await queryClient.refetchQueries({
        queryKey: ['projeto.findById', targetProjetoId],
        type: 'active'
      });
    }

    // Sempre garantir que todas as queries ativas são refetchadas
    await queryClient.refetchQueries({
      type: 'active'
    });
  };

  // Workpackage mutations
  const workpackageMutations = {
    update: api.workpackage.update.useMutation({
      onMutate: async (variables: WorkpackageUpdate) => {
        await queryClient.cancelQueries({
          queryKey: ['workpackage.findById', { id: variables.id }]
        });

        const previousData = queryClient.getQueryData(['workpackage.findById', { id: variables.id }]);

        queryClient.setQueryData(['workpackage.findById', { id: variables.id }], (old: any) => {
          return { ...old, ...variables };
        });

        if (projetoId) {
          queryClient.setQueryData(['projeto.findById', projetoId], (old: any) => {
            if (!old || !old.workpackages) return old;
            
            return {
              ...old,
              workpackages: old.workpackages.map((wp: any) => 
                wp.id === variables.id ? { ...wp, ...variables } : wp
              )
            };
          });
        }

        return { previousData };
      },
      onSuccess: async (_data, variables) => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error, variables, context: any) => {
        if (context?.previousData) {
          queryClient.setQueryData(
            ['workpackage.findById', { id: variables.id }], 
            context.previousData
          );
        }
        console.error("Erro ao atualizar workpackage:", error);
        toast.error(`Erro ao atualizar: ${error.message}`);
      }
    }),
    
    addAlocacao: api.workpackage.addAlocacao.useMutation({
      onSuccess: async (_data, variables) => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error) => {
        console.error("Erro ao alocar recurso:", error);
        toast.error("Erro ao alocar recurso");
      }
    }),
    
    removeAlocacao: api.workpackage.removeAlocacao.useMutation({
      onSuccess: async (_data, variables) => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error) => {
        console.error("Erro ao remover alocação:", error);
        toast.error("Erro ao remover alocação");
      }
    })
  };

  // Tarefa mutations
  const tarefaMutations = {
    create: api.tarefa.create.useMutation({
      onSuccess: async (_data, variables) => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error) => {
        console.error("Erro ao criar tarefa:", error);
        toast.error("Erro ao criar tarefa");
      }
    }),
    
    update: api.tarefa.update.useMutation({
      onMutate: async (variables: TarefaUpdate) => {
        await queryClient.cancelQueries({
          queryKey: ['tarefa.findById', variables.id]
        });

        const previousData = queryClient.getQueryData(['tarefa.findById', variables.id]);

        // Update optimistically
        queryClient.setQueryData(['tarefa.findById', variables.id], (old: any) => {
          if (!old) return old;
          return { ...old, ...variables.data };
        });

        // Update in projeto cache if exists
        if (projetoId) {
          queryClient.setQueryData(['projeto.findById', projetoId], (old: any) => {
            if (!old?.workpackages) return old;
            return {
              ...old,
              workpackages: old.workpackages.map((wp: any) => ({
                ...wp,
                tarefas: wp.tarefas?.map((t: any) => 
                  t.id === variables.id ? { ...t, ...variables.data } : t
                )
              }))
            };
          });
        }

        return { previousData };
      },
      onSuccess: async (_data, variables) => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error, variables, context: any) => {
        if (context?.previousData) {
          queryClient.setQueryData(
            ['tarefa.findById', variables.id], 
            context.previousData
          );
        }
        console.error("Erro ao atualizar tarefa:", error);
        toast.error(`Erro ao atualizar: ${error.message}`);
      }
    }),
    
    delete: api.tarefa.delete.useMutation({
      onSuccess: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error) => {
        console.error("Erro ao remover tarefa:", error);
        toast.error("Erro ao remover tarefa");
      }
    }),
  };

  // Entregável mutations
  const entregavelMutations = {
    create: api.entregavel.create.useMutation({
      onMutate: async (variables) => {
        // Optimistic update for the parent tarefa
        if (variables.tarefaId && projetoId) {
          queryClient.setQueryData(['projeto.findById', projetoId], (old: any) => {
            if (!old?.workpackages) return old;
            return {
              ...old,
              workpackages: old.workpackages.map((wp: any) => ({
                ...wp,
                tarefas: wp.tarefas?.map((t: any) => 
                  t.id === variables.tarefaId 
                    ? { 
                        ...t, 
                        entregaveis: [...(t.entregaveis || []), { 
                          id: 'temp-' + Date.now(),
                          ...variables 
                        }]
                      } 
                    : t
                )
              }))
            };
          });
        }
      },
      onSuccess: async (_data, variables) => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error) => {
        console.error("Erro ao criar entregável:", error);
        toast.error("Erro ao criar entregável");
      }
    }),
    
    update: api.entregavel.update.useMutation({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({
          queryKey: ['entregavel.findById', variables.id]
        });

        const previousData = queryClient.getQueryData(['entregavel.findById', variables.id]);

        // Update optimistically in projeto cache
        if (projetoId) {
          queryClient.setQueryData(['projeto.findById', projetoId], (old: any) => {
            if (!old?.workpackages) return old;
            return {
              ...old,
              workpackages: old.workpackages.map((wp: any) => ({
                ...wp,
                tarefas: wp.tarefas?.map((t: any) => ({
                  ...t,
                  entregaveis: t.entregaveis?.map((e: any) =>
                    e.id === variables.id ? { ...e, ...variables.data } : e
                  )
                }))
              }))
            };
          });
        }

        return { previousData };
      },
      onSuccess: async (_data, variables) => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error, variables, context: any) => {
        if (context?.previousData) {
          queryClient.setQueryData(
            ['entregavel.findById', variables.id],
            context.previousData
          );
        }
        console.error("Erro ao atualizar entregável:", error);
        toast.error("Erro ao atualizar entregável");
      }
    }),
    
    delete: api.entregavel.delete.useMutation({
      onSuccess: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error) => {
        console.error("Erro ao excluir entregável:", error);
        toast.error("Erro ao excluir entregável");
      }
    })
  };

  // Material mutations
  const materialMutations = {
    create: api.material.create.useMutation({
      onSuccess: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error) => {
        console.error("Erro ao adicionar material:", error);
        toast.error("Erro ao adicionar material");
      }
    }),
    
    update: api.material.update.useMutation({
      onSuccess: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error) => {
        console.error("Erro ao atualizar material:", error);
        toast.error("Erro ao atualizar material");
      }
    }),
    
    delete: api.material.delete.useMutation({
      onSuccess: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error) => {
        console.error("Erro ao excluir material:", error);
        toast.error("Erro ao excluir material");
      }
    })
  };

  return {
    workpackage: workpackageMutations,
    tarefa: tarefaMutations,
    entregavel: entregavelMutations,
    material: materialMutations
  };
}