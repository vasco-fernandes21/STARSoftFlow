"use client";

import { useState, useCallback, useMemo, memo, lazy, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  Users,
  LineChart,
  DollarSign,
  ArrowLeft,
  FileText,
  Calendar,
  Package,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { ProjetoEstado } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { EditarProjeto } from "@/components/projetos/EditarProjeto";
import { StatsGrid } from "@/components/common/StatsGrid";
import type { StatItem } from "@/components/common/StatsGrid";

// Lazy load dos componentes de tab
const CronogramaTab = lazy(() => import("@/components/projetos/tabs/Cronograma"));
const ProjetoFinancas = lazy(() => import("@/components/projetos/tabs/ProjetoFinancas"));
const ProjetoRecursos = lazy(() => import("@/components/projetos/tabs/ProjetoRecursos"));
const ProjetoMateriais = lazy(() => import("@/components/projetos/tabs/ProjetoMateriais"));
const VisaoGeral = lazy(() => import("@/components/projetos/tabs/VisaoGeral"));

// Componente para o breadcrumb
const ProjectBreadcrumb = memo(
  ({ nome, estado, onBack }: { nome: string; estado: ProjetoEstado; onBack: () => void }) => (
    <div className="-ml-2 flex w-full items-center justify-between">
      <div className="flex items-center text-sm font-medium">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex h-7 items-center gap-1 px-2 py-0 text-gray-500 hover:text-azul"
          aria-label="Voltar para projetos"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Projetos</span>
        </Button>
        <span className="mx-1 text-gray-400">/</span>
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              estado === "CONCLUIDO"
                ? "bg-emerald-500"
                : estado === "PENDENTE"
                  ? "bg-amber-500"
                  : "bg-blue-500"
            )}
          ></div>
          <span className="max-w-[300px] truncate text-gray-700 sm:max-w-[400px]" title={nome}>
            {nome.length > 30 ? `${nome.substring(0, 30)}...` : nome}
          </span>
        </div>
      </div>
    </div>
  )
);

// Componente para o cabeçalho do projeto
const ProjectHeader = memo(
  ({
    nome,
    descricao,
    editTrigger,
  }: {
    nome: string;
    descricao?: string | null;
    editTrigger?: React.ReactNode;
  }) => (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{nome}</h1>
        {editTrigger}
      </div>

      {descricao && (
        <div className="w-full">
          <p className="text-base leading-relaxed text-gray-500">{descricao}</p>
        </div>
      )}
    </div>
  )
);

// Componente para os cards de estatísticas
const StatisticsCards = memo(
  ({
    workpackagesCount,
    totalTarefas,
    tarefasConcluidas,
    tarefasPendentes,
    dataInicio,
    dataFim,
    duracaoMeses,
    progresso,
  }: {
    workpackagesCount: number;
    totalTarefas: number;
    tarefasConcluidas: number;
    tarefasPendentes: number;
    dataInicio: Date | null;
    dataFim: Date | null;
    duracaoMeses: number;
    progresso: number;
  }) => {
    const stats: Array<StatItem> = [
      {
        icon: FileText,
        label: "WorkPackages",
        value: workpackagesCount,
        iconClassName: "text-blue-600",
        iconContainerClassName: "bg-blue-50/80",
        statusCount: {
          completed: workpackagesCount > 0 ? Math.round(workpackagesCount * progresso) : 0,
          pending:
            workpackagesCount > 0
              ? workpackagesCount - Math.round(workpackagesCount * progresso)
              : 0,
          completedLabel: "concluídos",
          pendingLabel: "pendentes",
        },
      },
      {
        icon: CalendarClock,
        label: "Tarefas",
        value: totalTarefas,
        iconClassName: "text-green-600",
        iconContainerClassName: "bg-green-50/80",
        statusCount: {
          completed: tarefasConcluidas,
          pending: tarefasPendentes,
          completedLabel: "concluídas",
          pendingLabel: "pendentes",
        },
      },
      {
        icon: Calendar,
        label: "Período",
        value: dataInicio && dataFim ? duracaoMeses : 0,
        suffix: dataInicio && dataFim ? " meses" : "",
        iconClassName: "text-yellow -600",
        iconContainerClassName: "bg-yellow-50/80",
        secondaryText:
          dataInicio && dataFim
            ? `${dataInicio.toLocaleDateString("pt")} - ${dataFim.toLocaleDateString("pt")}`
            : "Não definido",
      },
      {
        icon: LineChart,
        label: "Progresso",
        value: Math.round(progresso * 100),
        suffix: "%",
        iconClassName:
          progresso >= 0.75
            ? "text-emerald-600"
            : progresso >= 0.5
              ? "text-amber-600"
              : "text-rose-600",
        iconContainerClassName:
          progresso >= 0.75
            ? "bg-emerald-50/80"
            : progresso >= 0.5
              ? "bg-amber-50/80"
              : "bg-rose-50/80",
      },
    ];

    return (
      <div className="pb-1">
        <StatsGrid stats={stats} className="lg:grid-cols-4" />
      </div>
    );
  }
);

// Componente para as tabs
const ProjectTabs = memo(
  ({
    separadorAtivo,
    onTabChange,
    projeto,
    calculatedValues,
    onUpdateWorkPackage,
    onUpdateTarefa,
  }: {
    separadorAtivo: string;
    onTabChange: (value: string) => void;
    projeto: any;
    calculatedValues: any;
    onUpdateWorkPackage: () => Promise<void>;
    onUpdateTarefa: () => Promise<void>;
  }) => (
    <Tabs value={separadorAtivo} onValueChange={onTabChange} className="flex flex-1 flex-col">
      <div className="w-full">
        <TabsList className="glass-bg inline-flex h-auto rounded-xl border border-white/30 p-1 shadow-md">
          <TabsTrigger
            value="cronograma"
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2",
              separadorAtivo === "cronograma" ? "text-customBlue" : "text-gray-600"
            )}
          >
            <CalendarClock className="h-4 w-4" />
            <span>Cronograma</span>
          </TabsTrigger>
          <TabsTrigger
            value="overview"
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2",
              separadorAtivo === "overview" ? "text-customBlue" : "text-gray-600"
            )}
          >
            <FileText className="h-4 w-4" />
            <span>Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger
            value="resources"
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2",
              separadorAtivo === "resources" ? "text-customBlue" : "text-gray-600"
            )}
          >
            <Users className="h-4 w-4" />
            <span>Recursos</span>
          </TabsTrigger>
          <TabsTrigger
            value="materials"
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2",
              separadorAtivo === "materials" ? "text-customBlue" : "text-gray-600"
            )}
          >
            <Package className="h-4 w-4" />
            <span>Materiais</span>
          </TabsTrigger>
          <TabsTrigger
            value="finances"
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2",
              separadorAtivo === "finances" ? "text-customBlue" : "text-gray-600"
            )}
          >
            <DollarSign className="h-4 w-4" />
            <span>Finanças</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="mt-3 min-h-[calc(100vh-250px)] flex-1">
        <TabsContent value="cronograma" className="h-full">
          {calculatedValues.dataInicio && calculatedValues.dataFim && (
            <Suspense fallback={<div>A carregar cronograma...</div>}>
              <Card className="glass-card h-full overflow-hidden rounded-2xl border-white/20 shadow-xl">
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
          <Card className="glass-card h-full rounded-2xl border-white/20 shadow-xl">
            <CardContent className="h-full p-6">
              <Suspense fallback={<div>A carregar dados de recursos...</div>}>
                <ProjetoRecursos projetoId={projeto.id} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="h-full">
          <Card className="glass-card h-full rounded-2xl border-white/20 shadow-xl">
            <CardContent className="h-full p-6">
              <Suspense fallback={<div>A carregar dados de materiais...</div>}>
                <ProjetoMateriais projetoId={projeto.id} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finances" className="h-full">
          <Card className="glass-card h-full rounded-2xl border-white/20 shadow-xl">
            <CardContent className="h-full p-6">
              <Suspense fallback={<div>A carregar finanças...</div>}>
                <ProjetoFinancas projetoId={projeto.id} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </Tabs>
  )
);

// Componente principal
export default function DetalheProjeto() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [separadorAtivo, setSeparadorAtivo] = useState("cronograma");
  const queryClient = useQueryClient();

  // Query principal do projeto
  const {
    data: projeto,
    isLoading,
    error,
  } = api.projeto.findById.useQuery(id, {
    enabled: !!id,
    staleTime: 30 * 1000, // 30 segundos
  });

  // Query para obter os financiamentos
  const { data: financiamentosData } = api.financiamento.findAll.useQuery(
    { limit: 100 },
    {
      enabled: !!id,
    }
  );

  const financiamentos = useMemo(() => {
    if (!financiamentosData?.items) return [];
    return financiamentosData.items.map((item) => ({
      id: item.id,
      nome: item.nome,
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
      responsavel: projeto.responsavel,
    };
  }, [projeto]);

  // Callbacks memorizados
  const handleBack = useCallback(() => router.push("/projetos"), [router]);

  const handleUpdateWorkPackage = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: ["projeto.findById", id],
    });
  }, [queryClient, id]);

  const handleUpdateTarefa = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: ["projeto.findById", id],
    });
  }, [queryClient, id]);

  // Valores calculados memorizados
  const calculatedValues = useMemo(() => {
    if (!projeto) return null;

    const totalTarefas = projeto.workpackages.reduce(
      (acc: number, wp) => acc + wp.tarefas.length,
      0
    );
    const tarefasConcluidas = projeto.workpackages.reduce(
      (acc: number, wp) => acc + wp.tarefas.filter((tarefa) => tarefa.estado).length,
      0
    );
    const tarefasPendentes = totalTarefas - tarefasConcluidas;

    const dataInicio = projeto.inicio ? new Date(projeto.inicio) : null;
    const dataFim = projeto.fim ? new Date(projeto.fim) : null;
    const duracaoMeses =
      dataInicio && dataFim
        ? (dataFim.getFullYear() - dataInicio.getFullYear()) * 12 +
          (dataFim.getMonth() - dataInicio.getMonth())
        : 0;

    return {
      totalTarefas,
      tarefasConcluidas,
      tarefasPendentes,
      dataInicio,
      dataFim,
      duracaoMeses,
    };
  }, [projeto]);

  // Verifica se o projeto tem responsável
  const temResponsavel = useMemo(() => {
    return projeto?.responsavel !== null && projeto?.responsavel !== undefined;
  }, [projeto]);

  // Loading e error states
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-azul/20 border-t-azul"></div>
        <span className="ml-3">A carregar...</span>
      </div>
    );
  }

  if (error || !projeto || !calculatedValues || !projetoFormatado) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-500">
        Erro ao carregar o projeto ou projeto não encontrado.
      </div>
    );
  }

  const { totalTarefas, tarefasConcluidas, tarefasPendentes, dataInicio, dataFim, duracaoMeses } =
    calculatedValues;

  return (
    <div className="h-full bg-[#F7F9FC] p-8">
      <div className="max-w-8xl mx-auto space-y-4">
        <ProjectBreadcrumb nome={projeto.nome} estado={projeto.estado} onBack={handleBack} />

        <ProjectHeader
          nome={projeto.nome}
          descricao={projeto.descricao}
          editTrigger={
            temResponsavel && projetoFormatado ? (
              <EditarProjeto projeto={projetoFormatado} financiamentos={financiamentos} />
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
