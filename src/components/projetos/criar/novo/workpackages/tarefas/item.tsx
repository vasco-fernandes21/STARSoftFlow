import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Trash, Check, Edit, Plus } from "lucide-react";
import { format } from "date-fns";
import type { TarefaWithRelations } from "../../../../types";
import { EntregavelForm } from "../entregavel/form";
import { EntregavelItem } from "../entregavel/item";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TarefaForm } from "./form";
import type { Prisma } from "@prisma/client";

interface TarefaItemProps {
  tarefa: TarefaWithRelations;
  workpackageId: string;
  workpackageInicio: Date;
  workpackageFim: Date;
  onUpdate: () => Promise<void>;
  onRemove: () => void;
  onEdit: (data: any) => Promise<void>;
  onAddEntregavel: (tarefaId: string, entregavel: Omit<Prisma.EntregavelCreateInput, "tarefa">) => Promise<void>;
  onEditEntregavel: (id: string, data: any) => Promise<void>;
  onRemoveEntregavel: (id: string) => void;
  hideState?: boolean;
}

export function TarefaItem({
  tarefa,
  workpackageId,
  workpackageInicio,
  workpackageFim,
  onUpdate,
  onRemove,
  onEdit,
  onAddEntregavel,
  onEditEntregavel,
  onRemoveEntregavel,
  hideState = false
}: TarefaItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [addingEntregavel, setAddingEntregavel] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    // Resetar estados ao fechar
    if (isExpanded) {
      setAddingEntregavel(false);
      setIsEditing(false);
    }
  };

  const handleToggleEstado = async () => {
    try {
      await onUpdate();
      
    } catch (error) {
      console.error("Erro ao atualizar estado:", error);
      toast.error("Erro ao atualizar estado");
    }
  };

  const handleEditSubmit = async (_workpackageId: string, tarefaData: any) => {
    try {
      await onEdit(tarefaData);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      toast.error("Erro ao atualizar tarefa");
    }
  };

  return (
    <Card className="border-azul/10 hover:border-azul/20 transition-all overflow-hidden">
      {/* Cabeçalho da Tarefa */}
      <div className="p-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {!hideState && (
            <button
              onClick={handleToggleEstado}
              className={cn(
                "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                tarefa.estado 
                  ? "bg-emerald-500 border-emerald-500/10 text-white" 
                  : "border-zinc-300 bg-white hover:bg-zinc-100"
              )}
            >
              {tarefa.estado && <Check className="h-3 w-3" />}
            </button>
          )}
          
          <div>
            <h5 className="text-sm font-medium text-azul">{tarefa.nome}</h5>
            <div className="flex items-center gap-1">
              {!hideState && (
                <Badge variant={tarefa.estado ? "default" : "outline"} className={cn(
                  "px-1 py-0 text-[10px] h-4",
                  tarefa.estado 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                    : "bg-blue-50 text-azul border-blue-200"
                )}>
                  {tarefa.estado ? "Concluída" : "Em Progresso"}
                </Badge>
              )}
              <span className="text-xs text-gray-500">
                {tarefa.inicio ? format(new Date(tarefa.inicio), "dd/MM/yyyy") : "-"} - {tarefa.fim ? format(new Date(tarefa.fim), "dd/MM/yyyy") : "-"}
              </span>
              {!hideState && tarefa.entregaveis?.length > 0 && (
                <Badge variant="secondary" className="px-1 py-0 text-[10px] h-4">
                  {tarefa.entregaveis.filter(e => e.estado).length}/{tarefa.entregaveis.length} entregáveis
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsExpanded(true);
              setIsEditing(true);
              setAddingEntregavel(false);
            }}
            className="h-6 w-6 p-0 rounded-md hover:bg-azul/10 text-azul"
          >
            <Edit className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0 rounded-md hover:bg-red-50 text-red-500"
          >
            <Trash className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleExpand}
            className="h-6 w-6 p-0 rounded-md hover:bg-gray-100"
          >
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Área Expansível */}
      {isExpanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {/* Formulário de Edição */}
          {isEditing ? (
            <div className="p-3">
              <TarefaForm
                workpackageId={workpackageId}
                workpackageInicio={workpackageInicio}
                workpackageFim={workpackageFim}
                onSubmit={handleEditSubmit}
                onCancel={() => setIsEditing(false)}
                initialData={tarefa}
              />
            </div>
          ) : (
            <>
              {/* Descrição */}
              {tarefa.descricao && (
                <div className="p-3">
                  <p className="text-sm text-gray-600">{tarefa.descricao}</p>
                </div>
              )}

              {/* Entregáveis */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-azul" />
                    <h6 className="text-sm font-medium text-azul">Entregáveis</h6>
                  </div>
                  {!addingEntregavel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddingEntregavel(true)}
                      className="h-6 px-2 rounded-md hover:bg-azul/10 text-azul text-xs"
                    >
                      Adicionar
                    </Button>
                  )}
                </div>

                {addingEntregavel ? (
                  <EntregavelForm
                    tarefaId={tarefa.id}
                    tarefaDates={{
                      inicio: tarefa.inicio ? new Date(tarefa.inicio) : new Date(),
                      fim: tarefa.fim ? new Date(tarefa.fim) : new Date()
                    }}
                    onCancel={() => setAddingEntregavel(false)}
                    onSubmit={async (tarefaId, entregavel) => {
                      await onAddEntregavel(tarefaId, entregavel);
                      setAddingEntregavel(false);
                    }}
                  />
                ) : (
                  <div className="space-y-2">
                    {tarefa.entregaveis?.map((entregavel) => (
                      <EntregavelItem
                        key={entregavel.id}
                        entregavel={{
                          ...entregavel,
                          tarefaId: tarefa.id,
                          data: entregavel.data ? new Date(entregavel.data) : null
                        }}
                        onEdit={async (data) => {
                          try {
                            await onEditEntregavel(entregavel.id, {
                              ...data,
                              id: entregavel.id
                            });
                            toast.success("Entregável atualizado com sucesso");
                          } catch (error) {
                            console.error("Erro ao atualizar entregável:", error);
                            toast.error("Erro ao atualizar entregável");
                          }
                        }}
                        onRemove={() => onRemoveEntregavel(entregavel.id)}
                        onToggleEstado={async (novoEstado) => {
                          try {
                            await onEditEntregavel(entregavel.id, {
                              ...entregavel,
                              estado: novoEstado
                            });
                            toast.success(
                              novoEstado 
                                ? "Entregável marcado como concluído" 
                                : "Entregável marcado como pendente"
                            );
                          } catch (error) {
                            console.error("Erro ao atualizar estado:", error);
                            toast.error("Erro ao atualizar estado do entregável");
                          }
                        }}
                        showTarefaInfo={false}
                        hideState={true}
                        tarefaDates={{
                          inicio: tarefa.inicio ? new Date(tarefa.inicio) : new Date(),
                          fim: tarefa.fim ? new Date(tarefa.fim) : new Date()
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}