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
  const invalidateProjetoRelatedQueries = (specificProjetoId?: string) => {
    const targetProjetoId = specificProjetoId || projetoId;
    if (targetProjetoId) {
      queryClient.invalidateQueries({
        queryKey: ['projeto.findById', targetProjetoId]
      });
    }
  };

  // Workpackage mutations
  const workpackageMutations = {
    update: api.workpackage.update.useMutation({
      onMutate: async (variables: WorkpackageUpdate) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({
          queryKey: ['workpackage.findById', { id: variables.id }]
        });

        // Snapshot the previous value
        const previousData = queryClient.getQueryData(['workpackage.findById', { id: variables.id }]);

        // Optimistically update to the new value
        queryClient.setQueryData(['workpackage.findById', { id: variables.id }], (old: any) => {
          return { ...old, ...variables };
        });

        // Update in the project if needed
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
      onSuccess: (_data, variables) => {
        // Invalidate affected queries
        queryClient.invalidateQueries({
          queryKey: ['workpackage.findById', { id: variables.id }]
        });
        invalidateProjetoRelatedQueries();
      },
      onError: (error, variables, context: any) => {
        // If error, roll back to previous values
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
      onSuccess: (_data, variables) => {
        // Invalidate affected queries
        queryClient.invalidateQueries({
          queryKey: ['workpackage.findById', { id: variables.workpackageId }]
        });
        invalidateProjetoRelatedQueries();
      },
      onError: (error) => {
        console.error("Erro ao alocar recurso:", error);
        toast.error("Erro ao alocar recurso");
      }
    }),
    
    removeAlocacao: api.workpackage.removeAlocacao.useMutation({
      onSuccess: (_data, variables) => {
        // Invalidate affected queries
        queryClient.invalidateQueries({
          queryKey: ['workpackage.findById', { id: variables.workpackageId }]
        });
        invalidateProjetoRelatedQueries();
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
      onSuccess: (_data, variables) => {
        // Invalidate affected queries
        queryClient.invalidateQueries({
          queryKey: ['workpackage.findById', { id: variables.workpackageId }]
        });
        invalidateProjetoRelatedQueries();
      },
      onError: (error) => {
        console.error("Erro ao criar tarefa:", error);
        toast.error("Erro ao criar tarefa");
      }
    }),
    
    update: api.tarefa.update.useMutation({
      onMutate: async (variables: TarefaUpdate) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({
          queryKey: ['tarefa.findById', variables.id]
        });

        // Snapshot the previous value
        const previousData = queryClient.getQueryData(['tarefa.findById', variables.id]);

        // Optimistically update to the new value
        queryClient.setQueryData(['tarefa.findById', variables.id], (old: any) => {
          return { ...old, ...variables.data };
        });

        // Update in the parent workpackage and project if needed
        if (variables.data.workpackageId) {
          queryClient.setQueryData(['workpackage.findById', { id: variables.data.workpackageId }], (old: any) => {
            if (!old || !old.tarefas) return old;
            
            return {
              ...old,
              tarefas: old.tarefas.map((t: any) => 
                t.id === variables.id ? { ...t, ...variables.data } : t
              )
            };
          });
        }

        if (projetoId) {
          queryClient.setQueryData(['projeto.findById', projetoId], (old: any) => {
            if (!old || !old.workpackages) return old;
            
            return {
              ...old,
              workpackages: old.workpackages.map((wp: any) => {
                if (!wp.tarefas || variables.data.workpackageId !== wp.id) return wp;
                
                return {
                  ...wp,
                  tarefas: wp.tarefas.map((t: any) => 
                    t.id === variables.id ? { ...t, ...variables.data } : t
                  )
                };
              })
            };
          });
        }

        return { previousData };
      },
      onSuccess: (_data, variables) => {
        // Invalidate affected queries
        queryClient.invalidateQueries({
          queryKey: ['tarefa.findById', variables.id]
        });
        if (variables.data.workpackageId) {
          queryClient.invalidateQueries({
            queryKey: ['workpackage.findById', { id: variables.data.workpackageId }]
          });
        }
        invalidateProjetoRelatedQueries();
      },
      onError: (error, variables, context: any) => {
        // If error, roll back to previous values
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
      onSuccess: () => {
        invalidateProjetoRelatedQueries();
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
        
        // Get workpackage ID from cache if available
        const tarefaData = queryClient.getQueryData<any>(['tarefa.findById', tarefaId]);
        const workpackageId = tarefaData?.workpackageId || 
                             (typeof params !== 'string' ? params.data.workpackageId : undefined);
        
        if (!workpackageId) {
          console.warn("Workpackage ID not found for tarefa", tarefaId);
          return;
        }
        
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({
          queryKey: ['tarefa.findById', tarefaId]
        });

        // Snapshot previous values
        const previousTarefaData = queryClient.getQueryData(['tarefa.findById', tarefaId]);
        const previousWorkpackageData = queryClient.getQueryData([
          'workpackage.findById', { id: workpackageId }
        ]);
        
        // Update tarefa data
        queryClient.setQueryData(['tarefa.findById', tarefaId], (old: any) => {
          if (!old) return old;
          return { ...old, estado };
        });
        
        // Update workpackage data
        queryClient.setQueryData(['workpackage.findById', { id: workpackageId }], (old: any) => {
          if (!old || !old.tarefas) return old;
          
          const tarefasAtualizadas = old.tarefas.map((t: any) => 
            t.id === tarefaId ? { ...t, estado } : t
          );
          
          return {
            ...old,
            tarefas: tarefasAtualizadas
          };
        });
        
        return { 
          previousTarefaData,
          previousWorkpackageData,
          tarefaId,
          workpackageId
        };
      },
      onSuccess: (_data, _variables, context: any) => {
        if (!context) return;
        const { tarefaId, workpackageId } = context;
        
        // Invalidate affected queries
        if (tarefaId) {
          queryClient.invalidateQueries({
            queryKey: ['tarefa.findById', tarefaId]
          });
        }
        
        if (workpackageId) {
          queryClient.invalidateQueries({
            queryKey: ['workpackage.findById', { id: workpackageId }]
          });
        }
        
        invalidateProjetoRelatedQueries();
      },
      onError: (error, _, context: any) => {
        if (!context) return;
        const { previousTarefaData, previousWorkpackageData, tarefaId, workpackageId } = context;
        
        // Revert to previous values
        if (tarefaId && previousTarefaData) {
          queryClient.setQueryData(['tarefa.findById', tarefaId], previousTarefaData);
        }
        
        if (workpackageId && previousWorkpackageData) {
          queryClient.setQueryData(
            ['workpackage.findById', { id: workpackageId }], 
            previousWorkpackageData
          );
        }
        
        console.error("Erro ao atualizar estado da tarefa:", error);
        toast.error("Erro ao atualizar estado da tarefa");
      }
    }),
  };

  // Entregável mutations
  const entregavelMutations = {
    create: api.entregavel.create.useMutation({
      onSuccess: (_data, variables) => {
        // Find and update the parent tarefa
        const tarefaId = variables.tarefaId;
        if (tarefaId) {
          queryClient.invalidateQueries({
            queryKey: ['tarefa.findById', tarefaId]
          });
        }
      },
      onError: (error) => {
        console.error("Erro ao criar entregável:", error);
        toast.error("Erro ao criar entregável");
      }
    }),
    
    update: api.entregavel.update.useMutation({
      onSuccess: (_data, variables) => {
        // Invalidate entregavel data
        queryClient.invalidateQueries({
          queryKey: ['entregavel.findById', variables.id]
        });
      },
      onError: (error) => {
        console.error("Erro ao atualizar entregável:", error);
        toast.error("Erro ao atualizar entregável");
      }
    }),
    
    delete: api.entregavel.delete.useMutation({
      onSuccess: () => {
        invalidateProjetoRelatedQueries();
      },
      onError: (error) => {
        console.error("Erro ao excluir entregável:", error);
        toast.error("Erro ao excluir entregável");
      }
    }),
    
    toggleEstado: api.entregavel.toggleEstado.useMutation({
      onMutate: async (params) => {
        if (!params || !('id' in params) || !('estado' in params)) {
          return params;
        }

        // Find entregável in cached data to update it
        const entregavelId = params.id;
        
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({
          queryKey: ['entregavel.findById', entregavelId]
        });
        
        // Snapshot the previous value
        const previousEntregavelData = queryClient.getQueryData(['entregavel.findById', entregavelId]);
        
        // Optimistically update
        queryClient.setQueryData(['entregavel.findById', entregavelId], (old: any) => {
          if (!old) return old;
          return { ...old, estado: params.estado };
        });
        
        return { 
          previousEntregavelData,
          entregavelId: params.id,
          novoEstado: params.estado
        };
      },
      onSuccess: (_data, variables) => {
        const entregavelId = typeof variables === 'string' ? variables : variables.id;
        queryClient.invalidateQueries({
          queryKey: ['entregavel.findById', entregavelId]
        });
        invalidateProjetoRelatedQueries();
      },
      onError: (error, _variables, context: any) => {
        // If error, roll back
        if (context?.previousEntregavelData && context?.entregavelId) {
          queryClient.setQueryData(
            ['entregavel.findById', context.entregavelId], 
            context.previousEntregavelData
          );
        }
        
        console.error("Erro ao atualizar estado do entregável:", error);
        toast.error("Erro ao atualizar estado do entregável");
      }
    })
  };

  // Material mutations
  const materialMutations = {
    create: api.material.create.useMutation({
      onSuccess: () => {
        invalidateProjetoRelatedQueries();
      },
      onError: (error) => {
        console.error("Erro ao adicionar material:", error);
        toast.error("Erro ao adicionar material");
      }
    }),
    
    update: api.material.update.useMutation({
      onSuccess: () => {
        invalidateProjetoRelatedQueries();
      },
      onError: (error) => {
        console.error("Erro ao atualizar material:", error);
        toast.error("Erro ao atualizar material");
      }
    }),
    
    delete: api.material.delete.useMutation({
      onSuccess: () => {
        invalidateProjetoRelatedQueries();
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