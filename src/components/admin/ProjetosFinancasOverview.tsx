"use client";

// Componente que exibe uma visão geral financeira dos projetos

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import { 
  DollarSign, TrendingUp, Wallet, ChevronRight, ChevronDown,
  TrendingDown, Package, Users, ChartBar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { type Rubrica } from "@prisma/client";

// Definição de tipos para representar a resposta da API
interface DetalheRecurso {
  userId: string;
  userName: string | null;
  salario: number;
  alocacao: number;
  custoAjustado: number;
  detalhesCalculo: {
    salarioBase: number;
    salarioAjustado: number;
    alocacao: number;
    formulaUsada: string;
  };
}

interface DetalheMaterial {
  id: number;
  nome: string;
  preco: number;
  quantidade: number;
  custoTotal: number;
  workpackage: {
    id: string;
    nome: string;
  };
  ano_utilizacao: number;
  estado: boolean;
}

interface DetalhesRubrica {
  rubrica: Rubrica;
  total: number;
  materiais: DetalheMaterial[];
}

interface DetalheAnual {
  ano: number;
  orcamento: {
    submetido: number;
    real: {
      recursos: number;
      materiais: number;
      total: number;
      detalhesRecursos: Array<{
        userId: string;
        userName: string | null;
        salario: number;
        alocacao: number;
        custoAjustado: number;
      }>;
    };
  };
  custosConcluidos: {
    recursos: number;
    materiais: number;
    total: number;
  };
  alocacoes: number;
  valorFinanciado: number;
  overhead: number;
  resultado: number;
  folga: number;
  vab: number;
  margem: number;
  vabCustosPessoal: number;
}

interface ProjetoFinancasData {
  orcamentoSubmetido: number;
  taxaFinanciamento: number;
  valorFinanciado: number;
  custosReais: {
    recursos: number;
    materiais: number;
    total: number;
    detalhesRecursos: DetalheRecurso[];
    detalhesMateriais: DetalhesRubrica[];
  };
  custosConcluidos: {
    recursos: number;
    materiais: number;
    total: number;
  };
  overhead: number;
  resultado: number;
  folga: number;
  vab: number;
  margem: number;
  vabCustosPessoal: number;
  anos?: number[];
  detalhesAnuais?: Array<{
    ano: number;
    orcamento: {
      submetido: number;
      real: {
        recursos: number;
        materiais: number;
        total: number;
        detalhesRecursos: DetalheRecurso[];
        detalhesMateriais: DetalhesRubrica[];
      };
    };
    custosConcluidos: {
      recursos: number;
      materiais: number;
      total: number;
    };
    alocacoes: number;
    valorFinanciado: number;
    overhead: number;
    resultado: number;
    folga: number;
    vab: number;
    margem: number;
    vabCustosPessoal: number;
  }>;
}

interface ProjetoFinanceiroItem {
  id: string;
  nome: string;
  estado: string;
  responsavel: {
    id: string;
    name: string | null;
  } | null;
  progresso: number;
  financas: ProjetoFinancasData;
}

interface TotaisConsolidados {
  totalProjetosConsultados: number;
  projetosComFinancas: number;
  orcamentoTotalSubmetido: number;
  valorTotalFinanciado: number;
  custosReaisTotal: number;
  custosConcluidosTotal: number;
  overheadTotal: number;
  resultadoTotal: number;
  folgaTotal: number;
}

interface ProjetosClassificados {
  saudaveis: number;
  emRisco: number;
  criticos: number;
  comResultadoPositivo: number;
  comResultadoNegativo: number;
}

interface VisaoGeralFinanceira {
  meta: {
    tipo: "visao_geral";
    filtroAno: number | null;
    apenasAtivos: boolean;
    incluiDetalhes: boolean;
  };
  projetos: ProjetoFinanceiroItem[];
  totaisConsolidados: TotaisConsolidados;
  projetosClassificados: ProjetosClassificados;
  taxaMediaFinanciamento: number;
  margemMedia: number;
  progressoFinanceiroMedio: number;
  progressoFisicoMedio: number;
  detalhesAnuais?: Array<DetalheAnual>;
}

// Helpers for formatting
const formatPercentage = (value: number | undefined | null, fractionDigits = 1): string => {
  if (typeof value !== 'number' || isNaN(value)) return "-";
  const percentValue = Math.abs(value) > 1 ? value / 100 : value;
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
    return <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0.5 bg-slate-100 text-slate-500 hover:bg-slate-200 border-none">N/A</Badge>;
  }
  
  const percentagemGasta = (custosReais / orcamento) * 100;
  
  if (percentagemGasta < 70) 
    return <Badge variant="default" className="text-xs font-normal px-1.5 py-0.5 bg-slate-100 text-emerald-700 hover:bg-emerald-50 border-none">Saudável</Badge>;
  if (percentagemGasta < 90) 
    return <Badge variant="warning" className="text-xs font-normal px-1.5 py-0.5 bg-slate-100 text-amber-700 hover:bg-amber-50 border-none">Risco</Badge>;
  if (percentagemGasta < 100) 
    return <Badge variant="orange" className="text-xs font-normal px-1.5 py-0.5 bg-slate-100 text-orange-700 hover:bg-orange-50 border-none">Alerta</Badge>;
  
  return <Badge variant="destructive" className="text-xs font-normal px-1.5 py-0.5 bg-slate-100 text-red-700 hover:bg-red-50 border-none">Crítico</Badge>;
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'indigo';
  subtitle?: string;
  tooltip?: string;
  size?: 'normal' | 'small';
}

function StatCard({ title, value, icon: Icon, color = 'blue', subtitle, tooltip, size = 'normal' }: StatCardProps) {
  const colorClasses = {
    blue: { bg: 'bg-slate-100', text: 'text-blue-600' },
    green: { bg: 'bg-slate-100', text: 'text-green-600' },
    orange: { bg: 'bg-slate-100', text: 'text-orange-600' },
    red: { bg: 'bg-slate-100', text: 'text-red-600' },
    indigo: { bg: 'bg-slate-100', text: 'text-indigo-600' },
  };

  const isSmall = size === 'small';

  return (
    <Card
      className={cn(
        "overflow-hidden border border-slate-200/50 shadow-sm hover:shadow transition-shadow duration-200 h-full group",
        isSmall ? "" : ""
      )}
      title={tooltip}
    >
      <CardContent className={cn("flex flex-col justify-between h-full", isSmall ? "p-3" : "p-4")}>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 flex-1">
            <h3 className={cn("font-medium text-slate-500 uppercase tracking-wider", isSmall ? "text-[10px]" : "text-xs")}>{title}</h3>
            <div className={cn("font-bold text-slate-800", isSmall ? "text-lg" : "text-2xl")}>{value}</div>
          </div>
          <div className={cn(`rounded-lg ${colorClasses[color].bg}`, isSmall ? "p-1.5" : "p-2")}>
            <Icon className={cn(colorClasses[color].text, isSmall ? "h-4 w-4" : "h-5 w-5")} />
          </div>
        </div>
        {subtitle && <p className={cn("mt-1.5 text-slate-500", isSmall ? "text-[11px]" : "text-xs")}>{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

interface ProjetosFinancasOverviewProps {
  className?: string;
}

// Helper function to get badge variant based on project status
function getStatusVariant(estado: string): "default" | "warning" | "destructive" | "outline" {
  switch (estado.toLowerCase()) {
    case "em execução":
      return "default";
    case "risco":
      return "warning";
    case "crítico":
      return "destructive";
    default:
      return "outline";
  }
}

export function ProjetosFinancasOverview({ className }: ProjetosFinancasOverviewProps) {
  const [selectedYear, setSelectedYear] = useState<string>("todos");
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const { data, isLoading } = api.financas.getTotaisFinanceiros.useQuery({
    apenasAtivos: true,
    incluirDetalhesPorAno: true,
    ano: selectedYear !== "todos" ? parseInt(selectedYear) : undefined
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-sm text-slate-500">Carregando dados financeiros...</div>
      </div>
    );
  }

  const visaoGeral = data as VisaoGeralFinanceira;
  const { projetos, totaisConsolidados: totais, projetosClassificados } = visaoGeral;

  // Get available years from all projects
  const availableYears = Array.from(new Set(
    projetos.flatMap((p) => p.financas.anos || [])
  )).sort((a: number, b: number) => b - a);

  // Prepare data for cost distribution chart
  const custoRecursosFiltrado = projetos.reduce((total: number, p: ProjetoFinanceiroItem) => 
    total + p.financas.custosReais.recursos, 0);
  const custoMateriaisFiltrado = projetos.reduce((total: number, p: ProjetoFinanceiroItem) => 
    total + p.financas.custosReais.materiais, 0);

  const distribuicaoCustosFiltrada = [
    { name: "Recursos", value: custoRecursosFiltrado },
    { name: "Materiais", value: custoMateriaisFiltrado }
  ].filter(item => item.value > 0);

  // Prepare data for the comparison chart (Top 7 by budget)
  const projetosFinanceirosFiltrados = projetos
    .map(p => ({
      id: p.id,
      nome: p.nome,
      responsavel: p.responsavel?.name || "N/A",
      orcamentoSubmetido: p.financas.orcamentoSubmetido,
      custosReais: p.financas.custosReais.total,
      resultado: p.financas.resultado,
      progressoFisico: p.progresso
    }))
    .sort((a, b) => b.orcamentoSubmetido - a.orcamentoSubmetido)
    .slice(0, 7);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Grid - Usando um grid mais compacto e moderno */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Orçamento Total</p>
                <h3 className="text-xl font-semibold text-slate-800 mt-1">
                  {formatCurrency(totais.orcamentoTotalSubmetido)}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {totais.projetosComFinancas} projetos ativos
                </p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-azul-subtle flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-azul" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Custos Reais</p>
                <h3 className="text-xl font-semibold text-slate-800 mt-1">
                  {formatCurrency(totais.custosReaisTotal)}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {((totais.custosReaisTotal / totais.orcamentoTotalSubmetido) * 100).toFixed(1)}% do orçamento
                </p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overhead Total</p>
                <h3 className="text-xl font-semibold text-slate-800 mt-1">
                  {formatCurrency(totais.overheadTotal)}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {((totais.overheadTotal / totais.custosReaisTotal) * 100).toFixed(1)}% dos custos reais
                </p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Package className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Resultado Total</p>
                <h3 className={cn(
                  "text-xl font-semibold mt-1",
                  totais.resultadoTotal >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {formatCurrency(totais.resultadoTotal)}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {projetosClassificados.comResultadoPositivo} projetos positivos
                </p>
              </div>
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center",
                totais.resultadoTotal >= 0 ? "bg-emerald-50" : "bg-red-50"
              )}>
                <TrendingUp className={cn(
                  "h-4 w-4",
                  totais.resultadoTotal >= 0 ? "text-emerald-600" : "text-red-600"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Folga Total</p>
                <h3 className={cn(
                  "text-xl font-semibold mt-1",
                  totais.folgaTotal >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {formatCurrency(totais.folgaTotal)}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Margem de {formatPercentage(visaoGeral.margemMedia)}
                </p>
              </div>
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center",
                totais.folgaTotal >= 0 ? "bg-emerald-50" : "bg-red-50"
              )}>
                <TrendingUp className={cn(
                  "h-4 w-4",
                  totais.folgaTotal >= 0 ? "text-emerald-600" : "text-red-600"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Ações */}
      <div className="flex items-center justify-end gap-2">
        <select
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-azul disabled:cursor-not-allowed disabled:opacity-50 w-[140px]"
          value={selectedYear}
          onChange={(e) => {
            setSelectedYear(e.target.value);
            setExpandedProjectId(null);
          }}
        >
          <option value="todos">Todos os Anos</option>
          {availableYears.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-4 text-sm border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          asChild
        >
          <Link href="/projetos">
            Ver Todos
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </Button>
      </div>

      {/* Charts Section - Usando cores do tema */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-slate-800 mb-4">Distribuição de Custos</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribuicaoCustosFiltrada}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {distribuicaoCustosFiltrada.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#2C5697" : "#94A3B8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-slate-800 mb-4">Comparação de Projetos (Top 7)</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={projetosFinanceirosFiltrados}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="nome" 
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    axisLine={{ stroke: '#E2E8F0' }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    axisLine={{ stroke: '#E2E8F0' }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar dataKey="orcamentoSubmetido" name="Orçamento" fill="#2C5697" />
                  <Bar dataKey="custosReais" name="Custos Reais" fill="#94A3B8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Projetos */}
      <Card className="bg-white border-none shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-slate-800 mb-4">Lista de Projetos</h3>
          <div className="space-y-4">
            {projetos.map((projeto) => {
              const percentagemGasta = projeto.financas.orcamentoSubmetido > 0
                ? (projeto.financas.custosReais.total / projeto.financas.orcamentoSubmetido) * 100
                : 0;

              return (
                <div key={projeto.id} className="group">
                  <div className="flex items-start justify-between gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          {projeto.nome}
                        </h3>
                        <Badge 
                          variant={getStatusVariant(projeto.estado)} 
                          className="text-xs font-normal px-1.5 py-0.5"
                        >
                          {projeto.estado}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          <span className="truncate">
                            Responsável: {projeto.responsavel?.name || "Sem responsável"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ChartBar className="h-4 w-4" />
                          <span>Progresso: {formatPercentage(projeto.progresso, 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-slate-500 mb-0.5">Orçamento Total</div>
                          <div className="font-medium">{formatCurrency(projeto.financas.orcamentoSubmetido)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500 mb-0.5">Resultado</div>
                          <div className={cn(
                            "font-medium",
                            projeto.financas.resultado >= 0 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {formatCurrency(projeto.financas.resultado)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500 mb-0.5">Folga</div>
                          <div className={cn(
                            "font-medium",
                            projeto.financas.folga >= 0 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {(() => {
                              // Get the first year's overhead to exclude it from the calculation
                              const primeiroAnoOverhead = projeto.financas.detalhesAnuais?.find(
                                d => d.ano === Math.min(...(projeto.financas.detalhesAnuais?.map(d => d.ano) ?? []))
                              )?.overhead ?? 0;
                              
                              // Calculate folga excluding first year overhead
                              const folgaTotal = projeto.financas.orcamentoSubmetido - projeto.financas.custosReais.total + 
                                (projeto.financas.overhead - primeiroAnoOverhead);
                              
                              return formatCurrency(folgaTotal);
                            })()}
                          </div>
                        </div>
                        <div className="text-right border-l pl-4 border-slate-200">
                          <div className="text-xs text-slate-500 mb-0.5">Resultado + Folga</div>
                          {(() => {
                            // Get the first year's overhead to exclude it from the calculation
                            const primeiroAnoOverhead = projeto.financas.detalhesAnuais?.find(
                              d => d.ano === Math.min(...(projeto.financas.detalhesAnuais?.map(d => d.ano) ?? []))
                            )?.overhead ?? 0;
                            
                            // Calculate folga excluding first year overhead
                            const folgaTotal = projeto.financas.orcamentoSubmetido - projeto.financas.custosReais.total + 
                              (projeto.financas.overhead - primeiroAnoOverhead);
                            
                            // Calculate the sum of resultado and folga
                            const resultadoMaisFolga = projeto.financas.resultado + folgaTotal;
                            
                            return (
                              <div className={cn(
                                "font-medium",
                                resultadoMaisFolga >= 0 ? "text-emerald-600" : "text-red-600"
                              )}>
                                {formatCurrency(resultadoMaisFolga)}
                              </div>
                            );
                          })()}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-slate-400 hover:text-slate-600"
                          onClick={() => setExpandedProjectId(expandedProjectId === projeto.id ? null : projeto.id)}
                        >
                          {expandedProjectId === projeto.id ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                      <StatusBadge 
                        orcamento={projeto.financas.orcamentoSubmetido} 
                        custosReais={projeto.financas.custosReais.total} 
                      />
                    </div>
                  </div>

                  {/* Project Details (Expanded) */}
                  {expandedProjectId === projeto.id && (
                    <div className="border-t border-slate-200">
                      {/* Annual Details Table */}
                      <div className="p-4 bg-slate-50/50">
                        <h4 className="text-sm font-medium text-slate-700 mb-3">Detalhes por Ano</h4>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Ano</TableHead>
                                <TableHead className="text-right">Orçamento</TableHead>
                                <TableHead className="text-right">Custos Reais</TableHead>
                                <TableHead className="text-right">Valor Financiado</TableHead>
                                <TableHead className="text-right">Overhead</TableHead>
                                <TableHead className="text-right">Resultado</TableHead>
                                <TableHead className="text-right">Margem</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projetos.some(p => Array.isArray(p.financas.detalhesAnuais) && p.financas.detalhesAnuais.length > 0) ? (
                                projetos
                                  .flatMap(projeto => 
                                    (projeto.financas.detalhesAnuais || [])
                                      .filter(detalhe => selectedYear === "todos" || detalhe.ano.toString() === selectedYear)
                                      .map((detalhe: DetalheAnual) => ({
                                        ...detalhe,
                                        projetoId: projeto.id,
                                        projetoNome: projeto.nome
                                      }))
                                  )
                                  .sort((a, b) => b.ano - a.ano)
                                  .map(detalhe => (
                                    <TableRow key={`${detalhe.projetoId}-${detalhe.ano}`}>
                                      <TableCell className="font-medium">{detalhe.projetoNome}</TableCell>
                                      <TableCell>{detalhe.ano}</TableCell>
                                      <TableCell>{formatCurrency(detalhe.orcamento.submetido)}</TableCell>
                                      <TableCell>{formatCurrency(detalhe.orcamento.real.total)}</TableCell>
                                      <TableCell>
                                        <span className={cn(
                                          "font-medium",
                                          detalhe.resultado > 0 ? "text-green-600" : "text-red-600"
                                        )}>
                                          {formatCurrency(detalhe.resultado)}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <span className={cn(
                                          "font-medium",
                                          detalhe.margem > 0 ? "text-green-600" : "text-red-600"
                                        )}>
                                          {detalhe.margem.toFixed(1)}%
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                                    Nenhum detalhe anual disponível para os projetos selecionados.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Resource Details */}
                      {projeto.financas.custosReais.detalhesRecursos?.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-slate-700 mb-3">Custos com Recursos</h4>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Recurso</TableHead>
                                  <TableHead className="text-right">Alocação Total</TableHead>
                                  <TableHead className="text-right">Custo Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Object.values(
                                  (projeto.financas.custosReais.detalhesRecursos || [])
                                    .reduce<Record<string, {
                                      userId: string;
                                      userName: string | null;
                                      alocacaoTotal: number;
                                      custoTotal: number;
                                    }>>((acc, recurso: DetalheRecurso) => {
                                      const key = recurso.userId;
                                      if (!acc[key]) {
                                        acc[key] = {
                                          userId: recurso.userId,
                                          userName: recurso.userName,
                                          alocacaoTotal: 0,
                                          custoTotal: 0
                                        };
                                      }
                                      acc[key].alocacaoTotal += recurso.alocacao;
                                      acc[key].custoTotal += recurso.custoAjustado;
                                      return acc;
                                    }, {})
                                ).map((recurso) => (
                                  <TableRow key={recurso.userId}>
                                    <TableCell>{recurso.userName || "Sem nome"}</TableCell>
                                    <TableCell className="text-right">{formatPercentage(recurso.alocacaoTotal)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(recurso.custoTotal)}</TableCell>
                                  </TableRow>
                                ))}
                                {/* Linha de total */}
                                <TableRow className="border-t-2 border-slate-200">
                                  <TableCell className="font-medium">Total</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatPercentage(
                                      (projeto.financas.custosReais.detalhesRecursos || [])
                                        .reduce((total, recurso) => total + recurso.alocacao, 0)
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(
                                      (projeto.financas.custosReais.detalhesRecursos || [])
                                        .reduce((total, recurso) => total + recurso.custoAjustado, 0)
                                    )}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      {/* Outros Custos Section */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-slate-700 mb-3">Outros Custos</h4>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Rubrica</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Nº Materiais</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projeto.financas.custosReais.detalhesMateriais?.map((detalhe) => (
                                <TableRow key={detalhe.rubrica}>
                                  <TableCell>
                                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                      {detalhe.rubrica.replace(/_/g, ' ').toLowerCase()}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(detalhe.total)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {detalhe.materiais.length}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="border-t-2 border-slate-200">
                                <TableCell className="font-medium">Total</TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(projeto.financas.custosReais.materiais)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {projeto.financas.custosReais.detalhesMateriais?.reduce(
                                    (total, rubrica) => total + rubrica.materiais.length, 
                                    0
                                  ) ?? 0}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 