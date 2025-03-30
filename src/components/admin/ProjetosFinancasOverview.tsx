"use client";

// @ts-nocheck - Ignorar erros TypeScript neste arquivo devido à incompatibilidade da definição de tipos

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { 
  DollarSign, TrendingUp, Wallet, ArrowUpDown, 
  Percent, AlertTriangle, ChevronRight, Filter
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { ProjetoEstado } from "@prisma/client";

// Definição de tipos para representar a resposta da API
interface ProjetoFinancasData {
  orcamentoSubmetido: number;
  valorFinanciado: number;
  custosReais: {
    total: number;
    recursos: number;
    materiais: number;
  };
  resultado: number;
  overhead: number;
  margem: number;
  vab: number;
  vabCustosPessoal: number;
}

interface ProjetoFinanceiroItem {
  id: string;
  nome: string;
  responsavel: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  financas: ProjetoFinancasData | null;
}

// Helpers for formatting
const formatCurrency = (value: number | undefined | null): string => {
  if (typeof value !== 'number' || isNaN(value)) return "- €";
  return value.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatPercentage = (value: number | undefined | null, fractionDigits = 1): string => {
  if (typeof value !== 'number' || isNaN(value)) return "-";
  // Verificar se o valor já está na forma decimal (0-1) ou na forma percentual (0-100)
  const percentValue = value > 1 ? value / 100 : value;
  return percentValue.toLocaleString("pt-PT", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
};

// Status Badge Component
interface StatusBadgeProps {
  orcamento: number | null | undefined;
  custosReais: number | null | undefined;
}

function StatusBadge({ orcamento, custosReais }: StatusBadgeProps) {
  if (typeof orcamento !== 'number' || typeof custosReais !== 'number' || 
      isNaN(orcamento) || isNaN(custosReais) || orcamento <= 0) {
    return <Badge variant="secondary">N/A</Badge>;
  }
  
  const percentagemGasta = (custosReais / orcamento) * 100;
  
  if (percentagemGasta < 70) 
    return <Badge variant="default">Dentro do orçamento</Badge>;
  if (percentagemGasta < 90) 
    return <Badge variant="warning">A aproximar-se do limite</Badge>;
  if (percentagemGasta < 100) 
    return <Badge variant="orange">Próximo do limite</Badge>;
  
  return <Badge variant="destructive">Acima do orçamento</Badge>;
}

// Stat Card Component
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

// Main Component
export function ProjetosFinancasOverview({ className }: { className?: string }) {
  const router = useRouter();
  const [viewType, setViewType] = useState<string>("overview");
  const [filter, setFilter] = useState<string>("all");
  
  // Fetch all projects with financial data
  const { data: projetosResponse, isLoading } = api.projeto.findAllWithFinancialData.useQuery({
    limit: 100, // Get a reasonably large number of projects
    includeFinancialDetails: true
  });
  
  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden border-none shadow-sm", className)}>
        <CardHeader>
          <CardTitle>Visão Financeira dos Projetos</CardTitle>
          <CardDescription>Carregando dados financeiros...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full mt-6 rounded-xl" />
        </CardContent>
      </Card>
    );
  }
  
  // Error state
  if (!projetosResponse || !projetosResponse.items || projetosResponse.items.length === 0) {
    return (
      <Card className={cn("overflow-hidden border-none shadow-sm", className)}>
        <CardHeader>
          <CardTitle>Visão Financeira dos Projetos</CardTitle>
          <CardDescription>Erro ao carregar dados financeiros</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-red-50 p-8 text-center">
            <p className="text-red-800">Não foi possível obter os dados financeiros dos projetos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Lista de todos os projetos que possuem dados financeiros válidos
  // Aqui usamos type assertion para informar ao TypeScript sobre a estrutura real dos dados
  interface ProjetoExtendido {
    id: string;
    nome: string; 
    descricao: string | null;
    inicio: Date | null;
    fim: Date | null;
    estado: ProjetoEstado;
    responsavel: {
      id: string;
      name: string | null;
      email: string | null;
    } | null;
    financas: ProjetoFinancasData | null;
    // ... outros campos do projeto
  }

  const projetos = projetosResponse.items.filter(p => {
    const projetoExtendido = p as unknown as ProjetoExtendido;
    return projetoExtendido.financas !== null;
  });
  
  // Data processing - aggregate financial totals across projects
  const dadosAgregados = {
    orcamentoTotalSubmitted: projetos.reduce((total, p) => {
      const projetoExtendido = p as unknown as ProjetoExtendido;
      return total + (projetoExtendido.financas?.orcamentoSubmetido || 0);
    }, 0),
    valorTotalFinanciado: projetos.reduce((total, p) => {
      const projetoExtendido = p as unknown as ProjetoExtendido;
      return total + (projetoExtendido.financas?.valorFinanciado || 0);
    }, 0),
    custosRealTotal: projetos.reduce((total, p) => {
      const projetoExtendido = p as unknown as ProjetoExtendido;
      return total + (projetoExtendido.financas?.custosReais?.total || 0);
    }, 0),
    custosRealRecursos: projetos.reduce((total, p) => {
      const projetoExtendido = p as unknown as ProjetoExtendido;
      return total + (projetoExtendido.financas?.custosReais?.recursos || 0);
    }, 0),
    custosRealMateriais: projetos.reduce((total, p) => {
      const projetoExtendido = p as unknown as ProjetoExtendido;
      return total + (projetoExtendido.financas?.custosReais?.materiais || 0);
    }, 0),
    overhead: projetos.reduce((total, p) => {
      const projetoExtendido = p as unknown as ProjetoExtendido;
      return total + (projetoExtendido.financas?.overhead || 0);
    }, 0),
    resultado: projetos.reduce((total, p) => {
      const projetoExtendido = p as unknown as ProjetoExtendido;
      return total + (projetoExtendido.financas?.resultado || 0);
    }, 0),
  };
  
  // Calculate success metrics
  const percentagemProjetos = {
    saudaveis: projetos.filter(p => {
      const projetoExtendido = p as unknown as ProjetoExtendido;
      return (projetoExtendido.financas?.custosReais?.total || 0) <= (projetoExtendido.financas?.orcamentoSubmetido || 0) * 0.7;
    }).length / projetos.length * 100,
    emRisco: projetos.filter(p => {
      const projetoExtendido = p as unknown as ProjetoExtendido;
      return (projetoExtendido.financas?.custosReais?.total || 0) > (projetoExtendido.financas?.orcamentoSubmetido || 0) * 0.7 && 
        (projetoExtendido.financas?.custosReais?.total || 0) <= (projetoExtendido.financas?.orcamentoSubmetido || 0) * 0.9;
    }).length / projetos.length * 100,
    criticos: projetos.filter(p => {
      const projetoExtendido = p as unknown as ProjetoExtendido;
      return (projetoExtendido.financas?.custosReais?.total || 0) > (projetoExtendido.financas?.orcamentoSubmetido || 0) * 0.9;
    }).length / projetos.length * 100
  };
  
  // Data for charts
  const distribuicaoCustos = [
    { name: "Recursos", value: dadosAgregados.custosRealRecursos },
    { name: "Materiais", value: dadosAgregados.custosRealMateriais }
  ];
  
  const projetosStatusData = [
    { name: "Saudáveis", value: percentagemProjetos.saudaveis, color: "#10b981" },
    { name: "Em Risco", value: percentagemProjetos.emRisco, color: "#f59e0b" },
    { name: "Críticos", value: percentagemProjetos.criticos, color: "#ef4444" }
  ];
  
  const projetosFinanceiros = projetos
    .map(p => {
      // @ts-ignore - TypeScript não reconhece os campos
      return {
        id: p.id,
        nome: p.nome,
        responsavel: p.responsavel?.name || "Não atribuído",
        orcamentoSubmetido: p.financas?.orcamentoSubmetido || 0,
        valorFinanciado: p.financas?.valorFinanciado || 0,
        custosReais: p.financas?.custosReais?.total || 0,
        resultado: p.financas?.resultado || 0,
        overhead: p.financas?.overhead || 0,
        margem: p.financas?.margem || 0
      };
    })
    .sort((a, b) => b.orcamentoSubmetido - a.orcamentoSubmetido);
  
  // Project comparison data for bar chart
  const dadosComparativoProjetos = projetosFinanceiros
    .slice(0, 5) // Top 5 by budget
    .map(p => ({
      nome: p.nome,
      orcamento: p.orcamentoSubmetido,
      financiado: p.valorFinanciado,
      custo: p.custosReais,
      resultado: p.resultado
    }));
  
  // Filter projects based on selected filter
  const projetosFiltrados = projetosFinanceiros.filter(p => {
    if (filter === "all") return true;
    if (filter === "positive" && p.resultado >= 0) return true;
    if (filter === "negative" && p.resultado < 0) return true;
    if (filter === "risk" && (p.custosReais / p.orcamentoSubmetido) > 0.7) return true;
    return false;
  });
  
  return (
    <Card className={cn("overflow-hidden border-none shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Visão Financeira dos Projetos</CardTitle>
          <CardDescription>Uma análise do estado financeiro de todos os projetos</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2 opacity-70" />
              <SelectValue placeholder="Filtrar projetos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              <SelectItem value="positive">Resultado positivo</SelectItem>
              <SelectItem value="negative">Resultado negativo</SelectItem>
              <SelectItem value="risk">Em risco orçamental</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/projetos')}
          >
            Ver todos
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <Tabs defaultValue="overview" value={viewType} onValueChange={setViewType} className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="comparison">Comparativo</TabsTrigger>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
          </TabsList>
          
          {/* Tab Content: Overview */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <StatCard 
                title="Orçamento Total Submetido" 
                value={formatCurrency(dadosAgregados.orcamentoTotalSubmitted)} 
                subtitle={`${projetosResponse.items.length} projetos`}
                icon={<Wallet className="h-6 w-6 text-blue-600" />}
                colorClass="bg-blue-50"
              />
              <StatCard 
                title="Valor Total Financiado" 
                value={formatCurrency(dadosAgregados.valorTotalFinanciado)} 
                subtitle={`${formatPercentage(dadosAgregados.valorTotalFinanciado / dadosAgregados.orcamentoTotalSubmitted * 100)} taxa média`}
                icon={<DollarSign className="h-6 w-6 text-green-600" />}
                colorClass="bg-green-50"
              />
              <StatCard 
                title="Resultado Financeiro" 
                value={
                  <span className={dadosAgregados.resultado >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(dadosAgregados.resultado)}
                  </span>
                }
                subtitle={`Overhead: ${formatCurrency(dadosAgregados.overhead)}`}
                icon={<TrendingUp className={`h-6 w-6 ${dadosAgregados.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`} />}
                colorClass={dadosAgregados.resultado >= 0 ? 'bg-green-50' : 'bg-red-50'}
              />
            </div>
            
            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
              {/* Pie Chart - Cost Distribution */}
              <Card className="overflow-hidden border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Distribuição de Custos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distribuicaoCustos}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          <Cell key="recursos" fill="#3b82f6" />
                          <Cell key="materiais" fill="#93c5fd" />
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="rounded-lg bg-blue-50 p-4">
                      <p className="text-xs font-medium text-blue-800">Recursos Humanos</p>
                      <p className="text-lg font-semibold text-blue-900">
                        {formatCurrency(dadosAgregados.custosRealRecursos)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4">
                      <p className="text-xs font-medium text-blue-800">Materiais</p>
                      <p className="text-lg font-semibold text-blue-900">
                        {formatCurrency(dadosAgregados.custosRealMateriais)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Pie Chart - Project Status */}
              <Card className="overflow-hidden border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Estado Financeiro dos Projetos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projetosStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {projetosStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">Saudáveis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="text-sm">Em Risco</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm">Críticos</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Tab Content: Project Comparison */}
          <TabsContent value="comparison">
            <Card className="overflow-hidden border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Comparativo dos Maiores Projetos</CardTitle>
                <CardDescription>Top 5 projetos por orçamento submetido</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dadosComparativoProjetos}
                      margin={{ top: 20, right: 30, left: 30, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="nome" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}k €`}
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label: string) => `Projeto: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="orcamento" name="Orçamento Submetido" fill="#3B82F6" />
                      <Bar dataKey="financiado" name="Valor Financiado" fill="#10B981" />
                      <Bar dataKey="custo" name="Custos Reais" fill="#F59E0B" />
                      <Bar dataKey="resultado" name="Resultado" fill="#6366F1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab Content: Project Details */}
          <TabsContent value="details">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Projeto</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Responsável</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Orçamento</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Financiado</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Custos Reais</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Resultado</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Estado</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {projetosFiltrados.map((projeto) => (
                    <tr key={projeto.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{projeto.nome}</td>
                      <td className="px-4 py-3">{projeto.responsavel}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(projeto.orcamentoSubmetido)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(projeto.valorFinanciado)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(projeto.custosReais)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={projeto.resultado >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(projeto.resultado)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge 
                          orcamento={projeto.orcamentoSubmetido}
                          custosReais={projeto.custosReais}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/projetos/${projeto.id}`)}
                          className="h-8 px-2"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {projetosFiltrados.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-gray-500">Não foram encontrados projetos com os critérios selecionados.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 