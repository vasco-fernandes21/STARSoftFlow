import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, ClipboardList, AlertTriangle } from "lucide-react";
import type { WorkpackageCompleto } from "@/components/projetos/types";
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
import type { Prisma } from "@prisma/client";

interface WorkpackageTarefasProps {
  workpackage: WorkpackageCompleto;
  _workpackageId: string;
  addingTarefa: boolean;
  setAddingTarefa: (adding: boolean) => void;
  projetoId?: string;
  canEdit?: boolean;
  // Handlers para tarefas
  onSubmitTarefa: (
    workpackageId: string,
    tarefa: Omit<Prisma.TarefaCreateInput, "workpackage">
  ) => void;
  onEditTarefa: (tarefaId: string, data: Prisma.TarefaUpdateInput) => Promise<void>;
  onToggleEstadoTarefa: (tarefaId: string) => Promise<void>;
  onDeleteTarefa: (tarefaId: string) => void;
  // Handlers para entregáveis
  onAddEntregavel: (
    tarefaId: string,
    entregavel: Omit<Prisma.EntregavelCreateInput, "tarefa">
  ) => Promise<void>;
  onEditEntregavel: (entregavelId: string, data: Prisma.EntregavelUpdateInput) => Promise<void>;
  onDeleteEntregavel: (entregavelId: string) => void;
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
            <AlertTriangle className="h-5 w-5 text-amber-500" />
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
  onSubmitTarefa,
  onEditTarefa,
  onToggleEstadoTarefa,
  onDeleteTarefa,
  onAddEntregavel,
  onEditEntregavel,
  onDeleteEntregavel,
  canEdit = true,
}: WorkpackageTarefasProps) {
  // Estados para os diálogos de confirmação
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: "tarefa" | "entregavel";
    id: string;
    tarefaId?: string;
  } | null>(null);

  // Diálogo de confirmação para eliminar
  const openDeleteDialog = (type: "tarefa" | "entregavel", id: string, tarefaId?: string) => {
    setItemToDelete({ type, id, tarefaId });
    setDeleteDialogOpen(true);
  };

  // Eliminar tarefa ou entregável
  const handleDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === "entregavel") {
      onDeleteEntregavel(itemToDelete.id);
    } else if (itemToDelete.type === "tarefa") {
      onDeleteTarefa(itemToDelete.id);
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
        title={`Apagar ${itemToDelete?.type === "tarefa" ? "Tarefa" : "Entregável"}`}
        description={`Tem a certeza que deseja apagar ${itemToDelete?.type === "tarefa" ? "esta tarefa" : "este entregável"}? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tarefas</h2>
          <p className="text-sm text-gray-500">Gerir tarefas do workpackage</p>
        </div>

        {!addingTarefa && canEdit && (
          <Button
            onClick={() => setAddingTarefa(true)}
            className="h-10 bg-azul text-white hover:bg-azul/90"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Nova Tarefa
          </Button>
        )}
      </div>

      {/* Formulário para adicionar nova tarefa */}
      {addingTarefa && canEdit && (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TarefaForm
            workpackageId={workpackage.id}
            workpackageInicio={workpackage.inicio || new Date()}
            workpackageFim={workpackage.fim || new Date()}
            onSubmit={onSubmitTarefa}
            onCancel={() => setAddingTarefa(false)}
          />
        </motion.div>
      )}

      {/* Lista de tarefas */}
      {workpackage.tarefas && workpackage.tarefas.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {sortTarefasPorData(workpackage.tarefas).map((tarefa) => (
              <Card
                key={tarefa.id}
                className="overflow-hidden border-gray-100 p-0 shadow-sm transition-shadow duration-200 hover:shadow"
              >
                <TarefaItem
                  tarefa={tarefa}
                  workpackageId={workpackage.id}
                  workpackageInicio={workpackage.inicio || new Date()}
                  workpackageFim={workpackage.fim || new Date()}
                  onUpdate={async () => await onToggleEstadoTarefa(tarefa.id)}
                  onRemove={() => openDeleteDialog("tarefa", tarefa.id)}
                  onEdit={(data) => onEditTarefa(tarefa.id, data)}
                  onAddEntregavel={onAddEntregavel}
                  onEditEntregavel={onEditEntregavel}
                  onRemoveEntregavel={(id) => openDeleteDialog("entregavel", id, tarefa.id)}
                  readOnly={!canEdit}
                />
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white py-16 text-center shadow-sm">
          <ClipboardList className="mx-auto mb-4 h-16 w-16 text-azul/20" />
          <h3 className="mb-2 text-lg font-medium text-azul">Nenhuma tarefa adicionada</h3>
          <p className="mx-auto mb-6 max-w-md text-sm text-gray-500">
            Adicione tarefas e entregáveis a este workpackage para acompanhar o progresso
          </p>

          {canEdit && (
            <Button
              onClick={() => setAddingTarefa(true)}
              className="bg-azul text-white hover:bg-azul/90"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Adicionar primeira tarefa
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
