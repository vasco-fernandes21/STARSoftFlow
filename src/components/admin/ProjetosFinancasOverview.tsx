"use client";

// Componente que exibe uma visão geral financeira dos projetos

import { useState, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { 
  DollarSign, TrendingUp, Wallet, ChevronRight, ChevronDown,
  TrendingDown, Info, Users, Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

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

interface CustosReais {
  recursos: number;
  materiais: number;
  total: number;
  detalhesRecursos: DetalheRecurso[];
}

interface CustosConcluidos {
  recursos: number;
  materiais: number;
  total: number;
}

interface ProjetoFinancasData {
  orcamentoSubmetido: number;
  taxaFinanciamento: number;
  valorFinanciado: number;
  custosReais: {
    recursos: number;
    materiais: number;
    total: number;
    detalhesRecursos: Array<{
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
    }>;
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
        detalhesRecursos: Array<{
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

// Expanded Project Detail Component
interface ProjetoDetalheExpandidoProps {
  financas: ProjetoFinancasData;
}

function ProjetoDetalheExpandido({ financas }: ProjetoDetalheExpandidoProps) {
  const temDetalhesAnuais = financas.detalhesAnuais && financas.detalhesAnuais.length > 0 && financas.detalhesAnuais.some(d => d.orcamento.submetido > 0 || d.orcamento.real.total > 0);

  return (
    <div className="p-4 bg-slate-50/50 border-t border-slate-200/50 space-y-4">
      {/* Mini Stat Cards for the specific project */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
         <StatCard
          title="Orçamento Sub."
          value={formatCurrency(financas.orcamentoSubmetido)}
          icon={Wallet}
          color="blue"
          tooltip="Orçamento Submetido do Projeto"
          size="small"
        />
         <StatCard
          title="Custos Reais"
          value={formatCurrency(financas.custosReais.total)}
          icon={TrendingDown}
          color="orange"
          tooltip="Custos Reais Totais do Projeto"
          size="small"
        />
         <StatCard
          title="Valor Financiado"
          value={formatCurrency(financas.valorFinanciado)}
          icon={DollarSign}
          color="green"
          tooltip="Valor Financiado do Projeto"
          size="small"
        />
        <StatCard
          title="Overhead"
          value={formatCurrency(financas.overhead)}
          icon={Package}
          color="indigo"
          tooltip="Overhead do Projeto"
          size="small"
        />
        <StatCard
          title="Resultado"
          value={
             <span className={financas.resultado >= 0 ? 'text-green-700' : 'text-red-700'}>
              {formatCurrency(financas.resultado)}
             </span>
          }
          icon={financas.resultado >= 0 ? TrendingUp : TrendingDown}
          color={financas.resultado >= 0 ? 'green' : 'red'}
          tooltip="Resultado Financeiro do Projeto"
          size="small"
        />
        <StatCard
          title="Margem"
          value={formatPercentage(financas.margem)}
          icon={financas.margem >= 0 ? TrendingUp : TrendingDown}
          color={financas.margem >= 0 ? 'green' : 'red'}
          tooltip="Margem Financeira do Projeto"
          size="small"
        />
      </div>

      {/* Annual Breakdown Table (if details exist) */}
      {temDetalhesAnuais && (
        <div className="pt-2">
          <h4 className="text-xs font-medium mb-1.5 text-slate-600">Detalhe Anual</h4>
          <div className="overflow-x-auto rounded-md border border-slate-200/50 bg-white shadow-sm max-h-48">
            <Table className="text-[11px]">
              <TableHeader className="sticky top-0 bg-white/80 backdrop-blur-sm z-10">
                <TableRow className="hover:bg-slate-50/50">
                  <TableHead className="w-[50px] px-2 py-1 h-7">Ano</TableHead>
                  <TableHead className="text-right px-2 py-1 h-7">Orçamento</TableHead>
                  <TableHead className="text-right px-2 py-1 h-7">Custo Real</TableHead>
                  <TableHead className="text-right px-2 py-1 h-7">Financiado</TableHead>
                  <TableHead className="text-right px-2 py-1 h-7">Overhead</TableHead>
                  <TableHead className="text-right px-2 py-1 h-7">Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financas.detalhesAnuais?.filter(d => d.orcamento.submetido > 0 || d.orcamento.real.total > 0).map((detalhe) => (
                  <TableRow key={detalhe.ano} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-medium px-2 py-1 h-7">{detalhe.ano}</TableCell>
                    <TableCell className="text-right px-2 py-1 h-7">{formatCurrency(detalhe.orcamento.submetido)}</TableCell>
                    <TableCell className="text-right px-2 py-1 h-7">{formatCurrency(detalhe.orcamento.real.total)}</TableCell>
                    <TableCell className="text-right px-2 py-1 h-7">{formatCurrency(detalhe.valorFinanciado)}</TableCell>
                    <TableCell className="text-right px-2 py-1 h-7">{formatCurrency(detalhe.overhead)}</TableCell>
                    <TableCell className={cn(
                      "text-right font-medium px-2 py-1 h-7",
                      detalhe.resultado >= 0 ? 'text-green-700' : 'text-red-700'
                    )}>
                      {formatCurrency(detalhe.resultado)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProjetosFinancasOverviewProps {
  className?: string;
}

interface ProjetoFinanceiroResponse {
  projetos: ProjetoFinanceiroItem[];
  totaisConsolidados: TotaisConsolidados;
  projetosClassificados: ProjetosClassificados;
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
      <div className="flex items-center justify-center p-8">
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
    <div className={cn("p-4 sm:p-6 space-y-8 bg-slate-50/30", className)}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Visão Financeira Geral</h1>
          <p className="text-sm text-slate-600 mt-1">
            {selectedYear === "todos" ? "Análise do estado financeiro de todos os projetos ativos." : `Análise financeira para o ano ${selectedYear}.`}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
          {/* Year Selector */}
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white/80 backdrop-blur-sm px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 w-[140px]"
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
            className="h-9 px-4 text-sm border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 bg-white/80 backdrop-blur-sm"
            asChild
          >
            <Link href="/projetos">
              Ver Todos
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-slate-500">Orçamento Total</div>
            <div className="mt-1 text-2xl font-semibold text-slate-800">
              {formatCurrency(totais.orcamentoTotalSubmetido)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {totais.projetosComFinancas} projetos ativos
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-slate-500">Custos Reais</div>
            <div className="mt-1 text-2xl font-semibold text-slate-800">
              {formatCurrency(totais.custosReaisTotal)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {((totais.custosReaisTotal / totais.orcamentoTotalSubmetido) * 100).toFixed(1)}% do orçamento
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-slate-500">Overhead Total</div>
            <div className="mt-1 text-2xl font-semibold text-slate-800">
              {formatCurrency(totais.overheadTotal)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {((totais.overheadTotal / totais.custosReaisTotal) * 100).toFixed(1)}% dos custos reais
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-slate-500">Resultado Total</div>
            <div className={cn(
              "mt-1 text-2xl font-semibold",
              totais.resultadoTotal >= 0 ? "text-emerald-600" : "text-red-600"
            )}>
              {formatCurrency(totais.resultadoTotal)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {projetosClassificados.comResultadoPositivo} projetos positivos
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cost Distribution Chart */}
        <Card className="p-4">
          <div className="text-sm font-medium text-slate-700 mb-4">Distribuição de Custos</div>
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
                    <Cell key={`cell-${index}`} fill={index === 0 ? "#3b82f6" : "#f97316"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Project Comparison Chart */}
        <Card className="p-4">
          <div className="text-sm font-medium text-slate-700 mb-4">Comparação de Projetos (Top 7)</div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projetosFinanceirosFiltrados}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="orcamentoSubmetido" name="Orçamento" fill="#3b82f6" />
                <Bar dataKey="custosReais" name="Custos Reais" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Project Status Summary */}
      <Card className="p-4">
        <div className="text-sm font-medium text-slate-700 mb-4">Estado dos Projetos</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg">
            <div className="text-sm font-medium text-emerald-700">Saudáveis</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-600">{projetosClassificados.saudaveis}</div>
            <div className="mt-1 text-xs text-emerald-500">Custos {'<'} 70% do orçamento</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <div className="text-sm font-medium text-amber-700">Em Risco</div>
            <div className="mt-1 text-2xl font-semibold text-amber-600">{projetosClassificados.emRisco}</div>
            <div className="mt-1 text-xs text-amber-500">Custos entre 70% e 90%</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-sm font-medium text-red-700">Críticos</div>
            <div className="mt-1 text-2xl font-semibold text-red-600">{projetosClassificados.criticos}</div>
            <div className="mt-1 text-xs text-red-500">Custos {'>'} 90% do orçamento</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-700">Resultado Positivo</div>
            <div className="mt-1 text-2xl font-semibold text-blue-600">{projetosClassificados.comResultadoPositivo}</div>
            <div className="mt-1 text-xs text-blue-500">Projetos com lucro</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-sm font-medium text-slate-700">Resultado Negativo</div>
            <div className="mt-1 text-2xl font-semibold text-slate-600">{projetosClassificados.comResultadoNegativo}</div>
            <div className="mt-1 text-xs text-slate-500">Projetos com prejuízo</div>
          </div>
        </div>
      </Card>
    </div>
  );
} 