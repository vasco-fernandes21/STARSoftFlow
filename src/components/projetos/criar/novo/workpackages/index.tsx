import { useState, useEffect, useMemo } from "react";
import { WorkpackageWithRelations } from "../../../types";
import { 
  Briefcase, 
  Plus, 
  X, 
  PlusCircle, 
  Search,
  Package,
  Calendar,
  Users,
  ListTodo,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkpackageForm } from "./workpackage/form";
import { TarefaForm } from "./tarefas/form";
import { Prisma } from "@prisma/client";
import { useProjetoForm } from "../../ProjetoFormContext";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { TabNavigation } from "../../components/TabNavigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { TarefaItem } from "./tarefas/item";
import { Item as MaterialItem } from "./material/item"

// Importar tipo WorkpackageHandlers de onde for necessário
import { WorkpackageHandlers } from "@/app/projetos/criar/page";

interface WorkpackagesTabProps {
  workpackages?: WorkpackageWithRelations[];
  handlers: WorkpackageHandlers & {
    addWorkpackage: (workpackage: Omit<WorkpackageWithRelations, "id" | "tarefas" | "materiais" | "recursos">) => void;
    updateWorkpackage: (id: string, data: Partial<WorkpackageWithRelations>) => void;
    removeWorkpackage: (id: string) => void;
  };
  onNavigateForward: () => void;
  onNavigateBack: () => void;
}

export function WorkpackagesTab({ workpackages = [], handlers, onNavigateForward, onNavigateBack }: WorkpackagesTabProps) {
  const [selectedWorkpackageId, setSelectedWorkpackageId] = useState<string>("");
  const [addingWorkpackage, setAddingWorkpackage] = useState(false);
  const [editingWorkpackage, setEditingWorkpackage] = useState<WorkpackageWithRelations | null>(null);
  const [deleteWorkpackageId, setDeleteWorkpackageId] = useState<string | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingTarefa, setIsAddingTarefa] = useState(false);
  const { state: projeto } = useProjetoForm();

  // Verificar se há workpackages
  const hasWorkpackages = workpackages && workpackages.length > 0;
  
  // Verificar se podemos avançar
  const isValid = hasWorkpackages;
  
  // Selecionar o primeiro workpackage automaticamente se nenhum estiver selecionado
  useEffect(() => {
    if (hasWorkpackages && !selectedWorkpackageId && workpackages[0]) {
      setSelectedWorkpackageId(workpackages[0].id);
    }
  }, [hasWorkpackages, selectedWorkpackageId, workpackages]);

  // Obter workpackage selecionado
  const selectedWorkpackage = workpackages.find(wp => wp.id === selectedWorkpackageId);

  // Funções para gerenciar workpackages
  const handleAddWorkpackage = (workpackage: Omit<Prisma.WorkpackageCreateInput, "projeto">) => {
    const completeWorkpackage = {
      ...workpackage,
    } as Omit<WorkpackageWithRelations, "id" | "tarefas" | "materiais" | "recursos">;
    
    handlers.addWorkpackage(completeWorkpackage);
    setAddingWorkpackage(false);
    toast.success("Workpackage adicionado com sucesso");
  };

  const handleEditWorkpackage = (workpackage: WorkpackageWithRelations) => {
    setEditingWorkpackage(workpackage);
  };

  const handleUpdateWorkpackage = (id: string, data: Partial<Prisma.WorkpackageCreateInput>) => {
    const formattedData = {
      ...data,
      descricao: data.descricao === null ? undefined : data.descricao,
      inicio: data.inicio === null ? undefined : data.inicio,
      fim: data.fim === null ? undefined : data.fim,
    } as Partial<WorkpackageWithRelations>;
    
    handlers.updateWorkpackage(id, formattedData);
    setEditingWorkpackage(null);
    toast.success("Workpackage atualizado com sucesso");
  };

  const openDeleteWorkpackageDialog = (id: string) => {
    setDeleteWorkpackageId(id);
    setIsDeleteAlertOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteWorkpackageId) {
      handlers.removeWorkpackage(deleteWorkpackageId);
      
      if (deleteWorkpackageId === selectedWorkpackageId) {
        setSelectedWorkpackageId("");
      }
      
      setDeleteWorkpackageId(null);
      setIsDeleteAlertOpen(false);
      toast.success("Workpackage removido com sucesso");
    }
  };

  // Filtrar workpackages com base na pesquisa
  const filteredWorkpackages = useMemo(() => {
    return workpackages.filter(wp => 
      wp.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wp.descricao && wp.descricao.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [workpackages, searchQuery]);

  // Obter estatísticas do workpackage selecionado
  const getWorkpackageStats = (wp?: WorkpackageWithRelations) => {
    if (!wp) return {
      tarefasCount: 0,
      materiaisCount: 0
    };
    
    const tarefasCount = wp.tarefas?.length || 0;
    const materiaisCount = wp.materiais?.length || 0;
    
    return { tarefasCount, materiaisCount };
  };

  return (
    <div className="flex flex-col">
      <div className="flex">
        {/* Painel lateral para listar workpackages */}
        <div className="w-72 border-r border-azul/10 bg-white/90 p-4">
          <div className="mb-4 flex items-center">
            <Briefcase className="h-4 w-4 text-azul mr-2" />
            <span className="text-sm text-azul/70 font-medium">Work Packages</span>
          </div>
          
          {/* Caixa de pesquisa */}
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-azul/40" />
            <Input
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs rounded-md border-azul/20 bg-white/90"
            />
          </div>
          
          {/* Lista de workpackages */}
          {hasWorkpackages ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-1">
                {filteredWorkpackages.map(wp => {
                  const stats = getWorkpackageStats(wp);
                  return (
                    <div 
                      key={wp.id} 
                      className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                        selectedWorkpackageId === wp.id 
                          ? 'bg-azul text-white' 
                          : 'hover:bg-azul/5 text-azul'
                      }`}
                      onClick={() => setSelectedWorkpackageId(wp.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium truncate max-w-[180px]">{wp.nome}</div>
                        <div className="flex gap-1">
                          {stats.tarefasCount > 0 && (
                            <Badge variant={selectedWorkpackageId === wp.id ? "secondary" : "outline"} 
                              className={selectedWorkpackageId === wp.id ? "bg-white/20" : "bg-azul/5"}>
                              {stats.tarefasCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className={`text-xs mt-0.5 ${selectedWorkpackageId === wp.id ? 'text-white/70' : 'text-azul/60'}`}>
                        {wp.inicio && wp.fim ? (
                          `${format(new Date(wp.inicio), 'MMM/yy', { locale: ptBR })} - ${format(new Date(wp.fim), 'MMM/yy', { locale: ptBR })}`
                        ) : 'Sem período definido'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-60 text-center">
              <Briefcase className="h-10 w-10 text-azul/20 mb-3" />
              <p className="text-sm text-azul/60 mb-4">
                Nenhum workpackage criado
              </p>
              <Button 
                onClick={() => setAddingWorkpackage(true)} 
                className="text-azul bg-azul/10 hover:bg-azul/20 border-none"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Criar Workpackage
              </Button>
            </div>
          )}
        </div>
        
        {/* Área principal de conteúdo */}
        <div className="flex-1 flex flex-col">
          {!hasWorkpackages ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Briefcase className="h-16 w-16 text-azul/30 mb-4" />
              <h3 className="text-lg font-medium text-azul mb-2">
                Nenhum Workpackage Disponível
              </h3>
              <p className="text-azul/60 text-center max-w-md mb-6">
                É necessário criar workpackages para o seu projeto.
              </p>
              <Button 
                onClick={() => setAddingWorkpackage(true)}
                className="bg-azul text-white hover:bg-azul/90 rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Workpackage
              </Button>
            </div>
          ) : !selectedWorkpackageId ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <LayoutGrid className="h-16 w-16 text-azul/30 mb-4" />
              <h3 className="text-lg font-medium text-azul mb-2">
                Selecione um Workpackage
              </h3>
              <p className="text-azul/60 text-center max-w-md">
                Escolha um workpackage para começar a gerenciar tarefas e materiais.
              </p>
            </div>
          ) : (
            <>
              {/* Barra de ações */}
              <div className="bg-white border-b border-azul/10 p-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setAddingWorkpackage(!addingWorkpackage)}
                    className={`rounded-lg ${addingWorkpackage 
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200" 
                      : "bg-azul text-white hover:bg-azul/90"}`}
                    size="sm"
                  >
                    {addingWorkpackage ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Workpackage
                      </>
                    )}
                  </Button>
                  {selectedWorkpackage && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditWorkpackage(selectedWorkpackage)}
                        className="h-8 text-azul border-azul/20 hover:bg-azul/5"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteWorkpackageDialog(selectedWorkpackage.id)}
                        className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
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
                        {format(new Date(selectedWorkpackage.inicio), 'MMM/yyyy', { locale: ptBR })} - {format(new Date(selectedWorkpackage.fim), 'MMM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Conteúdo principal */}
              <div className="flex-1">
                {/* Formulário para adicionar/editar workpackage */}
                <ScrollArea className="h-[600px]">
                  <div className="p-4 space-y-3">
                    {/* Formulário para adicionar/editar workpackage */}
                    {addingWorkpackage && (
                      <div className="mb-4">
                        <WorkpackageForm
                          onSubmit={handleAddWorkpackage}
                          onCancel={() => setAddingWorkpackage(false)}
                        />
                      </div>
                    )}
                    
                    {editingWorkpackage && (
                      <div className="mb-4">
                        <WorkpackageForm
                          initialData={{
                            nome: editingWorkpackage.nome,
                            descricao: editingWorkpackage.descricao || undefined,
                            inicio: editingWorkpackage.inicio || undefined,
                            fim: editingWorkpackage.fim || undefined
                          }}
                          onSubmit={(data) => handleUpdateWorkpackage(editingWorkpackage.id, data)}
                          onCancel={() => setEditingWorkpackage(null)}
                        />
                      </div>
                    )}
                    
                    {!addingWorkpackage && !editingWorkpackage && selectedWorkpackage && (
                      <div className="space-y-6">
                        {/* Lista de Tarefas */}
                        <Card className="bg-white rounded-lg overflow-hidden">
                          <div className="p-4 border-b border-azul/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ListTodo className="h-4 w-4 text-azul" />
                                <h3 className="text-sm font-medium text-azul">Tarefas</h3>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAddingTarefa(true)}
                                className="h-8 text-azul border-azul/20 hover:bg-azul/5"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar Tarefa
                              </Button>
                            </div>
                          </div>
                          
                          {selectedWorkpackage.tarefas && selectedWorkpackage.tarefas.length > 0 ? (
                            <div className="p-4">
                              <div className="space-y-4">
                                {selectedWorkpackage.tarefas.map((tarefa) => (
                                  <TarefaItem
                                    key={tarefa.id}
                                    tarefa={tarefa}
                                    workpackageId={selectedWorkpackage.id}
                                    workpackageInicio={selectedWorkpackage.inicio || new Date()}
                                    workpackageFim={selectedWorkpackage.fim || new Date()}
                                    onUpdate={async () => {
                                      await handlers.updateTarefa(selectedWorkpackage.id, tarefa.id, { estado: !tarefa.estado });
                                    }}
                                    onRemove={() => handlers.removeTarefa(selectedWorkpackage.id, tarefa.id)}
                                    onEdit={async (data) => {
                                      await handlers.updateTarefa(selectedWorkpackage.id, tarefa.id, data);
                                    }}
                                    onAddEntregavel={async (tarefaId, entregavel) => {
                                      await handlers.addEntregavel(selectedWorkpackage.id, tarefaId, entregavel);
                                    }}
                                    onEditEntregavel={async (id, data) => {
                                      await handlers.updateEntregavel(selectedWorkpackage.id, tarefa.id, id, data);
                                    }}
                                    onRemoveEntregavel={(id) => handlers.removeEntregavel(selectedWorkpackage.id, tarefa.id, id)}
                                    hideState={true}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                              <ListTodo className="h-10 w-10 text-azul/20 mb-2" />
                              <p className="text-sm text-azul/60">
                                Este workpackage ainda não tem tarefas
                              </p>
                            </div>
                          )}
                        </Card>

                        {/* Lista de Materiais */}
                        <Card className="bg-white rounded-lg overflow-hidden">
                          <div className="p-4 border-b border-azul/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-azul" />
                                <h3 className="text-sm font-medium text-azul">Materiais</h3>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlers.addMaterial(selectedWorkpackage.id, {
                                  nome: "Novo Material",
                                  descricao: "",
                                  estado: false,
                                  preco: 0,
                                  quantidade: 1,
                                  ano_utilizacao: new Date().getFullYear(),
                                  rubrica: "MATERIAIS"
                                })}
                                className="h-8 text-azul border-azul/20 hover:bg-azul/5"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar Material
                              </Button>
                            </div>
                          </div>
                          
                          {selectedWorkpackage.materiais && selectedWorkpackage.materiais.length > 0 ? (
                            <div className="p-4">
                              <div className="space-y-2">
                                {selectedWorkpackage.materiais.map((material) => (
                                  <MaterialItem
                                    key={material.id}
                                    material={{
                                      ...material,
                                      preco: Number(material.preco),
                                      workpackageId: selectedWorkpackage.id
                                    }}
                                    onEdit={(workpackageId, materialData) => {
                                      handlers.updateMaterial(selectedWorkpackage.id, material.id, materialData);
                                    }}
                                    onRemove={() => handlers.removeMaterial(selectedWorkpackage.id, material.id)}
                                    onUpdate={() => {
                                      // Optional callback after successful updates
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                              <Package className="h-10 w-10 text-azul/20 mb-2" />
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
        <AlertDialogContent className="bg-white border-azul/10 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover workpackage</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja remover este workpackage? Esta ação não pode ser desfeita e todos os dados associados serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-azul/20 text-azul/70 hover:text-azul hover:bg-azul/5">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para adicionar tarefa */}
      <Dialog open={isAddingTarefa} onOpenChange={setIsAddingTarefa}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
            <DialogDescription>
              Adicione uma nova tarefa ao workpackage {selectedWorkpackage?.nome}
            </DialogDescription>
          </DialogHeader>
          {selectedWorkpackage && (
            <TarefaForm
              workpackageId={selectedWorkpackage.id}
              workpackageInicio={selectedWorkpackage.inicio || new Date()}
              workpackageFim={selectedWorkpackage.fim || new Date()}
              onSubmit={(workpackageId, data) => {
                handlers.addTarefa(workpackageId, data);
                setIsAddingTarefa(false);
              }}
              onCancel={() => setIsAddingTarefa(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 