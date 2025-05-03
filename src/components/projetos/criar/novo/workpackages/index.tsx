import { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  Plus,
  Search,
  Package,
  Calendar,
  ListTodo,
  Edit,
  Trash2,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkpackageForm } from "./workpackage/form";
import { TarefaForm } from "./tarefas/form";
import { Form as MaterialForm } from "./material/form";
// Import *exported* state types from context
import type { WorkpackageState, TarefaState, MaterialState } from "../../ProjetoFormContext";
// Remove unused Prisma import
// import type { Prisma } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { TabNavigation } from "../../components/TabNavigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { TarefaItem } from "./tarefas/item";
import { Item as MaterialItem } from "./material/item";
import { pt } from 'date-fns/locale';

// Importar tipo WorkpackageHandlers de onde for necessário (now uses 'any')
import type { WorkpackageHandlers } from "@/app/projetos/criar/page";
import type { Rubrica } from "@prisma/client";
import { Decimal } from "decimal.js";

interface WorkpackagesTabProps {
  // Use WorkpackageState from context
  workpackages?: WorkpackageState[];
  // Inherit handler types ('any') directly from the imported WorkpackageHandlers
  handlers: WorkpackageHandlers;
  onNavigateForward: () => void;
  onNavigateBack: () => void;
  // Update project dates to allow null
  projetoInicio: Date | null;
  projetoFim: Date | null;
}

interface MaterialData {
  nome: string;
  descricao: string | null;
  preco: number;
  quantidade: number;
  ano_utilizacao: number;
  mes: number;
  rubrica: Rubrica;
}

export function WorkpackagesTab({
  workpackages = [],
  handlers,
  onNavigateForward,
  onNavigateBack,
  projetoInicio,
  projetoFim,
}: WorkpackagesTabProps) {
  const [selectedWorkpackageId, setSelectedWorkpackageId] = useState<string>("");
  const [addingWorkpackage, setAddingWorkpackage] = useState(false);
  // Use WorkpackageState for editing state
  const [editingWorkpackage, setEditingWorkpackage] = useState<WorkpackageState | null>(null);
  const [deleteWorkpackageId, setDeleteWorkpackageId] = useState<string | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingTarefa, setIsAddingTarefa] = useState(false);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);

  // Verificar se há workpackages
  const hasWorkpackages = workpackages && workpackages.length > 0;

  // Verificar se podemos avançar
  const isValid = hasWorkpackages;

  // Selecionar o primeiro workpackage automaticamente se nenhum estiver selecionado
  useEffect(() => {
    if (hasWorkpackages && !selectedWorkpackageId && workpackages[0]) {
      setSelectedWorkpackageId(workpackages[0].id);
    } else if (!hasWorkpackages) {
      // Clear selection if no workpackages exist
      setSelectedWorkpackageId("");
    }
  }, [hasWorkpackages, selectedWorkpackageId, workpackages]);

  // Obter workpackage selecionado
  const selectedWorkpackage = workpackages.find((wp) => wp.id === selectedWorkpackageId);

  // Define local handlers with specific types for internal use
  const handleAddWorkpackageLocal = (formData: any) => {
    // Process form data to match expected input format
    const processedData = {
      ...formData,
      descricao: formData.descricao === undefined ? null : formData.descricao,
      inicio: formData.inicio ? new Date(formData.inicio) : null,
      fim: formData.fim ? new Date(formData.fim) : null,
    };
    handlers.addWorkpackage(processedData);
    setAddingWorkpackage(false);
  };

  const handleEditWorkpackageLocal = (workpackage: WorkpackageState) => {
    // Prepare data for the form (converting Date objects to ISO strings if needed)
    const initialDataForForm = {
      ...workpackage,
      inicio:
        workpackage.inicio instanceof Date
          ? workpackage.inicio
          : workpackage.inicio
            ? new Date(workpackage.inicio)
            : null,
      fim:
        workpackage.fim instanceof Date
          ? workpackage.fim
          : workpackage.fim
            ? new Date(workpackage.fim)
            : null,
    };
    setEditingWorkpackage(initialDataForForm);
  };

  const handleUpdateWorkpackageLocal = (id: string, formData: any) => {
    // Process form data to match expected format for the handler
    const processedData = {
      ...formData,
      descricao: formData.descricao === undefined ? null : formData.descricao,
      inicio: formData.inicio ? new Date(formData.inicio) : null,
      fim: formData.fim ? new Date(formData.fim) : null,
    };
    handlers.updateWorkpackage(id, processedData);
    setEditingWorkpackage(null);
  };

  const openDeleteWorkpackageDialog = (id: string) => {
    setDeleteWorkpackageId(id);
    setIsDeleteAlertOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteWorkpackageId) {
      handlers.removeWorkpackage(deleteWorkpackageId);

      if (deleteWorkpackageId === selectedWorkpackageId) {
        // Use .find() instead of .filter()[0]
        const nextSelectedWorkpackage = workpackages.find((wp) => wp.id !== deleteWorkpackageId);
        setSelectedWorkpackageId(nextSelectedWorkpackage?.id || "");
      }

      setDeleteWorkpackageId(null);
      setIsDeleteAlertOpen(false);
      toast.success("Workpackage removido com sucesso");
    }
  };

  // Filtrar workpackages com base na pesquisa
  const filteredWorkpackages = useMemo(() => {
    return workpackages.filter(
      (wp) =>
        wp.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (wp.descricao && wp.descricao.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [workpackages, searchQuery]);

  // Obter estatísticas do workpackage selecionado
  const getWorkpackageStats = (wp?: WorkpackageState) => {
    if (!wp)
      return {
        tarefasCount: 0,
        materiaisCount: 0,
        recursosCount: 0,
      };

    const tarefasCount = wp.tarefas?.length || 0;
    const materiaisCount = wp.materiais?.length || 0;
    const recursosCount = wp.recursos?.length || 0;

    return { tarefasCount, materiaisCount, recursosCount };
  };

  // --- Local Handler Definitions for Tasks, Materials etc. ---
  const handleAddTarefaLocal = (workpackageId: string, tarefaData: any) => {
    // Process tarefa data to match expected format
    const processedData = {
      ...tarefaData,
      descricao: tarefaData.descricao === undefined ? null : tarefaData.descricao,
      inicio: tarefaData.inicio ? new Date(tarefaData.inicio) : null,
      fim: tarefaData.fim ? new Date(tarefaData.fim) : null,
    };
    handlers.addTarefa(workpackageId, processedData);
    setIsAddingTarefa(false);
  };

  const handleUpdateTarefaLocal = (workpackageId: string, tarefaId: string, data: any) => {
    // Process tarefa data to match expected format
    const processedData = {
      ...data,
      descricao: data.descricao === undefined ? null : data.descricao,
      inicio: data.inicio ? new Date(data.inicio) : null,
      fim: data.fim ? new Date(data.fim) : null,
    };
    handlers.updateTarefa(workpackageId, tarefaId, processedData);
  };

  const handleRemoveTarefaLocal = (workpackageId: string, tarefaId: string) => {
    handlers.removeTarefa(workpackageId, tarefaId);
  };

  const handleAddEntregavelLocal = (
    workpackageId: string,
    tarefaId: string,
    entregavelData: any
  ) => {
    // Process entregavel data to match expected format
    const processedData = {
      ...entregavelData,
      descricao: entregavelData.descricao === undefined ? null : entregavelData.descricao,
      data: entregavelData.data ? new Date(entregavelData.data) : null,
    };
    handlers.addEntregavel(workpackageId, tarefaId, processedData);
  };

  const handleUpdateEntregavelLocal = (
    workpackageId: string,
    tarefaId: string,
    entregavelId: string,
    data: any
  ) => {
    // Process entregavel data to match expected format
    const processedData = {
      ...data,
      descricao: data.descricao === undefined ? null : data.descricao,
      data: data.data ? new Date(data.data) : null,
    };
    handlers.updateEntregavel(workpackageId, tarefaId, entregavelId, processedData);
  };

  const handleRemoveEntregavelLocal = (
    workpackageId: string,
    tarefaId: string,
    entregavelId: string
  ) => {
    handlers.removeEntregavel(workpackageId, tarefaId, entregavelId);
  };

  const handleAddMaterialLocal = (workpackageId: string, materialData: MaterialData) => {
    // Process material data to match expected format
    const processedData: MaterialState = {
      ...materialData,
      id: 0, // ID temporário, será substituído pelo backend
      estado: false, // Estado inicial para novo material
      preco: new Decimal(materialData.preco), // Converter number para Decimal
    };
    handlers.addMaterial(workpackageId, processedData);
  };

  const handleUpdateMaterialLocal = (workpackageId: string, materialId: number, data: any) => {
    // Process material data to match expected format
    const processedData = {
      ...data,
      descricao: data.descricao === undefined ? null : data.descricao,
      // Let the handler handle Decimal conversion if needed
    };
    handlers.updateMaterial(workpackageId, materialId, processedData);
  };

  const handleRemoveMaterialLocal = (workpackageId: string, materialId: number) => {
    handlers.removeMaterial(workpackageId, materialId);
  };

  // --- JSX Rendering ---
  return (
    <div className="flex flex-col">
      {/* Dialog para adição de workpackage - sempre disponível independente do estado */}
      <Dialog open={addingWorkpackage} onOpenChange={setAddingWorkpackage}>
        <DialogContent className="max-w-3xl p-0">
          {/* Accessibility: DialogTitle (hidden) for screen readers */}
          <DialogTitle asChild>
            <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
              {editingWorkpackage ? 'Editar Workpackage' : 'Criar Novo Workpackage'}
            </span>
          </DialogTitle>
          <WorkpackageForm
            onSubmit={handleAddWorkpackageLocal}
            onCancel={() => setAddingWorkpackage(false)}
            projetoInicio={projetoInicio || new Date()}
            projetoFim={projetoFim || new Date()}
          />
        </DialogContent>
      </Dialog>

      <div className="flex">
        {/* Painel lateral para listar workpackages */}
        <div className="w-72 border-r border-azul/10 bg-white/90 p-4">
          <div className="mb-4 flex items-center">
            <Briefcase className="mr-2 h-4 w-4 text-azul" />
            <span className="text-sm font-medium text-azul/70">Work Packages</span>
          </div>

          {/* Caixa de pesquisa */}
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transform text-azul/40" />
            <Input
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-md border-azul/20 bg-white/90 pl-8 text-xs"
            />
          </div>

          {/* Lista de workpackages */}
          {hasWorkpackages ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-1">
                {filteredWorkpackages.map((wp) => {
                  const stats = getWorkpackageStats(wp);
                  return (
                    <div
                      key={wp.id}
                      className={`cursor-pointer rounded-lg p-2.5 transition-all ${
                        selectedWorkpackageId === wp.id
                          ? "bg-azul text-white"
                          : "text-azul hover:bg-azul/5"
                      }`}
                      onClick={() => setSelectedWorkpackageId(wp.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="max-w-[180px] truncate text-sm font-medium">{wp.nome}</div>
                        <div className="flex gap-1">
                          {stats.tarefasCount > 0 && (
                            <Badge
                              variant={selectedWorkpackageId === wp.id ? "secondary" : "outline"}
                              className={
                                selectedWorkpackageId === wp.id ? "bg-white/20" : "bg-azul/5"
                              }
                            >
                              {stats.tarefasCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div
                        className={`mt-0.5 text-xs ${selectedWorkpackageId === wp.id ? "text-white/70" : "text-azul/60"}`}
                      >
                        {wp.inicio && wp.fim
                          ? `${format(new Date(wp.inicio), "MMM/yy", { locale: pt })} - ${format(new Date(wp.fim), "MMM/yy", { locale: pt })}`
                          : "Sem período definido"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-60 flex-col items-center justify-center text-center">
              <Briefcase className="mb-3 h-10 w-10 text-azul/20" />
              <p className="mb-4 text-sm text-azul/60">Nenhum workpackage criado</p>
              <Button
                onClick={() => setAddingWorkpackage(true)}
                className="border-none bg-azul/10 text-azul hover:bg-azul/20"
                size="sm"
              >
                <Plus className="mr-1 h-4 w-4" />
                Criar Workpackage
              </Button>
            </div>
          )}
        </div>

        {/* Área principal de conteúdo */}
        <div className="flex flex-1 flex-col">
          {!hasWorkpackages ? (
            <div className="flex flex-1 flex-col items-center justify-center">
              <Briefcase className="mb-4 h-16 w-16 text-azul/30" />
              <h3 className="mb-2 text-lg font-medium text-azul">Nenhum Workpackage Disponível</h3>
              <p className="mb-6 max-w-md text-center text-azul/60">
                É necessário criar workpackages para o seu projeto.
              </p>
              <Button
                onClick={() => setAddingWorkpackage(true)}
                className="rounded-xl bg-azul text-white hover:bg-azul/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Workpackage
              </Button>
            </div>
          ) : !selectedWorkpackageId ? (
            <div className="flex flex-1 flex-col items-center justify-center">
              <LayoutGrid className="mb-4 h-16 w-16 text-azul/30" />
              <h3 className="mb-2 text-lg font-medium text-azul">Selecione um Workpackage</h3>
              <p className="max-w-md text-center text-azul/60">
                Escolha um workpackage para começar a gerenciar tarefas e materiais.
              </p>
            </div>
          ) : (
            <>
              {/* Barra de ações */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-azul/10 bg-white p-4">
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setAddingWorkpackage(true)}
                    className="rounded-lg bg-azul text-white hover:bg-azul/90"
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Workpackage
                  </Button>
                  {selectedWorkpackage && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditWorkpackageLocal(selectedWorkpackage)}
                        className="h-8 border-azul/20 text-azul hover:bg-azul/5"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteWorkpackageDialog(selectedWorkpackage.id)}
                        className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    </>
                  )}
                </div>
                <div className="text-sm text-azul/70">
                  {selectedWorkpackage && selectedWorkpackage.inicio && selectedWorkpackage.fim && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(selectedWorkpackage.inicio), "MMM/yyyy", { locale: pt })} -{" "}
                        {format(new Date(selectedWorkpackage.fim), "MMM/yyyy", { locale: pt })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Conteúdo principal */}
              <div className="flex-1">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 p-4">
                    {/* Formulário para editar workpackage */}
                    {editingWorkpackage && (
                      <div className="mb-4">
                        <WorkpackageForm
                          initialData={{
                            nome: editingWorkpackage.nome,
                            descricao: editingWorkpackage.descricao || undefined,
                            inicio: editingWorkpackage.inicio || undefined,
                            fim: editingWorkpackage.fim || undefined,
                          }}
                          onSubmit={(data) =>
                            handleUpdateWorkpackageLocal(editingWorkpackage.id, data)
                          }
                          onCancel={() => setEditingWorkpackage(null)}
                          projetoInicio={projetoInicio || new Date()}
                          projetoFim={projetoFim || new Date()}
                        />
                      </div>
                    )}

                    {!editingWorkpackage && selectedWorkpackage && (
                      <div className="space-y-6">
                        {/* Lista de Tarefas */}
                        <Card className="overflow-hidden rounded-lg bg-white">
                          <div className="border-b border-azul/10 p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ListTodo className="h-4 w-4 text-azul" />
                                <h3 className="text-sm font-medium text-azul">Tarefas</h3>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAddingTarefa(true)}
                                className="h-8 border-azul/20 text-azul hover:bg-azul/5"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Adicionar Tarefa
                              </Button>
                            </div>
                          </div>

                          {selectedWorkpackage.tarefas && selectedWorkpackage.tarefas.length > 0 ? (
                            <div className="p-4">
                              <div className="space-y-4">
                                {selectedWorkpackage.tarefas.map((tarefa: TarefaState) => {
                                  // Map entregaveis to add tarefaId back for TarefaItem prop
                                  const entregaveisWithTarefaId = tarefa.entregaveis.map((e) => ({
                                    ...e,
                                    tarefaId: tarefa.id,
                                  }));

                                  // Add workpackageId to the tarefa object for the TarefaItem prop
                                  const tarefaWithWorkpackageId = {
                                    ...tarefa,
                                    workpackageId: selectedWorkpackage.id,
                                    entregaveis: entregaveisWithTarefaId,
                                  };

                                  return (
                                    <TarefaItem
                                      key={tarefa.id}
                                      tarefa={tarefaWithWorkpackageId}
                                      workpackageId={selectedWorkpackage.id}
                                      workpackageInicio={selectedWorkpackage.inicio || new Date()}
                                      workpackageFim={selectedWorkpackage.fim || new Date()}
                                      onUpdate={async () => {
                                        await handleUpdateTarefaLocal(
                                          selectedWorkpackage.id,
                                          tarefa.id,
                                          { estado: !tarefa.estado }
                                        );
                                      }}
                                      onRemove={() =>
                                        handleRemoveTarefaLocal(selectedWorkpackage.id, tarefa.id)
                                      }
                                      onEdit={async (data) => {
                                        // Adjust data from TarefaItem form if necessary (similar to workpackage form)
                                        const adjustedData = {
                                          ...data,
                                          ...(data.descricao !== undefined && {
                                            descricao:
                                              data.descricao === undefined ? null : data.descricao,
                                          }),
                                          ...(data.inicio !== undefined && {
                                            inicio: data.inicio ? new Date(data.inicio) : null,
                                          }),
                                          ...(data.fim !== undefined && {
                                            fim: data.fim ? new Date(data.fim) : null,
                                          }),
                                        };
                                        await handleUpdateTarefaLocal(
                                          selectedWorkpackage.id,
                                          tarefa.id,
                                          adjustedData
                                        );
                                      }}
                                      onAddEntregavel={async (tarefaId, entregavel) => {
                                        // Adjust entregavel data if necessary
                                        const adjustedEntregavel = {
                                          ...entregavel,
                                          ...(entregavel.descricao !== undefined && {
                                            descricao:
                                              entregavel.descricao === undefined
                                                ? null
                                                : entregavel.descricao,
                                          }),
                                          ...(entregavel.data !== undefined && {
                                            data: entregavel.data
                                              ? new Date(entregavel.data)
                                              : null,
                                          }),
                                        };
                                        await handleAddEntregavelLocal(
                                          selectedWorkpackage.id,
                                          tarefaId,
                                          adjustedEntregavel
                                        );
                                      }}
                                      onEditEntregavel={async (id, data) => {
                                        // Adjust entregavel data if necessary
                                        const adjustedData = {
                                          ...data,
                                          ...(data.descricao !== undefined && {
                                            descricao:
                                              data.descricao === undefined ? null : data.descricao,
                                          }),
                                          ...(data.data !== undefined && {
                                            data: data.data ? new Date(data.data) : null,
                                          }),
                                        };
                                        await handleUpdateEntregavelLocal(
                                          selectedWorkpackage.id,
                                          tarefa.id,
                                          id,
                                          adjustedData
                                        );
                                      }}
                                      onRemoveEntregavel={(id) =>
                                        handleRemoveEntregavelLocal(
                                          selectedWorkpackage.id,
                                          tarefa.id,
                                          id
                                        )
                                      }
                                      hideState={true}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                              <ListTodo className="mb-2 h-10 w-10 text-azul/20" />
                              <p className="text-sm text-azul/60">
                                Este workpackage ainda não tem tarefas
                              </p>
                            </div>
                          )}
                        </Card>

                        {/* Lista de Materiais */}
                        <Card className="overflow-hidden rounded-lg bg-white">
                          <div className="border-b border-azul/10 p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-azul" />
                                <h3 className="text-sm font-medium text-azul">Materiais</h3>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAddingMaterial(true)}
                                className="h-8 border-azul/20 text-azul hover:bg-azul/5"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Adicionar Material
                              </Button>
                            </div>
                          </div>

                          {selectedWorkpackage.materiais &&
                          selectedWorkpackage.materiais.length > 0 ? (
                            <div className="p-4">
                              <div className="space-y-2">
                                {selectedWorkpackage.materiais.map((material: MaterialState) => (
                                  <MaterialItem
                                    key={material.id}
                                    material={{
                                      ...material,
                                      preco: Number(material.preco),
                                      workpackageId: selectedWorkpackage.id,
                                      mes: material.mes || 1, 
                                    }}
                                    onEdit={(workpackageId, materialData) => {
                                      handleUpdateMaterialLocal(
                                        selectedWorkpackage.id,
                                        material.id,
                                        materialData
                                      );
                                    }}
                                    onRemove={() =>
                                      handleRemoveMaterialLocal(selectedWorkpackage.id, material.id)
                                    }
                                    onUpdate={() => {
                                      // Optional callback after successful updates
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                              <Package className="mb-2 h-10 w-10 text-azul/20" />
                              <p className="text-sm text-azul/60">
                                Este workpackage ainda não tem materiais
                              </p>
                            </div>
                          )}
                        </Card>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navegação entre etapas */}
      <div className="border-t border-azul/10 bg-white/80 backdrop-blur-sm">
        <TabNavigation
          onBack={onNavigateBack}
          onNext={onNavigateForward}
          isNextDisabled={!isValid}
          nextLabel="Próximo: Recursos"
          backLabel="Anterior: Finanças"
          className="pt-4"
        />
      </div>

      {/* AlertDialog para confirmação de exclusão */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="border-azul/10 bg-white shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover workpackage</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja remover este workpackage? Esta ação não pode ser desfeita e
              todos os dados associados serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-azul/20 text-azul/70 hover:bg-azul/5 hover:text-azul">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para adicionar tarefa */}
      <Dialog open={isAddingTarefa} onOpenChange={setIsAddingTarefa}>
        <DialogContent className="max-w-3xl p-0">
          {selectedWorkpackage && (
            <TarefaForm
              workpackageId={selectedWorkpackage.id}
              workpackageInicio={selectedWorkpackage.inicio || new Date()}
              workpackageFim={selectedWorkpackage.fim || new Date()}
              onSubmit={(workpackageId, data) => {
                handleAddTarefaLocal(workpackageId, data);
                setIsAddingTarefa(false);
              }}
              onCancel={() => setIsAddingTarefa(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para adicionar material */}
      <Dialog open={isAddingMaterial} onOpenChange={setIsAddingMaterial}>
        <DialogContent className="max-w-3xl p-0 [&>button]:hidden">
          {selectedWorkpackage && (
            <MaterialForm
              workpackageId={selectedWorkpackage.id}
              workpackageDates={{
                inicio: selectedWorkpackage.inicio,
                fim: selectedWorkpackage.fim,
              }}
              onSubmit={(workpackageId: string, material: MaterialData) => {
                handleAddMaterialLocal(workpackageId, material);
                setIsAddingMaterial(false);
              }}
              onCancel={() => setIsAddingMaterial(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
