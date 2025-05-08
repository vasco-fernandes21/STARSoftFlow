import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  X, 
  ArrowLeft,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TarefaInformacoes } from "./informacoes";
import { TarefaEntregaveis } from "./entregaveis";
import { toast } from "sonner";
import { useMutations } from "@/hooks/useMutations";
import type { Prisma } from "@prisma/client";

// Interface para props do componente
interface MenuTarefaProps {
  tarefaId: string;
  open: boolean;
  onClose: () => void;
  onUpdate: (data: any, workpackageId?: string) => Promise<void>;
  projetoId: string;
}

export function MenuTarefa({ tarefaId, open, onClose, onUpdate, projetoId }: MenuTarefaProps) {
  // Estados
  const [addingEntregavel, setAddingEntregavel] = useState(false);

  // Buscar a tarefa
  const {
    data: tarefa,
    isLoading,
    refetch,
  } = api.tarefa.findById.useQuery(tarefaId, {
    enabled: open,
    staleTime: 1000 * 30, // 30 segundos
  });

  // Obter o projetoId da tarefa (necessário para useMutations)
  const mutations = useMutations(projetoId);

  // Resetar estado ao fechar
  useEffect(() => {
    if (!open) {
      setAddingEntregavel(false);
    }
  }, [open]);

  // Renderizar loading
  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onClose} modal={false}>
        <SheetContent className="fixed bottom-0 right-0 top-0 w-full overflow-hidden rounded-l-3xl border-l border-white/20 bg-white p-0 shadow-2xl sm:max-w-none lg:w-[600px] transition-all duration-300 ease-in-out">
          <div className="flex h-full flex-col items-center justify-center">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Clock className="h-6 w-6 text-slate-700 animate-pulse" />
              </div>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">A carregar informações...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Renderizar error
  if (!tarefa) {
    return (
      <Sheet open={open} onOpenChange={onClose} modal={false}>
        <SheetContent className="fixed bottom-0 right-0 top-0 w-full overflow-hidden rounded-l-3xl border-l border-white/20 bg-white p-0 shadow-2xl sm:max-w-none lg:w-[600px] transition-all duration-300 ease-in-out">
          <div className="flex h-full flex-col items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 shadow-sm">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <p className="mt-6 text-base font-medium text-slate-800">Não foi possível carregar a tarefa</p>
            <p className="mt-1 text-sm text-slate-500">Verifique se a tarefa ainda existe ou tente novamente.</p>
            <Button
              onClick={onClose}
              className="mt-6 rounded-xl bg-slate-800 px-6 py-2 text-white hover:bg-slate-700 shadow-md hover:shadow-lg transition-all"
            >
              Fechar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Handler para mudanças de estado da tarefa
  const handleTarefaStateUpdate = async (updateData: any, workpackageId?: string) => {
    try {
      if (updateData.estado !== undefined) {
        // A mutation toggleEstado já foi chamada pelo componente filho
        return;
      }
      await onUpdate(updateData, workpackageId);
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleToggleEstado = async () => {
    try {
      await mutations.tarefa.update.mutateAsync({
        id: tarefaId,
        data: { estado: !tarefa.estado },
      });
      // O onSuccess/onSettled do useMutations já deve invalidar e refetch
      // Mas chamamos onUpdate para atualizar a lista principal se necessário
      await onUpdate({ estado: !tarefa.estado }, tarefa.workpackageId);
      await refetch(); // Refetch dos dados desta tarefa específica
    } catch (error) {
      console.error("Erro ao atualizar estado da tarefa:", error);
      // O onError do useMutations já deve mostrar o toast
    }
  };

  // --- Handlers para Entregáveis usando useMutations ---

  // Usar Omit com Prisma.EntregavelCreateInput para garantir que `tarefa` não seja passado
  const handleCreateEntregavel = async (
    data: Omit<Prisma.EntregavelCreateInput, "tarefa" | "id">
  ) => {
    if (!mutations) return;
    try {
      // A mutation espera o input no formato { nome, tarefaId, ...outros }
      // O tipo Prisma.EntregavelCreateInput já tem essa estrutura, exceto pela relação `tarefa`
      await mutations.entregavel.create.mutateAsync({
        ...(data as Prisma.EntregavelCreateInput), // Cast para garantir compatibilidade
        tarefaId: tarefa.id, // Adicionar tarefaId explicitamente
      });
    } catch (error) {
      console.error("Falha silenciosa ao criar entregável:", error);
    }
  };

  // Usar Prisma.EntregavelUpdateInput['data'] para o tipo dos dados
  const handleUpdateEntregavel = async (id: string, data: Prisma.EntregavelUpdateInput) => {
    if (!mutations) return;
    try {
      // A mutation espera { id, data: { ... } }
      await mutations.entregavel.update.mutateAsync({ id, data });
    } catch (error) {
      console.error("Falha silenciosa ao atualizar entregável:", error);
    }
  };

  const handleDeleteEntregavel = async (id: string) => {
    if (!mutations) return;
    try {
      // Adicionar confirmação antes de apagar
      if (confirm("Tem a certeza que deseja apagar este entregável?")) {
        await mutations.entregavel.delete.mutateAsync(id);
        // Toast e refetch tratados pelo useMutations
      }
    } catch (error) {
      // Erro já tratado no onError do useMutations
      console.error("Falha silenciosa ao apagar entregável:", error);
    }
  };

  // Calcular progresso dos entregáveis
  const entregaveisConcluidos = tarefa.entregaveis?.filter(e => e.estado).length || 0;
  const totalEntregaveis = tarefa.entregaveis?.length || 0;
  const progressoPercent = totalEntregaveis > 0 
    ? Math.round((entregaveisConcluidos / totalEntregaveis) * 100) 
    : 0;

  return (
    <Sheet open={open} onOpenChange={onClose} modal={false}>
      <SheetContent className="fixed bottom-0 right-0 top-0 w-full overflow-hidden rounded-l-3xl border-l border-slate-200 bg-white p-0 shadow-xl sm:max-w-none lg:w-[600px] transition-all duration-300 ease-in-out">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 rounded-full text-xs text-slate-500 hover:bg-slate-100 gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Voltar</span>
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-full transition-colors hover:bg-slate-100"
              >
                <X className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
            
            <div className="px-6 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-sm transition-all cursor-pointer",
                    tarefa.estado 
                      ? "bg-emerald-500" 
                      : "bg-slate-700"
                  )}
                  onClick={handleToggleEstado}
                  role="button"
                  aria-label={tarefa.estado ? "Marcar como não concluída" : "Marcar como concluída"}
                >
                  {tarefa.estado ? (
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  ) : (
                    <Clock className="h-6 w-6 text-white" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-800 line-clamp-1">
                    {tarefa.nome}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <Badge
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        tarefa.estado
                          ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                          : "border-slate-200 bg-slate-100 text-slate-700"
                      )}
                    >
                      {tarefa.estado ? "Concluída" : "Em Progresso"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {tarefa.inicio
                          ? format(new Date(tarefa.inicio), "dd MMM", { locale: ptBR })
                          : "-"}{" "}
                        a{" "}
                        {tarefa.fim
                          ? format(new Date(tarefa.fim), "dd MMM", { locale: ptBR })
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo principal */}
          <ScrollArea className="flex-1 px-6 py-5">
            <div className="space-y-6">
              {/* Informações da Tarefa */}
              <TarefaInformacoes
                tarefa={tarefa}
                onUpdate={handleTarefaStateUpdate}
                onToggleEstado={handleToggleEstado}
              />

              {/* Entregáveis */}
              <TarefaEntregaveis
                tarefa={tarefa}
                tarefaId={tarefaId}
                addingEntregavel={addingEntregavel}
                setAddingEntregavel={setAddingEntregavel}
                onUpdate={handleTarefaStateUpdate}
                onCreateEntregavel={handleCreateEntregavel}
                onUpdateEntregavel={handleUpdateEntregavel}
                onDeleteEntregavel={handleDeleteEntregavel}
              />
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
