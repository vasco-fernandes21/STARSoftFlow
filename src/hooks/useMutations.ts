import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export function useMutations(onUpdate?: () => Promise<void>, projetoId?: string) {
  const queryClient = useQueryClient();

  // Função genérica para invalidar queries com refetch forçado
  const invalidateQueries = async (options?: {
    workpackageId?: string;
    projetoId?: string;
  }) => {
    console.log("Invalidando queries com refetch forçado");
    
    const promises = [];
    
    if (options?.workpackageId) {
      // Forçar refetch da query específica do workpackage
      promises.push(
        queryClient.refetchQueries({
          queryKey: ["workpackage.findById", { id: options.workpackageId }],
          exact: true,
          type: 'all'
        })
      );
    }

    if (options?.projetoId || projetoId) {
      promises.push(
        queryClient.refetchQueries({
          queryKey: ["projeto.findById", options?.projetoId || projetoId],
          exact: true,
          type: 'all'
        })
      );
    }

    // Refetch geral para garantir
    promises.push(
      queryClient.refetchQueries({
        queryKey: ["workpackage"],
        type: 'all'
      })
    );

    await Promise.all(promises);
    
    if (onUpdate) {
      await onUpdate();
    }
  };

  const workpackageMutations = {
    update: api.workpackage.update.useMutation({
      // Atualização otimista
      onMutate: async (variables) => {
        // Cancelar queries em andamento
        await queryClient.cancelQueries({
          queryKey: ["workpackage.findById", { id: variables.id }]
        });

        // Snapshot do estado anterior
        const previousWorkpackage = queryClient.getQueryData(
          ["workpackage.findById", { id: variables.id }]
        );

        // Atualizar o cache otimisticamente
        queryClient.setQueryData(
          ["workpackage.findById", { id: variables.id }],
          (old: any) => ({
            ...old,
            ...variables
          })
        );

        return { previousWorkpackage };
      },
      
      onSuccess: async (_, variables) => {
        console.log("Mutation bem sucedida, forçando refetch");
        await invalidateQueries({ 
          workpackageId: variables.id,
          projetoId: projetoId 
        });
      },
      
      onError: (error, variables, context) => {
        // Reverter para o estado anterior em caso de erro
        if (context?.previousWorkpackage) {
          queryClient.setQueryData(
            ["workpackage.findById", { id: variables.id }],
            context.previousWorkpackage
          );
        }
        toast.error(`Erro ao atualizar: ${error.message}`);
      },
      
      onSettled: async (_, __, variables) => {
        // Garantir que os dados estejam sincronizados após conclusão
        await invalidateQueries({ 
          workpackageId: variables.id,
          projetoId: projetoId 
        });
      }
    }),
    addAlocacao: api.workpackage.addAlocacao.useMutation({
      onSuccess: async () => {
        await invalidateQueries();
        toast.success("Recurso alocado com sucesso");
      },
      onError: () => toast.error("Erro ao alocar recurso")
    }),
    removeAlocacao: api.workpackage.removeAlocacao.useMutation({
      onSuccess: async () => {
        await invalidateQueries();
        toast.success("Alocação removida com sucesso");
      },
      onError: () => toast.error("Erro ao remover alocação")
    })
  };

  // mutations de tarefas
  const tarefaMutations = {
    create: api.tarefa.create.useMutation({
      onSuccess: async () => {
        await invalidateQueries();
        toast.success("Tarefa criada com sucesso");
      },
      onError: (error) => {
        console.error("Erro ao criar tarefa:", error);
        toast.error("Erro ao criar tarefa");
      }
    }),
    update: api.tarefa.update.useMutation({
      onSuccess: async () => {
        await invalidateQueries();
        toast.success("Tarefa atualizada com sucesso");
      },
      onError: (error) => {
        console.error("Erro ao atualizar tarefa:", error);
        toast.error("Erro ao atualizar tarefa");
      }
    }),
    delete: api.tarefa.delete.useMutation({
      onSuccess: async () => {
        await invalidateQueries();
        toast.success("Tarefa removida com sucesso");
      },
      onError: (error) => {
        console.error("Erro ao remover tarefa:", error);
        toast.error("Erro ao remover tarefa");
      }
    }),
    toggleEstado: api.tarefa.update.useMutation({
      onMutate: async (params) => {
        const id = typeof params === 'string' ? params : params.id;
        if (typeof params === 'string') {
          return { id, data: { estado: true } };
        }
        return params;
      },
      onSuccess: async (data, variables) => {
        await invalidateQueries();
        const operacao = typeof variables === 'string' || variables.data.estado !== undefined 
          ? 'alterado' 
          : 'atualizado';
        toast.success(`Estado da tarefa ${operacao} com sucesso`);
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
        await invalidateQueries();
        toast.success("Entregável criado com sucesso");
      },
      onError: (error) => {
        console.error("Erro ao criar entregável:", error);
        toast.error("Erro ao criar entregável");
      }
    }),
    update: api.entregavel.update.useMutation({
      onSuccess: async () => {
        await invalidateQueries();
        toast.success("Entregável atualizado com sucesso");
      },
      onError: (error) => {
        console.error("Erro ao atualizar entregável:", error);
        toast.error("Erro ao atualizar entregável");
      }
    }),
    delete: api.entregavel.delete.useMutation({
      onSuccess: async () => {
        await invalidateQueries();
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
        await invalidateQueries();
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
        await invalidateQueries();
        toast.success("Material adicionado com sucesso");
      },
      onError: () => toast.error("Erro ao adicionar material")
    }),
    update: api.material.update.useMutation({
      onSuccess: async () => {
        await invalidateQueries();
        toast.success("Material atualizado com sucesso");
      },
      onError: () => toast.error("Erro ao atualizar material")
    }),
    delete: api.material.delete.useMutation({
      onSuccess: async () => {
        await invalidateQueries();
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
    invalidateQueries
  };
}