import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { TarefaForm } from "@/components/projetos/criar/novo/workpackages/tarefas/form";
import { TarefaItem } from "@/components/projetos/criar/novo/workpackages/tarefas/item";
import { type UseMutationResult } from "@tanstack/react-query";
import { WorkpackageCompleto, TarefaWithRelations } from "@/components/projetos/types";

type WorkpackageTarefasProps = {
  workpackage: WorkpackageCompleto;
  workpackageId: string;
  addingTarefa: boolean;
  setAddingTarefa: (value: boolean) => void;
  createEntregavelMutation: UseMutationResult<any, unknown, any, unknown>;
  deleteEntregavelMutation: UseMutationResult<any, unknown, any, unknown>;
  queryClient: any;
  toggleEntregavelEstado: (entregavelId: string, estado: boolean) => Promise<void>;
};

export function WorkpackageTarefas({
  workpackage,
  workpackageId,
  addingTarefa,
  setAddingTarefa,
  createEntregavelMutation,
  deleteEntregavelMutation,
  queryClient,
  toggleEntregavelEstado
}: WorkpackageTarefasProps) {
  const handleToggleEstado = async (entregavelId: string, estado: boolean) => {
    await toggleEntregavelEstado(entregavelId, estado);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Tarefas</span>
        {!addingTarefa && (
          <Button
            variant="ghost"
            onClick={() => setAddingTarefa(true)}
            className="h-7 w-7 rounded-md bg-gray-50"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {addingTarefa && (
          <div className="bg-gray-50/50 rounded-md p-3">
            <TarefaForm
              workpackageId={workpackageId}
              workpackageInicio={workpackage.inicio || new Date()}
              workpackageFim={workpackage.fim || new Date()}
              onSubmit={() => {
                setAddingTarefa(false);
                queryClient.invalidateQueries({ queryKey: ["workpackage.getById", { id: workpackageId }] });
              }}
              onCancel={() => setAddingTarefa(false)}
            />
          </div>
        )}

        {workpackage.tarefas.map((tarefa: TarefaWithRelations) => (
          <div key={tarefa.id} className="space-y-1">
            <TarefaItem
              tarefa={{
                id: tarefa.id,
                nome: tarefa.nome,
                descricao: tarefa.descricao,
                inicio: tarefa.inicio ? new Date(tarefa.inicio) : new Date(),
                fim: tarefa.fim ? new Date(tarefa.fim) : new Date(),
                estado: tarefa.estado,
                entregaveis: tarefa.entregaveis,
                workpackageId: workpackageId
              }}
              workpackageId={workpackageId}
              handlers={{
                addEntregavel: (wpId: string, tarefaId: string, entregavel: any) => {
                  createEntregavelMutation.mutate({
                    tarefaId,
                    nome: entregavel.nome,
                    data: entregavel.data || undefined,
                  });
                },
                removeEntregavel: (wpId: string, tarefaId: string, entregavelId: string) => {
                  deleteEntregavelMutation.mutate(entregavelId);
                },
                removeTarefa: (wpId: string, tarefaId: string) => {
                  // Implementar lógica para remover tarefa
                },
                toggleEntregavelEstado: handleToggleEstado
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
