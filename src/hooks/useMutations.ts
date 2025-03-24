import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/hooks/queryKeys";

// Tipos para as atualizações
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

interface InvalidateOptions {
  projetoId?: string;
  workpackageId?: string;
  tarefaId?: string;
}

type EntityType = 'workpackage' | 'tarefa';

export function useMutations(projetoId?: string) {
  const utils = api.useUtils();
  const queryClient = useQueryClient();

  // função helper para invalidar queries relacionadas
  const invalidateRelatedQueries = async (options: InvalidateOptions) => {
    const promises: Promise<void>[] = [];

    if (options.projetoId || projetoId) {
      const targetId = options.projetoId || projetoId!;
      promises.push(
        utils.projeto.findById.invalidate(targetId),
        utils.projeto.findAll.invalidate()
      );
    }

    if (options.workpackageId) {
      promises.push(
        utils.workpackage.findById.invalidate({ id: options.workpackageId }),
        utils.workpackage.findAll.invalidate()
      );
    }

    if (options.tarefaId) {
      promises.push(
        utils.tarefa.findById.invalidate(options.tarefaId),
        utils.tarefa.getEntregaveisByTarefa.invalidate(options.tarefaId)
      );
    }

    await Promise.all(promises);
  };

  // Atualização otimista imediata - sem timeout
  const updateCacheImmediately = <T extends unknown>(
    type: EntityType, 
    id: string, 
    data: any, 
    workpackageId?: string
  ) => {
    // Definir chaves de consulta
    const queryKey = type === 'workpackage' 
      ? ['workpackage', 'findById', { id }]
      : ['tarefa', 'findById', id];
    
    // Salvar dados anteriores
    const previousData = queryClient.getQueryData<T>(queryKey);
    
    // Atualizar a entidade específica
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return { ...old, ...(type === 'workpackage' ? data : data.data) };
    });
    
    // Atualizar no projeto pai para refletir em todos os componentes
    if (projetoId) {
      queryClient.setQueryData(['projeto', 'findById', projetoId], (old: any) => {
        if (!old || !old.workpackages) return old;
        
        if (type === 'workpackage') {
          return {
            ...old,
            workpackages: old.workpackages.map((wp: any) => 
              wp.id === id ? { ...wp, ...data } : wp
            )
          };
        } else if (workpackageId) {
          return {
            ...old,
            workpackages: old.workpackages.map((wp: any) => {
              if (wp.id !== workpackageId) return wp;
              return {
                ...wp,
                tarefas: wp.tarefas?.map((t: any) => 
                  t.id === id ? { ...t, ...data.data } : t
                ) || []
              };
            })
          };
        }
        return old;
      });
    }
    
    return { previousData };
  };

  // Workpackage mutations
  const workpackageMutations = {
    update: api.workpackage.update.useMutation({
      onMutate: async (variables: WorkpackageUpdate) => {
        await utils.workpackage.findById.cancel({ id: variables.id });
        return updateCacheImmediately('workpackage', variables.id, variables);
      },
      onSuccess: async (_, variables) => {
        await invalidateRelatedQueries({
          workpackageId: variables.id,
          projetoId
        });
      },
      onError: (error, variables, context: any) => {
        if (context?.previousData) {
          queryClient.setQueryData(
            ['workpackage', 'findById', { id: variables.id }], 
            context.previousData
          );
          
          if (projetoId) {
            queryClient.invalidateQueries({
              queryKey: ['projeto', 'findById', projetoId]
            });
          }
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
      },
      onError: () => toast.error("Erro ao alocar recurso")
    }),
    
    removeAlocacao: api.workpackage.removeAlocacao.useMutation({
      onSuccess: async (_, variables) => {
        await invalidateRelatedQueries({
          workpackageId: variables.workpackageId,
          projetoId
        });
      },
      onError: () => toast.error("Erro ao remover alocação")
    })
  };

  // Tarefa mutations
  const tarefaMutations = {
    create: api.tarefa.create.useMutation({
      onSuccess: async (_, variables) => {
        await invalidateRelatedQueries({
          workpackageId: variables.workpackageId,
          projetoId
        });
      },
      onError: (error) => {
        console.error("Erro ao criar tarefa:", error);
        toast.error("Erro ao criar tarefa");
      }
    }),
    
    update: api.tarefa.update.useMutation({
      onMutate: async (variables: TarefaUpdate) => {
        await utils.tarefa.findById.cancel(variables.id);
        return updateCacheImmediately(
          'tarefa', 
          variables.id, 
          variables,
          variables.data.workpackageId
        );
      },
      onSuccess: async (_, variables) => {
        await invalidateRelatedQueries({
          tarefaId: variables.id,
          workpackageId: variables.data.workpackageId,
          projetoId
        });
      },
      onError: (error, variables, context: any) => {
        if (context?.previousData) {
          queryClient.setQueryData(
            ['tarefa', 'findById', variables.id], 
            context.previousData
          );
          
          if (projetoId) {
            queryClient.invalidateQueries({
              queryKey: ['projeto', 'findById', projetoId]
            });
          }
        }
        toast.error(`Erro ao atualizar: ${error.message}`);
      }
    }),
    
    delete: api.tarefa.delete.useMutation({
      onSuccess: async (_, variables) => {
        await invalidateRelatedQueries({ projetoId });
      },
      onError: (error) => {
        console.error("Erro ao remover tarefa:", error);
        toast.error("Erro ao remover tarefa");
      }
    }),
    
    toggleEstado: api.tarefa.update.useMutation({
      onMutate: async (params: string | TarefaUpdate) => {
        const tarefaId = typeof params === 'string' ? params : params.id;
        const estado = typeof params === 'string' ? true : !!params.data.estado;
        
        // Buscar a tarefa atual para obter o workpackageId
        const tarefa = await utils.tarefa.findById.fetch(tarefaId).catch(() => null);
        const workpackageId = tarefa?.workpackageId;
        
        // Construir o objeto de atualização
        const updateData: TarefaUpdate = {
          id: tarefaId,
          data: { estado, workpackageId }
        };
        
        // Cancelar refetches
        await utils.tarefa.findById.cancel(tarefaId);
        
        // Atualizar cache imediatamente
        const result = updateCacheImmediately(
          'tarefa',
          tarefaId,
          updateData,
          workpackageId
        );
        
        return { 
          previousData: result.previousData,
          updateData
        };
      },
      onSuccess: async (_, variables, context: any) => {
        if (!context?.updateData) return;
        
        const tarefaId = context.updateData.id;
        const workpackageId = context.updateData.data.workpackageId;
        
        await invalidateRelatedQueries({
          tarefaId,
          workpackageId,
          projetoId
        });
      },
      onError: (error, _, context: any) => {
        if (context?.previousData && context?.updateData) {
          queryClient.setQueryData(
            ['tarefa', 'findById', context.updateData.id], 
            context.previousData
          );
          
          if (projetoId) {
            queryClient.invalidateQueries({
              queryKey: ['projeto', 'findById', projetoId]
            });
          }
        }
        console.error("Erro ao atualizar estado da tarefa:", error);
        toast.error("Erro ao atualizar estado da tarefa");
      }
    }),
  };

  // Entregável mutations
  const entregavelMutations = {
    create: api.entregavel.create.useMutation({
      onSuccess: async () => {
        await invalidateRelatedQueries({ projetoId });
      },
      onError: (error) => {
        console.error("Erro ao criar entregável:", error);
        toast.error("Erro ao criar entregável");
      }
    }),
    
    update: api.entregavel.update.useMutation({
      onSuccess: async () => {
        await invalidateRelatedQueries({ projetoId });
      },
      onError: (error) => {
        console.error("Erro ao atualizar entregável:", error);
        toast.error("Erro ao atualizar entregável");
      }
    }),
    
    delete: api.entregavel.delete.useMutation({
      onSuccess: async () => {
        await invalidateRelatedQueries({ projetoId });
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
        await invalidateRelatedQueries({ projetoId });
      },
      onError: (error) => {
        console.error("Erro ao atualizar estado do entregável:", error);
        toast.error("Erro ao atualizar estado do entregável");
      }
    })
  };

  // Material mutations
  const materialMutations = {
    create: api.material.create.useMutation({
      onSuccess: async () => {
        await invalidateRelatedQueries({ projetoId });
      },
      onError: () => toast.error("Erro ao adicionar material")
    }),
    
    update: api.material.update.useMutation({
      onSuccess: async () => {
        await invalidateRelatedQueries({ projetoId });
      },
      onError: () => toast.error("Erro ao atualizar material")
    }),
    
    delete: api.material.delete.useMutation({
      onSuccess: async () => {
        await invalidateRelatedQueries({ projetoId });
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
    updateCacheImmediately
  };
}