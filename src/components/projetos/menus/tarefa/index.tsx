import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, Circle, X, Calendar, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TarefaInformacoes } from "./informacoes";
import { TarefaEntregaveis } from "./entregaveis";
import { toast } from "sonner";

// interface pros do componente
interface MenuTarefaProps {
  tarefaId: string;
  open: boolean;
  onClose: () => void;
  onUpdate: (data: any, workpackageId?: string) => Promise<void>;
}

export function MenuTarefa({
  tarefaId,
  open,
  onClose,
  onUpdate
}: MenuTarefaProps) {
  // estado para adicionar novo entregável
  const [addingEntregavel, setAddingEntregavel] = useState(false);
  
  // buscar a tarefa
  const { data: tarefa, isLoading } = api.tarefa.findById.useQuery(
    tarefaId,
    { 
      enabled: open,
      staleTime: 1000 * 30 // 30 segundos
    }
  );
  
  // resetar estado ao fechar
  useEffect(() => {
    if (!open) {
      setAddingEntregavel(false);
    }
  }, [open]);

  const handleSave = async (formData: any) => {
    try {
      // Buscar o workpackageId atual
      const currentWorkpackageId = tarefa?.workpackageId;
      
      // Chamar onUpdate com os dados e o workpackageId
      await onUpdate(formData, currentWorkpackageId);
      
      // Fechar o menu para melhor UX
      onClose();
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error);
      // Não fechar o menu em caso de erro
    }
  };

  // renderizar loading
  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onClose} modal={false}>
        <SheetContent className="w-full lg:w-[600px] p-0 overflow-hidden sm:max-w-none bg-white shadow-2xl border-l border-white/20 rounded-l-3xl fixed right-0 top-0 bottom-0">
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 border-4 border-azul/20 border-t-azul rounded-full animate-spin"></div>
            <p className="mt-4 text-azul/70">A carregar informações...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  
  // renderizar error
  if (!tarefa) {
    return (
      <Sheet open={open} onOpenChange={onClose} modal={false}>
        <SheetContent className="w-full lg:w-[600px] p-0 overflow-hidden sm:max-w-none bg-white shadow-2xl border-l border-white/20 rounded-l-3xl fixed right-0 top-0 bottom-0">
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
              <X className="h-8 w-8 text-red-500" />
            </div>
            <p className="mt-4 text-gray-700 font-medium">Não foi possível carregar a tarefa</p>
            <Button 
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-azul hover:bg-azul/90 text-white rounded-xl"
            >
              Fechar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  
  // Handler especial para mudanças de estado, que precisam ser refletidas na UI imediatamente 
  const handleTarefaStateUpdate = async (updateData: any, workpackageId?: string) => {
    try {
      // Para estado, não precisamos fazer nada extra pois o toggleEstado já cuida de tudo
      if (updateData.estado !== undefined) {
        // A mutation toggleEstado já foi chamada pelo componente filho
        // Não precisamos fazer nada aqui
        return;
      }
      
      // Para outros campos, usar a abordagem padrão
      await onUpdate(updateData, workpackageId);
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      toast.error("Erro ao atualizar tarefa");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose} modal={false}>
      <SheetContent className="w-full lg:w-[600px] p-0 overflow-hidden sm:max-w-none bg-white shadow-2xl border-l border-white/20 rounded-l-3xl fixed right-0 top-0 bottom-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-white shadow-sm z-20 sticky top-0">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    tarefa.estado 
                      ? "bg-emerald-50" 
                      : "bg-blue-50"
                  )}>
                    {tarefa.estado ? (
                      <Check className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-azul" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      {tarefa.nome}
                      <Badge className={cn(
                        "ml-2 text-xs rounded-full px-2 py-0.5",
                        tarefa.estado
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : "bg-blue-50 text-azul border-blue-200"
                      )}>
                        {tarefa.estado ? "Concluída" : "Em Progresso"}
                      </Badge>
                    </h1>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">  
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {tarefa.inicio ? format(new Date(tarefa.inicio), "dd MMM", { locale: ptBR }) : "-"} - 
                          {tarefa.fim ? format(new Date(tarefa.fim), "dd MMM yyyy", { locale: ptBR }) : "-"}
                        </span>
                      </div>
                      {tarefa.entregaveis?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>
                            {tarefa.entregaveis.filter((e: any) => e.estado).length}/{tarefa.entregaveis.length} entregáveis
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose}
                  className="rounded-full h-9 w-9 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="divide-y divide-gray-100">
              {/* Informações da Tarefa */}
              <div className="px-5 py-6">
                <TarefaInformacoes 
                  tarefa={tarefa} 
                  tarefaId={tarefa.id}
                  onUpdate={handleTarefaStateUpdate}
                />
              </div>
              
              {/* Entregáveis */}
              <div className="px-5 py-6">
                <TarefaEntregaveis
                  tarefa={tarefa}
                  tarefaId={tarefa.id}
                  addingEntregavel={addingEntregavel}
                  setAddingEntregavel={setAddingEntregavel}
                  onUpdate={() => onUpdate(
                    {
                      id: tarefa.id,
                      data: {}
                    }, 
                    tarefa.workpackageId
                  )}
                />
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}