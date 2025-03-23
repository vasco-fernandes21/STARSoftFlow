import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Rubrica } from "@prisma/client";

export function useWorkpackageMutations(
  workpackageId: string, 
  queryClient: ReturnType<typeof useQueryClient>,
  onUpdate?: () => Promise<void>
) {
  const updateWorkpackageMutation = api.workpackage.update.useMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workpackage.getById", { id: workpackageId }] });
      if (onUpdate) await onUpdate();
      toast.success("Workpackage atualizado");
    }
  });

  const createMaterialMutation = api.workpackage.addMaterial.useMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workpackage.getById", { id: workpackageId }] });
      if (onUpdate) await onUpdate();
      toast.success("Material adicionado");
    }
  });

  const deleteMaterialMutation = api.workpackage.removeMaterial.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workpackage.getById", { id: workpackageId }] });
      toast.success("Material removido");
    }
  });

  const updateMaterialMutation = api.material.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workpackage.getById", { id: workpackageId }] });
      toast.success('Material atualizado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar material');
    }
  });

  const addAlocacaoMutation = api.workpackage.addAlocacao.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workpackage.getById", { id: workpackageId }] });
      toast.success("Recurso alocado com sucesso");
    }
  });

  const removeAlocacaoMutation = api.workpackage.removeAlocacao.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workpackage.getById", { id: workpackageId }] });
      toast.success("Alocação removida com sucesso");
    }
  });

  const createEntregavelMutation = api.tarefa.createEntregavel.useMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workpackage.getById", { id: workpackageId }] });
      if (onUpdate) await onUpdate();
      toast.success("Entregável adicionado");
    }
  });
  
  const deleteEntregavelMutation = api.tarefa.deleteEntregavel.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workpackage.getById", { id: workpackageId }] });
      toast.success("Entregável removido");
    }
  });
  
  const updateEntregavelMutation = api.tarefa.updateEntregavel.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workpackage.getById", { id: workpackageId }] });
      toast.success("Entregável atualizado");
    }
  });

  const toggleEntregavelEstadoMutation = api.entregavel.toggleEstado.useMutation({
    onMutate: async ({ id, estado }) => {
      await queryClient.cancelQueries({ queryKey: ["workpackage.getById", { id: workpackageId }] });
      
      const previousWorkpackage = queryClient.getQueryData(["workpackage.getById", { id: workpackageId }]);
      
      queryClient.setQueryData(
        ["workpackage.getById", { id: workpackageId }],
        (old: any) => {
          if (!old) return old;
          
          const newData = JSON.parse(JSON.stringify(old));
          
          newData.tarefas?.forEach((tarefa: any) => {
            tarefa.entregaveis?.forEach((entregavel: any) => {
              if (entregavel.id === id) {
                entregavel.estado = estado;
              }
            });
          });
          
          return newData;
        }
      );
      
      return { previousWorkpackage };
    },
    
    onError: (err, variables, context) => {
      if (context?.previousWorkpackage) {
        queryClient.setQueryData(
          ["workpackage.getById", { id: workpackageId }],
          context.previousWorkpackage
        );
      }
      toast.error("Erro ao atualizar estado do entregável");
      console.error(err);
    },
    
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workpackage.getById", { id: workpackageId }] });
      await queryClient.invalidateQueries({ queryKey: ["tarefa.getById"] });
      toast.success("Estado do entregável atualizado");
    }
  });

  const toggleEntregavelEstado = async (entregavelId: string, estado: boolean) => {
    try {
      await toggleEntregavelEstadoMutation.mutateAsync({ 
        id: entregavelId, 
        estado: estado 
      });
    } catch (error) {
      // O tratamento de erro já está no onError da mutation
    }
  };

  return {
    updateWorkpackageMutation,
    createMaterialMutation,
    deleteMaterialMutation,
    updateMaterialMutation,
    addAlocacaoMutation,
    removeAlocacaoMutation,
    createEntregavelMutation,
    deleteEntregavelMutation,
    updateEntregavelMutation,
    toggleEntregavelEstado,
    toggleEntregavelEstadoMutation
  };
}
