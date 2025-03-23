import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Rubrica } from "@prisma/client";

// Tipos para as mutações
interface WorkpackageUpdateInput {
  id: string;
  nome?: string;
  descricao?: string;
  estado?: boolean;
}

interface EntregavelToggleInput {
  id: string;
  estado: boolean;
  workpackageId: string;
}

interface EntregavelCreateInput {
  nome: string;
  tarefaId: string;
  descricao?: string | null;
  data?: string | null;
  anexo?: string | null;
  workpackageId: string;
}

interface EntregavelDeleteInput {
  id: string;
  workpackageId: string;
}

interface MaterialInput {
  id?: number;
  nome?: string;
  preco?: number;
  quantidade?: number;
  rubrica?: Rubrica;
  workpackageId: string;
  ano_utilizacao?: number;
}

// Definições de tipos para alocação
interface AlocacaoCreateInput {
  workpackageId: string;
  userId: string;
  mes: number;
  ano: number;
  ocupacao: number;
}

interface AlocacaoDeleteInput {
  workpackageId: string;
  userId: string;
  mes: number;
  ano: number;
}

export function useWorkpackageMutations(onUpdate?: () => Promise<void>) {
  const queryClient = useQueryClient();

  // Função para invalidar queries relacionadas
  const invalidateQueries = async (workpackageId?: string) => {
    // Invalidar todas as queries que podem ser afetadas
    await queryClient.invalidateQueries({ queryKey: ["workpackage"] });
    await queryClient.invalidateQueries({ queryKey: ["projeto"] });
    await queryClient.invalidateQueries({ queryKey: ["cronograma"] });
    
    if (workpackageId) {
      await queryClient.invalidateQueries({ 
        queryKey: ["workpackage.getById", { id: workpackageId }] 
      });
    }
    
    // Chamar callback se existir
    if (onUpdate) {
      await onUpdate();
    }
  };

  // Funções de uso com TRPC
  const updateWorkpackage = api.workpackage.update;
  const toggleEntregavel = api.entregavel.toggleEstado;
  const createEntregavel = api.entregavel.create;
  const deleteEntregavel = api.entregavel.delete;
  const createMaterial = api.material.create;
  const deleteMaterial = api.material.delete;
  const updateMaterial = api.material.update;
  const createAlocacao = api.workpackage.addAlocacao;
  const deleteAlocacao = api.workpackage.removeAlocacao;

  // Funções para envolver as mutações com tratamento de sucesso/erro
  const updateWorkpackageMutation = updateWorkpackage.useMutation({
    onSuccess: async (_, variables) => {
      await invalidateQueries(variables.id);
      toast.success("Workpackage atualizado com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  const toggleEntregavelEstado = toggleEntregavel.useMutation({
    onSuccess: async () => {
      await invalidateQueries();
      toast.success("Estado da tarefa atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar estado da tarefa");
    }
  });

  const createEntregavelMutation = createEntregavel.useMutation({
    onSuccess: async () => {
      await invalidateQueries();
      toast.success("Tarefa criada com sucesso");
    },
    onError: () => {
      toast.error("Erro ao criar tarefa");
    }
  });

  const deleteEntregavelMutation = deleteEntregavel.useMutation({
    onSuccess: async () => {
      await invalidateQueries();
      toast.success("Tarefa excluída com sucesso");
    },
    onError: () => {
      toast.error("Erro ao excluir tarefa");
    }
  });

  const createMaterialMutation = createMaterial.useMutation({
    onSuccess: async () => {
      await invalidateQueries();
      toast.success("Material adicionado com sucesso");
    },
    onError: () => {
      toast.error("Erro ao adicionar material");
    }
  });

  const deleteMaterialMutation = deleteMaterial.useMutation({
    onSuccess: async () => {
      await invalidateQueries();
      toast.success("Material excluído com sucesso");
    },
    onError: () => {
      toast.error("Erro ao excluir material");
    }
  });

  const updateMaterialMutation = updateMaterial.useMutation({
    onSuccess: async () => {
      await invalidateQueries();
      toast.success("Material atualizado com sucesso");
    },
    onError: () => {
      toast.error("Erro ao atualizar material");
    }
  });

  const createAlocacaoMutation = createAlocacao.useMutation({
    onSuccess: async () => {
      await invalidateQueries();
      toast.success("Recurso alocado com sucesso");
    },
    onError: () => {
      toast.error("Erro ao alocar recurso");
    }
  });

  const removeAlocacaoMutation = deleteAlocacao.useMutation({
    onSuccess: async () => {
      await invalidateQueries();
      toast.success("Alocação removida com sucesso");
    },
    onError: () => {
      toast.error("Erro ao remover alocação");
    }
  });

  return {
    updateWorkpackageMutation,
    toggleEntregavelEstado,
    createEntregavelMutation,
    deleteEntregavelMutation,
    createMaterialMutation,
    deleteMaterialMutation,
    updateMaterialMutation,
    invalidateQueries,
    createAlocacaoMutation,
    removeAlocacaoMutation
  };
} 