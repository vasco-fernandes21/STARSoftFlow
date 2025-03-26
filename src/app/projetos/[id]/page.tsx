"use client";

import { useState, useCallback, useMemo, memo, lazy, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { CalendarClock, Users, LineChart, DollarSign, ArrowLeft, FileText, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjetoEstado } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";

// Lazy load dos componentes de tab
const CronogramaTab = lazy(() => import("@/components/projetos/tabs/Cronograma"));
const ProjetoFinancas = lazy(() => import("@/components/projetos/tabs/ProjetoFinancas"));

// Mapeamento de estados para texto
const ESTADO_MAP: Record<ProjetoEstado, string> = {
  RASCUNHO: "Rascunho",
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  EM_DESENVOLVIMENTO: "Em Desenvolvimento",
  CONCLUIDO: "Concluído",
};

// Componente para o breadcrumb
const ProjectBreadcrumb = memo(({ nome, estado, onBack }: { 
  nome: string, 
  estado: ProjetoEstado, 
  onBack: () => void 
}) => (
  <div className="sticky top-3 z-10 bg-gradient-to-b from-gray-50/90 to-transparent backdrop-blur-[2px] pt-2 pb-1 px-4">
    <div className="max-w-8xl mx-auto">
      <div className="flex items-center">
        <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all duration-300 border border-white/40 group">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-1.5 h-6 px-1.5 py-0 hover:bg-blue-50 transition-colors"
            aria-label="Voltar para projetos"
          >
            <ArrowLeft className="h-3 w-3 text-gray-600 group-hover:text-customBlue transition-colors" />
            <span className="text-gray-600 hover:text-customBlue font-medium transition-colors text-sm hidden sm:inline-flex">
              Projetos
            </span>
          </Button>
          
          <span className="text-gray-400">/</span>
          
          <div className="flex items-center gap-1.5 transition-all duration-300 hover:bg-white/90 rounded-full pl-1 pr-2 py-0.5">
            <div className={cn(
              "h-2 w-2 rounded-full transition-colors duration-300",
              estado === "CONCLUIDO"
                ? "bg-emerald-500"
                : estado === "PENDENTE"
                ? "bg-amber-500"
                : "bg-blue-500"
            )}></div>
            <span className="text-sm truncate max-w-[300px] sm:max-w-[400px] font-medium text-gray-800" title={nome}>
              {nome.length > 30 ? `${nome.substring(0, 30)}...` : nome}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
));

// Componente para o cabeçalho do projeto
const ProjectHeader = memo(({ nome, estado, descricao }: {
  nome: string;
  estado: ProjetoEstado;
  descricao?: string | null;
}) => (
  <div className="flex flex-col gap-2 mt-1 ml-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900">{nome}</h1>
        <Badge
          variant="outline"
          className={cn(
            estado === "CONCLUIDO"
              ? "bg-emerald-50/70 text-emerald-600 border-emerald-200"
              : estado === "PENDENTE"
              ? "bg-amber-50/70 text-amber-600 border-amber-200"
              : "bg-blue-50/70 text-customBlue border-blue-200"
          )}
        >
          {ESTADO_MAP[estado]}
        </Badge>
      </div>
    </div>
    
    {descricao && (
      <p className="text-sm text-gray-500">{descricao}</p>
    )}
  </div>
));

// Componente para os cards de estatísticas
const StatisticsCards = memo(({ 
  workpackagesCount, 
  totalTarefas, 
  tarefasConcluidas, 
  tarefasPendentes,
  dataInicio,
  dataFim,
  duracaoMeses,
  progresso
}: {
  workpackagesCount: number;
  totalTarefas: number;
  tarefasConcluidas: number;
  tarefasPendentes: number;
  dataInicio: Date | null;
  dataFim: Date | null;
  duracaoMeses: number;
  progresso: number;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-1">
    <Card className="glass-card border-white/20 shadow-md hover:shadow-lg transition-shadow duration-200 rounded-xl h-full">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-blue-50/70 flex items-center justify-center shadow-md">
          <FileText className="h-5 w-5 text-customBlue" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Work Packages</p>
          <p className="text-2xl font-semibold">{workpackagesCount}</p>
        </div>
      </CardContent>
    </Card>
    <Card className="glass-card border-white/20 shadow-md hover:shadow-lg transition-shadow duration-200 rounded-xl h-full">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-purple-50/70 flex items-center justify-center shadow-md">
          <CalendarClock className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Tarefas</p>
          <p className="text-2xl font-semibold">{totalTarefas}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1"></span>
              {tarefasConcluidas} Concluídas
            </span>
            <span className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-amber-500 mr-1"></span>
              {tarefasPendentes} Pendentes
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
    <Card className="glass-card border-white/20 shadow-md hover:shadow-lg transition-shadow duration-200 rounded-xl h-full">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-amber-50/70 flex items-center justify-center shadow-md">
          <Calendar className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Período</p>
          <p className="text-base font-semibold">
            {dataInicio?.toLocaleDateString("pt")} - {dataFim?.toLocaleDateString("pt")}
          </p>
          <p className="text-xs text-gray-500">{duracaoMeses} meses</p>
        </div>
      </CardContent>
    </Card>
    <Card className="glass-card border-white/20 shadow-md hover:shadow-lg transition-shadow duration-200 rounded-xl h-full">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-emerald-50/70 flex items-center justify-center shadow-md">
          <LineChart className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="w-full">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">Progresso</p>
            <p className="font-semibold">{Math.round(progresso * 100)}%</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-in-out",
                progresso === 1
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                  : progresso >= 0.75
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                  : progresso >= 0.5
                  ? "bg-gradient-to-r from-blue-400 to-blue-500"
                  : progresso >= 0.25
                  ? "bg-gradient-to-r from-amber-400 to-amber-500"
                  : "bg-gradient-to-r from-rose-400 to-rose-500"
              )}
              style={{ width: `${progresso * 100}%` }}
            ></div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
));

// Componente para a tab de Overview
const OverviewTab = memo(({ 
  dataInicio, 
  dataFim, 
  duracaoMeses, 
  financiamento 
}: {
  dataInicio: Date | null;
  dataFim: Date | null;
  duracaoMeses: number;
  financiamento?: { nome: string } | null;
}) => (
  <Card className="glass-card border-white/20 shadow-xl rounded-2xl">
    <CardHeader className="border-b border-white/10 px-6 py-4 bg-white/70 backdrop-blur-sm">
      <CardTitle className="text-lg font-semibold text-gray-900">Detalhes do Projeto</CardTitle>
    </CardHeader>
    <CardContent className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">Informações Gerais</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Data de Início</p>
              <p className="font-medium">{dataInicio?.toLocaleDateString("pt-BR") || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Data de Fim</p>
              <p className="font-medium">{dataFim?.toLocaleDateString("pt-BR") || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Duração</p>
              <p className="font-medium">{duracaoMeses} meses</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Financiamento</p>
              <p className="font-medium">{financiamento?.nome || "Nenhum"}</p>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
));

// Componente para a tab de Resources
const ResourcesTab = memo(() => (
  <Card className="glass-card border-white/20 shadow-xl rounded-2xl">
    <CardHeader className="border-b border-white/10 px-6 py-4 bg-white/70 backdrop-blur-sm">
      <CardTitle className="text-lg font-semibold text-gray-900">Recursos</CardTitle>
    </CardHeader>
    <CardContent className="p-6">
      <p className="text-sm text-gray-600">Recursos ainda não implementados nesta vista.</p>
    </CardContent>
  </Card>
));

// Componente para as tabs
const ProjectTabs = memo(({ 
  separadorAtivo, 
  onTabChange,
  projeto,
  calculatedValues,
  onUpdateWorkPackage,
  onUpdateTarefa
}: {
  separadorAtivo: string;
  onTabChange: (value: string) => void;
  projeto: any;
  calculatedValues: any;
  onUpdateWorkPackage: () => Promise<void>;
  onUpdateTarefa: () => Promise<void>;
}) => (
  <Tabs value={separadorAtivo} onValueChange={onTabChange} className="flex-1 flex flex-col">
    <div className="w-full">
      <TabsList className="glass-bg p-1 h-auto border border-white/30 rounded-xl shadow-md inline-flex">
        <TabsTrigger value="cronograma" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg", separadorAtivo === "cronograma" ? "text-customBlue" : "text-gray-600")}>
          <CalendarClock className="h-4 w-4" />
          <span>Cronograma</span>
        </TabsTrigger>
        <TabsTrigger value="overview" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg", separadorAtivo === "overview" ? "text-customBlue" : "text-gray-600")}>
          <FileText className="h-4 w-4" />
          <span>Visão Geral</span>
        </TabsTrigger>
        <TabsTrigger value="resources" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg", separadorAtivo === "resources" ? "text-customBlue" : "text-gray-600")}>
          <Users className="h-4 w-4" />
          <span>Recursos</span>
        </TabsTrigger>
        <TabsTrigger value="finances" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg", separadorAtivo === "finances" ? "text-customBlue" : "text-gray-600")}>
          <DollarSign className="h-4 w-4" />
          <span>Finanças</span>
        </TabsTrigger>
      </TabsList>
    </div>

    <div className="flex-1 overflow-y-auto">
      <TabsContent value="cronograma" className="mt-6">
        {calculatedValues.dataInicio && calculatedValues.dataFim && (
          <Suspense fallback={<div>A carregar cronograma...</div>}>
            <Card className="glass-card border-white/20 shadow-xl overflow-hidden rounded-2xl">
              <div className="h-[calc(100vh-420px)]">
                <CronogramaTab
                  projeto={projeto}
                  workpackages={projeto.workpackages}
                  startDate={calculatedValues.dataInicio}
                  endDate={calculatedValues.dataFim}
                  onUpdateWorkPackage={onUpdateWorkPackage}
                  onUpdateTarefa={onUpdateTarefa}
                  projetoId={projeto.id}
                  options={{
                    leftColumnWidth: 300,
                    disableInteractions: false,
                    compactMode: false,
                  }}
                />
              </div>
            </Card>
          </Suspense>
        )}
      </TabsContent>

      <TabsContent value="overview" className="mt-4">
        <OverviewTab 
          dataInicio={calculatedValues.dataInicio}
          dataFim={calculatedValues.dataFim}
          duracaoMeses={calculatedValues.duracaoMeses}
          financiamento={projeto.financiamento}
        />
      </TabsContent>

      <TabsContent value="resources" className="mt-4">
        <ResourcesTab />
      </TabsContent>

      <TabsContent value="finances" className="mt-4">
        <Card className="glass-card border-white/20 shadow-xl rounded-2xl">
          <CardContent className="p-6">
            <Suspense fallback={<div>A carregar finanças...</div>}>
              <ProjetoFinancas projetoId={projeto.id} />
            </Suspense>
          </CardContent>
        </Card>
      </TabsContent>
    </div>
  </Tabs>
));

// Componente principal
export default function DetalheProjeto() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [separadorAtivo, setSeparadorAtivo] = useState("cronograma");
  const queryClient = useQueryClient();

  // Query principal do projeto
  const { data: projeto, isLoading, error } = api.projeto.findById.useQuery(id, {
    enabled: !!id,
    staleTime: 30 * 1000, // 30 segundos
  });

  // Callbacks memorizados
  const handleBack = useCallback(() => router.push('/projetos'), [router]);
  
  const handleUpdateWorkPackage = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: ['projeto.findById', id]
    });
  }, [queryClient, id]);

  const handleUpdateTarefa = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: ['projeto.findById', id]
    });
  }, [queryClient, id]);

  // Valores calculados memorizados
  const calculatedValues = useMemo(() => {
    if (!projeto) return null;

    const totalTarefas = projeto.workpackages.reduce((acc: number, wp) => acc + wp.tarefas.length, 0);
    const tarefasConcluidas = projeto.workpackages.reduce(
      (acc: number, wp) => acc + wp.tarefas.filter((tarefa) => tarefa.estado).length,
      0
    );
    const tarefasPendentes = totalTarefas - tarefasConcluidas;

    const dataInicio = projeto.inicio ? new Date(projeto.inicio) : null;
    const dataFim = projeto.fim ? new Date(projeto.fim) : null;
    const duracaoMeses = dataInicio && dataFim
      ? (dataFim.getFullYear() - dataInicio.getFullYear()) * 12 +
        (dataFim.getMonth() - dataInicio.getMonth())
      : 0;

    return {
      totalTarefas,
      tarefasConcluidas,
      tarefasPendentes,
      dataInicio,
      dataFim,
      duracaoMeses
    };
  }, [projeto]);

  // Loading e error states
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-azul/20 border-t-azul rounded-full animate-spin"></div>
        <span className="ml-3">A carregar...</span>
      </div>
    );
  }

  if (error || !projeto || !calculatedValues) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Erro ao carregar o projeto ou projeto não encontrado.
      </div>
    );
  }

  const { 
    totalTarefas, 
    tarefasConcluidas, 
    tarefasPendentes, 
    dataInicio, 
    dataFim, 
    duracaoMeses 
  } = calculatedValues;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 custom-blue-blur">
      <div className="flex-1 overflow-y-auto">
        <ProjectBreadcrumb 
          nome={projeto.nome} 
          estado={projeto.estado} 
          onBack={handleBack} 
        />

        <div className="max-w-8xl mx-auto p-4 space-y-4">
          <ProjectHeader 
            nome={projeto.nome} 
            estado={projeto.estado} 
            descricao={projeto.descricao} 
          />

          <StatisticsCards 
            workpackagesCount={projeto.workpackages.length}
            totalTarefas={totalTarefas}
            tarefasConcluidas={tarefasConcluidas}
            tarefasPendentes={tarefasPendentes}
            dataInicio={dataInicio}
            dataFim={dataFim}
            duracaoMeses={duracaoMeses}
            progresso={projeto.progresso}
          />

          <ProjectTabs
            separadorAtivo={separadorAtivo}
            onTabChange={setSeparadorAtivo}
            projeto={projeto}
            calculatedValues={calculatedValues}
            onUpdateWorkPackage={handleUpdateWorkPackage}
            onUpdateTarefa={handleUpdateTarefa}
          />
        </div>
      </div>
    </div>
  );
}