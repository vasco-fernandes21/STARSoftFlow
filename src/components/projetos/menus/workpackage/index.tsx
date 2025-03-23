import { useState, useEffect } from "react";
import { WorkpackageCompleto } from "@/components/projetos/types";
import { WorkpackageInformacoes } from "./informacoes";
import { WorkpackageTarefas } from "./tarefas";
import { WorkpackageRecursos } from "./recursos";
import { WorkpackageMateriais } from "./materiais";
import { useWorkpackageMutations } from "@/hooks/useWorkpackageMutations";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Info, ListTodo, Users, Package2, X, Calendar, Clock, CheckCircle2, Circle } from "lucide-react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
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
  
  // Estado das tabs
  const [activeTab, setActiveTab] = useState("informacoes");
  
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

  // Calcular progresso
  const calcularProgresso = (wp: WorkpackageCompleto) => {
    if (!wp.tarefas || wp.tarefas.length === 0) return 0;
    const concluidas = wp.tarefas.filter(t => t.estado).length;
    return Math.round((concluidas / wp.tarefas.length) * 100);
  };
  
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
          className="p-0 w-full lg:w-[900px] border-none bg-white/95 backdrop-blur-xl shadow-xl rounded-l-3xl border-l border-white/30"
          onOpenAutoFocus={(e: React.FocusEvent) => e.preventDefault()}
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
          className="p-0 w-full lg:w-[900px] border-none bg-white/95 backdrop-blur-xl shadow-xl rounded-l-3xl border-l border-white/30"
          onOpenAutoFocus={(e: React.FocusEvent) => e.preventDefault()}
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

  // Configuração das tabs
  const tabs = [
    { id: "informacoes", icon: <Info size={18} />, label: "Informações" },
    { id: "tarefas", icon: <ListTodo size={18} />, label: "Tarefas" },
    { id: "recursos", icon: <Users size={18} />, label: "Recursos" },
    { id: "materiais", icon: <Package2 size={18} />, label: "Materiais" }
  ];

  // Calculando os dados para exibição
  const progresso = calcularProgresso(workpackage);
  const duracao = calcularDuracaoDias(workpackage.inicio, workpackage.fim);
  
  return (
    <Sheet open={open} onOpenChange={onClose} modal={false}>
      <SheetContent 
        className="w-full lg:w-[780px] p-0 overflow-hidden sm:max-w-none bg-gradient-to-b from-white to-gray-50 shadow-2xl border-l border-white/20 rounded-l-3xl fixed right-0 top-0 bottom-0"
        onOpenAutoFocus={(e: React.FocusEvent) => e.preventDefault()}
        onPointerDownOutside={(e: { preventDefault: () => void }) => e.preventDefault()}
      >
        <div className="h-full flex flex-col mt-4">
          {/* Header */}
          <div className="bg-white shadow-sm z-20 relative">
            <div className="container px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-azul/10 flex items-center justify-center flex-shrink-0">
                    {workpackage.estado ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-azul/70" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      {workpackage.nome}
                      <Badge className={cn(
                        "ml-2 text-xs rounded-full px-2 py-0.5",
                        workpackage.estado
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : "bg-blue-50 text-azul border-blue-200"
                      )}>
                        {workpackage.estado ? "Concluído" : "Em progresso"}
                      </Badge>
                    </h1>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">  
                      {workpackage.inicio && workpackage.fim && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-azul/70" />
                            <span>
                              {format(new Date(workpackage.inicio), "dd MMM", { locale: ptBR })} - {" "}
                              {format(new Date(workpackage.fim), "dd MMM yyyy", { locale: ptBR })}
                            </span>
                          </span>
                        </>
                      )}
                      
                      <span className="text-gray-300">•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-azul/70" />
                        <span>{duracao} dias</span>
                      </span>
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
              
              <div className="flex space-x-1 mt-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setAddingTarefa(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-5 py-3 rounded-t-lg text-sm transition-all duration-200 font-medium",
                      activeTab === tab.id 
                        ? "bg-azul text-white shadow-md" 
                        : "text-gray-600 hover:text-azul hover:bg-azul/5"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="min-h-[calc(100vh-180px)] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="px-5 py-8"
                >
                  {activeTab === "informacoes" && (
                    <WorkpackageInformacoes 
                  
                      workpackage={workpackage} 
                      workpackageId={workpackage.id}
                      onClose={onClose}
                      onUpdate={onUpdate}
                      mutations={{ updateWorkpackage: mutations.updateWorkpackageMutation }}
                    />
                  )}
                  
                  {activeTab === "tarefas" && (
                    <WorkpackageTarefas
                      workpackage={workpackage}
                      workpackageId={workpackage.id}
                      addingTarefa={addingTarefa}
                      setAddingTarefa={setAddingTarefa}
                    />
                  )}
                  
                  {activeTab === "recursos" && (
                    <WorkpackageRecursos
                      workpackage={workpackage}
                      workpackageId={workpackage.id}
                    />
                  )}
                  
                  {activeTab === "materiais" && (
                    <WorkpackageMateriais
                      workpackage={workpackage}
                      workpackageId={workpackage.id}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
