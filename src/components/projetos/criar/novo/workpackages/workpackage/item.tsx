import { useState } from "react";
import { ListTodo, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { WorkpackageWithRelations } from "@/components/projetos/types";
import { TarefaForm } from "../tarefas/form";
import { Form as MaterialForm } from "../material/form";
import { TarefaItem } from "../tarefas/item";
import { Item as MaterialItem } from "../material/item";
import type { Prisma } from "@prisma/client";

type TarefaCreateInput = Prisma.TarefaCreateInput;
type MaterialCreateInput = Prisma.MaterialCreateInput;
type EntregavelCreateInput = Prisma.EntregavelCreateInput;

interface WorkpackageItemProps {
  workpackage: WorkpackageWithRelations;
  onEdit: (workpackage: WorkpackageWithRelations) => void;
  _onDelete: () => void;
  handlers: {
    addTarefa: (
      workpackageId: string,
      tarefa: Omit<TarefaCreateInput, "workpackage">
    ) => Promise<void>;
    updateTarefa: (
      workpackageId: string,
      tarefaId: string,
      data: Partial<TarefaCreateInput>
    ) => Promise<void>;
    removeTarefa: (workpackageId: string, tarefaId: string) => Promise<void>;
    addMaterial: (
      workpackageId: string,
      material: Omit<MaterialCreateInput, "workpackage">
    ) => Promise<void>;
    updateMaterial: (
      workpackageId: string,
      materialId: number,
      data: Partial<MaterialCreateInput>
    ) => Promise<void>;
    removeMaterial: (workpackageId: string, materialId: number) => Promise<void>;
    addEntregavel: (
      tarefaId: string,
      entregavel: Omit<EntregavelCreateInput, "tarefa">
    ) => Promise<void>;
    updateEntregavel: (id: string, data: Partial<EntregavelCreateInput>) => Promise<void>;
    removeEntregavel: (id: string) => Promise<void>;
  };
  projetoInicio: Date;
  projetoFim: Date;
}

export function WorkpackageItem({
  workpackage,
  onEdit,
  _onDelete,
  handlers,
  projetoInicio,
  projetoFim,
}: WorkpackageItemProps) {
  // Estados locais
  const [addingTarefa, setAddingTarefa] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);

  // Contadores
  const tarefasCount = workpackage.tarefas?.length || 0;
  const materiaisCount = workpackage.materiais?.length || 0;

  return (
    <div className="space-y-6">
      {/* Seção de Tarefas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-azul" />
            <h3 className="text-sm font-medium text-azul">Tarefas</h3>
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-600">
              {tarefasCount}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddingTarefa(!addingTarefa)}
            className="h-8 border-azul/20 text-azul hover:bg-azul/5"
          >
            {addingTarefa ? (
              <>Cancelar</>
            ) : (
              <>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Adicionar Tarefa
              </>
            )}
          </Button>
        </div>

        {/* Formulário de Adição de Tarefa */}
        {addingTarefa && (
          <Card className="border-azul/10 p-4">
            <TarefaForm
              workpackageId={workpackage.id}
              workpackageInicio={new Date(workpackage.inicio || projetoInicio)}
              workpackageFim={new Date(workpackage.fim || projetoFim)}
              onSubmit={async (workpackageId, tarefa) => {
                await handlers.addTarefa(workpackageId, tarefa);
                setAddingTarefa(false);
              }}
              onCancel={() => setAddingTarefa(false)}
            />
          </Card>
        )}

        {/* Lista de Tarefas */}
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {workpackage.tarefas?.map((tarefa) => (
              <TarefaItem
                key={tarefa.id}
                tarefa={tarefa}
                workpackageId={workpackage.id}
                workpackageInicio={new Date(workpackage.inicio || projetoInicio)}
                workpackageFim={new Date(workpackage.fim || projetoFim)}
                onUpdate={async () => {
                  // Refresh workpackage data after update
                  onEdit(workpackage);
                }}
                onRemove={async () => {
                  await handlers.removeTarefa(workpackage.id, tarefa.id);
                }}
                onEdit={async (data) => {
                  await handlers.updateTarefa(workpackage.id, tarefa.id, data);
                }}
                onAddEntregavel={async (tarefaId, entregavel) => {
                  await handlers.addEntregavel(tarefaId, entregavel);
                }}
                onEditEntregavel={async (id, data) => {
                  await handlers.updateEntregavel(id, data);
                }}
                onRemoveEntregavel={async (id) => {
                  await handlers.removeEntregavel(id);
                }}
              />
            ))}
            {!workpackage.tarefas?.length && !addingTarefa && (
              <div className="rounded-lg border border-azul/10 bg-slate-50/50 py-8 text-center">
                <ListTodo className="mx-auto mb-2 h-8 w-8 text-azul/30" />
                <p className="text-sm text-azul/60">Nenhuma tarefa adicionada</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator className="my-6 bg-azul/10" />

      {/* Seção de Materiais */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-azul" />
            <h3 className="text-sm font-medium text-azul">Materiais</h3>
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-600">
              {materiaisCount}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddingMaterial(!addingMaterial)}
            className="h-8 border-azul/20 text-azul hover:bg-azul/5"
          >
            {addingMaterial ? (
              <>Cancelar</>
            ) : (
              <>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Adicionar Material
              </>
            )}
          </Button>
        </div>

        {/* Formulário de Adição de Material */}
        {addingMaterial && (
          <Card className="border-azul/10 p-4">
            <MaterialForm
              workpackageId={workpackage.id}
              onSubmit={async (workpackageId, material) => {
                await handlers.addMaterial(workpackageId, material);
                setAddingMaterial(false);
              }}
              onCancel={() => setAddingMaterial(false)}
            />
          </Card>
        )}

        {/* Lista de Materiais */}
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {workpackage.materiais?.map((material) => (
              <MaterialItem
                key={material.id}
                material={{
                  ...material,
                  preco: Number(material.preco),
                  workpackageId: material.workpackageId || workpackage.id,
                }}
                onEdit={async (workpackageId, data) => {
                  await handlers.updateMaterial(workpackageId, material.id, data);
                }}
                onRemove={async () => {
                  await handlers.removeMaterial(workpackage.id, material.id);
                }}
              />
            ))}
            {!workpackage.materiais?.length && !addingMaterial && (
              <div className="rounded-lg border border-azul/10 bg-slate-50/50 py-8 text-center">
                <Package className="mx-auto mb-2 h-8 w-8 text-azul/30" />
                <p className="text-sm text-azul/60">Nenhum material adicionado</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
