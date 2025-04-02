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
import { useMutations } from "@/hooks/useMutations";
import type { Prisma } from "@prisma/client"; // Importar tipos do Prisma

// interface pros do componente
interface MenuTarefaProps {
  tarefaId: string;
  open: boolean;
  onClose: () => void;
  onUpdate: (data: any, workpackageId?: string) => Promise<void>;
  projetoId: string;
}

export function MenuTarefa({ tarefaId, open, onClose, onUpdate, projetoId }: MenuTarefaProps) {
  // estado para adicionar novo entregável
  const [addingEntregavel, setAddingEntregavel] = useState(false);

  // buscar a tarefa
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

  // resetar estado ao fechar
  useEffect(() => {
    if (!open) {
      setAddingEntregavel(false);
    }
  }, [open]);

  // renderizar loading
  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onClose} modal={false}>
        <SheetContent className="fixed bottom-0 right-0 top-0 w-full overflow-hidden rounded-l-3xl border-l border-white/20 bg-white p-0 shadow-2xl sm:max-w-none lg:w-[600px]">
          <div className="flex h-full flex-col items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-azul/20 border-t-azul"></div>
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
        <SheetContent className="fixed bottom-0 right-0 top-0 w-full overflow-hidden rounded-l-3xl border-l border-white/20 bg-white p-0 shadow-2xl sm:max-w-none lg:w-[600px]">
          <div className="flex h-full flex-col items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
              <X className="h-8 w-8 text-red-500" />
            </div>
            <p className="mt-4 font-medium text-gray-700">Não foi possível carregar a tarefa</p>
            <Button
              onClick={onClose}
              className="mt-6 rounded-xl bg-azul px-6 py-2 text-white hover:bg-azul/90"
            >
              Fechar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Handler especial para mudanças de estado da tarefa
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

  return (
    <Sheet open={open} onOpenChange={onClose} modal={false}>
      <SheetContent className="fixed bottom-0 right-0 top-0 w-full overflow-hidden rounded-l-3xl border-l border-white/20 bg-white p-0 shadow-2xl sm:max-w-none lg:w-[600px]">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="sticky top-0 z-20 border-b border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    tarefa.estado ? "bg-emerald-50" : "bg-blue-50"
                  )}
                >
                  {tarefa.estado ? (
                    <Check className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-azul" />
                  )}
                </div>
                <div>
                  <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                    {tarefa.nome}
                    <Badge
                      className={cn(
                        "ml-2 rounded-full px-2 py-0.5 text-xs",
                        tarefa.estado
                          ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                          : "border-blue-200 bg-blue-50 text-azul"
                      )}
                    >
                      {tarefa.estado ? "Concluída" : "Em Progresso"}
                    </Badge>
                  </h1>
                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {tarefa.inicio
                          ? format(new Date(tarefa.inicio), "dd MMM", { locale: ptBR })
                          : "-"}{" "}
                        -
                        {tarefa.fim
                          ? format(new Date(tarefa.fim), "dd MMM yyyy", { locale: ptBR })
                          : "-"}
                      </span>
                    </div>
                    {tarefa.entregaveis?.length > 0 && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>
                          {tarefa.entregaveis.filter((e: any) => e.estado).length}/
                          {tarefa.entregaveis.length} entregáveis
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
                className="h-9 w-9 rounded-full transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-6 p-5">
              <TarefaInformacoes
                tarefa={tarefa}
                onUpdate={handleTarefaStateUpdate}
                onToggleEstado={handleToggleEstado}
              />

              <TarefaEntregaveis
                tarefa={tarefa}
                tarefaId={tarefa.id}
                addingEntregavel={addingEntregavel}
                setAddingEntregavel={setAddingEntregavel}
                onUpdate={() => onUpdate({}, tarefa.workpackageId)}
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
