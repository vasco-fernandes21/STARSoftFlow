import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/hooks/queryKeys";

export function useMutations(projetoId?: string) {
  const utils = api.useUtils();
  const queryClient = useQueryClient();

  // função helper para invalidar queries relacionadas
  const invalidateRelatedQueries = async (options: {
    projetoId?: string;
    workpackageId?: string;
    tarefaId?: string;
  }) => {
    const promises: Promise<void>[] = [];

    // sempre que algo mudar, invalidar o projeto
    if (options.projetoId || projetoId) {
      const targetId = options.projetoId || projetoId!;
      promises.push(
        utils.projeto.findById.invalidate(targetId),
        utils.projeto.findAll.invalidate()
      );
    }

    // se for workpackage, invalidar queries relacionadas
    if (options.workpackageId) {
      promises.push(
        utils.workpackage.findById.invalidate({ id: options.workpackageId }),
        utils.workpackage.findAll.invalidate()
      );
    }

    // se for tarefa, invalidar queries relacionadas
    if (options.tarefaId) {
      promises.push(
        utils.tarefa.findById.invalidate(options.tarefaId),
        utils.tarefa.getEntregaveisByTarefa.invalidate(options.tarefaId)
      );
    }

    await Promise.all(promises);
  };

  // Função aprimorada para atualizar imediatamente a cache com timeout
  const updateWithTimeout = (type: 'workpackage' | 'tarefa', id: string, data: any, workpackageId?: string) => {
    const queryKey = type === 'workpackage' 
      ? ['workpackage', 'findById', { id }]
      : ['tarefa', 'findById', id];
    
    // Salvar dados anteriores
    const previousData = queryClient.getQueryData(queryKey);
    
    // Aplicar atualização na cache
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return { ...old, ...data };
    });
    
    // Também atualizar no projeto pai
    if (projetoId) {
      queryClient.setQueryData(['projeto', 'findById', projetoId], (old: any) => {
        if (!old) return old;
        
        if (type === 'workpackage') {
          return {
            ...old,
            workpackages: old.workpackages.map((wp: any) => 
              wp.id === id ? { ...wp, ...data } : wp
            )
          };
        } else {
          return {
            ...old,
            workpackages: old.workpackages.map((wp: any) => {
              if (wp.id !== workpackageId) return wp;
              return {
                ...wp,
                tarefas: wp.tarefas.map((t: any) => 
                  t.id === id ? { ...t, ...data } : t
                )
              };
            })
          };
        }
      });
    }
    
    // Definir timeout para reverter se não confirmado
    const timeoutId = setTimeout(() => {
      const isMutationInProgress = queryClient.isMutating({
        predicate: (mutation) => 
          mutation.options.mutationKey?.[0] === `${type}.update` && 
          mutation.state.status === 'loading'
      });
      
      if (isMutationInProgress) {
        // Reverter alterações
        queryClient.setQueryData(queryKey, previousData);
        console.warn(`Alteração revertida após 2s: ${type} ${id}`);
      }
    }, 2000);
    
    return { previousData, timeoutId };
  };

  const workpackageMutations = {
    update: api.workpackage.update.useMutation({
      onMutate: async (variables) => {
        // Cancelar refetches em andamento
        await utils.workpackage.findById.cancel({ id: variables.id });
        
        // Fazer atualização otimista com timeout
        const { previousData, timeoutId } = updateWithTimeout(
          'workpackage', 
          variables.id, 
          variables
        );
        
        return { previousData, timeoutId };
      },
      onSuccess: async (_, variables, context) => {
        // Limpar timeout pois a operação foi bem-sucedida
        if (context?.timeoutId) clearTimeout(context.timeoutId);
        
        await invalidateRelatedQueries({
          workpackageId: variables.id,
          projetoId
        });
        toast.success("Workpackage atualizado com sucesso!");
      },
      onError: (error, variables, context) => {
        // Limpar timeout (vamos reverter manualmente)
        if (context?.timeoutId) clearTimeout(context.timeoutId);
        
        // Reverter para dados anteriores
        if (context?.previousData) {
          utils.workpackage.findById.setData({ id: variables.id }, context.previousData);
        }
        toast.error(`Erro ao atualizar: ${error.message}`);
      }
    }),
    addAlocacao: api.workpackage.addAlocacao.useMutation({
      onSuccess: async (_, variables) => {
        await invalidateRelatedQueries({
          workpackageId: variables.workpackageId,
          projetoId
        });
        toast.success("Recurso alocado com sucesso");
      },
      onError: () => toast.error("Erro ao alocar recurso")
    }),
    removeAlocacao: api.workpackage.removeAlocacao.useMutation({
      onSuccess: async (_, variables) => {
        await invalidateRelatedQueries({
          workpackageId: variables.workpackageId,
          projetoId
        });
        toast.success("Alocação removida com sucesso");
      },
      onError: () => toast.error("Erro ao remover alocação")
    })
  };

  // mutations de tarefas
  const tarefaMutations = {
    create: api.tarefa.create.useMutation({
      onSuccess: async (_, variables) => {
        await invalidateRelatedQueries({
          workpackageId: variables.workpackageId,
          projetoId
        });
        toast.success("Tarefa criada com sucesso");
      },
      onError: (error) => {
        console.error("Erro ao criar tarefa:", error);
        toast.error("Erro ao criar tarefa");
      }
    }),
    update: api.tarefa.update.useMutation({
      onMutate: async (variables) => {
        // Cancelar refetches em andamento
        await utils.tarefa.findById.cancel(variables.id);
        
        // Fazer atualização otimista com timeout
        const { previousData, timeoutId } = updateWithTimeout(
          'tarefa', 
          variables.id, 
          variables.data,
          variables.data.workpackageId
        );
        
        return { previousData, timeoutId };
      },
      onSuccess: async (_, variables, context) => {
        // Limpar timeout pois a operação foi bem-sucedida
        if (context?.timeoutId) clearTimeout(context.timeoutId);
        
        await invalidateRelatedQueries({
          tarefaId: variables.id,
          workpackageId: variables.data.workpackageId,
          projetoId
        });
        
        toast.success("Tarefa atualizada com sucesso!");
      },
      onError: (error, variables, context) => {
        // Limpar timeout (vamos reverter manualmente)
        if (context?.timeoutId) clearTimeout(context.timeoutId);
        
        // Reverter para dados anteriores
        if (context?.previousData) {
          utils.tarefa.findById.setData(variables.id, context.previousData);
        }
        toast.error(`Erro ao atualizar: ${error.message}`);
      }
    }),
    delete: api.tarefa.delete.useMutation({
      onSuccess: async (_, variables) => {
        await invalidateRelatedQueries({
          projetoId
        });
        toast.success("Tarefa removida com sucesso");
      },
      onError: (error) => {
        console.error("Erro ao remover tarefa:", error);
        toast.error("Erro ao remover tarefa");
      }
    }),
    toggleEstado: api.tarefa.update.useMutation({
      onMutate: async (params) => {
        if (typeof params === 'string') {
          return { id: params, data: { estado: true } };
        }
        return params;
      },
      onSuccess: async (_, variables) => {
        const tarefaId = typeof variables === 'string' ? variables : variables.id;
        
        // Primeiro, recupere o workpackageId da tarefa
        const tarefa = await utils.tarefa.findById.fetch(tarefaId);
        
        // Invalidar em cascata
        await invalidateRelatedQueries({
          tarefaId: tarefaId,
          workpackageId: tarefa?.workpackageId, // Importante: invalidar o workpackage
          projetoId
        });
        
        toast.success(`Estado da tarefa alterado com sucesso`);
      },
      onError: (error) => {
        console.error("Erro ao atualizar estado da tarefa:", error);
        toast.error("Erro ao atualizar estado da tarefa");
      }
    }),
  };

  // mutations de entregáveis
  const entregavelMutations = {
    create: api.entregavel.create.useMutation({
      onSuccess: async () => {
        await invalidateRelatedQueries({
          projetoId: projetoId
        });
        toast.success("Entregável criado com sucesso");
      },
      onError: (error) => {
        console.error("Erro ao criar entregável:", error);
        toast.error("Erro ao criar entregável");
      }
    }),
    update: api.entregavel.update.useMutation({
      onSuccess: async () => {
        await invalidateRelatedQueries({
          projetoId: projetoId
        });
        toast.success("Entregável atualizado com sucesso");
      },
      onError: (error) => {
        console.error("Erro ao atualizar entregável:", error);
        toast.error("Erro ao atualizar entregável");
      }
    }),
    delete: api.entregavel.delete.useMutation({
      onSuccess: async () => {
        await invalidateRelatedQueries({
          projetoId: projetoId
        });
        toast.success("Entregável excluído com sucesso");
      },
      onError: (error) => {
        console.error("Erro ao excluir entregável:", error);
        toast.error("Erro ao excluir entregável");
      }
    }),
    toggleEstado: api.entregavel.update.useMutation({
      onMutate: async (params) => {
        if (params && 'id' in params && 'estado' in params) {
          return { 
            id: params.id, 
            data: { estado: params.estado } 
          };
        }
        return params;
      },
      onSuccess: async () => {
        await invalidateRelatedQueries({
          projetoId: projetoId
        });
        toast.success("Estado do entregável atualizado com sucesso");
      },
      onError: (error) => {
        console.error("Erro ao atualizar estado do entregável:", error);
        toast.error("Erro ao atualizar estado do entregável");
      }
    })
  };

  // mutations de materiais
  const materialMutations = {
    create: api.material.create.useMutation({
      onSuccess: async () => {
        await invalidateRelatedQueries({
          projetoId: projetoId
        });
        toast.success("Material adicionado com sucesso");
      },
      onError: () => toast.error("Erro ao adicionar material")
    }),
    update: api.material.update.useMutation({
      onSuccess: async () => {
        await invalidateRelatedQueries({
          projetoId: projetoId
        });
        toast.success("Material atualizado com sucesso");
      },
      onError: () => toast.error("Erro ao atualizar material")
    }),
    delete: api.material.delete.useMutation({
      onSuccess: async () => {
        await invalidateRelatedQueries({
          projetoId: projetoId
        });
        toast.success("Material excluído com sucesso");
      },
      onError: () => toast.error("Erro ao excluir material")
    })
  };

  return {
    workpackage: workpackageMutations,
    tarefa: tarefaMutations,
    entregavel: entregavelMutations,
    material: materialMutations,
    invalidateRelatedQueries,
    updateWithTimeout
  };
}