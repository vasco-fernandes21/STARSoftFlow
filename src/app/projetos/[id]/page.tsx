"use client";

import { useState, useCallback, useMemo, memo, lazy, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { CalendarClock, Users, LineChart, DollarSign, ArrowLeft, FileText, Calendar, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { ProjetoEstado } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { EditarProjeto } from "@/components/projetos/EditarProjeto";

// Lazy load dos componentes de tab
const CronogramaTab = lazy(() => import("@/components/projetos/tabs/Cronograma"));
const ProjetoFinancas = lazy(() => import("@/components/projetos/tabs/ProjetoFinancas"));
const ProjetoRecursos = lazy(() => import("@/components/projetos/tabs/ProjetoRecursos"));
const ProjetoMateriais = lazy(() => import("@/components/projetos/tabs/ProjetoMateriais"));
const VisaoGeral = lazy(() => import("@/components/projetos/tabs/VisaoGeral"));

// Componente para o breadcrumb
const ProjectBreadcrumb = memo(({ nome, estado, onBack }: { 
  nome: string, 
  estado: ProjetoEstado, 
  onBack: () => void
}) => (
  <div className="flex items-center justify-between w-full -ml-2">
    <div className="flex items-center text-sm font-medium">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="flex items-center gap-1 h-7 px-2 py-0 text-gray-500 hover:text-azul"
        aria-label="Voltar para projetos"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Projetos</span>
      </Button>
      <span className="text-gray-400 mx-1">/</span>
      <div className="flex items-center gap-1.5">
        <div className={cn(
          "h-2 w-2 rounded-full",
          estado === "CONCLUIDO"
            ? "bg-emerald-500"
            : estado === "PENDENTE"
            ? "bg-amber-500"
            : "bg-blue-500"
        )}></div>
        <span className="truncate max-w-[300px] sm:max-w-[400px] text-gray-700" title={nome}>
          {nome.length > 30 ? `${nome.substring(0, 30)}...` : nome}
        </span>
      </div>
    </div>
  </div>
));

// Componente para o cabeçalho do projeto
const ProjectHeader = memo(({ nome, descricao, editTrigger }: {
  nome: string;
  descricao?: string | null;
  editTrigger?: React.ReactNode;
}) => (
  <div className="w-full space-y-3">
    <div className="flex items-center gap-3">
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
        {nome}
      </h1>
      {editTrigger}
    </div>
    
    {descricao && (
      <div className="w-full">
        <p className="text-base text-gray-500 leading-relaxed">
          {descricao}
        </p>
      </div>
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
          <p className="text-sm text-gray-500">WorkPackages</p>
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
        <TabsTrigger value="materials" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg", separadorAtivo === "materials" ? "text-customBlue" : "text-gray-600")}>
          <Package className="h-4 w-4" />
          <span>Materiais</span>
        </TabsTrigger>
        <TabsTrigger value="finances" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg", separadorAtivo === "finances" ? "text-customBlue" : "text-gray-600")}>
          <DollarSign className="h-4 w-4" />
          <span>Finanças</span>
        </TabsTrigger>
      </TabsList>
    </div>

    <div className="flex-1 mt-3 min-h-[calc(100vh-250px)]">
      <TabsContent value="cronograma" className="h-full">
        {calculatedValues.dataInicio && calculatedValues.dataFim && (
          <Suspense fallback={<div>A carregar cronograma...</div>}>
            <Card className="glass-card border-white/20 shadow-xl overflow-hidden rounded-2xl h-full">
              <div className="h-full">
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
                  }}
                />
              </div>
            </Card>
          </Suspense>
        )}
      </TabsContent>

      <TabsContent value="overview" className="h-full">
        <Suspense fallback={<div>A carregar visão geral...</div>}>
          <VisaoGeral projeto={projeto} />
        </Suspense>
      </TabsContent>

      <TabsContent value="resources" className="h-full">
        <Card className="glass-card border-white/20 shadow-xl rounded-2xl h-full">
          <CardContent className="p-6 h-full">
            <Suspense fallback={<div>A carregar dados de recursos...</div>}>
              <ProjetoRecursos projetoId={projeto.id} />
            </Suspense>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="materials" className="h-full">
        <Card className="glass-card border-white/20 shadow-xl rounded-2xl h-full">
          <CardContent className="p-6 h-full">
            <Suspense fallback={<div>A carregar dados de materiais...</div>}>
              <ProjetoMateriais projetoId={projeto.id} />
            </Suspense>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="finances" className="h-full">
        <Card className="glass-card border-white/20 shadow-xl rounded-2xl h-full">
          <CardContent className="p-6 h-full">
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

  // Query para obter os financiamentos
  const { data: financiamentosData } = api.financiamento.findAll.useQuery({ limit: 100 }, {
    enabled: !!id,
  });

  const financiamentos = useMemo(() => {
    if (!financiamentosData?.items) return [];
    return financiamentosData.items.map(item => ({
      id: item.id,
      nome: item.nome
    }));
  }, [financiamentosData]);

  // Preparar dados do projeto para o componente EditarProjeto
  const projetoFormatado = useMemo(() => {
    if (!projeto) return null;
    return {
      id: projeto.id,
      nome: projeto.nome,
      descricao: projeto.descricao,
      inicio: projeto.inicio,
      fim: projeto.fim,
      overhead: Number(projeto.overhead || 0),
      taxa_financiamento: Number(projeto.taxa_financiamento || 0),
      valor_eti: Number(projeto.valor_eti || 0),
      financiamentoId: projeto.financiamentoId,
      responsavel: projeto.responsavel
    };
  }, [projeto]);

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

  // Verifica se o projeto tem responsável
  const temResponsavel = useMemo(() => {
    return projeto?.responsavel !== null && projeto?.responsavel !== undefined;
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

  if (error || !projeto || !calculatedValues || !projetoFormatado) {
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
    <div className="h-full bg-[#F6F8FA] p-8">
      <div className="max-w-8xl mx-auto space-y-4">
        <ProjectBreadcrumb
          nome={projeto.nome}
          estado={projeto.estado}
          onBack={handleBack}
        />
        
        <ProjectHeader
          nome={projeto.nome}
          descricao={projeto.descricao}
          editTrigger={
            temResponsavel && projetoFormatado ? (
              <EditarProjeto 
                projeto={projetoFormatado} 
                financiamentos={financiamentos}
              />
            ) : null
          }
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
  );
}