import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, ChevronDown, ChevronUp, Trash, Circle, Check } from "lucide-react";
import { format } from "date-fns";
import { TarefaWithRelations } from "../../../../types";
import { EntregavelForm } from "../entregavel/form";
import { EntregavelItem } from "../entregavel/item";
import { Progress } from "@/components/ui/progress";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface TarefaItemProps {
  tarefa: TarefaWithRelations;
  workpackageId: string;
}

export function TarefaItem({ 
  tarefa, 
  workpackageId
}: TarefaItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [addingEntregavel, setAddingEntregavel] = useState(false);
  const queryClient = useQueryClient();
  
  // Estados locais
  const [localTarefaEstado, setLocalTarefaEstado] = useState(tarefa.estado);
  const [entregaveisEstado, setEntregaveisEstado] = useState<Record<string, boolean>>({});

  // Sincronizar estados quando a tarefa mudar
  useEffect(() => {
    setLocalTarefaEstado(tarefa.estado);
    
    const estadoMap: Record<string, boolean> = {};
    tarefa.entregaveis?.forEach(e => {
      estadoMap[e.id] = e.estado;
    });
    setEntregaveisEstado(estadoMap);
  }, [tarefa]);

  // Mutations
  const toggleTarefaMutation = api.tarefa.toggleEstado.useMutation({
    onMutate: async (tarefaId) => {
      // Atualização otimista
      const novoEstado = !localTarefaEstado;
      setLocalTarefaEstado(novoEstado);
      
      // Cancelar queries relacionadas - formato correto
      await queryClient.cancelQueries({ 
        queryKey: ["workpackage.findById", { id: workpackageId }] 
      });
      
      // Backup do estado anterior - formato correto
      const previousData = queryClient.getQueryData(
        ["workpackage.findById", { id: workpackageId }]
      );
      
      // Atualizar o cache
      queryClient.setQueryData(
        ["workpackage.findById", { id: workpackageId }],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            tarefas: old.tarefas?.map((t: any) => 
              t.id === tarefaId ? { ...t, estado: novoEstado } : t
            )
          };
        }
      );
      
      return { previousData };
    },
    onError: (err, tarefaId, context) => {
      // Reverter a mudança local em caso de erro
      setLocalTarefaEstado(!localTarefaEstado);
      
      // Reverter o cache
      if (context?.previousData) {
        queryClient.setQueryData(
          ["workpackage.findById", { id: workpackageId }],
          context.previousData
        );
      }
      
      toast.error("Erro ao atualizar estado da tarefa");
    },
    onSettled: () => {
      // Revalidar queries após a conclusão - formato correto
      queryClient.invalidateQueries({ 
        queryKey: ["workpackage.findById", { id: workpackageId }] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["projeto.findById"] 
      });
    }
  });

  const toggleEntregavelMutation = api.entregavel.toggleEstado.useMutation({
    onMutate: async (data) => {
      const { id: entregavelId, estado: novoEstado } = data;
      
      // Atualização otimista local
      setEntregaveisEstado(prev => ({
        ...prev,
        [entregavelId]: novoEstado
      }));
      
      // Cancelar queries relacionadas - formato correto
      await queryClient.cancelQueries({ 
        queryKey: ["workpackage.findById", { id: workpackageId }] 
      });
      
      // Backup do estado anterior
      const previousData = queryClient.getQueryData(
        ["workpackage.findById", { id: workpackageId }]
      );
      
      return { previousData, entregavelId, estadoAnterior: !novoEstado };
    },
    onError: (err, data, context) => {
      if (context) {
        // Reverter a mudança local
        setEntregaveisEstado(prev => ({
          ...prev,
          [context.entregavelId]: context.estadoAnterior
        }));
        
        // Reverter o cache
        if (context.previousData) {
          queryClient.setQueryData(
            ["workpackage.findById", { id: workpackageId }],
            context.previousData
          );
        }
      }
      
      toast.error("Erro ao atualizar estado do entregável");
    },
    onSettled: () => {
      // Formato correto
      queryClient.invalidateQueries({ 
        queryKey: ["workpackage.findById", { id: workpackageId }] 
      });
    }
  });

  const createEntregavelMutation = api.entregavel.create.useMutation({
    onSuccess: () => {
      // Formato correto
      queryClient.invalidateQueries({ 
        queryKey: ["workpackage.findById", { id: workpackageId }] 
      });
      toast.success("Entregável adicionado com sucesso");
      setAddingEntregavel(false);
    },
    onError: () => {
      toast.error("Erro ao adicionar entregável");
    }
  });

  const deleteEntregavelMutation = api.entregavel.delete.useMutation({
    onSuccess: () => {
      // Formato correto
      queryClient.invalidateQueries({ 
        queryKey: ["workpackage.findById", { id: workpackageId }] 
      });
      toast.success("Entregável removido com sucesso");
    },
    onError: () => {
      toast.error("Erro ao remover entregável");
    }
  });

  const deleteTarefaMutation = api.tarefa.delete.useMutation({
    onSuccess: () => {
      // Formato correto
      queryClient.invalidateQueries({ 
        queryKey: ["workpackage.findById", { id: workpackageId }] 
      });
      toast.success("Tarefa removida com sucesso");
    },
    onError: () => {
      toast.error("Erro ao remover tarefa");
    }
  });

  // Handlers
  const handleToggleTarefaEstado = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleTarefaMutation.mutateAsync(tarefa.id);
  };

  const handleToggleEntregavelEstado = (entregavelId: string, novoEstado: boolean) => {
    toggleEntregavelMutation.mutate({ 
      id: entregavelId, 
      estado: novoEstado 
    });
  };

  const handleAddEntregavel = (tarefaId: string, entregavel: any) => {
    createEntregavelMutation.mutate({
      nome: entregavel.nome,
      tarefaId,
      descricao: entregavel.descricao || null,
      data: entregavel.data,
      anexo: null
    });
  };

  const handleRemoveEntregavel = (entregavelId: string) => {
    if (confirm("Tem certeza que deseja remover este entregável?")) {
      deleteEntregavelMutation.mutate(entregavelId);
    }
  };

  const handleRemoveTarefa = () => {
    if (confirm("Tem certeza que deseja remover esta tarefa?")) {
      deleteTarefaMutation.mutate(tarefa.id);
    }
  };

  const calcularProgresso = () => {
    if (!tarefa.entregaveis || tarefa.entregaveis.length === 0) return 0;
    
    const total = tarefa.entregaveis.length;
    const concluidos = tarefa.entregaveis.filter(e => 
      entregaveisEstado[e.id] !== undefined ? entregaveisEstado[e.id] : e.estado
    ).length;
    
    return Math.round((concluidos / total) * 100);
  };

  return (
    <Card className="border-azul/10 hover:border-azul/20 transition-all overflow-hidden">
      {/* Cabeçalho da Tarefa */}
      <div 
        className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-md bg-azul/10 flex items-center justify-center">
            <CalendarClock className="h-3 w-3 text-azul" />
          </div>
          <div>
            <h5 className="text-sm font-medium text-azul">{tarefa.nome}</h5>
            <div className="flex items-center gap-2">
              <Badge 
                variant={localTarefaEstado ? "default" : "secondary"} 
                className="px-1.5 py-0 text-[10px] h-4"
              >
                {localTarefaEstado ? "Concluída" : "Pendente"}
              </Badge>
              <span className="text-xs text-gray-500">
                {tarefa.inicio ? format(new Date(tarefa.inicio), "dd/MM/yyyy") : "-"} - {tarefa.fim ? format(new Date(tarefa.fim), "dd/MM/yyyy") : "-"}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation(); // Impedir que o clique se propague para o container
              handleToggleTarefaEstado(e);
            }}
            className={`h-6 px-2 rounded-md ${
              localTarefaEstado 
                ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {localTarefaEstado ? (
              <Check className="h-3 w-3 mr-1" />
            ) : (
              <Circle className="h-3 w-3 mr-1" />
            )}
            {localTarefaEstado ? "Concluído" : "Pendente"}
          </Button>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation(); // Impedir que o clique se propague para o container
                handleRemoveTarefa();
              }}
              className="h-6 w-6 p-0 rounded-md hover:bg-red-50 text-red-500"
            >
              <Trash className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation(); // Impedir que o clique se propague para o container
                setExpanded(!expanded);
              }}
              className="h-6 w-6 p-0 rounded-md hover:bg-azul/10 text-azul"
            >
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Seção de Entregáveis */}
      {expanded && (
        <div className="border-t border-azul/10 bg-azul/5">
          <div className="p-3">
            {tarefa.descricao && (
              <div className="mb-3 text-sm text-gray-600">
                {tarefa.descricao}
              </div>
            )}
            
            <div className="mb-4">
              <div className="flex justify-between mb-1 text-xs text-azul/80">
                <span>Progresso</span>
                <span>{calcularProgresso()}%</span>
              </div>
              <Progress value={calcularProgresso()} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h6 className="text-sm font-medium text-azul/80">Entregáveis</h6>
                {!addingEntregavel && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingEntregavel(true)}
                    className="h-7 text-xs border-azul/20 text-azul hover:bg-azul/10"
                  >
                    Adicionar
                  </Button>
                )}
              </div>

              {/* Formulário de Novo Entregável */}
              {addingEntregavel && (
                <EntregavelForm
                  tarefaId={tarefa.id}
                  tarefaDates={{
                    inicio: tarefa.inicio || new Date(),
                    fim: tarefa.fim || new Date()
                  }}
                  onSubmit={(tarefaId, entregavel) => {
                    handleAddEntregavel(tarefaId, entregavel);
                  }}
                  onCancel={() => setAddingEntregavel(false)}
                />
              )}

              {/* Lista de Entregáveis */}
              <div className="space-y-2">
                {tarefa.entregaveis?.map(entregavel => (
                  <EntregavelItem
                    key={entregavel.id}
                    entregavel={{
                      id: entregavel.id,
                      nome: entregavel.nome,
                      data: entregavel.data ? new Date(entregavel.data) : null,
                      estado: entregaveisEstado[entregavel.id] ?? entregavel.estado,
                      tarefaId: tarefa.id,
                      descricao: entregavel.descricao
                    }}
                    onToggleEstado={(novoEstado) => handleToggleEntregavelEstado(entregavel.id, novoEstado)}
                    onEdit={() => {}}
                    onRemove={() => handleRemoveEntregavel(entregavel.id)}
                  />
                ))}
              </div>

              {(!tarefa.entregaveis || tarefa.entregaveis.length === 0) && !addingEntregavel && (
                <div className="text-center py-3 text-xs text-azul/60">
                  Nenhum entregável adicionado
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}