import { useState, useEffect } from "react";
import { useProjetoForm } from "../../ProjetoFormContext";
import { TabTitle } from "../../components/TabTitle";
import { TabNavigation } from "../../components/TabNavigation";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Code,
  Copy,
  Euro,
  FileText,
  Info,
  Package,
  Percent,
  Check,
  Users,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProjetoCronograma } from "../../ProjetoCronograma";

interface ResumoTabProps {
  onNavigateBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ResumoTab({ onNavigateBack, onSubmit, isSubmitting }: ResumoTabProps) {
  const { state } = useProjetoForm();
  const [showDevTools, setShowDevTools] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCronograma, setShowCronograma] = useState(false);

  // Verificar se o projeto está completo
  const isProjetoValido = Boolean(
    state.nome?.trim() &&
      state.inicio &&
      state.fim &&
      state.overhead !== undefined &&
      state.taxa_financiamento !== undefined &&
      state.valor_eti !== undefined &&
      state.workpackages?.length > 0
  );

  // Formatar data
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "Não definida";
    return date instanceof Date
      ? date.toLocaleDateString("pt-PT")
      : new Date(date).toLocaleDateString("pt-PT");
  };

  // Formatar valor para percentagem
  const formatPercent = (value: any) => {
    if (value === undefined || value === null) return "Não definido";
    return `${Number(value * 100).toFixed(1)}%`;
  };

  // Formatar valor para moeda
  const formatCurrency = (value: any) => {
    if (value === undefined || value === null) return "Não definido";
    return Number(value).toLocaleString("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    });
  };

  // Calcular dados do projeto
  const totalTarefas = state.workpackages?.reduce(
    (total, wp) => total + (wp.tarefas?.length || 0),
    0
  ) || 0;

  const totalRecursos = state.workpackages?.reduce((total, wp) => {
    const usuarios = new Set((wp.recursos || []).map((r) => r.userId));
    return total + usuarios.size;
  }, 0) || 0;

  // Copiar JSON para o clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    setCopied(true);
    toast.success("JSON copiado para o clipboard");

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="flex min-h-[70vh] flex-col">
      <TabTitle
        title="Resumo do Projeto"
        subtitle="Revise as informações antes de finalizar"
        icon={<FileText className="h-5 w-5" />}
      />

      <div className="flex-1 p-6">
        {!isProjetoValido && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <h4 className="font-medium">Informações Incompletas</h4>
            </div>
            <p className="ml-6 mt-1 text-sm text-red-700">
              Algumas informações obrigatórias estão em falta. Por favor, preencha as secções
              anteriores.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Coluna 1: Informações Principais */}
          <div className="flex flex-col gap-6">
            {/* Informações Básicas */}
            <div className="overflow-hidden rounded-xl border border-azul/10 bg-white shadow-sm">
              <div className="border-b border-azul/10 bg-white px-6 py-4">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-azul/60" />
                  <h3 className="font-medium text-azul/90">Informações Básicas</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-1 text-sm font-medium text-azul/60">Nome do Projeto</h4>
                    <p className="text-base text-azul/90">{state.nome || "Não definido"}</p>
                  </div>
                  
                  {state.descricao && (
                    <div>
                      <h4 className="mb-1 text-sm font-medium text-azul/60">Descrição</h4>
                      <p className="rounded-lg bg-azul/5 p-3 text-sm leading-relaxed text-azul/80">
                        {state.descricao}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Datas do Projeto */}
            <div className="overflow-hidden rounded-xl border border-azul/10 bg-white shadow-sm">
              <div className="border-b border-azul/10 bg-white px-6 py-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-azul/60" />
                  <h3 className="font-medium text-azul/90">Cronograma</h3>
                </div>
              </div>
              <div className="divide-y divide-azul/5 rounded-b-xl">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-azul/5">
                      <Calendar className="h-4 w-4 text-azul/60" />
                    </div>
                    <div>
                      <p className="text-xs text-azul/60">Data de Início</p>
                      <p className="font-medium text-azul/90">{formatDate(state.inicio)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-azul/5">
                      <Calendar className="h-4 w-4 text-azul/60" />
                    </div>
                    <div>
                      <p className="text-xs text-azul/60">Data de Conclusão</p>
                      <p className="font-medium text-azul/90">{formatDate(state.fim)}</p>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <Button 
                    onClick={() => setShowCronograma(true)}
                    variant="outline" 
                    className="w-full gap-2 rounded-lg border-azul/20 text-azul/80 hover:bg-azul/5"
                  >
                    <Clock className="h-4 w-4" />
                    Ver Cronograma
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 2: Workpackages e Recursos */}
          <div className="flex flex-col gap-6">
            {/* Finances */}
            <div className="overflow-hidden rounded-xl border border-azul/10 bg-white shadow-sm">
              <div className="border-b border-azul/10 bg-white px-6 py-4">
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-azul/60" />
                  <h3 className="font-medium text-azul/90">Informações Financeiras</h3>
                </div>
              </div>
              <div className="divide-y divide-azul/5 rounded-b-xl">
                <div className="grid grid-cols-2 divide-x divide-azul/5">
                  <div className="p-4">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-azul/5">
                        <Percent className="h-5 w-5 text-azul/60" />
                      </div>
                      <p className="text-xs text-azul/60">Overhead</p>
                      <p className="text-base font-medium text-azul/90">
                        {formatPercent(state.overhead)}
                      </p>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-azul/5">
                        <Percent className="h-5 w-5 text-azul/60" />
                      </div>
                      <p className="text-xs text-azul/60">Taxa de Financiamento</p>
                      <p className="text-base font-medium text-azul/90">
                        {formatPercent(state.taxa_financiamento)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-azul/5">
                      <Euro className="h-5 w-5 text-azul/60" />
                    </div>
                    <p className="text-xs text-azul/60">Valor ETI</p>
                    <p className="text-base font-medium text-azul/90">
                      {formatCurrency(state.valor_eti)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Estatísticas */}
            <div className="overflow-hidden rounded-xl border border-azul/10 bg-white shadow-sm">
              <div className="border-b border-azul/10 bg-white px-6 py-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-azul/60" />
                  <h3 className="font-medium text-azul/90">Estatísticas do Projeto</h3>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-azul/5 rounded-b-xl">
                <div className="p-4">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-azul/5">
                      <FileText className="h-5 w-5 text-azul/60" />
                    </div>
                    <p className="text-xs text-azul/60">Workpackages</p>
                    <p className="text-xl font-medium text-azul/90">
                      {state.workpackages?.length || 0}
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-azul/5">
                      <Check className="h-5 w-5 text-azul/60" />
                    </div>
                    <p className="text-xs text-azul/60">Tarefas</p>
                    <p className="text-xl font-medium text-azul/90">{totalTarefas}</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-azul/5">
                      <Users className="h-5 w-5 text-azul/60" />
                    </div>
                    <p className="text-xs text-azul/60">Recursos</p>
                    <p className="text-xl font-medium text-azul/90">{totalRecursos}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 3: Lista de Workpackages */}
          <div className="flex flex-col gap-6">
            {/* Workpackages List */}
            <div className="overflow-hidden rounded-xl border border-azul/10 bg-white shadow-sm">
              <div className="border-b border-azul/10 bg-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-azul/60" />
                    <h3 className="font-medium text-azul/90">Workpackages</h3>
                  </div>
                  <Badge variant="outline" className="bg-azul/5 text-azul/80">
                    {state.workpackages?.length || 0} workpackage(s)
                  </Badge>
                </div>
              </div>
              <ScrollArea className="h-[450px]">
                <div className="p-4">
                  <div className="space-y-3">
                    {state.workpackages && state.workpackages.length > 0 ? (
                      state.workpackages.map((wp) => (
                        <div
                          key={wp.id}
                          className="overflow-hidden rounded-lg border border-azul/10 transition-all hover:border-azul/20 hover:shadow-sm"
                        >
                          <div className="border-b border-azul/5 bg-white p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-azul/5">
                                  <Package className="h-3.5 w-3.5 text-azul/70" />
                                </div>
                                <h4 className="font-medium text-azul/90">{wp.nome}</h4>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {formatDate(wp.inicio)} - {formatDate(wp.fim)}
                              </Badge>
                            </div>
                          </div>

                          <div className="divide-y divide-azul/5 bg-white/50">
                            {wp.descricao && (
                              <div className="p-3">
                                <p className="text-xs text-azul/70">{wp.descricao.toString()}</p>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 p-3">
                              {wp.tarefas?.length ? (
                                <Badge variant="outline" className="bg-azul/5 text-xs text-azul/70">
                                  <Check className="mr-1 h-3 w-3" />
                                  {wp.tarefas.length} {wp.tarefas.length === 1 ? "tarefa" : "tarefas"}
                                </Badge>
                              ) : null}

                              {wp.recursos?.length ? (
                                <Badge variant="outline" className="bg-azul/5 text-xs text-azul/70">
                                  <Users className="mr-1 h-3 w-3" />
                                  {new Set(wp.recursos.map(r => r.userId)).size} {new Set(wp.recursos.map(r => r.userId)).size === 1 ? "recurso" : "recursos"} 
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-azul/20 p-6 text-center">
                        <p className="text-sm text-azul/60">Nenhum workpackage definido</p>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      <TabNavigation
        onBack={onNavigateBack}
        onSubmit={onSubmit}
        backLabel="Anterior: Recursos"
        submitLabel="Finalizar Projeto"
        isLastStep={true}
        isSubmitting={isSubmitting}
        isSubmitDisabled={!isProjetoValido}
        className="border-t border-azul/10 pt-4"
      />

      {/* Cronograma Dialog */}
      <Dialog open={showCronograma} onOpenChange={setShowCronograma}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-azul/90">
              Cronograma do Projeto
            </DialogTitle>
          </DialogHeader>
          <div className="h-[500px] w-full">
            <ProjetoCronograma state={state} height="100%" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
