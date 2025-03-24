import { useState, useEffect } from "react";
import { WorkpackageInformacoes } from "./informacoes";
import { WorkpackageTarefas } from "./tarefas";
import { WorkpackageRecursos } from "./recursos";
import { WorkpackageMateriais } from "./materiais";
import { useMutations } from "@/hooks/useMutations";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CheckCircle2, Circle, X } from "lucide-react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MenuWorkpackageProps {
  workpackageId: string;
  onClose: () => void;
  projetoId: string;
  onUpdate: (data: any) => void;
  open: boolean;
}

export function MenuWorkpackage({ workpackageId, onClose, projetoId, onUpdate, open }: MenuWorkpackageProps) {
  const mutations = useMutations(projetoId);
  const [addingTarefa, setAddingTarefa] = useState(false);
  const [workpackageEstado, setWorkpackageEstado] = useState(false);

  const { data: workpackage, isLoading } = api.workpackage.findById.useQuery(
    { id: workpackageId },
    {
      enabled: open,
      staleTime: 0,
      cacheTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchInterval: false,
      refetchOnReconnect: true
    }
  );

  useEffect(() => {
    if (!open) setAddingTarefa(false);
    if (workpackage) {
      console.log("Workpackage atualizado no MenuWorkpackage:", workpackage);
      setWorkpackageEstado(workpackage.estado);
    }
  }, [open, workpackage]);

  const handleSave = async (data: any) => {
    onUpdate(data);
    onClose();
  };

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onClose} modal={false}>
        <SheetContent className="p-0 w-full lg:w-[600px] border-none bg-white/95 backdrop-blur-xl shadow-xl rounded-l-3xl border-l border-white/30">
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 border-4 border-azul/20 border-t-azul rounded-full animate-spin"></div>
            <p className="mt-4 text-azul/70">A carregar informações...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!workpackage) {
    return (
      <Sheet open={open} onOpenChange={onClose} modal={false}>
        <SheetContent className="p-0 w-full lg:w-[600px] border-none bg-white/95 backdrop-blur-xl shadow-xl rounded-l-3xl border-l border-white/30">
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
              <X className="h-8 w-8 text-red-500" />
            </div>
            <p className="mt-4 text-gray-700 font-medium">Não foi possível carregar o workpackage</p>
            <Button onClick={onClose} className="mt-6 px-6 py-2 bg-azul hover:bg-azul/90 text-white rounded-xl">
              Fechar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onClose} modal={false}>
      <SheetContent className="w-full lg:w-[600px] p-0 overflow-hidden sm:max-w-none bg-white shadow-2xl border-l border-white/20 rounded-l-3xl fixed right-0 top-0 bottom-0">
        <div className="h-full flex flex-col">
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
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-9 w-9 hover:bg-gray-100 transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="divide-y divide-gray-100">
              <div className="px-5 py-6">
                <WorkpackageInformacoes
                  workpackageId={workpackageId}
                  onClose={onClose}
                  mutations={mutations}
                />
              </div>
              <div className="px-5 py-6">
                <WorkpackageTarefas
                  workpackage={workpackage}
                  workpackageId={workpackage.id}
                  addingTarefa={addingTarefa}
                  setAddingTarefa={setAddingTarefa}
                  mutations={mutations}
                />
              </div>
              <div className="px-5 py-6">
                <WorkpackageRecursos workpackage={workpackage} workpackageId={workpackage.id} mutations={mutations} />
              </div>
              <div className="px-5 py-6">
                <WorkpackageMateriais workpackage={workpackage} workpackageId={workpackage.id} mutations={mutations} />
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}