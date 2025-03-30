import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { Rubrica, ProjetoEstado } from "@prisma/client";
import { getQueryKey } from "@trpc/react-query";

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

interface MaterialUpdate {
  id: number;
  workpackageId?: string;
  data?: {
    nome?: string;
    descricao?: string;
    preco?: number;
    quantidade?: number;
    ano_utilizacao?: number;
    rubrica?: Rubrica;
    estado?: boolean;
  };
}

interface MaterialFormData {
  id?: number;
  nome: string;
  descricao: string | null;
  preco: number;
  quantidade: number;
  ano_utilizacao: number;
  rubrica: Rubrica;
  workpackageId?: string;
}

// Interface updates for better type safety
interface TarefaMutations {
  create: any;
  update: any;
  delete: any;
}

interface EntregavelMutations {
  create: any;
  update: any;
  delete: any;
}

interface MaterialMutations {
  create: ReturnType<typeof api.material.create.useMutation>;
  update: ReturnType<typeof api.material.update.useMutation>;
  delete: ReturnType<typeof api.material.delete.useMutation>;
  handleSubmit: (workpackageId: string, material: Omit<MaterialFormData, 'workpackageId'>, mutations: MaterialMutations) => void;
  handleToggleEstado: (id: number, estado: boolean, workpackageId: string, mutations: MaterialMutations) => Promise<void>;
  handleRemove: (id: number, mutations: MaterialMutations) => void;
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

interface UpdateProjetoData {
  nome?: string;
  descricao?: string;
  inicio?: Date;
  fim?: Date;
  overhead?: number;
  taxa_financiamento?: number;
  valor_eti?: number;
  financiamentoId?: number;
  estado?: ProjetoEstado;
}

// Helper function to ensure date is in ISO string format
function ensureDateString(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

export function useMutations(projetoId: string) {
  const queryClient = useQueryClient();
  const projetoKey = getQueryKey(api.projeto.findById, projetoId);

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

  // Projeto mutations
  const projetoMutations = {
    update: api.projeto.update.useMutation({
      onMutate: async (variables: UpdateProjetoData) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey: projetoKey });

        // Snapshot the previous value
        const previousProjeto = queryClient.getQueryData(projetoKey);

        // Optimistically update to the new value
        queryClient.setQueryData(projetoKey, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            ...variables,
          };
        });

        // Return a context object with the snapshotted value
        return { previousProjeto };
      },
      onError: (err, variables, context) => {
        // If the mutation fails, use the context returned from onMutate to roll back
        if (context?.previousProjeto) {
          queryClient.setQueryData(projetoKey, context.previousProjeto);
        }
        toast.error("Erro ao atualizar projeto");
      },
      onSettled: () => {
        // Always refetch after error or success
        void queryClient.invalidateQueries({ queryKey: projetoKey });
      },
    }),
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
      onSuccess: async (_data, _variables) => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error, variables, context: any) => {
        if (context?.previousData) {
          queryClient.setQueryData(
            ['workpackage.findById', typeof variables === 'object' && variables !== null && 'id' in variables ? { id: variables.id } : null], 
            context.previousData
          );
        }
        console.error("Erro ao atualizar workpackage:", error);
        toast.error(`Erro ao atualizar: ${error.message}`);
      }
    }),
    
    addAlocacao: api.workpackage.addAlocacao.useMutation({
      onSuccess: async (_data, _variables) => {
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
      onSuccess: async (_data, _variables) => {
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
      onSuccess: async (_data, _variables) => {
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
        // Stop any outgoing refetches
        if (typeof variables === 'object' && variables !== null && 'id' in variables && variables.id) {
          await queryClient.cancelQueries({ queryKey: ['projeto', projetoId] });
          await queryClient.cancelQueries({ queryKey: ['workpackage', variables.id.split('-')[0]] });
        }
        
        // Snapshot the previous value
        const previousProjeto = queryClient.getQueryData(['projeto', projetoId]);
        
        return { previousProjeto };
      },
      onSuccess: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error, variables, context: any) => {
        if (context?.previousProjeto) {
          queryClient.setQueryData(['projeto', projetoId], context.previousProjeto);
        }
        
        toast.error(`Erro ao atualizar: ${error.message}`);
      }
    }),
    
    delete: api.tarefa.delete.useMutation({
      onSuccess: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error) => {
        console.error("Erro ao remover tarefa:", error);
        toast.error("Erro ao remover tarefa");
      }
    })
  } as TarefaMutations;

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
        if (typeof variables === 'object' && variables !== null && 'id' in variables && variables.id) {
          await queryClient.cancelQueries({
            queryKey: ['entregavel.findById', variables.id]
          });
        }

        // Guardar snapshot do estado atual
        const previousEntregavelData = typeof variables === 'object' && variables !== null && 'id' in variables && variables.id 
          ? queryClient.getQueryData(['entregavel.findById', variables.id]) 
          : null;
        let previousProjetoData;
        
        if (projetoId) {
          previousProjetoData = queryClient.getQueryData(['projeto.findById', projetoId]);
        }

        // Atualizar cache do entregável
        if (typeof variables === 'object' && variables !== null && 'id' in variables && variables.id && 'data' in variables && variables.data) {
          queryClient.setQueryData(['entregavel.findById', variables.id], (old: any) => {
            if (!old) return old;
            return { 
              ...old, 
              ...variables.data,
              data: ensureDateString(variables.data.data)
            };
          });
        }

        // Atualizar cache do projeto
        if (projetoId && typeof variables === 'object' && variables !== null && 'id' in variables && variables.id && 'data' in variables) {
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
        if (context?.previousEntregavelData && typeof variables === 'object' && variables !== null && 'id' in variables && variables.id) {
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
  } as EntregavelMutations;

  // Material mutations
  const createMaterialMutations = (projetoId?: string, queryClient?: ReturnType<typeof useQueryClient>): MaterialMutations => ({
    create: api.material.create.useMutation({
      onSuccess: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
        toast.success("Material adicionado com sucesso");
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
      onMutate: async (variables: MaterialUpdate) => {
        // if only id is provided, we toggle the state
        const isValidVariables = typeof variables === 'object' && variables !== null && 'id' in variables;
        const updateData = isValidVariables && 'data' in variables && variables.data ? variables.data : { estado: undefined };
        
        if (isValidVariables && !('data' in variables) && variables.id) {
          const currentData = queryClient?.getQueryData(['material.findById', variables.id]) as any;
          if (currentData) {
            updateData.estado = !currentData.estado;
          }
        }

        // Cancel pending queries
        if (isValidVariables && 'id' in variables && variables.id) {
          await queryClient?.cancelQueries({
            queryKey: ['material.findById', variables.id]
          });
        }

        // Store current state
        const previousMaterialData = isValidVariables && 'id' in variables && variables.id 
          ? queryClient?.getQueryData(['material.findById', variables.id]) 
          : null;
        let previousProjetoData;
        
        if (projetoId) {
          previousProjetoData = queryClient?.getQueryData(['projeto.findById', projetoId]);
        }

        // Update material cache optimistically
        if (isValidVariables && 'id' in variables && variables.id) {
          queryClient?.setQueryData(['material.findById', variables.id], (old: any) => {
            if (!old) return old;
            return { ...old, ...updateData };
          });
        }

        // Update project cache optimistically
        if (projetoId && isValidVariables && 'id' in variables && variables.id) {
          queryClient?.setQueryData(['projeto.findById', projetoId], (old: any) => {
            if (!old?.workpackages) return old;
            
            return {
              ...old,
              workpackages: old.workpackages.map((wp: any) => ({
                ...wp,
                materiais: wp.materiais?.map((m: any) => 
                  m.id === variables.id ? { ...m, ...updateData } : m
                )
              }))
            };
          });
        }

        return { previousMaterialData, previousProjetoData };
      },
      onSuccess: async (_data, variables) => {
        await invalidateProjetoRelatedQueries(projetoId);
        
        const isValidVariables = typeof variables === 'object' && variables !== null;
        const hasDataWithEstado = isValidVariables && 'data' in variables && 
                                variables.data && 'estado' in variables.data && 
                                variables.data.estado !== undefined;
        
        if (hasDataWithEstado) {
          const estado = isValidVariables && 'data' in variables && 
                        variables.data && 'estado' in variables.data ? 
                        variables.data.estado : false;
          toast.success(estado ? "Material marcado como concluído" : "Material marcado como pendente");
        } else {
          toast.success("Material atualizado com sucesso");
        }
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error, variables, context: any) => {
        // Revert optimistic updates on error
        const isValidVariables = typeof variables === 'object' && variables !== null && 'id' in variables && variables.id;
        
        if (context?.previousMaterialData && isValidVariables) {
          queryClient?.setQueryData(
            ['material.findById', variables.id], 
            context.previousMaterialData
          );
        }
        
        if (projetoId && context?.previousProjetoData) {
          queryClient?.setQueryData(
            ['projeto.findById', projetoId],
            context.previousProjetoData
          );
        }
        
        console.error("Erro ao atualizar material:", error);
        toast.error("Erro ao atualizar material");
      }
    }),
    
    delete: api.material.delete.useMutation({
      onSuccess: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
        toast.success("Material removido com sucesso");
      },
      onSettled: async () => {
        await invalidateProjetoRelatedQueries(projetoId);
      },
      onError: (error) => {
        console.error("Erro ao apagar material:", error);
        toast.error("Erro ao apagar material");
      }
    }),

    // Helper functions
    handleSubmit: (workpackageId: string, material: Omit<MaterialFormData, 'workpackageId'>, mutations: MaterialMutations) => {
      if (material.id) {
        mutations.update.mutate({
          id: material.id,
          workpackageId,
          data: {
            nome: material.nome,
            descricao: material.descricao === null ? undefined : material.descricao,
            preco: material.preco,
            quantidade: material.quantidade,
            ano_utilizacao: material.ano_utilizacao,
            rubrica: material.rubrica
          }
        });
      } else {
        mutations.create.mutate({
          workpackageId,
          nome: material.nome,
          descricao: material.descricao === null ? undefined : material.descricao,
          preco: material.preco,
          quantidade: material.quantidade,
          ano_utilizacao: material.ano_utilizacao,
          rubrica: material.rubrica
        });
      }
    },

    handleToggleEstado: async (id: number, estado: boolean, workpackageId: string, mutations: MaterialMutations) => {
      await mutations.update.mutate({
        id,
        workpackageId,
        data: { estado }
      });
    },

    handleRemove: (id: number, mutations: MaterialMutations) => {
      if (!confirm("Tem a certeza que deseja apagar este material?")) {
        return;
      }
      mutations.delete.mutate(id);
    }
  });

  return {
    projeto: projetoMutations,
    workpackage: workpackageMutations,
    tarefa: tarefaMutations,
    entregavel: entregavelMutations,
    material: createMaterialMutations(projetoId, queryClient)
  };
}