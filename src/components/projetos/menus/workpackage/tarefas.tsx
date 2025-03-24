import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, CheckSquare, ClipboardList, XIcon, AlertTriangle } from "lucide-react";
import { WorkpackageCompleto } from "@/components/projetos/types";
import { useMutations } from "@/hooks/useMutations";
import { TarefaForm } from "@/components/projetos/criar/novo/workpackages/tarefas/form";
import { TarefaItem } from "@/components/projetos/criar/novo/workpackages/tarefas/item";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { api } from "@/trpc/react";
import { useQueryClient } from "@tanstack/react-query";
import { UseMutationResult } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WorkpackageTarefasProps {
  workpackage: WorkpackageCompleto;
  workpackageId: string;
  addingTarefa: boolean;
  setAddingTarefa: (adding: boolean) => void;
  mutations?: ReturnType<typeof useMutations>;
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
  workpackageId,
  addingTarefa,
  setAddingTarefa,
  mutations: externalMutations
}: WorkpackageTarefasProps) {
  const queryClient = useQueryClient();
  const [localTarefaEstados, setLocalTarefaEstados] = useState<Record<string, boolean>>({});

  // Usar mutations externas ou criar locais se não forem fornecidas
  const mutations = externalMutations || useMutations();
  
  // Estado para controlar edição/visualização de tarefas
  const [editingTarefaId, setEditingTarefaId] = useState<string | null>(null);
  
  // Estados para os diálogos de confirmação
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'tarefa' | 'entregavel';
    id: string;
    tarefaId?: string;
  } | null>(null);
  
  // Inicializar estados locais quando o workpackage mudar
  useEffect(() => {
    const estadosMap: Record<string, boolean> = {};
    workpackage.tarefas?.forEach(tarefa => {
      estadosMap[tarefa.id] = tarefa.estado;
    });
    setLocalTarefaEstados(estadosMap);
  }, [workpackage]);

  // Mutation para alternar estado da tarefa com optimistic updates
  const toggleTarefaMutation = api.tarefa.toggleEstado.useMutation({
    // Atualização otimista - modifica o cache antes da resposta do servidor
    onMutate: async (tarefaId) => {
      // Cancelar queries relacionadas para evitar sobrescrever nossa atualização otimista
      await queryClient.cancelQueries({ 
        queryKey: ["workpackage.findById", { id: workpackageId }] 
      });
      
      // Salvar o estado anterior
      const previousWorkpackage = queryClient.getQueryData(["workpackage.findById", { id: workpackageId }]);
      
      // Atualizar o cache diretamente com a nova tarefa
      queryClient.setQueryData(
        ["workpackage.findById", { id: workpackageId }],
        (old: any) => {
          if (!old) return old;
          
          const novoEstado = !localTarefaEstados[tarefaId];
          
          return {
            ...old,
            tarefas: old.tarefas?.map((t: any) => 
              t.id === tarefaId ? { ...t, estado: novoEstado } : t
            ),
            // Atualizamos também o estado do workpackage se todas as tarefas estiverem concluídas
            estado: old.tarefas?.every((t: any) => 
              t.id === tarefaId ? novoEstado : t.estado
            )
          };
        }
      );
      
      // Retornar o contexto para uso em onError
      return { previousWorkpackage };
    },
    
    onError: (err, tarefaId, context) => {
      // Reverter para o estado anterior em caso de erro
      queryClient.setQueryData(
        ["workpackage.findById", { id: workpackageId }],
        context?.previousWorkpackage
      );
      toast.error("Erro ao atualizar estado da tarefa");
    },
    
    onSettled: async () => {
      // Após conclusão (sucesso ou erro), revalidar os dados
      await queryClient.invalidateQueries({ 
        queryKey: ["workpackage.findById", { id: workpackageId }] 
      });
      await queryClient.invalidateQueries({ 
        queryKey: ["projeto.findById"] 
      });
    }
  });
  
  // Handlers para as operações com entregáveis e tarefas
  const addEntregavelHandler = (workpackageId: string, tarefaId: string, entregavel: any) => {
    mutations.entregavel.create.mutate({
      nome: entregavel.nome,
      tarefaId: tarefaId,
      descricao: null,
      data: entregavel.data,
      anexo: null
    });
  };
  
  const openDeleteDialog = (type: 'tarefa' | 'entregavel', id: string, tarefaId?: string) => {
    setItemToDelete({ type, id, tarefaId });
    setDeleteDialogOpen(true);
  };
  
  const handleDelete = () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'entregavel') {
      mutations.entregavel.delete.mutate(itemToDelete.id);
    } else if (itemToDelete.type === 'tarefa') {
      mutations.tarefa.delete.mutate(itemToDelete.id);
    }
    
    setItemToDelete(null);
  };
  
  const removeEntregavelHandler = (workpackageId: string, tarefaId: string, entregavelId: string) => {
    openDeleteDialog('entregavel', entregavelId, tarefaId);
  };
  
  const removeTarefaHandler = (workpackageId: string, tarefaId: string) => {
    openDeleteDialog('tarefa', tarefaId);
  };
  
  const toggleEntregavelEstadoHandler = async (entregavelId: string, estado: boolean) => {
    await mutations.entregavel.update.mutate({
      id: entregavelId,
      data: { 
        nome: undefined,
        descricao: undefined,
        data: undefined,
        anexo: undefined
      }
    });
  };
  
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

  // Handler para alternar estado com atualização local imediata
  const handleToggleEstado = (tarefaId: string, currentEstado: boolean) => {
    // Atualizar estado local imediatamente
    setLocalTarefaEstados(prev => ({
      ...prev,
      [tarefaId]: !currentEstado
    }));
    
    // Atualizar diretamente com objeto estruturado
    mutations.tarefa.update.mutate({
      id: tarefaId,
      data: {
        estado: !currentEstado,
        workpackageId: workpackageId // Incluir workpackageId necessário
      }
    });
  };
  
  useEffect(() => {
    // Quando o workpackage for atualizado, sincronizar os estados locais
    if (workpackage) {
      const estadosMap: Record<string, boolean> = {};
      workpackage.tarefas?.forEach(tarefa => {
        estadosMap[tarefa.id] = tarefa.estado;
      });
      setLocalTarefaEstados(estadosMap);
    }
  }, [workpackage]);

  // Função para ordenar tarefas apenas por data de início
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
        title={`Excluir ${itemToDelete?.type === 'tarefa' ? 'Tarefa' : 'Entregável'}`}
        description={`Tem certeza que deseja excluir ${itemToDelete?.type === 'tarefa' ? 'esta tarefa' : 'este entregável'}? Esta ação não pode ser desfeita.`}
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
            {sortTarefasPorData(workpackage.tarefas).map((tarefa, index) => (
              <Card key={tarefa.id} className="p-0 overflow-hidden border-gray-100 shadow-sm hover:shadow transition-shadow duration-200">
                <TarefaItem
                  tarefa={{
                    ...tarefa,
                    estado: localTarefaEstados[tarefa.id] ?? tarefa.estado
                  }}
                  workpackageId={workpackage.id}
                  mutations={mutations}
                  onStateChange={(tarefaId, newState) => {
                    setLocalTarefaEstados(prev => ({
                      ...prev,
                      [tarefaId]: newState
                    }));
                  }}
                  onDelete={(tarefaId) => {
                    openDeleteDialog('tarefa', tarefaId);
                  }}
                  onDeleteEntregavel={(entregavelId) => {
                    openDeleteDialog('entregavel', entregavelId, tarefa.id);
                  }}
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
