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
import { WorkpackageCompleto, ProjetoCompleto } from "@/components/projetos/types";
import type { Workpackage, Tarefa, Entregavel, Material, ProjetoEstado } from "@prisma/client";
import { Decimal } from "decimal.js";

// Tipos para os dados completos que vêm do projeto pai
interface WorkpackageWithRelations extends Workpackage {
  tarefas: (Tarefa & {
    entregaveis: Entregavel[];
  })[];
  materiais: Material[];
  recursos: {
    userId: string;
    mes: number;
    ano: number;
    ocupacao: string;
    user: {
      id: string;
      name: string;
      salario: string;
    };
  }[];
  projeto: {
    id: string;
    nome: string;
    descricao: string | null;
    inicio: Date | null;
    fim: Date | null;
    estado: ProjetoEstado;
    overhead: string | null;
    taxa_financiamento: string | null;
    valor_eti: string | null;
    financiamentoId: number | null;
  };
}

interface MenuWorkpackageProps {
  workpackageId: string;
  onClose: () => void;
  projetoId: string;
  onUpdate: () => Promise<void>;
  open: boolean;
  workpackage?: WorkpackageCompleto; // Usar o tipo específico
  projeto?: ProjetoCompleto; // Usar o tipo específico
}

// Add a helper function to handle the type conversion safely
function convertToWorkpackageCompleto(wp: any, proj?: any): WorkpackageCompleto {
  const defaultDate = new Date();

  return {
    id: wp?.id || "",
    nome: wp?.nome || "",
    descricao: wp?.descricao || "",
    projetoId: wp?.projetoId || "",
    inicio: wp?.inicio ? new Date(wp.inicio) : defaultDate,
    fim: wp?.fim ? new Date(wp.fim) : defaultDate,
    estado: wp?.estado || false,
    tarefas: wp?.tarefas || [],
    materiais: wp?.materiais || [],
    recursos: wp?.recursos || [],
    projeto: wp?.projeto ? {
      id: wp.projeto.id || "",
      nome: wp.projeto.nome || "",
      descricao: wp.projeto.descricao || "",
      inicio: wp.projeto.inicio ? new Date(wp.projeto.inicio) : defaultDate,
      fim: wp.projeto.fim ? new Date(wp.projeto.fim) : defaultDate,
      estado: wp.projeto.estado || "EM_ANDAMENTO",
      overhead: typeof wp.projeto.overhead === 'string' ? new Decimal(wp.projeto.overhead) : (wp.projeto.overhead || new Decimal(0)),
      taxa_financiamento: typeof wp.projeto.taxa_financiamento === 'string' ? new Decimal(wp.projeto.taxa_financiamento) : (wp.projeto.taxa_financiamento || new Decimal(0)),
      valor_eti: typeof wp.projeto.valor_eti === 'string' ? new Decimal(wp.projeto.valor_eti) : (wp.projeto.valor_eti || new Decimal(0)),
      financiamentoId: wp.projeto.financiamentoId || 0,
      responsavelId: wp.projeto.responsavelId || ""
    } : proj ? {
      id: proj.id || "",
      nome: proj.nome || "",
      descricao: proj.descricao || "",
      inicio: proj.inicio ? new Date(proj.inicio) : defaultDate,
      fim: proj.fim ? new Date(proj.fim) : defaultDate,
      estado: proj.estado || "EM_ANDAMENTO",
      overhead: typeof proj.overhead === 'string' ? new Decimal(proj.overhead) : (proj.overhead || new Decimal(0)),
      taxa_financiamento: typeof proj.taxa_financiamento === 'string' ? new Decimal(proj.taxa_financiamento) : (proj.taxa_financiamento || new Decimal(0)),
      valor_eti: typeof proj.valor_eti === 'string' ? new Decimal(proj.valor_eti) : (proj.valor_eti || new Decimal(0)),
      financiamentoId: proj.financiamentoId || 0,
      responsavelId: proj.responsavelId || ""
    } : {
      id: "",
      nome: "",
      descricao: "",
      inicio: defaultDate,
      fim: defaultDate,
      estado: "EM_ANDAMENTO",
      overhead: new Decimal(0),
      taxa_financiamento: new Decimal(0),
      valor_eti: new Decimal(0),
      financiamentoId: 0,
      responsavelId: ""
    }
  } as WorkpackageCompleto;
}

export function MenuWorkpackage({ 
  workpackageId, 
  onClose, 
  projetoId, 
  onUpdate, 
  open, 
  workpackage: externalWorkpackage,
  projeto 
}: MenuWorkpackageProps) {
  const [addingTarefa, setAddingTarefa] = useState(false);
  const [workpackageEstado, setWorkpackageEstado] = useState(false);
  
  // Se não temos o workpackage externamente, buscar da API
  const { data: apiWorkpackage, isLoading } = api.workpackage.findById.useQuery({ id: workpackageId }, {
    staleTime: 1000 * 30, // 30 segundos
    enabled: !!workpackageId && open && !externalWorkpackage,
  });

  // Usar o workpackage fornecido ou o que veio da API
  const workpackage = externalWorkpackage || apiWorkpackage;

  // Converter para o formato correto com valores não-nulos
  const fullWorkpackage = workpackage ? convertToWorkpackageCompleto(workpackage, projeto) : undefined;

  useEffect(() => {
    if (!open) setAddingTarefa(false);
    if (fullWorkpackage) {
      setWorkpackageEstado(fullWorkpackage.estado);
    }
  }, [open, fullWorkpackage]);

  const handleSave = async () => {
    await onUpdate();
    onClose();
  };

  // Loading state enquanto buscamos dados da API (só se necessário)
  if (!externalWorkpackage && isLoading) {
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

  if (!fullWorkpackage) {
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
                    {fullWorkpackage.estado ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-azul/70" />
                    )}
                  </div>
                  <h1 className="text-xl font-bold text-gray-900">{fullWorkpackage.nome}</h1>
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
                  projetoId={projetoId}
                  workpackage={fullWorkpackage}
                />
              </div>
              <div className="px-5 py-6">
                <WorkpackageTarefas
                  workpackage={fullWorkpackage}
                  workpackageId={fullWorkpackage.id}
                  addingTarefa={addingTarefa}
                  setAddingTarefa={setAddingTarefa}
                  projetoId={projetoId}
                />
              </div>
              <div className="px-5 py-6">
                <WorkpackageRecursos 
                  workpackage={fullWorkpackage} 
                  workpackageId={fullWorkpackage.id}
                  projetoId={projetoId} 
                />
              </div>
              <div className="px-5 py-6">
                <WorkpackageMateriais 
                  workpackage={fullWorkpackage} 
                  workpackageId={fullWorkpackage.id}
                  projetoId={projetoId} 
                />
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}