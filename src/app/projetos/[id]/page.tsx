"use client";

import { useState, useCallback, useMemo, memo, lazy, Suspense, useEffect } from "react";
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
  Check,
  X,
  Loader2,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { ProjetoEstado } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { EditarProjeto } from "@/components/projetos/EditarProjeto";
import { StatsGrid } from "@/components/common/StatsGrid";
import type { StatItem } from "@/components/common/StatsGrid";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSession } from "next-auth/react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { WorkpackageForm } from "@/components/projetos/criar/novo/workpackages/workpackage/form";

// Lazy load dos componentes de tab
const CronogramaTab = lazy(() => import("@/components/projetos/tabs/Cronograma"));
const ProjetoFinancas = lazy(() => import("@/components/projetos/tabs/ProjetoFinancas"));
const ProjetoRecursos = lazy(() => import("@/components/projetos/tabs/ProjetoRecursos"));
const ProjetoMateriais = lazy(() => import("@/components/projetos/tabs/ProjetoMateriais"));
const VisaoGeral = lazy(() => import("@/components/projetos/tabs/VisaoGeral"));


// Componente para validar projeto (aprovar/rejeitar)
const ValidarProjeto = memo(({ id, nome }: { id: string; nome: string }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isAprovando, setIsAprovando] = useState(false);
  const [isRejeitando, setIsRejeitando] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const validarProjetoMutation = api.projeto.validarProjeto.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        
        // Se o projeto foi rejeitado e removido, redirecionar para a lista de projetos
        if (!data.data) {
          router.push("/projetos");
        } else {
          // Atualizar cache se o projeto foi aprovado
          void queryClient.invalidateQueries({ 
            queryKey: [["projeto", "findById"], { input: id }] 
          });
        }
      }
      setIsAprovando(false);
      setIsRejeitando(false);
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      setIsAprovando(false);
      setIsRejeitando(false);
    },
  });

  const handleAprovar = () => {
    setIsAprovando(true);
    validarProjetoMutation.mutate({ 
      id, 
      aprovar: true 
    });
  };

  const handleRejeitar = () => {
    setIsRejeitando(true);
    validarProjetoMutation.mutate({ 
      id, 
      aprovar: false 
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleAprovar}
        disabled={isAprovando || isRejeitando}
        variant="outline"
        size="sm"
        className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
      >
        {isAprovando ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <Check className="mr-1 h-4 w-4" />
        )}
        <span>Aprovar</span>
      </Button>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={isAprovando || isRejeitando}
          >
            <X className="mr-1 h-4 w-4" />
            <span>Rejeitar</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Projeto</AlertDialogTitle>
            <AlertDialogDescription>
              {`Tem a certeza que pretende rejeitar o projeto "${nome}"? Esta ação não pode ser revertida.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleRejeitar}
              disabled={isRejeitando}
            >
              {isRejeitando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Rejeitar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

// Componente para o breadcrumb
const ProjectBreadcrumb = memo(
  ({ nome, estado, onBack, isValidator, projetoId }: { nome: string; estado: ProjetoEstado; onBack: () => void; isValidator: boolean; projetoId: string }) => (
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
      
      {/* Botões de validação - aparecem apenas se projeto está pendente e o utilizador é validador */}
      {estado === "PENDENTE" && isValidator && (
        <ValidarProjeto id={projetoId} nome={nome} />
      )}
    </div>
  )
);

// Componente para o cabeçalho do projeto
const ProjectHeader = memo(
  ({
    nome,
    descricao,
    editTrigger,
    onViewModeChange,
    viewMode,
    canToggleView,
  }: {
    nome: string;
    descricao?: string | null;
    editTrigger?: React.ReactNode;
    onViewModeChange?: (mode: 'real' | 'submetido') => void;
    viewMode?: 'real' | 'submetido';
    canToggleView?: boolean;
  }) => (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{nome}</h1>
          {editTrigger}
        </div>
        
        {canToggleView && onViewModeChange && (
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && onViewModeChange(v as 'real' | 'submetido')}>
              <ToggleGroupItem value="real" aria-label="Ver dados reais" className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm",
                viewMode === 'real' ? "bg-blue-50 text-blue-700" : "text-gray-600"
              )}>
                <LineChart className="h-4 w-4" />
                <span>Dados Reais</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="submetido" aria-label="Ver dados submetidos" className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm",
                viewMode === 'submetido' ? "bg-amber-50 text-amber-700" : "text-gray-600"
              )}>
                <FileText className="h-4 w-4" />
                <span>Dados Submetidos</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
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
    estado,
  }: {
    workpackagesCount: number;
    totalTarefas: number;
    tarefasConcluidas: number;
    tarefasPendentes: number;
    dataInicio: Date | null;
    dataFim: Date | null;
    duracaoMeses: number;
    progresso: number;
    estado: ProjetoEstado;
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
        iconClassName: "text-yellow-600",
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
        secondaryText: estado
          .split("_")
          .map((word: string) => word.charAt(0) + word.slice(1).toLowerCase())
          .join(" "),
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
    disableInteractions,
    openNovoWP,
    setOpenNovoWP,
  }: {
    separadorAtivo: string;
    onTabChange: (value: string) => void;
    projeto: any;
    calculatedValues: any;
    onUpdateWorkPackage: () => Promise<void>;
    onUpdateTarefa: () => Promise<void>;
    disableInteractions: boolean;
    openNovoWP: boolean;
    setOpenNovoWP: (open: boolean) => void;
  }) => {
    const params = useParams<{ id: string }>();
    const projetoId = params?.id || "";
    const { isGestor, isAdmin } = usePermissions();
    const { data: session } = useSession();
    const usuarioAtualId = session?.user?.id;

    // Verifica se o utilizador atual é o responsável pelo projeto
    const isResponsavel = projeto?.responsavel?.id === usuarioAtualId;

    // Define quais tabs o utilizador pode ver
    const podeVerTodasTabs = isAdmin || isGestor || isResponsavel;

    const utils = api.useUtils();

    const createWorkpackage = api.workpackage.create.useMutation({
      onSuccess: () => {
        toast.success("Workpackage criado com sucesso!");
        setOpenNovoWP(false);
        utils.projeto.findById.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao criar workpackage");
      },
    });

    // Define as tabs disponíveis baseado nas permissões
    const availableTabs = [
      { id: "cronograma", label: "Cronograma", icon: CalendarClock },
      { id: "overview", label: "Visão Geral", icon: FileText },
      ...(podeVerTodasTabs
        ? [
            { id: "resources", label: "Recursos", icon: Users },
            { id: "materials", label: "Materiais", icon: Package },
            { id: "finances", label: "Finanças", icon: DollarSign }
          ]
        : [])
    ];

    // Se o separador ativo não estiver disponível, muda para o primeiro disponível
    useEffect(() => {
      if (!availableTabs.some(tab => tab.id === separadorAtivo)) {
        onTabChange(availableTabs[0]?.id || "");
      }
    }, [separadorAtivo, availableTabs, onTabChange]);

    return (
      <Tabs value={separadorAtivo} onValueChange={onTabChange} className="flex flex-1 flex-col">
        <div className="w-full flex items-center justify-between">
          <div className="flex space-x-3">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = separadorAtivo === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "group flex items-center rounded-full border transition-all duration-300 ease-in-out",
                    isActive
                      ? "border-azul/20 bg-white/80 px-5 py-2 text-azul shadow-sm"
                      : "border-transparent bg-white/10 px-3 py-2 text-slate-600 hover:bg-white/30"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300",
                    isActive
                      ? "bg-azul/10 text-azul"
                      : "bg-white/70 text-slate-600 group-hover:bg-azul/5 group-hover:text-azul"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={cn(
                    "ml-2 text-sm font-medium",
                    !isActive && "group-hover:text-azul"
                  )}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
          {podeVerTodasTabs && (
            <Dialog open={openNovoWP} onOpenChange={setOpenNovoWP}>
              <DialogTrigger asChild>
                <Button
                  className={cn(
                    "relative inline-flex h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
                    "bg-azul text-white shadow-lg",
                    "hover:bg-azul-light hover:shadow-azul/20",
                    "active:bg-azul-dark",
                    "focus:outline-none focus:ring-2 focus:ring-azul/20 focus:ring-offset-2",
                    "disabled:pointer-events-none disabled:opacity-50",
                    "before:absolute before:inset-0 before:-z-10 before:rounded-xl before:bg-gradient-to-b before:from-white/10 before:to-transparent before:opacity-0 before:transition-opacity",
                    "hover:before:opacity-100"
                  )}
                  disabled={disableInteractions}
                >
                  <Plus className="h-4 w-4" />
                  <span>Novo Workpackage</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="overflow-hidden rounded-2xl border-none bg-white/95 p-0 shadow-2xl backdrop-blur-md sm:max-w-[700px]">
                <DialogTitle asChild>
                  <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
                    Criar Novo Workpackage
                  </span>
                </DialogTitle>
                <WorkpackageForm
                  onSubmit={(data) => {
                    createWorkpackage.mutate({
                      ...data,
                      descricao: data.descricao ?? undefined,
                      inicio: data.inicio ? new Date(data.inicio) : undefined,
                      fim: data.fim ? new Date(data.fim) : undefined,
                      projetoId,
                    });
                  }}
                  onCancel={() => setOpenNovoWP(false)}
                  projetoInicio={calculatedValues?.dataInicio || new Date()}
                  projetoFim={calculatedValues?.dataFim || new Date()}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="mt-3 min-h-[calc(100vh-250px)] flex-1">
          <TabsContent value="cronograma" className="h-full">
            {calculatedValues?.dataInicio && calculatedValues?.dataFim && (
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
                        disableInteractions: disableInteractions,
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

          {podeVerTodasTabs && (
            <>
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
            </>
          )}
        </div>
      </Tabs>
    );
  }
);

// Adicionar antes do componente principal:
const getProjetoData = (projeto: any, viewMode: 'real' | 'submetido') => {
  if (!projeto) return null;
  
  if (viewMode === 'submetido' && projeto.estado === "APROVADO" && projeto.aprovado) {
    return {
      ...projeto.aprovado,
      id: projeto.id, // Mantemos o ID original
      estado: projeto.estado, // Mantemos o estado original
    };
  }
  
  return projeto;
};

// Componente principal
export default function DetalheProjeto() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id || "";
  const [separadorAtivo, setSeparadorAtivo] = useState("cronograma");
  const queryClient = useQueryClient();
  const { isGestor, isAdmin } = usePermissions();
  const { data: session } = useSession();
  const usuarioAtualId = session?.user?.id;
  const [viewMode, setViewMode] = useState<'real' | 'submetido'>('real');
  const [openNovoWP, setOpenNovoWP] = useState(false);

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

  // Verifica se o utilizador atual é o responsável pelo projeto
  const isResponsavel = useMemo(() => {
    return temResponsavel && usuarioAtualId === projeto?.responsavel?.id;
  }, [temResponsavel, usuarioAtualId, projeto?.responsavel?.id]);

  // Verifica se o utilizador pode editar o projeto
  const podeEditar = useMemo(() => {
    return isAdmin || isGestor || isResponsavel;
  }, [isAdmin, isGestor, isResponsavel]);

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

  const projetoData = getProjetoData(projeto, viewMode);
  const canToggleView = projeto.estado === "APROVADO" && !!projeto.aprovado;

  return (
    <div className="h-full bg-[#F7F9FC] p-8">
      <div className="max-w-8xl mx-auto space-y-4">
        <ProjectBreadcrumb 
          nome={projeto.nome} 
          estado={projeto.estado} 
          onBack={handleBack} 
          isValidator={isGestor} 
          projetoId={projeto.id} 
        />

        <ProjectHeader
          nome={projeto.nome}
          descricao={projeto.descricao}
          editTrigger={
            podeEditar && projetoFormatado ? (
              <EditarProjeto projeto={projetoFormatado} financiamentos={financiamentos} />
            ) : null
          }
          onViewModeChange={setViewMode}
          viewMode={viewMode}
          canToggleView={canToggleView}
        />

        <StatisticsCards
          workpackagesCount={projetoData?.workpackages.length ?? 0}
          totalTarefas={totalTarefas}
          tarefasConcluidas={tarefasConcluidas}
          tarefasPendentes={tarefasPendentes}
          dataInicio={dataInicio}
          dataFim={dataFim}
          duracaoMeses={duracaoMeses}
          progresso={projetoData?.progresso ?? 0}
          estado={projeto.estado}
        />

        <ProjectTabs
          separadorAtivo={separadorAtivo}
          onTabChange={setSeparadorAtivo}
          projeto={projetoData}
          calculatedValues={calculatedValues}
          onUpdateWorkPackage={handleUpdateWorkPackage}
          onUpdateTarefa={handleUpdateTarefa}
          disableInteractions={viewMode === 'submetido'}
          openNovoWP={openNovoWP}
          setOpenNovoWP={setOpenNovoWP}
        />
      </div>
    </div>
  );
}
