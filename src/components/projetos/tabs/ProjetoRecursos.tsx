"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import { 
  ResponsiveContainer, Tooltip as RechartsTooltip,
  XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend,
  LineChart, Line, Area, AreaChart
} from "recharts";
import { 
  Users, Calendar, User, FolderKanban, Briefcase, 
  ChevronRight, ArrowUpRight, ArrowDownRight, X,
  Clock, Layers, BarChart2, PieChart as PieChartIcon
} from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";

// --- Type Definitions --- 
type RouterOutput = inferRouterOutputs<AppRouter>;
type ProjetoOutput = RouterOutput["projeto"]["findById"];

interface DetalheRecursoMapped {
  userId: string;
  userName: string | null;
  alocacao: number;
}

interface ProjetoRecursosProps {
  projetoId: string;
}

// --- Formatter Functions ---
const formatNumber = (value: number | undefined | null, fractionDigits = 2): string => {
  if (typeof value !== 'number' || isNaN(value)) return "-";
  return value.toLocaleString("pt-PT", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
};

const formatPercentage = (value: number | undefined | null, fractionDigits = 1): string => {
  if (typeof value !== 'number' || isNaN(value)) return "-";
  return (value / 100).toLocaleString("pt-PT", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
};

// --- UI Components ---
interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  colorClass?: string;
  subtitle?: string;
}

function StatCard({ title, value, icon, colorClass = "bg-blue-50", subtitle }: StatCardProps) {
  return (
    <Card className="overflow-hidden border-none shadow-sm h-full">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-center justify-between flex-grow">
          <div>
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
            {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div className={`rounded-full p-3 ${colorClass} flex-shrink-0`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Color Utils ---
const COLORS = [
  '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe',
  '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554',
];

// --- UI Helper Functions ---
function getOcupacaoStyles(ocupacao: number) {
  if (ocupacao > 100) {
    return {
      badgeClass: "bg-red-50 text-red-600 border-red-200",
      progressClass: "bg-red-400"
    };
  } else if (ocupacao >= 80) {
    return {
      badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-200",
      progressClass: "bg-emerald-400"
    };
  } else if (ocupacao >= 50) {
    return {
      badgeClass: "bg-blue-50 text-blue-600 border-blue-100",
      progressClass: "bg-blue-400"
    };
  } else if (ocupacao >= 1) {
    return {
      badgeClass: "bg-amber-50 text-amber-600 border-amber-100",
      progressClass: "bg-amber-400"
    };
  }
  return {
    badgeClass: "bg-gray-50 text-gray-600 border-gray-200",
    progressClass: "bg-gray-200"
  };
}

export function ProjetoRecursos({ projetoId }: ProjetoRecursosProps) {
  const [selectedYear, setSelectedYear] = useState<string>("todos");
  const [selectedTab, setSelectedTab] = useState<string>("visao-geral");
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"table" | "cards" | "chart">("table");

  // Buscar dados do projeto
  const { data: projeto, isLoading, error } = api.projeto.findById.useQuery(projetoId, {
    enabled: !!projetoId,
  });

  // Inicializar valores padrão para dados processados
  const workpackagesFiltrados = useMemo(() => {
    if (!projeto || !projeto.workpackages) return [];
    
    // Filtrar workpackages baseado no ano selecionado
    const filtrarPorAno = (wp: typeof projeto.workpackages[0]) => {
      if (selectedYear === "todos") return true;
      
      const anoSelecionado = parseInt(selectedYear, 10);
      
      // Verificar se há alocações neste ano
      return wp.recursos.some(recurso => recurso.ano === anoSelecionado);
    };
    
    return projeto.workpackages.filter(filtrarPorAno);
  }, [projeto, selectedYear]);
  
  // 1. Obter alocações agregadas por recurso, independente do workpackage
  const alocacoesPorRecurso = useMemo(() => {
    if (!workpackagesFiltrados.length) return [];
    
    const recursosMap = new Map<string, {
      userId: string;
      userName: string | null;
      totalAlocacao: number;
      workpackages: Set<string>;
      periodos: number;
      ocupacaoTotal: number;
    }>();
    
    workpackagesFiltrados.forEach(wp => {
      // Filtrar os recursos pelo ano selecionado
      const recursos = selectedYear === "todos" 
        ? wp.recursos
        : wp.recursos.filter(r => r.ano === parseInt(selectedYear, 10));
        
      recursos.forEach(recurso => {
        if (!recursosMap.has(recurso.userId)) {
          recursosMap.set(recurso.userId, {
            userId: recurso.userId,
            userName: recurso.user.name,
            totalAlocacao: 0,
            workpackages: new Set(),
            periodos: 0,
            ocupacaoTotal: 0
          });
        }
        
        const recursoDados = recursosMap.get(recurso.userId)!;
        recursoDados.totalAlocacao += Number(recurso.ocupacao);
        recursoDados.workpackages.add(wp.id);
        recursoDados.periodos += 1;
        recursoDados.ocupacaoTotal += Number(recurso.ocupacao);
      });
    });
    
    // Converter o mapa para array e ordenar por alocação total
    return Array.from(recursosMap.values())
      .map(r => ({
        ...r,
        // A alocação média é a ocupação total dividida pelo número de períodos
        mediaAlocacao: r.periodos > 0 ? r.ocupacaoTotal / r.periodos / 100 : 0,
        totalWorkpackages: r.workpackages.size
      }))
      .sort((a, b) => b.totalAlocacao - a.totalAlocacao);
  }, [workpackagesFiltrados, selectedYear]);
  
  // 2. Obter alocações por workpackage
  const alocacoesPorWorkpackage = useMemo(() => {
    if (!workpackagesFiltrados.length) return [];
    
    return workpackagesFiltrados.map(wp => {
      // Filtrar alocações pelo ano selecionado, se necessário
      const recursos = selectedYear === "todos"
        ? wp.recursos
        : wp.recursos.filter(r => r.ano === parseInt(selectedYear, 10));
        
      // Calcular a alocação total para este workpackage
      const totalAlocacao = recursos.reduce((total, r) => total + Number(r.ocupacao), 0);
      
      // Contar recursos únicos
      const recursosUnicos = new Set(recursos.map(r => r.userId)).size;
      
      return {
        id: wp.id,
        nome: wp.nome,
        totalAlocacao,
        recursosUnicos,
        mediaAlocacaoPorRecurso: recursosUnicos > 0 ? totalAlocacao / recursosUnicos : 0,
        estado: wp.estado
      };
    }).sort((a, b) => b.totalAlocacao - a.totalAlocacao);
  }, [workpackagesFiltrados, selectedYear]);
  
  // Determinar anos disponíveis
  const anosDisponiveis = useMemo(() => {
    if (!projeto || !projeto.workpackages) return [];
    
    const anosSet = new Set<number>();
    
    projeto.workpackages.forEach(wp => {
      wp.recursos.forEach(recurso => {
        anosSet.add(recurso.ano);
      });
    });
    
    return Array.from(anosSet).sort((a, b) => b - a); // Ordenar decrescente
  }, [projeto]);
  
  // Totais e estatísticas
  const totalRecursos = alocacoesPorRecurso.length;
  const totalAlocacao = alocacoesPorRecurso.reduce((sum, r) => sum + r.totalAlocacao, 0);
  const mediaAlocacaoPorRecurso = totalRecursos > 0 ? totalAlocacao / totalRecursos : 0;
  
  // Dados para gráfico de alocação por recurso
  const dadosGraficoAlocacoesPorRecurso = alocacoesPorRecurso
    .slice(0, 10) // Limitar a 10 recursos para melhor visualização
    .map(recurso => ({
      name: recurso.userName || `Utilizador ${recurso.userId.substring(0, 6)}`,
      alocacao: recurso.mediaAlocacao * 100, // Converter para percentual
      workpackages: recurso.totalWorkpackages
    }));
  
  // Dados para gráfico de alocação por workpackage
  const dadosGraficoAlocacoesPorWorkpackage = alocacoesPorWorkpackage
    .slice(0, 10) // Limitar a 10 workpackages para melhor visualização
    .map(wp => ({
      name: wp.nome.length > 20 ? wp.nome.substring(0, 20) + '...' : wp.nome,
      alocacao: wp.totalAlocacao,
      recursos: wp.recursosUnicos
    }));

  // Dados do recurso selecionado
  const selectedResourceDetails = useMemo(() => {
    if (!selectedResourceId || !workpackagesFiltrados.length) return null;

    const recursoBase = alocacoesPorRecurso.find(r => r.userId === selectedResourceId);
    if (!recursoBase) return null;

    // Buscar todas as alocações deste recurso em cada workpackage
    const alocacoesPorWP = workpackagesFiltrados.map(wp => {
      const recursos = selectedYear === "todos"
        ? wp.recursos.filter(r => r.userId === selectedResourceId)
        : wp.recursos.filter(r => r.userId === selectedResourceId && r.ano === parseInt(selectedYear, 10));

      const totalAlocacao = recursos.reduce((total, r) => total + Number(r.ocupacao), 0);
      const mediaAlocacao = recursos.length > 0 ? totalAlocacao / recursos.length : 0;

      return {
        workpackageId: wp.id,
        workpackageName: wp.nome,
        estado: wp.estado,
        alocacao: mediaAlocacao,
        totalAlocacao,
        periodos: recursos.length
      };
    }).filter(wp => wp.totalAlocacao > 0)
      .sort((a, b) => b.totalAlocacao - a.totalAlocacao);

    // Calcular tendência de alocação (crescente ou decrescente)
    let tendencia = "estável";
    if (alocacoesPorWP.length > 1) {
      // Fazemos uma verificação segura dos elementos do array
      const primeiro = alocacoesPorWP[0];
      const ultimo = alocacoesPorWP[alocacoesPorWP.length - 1];
      
      if (primeiro && ultimo) {
        tendencia = primeiro.totalAlocacao > ultimo.totalAlocacao ? "crescente" : "decrescente";
      }
    }

    return {
      ...recursoBase,
      alocacoesPorWP,
      tendencia,
      totalWorkpackagesAtivos: alocacoesPorWP.length
    };
  }, [selectedResourceId, workpackagesFiltrados, selectedYear, alocacoesPorRecurso]);

  // Função para renderizar o detalhe do recurso
  const renderRecursoDetalhes = () => {
    if (!selectedResourceDetails) return null;

    return (
      <Sheet>
        <SheetContent side="right" className="w-[90vw] sm:w-[600px]">
          <SheetHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-blue-100 text-blue-800 text-lg">
                    {(selectedResourceDetails.userName?.charAt(0) || "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle>{selectedResourceDetails.userName || "Utilizador Desconhecido"}</SheetTitle>
                  <SheetDescription>
                    {formatPercentage(selectedResourceDetails.mediaAlocacao * 100, 0)} ETI Médio
                  </SheetDescription>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedResourceId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-blue-50/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Workpackages</p>
                      <h3 className="text-2xl font-bold text-blue-700">
                        {selectedResourceDetails.totalWorkpackagesAtivos}
                      </h3>
                    </div>
                    <Layers className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-900">ETI Total</p>
                      <h3 className="text-2xl font-bold text-purple-700">
                        {formatNumber(selectedResourceDetails.totalAlocacao, 1)}
                      </h3>
                    </div>
                    <Clock className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Alocação por Workpackage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Workpackage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={selectedResourceDetails.alocacoesPorWP}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="workpackageName" 
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                      />
                      <RechartsTooltip
                        formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "Alocação"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="alocacao"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Workpackages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhes por Workpackage</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {selectedResourceDetails.alocacoesPorWP.map((wp) => (
                      <div
                        key={wp.workpackageId}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{wp.workpackageName}</p>
                          <p className="text-sm text-muted-foreground">
                            {wp.periodos} período{wp.periodos !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium leading-none">
                              {formatPercentage(wp.alocacao * 100, 0)}
                            </p>
                            <p className="text-sm text-muted-foreground">ETI Médio</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  // --- Loading and Error States ---
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
        ))}
        <Skeleton className="col-span-1 h-[400px] w-full rounded-xl sm:col-span-2 md:col-span-3" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="rounded-lg bg-red-50 p-8 text-center shadow-sm">
          <h3 className="mb-2 text-lg font-medium text-red-800">Erro ao carregar dados dos recursos</h3>
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!projeto || !projeto.workpackages) {
    return (
      <div className="rounded-lg bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">Dados de projeto incompletos ou não disponíveis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Recursos Humanos</h1>
          <p className="text-gray-500">Gestão e visualização de alocações de recursos no projeto</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium border-purple-200 bg-purple-50 text-purple-800">
            {totalRecursos} Recurso{totalRecursos !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium border-blue-200 bg-blue-50 text-blue-800">
            {formatNumber(totalAlocacao, 1)} ETIs Alocados
          </Badge>
        </div>
      </div>

      {/* Filtros e Controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={selectedView === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("table")}
          >
            <BarChart2 className="h-4 w-4 mr-2" />
            Tabela
          </Button>
          <Button
            variant={selectedView === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("cards")}
          >
            <Layers className="h-4 w-4 mr-2" />
            Cards
          </Button>
          <Button
            variant={selectedView === "chart" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("chart")}
          >
            <PieChartIcon className="h-4 w-4 mr-2" />
            Gráfico
          </Button>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="mr-2 h-4 w-4 opacity-50" />
            <SelectValue placeholder="Filtrar por ano..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Anos</SelectItem>
            {anosDisponiveis.map((ano: number) => (
              <SelectItem key={ano} value={ano.toString()}>
                {ano}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cards de Estatísticas Gerais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <StatCard 
          title="Total de Recursos" 
          value={totalRecursos} 
          subtitle="Colaboradores alocados"
          icon={<Users className="h-6 w-6 text-purple-600" />}
          colorClass="bg-purple-50"
        />
        <StatCard 
          title="ETIs Alocados" 
          value={formatNumber(totalAlocacao, 1)} 
          subtitle="Equivalentes a tempo integral"
          icon={<Briefcase className="h-6 w-6 text-blue-600" />}
          colorClass="bg-blue-50"
        />
        <StatCard 
          title="Alocação Média" 
          value={formatPercentage(mediaAlocacaoPorRecurso * 100, 0)}
          subtitle="Por colaborador"
          icon={<User className="h-6 w-6 text-green-600" />}
          colorClass="bg-green-50"
        />
        <StatCard 
          title="Workpackages Ativos" 
          value={workpackagesFiltrados.length} 
          subtitle="Com recursos alocados"
          icon={<FolderKanban className="h-6 w-6 text-orange-600" />}
          colorClass="bg-orange-50"
        />
      </div>

      {/* Tabs para diferentes visualizações */}
      <Tabs defaultValue="visao-geral" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-4">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="por-recurso">Por Recurso</TabsTrigger>
          <TabsTrigger value="por-workpackage">Por Workpackage</TabsTrigger>
          <TabsTrigger value="materiais">Materiais</TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Barras - Alocações por Recurso */}
            <Card className="overflow-hidden border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Alocação por Recurso (% ETI)</CardTitle>
              </CardHeader>
              <CardContent>
                {dadosGraficoAlocacoesPorRecurso.length > 0 ? (
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dadosGraficoAlocacoesPorRecurso}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                        <RechartsTooltip 
                          formatter={(value: number, name: string) => {
                            if (name === "alocacao") return [`${value.toFixed(0)}%`, "Alocação"]; 
                            return [value, "Workpackages"];
                          }}
                        />
                        <Bar dataKey="alocacao" name="Alocação (%)" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[350px] flex items-center justify-center">
                    <p className="text-gray-500">Sem dados de alocação disponíveis</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Barras - Alocações por Workpackage */}
            <Card className="overflow-hidden border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Distribuição por Workpackage (ETIs)</CardTitle>
              </CardHeader>
              <CardContent>
                {dadosGraficoAlocacoesPorWorkpackage.length > 0 ? (
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dadosGraficoAlocacoesPorWorkpackage}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                        <RechartsTooltip 
                          formatter={(value: number, name: string) => {
                            if (name === "alocacao") return [formatNumber(value, 1), "ETIs"]; 
                            return [value, "Recursos"];
                          }}
                        />
                        <Bar dataKey="alocacao" name="ETIs Alocados" fill="#60a5fa" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[350px] flex items-center justify-center">
                    <p className="text-gray-500">Sem dados de workpackages disponíveis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Por Recurso */}
        <TabsContent value="por-recurso" className="space-y-6">
          {selectedView === "table" && (
            <Card className="overflow-hidden border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  Detalhes por Recurso {selectedYear !== 'todos' ? `(${selectedYear})` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alocacoesPorRecurso.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recurso</TableHead>
                          <TableHead>ETI Médio</TableHead>
                          <TableHead>ETI Total</TableHead>
                          <TableHead>Distribuição</TableHead>
                          <TableHead>Workpackages</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alocacoesPorRecurso.map((recurso) => (
                          <TableRow 
                            key={recurso.userId} 
                            className={`hover:bg-gray-50 cursor-pointer ${
                              selectedResourceId === recurso.userId ? 'bg-blue-50/50' : ''
                            }`}
                            onClick={() => setSelectedResourceId(recurso.userId)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-blue-100 text-blue-800">
                                    {(recurso.userName?.charAt(0) || "U").toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{recurso.userName || "Utilizador Desconhecido"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{formatPercentage(recurso.mediaAlocacao * 100, 0)}</TableCell>
                            <TableCell>{formatNumber(recurso.totalAlocacao, 1)}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div className="w-full max-w-xs">
                                  <Progress 
                                    value={recurso.mediaAlocacao * 100} 
                                    className={`h-2 ${
                                      recurso.mediaAlocacao > 1 
                                        ? 'bg-red-100' 
                                        : recurso.mediaAlocacao > 0.8 
                                          ? 'bg-orange-100' 
                                          : 'bg-gray-100'
                                    }`}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {recurso.totalWorkpackages}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedResourceId(recurso.userId);
                                }}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 p-8 text-center">
                    <p className="text-sm text-gray-500">Não há recursos alocados para o período selecionado.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedView === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alocacoesPorRecurso.map((recurso) => {
                const isOverallocated = recurso.mediaAlocacao > 1;
                const { badgeClass, progressClass } = getOcupacaoStyles(recurso.mediaAlocacao * 100);
                
                return (
                  <Card 
                    key={recurso.userId}
                    className={`border-azul/10 hover:border-azul/20 transition-all overflow-hidden cursor-pointer ${
                      selectedResourceId === recurso.userId ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                    }`}
                    onClick={() => setSelectedResourceId(recurso.userId)}
                  >
                    <div className="p-3 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-azul/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-azul" />
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-azul">
                            {recurso.userName || "Utilizador Desconhecido"}
                          </h5>
                          <Badge variant="outline" className="px-1 py-0 text-[10px] h-4">
                            {formatPercentage(recurso.mediaAlocacao * 100, 0)} ETI
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg hover:bg-azul/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedResourceId(recurso.userId);
                        }}
                      >
                        <ChevronRight className="h-3.5 w-3.5 text-azul/70" />
                      </Button>
                    </div>
                    
                    <div className="border-t border-azul/10 p-3 bg-azul/5">
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-azul/80">ETI Total</span>
                          <span className="font-medium text-azul">{formatNumber(recurso.totalAlocacao, 1)}</span>
                        </div>
                        
                        <div className="flex justify-between text-xs">
                          <span className="text-azul/80">Workpackages</span>
                          <span className="font-medium text-azul">{recurso.totalWorkpackages}</span>
                        </div>
                        
                        <div className={`${badgeClass} border rounded-md p-2`}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span>Alocação Média</span>
                            <span className="font-medium">{formatPercentage(recurso.mediaAlocacao * 100, 0)}</span>
                          </div>
                          <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${progressClass} rounded-full transition-all duration-300`}
                              style={{ width: `${Math.min(recurso.mediaAlocacao * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {selectedView === "chart" && (
            <Card className="overflow-hidden border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  Distribuição de ETIs por Recurso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={alocacoesPorRecurso.map(r => ({
                          name: r.userName || "Utilizador Desconhecido",
                          value: r.totalAlocacao
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={200}
                        innerRadius={100}
                        label={({name, value}) => `${name}: ${formatNumber(value, 1)} ETI`}
                      >
                        {alocacoesPorRecurso.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: number) => [formatNumber(value, 1), "ETIs"]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notas sobre ETIs */}
          <Card className="overflow-hidden border-none shadow-sm bg-blue-50">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-blue-900">ETI: Equivalente a Tempo Integral</h3>
              <p className="mt-1 text-xs text-blue-700">
                • <strong>ETI Médio</strong>: Média de alocação mensal do recurso (onde 1.0 = 100% do tempo)
              </p>
              <p className="mt-1 text-xs text-blue-700">
                • <strong>ETI Total</strong>: Soma das alocações em todos os workpackages
              </p>
              <p className="mt-1 text-xs text-blue-700">
                • Um valor de ETI Médio superior a 100% indica sobrealocação do recurso
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Por Workpackage */}
        <TabsContent value="por-workpackage" className="space-y-6">
          {selectedView === "table" && (
            <Card className="overflow-hidden border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  Detalhes por Workpackage {selectedYear !== 'todos' ? `(${selectedYear})` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alocacoesPorWorkpackage.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Workpackage</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Recursos</TableHead>
                          <TableHead>ETIs Alocados</TableHead>
                          <TableHead>Média por Recurso</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alocacoesPorWorkpackage.map((wp) => {
                          const isOverallocated = wp.mediaAlocacaoPorRecurso > 1;
                          const isHighAllocation = wp.mediaAlocacaoPorRecurso > 0.8;
                          
                          return (
                            <TableRow key={wp.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">
                                <div className="flex items-center space-x-2">
                                  <FolderKanban className="h-4 w-4 text-blue-600" />
                                  <span>{wp.nome}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={wp.estado ? "default" : "secondary"} className={wp.estado ? "bg-green-50 text-green-700 border-green-200" : ""}>
                                  {wp.estado ? "Concluído" : "Em progresso"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex -space-x-2">
                                  {workpackagesFiltrados
                                    .find(w => w.id === wp.id)
                                    ?.recursos.slice(0, 3)
                                    .map((recurso) => (
                                      <Avatar key={recurso.userId} className="h-6 w-6 border-2 border-white">
                                        <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                                          {(recurso.user.name?.charAt(0) || "U").toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                  {wp.recursosUnicos > 3 && (
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-medium">
                                      +{wp.recursosUnicos - 3}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{formatNumber(wp.totalAlocacao, 1)}</span>
                                  {isOverallocated && (
                                    <Badge variant="destructive" className="text-xs">Sobrealocado</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <div className="w-full max-w-xs">
                                    <Progress 
                                      value={wp.mediaAlocacaoPorRecurso * 100} 
                                      className={`h-2 ${
                                        isOverallocated 
                                          ? 'bg-red-100' 
                                          : isHighAllocation 
                                            ? 'bg-orange-100' 
                                            : 'bg-gray-100'
                                      }`}
                                    />
                                  </div>
                                  <span className="text-sm font-medium">
                                    {formatPercentage(wp.mediaAlocacaoPorRecurso * 100, 0)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const wpObj = workpackagesFiltrados.find(w => w.id === wp.id);
                                    if (wpObj?.recursos[0]?.userId) {
                                      setSelectedResourceId(wpObj.recursos[0].userId);
                                    }
                                  }}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 p-8 text-center">
                    <p className="text-sm text-gray-500">Não há workpackages com recursos alocados no período selecionado.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedView === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alocacoesPorWorkpackage.map((wp) => {
                const isOverallocated = wp.mediaAlocacaoPorRecurso > 1;
                const isHighAllocation = wp.mediaAlocacaoPorRecurso > 0.8;
                
                return (
                  <Card key={wp.id} className="overflow-hidden">
                    <CardHeader className="space-y-0 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FolderKanban className="h-4 w-4 text-blue-600" />
                          <CardTitle className="text-base">{wp.nome}</CardTitle>
                        </div>
                        <Badge variant={wp.estado ? "default" : "secondary"}>
                          {wp.estado ? "Concluído" : "Em progresso"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">ETIs Alocados</p>
                            <p className="text-lg font-medium">{formatNumber(wp.totalAlocacao, 1)}</p>
                          </div>
                          <div className="space-y-1 text-right">
                            <p className="text-sm text-muted-foreground">Média/Recurso</p>
                            <p className="text-lg font-medium">
                              {formatPercentage(wp.mediaAlocacaoPorRecurso * 100, 0)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Recursos Alocados</span>
                            <span className="font-medium">{wp.recursosUnicos}</span>
                          </div>
                          <Progress 
                            value={wp.mediaAlocacaoPorRecurso * 100} 
                            className={`h-2 ${
                              isOverallocated 
                                ? 'bg-red-100' 
                                : isHighAllocation 
                                  ? 'bg-orange-100' 
                                  : 'bg-gray-100'
                            }`}
                          />
                          {isOverallocated && (
                            <p className="text-xs text-red-600 mt-1">
                              Workpackage com sobrealocação de recursos
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <div className="flex -space-x-2">
                            {workpackagesFiltrados
                              .find(w => w.id === wp.id)
                              ?.recursos.slice(0, 4)
                              .map((recurso) => (
                                <Avatar key={recurso.userId} className="h-6 w-6 border-2 border-white">
                                  <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                                    {(recurso.user.name?.charAt(0) || "U").toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                          </div>
                          {wp.recursosUnicos > 4 && (
                            <span className="text-sm text-muted-foreground">
                              +{wp.recursosUnicos - 4} recursos
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {selectedView === "chart" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="overflow-hidden border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">
                    Distribuição de ETIs por Workpackage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={alocacoesPorWorkpackage}
                          dataKey="totalAlocacao"
                          nameKey="nome"
                          cx="50%"
                          cy="50%"
                          outerRadius={160}
                          innerRadius={100}
                          paddingAngle={2}
                        >
                          {alocacoesPorWorkpackage.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number, name: string) => [
                            `${formatNumber(value, 1)} ETIs`,
                            name
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">
                    Média de Alocação por Workpackage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={alocacoesPorWorkpackage}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis 
                          type="number" 
                          domain={[0, 100]} 
                          tickFormatter={(value) => `${value}%`}
                        />
                        <YAxis 
                          dataKey="nome" 
                          type="category" 
                          width={120} 
                          tick={{ fontSize: 12 }} 
                        />
                        <RechartsTooltip
                          formatter={(value: number) => [`${value}%`, "Média de Alocação"]}
                        />
                        <Bar
                          dataKey="mediaAlocacaoPorRecurso"
                          name="Média de Alocação"
                          fill="#6366f1"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Matriz de alocação - Resumo por workpackage */}
          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Matriz de Alocação</CardTitle>
              <CardDescription>
                Visualização cruzada de recursos e workpackages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workpackagesFiltrados.length > 0 && alocacoesPorRecurso.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="p-6 bg-blue-50 rounded-lg mb-4">
                    <p className="text-sm text-blue-800">
                      A matriz mostra as alocações dos principais recursos nos workpackages mais relevantes.
                      Clique em um recurso para ver mais detalhes.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {alocacoesPorRecurso.slice(0, 5).map(recurso => {
                      const { badgeClass } = getOcupacaoStyles(recurso.mediaAlocacao * 100);
                      
                      return (
                        <Card 
                          key={recurso.userId}
                          className="border-azul/10 hover:border-azul/20 transition-all overflow-hidden cursor-pointer"
                          onClick={() => setSelectedResourceId(recurso.userId)}
                        >
                          <div className="p-3 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-azul/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-azul" />
                              </div>
                              <div>
                                <h5 className="text-sm font-medium text-azul">
                                  {recurso.userName || "Utilizador Desconhecido"}
                                </h5>
                                <Badge variant="outline" className="px-1 py-0 text-[10px] h-4">
                                  {formatPercentage(recurso.mediaAlocacao * 100, 0)} ETI
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {recurso.totalWorkpackages} WPs
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-azul/70" />
                            </div>
                          </div>
                          
                          <div className="border-t border-azul/10 p-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                              {alocacoesPorWorkpackage.slice(0, 4).map(wp => {
                                const wpObj = workpackagesFiltrados.find(w => w.id === wp.id);
                                if (!wpObj) return null;
                                
                                const recursos = selectedYear === "todos"
                                  ? wpObj.recursos.filter(r => r.userId === recurso.userId)
                                  : wpObj.recursos.filter(r => r.userId === recurso.userId && r.ano === parseInt(selectedYear, 10));
                                
                                const alocacao = recursos.reduce((total, r) => total + Number(r.ocupacao), 0);
                                const mediaAlocacao = recursos.length > 0 ? alocacao / recursos.length : 0;
                                const ocupacaoValor = mediaAlocacao * 100;
                                
                                if (ocupacaoValor <= 0) return null;
                                
                                const { badgeClass: wpBadgeClass, progressClass } = getOcupacaoStyles(ocupacaoValor);
                                
                                return (
                                  <div 
                                    key={wp.id} 
                                    className={`${wpBadgeClass} border rounded-md p-2`}
                                  >
                                    <div className="flex justify-between text-xs mb-1.5">
                                      <span title={wp.nome}>{wp.nome.length > 15 ? wp.nome.substring(0, 15) + "..." : wp.nome}</span>
                                      <span className="font-medium">{ocupacaoValor.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${progressClass} rounded-full transition-all duration-300`}
                                        style={{ width: `${Math.min(ocupacaoValor, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 p-8 text-center">
                  <p className="text-sm text-gray-500">Não há dados suficientes para gerar a matriz de alocação.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Materiais */}
        <TabsContent value="materiais" className="space-y-6">
          {/* Materiais content */}
        </TabsContent>
      </Tabs>

      {selectedResourceDetails && renderRecursoDetalhes()}
    </div>
  );
}

export default ProjetoRecursos; 