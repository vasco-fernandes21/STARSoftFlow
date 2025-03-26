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

interface EntregavelCreate {
  nome: string;
  descricao?: string | null;
  data?: string | null; // Data deve ser string ISO
  anexo?: string | null;
  estado?: boolean;
  tarefaId: string;
}

interface EntregavelUpdate {
  id: string;
  data: {
    nome?: string;
    descricao?: string | null;
    data?: string | null; // Data deve ser string ISO
    anexo?: string | null;
    estado?: boolean;
  };
}

// Helper function to ensure date is in ISO string format
function ensureDateString(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return null;
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
    
        // Atualizar otimisticamente a tarefa no cache
        queryClient.setQueryData(['tarefa.findById', variables.id], (old: any) => {
          if (!old) return old;
          return { ...old, ...variables.data };
        });
    
        // Atualizar a tarefa também no contexto do projeto, se aplicável
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
    
        return { previousData, previousProjetoData: queryClient.getQueryData(['projeto.findById', projetoId]) };
      },
      onSuccess: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error, variables, context: any) => {
        // Reverter mudanças otimistas em caso de erro
        if (context?.previousData) {
          queryClient.setQueryData(['tarefa.findById', variables.id], context.previousData);
        }
        if (context?.previousProjetoData && projetoId) {
          queryClient.setQueryData(['projeto.findById', projetoId], context.previousProjetoData);
        }
    
        console.error("Erro ao atualizar tarefa:", error);
        toast.error(`Erro ao atualizar: ${error.message}`);
      }
    }),    
  };

  // Entregável mutations
  const entregavelMutations = {
    create: api.entregavel.create.useMutation({
      onMutate: async (variables: EntregavelCreate) => {
        // Guardar estado atual do projeto
        let previousProjetoData;
        if (projetoId) {
          previousProjetoData = queryClient.getQueryData(['projeto.findById', projetoId]);
        }

        // Atualizar cache do projeto otimisticamente
        if (variables.tarefaId && projetoId) {
          const tempId = `temp-${Date.now()}`;
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
                          id: tempId,
                          ...variables,
                          data: ensureDateString(variables.data)
                        }]
                      } 
                    : t
                )
              }))
            };
          });
        }

        // Refetch imediato para mostrar alterações
        void invalidateProjetoRelatedQueries();

        return { previousProjetoData };
      },
      onError: (error, _variables, context: any) => {
        // Reverter em caso de erro
        if (projetoId && context?.previousProjetoData) {
          queryClient.setQueryData(
            ['projeto.findById', projetoId],
            context.previousProjetoData
          );
        }
        
        console.error("Erro ao criar entregável:", error);
        toast.error("Erro ao criar entregável");
      },
      onSettled: async () => {
        // Sempre refetch quando finalizar
        await invalidateProjetoRelatedQueries();
      }
    }),
    
    update: api.entregavel.update.useMutation({
      onMutate: async (variables: EntregavelUpdate) => {
        // Cancelar queries pendentes
        await queryClient.cancelQueries({
          queryKey: ['entregavel.findById', variables.id]
        });

        // Guardar snapshot do estado atual
        const previousEntregavelData = queryClient.getQueryData(['entregavel.findById', variables.id]);
        let previousProjetoData;
        
        if (projetoId) {
          previousProjetoData = queryClient.getQueryData(['projeto.findById', projetoId]);
        }

        // Atualizar cache do entregável
        queryClient.setQueryData(['entregavel.findById', variables.id], (old: any) => {
          if (!old) return old;
          return { 
            ...old, 
            ...variables.data,
            data: ensureDateString(variables.data.data)
          };
        });

        // Atualizar cache do projeto
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
                    e.id === variables.id ? { 
                      ...e, 
                      ...variables.data,
                      data: ensureDateString(variables.data.data)
                    } : e
                  )
                }))
              }))
            };
          });
        }

        // Refetch imediato para mostrar alterações
        void invalidateProjetoRelatedQueries();

        return { previousEntregavelData, previousProjetoData };
      },
      onError: (error, variables, context: any) => {
        // Reverter cache em caso de erro
        if (context?.previousEntregavelData) {
          queryClient.setQueryData(
            ['entregavel.findById', variables.id], 
            context.previousEntregavelData
          );
        }
        
        if (projetoId && context?.previousProjetoData) {
          queryClient.setQueryData(
            ['projeto.findById', projetoId],
            context.previousProjetoData
          );
        }
        
        console.error("Erro ao atualizar entregável:", error);
        toast.error("Erro ao atualizar entregável");
      },
      onSettled: async () => {
        // Sempre refetch quando finalizar
        await invalidateProjetoRelatedQueries();
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
        console.error("Erro ao apagar entregável:", error);
        toast.error("Erro ao apagar entregável");
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
      onMutate: async (variables) => {
        // Cancelar queries em andamento
        await queryClient.cancelQueries({
          queryKey: ['workpackage.getByWorkpackage']
        });
        
        // Otimisticamente atualizar o estado na UI
        if (projetoId) {
          queryClient.setQueryData(['projeto.findById', projetoId], (old: any) => {
            if (!old?.workpackages) return old;
            
            return {
              ...old,
              workpackages: old.workpackages.map((wp: any) => ({
                ...wp,
                materiais: wp.materiais?.map((m: any) => 
                  m.id === variables.id ? { ...m, ...variables } : m
                )
              }))
            };
          });
        }
        
        return { previousProjetoData: queryClient.getQueryData(['projeto.findById', projetoId]) };
      },
      onSuccess: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error, variables, context: any) => {
        // Reverter mudanças otimistas em caso de erro
        if (context?.previousProjetoData && projetoId) {
          queryClient.setQueryData(['projeto.findById', projetoId], context.previousProjetoData);
        }
        
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
        console.error("Erro ao apagar material:", error);
        toast.error("Erro ao apagar material");
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