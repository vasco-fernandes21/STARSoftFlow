"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { CalendarClock, Users, LineChart, DollarSign, ArrowLeft, FileText, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjetoEstado } from "@prisma/client";
import { Cronograma } from "@/components/projetos/Cronograma";
import { ProjetoFinancas } from "@/components/projetos/tabs/ProjetoFinancas";
import { useQueryClient } from "@tanstack/react-query";
import { TabelaDados, type ColumnConfig, type FilterConfig } from "@/components/common/TabelaDados";

// Interface para localStorage
interface CachedProjeto {
  id: string;
  data: any;
  timestamp: number;
}

// Interface para o projeto com tipos definidos
interface ProjetoData {
  id: string;
  nome: string;
  descricao?: string;
  estado: ProjetoEstado;
  progresso: number;
  inicio: string | null;
  fim: string | null;
  financiamento?: {
    id: number;
    nome: string;
  } | null;
  workpackages: Array<{
    id: string;
    nome: string;
    tarefas: Array<{
      id: string;
      nome: string;
      estado: boolean;
    }>;
  }>;
}

// Cache helper functions
const CACHE_EXPIRATION = 30 * 60 * 1000; // 30 minutos em ms

function saveProjetoToLocalCache(id: string, data: ProjetoData): void {
  try {
    const cacheItem: CachedProjeto = {
      id,
      data,
      timestamp: Date.now()
    };
    
    localStorage.setItem(`projeto_${id}`, JSON.stringify(cacheItem));
  } catch (error) {
    console.warn("Erro ao salvar em cache:", error);
  }
}

function getProjetoFromLocalCache(id: string): ProjetoData | null {
  try {
    const cachedItem = localStorage.getItem(`projeto_${id}`);
    if (!cachedItem) return null;
    
    const parsedItem: CachedProjeto = JSON.parse(cachedItem);
    const isExpired = Date.now() - parsedItem.timestamp > CACHE_EXPIRATION;
    
    return isExpired ? null : parsedItem.data;
  } catch (error) {
    console.warn("Erro ao recuperar do cache:", error);
    return null;
  }
}

// Interface para as tarefas na tabela
interface TarefaRow {
  id: string;
  nome: string;
  estado: boolean;
  workpackage: string;
  workpackageId: string;
}

export default function DetalheProjeto() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [separadorAtivo, setSeparadorAtivo] = useState("cronograma");
  const queryClient = useQueryClient();
  const [localCacheData, setLocalCacheData] = useState<ProjetoData | null>(null);
  const [isLocalCacheLoaded, setIsLocalCacheLoaded] = useState(false);

  // Variáveis de estado para a TabelaDados
  const [tarefaSearchTerm, setTarefaSearchTerm] = useState<string>("");
  const [tarefaCurrentPage, setTarefaCurrentPage] = useState<number>(1);
  const [tarefaEstadoFilter, setTarefaEstadoFilter] = useState<string>("todos");
  const [tarefaWorkPackageFilter, setTarefaWorkPackageFilter] = useState<string>("todos");
  const [tarefaSortConfig, setTarefaSortConfig] = useState<{
    field: string | null;
    direction: 'asc' | 'desc';
  }>({
    field: null,
    direction: 'asc'
  });

  // Carregar do localStorage na inicialização do componente
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      const cachedData = getProjetoFromLocalCache(id as string);
      if (cachedData) {
        setLocalCacheData(cachedData);
      }
      setIsLocalCacheLoaded(true);
    }
  }, [id]);

  // Configuração otimizada do React Query
  const { 
    data: projeto, 
    isLoading, 
    error 
  } = api.projeto.findById.useQuery(id, {
    enabled: !!id && (isLocalCacheLoaded && !localCacheData),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Salvar no cache quando os dados chegarem
  useEffect(() => {
    if (projeto) {
      saveProjetoToLocalCache(id as string, projeto as ProjetoData);
    }
  }, [projeto, id]);

  // Funções otimizadas para atualizar dados após alterações
  const invalidateProjetoCache = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: ['projeto.findById', id]
    });
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`projeto_${id}`);
      setLocalCacheData(null);
    }
  }, [queryClient, id]);

  // Dados efetivos do projeto (do cache local ou da API)
  const projetoData = localCacheData || projeto;

  // Cálculos e mapeamentos com useMemo otimizado
  const {
    totalTarefas,
    tarefasConcluidas,
    tarefasPendentes,
    dataInicio,
    dataFim,
    duracaoMeses,
    tarefasRows
  } = useMemo(() => {
    if (!projetoData) {
      return {
        totalTarefas: 0,
        tarefasConcluidas: 0, 
        tarefasPendentes: 0,
        dataInicio: null,
        dataFim: null,
        duracaoMeses: 0,
        tarefasRows: [] as TarefaRow[]
      };
    }

    const totalTarefas = projetoData.workpackages.reduce(
      (acc, wp) => acc + wp.tarefas.length, 
      0
    );
    
    const tarefasConcluidas = projetoData.workpackages.reduce(
      (acc, wp) => acc + wp.tarefas.filter(tarefa => tarefa.estado).length,
      0
    );
    
    const tarefasPendentes = totalTarefas - tarefasConcluidas;
    const dataInicio = projetoData.inicio ? new Date(projetoData.inicio) : null;
    const dataFim = projetoData.fim ? new Date(projetoData.fim) : null;
    
    const duracaoMeses = dataInicio && dataFim
      ? (dataFim.getFullYear() - dataInicio.getFullYear()) * 12 +
        (dataFim.getMonth() - dataInicio.getMonth())
      : 0;

    // Preparar dados para tabela de tarefas
    const tarefasRows: TarefaRow[] = projetoData.workpackages.flatMap(wp => 
      wp.tarefas.map(tarefa => ({
        id: tarefa.id,
        nome: tarefa.nome,
        estado: tarefa.estado,
        workpackage: wp.nome,
        workpackageId: wp.id
      }))
    );

    return {
      totalTarefas,
      tarefasConcluidas,
      tarefasPendentes,
      dataInicio,
      dataFim,
      duracaoMeses,
      tarefasRows
    };
  }, [projetoData]); // Só recalcula quando os dados do projeto mudam

  // Filtrar tarefas com base nos filtros
  const tarefasFiltradas = useMemo(() => {
    if (!tarefasRows.length) return [];
    
    let result = [...tarefasRows];
    
    // Filtro por termo de busca
    if (tarefaSearchTerm.trim()) {
      const searchLower = tarefaSearchTerm.toLowerCase();
      result = result.filter(tarefa => 
        tarefa.nome.toLowerCase().includes(searchLower) ||
        tarefa.workpackage.toLowerCase().includes(searchLower)
      );
    }
    
    // Filtro por estado
    if (tarefaEstadoFilter !== "todos") {
      result = result.filter(tarefa => 
        tarefaEstadoFilter === "true" ? tarefa.estado : !tarefa.estado
      );
    }
    
    // Filtro por workpackage
    if (tarefaWorkPackageFilter !== "todos") {
      result = result.filter(tarefa => 
        tarefa.workpackageId === tarefaWorkPackageFilter
      );
    }
    
    // Ordenação
    if (tarefaSortConfig.field) {
      result.sort((a, b) => {
        const aValue = a[tarefaSortConfig.field as keyof TarefaRow];
        const bValue = b[tarefaSortConfig.field as keyof TarefaRow];
        
        // Lidar com null/undefined
        if (!aValue && !bValue) return 0;
        if (!aValue) return tarefaSortConfig.direction === 'asc' ? -1 : 1;
        if (!bValue) return tarefaSortConfig.direction === 'asc' ? 1 : -1;
        
        // Ordenação para booleanos (estado)
        if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
          return tarefaSortConfig.direction === 'asc'
            ? (aValue === bValue ? 0 : aValue ? 1 : -1)
            : (aValue === bValue ? 0 : aValue ? -1 : 1);
        }
        
        // Ordenação para strings
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return tarefaSortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        return tarefaSortConfig.direction === 'asc'
          ? (aValue > bValue ? 1 : -1)
          : (aValue > bValue ? -1 : 1);
      });
    }
    
    return result;
  }, [tarefasRows, tarefaSearchTerm, tarefaEstadoFilter, tarefaWorkPackageFilter, tarefaSortConfig]);

  // Limpar todos os filtros das tarefas
  const clearTarefaFilters = () => {
    setTarefaSearchTerm("");
    setTarefaEstadoFilter("todos");
    setTarefaWorkPackageFilter("todos");
    setTarefaSortConfig({
      field: null,
      direction: 'asc'
    });
    setTarefaCurrentPage(1);
  };

  // Definição das colunas para TabelaDados de tarefas
  const tarefasColunas: ColumnConfig[] = [
    {
      id: "nome",
      label: "Tarefa",
      sortable: true,
      renderCell: (tarefa: TarefaRow) => (
        <span className="font-medium">{tarefa.nome}</span>
      ),
      width: "45%"
    },
    {
      id: "workpackage",
      label: "Work Package",
      sortable: true,
      renderCell: (tarefa: TarefaRow) => (
        <div className="flex items-center">
          <FileText className="mr-2 h-4 w-4 text-gray-400" />
          <span>{tarefa.workpackage}</span>
        </div>
      ),
      width: "30%"
    },
    {
      id: "estado",
      label: "Estado",
      sortable: true,
      renderCell: (tarefa: TarefaRow) => {
        return (
          <Badge
            variant="outline"
            className={cn(
              tarefa.estado
                ? "bg-emerald-50/70 text-emerald-600 border-emerald-200"
                : "bg-amber-50/70 text-amber-600 border-amber-200"
            )}
          >
            {tarefa.estado ? "Concluída" : "Pendente"}
          </Badge>
        );
      },
      width: "25%",
      align: "center"
    }
  ];

  // Configuração dos filtros para TabelaDados de tarefas
  const tarefasFilterConfigs: FilterConfig[] = [
    {
      id: "estado",
      label: "Estado",
      value: tarefaEstadoFilter,
      onChange: (value: string) => {
        setTarefaEstadoFilter(value);
        setTarefaCurrentPage(1);
      },
      options: [
        { id: "todos", label: "Todos", value: "todos" },
        { id: "concluidas", label: "Concluídas", value: "true" },
        { id: "pendentes", label: "Pendentes", value: "false" }
      ]
    },
    {
      id: "workpackage",
      label: "Work Package",
      value: tarefaWorkPackageFilter,
      onChange: (value: string) => {
        setTarefaWorkPackageFilter(value);
        setTarefaCurrentPage(1);
      },
      options: [
        { id: "todos", label: "Todos", value: "todos" },
        ...projetoData?.workpackages.map(wp => ({
          id: wp.id,
          label: wp.nome,
          value: wp.id
        })) || []
      ]
    }
  ];

  // Handler para ordenação
  const handleTarefaSorting = (field: string) => {
    setTarefaSortConfig(prev => ({
      field,
      direction:
        prev.field === field
          ? prev.direction === 'asc'
            ? 'desc'
            : 'asc'
          : 'asc'
    }));
  };

  const estadoMap: Record<ProjetoEstado, string> = {
    RASCUNHO: "Rascunho",
    PENDENTE: "Pendente",
    APROVADO: "Aprovado", 
    EM_DESENVOLVIMENTO: "Em Desenvolvimento",
    CONCLUIDO: "Concluído",
  };

  // Loading e error states
  if (isLoading && !projetoData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-azul/20 border-t-azul rounded-full animate-spin"></div>
        <span className="ml-3">A carregar...</span>
      </div>
    );
  }

  if ((error || !projetoData) && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Erro ao carregar o projeto ou projeto não encontrado.
      </div>
    );
  }

  // Garantir que temos dados antes de prosseguir
  if (!projetoData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-azul/20 border-t-azul rounded-full animate-spin"></div>
        <span className="ml-3">A inicializar cache...</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 custom-blue-blur">
      <div className="flex-1 overflow-y-auto">
        {/* Breadcrumb fixo */}
        <div className="sticky top-3 z-10 bg-gradient-to-b from-gray-50/90 to-transparent backdrop-blur-[2px] pt-2 pb-1 px-4">
          <div className="max-w-8xl mx-auto">
            <div className="flex items-center">
              <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all duration-300 border border-white/40 group">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/projetos')}
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
                    projetoData.estado === "CONCLUIDO"
                      ? "bg-emerald-500"
                      : projetoData.estado === "PENDENTE"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  )}></div>
                  <span className="text-sm truncate max-w-[300px] sm:max-w-[400px] font-medium text-gray-800" title={projetoData.nome}>
                    {projetoData.nome.length > 30 
                      ? `${projetoData.nome.substring(0, 30)}...` 
                      : projetoData.nome}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Conteúdo principal */}
        <div className="max-w-8xl mx-auto p-4 space-y-4">
          {/* Cabeçalho principal */}
          <div className="flex flex-col gap-2 mt-1 ml-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{projetoData.nome}</h1>
                <Badge
                  variant="outline"
                  className={cn(
                    projetoData.estado === "CONCLUIDO"
                      ? "bg-emerald-50/70 text-emerald-600 border-emerald-200"
                      : projetoData.estado === "PENDENTE"
                      ? "bg-amber-50/70 text-amber-600 border-amber-200"
                      : "bg-blue-50/70 text-customBlue border-blue-200"
                  )}
                >
                  {estadoMap[projetoData.estado as ProjetoEstado]}
                </Badge>
              </div>
            </div>
            
            {projetoData.descricao && (
              <p className="text-sm text-gray-500">{projetoData.descricao}</p>
            )}
          </div>
          
          {/* Estatísticas do Projeto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-1">
            <div className="p-1">
              <Card className="glass-card border-white/20 shadow-md hover:shadow-lg transition-shadow duration-200 rounded-xl h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-50/70 flex items-center justify-center shadow-sm">
                    <FileText className="h-4 w-4 text-customBlue" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Work Packages</p>
                    <p className="text-lg font-semibold">{projetoData.workpackages.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="p-1">
              <Card className="glass-card border-white/20 shadow-md hover:shadow-lg transition-shadow duration-200 rounded-xl h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-purple-50/70 flex items-center justify-center shadow-sm">
                    <CalendarClock className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Tarefas</p>
                    <p className="text-lg font-semibold">{totalTarefas}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span className="flex items-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1"></span>
                        {tarefasConcluidas} Concluídas
                      </span>
                      <span className="flex items-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1"></span>
                        {tarefasPendentes} Pendentes
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="p-1">
              <Card className="glass-card border-white/20 shadow-md hover:shadow-lg transition-shadow duration-200 rounded-xl h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-amber-50/70 flex items-center justify-center shadow-sm">
                    <Calendar className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Período</p>
                    <p className="text-sm font-semibold">
                      {dataInicio?.toLocaleDateString("pt")} - {dataFim?.toLocaleDateString("pt")}
                    </p>
                    <p className="text-[10px] text-gray-500">{duracaoMeses} meses</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="p-1">
              <Card className="glass-card border-white/20 shadow-md hover:shadow-lg transition-shadow duration-200 rounded-xl h-full">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-50/70 flex items-center justify-center shadow-sm">
                    <LineChart className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-500">Progresso</p>
                      <p className="text-sm font-semibold">{Math.round(projetoData.progresso * 100)}%</p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden shadow-inner">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-1000 ease-in-out",
                          projetoData.progresso === 1
                            ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                            : projetoData.progresso >= 0.75
                            ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                            : projetoData.progresso >= 0.5
                            ? "bg-gradient-to-r from-blue-400 to-blue-500"
                            : projetoData.progresso >= 0.25
                            ? "bg-gradient-to-r from-amber-400 to-amber-500"
                            : "bg-gradient-to-r from-rose-400 to-rose-500"
                        )}
                        style={{ width: `${projetoData.progresso * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Separadores */}
          <Tabs value={separadorAtivo} onValueChange={setSeparadorAtivo} className="flex-1 flex flex-col pb-4">
            <div className="w-full mb-4">
              <TabsList className="glass-bg p-1 h-auto border border-white/30 rounded-xl shadow-sm inline-flex">
                <TabsTrigger value="cronograma" className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm", separadorAtivo === "cronograma" ? "text-customBlue" : "text-gray-600")}>
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span>Cronograma</span>
                </TabsTrigger>
                <TabsTrigger value="overview" className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm", separadorAtivo === "overview" ? "text-customBlue" : "text-gray-600")}>
                  <FileText className="h-3.5 w-3.5" />
                  <span>Visão Geral</span>
                </TabsTrigger>
                <TabsTrigger value="resources" className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm", separadorAtivo === "resources" ? "text-customBlue" : "text-gray-600")}>
                  <Users className="h-3.5 w-3.5" />
                  <span>Recursos</span>
                </TabsTrigger>
                <TabsTrigger value="finances" className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm", separadorAtivo === "finances" ? "text-customBlue" : "text-gray-600")}>
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>Finanças</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-visible pb-4">
              <TabsContent value="cronograma" className="m-0 overflow-visible">
                <div className="p-1">
                  <Card className="glass-card border-white/20 shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden rounded-xl">
                    <div className="h-[calc(100vh-220px)] min-h-[300px]">
                      {dataInicio && dataFim && (
                        <Cronograma
                          projeto={projetoData as any}
                          workpackages={projetoData.workpackages as any}
                          startDate={dataInicio}
                          endDate={dataFim}
                          onUpdateWorkPackage={invalidateProjetoCache}
                          onUpdateTarefa={invalidateProjetoCache}
                          projetoId={id}
                          options={{
                            leftColumnWidth: 300,
                            disableInteractions: false,
                            compactMode: false,
                          }}
                        />
                      )}
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="overview" className="m-0">
                <div className="p-1">
                  <Card className="glass-card border-white/20 shadow-md hover:shadow-lg transition-shadow duration-200 rounded-xl">
                    <CardHeader className="border-b border-white/10 px-5 py-3 bg-white/70 backdrop-blur-sm">
                      <CardTitle className="text-base font-semibold text-gray-900">Detalhes do Projeto</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                        <div className="space-y-3">
                          <h3 className="font-medium text-sm text-gray-700">Informações Gerais</h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-gray-500">Data de Início</p>
                              <p className="font-medium text-sm">{dataInicio?.toLocaleDateString("pt-BR") || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Data de Fim</p>
                              <p className="font-medium text-sm">{dataFim?.toLocaleDateString("pt-BR") || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Duração</p>
                              <p className="font-medium text-sm">{duracaoMeses} meses</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Financiamento</p>
                              <p className="font-medium text-sm">{projetoData.financiamento?.nome || "Nenhum"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Nova tabela de tarefas com TabelaDados */}
                      <div>
                        <h3 className="font-medium text-sm text-gray-700 mb-3">Lista de Tarefas</h3>
                        <TabelaDados
                          title="Tarefas"
                          subtitle={`Tarefas do projeto ${projetoData.nome}`}
                          data={tarefasFiltradas}
                          isLoading={isLoading}
                          columns={tarefasColunas}
                          searchConfig={{
                            placeholder: "Procurar tarefas por nome ou work package...",
                            value: tarefaSearchTerm,
                            onChange: (value) => {
                              setTarefaSearchTerm(value);
                              setTarefaCurrentPage(1);
                            }
                          }}
                          filterConfigs={tarefasFilterConfigs}
                          sortConfig={{
                            field: tarefaSortConfig.field,
                            direction: tarefaSortConfig.direction,
                            onChange: handleTarefaSorting
                          }}
                          itemsPerPage={5}
                          currentPage={tarefaCurrentPage}
                          setCurrentPage={setTarefaCurrentPage}
                          totalItems={tarefasFiltradas.length}
                          emptyStateMessage={{
                            title: "Nenhuma tarefa encontrada",
                            description: "Não há tarefas registradas neste projeto."
                          }}
                          clearAllFilters={clearTarefaFilters}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="resources" className="m-0">
                <div className="p-1">
                  <Card className="glass-card border-white/20 shadow-md hover:shadow-lg transition-shadow duration-200 rounded-xl">
                    <CardHeader className="border-b border-white/10 px-5 py-3 bg-white/70 backdrop-blur-sm">
                      <CardTitle className="text-base font-semibold text-gray-900">Recursos</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                      <p className="text-sm text-gray-600">Recursos ainda não implementados nesta vista.</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="finances" className="m-0">
                <div className="p-1">
                  <Card className="glass-card border-white/20 shadow-md hover:shadow-lg transition-shadow duration-200 rounded-xl">
                    <CardHeader className="border-b border-white/10 px-5 py-3 bg-white/70 backdrop-blur-sm">
                      <CardTitle className="text-base font-semibold text-gray-900">Finanças</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                      <ProjetoFinancas
                        projetoId={id}
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}