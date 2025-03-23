import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Clock, Package, FileText } from "lucide-react";
import { WorkpackageWithRelations } from "../../../../types";
import { TarefaForm } from "../tarefas/form";
import { Form } from "../material/form";
import { TarefaItem } from "../tarefas/item";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { WorkpackageHandlers } from "@/app/projetos/criar/page";

interface WorkpackageDetailsProps {
  workpackage: WorkpackageWithRelations;
  handlers: WorkpackageHandlers;
}

export function WorkpackageDetails({ 
  workpackage, 
  handlers 
}: WorkpackageDetailsProps) {
  const [addingTarefa, setAddingTarefa] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);

  return (
    <div className="mt-2 rounded-xl bg-white/70 backdrop-blur-sm border border-azul/10 shadow-sm">
      <div className="p-4 space-y-6">
        {/* Descrição */}
        {workpackage.descricao && (
          <div className="glass-section">
            <h4 className="text-sm font-medium text-azul flex items-center gap-2 mb-2">
              <div className="h-6 w-6 rounded-md bg-azul/10 flex items-center justify-center">
                <FileText className="h-3.5 w-3.5 text-azul/70" />
              </div>
              Descrição
            </h4>
            <p className="text-sm text-azul/80 pl-8">{workpackage.descricao}</p>
          </div>
        )}

        {/* Tarefas */}
        <div className="glass-section">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-azul flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-azul/10 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-azul/70" />
              </div>
              Tarefas
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingTarefa(true)}
              className="h-7 text-xs bg-white/80 border-azul/20 hover:bg-azul/10 text-azul rounded-lg transition-colors"
            >
              <Plus className="h-3 w-3 mr-1" />
              Adicionar Tarefa
            </Button>
          </div>

          {addingTarefa && (
            <div className="mb-3">
              <TarefaForm
                workpackageId={workpackage.id}
                workpackageInicio={workpackage.inicio || new Date()}
                workpackageFim={workpackage.fim || new Date()}
                onSubmit={(workpackageId, tarefa) => {
                  handlers.addTarefa(workpackageId, tarefa);
                  setAddingTarefa(false);
                  toast.success("Tarefa adicionada com sucesso!");
                }}
                onCancel={() => setAddingTarefa(false)}
              />
            </div>
          )}

          {workpackage.tarefas && workpackage.tarefas.length > 0 ? (
            <div className="space-y-2 pl-8">
              {workpackage.tarefas.map((tarefa) => (
                <TarefaItem
                  key={tarefa.id}
                  tarefa={tarefa}
                  workpackageId={workpackage.id}
                />
              ))}
            </div>
          ) : (
            <div className="pl-8">
              <Card className="p-3 border-dashed border-azul/10 bg-azul/5 text-center">
                <p className="text-xs text-azul/70">Nenhuma tarefa adicionada</p>
              </Card>
            </div>
          )}
        </div>

        {/* Materiais */}
        <div className="glass-section">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-azul flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-azul/10 flex items-center justify-center">
                <Package className="h-3.5 w-3.5 text-azul/70" />
              </div>
              Materiais
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingMaterial(true)}
              className="h-7 text-xs bg-white/80 border-azul/20 hover:bg-azul/10 text-azul rounded-lg transition-colors"
            >
              <Plus className="h-3 w-3 mr-1" />
              Adicionar Material
            </Button>
          </div>

          {addingMaterial && (
            <div className="mb-3">
              <Form
                workpackageId={workpackage.id}
                onSubmit={(workpackageId, material) => {
                  handlers.addMaterial(workpackageId, material);
                  setAddingMaterial(false);
                  toast.success("Material adicionado com sucesso!");
                }}
                onCancel={() => setAddingMaterial(false)}
              />
            </div>
          )}

          {workpackage.materiais && workpackage.materiais.length > 0 ? (
            <div className="space-y-2 pl-8">
              {workpackage.materiais.map((material) => (
                <Card 
                  key={material.id} 
                  className="p-3 border-azul/10 hover:border-azul/20 transition-all bg-white/70 backdrop-blur-sm"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-azul/10 flex items-center justify-center">
                        <Package className="h-3.5 w-3.5 text-azul/70" />
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-azul">{material.nome}</h5>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-azul/70">
                            {material.quantidade} unid. × {Number(material.preco).toLocaleString('pt-PT', {
                              style: 'currency',
                              currency: 'EUR'
                            })}
                          </p>
                          <span className="text-xs text-azul/70">•</span>
                          <p className="text-xs text-azul/70">
                            Total: {(material.quantidade * Number(material.preco)).toLocaleString('pt-PT', {
                              style: 'currency',
                              currency: 'EUR'
                            })}
                          </p>
                        </div>
                        <p className="text-xs text-azul/60 mt-1">
                          Ano de utilização: {material.ano_utilizacao}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlers.removeMaterial(workpackage.id, Number(material.id))}
                      className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5 rotate-45" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="pl-8">
              <Card className="p-3 border-dashed border-azul/10 bg-azul/5 text-center">
                <p className="text-xs text-azul/70">Nenhum material adicionado</p>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
