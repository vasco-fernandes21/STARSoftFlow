import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, ClipboardList, XIcon, AlertTriangle } from "lucide-react";
import type { WorkpackageCompleto } from "@/components/projetos/types";
import { useMutations } from "@/hooks/useMutations";
import { TarefaForm } from "@/components/projetos/criar/novo/workpackages/tarefas/form";
import { TarefaItem } from "@/components/projetos/criar/novo/workpackages/tarefas/item";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Prisma } from "@prisma/client";

interface WorkpackageTarefasProps {
  workpackage: WorkpackageCompleto;
  _workpackageId: string;
  addingTarefa: boolean;
  setAddingTarefa: (adding: boolean) => void;
  projetoId?: string;
}

interface ConfirmDialogProps {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function ConfirmDialog({ title, description, open, onOpenChange, onConfirm }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WorkpackageTarefas({ 
  workpackage,
  _workpackageId,
  addingTarefa,
  setAddingTarefa,
  projetoId
}: WorkpackageTarefasProps) {
  // Usar mutations com o projetoId
  const mutations = useMutations(projetoId);
  
  // Estados para os diálogos de confirmação
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'tarefa' | 'entregavel';
    id: string;
    tarefaId?: string;
  } | null>(null);
  
  // --- Handlers para tarefas ---
  
  // Criar nova tarefa
  const handleSubmitTarefa = (workpackageId: string, tarefa: any) => {
    mutations.tarefa.create.mutate({
      nome: tarefa.nome,
      workpackageId: workpackageId,
      descricao: tarefa.descricao,
      inicio: tarefa.inicio,
      fim: tarefa.fim,
      estado: false
    });
    
    setAddingTarefa(false);
  };
  
  // Atualizar tarefa
  const handleEditTarefa = async (tarefaId: string, tarefaData: any) => {
    try {
      await mutations.tarefa.update.mutateAsync({
        id: tarefaId,
        data: tarefaData
      });
      toast.success("Tarefa atualizada com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      toast.error("Erro ao atualizar tarefa");
    }
  };
  
  // Alteração de estado da tarefa
  const handleEstadoChange = async (tarefaId: string) => {
    try {
      const tarefa = workpackage.tarefas?.find(t => t.id === tarefaId);
      if (!tarefa) return;

      await mutations.tarefa.update.mutateAsync({
        id: tarefaId,
        data: {
          estado: !tarefa.estado
        }
      });
      
    } catch (error) {
      console.error("Erro ao atualizar estado:", error);
      toast.error("Erro ao atualizar estado da tarefa");
    }
  };
  
  // --- Handlers para entregáveis ---
  
  // Adicionar entregável
  const handleAddEntregavel = async (tarefaId: string, entregavel: Omit<Prisma.EntregavelCreateInput, "tarefa">) => {
    try {
      await mutations.entregavel.create.mutateAsync({
        tarefaId,
        nome: entregavel.nome,
        descricao: entregavel.descricao || undefined,
        data: entregavel.data instanceof Date ? entregavel.data.toISOString() : entregavel.data
      });
      
      toast.success("Entregável adicionado com sucesso");
    } catch (error) {
      console.error("Erro ao adicionar entregável:", error);
      toast.error("Erro ao adicionar entregável");
    }
  };
  
  // Atualizar entregável
  const handleEditEntregavel = async (entregavelId: string, data: any) => {
    try {
      await mutations.entregavel.update.mutateAsync({
        id: entregavelId,
        data
      });
      
      toast.success("Entregável atualizado com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar entregável:", error);
      toast.error("Erro ao atualizar entregável");
    }
  };
  
  // Diálogo de confirmação para eliminar
  const openDeleteDialog = (type: 'tarefa' | 'entregavel', id: string, tarefaId?: string) => {
    setItemToDelete({ type, id, tarefaId });
    setDeleteDialogOpen(true);
  };
  
  // Eliminar tarefa ou entregável
  const handleDelete = () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'entregavel') {
      mutations.entregavel.delete.mutate(itemToDelete.id);
      toast.success("Entregável removido com sucesso");
    } else if (itemToDelete.type === 'tarefa') {
      mutations.tarefa.delete.mutate(itemToDelete.id);
      toast.success("Tarefa removida com sucesso");
    }
    
    setItemToDelete(null);
  };
  
  // Função para ordenar tarefas por data de início
  const sortTarefasPorData = (tarefas: any[] = []) => {
    return [...tarefas].sort((a, b) => {
      const dateA = a.inicio ? new Date(a.inicio) : new Date(0);
      const dateB = b.inicio ? new Date(b.inicio) : new Date(0);
      return dateA.getTime() - dateB.getTime();
    });
  };

  return (
    <div className="space-y-6">
      {/* Diálogo de confirmação de exclusão */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`Apagar ${itemToDelete?.type === 'tarefa' ? 'Tarefa' : 'Entregável'}`}
        description={`Tem a certeza que deseja apagar ${itemToDelete?.type === 'tarefa' ? 'esta tarefa' : 'este entregável'}? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tarefas</h2>
          <p className="text-sm text-gray-500">Gerir tarefas do workpackage</p>
        </div>
        
        {!addingTarefa && (
          <Button
            onClick={() => setAddingTarefa(true)}
            className="h-10 bg-azul hover:bg-azul/90 text-white"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        )}
      </div>
      
      {/* Formulário para adicionar nova tarefa */}
      {addingTarefa && (
        <motion.div 
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-azul">Nova Tarefa</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddingTarefa(false)}
              className="h-8 w-8 rounded-lg hover:bg-gray-100"
            >
              <XIcon className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
          <TarefaForm
            workpackageId={workpackage.id}
            workpackageInicio={workpackage.inicio || new Date()}
            workpackageFim={workpackage.fim || new Date()}
            onSubmit={handleSubmitTarefa}
            onCancel={() => setAddingTarefa(false)}
          />
        </motion.div>
      )}
      
      {/* Lista de tarefas */}
      {workpackage.tarefas && workpackage.tarefas.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {sortTarefasPorData(workpackage.tarefas).map((tarefa) => (
              <Card key={tarefa.id} className="p-0 overflow-hidden border-gray-100 shadow-sm hover:shadow transition-shadow duration-200">
                <TarefaItem
                  tarefa={tarefa}
                  workpackageId={workpackage.id}
                  workpackageInicio={workpackage.inicio || new Date()}
                  workpackageFim={workpackage.fim || new Date()}
                  onUpdate={async () => await handleEstadoChange(tarefa.id)}
                  onRemove={() => openDeleteDialog('tarefa', tarefa.id)}
                  onEdit={(data) => handleEditTarefa(tarefa.id, data)}
                  onAddEntregavel={handleAddEntregavel}
                  onEditEntregavel={(id, data) => handleEditEntregavel(id, data)}
                  onRemoveEntregavel={(id) => openDeleteDialog('entregavel', id, tarefa.id)}
                />
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <ClipboardList className="h-16 w-16 text-azul/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-azul mb-2">Nenhuma tarefa adicionada</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Adicione tarefas e entregáveis a este workpackage para acompanhar o progresso
          </p>
          
          <Button
            onClick={() => setAddingTarefa(true)}
            className="bg-azul hover:bg-azul/90 text-white"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Adicionar primeira tarefa
          </Button>
        </div>
      )}
    </div>
  );
}
