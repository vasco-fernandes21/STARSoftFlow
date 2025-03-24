import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, ChevronDown, ChevronUp, Trash, Circle, Check } from "lucide-react";
import { format } from "date-fns";
import { TarefaWithRelations } from "../../../../types";
import { EntregavelForm } from "../entregavel/form";
import { EntregavelItem } from "../entregavel/item";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMutations } from "@/hooks/useMutations";

interface TarefaItemProps {
  tarefa: TarefaWithRelations;
  workpackageId: string;
  onDelete?: (tarefaId: string) => void;
  onDeleteEntregavel?: (entregavelId: string) => void;
  onEstadoChange?: (tarefaId: string) => void;
}

export function TarefaItem({ 
  tarefa, 
  workpackageId,
  onDelete,
  onDeleteEntregavel,
  onEstadoChange
}: TarefaItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [addingEntregavel, setAddingEntregavel] = useState(false);
  
  // Usar mutations diretamente apenas se não tiver onEstadoChange
  const mutations = useMutations();

  // Handlers
  const handleToggleTarefaEstado = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Se tiver onEstadoChange, usar ele, senão usar mutation direta
    if (onEstadoChange) {
      onEstadoChange(tarefa.id);
    } else {
      mutations.tarefa.update.mutate({
        id: tarefa.id,
        data: {
          estado: !tarefa.estado
        }
      });
    }
  };

  const handleToggleEntregavelEstado = (entregavelId: string, novoEstado: boolean) => {
    // Apenas passar o ID - o backend vai cuidar do toggle
    mutations.entregavel.update.mutate({
      id: entregavelId,
      data: { estado: novoEstado }
    });
  };

  const handleAddEntregavel = (tarefaId: string, entregavel: any) => {
    mutations.entregavel.create.mutate({
      nome: entregavel.nome,
      tarefaId,
      descricao: entregavel.descricao || null,
      data: entregavel.data,
      anexo: null
    });
    
    setAddingEntregavel(false);
  };

  const handleRemoveEntregavel = (entregavelId: string) => {
    if (onDeleteEntregavel) {
      onDeleteEntregavel(entregavelId);
    } else {
      if (confirm("Tem a certeza que deseja remover este entregável?")) {
        mutations.entregavel.delete.mutate(entregavelId);
      }
    }
  };

  const handleRemoveTarefa = () => {
    if (onDelete) {
      onDelete(tarefa.id);
    } else {
      if (confirm("Tem a certeza que deseja remover esta tarefa?")) {
        mutations.tarefa.delete.mutate(tarefa.id);
      }
    }
  };

  const calcularProgresso = () => {
    if (!tarefa.entregaveis || tarefa.entregaveis.length === 0) return 0;
    
    const total = tarefa.entregaveis.length;
    const concluidos = tarefa.entregaveis.filter(e => e.estado).length;
    
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
                variant={tarefa.estado ? "default" : "secondary"} 
                className="px-1.5 py-0 text-[10px] h-4"
              >
                {tarefa.estado ? "Concluída" : "Pendente"}
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
              tarefa.estado 
                ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tarefa.estado ? (
              <Check className="h-3 w-3 mr-1" />
            ) : (
              <Circle className="h-3 w-3 mr-1" />
            )}
            {tarefa.estado ? "Concluído" : "Pendente"}
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
                      estado: entregavel.estado,
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