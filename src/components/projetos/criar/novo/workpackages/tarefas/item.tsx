import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, Trash, Plus, ChevronDown, ChevronUp, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TarefaWithRelations } from "../../../types";
import { EntregavelForm } from "../entregavel/form";
import { WorkpackageHandlers } from "@/app/projetos/criar/page";

interface TarefaItemProps {
  tarefa: TarefaWithRelations;
  workpackageId: string;
  handlers: Pick<WorkpackageHandlers, "addEntregavel" | "removeEntregavel" | "removeTarefa">;
}

export function TarefaItem({ 
  tarefa, 
  workpackageId, 
  handlers 
}: TarefaItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [addingEntregavel, setAddingEntregavel] = useState(false);

  return (
    <Card className="border-azul/10 hover:border-azul/20 transition-all overflow-hidden">
      {/* Cabeçalho da Tarefa */}
      <div 
        className="p-3 flex justify-between items-start cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-2">
          <div className="h-7 w-7 rounded-lg bg-azul/10 flex items-center justify-center mt-0.5">
            <Clock className="h-3.5 w-3.5 text-azul" />
          </div>
          <div>
            <h5 className="text-sm font-medium text-azul">{tarefa.nome}</h5>
            <p className="text-xs text-azul/70 mt-0.5">
              {tarefa.inicio && tarefa.fim && (
                <>
                  {format(new Date(tarefa.inicio), "dd MMM", { locale: ptBR })} - {" "}
                  {format(new Date(tarefa.fim), "dd MMM yyyy", { locale: ptBR })}
                </>
              )}
            </p>
            {tarefa.descricao && (
              <p className="text-xs text-azul/70 mt-1">{tarefa.descricao}</p>
            )}
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
          <div className="p-3 pl-12">
            {/* Cabeçalho dos Entregáveis */}
            <div className="flex items-center justify-between mb-2">
              <h6 className="text-xs font-medium text-azul/80">Entregáveis</h6>
              {!addingEntregavel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddingEntregavel(true)}
                  className="h-6 text-xs hover:bg-azul/10 text-azul rounded-lg"
                >
                  <Plus className="h-3 w-3 mr-1" />
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

            {/* Lista de Entregáveis */}
            <div className="space-y-2">
              {tarefa.entregaveis?.map(entregavel => (
                <div 
                  key={entregavel.id} 
                  className="flex items-center justify-between bg-white/70 rounded-lg p-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-md bg-azul/10 flex items-center justify-center">
                      <FileText className="h-3 w-3 text-azul" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-azul">{entregavel.nome}</p>
                      <p className="text-[10px] text-azul/70">
                        {entregavel.data && format(new Date(entregavel.data), "dd MMM yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`px-1.5 py-0 text-[10px] ${
                        entregavel.estado 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                          : "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {entregavel.estado ? "Entregue" : "Pendente"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlers.removeEntregavel(workpackageId, tarefa.id, entregavel.id)}
                      className="h-5 w-5 p-0 rounded-md hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

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