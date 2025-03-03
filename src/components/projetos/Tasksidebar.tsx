import { useState } from "react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, CheckIcon, PlusIcon, XCircleIcon, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface EntregavelFormData {
  nome: string;
  descricao?: string;
  anexo?: string;
  data?: Date;
}

interface Entregavel {
  id: string;
  nome: string;
  descricao?: string | null;
  anexo?: string | null;
  data?: Date | null;
}

interface TaskSidebarProps {
  tarefaId: string | null;
  open: boolean;
  onClose: () => void;
}

export function TaskSidebar({
  tarefaId,
  open,
  onClose,
}: TaskSidebarProps) {
  // State for new entregavel form
  const [newEntregavel, setNewEntregavel] = useState<EntregavelFormData>({
    nome: "",
    descricao: "",
    anexo: "",
  });

  const [showEntregavelForm, setShowEntregavelForm] = useState(false);

  // Query to fetch tarefa details
  const {
    data: tarefa,
    isLoading,
    refetch,
  } = api.tarefa.getById.useQuery(tarefaId || "", {
    enabled: !!tarefaId && open,
  });

  // Mutations
  const updateTarefaMutation = api.tarefa.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Tarefa atualizada", {
        description: "A tarefa foi atualizada com sucesso.",
      });
    },
  });

  const toggleEstadoMutation = api.tarefa.toggleEstado.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Estado alterado", {
        description: "O estado da tarefa foi alterado com sucesso.",
      });
    },
  });

  const createEntregavelMutation = api.tarefa.createEntregavel.useMutation({
    onSuccess: () => {
      refetch();
      resetEntregavelForm();
      toast.success("Entregável criado", {
        description: "O entregável foi adicionado com sucesso.",
      });
    },
  });

  const deleteEntregavelMutation = api.tarefa.deleteEntregavel.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Entregável removido", {
        description: "O entregável foi removido com sucesso.",
      });
    },
  });

  // Handle form resetting
  const resetEntregavelForm = () => {
    setNewEntregavel({
      nome: "",
      descricao: "",
      anexo: "",
    });
    setShowEntregavelForm(false);
  };

  // Handle estado toggle
  const handleToggleEstado = () => {
    if (tarefaId) {
      toggleEstadoMutation.mutate(tarefaId);
    }
  };

  // Handle entregavel creation
  const handleCreateEntregavel = () => {
    if (!tarefaId || !newEntregavel.nome) return;
    
    createEntregavelMutation.mutate({
      tarefaId: tarefaId,
      nome: newEntregavel.nome,
      descricao: newEntregavel.descricao,
      anexo: newEntregavel.anexo,
      data: newEntregavel.data,
    });
  };

  // Handle entregavel deletion
  const handleDeleteEntregavel = (entregavelId: string) => {
    deleteEntregavelMutation.mutate(entregavelId);
  };

  // Format date for display
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full md:max-w-md lg:max-w-lg p-6">
          <div className="flex items-center justify-center h-full">
            <p>Carregando...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!tarefa) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full md:max-w-md lg:max-w-lg p-6">
          <div className="flex items-center justify-center h-full">
            <p>Tarefa não encontrada</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full md:max-w-md lg:max-w-lg p-6 overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex flex-col space-y-2">
            <h2 className="text-xl font-semibold">{tarefa.nome}</h2>
            
            <Badge 
              variant={tarefa.estado ? "default" : "outline"}
              className={cn(
                "w-fit",
                tarefa.estado 
                  ? "bg-emerald-50/70 text-emerald-600 border-emerald-200"
                  : "bg-blue-50/70 text-customBlue border-blue-200"
              )}
            >
              {tarefa.estado ? "Concluída" : "Pendente"}
            </Badge>
          </div>
        </SheetHeader>
        
        <div className="space-y-6">
          {/* Período */}
          <div className="flex flex-col space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              Período
            </Label>
            <div className="flex items-center gap-2 text-sm">
              <span>Início: {formatDate(tarefa.inicio)}</span>
              <span>-</span>
              <span>Fim: {formatDate(tarefa.fim)}</span>
            </div>
          </div>
          
          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Card className="bg-muted/40">
              <CardContent className="p-4">
                {tarefa.descricao || "Sem descrição disponível."}
              </CardContent>
            </Card>
          </div>
          
          <Separator />
          
          {/* Entregáveis */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Entregáveis</Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowEntregavelForm(!showEntregavelForm)}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            
            {/* Form para novo entregável */}
            {showEntregavelForm && (
              <Card className="p-4 border-dashed">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="entregavel-nome">Nome</Label>
                    <Input
                      id="entregavel-nome"
                      value={newEntregavel.nome}
                      onChange={(e) => setNewEntregavel({...newEntregavel, nome: e.target.value})}
                      placeholder="Nome do entregável"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="entregavel-descricao">Descrição</Label>
                    <Textarea
                      id="entregavel-descricao"
                      value={newEntregavel.descricao}
                      onChange={(e) => setNewEntregavel({...newEntregavel, descricao: e.target.value})}
                      placeholder="Descrição do entregável"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="entregavel-data">Data de entrega</Label>
                    <Input
                      id="entregavel-data"
                      type="date"
                      onChange={(e) => setNewEntregavel({
                        ...newEntregavel, 
                        data: e.target.value ? new Date(e.target.value) : undefined
                      })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="entregavel-anexo">Link para anexo</Label>
                    <Input
                      id="entregavel-anexo"
                      value={newEntregavel.anexo}
                      onChange={(e) => setNewEntregavel({...newEntregavel, anexo: e.target.value})}
                      placeholder="URL do anexo"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={resetEntregavelForm}>
                      Cancelar
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleCreateEntregavel}
                      disabled={!newEntregavel.nome}
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              </Card>
            )}
            
            {/* Lista de entregáveis */}
            <div className="space-y-3">
              {tarefa.entregaveis && tarefa.entregaveis.length > 0 ? (
                tarefa.entregaveis.map((entregavel: Entregavel) => (
                  <Card key={entregavel.id} className="overflow-hidden">
                    <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileIcon className="h-4 w-4 text-primary" />
                        {entregavel.nome}
                      </CardTitle>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleDeleteEntregavel(entregavel.id)}
                      >
                        <XCircleIcon className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                      {entregavel.descricao && (
                        <p className="text-sm text-muted-foreground">{entregavel.descricao}</p>
                      )}
                      {entregavel.data && (
                        <p className="text-xs text-muted-foreground">
                          Data: {formatDate(entregavel.data)}
                        </p>
                      )}
                      {entregavel.anexo && (
                        <a 
                          href={entregavel.anexo} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Ver anexo <span className="text-xs">↗</span>
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Não há entregáveis associados a esta tarefa</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end gap-2">
          <Button
            variant={tarefa.estado ? "outline" : "default"}
            onClick={handleToggleEstado}
            className="gap-2"
          >
            <CheckIcon className="h-4 w-4" />
            {tarefa.estado ? "Marcar como Pendente" : "Marcar como Concluída"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}