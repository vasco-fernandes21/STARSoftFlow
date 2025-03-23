import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, ChevronDown, ChevronUp, Trash } from "lucide-react";
import { format } from "date-fns";
import { TarefaWithRelations } from "../../../../types";
import { EntregavelForm } from "../entregavel/form";
import { EntregavelItem } from "../entregavel/item";
import { WorkpackageHandlers } from "@/app/projetos/criar/page";
import { Progress } from "@/components/ui/progress";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface WorkpackageHandlers {
  addEntregavel: (workpackageId: string, tarefaId: string, entregavel: any) => void;
  removeEntregavel: (workpackageId: string, tarefaId: string, entregavelId: string) => void;
  removeTarefa: (workpackageId: string, tarefaId: string) => void;
  toggleEntregavelEstado: (entregavelId: string, estado: boolean) => Promise<void>;
}

interface TarefaItemProps {
  tarefa: TarefaWithRelations;
  workpackageId: string;
  handlers: Pick<WorkpackageHandlers, 
    "addEntregavel" | 
    "removeEntregavel" | 
    "removeTarefa" | 
    "toggleEntregavelEstado"
  >;
}

export function TarefaItem({ 
  tarefa, 
  workpackageId, 
  handlers
}: TarefaItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [addingEntregavel, setAddingEntregavel] = useState(false);
  const queryClient = useQueryClient();
  const [entregaveisEstado, setEntregaveisEstado] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const estadoMap: Record<string, boolean> = {};
    tarefa.entregaveis?.forEach(e => {
      estadoMap[e.id] = e.estado;
    });
    setEntregaveisEstado(estadoMap);
  }, [tarefa.entregaveis]);

  const toggleEntregavelMutation = api.entregavel.toggleEstado.useMutation({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workpackage.getById"] });
      await queryClient.invalidateQueries({ queryKey: ["tarefa.getById"] });
      toast.success("Estado atualizado com sucesso");
    }
  });

  const calcularProgresso = () => {
    if (!tarefa.entregaveis || tarefa.entregaveis.length === 0) return 0;
    
    const total = tarefa.entregaveis.length;
    const concluidos = tarefa.entregaveis.filter(e => entregaveisEstado[e.id]).length;
    
    return Math.round((concluidos / total) * 100);
  };

  const handleToggleEntregavelEstado = (entregavelId: string, novoEstado: boolean) => {
    setEntregaveisEstado(prev => ({
      ...prev,
      [entregavelId]: novoEstado
    }));
    
    handlers.toggleEntregavelEstado(entregavelId, novoEstado);
  };

  return (
    <Card className="border-azul/10 hover:border-azul/20 transition-all overflow-hidden">
      {/* Cabeçalho da Tarefa */}
      <div 
        className="p-3 flex justify-between items-center cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-azul/10 flex items-center justify-center">
            <CalendarClock className="h-3.5 w-3.5 text-azul" />
          </div>
          <div>
            <h5 className="text-sm font-medium text-azul">{tarefa.nome}</h5>
            <div className="flex items-center gap-2">
              <Badge variant={tarefa.estado ? "default" : "outline"} className="px-1 py-0 text-[10px] h-4">
                {tarefa.estado ? "Concluída" : "Pendente"}
              </Badge>
              <span className="text-xs text-gray-500">
                {tarefa.inicio ? format(new Date(tarefa.inicio), "dd/MM/yyyy") : "-"} - {tarefa.fim ? format(new Date(tarefa.fim), "dd/MM/yyyy") : "-"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handlers.removeTarefa(workpackageId, tarefa.id);
            }}
            className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 hover:text-red-500"
          >
            <Trash className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="h-7 w-7 p-0 rounded-lg hover:bg-azul/10"
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-azul/70" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-azul/70" />
            )}
          </Button>
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
                    handlers.addEntregavel(workpackageId, tarefaId, entregavel);
                    setAddingEntregavel(false);
                  }}
                  onCancel={() => setAddingEntregavel(false)}
                />
              )}

              {/* Lista de Entregáveis usando EntregavelItem */}
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
                    onEdit={() => {
                      // Lógica para editar entregável
                    }}
                    onRemove={() => handlers.removeEntregavel(workpackageId, tarefa.id, entregavel.id)}
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