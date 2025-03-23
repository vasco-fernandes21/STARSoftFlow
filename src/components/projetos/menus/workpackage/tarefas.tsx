import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, CheckSquare, ClipboardList, XIcon } from "lucide-react";
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

interface WorkpackageTarefasProps {
  workpackage: WorkpackageCompleto;
  workpackageId: string;
  addingTarefa: boolean;
  setAddingTarefa: (adding: boolean) => void;
  mutations?: ReturnType<typeof useMutations>;
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
  
  const removeEntregavelHandler = (workpackageId: string, tarefaId: string, entregavelId: string) => {
    if (confirm("Tem certeza que deseja remover este entregável?")) {
      mutations.entregavel.delete.mutate(entregavelId);
    }
  };
  
  const removeTarefaHandler = (workpackageId: string, tarefaId: string) => {
    if (confirm("Tem certeza que deseja remover esta tarefa?")) {
      mutations.entregavel.delete.mutate(tarefaId);
    }
  };
  
  const toggleEntregavelEstadoHandler = async (entregavelId: string, estado: boolean) => {
    await mutations.entregavel.toggleEstado.mutate({
      id: entregavelId,
      estado: estado
    });
  };
  
  const handleSubmitTarefa = (workpackageId: string, tarefa: any) => {
    mutations.entregavel.create.mutate({
      nome: tarefa.nome,
      tarefaId: workpackageId,
      descricao: tarefa.descricao,
      data: null,
      anexo: null
    });
    
    setAddingTarefa(false);
  };

  // Handler para alternar estado com atualização local imediata
  const handleToggleTarefaEstado = async (tarefaId: string, estado: boolean) => {
    try {
      // Atualizar o estado local imediatamente
      setLocalTarefaEstados(prev => ({
        ...prev,
        [tarefaId]: !prev[tarefaId]
      }));
      
      // Chamar a mutation (a mutation já chama onUpdate via invalidateQueries)
      await mutations.tarefa.toggleEstado.mutateAsync(tarefaId);
    } catch (error) {
      // O onError da mutation já trata o caso de erro
      console.error(error);
    }
  };
  
  return (
    <div className="space-y-6">
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
            {workpackage.tarefas.map((tarefa, index) => (
              <Card key={tarefa.id} className="p-0 overflow-hidden border-gray-100 shadow-sm hover:shadow transition-shadow duration-200">
                <TarefaItem
                  tarefa={{
                    ...tarefa,
                    // Substituir o estado da tarefa pelo nosso estado local quando disponível
                    estado: localTarefaEstados[tarefa.id] ?? tarefa.estado
                  }}
                  workpackageId={workpackage.id}
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
