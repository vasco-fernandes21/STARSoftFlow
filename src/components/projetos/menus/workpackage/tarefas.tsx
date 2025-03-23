import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, CheckSquare, ClipboardList, XIcon } from "lucide-react";
import { WorkpackageCompleto } from "@/components/projetos/types";
import { useWorkpackageMutations } from "@/hooks/useWorkpackageMutations";
import { TarefaForm } from "@/components/projetos/criar/novo/workpackages/tarefas/form";
import { TarefaItem } from "@/components/projetos/criar/novo/workpackages/tarefas/item";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

interface WorkpackageTarefasProps {
  workpackage: WorkpackageCompleto;
  workpackageId: string;
  addingTarefa: boolean;
  setAddingTarefa: (adding: boolean) => void;
}

export function WorkpackageTarefas({ 
  workpackage,
  workpackageId,
  addingTarefa,
  setAddingTarefa
}: WorkpackageTarefasProps) {
  // Hooks para mutações
  const { 
    createEntregavelMutation, 
    deleteEntregavelMutation,
    toggleEntregavelEstado
  } = useWorkpackageMutations();
  
  // Estado para controlar edição/visualização de tarefas
  const [editingTarefaId, setEditingTarefaId] = useState<string | null>(null);
  
  // Handlers para as operações com entregáveis e tarefas
  const addEntregavelHandler = (workpackageId: string, tarefaId: string, entregavel: any) => {
    createEntregavelMutation.mutate({
      nome: entregavel.nome,
      tarefaId: tarefaId,
      descricao: null,
      data: entregavel.data,
      anexo: null
    });
  };
  
  const removeEntregavelHandler = (workpackageId: string, tarefaId: string, entregavelId: string) => {
    if (confirm("Tem certeza que deseja remover este entregável?")) {
      deleteEntregavelMutation.mutate(entregavelId);
    }
  };
  
  const removeTarefaHandler = (workpackageId: string, tarefaId: string) => {
    if (confirm("Tem certeza que deseja remover esta tarefa?")) {
      deleteEntregavelMutation.mutate(tarefaId);
    }
  };
  
  const toggleEntregavelEstadoHandler = async (entregavelId: string, estado: boolean) => {
    await toggleEntregavelEstado.mutate({
      id: entregavelId,
      estado: estado
    });
  };
  
  const handleSubmitTarefa = (workpackageId: string, tarefa: any) => {
    createEntregavelMutation.mutate({
      nome: tarefa.nome,
      tarefaId: workpackageId,
      descricao: tarefa.descricao,
      data: null,
      anexo: null
    });
    
    setAddingTarefa(false);
  };

  // Calcular estatísticas das tarefas
  const calcularEstatisticas = () => {
    if (!workpackage.tarefas || workpackage.tarefas.length === 0) {
      return { total: 0, concluidas: 0, porcentagem: 0 };
    }

    let totalEntregaveis = 0;
    let entregaveisConcluidos = 0;

    workpackage.tarefas.forEach(tarefa => {
      if (tarefa.entregaveis && tarefa.entregaveis.length > 0) {
        totalEntregaveis += tarefa.entregaveis.length;
        entregaveisConcluidos += tarefa.entregaveis.filter(e => e.estado).length;
      }
    });

    const porcentagem = totalEntregaveis === 0 ? 0 : 
      Math.round((entregaveisConcluidos / totalEntregaveis) * 100);

    return {
      total: totalEntregaveis,
      concluidas: entregaveisConcluidos,
      porcentagem
    };
  };

  const estatisticas = calcularEstatisticas();
  const totalTarefas = workpackage.tarefas?.length || 0;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-azul">Tarefas</h2>
        
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

      {/* Resumo das tarefas */}
      {workpackage.tarefas && workpackage.tarefas.length > 0 && (
        <motion.div 
          className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-azul/10 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="h-5 w-5 text-azul" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total de tarefas</p>
                <p className="text-xl font-semibold text-azul">{totalTarefas}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                <CheckSquare className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Entregáveis concluídos</p>
                <p className="text-xl font-semibold text-azul">{estatisticas.concluidas}/{estatisticas.total}</p>
              </div>
            </div>
            
            <div className="flex flex-col justify-center">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500">Progresso</p>
                <span className="text-sm font-medium text-azul">{estatisticas.porcentagem}%</span>
              </div>
              <div className="w-full bg-azul/10 rounded-full h-3">
                <div 
                  className="bg-azul h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${estatisticas.porcentagem}%` }}
                ></div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
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
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-lg font-medium text-azul">Lista de Tarefas</h3>
          <div className="grid grid-cols-1 gap-4">
            {workpackage.tarefas.map((tarefa, index) => (
              <motion.div 
                key={tarefa.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
              >
                <Card className="p-0 overflow-hidden border-gray-100 shadow-sm hover:shadow transition-shadow duration-200">
                  <TarefaItem
                    tarefa={tarefa}
                    workpackageId={workpackage.id}
                    handlers={{
                      addEntregavel: addEntregavelHandler,
                      removeEntregavel: removeEntregavelHandler,
                      removeTarefa: removeTarefaHandler,
                      toggleEntregavelEstado: toggleEntregavelEstadoHandler
                    }}
                  />
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div 
          className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
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
        </motion.div>
      )}
    </div>
  );
}
