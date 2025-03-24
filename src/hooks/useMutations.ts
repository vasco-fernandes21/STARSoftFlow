import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/hooks/queryKeys";

export function useMutations(projetoId?: string) {
  const utils = api.useUtils();

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

  const workpackageMutations = {
    update: api.workpackage.update.useMutation({
      onMutate: async (variables) => {
        await utils.workpackage.findById.cancel({ id: variables.id });

        const previousData = utils.workpackage.findById.getData({ id: variables.id });

        // Manter a estrutura existente e apenas atualizar os campos necessários
        utils.workpackage.findById.setData({ id: variables.id }, (old) => {
          if (!old) return old;
          return {
            ...old,
            ...variables
          };
        });

        return { previousData };
      },
      onSuccess: async (_, variables) => {
        await invalidateRelatedQueries({
          workpackageId: variables.id,
          projetoId
        });
        toast.success("Workpackage atualizado com sucesso!");
      },
      onError: (error, variables, context) => {
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
      onSuccess: async (_, variables) => {
        await invalidateRelatedQueries({
          tarefaId: variables.id,
          workpackageId: variables.data.workpackageId,
          projetoId
        });
        
        toast.success("Tarefa atualizada com sucesso!");
      },
      onError: (error) => {
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
    invalidateRelatedQueries
  };
}