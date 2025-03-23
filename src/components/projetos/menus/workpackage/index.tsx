import { useState, useEffect } from "react";
import { WorkpackageCompleto } from "@/components/projetos/types";
import { WorkpackageInformacoes } from "./informacoes";
import { WorkpackageTarefas } from "./tarefas";
import { WorkpackageRecursos } from "./recursos";
import { WorkpackageMateriais } from "./materiais";
import { useWorkpackageMutations } from "@/hooks/useWorkpackageMutations";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CheckCircle2, Circle, X, Calendar, Clock } from "lucide-react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MenuWorkpackageProps {
  workpackageId: string;
  open: boolean;
  onClose: () => void;
  startDate: Date;
  endDate: Date;
  onUpdate?: () => Promise<void>;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="border-b border-gray-100 pb-6">
      <h2 className="text-lg font-semibold text-azul mb-3">{title}</h2>
      {children}
    </div>
  );
}

export function MenuWorkpackage({
  workpackageId,
  open,
  onClose,
  startDate,
  endDate,
  onUpdate
}: MenuWorkpackageProps) {
  // Usar o hook de mutações
  const mutations = useWorkpackageMutations(onUpdate);
  
  // Estado para adicionar nova tarefa
  const [addingTarefa, setAddingTarefa] = useState(false);
  
  // Buscar o workpackage
  const { data: workpackage, isLoading } = api.workpackage.getById.useQuery(
    { id: workpackageId },
    { enabled: open, staleTime: 0 }
  );
  
  // Resetar estado ao fechar
  useEffect(() => {
    if (!open) {
      setAddingTarefa(false);
    }
  }, [open]);

  // Calcular duração em dias
  const calcularDuracaoDias = (inicio?: Date | string | null, fim?: Date | string | null) => {
    if (!inicio || !fim) return 0;
    
    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);
    const diffTime = Math.abs(dataFim.getTime() - dataInicio.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o dia final
  };
  
  // Renderizar loading
  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onClose} modal={false}>
        <SheetContent 
          className="p-0 w-full lg:w-[600px] border-none bg-white/95 backdrop-blur-xl shadow-xl rounded-l-3xl border-l border-white/30"
          onOpenAutoFocus={(e: Event) => e.preventDefault()}
          onPointerDownOutside={(e: { preventDefault: () => void }) => e.preventDefault()}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 border-4 border-azul/20 border-t-azul rounded-full animate-spin"></div>
            <p className="mt-4 text-azul/70">A carregar informações...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  
  // Renderizar error
  if (!workpackage) {
    return (
      <Sheet open={open} onOpenChange={onClose} modal={false}>
        <SheetContent 
          className="p-0 w-full lg:w-[600px] border-none bg-white/95 backdrop-blur-xl shadow-xl rounded-l-3xl border-l border-white/30"
          onOpenAutoFocus={(e: Event) => e.preventDefault()}
          onPointerDownOutside={(e: { preventDefault: () => void }) => e.preventDefault()}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
              <X className="h-8 w-8 text-red-500" />
            </div>
            <p className="mt-4 text-gray-700 font-medium">Não foi possível carregar o workpackage</p>
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

  // Calculando os dados para exibição
  const duracao = calcularDuracaoDias(workpackage.inicio, workpackage.fim);
  
  return (
    <Sheet open={open} onOpenChange={onClose} modal={false}>
      <SheetContent 
        className="w-full lg:w-[600px] p-0 overflow-hidden sm:max-w-none bg-white shadow-2xl border-l border-white/20 rounded-l-3xl fixed right-0 top-0 bottom-0"
        onOpenAutoFocus={(e: Event) => e.preventDefault()}
        onPointerDownOutside={(e: { preventDefault: () => void }) => e.preventDefault()}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-white shadow-sm z-20 sticky top-0">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-azul/10 flex items-center justify-center flex-shrink-0">
                    {workpackage.estado ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-azul/70" />
                    )}
                  </div>
                  <h1 className="text-xl font-bold text-gray-900">{workpackage.nome}</h1>
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

          {/* Conteúdo */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="divide-y divide-gray-100">
              <div className="px-5 py-6">
                <WorkpackageInformacoes 
                  workpackage={workpackage} 
                  workpackageId={workpackage.id}
                  onClose={onClose}
                  onUpdate={onUpdate}
                  mutations={{ updateWorkpackage: mutations.updateWorkpackageMutation }}
                />
              </div>
              
              <div className="px-5 py-6">
                <WorkpackageTarefas
                  workpackage={workpackage}
                  workpackageId={workpackage.id}
                  addingTarefa={addingTarefa}
                  setAddingTarefa={setAddingTarefa}
                />
              </div>
              
              <div className="px-5 py-6">
                <WorkpackageRecursos
                  workpackage={workpackage}
                  workpackageId={workpackage.id}
                />
              </div>
              
              <div className="px-5 py-6">
                <WorkpackageMateriais
                  workpackage={workpackage}
                  workpackageId={workpackage.id}
                />
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
