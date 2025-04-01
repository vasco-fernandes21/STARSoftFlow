"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  ArrowUpDown,
  Percent,
  FileText,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { badgeVariants } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VariantProps } from "class-variance-authority";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/api/root";
import { formatarMoeda, formatarNumero } from "@/lib/formatters";

// --- Type Definitions ---

// Base output type inferred from tRPC
type RouterOutput = inferRouterOutputs<AppRouter>;
type FinancasBaseOutput = RouterOutput["financas"]["getTotaisFinanceiros"];

// Types matching the *mapped* structure returned by getTotaisFinanceiros when details=true
interface DetalheRecursoCalculoMapped {
  salarioBase: number;
  salarioAjustado: number;
  alocacao: number;
  formulaUsada: string;
}

interface DetalheRecursoMapped {
  userId: string;
  userName: string | null;
  salario: number;
  alocacao: number;
  custoAjustado: number;
  detalhesCalculo: DetalheRecursoCalculoMapped;
}

interface DetalheAnualMapped {
  ano: number;
  orcamento: {
    submetido: number;
    real: {
      recursos: number;
      materiais: number;
      total: number;
      detalhesRecursos: DetalheRecursoMapped[];
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

// Use type intersection instead of extends for better compatibility with inferred types
interface FinancasBase {
  orcamentoSubmetido: number;
  taxaFinanciamento: number;
  valorFinanciado: number;
  custosReais: {
    recursos: number;
    materiais: number;
    total: number;
    detalhesRecursos: DetalheRecursoMapped[];
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
  meta: {
    tipo: "projeto_individual";
    projetoId: string;
    filtroAno: number | undefined;
    incluiDetalhes: boolean;
  };
}

type FinancasComDetalhes = FinancasBase & {
  anos: number[];
  detalhesAnuais: DetalheAnualMapped[];
};

// Type Guard: Checks if the fetched data has the detailed structure
function isFinancasComDetalhes(
  data: FinancasBaseOutput | undefined | null
): data is FinancasComDetalhes {
  return (
    !!data &&
    typeof data === "object" &&
    "orcamentoSubmetido" in data &&
    "taxaFinanciamento" in data &&
    "valorFinanciado" in data &&
    "custosReais" in data &&
    "custosConcluidos" in data &&
    "overhead" in data &&
    "resultado" in data &&
    "folga" in data &&
    "vab" in data &&
    "margem" in data &&
    "vabCustosPessoal" in data &&
    "meta" in data &&
    "detalhesAnuais" in data &&
    Array.isArray((data as any).detalhesAnuais) &&
    "anos" in data &&
    Array.isArray((data as any).anos) &&
    data.meta.tipo === "projeto_individual"
  );
}

// Interface for the data displayed in the Overview StatCards
interface DisplayData {
  orcamentoSubmetido: number | null;
  taxaFinanciamento: number | null;
  custosReais: {
    total: number | null;
    recursos: number | null;
    materiais: number | null;
  };
  custosConcluidos: {
    total: number | null;
    recursos: number | null;
    materiais: number | null;
  };
  valorFinanciado: number | null;
  overhead: number | null;
  resultado: number | null;
  margem: number | null;
  vab: number | null;
  vabCustosPessoal: number | null;
}
// --- End Type Definitions ---

interface ProjetoFinancasProps {
  projetoId: string;
}

// --- Formatting Functions ---
const formatNumber = (value: number | undefined | null, fractionDigits = 2): string => {
  if (typeof value !== "number" || isNaN(value)) return "-";
  if (fractionDigits === 0) return formatarNumero(value);
  return value.toLocaleString("pt-PT", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const formatCurrency = (value: number | undefined | null): string => {
  if (typeof value !== "number" || isNaN(value)) return "- €";
  return formatarMoeda(value);
};

const formatPercentage = (value: number | undefined | null, fractionDigits = 1): string => {
  if (typeof value !== "number" || isNaN(value)) return "-";
  const percentValue = Math.abs(value) > 1 ? value / 100 : value;
  return percentValue.toLocaleString("pt-PT", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};
// --- End Formatting Functions ---

// --- UI Components ---
interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  colorClass?: string;
  subtitle?: string;
  tooltipText?: string;
}

function StatCard({
  title,
  value,
  icon,
  colorClass = "bg-blue-50",
  subtitle,
  tooltipText,
}: StatCardProps) {
  const cardContent = (
    <Card className="h-full overflow-hidden border-none shadow-sm">
      <CardContent className="flex h-full flex-col p-6">
        <div className="flex flex-grow items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
            {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div className={`rounded-full p-3 ${colorClass} flex-shrink-0`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  // Using basic title attribute for tooltip as a fallback for simplicity
  return <div title={tooltipText}>{cardContent}</div>;
}

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

interface OrcamentoStatus {
  label: string;
  variant: BadgeVariant;
}
// --- End UI Components ---

export function ProjetoFinancas({ projetoId }: ProjetoFinancasProps) {
  const [selectedYear, setSelectedYear] = useState<string>("todos"); // State for year filter

  const {
    data: financas,
    isLoading,
    error,
  } = api.financas.getTotaisFinanceiros.useQuery({
    projetoId,
    incluirDetalhesPorAno: true, // Always fetch details
  });

  // --- Helper Functions ---
  const getOrcamentoStatus = (
    orcamentoTotal: number | undefined | null,
    custosReaisTotal: number | undefined | null
  ): OrcamentoStatus => {
    if (
      typeof orcamentoTotal !== "number" ||
      isNaN(orcamentoTotal) ||
      orcamentoTotal <= 0 ||
      typeof custosReaisTotal !== "number" ||
      isNaN(custosReaisTotal)
    ) {
      return { label: "N/A", variant: "secondary" };
    }
    const percentagemGasta = (custosReaisTotal / orcamentoTotal) * 100;

    if (percentagemGasta < 70) return { label: "Dentro do orçamento", variant: "default" };
    if (percentagemGasta < 90) return { label: "A aproximar-se do limite", variant: "warning" };
    if (percentagemGasta < 100) return { label: "Próximo do limite", variant: "orange" };
    return { label: "Acima do orçamento", variant: "red" };
  };
  // --- End Helper Functions ---

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
          <h3 className="mb-2 text-lg font-medium text-red-800">
            Erro ao carregar dados financeiros
          </h3>
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      </div>
    );
  }

  // --- Data Validation and Processing ---
  // Use the type guard to ensure we have the detailed data structure
  if (!isFinancasComDetalhes(financas)) {
    return (
      <div className="rounded-lg bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">
          Dados financeiros incompletos ou não disponíveis para análise detalhada.
        </p>
      </div>
    );
  }

  // Now 'financas' is guaranteed to be of type FinancasComDetalhes
  const detalhesAnuais = financas.detalhesAnuais; // Use the correctly typed array
  const anosDisponiveis = financas.anos.sort((a, b) => b - a); // Sort years descending

  // --- Data Filtering for Overview Tab ---
  let displayData: DisplayData;
  if (selectedYear === "todos") {
    // Use overall totals from the main financas object
    displayData = {
      orcamentoSubmetido: financas.orcamentoSubmetido,
      taxaFinanciamento: financas.taxaFinanciamento,
      custosReais: {
        total: financas.custosReais.total,
        recursos: financas.custosReais.recursos,
        materiais: financas.custosReais.materiais,
      },
      custosConcluidos: {
        total: financas.custosConcluidos.total,
        recursos: financas.custosConcluidos.recursos,
        materiais: financas.custosConcluidos.materiais,
      },
      valorFinanciado: financas.valorFinanciado,
      overhead: financas.overhead,
      resultado: financas.resultado,
      margem: financas.margem,
      vab: financas.vab,
      vabCustosPessoal: financas.vabCustosPessoal,
    };
  } else {
    const yearNum = parseInt(selectedYear, 10);
    // Find data in the correctly typed detalhesAnuais array
    const anoSelecionadoData = detalhesAnuais.find((d) => d.ano === yearNum);

    if (anoSelecionadoData) {
      // Use data for the selected year
      displayData = {
        orcamentoSubmetido: anoSelecionadoData.orcamento.submetido,
        taxaFinanciamento: financas.taxaFinanciamento, // Taxa is project-wide
        custosReais: {
          total: anoSelecionadoData.orcamento.real.total,
          recursos: anoSelecionadoData.orcamento.real.recursos,
          materiais: anoSelecionadoData.orcamento.real.materiais,
        },
        custosConcluidos: {
          total: anoSelecionadoData.custosConcluidos.total,
          recursos: anoSelecionadoData.custosConcluidos.recursos,
          materiais: anoSelecionadoData.custosConcluidos.materiais,
        },
        valorFinanciado: anoSelecionadoData.valorFinanciado,
        overhead: anoSelecionadoData.overhead,
        resultado: anoSelecionadoData.resultado,
        margem: anoSelecionadoData.margem,
        vab: anoSelecionadoData.vab,
        vabCustosPessoal: anoSelecionadoData.vabCustosPessoal,
      };
    } else {
      // Fallback: Initialize with nulls if data for the year is somehow missing
      displayData = {
        orcamentoSubmetido: null,
        taxaFinanciamento: null,
        custosReais: { total: null, recursos: null, materiais: null },
        custosConcluidos: { total: null, recursos: null, materiais: null },
        valorFinanciado: null,
        overhead: null,
        resultado: null,
        margem: null,
        vab: null,
        vabCustosPessoal: null,
      };
    }
  }
  // --- End Data Filtering Logic ---

  // Status based on filtered data
  const statusOrcamento = getOrcamentoStatus(
    displayData.orcamentoSubmetido,
    displayData.custosConcluidos.total
  );

  // --- Chart Data Preparation (Unfiltered) ---
  const dadosGraficoComparacao = detalhesAnuais.map((detalhe: DetalheAnualMapped) => ({
    ano: detalhe.ano.toString(),
    submetido: detalhe.orcamento.submetido,
    real: detalhe.orcamento.real.total,
    resultado: detalhe.resultado,
  }));

  const dadosGraficoSubmissao = detalhesAnuais.map((detalhe: DetalheAnualMapped) => ({
    ano: detalhe.ano.toString(),
    orcamento: detalhe.orcamento.submetido,
    alocacoes: detalhe.alocacoes,
    valorFinanciado: detalhe.valorFinanciado,
  }));

  const dadosGraficoReal = detalhesAnuais.map((detalhe: DetalheAnualMapped) => ({
    ano: detalhe.ano.toString(),
    recursos: detalhe.orcamento.real.recursos,
    materiais: detalhe.orcamento.real.materiais,
    total: detalhe.orcamento.real.total,
    overhead: detalhe.overhead,
  }));
  // --- End Chart Data Preparation ---

  // Progress calculation based on filtered data - using custosConcluidos instead of custosReais
  // Modificando para usar os custos reais como base para 100% da barra de progresso
  const baseOrcamento = displayData.custosReais.total ?? 0;
  const progressoOrcamento =
    baseOrcamento > 0
      ? Math.min(((displayData.custosConcluidos.total ?? 0) / baseOrcamento) * 100, 100)
      : 0;

  // Calcular a posição do valor financiado como percentagem dos custos reais
  const posicaoValorFinanciado =
    baseOrcamento > 0
      ? Math.min(((displayData.valorFinanciado ?? 0) / baseOrcamento) * 100, 100)
      : 0;

  // Overall total ETIs (unfiltered)
  const totalEtis = (detalhesAnuais as DetalheAnualMapped[]).reduce(
    (acc: number, item: DetalheAnualMapped) => acc + (item.alocacoes ?? 0),
    0
  );

  // --- Component Return ---
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Finanças</h1>
        <Badge variant={statusOrcamento.variant} className="px-3 py-1.5 text-sm font-medium">
          {statusOrcamento.label}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="orcamento-submetido">Orçamento Submetido</TabsTrigger>
          <TabsTrigger value="orcamento-real">Orçamento Real</TabsTrigger>
          <TabsTrigger value="folga">Folga</TabsTrigger>
        </TabsList>

        {/* === Visão Geral Tab === */}
        <TabsContent value="overview" className="space-y-6">
          {/* Year Filter */}
          <div className="flex justify-end">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4 opacity-50" />
                <SelectValue placeholder="Filtrar por ano..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Anos</SelectItem>
                {/* Corrected map function */}
                {anosDisponiveis.map((ano: number) => (
                  <SelectItem key={ano} value={ano.toString()}>
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stat Cards Row 1 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <StatCard
              title="Orçamento Submetido"
              value={formatCurrency(displayData.orcamentoSubmetido)}
              subtitle={`Taxa: ${formatPercentage(displayData.taxaFinanciamento)}`}
              icon={<Wallet className="h-6 w-6 text-blue-600" />}
              colorClass="bg-blue-50"
              tooltipText="Valor total do orçamento planeado e submetido."
            />
            <StatCard
              title="Orçamento Real"
              value={formatCurrency(displayData.custosReais.total)}
              subtitle={`Concluído: ${formatPercentage(progressoOrcamento)}`}
              icon={<DollarSign className="h-6 w-6 text-blue-500" />}
              colorClass="bg-blue-50"
              tooltipText="Custos reais totais projetados (Recursos + Materiais). A percentagem 'Concluído' mostra quanto do orçamento já foi gasto."
            />
            <StatCard
              title="Valor Financiado"
              value={formatCurrency(displayData.valorFinanciado)}
              subtitle={`Overhead: ${formatCurrency(displayData.overhead)}`}
              icon={<ArrowUpDown className="h-6 w-6 text-green-600" />}
              colorClass="bg-green-50"
              tooltipText="Valor recebido do financiamento (Orçamento Submetido * Taxa Financiamento)."
            />
          </div>
          {/* Stat Cards Row 2 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <StatCard
              title="Resultado Financeiro"
              value={
                <span
                  className={(displayData.resultado ?? 0) >= 0 ? "text-green-600" : "text-red-600"}
                >
                  {formatCurrency(displayData.resultado)}
                </span>
              }
              icon={
                <TrendingUp
                  className={`h-6 w-6 ${(displayData.resultado ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                />
              }
              colorClass={(displayData.resultado ?? 0) >= 0 ? "bg-green-50" : "bg-red-50"}
              tooltipText="(Valor Financiado - Custos Reais) + Overhead."
            />
            <StatCard
              title="Margem"
              value={
                <span
                  className={(displayData.margem ?? 0) >= 0 ? "text-green-600" : "text-red-600"}
                >
                  {formatPercentage(displayData.margem)}
                </span>
              }
              icon={
                <Percent
                  className={`h-6 w-6 ${(displayData.margem ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                />
              }
              colorClass={(displayData.margem ?? 0) >= 0 ? "bg-green-50" : "bg-red-50"}
              tooltipText="(Resultado Financeiro / Orçamento Submetido) * 100."
            />
            <StatCard
              title="VAB / Custos Pessoal"
              value={formatNumber(displayData.vabCustosPessoal)}
              subtitle={`VAB: ${formatCurrency(displayData.vab)}`}
              icon={<FileText className="h-6 w-6 text-indigo-600" />}
              colorClass="bg-indigo-50"
              tooltipText="Valor Acrescentado Bruto (VAB = Valor Financiado - Custos Materiais) a dividir pelos Custos com Pessoal."
            />
          </div>

          {/* Progress Card */}
          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">
                Progresso Financeiro {selectedYear !== "todos" ? `(${selectedYear})` : "(Total)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Progresso</span>
                  <span>
                    {formatCurrency(displayData.custosConcluidos.total)}
                    {(displayData.custosReais.total ?? 0) > 0 &&
                      ` / ${formatCurrency(displayData.custosReais.total)}`}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="relative">
                    <Progress value={progressoOrcamento} className="h-3 w-full bg-gray-100" />
                    {/* Indicador do valor financiado */}
                    {posicaoValorFinanciado > 0 && posicaoValorFinanciado < 100 && (
                      <div
                        className="absolute top-0 h-5 w-0.5 bg-green-600"
                        style={{
                          left: `${posicaoValorFinanciado}%`,
                          transform: "translateX(-50%)",
                        }}
                        title={`Valor Financiado: ${formatCurrency(displayData.valorFinanciado)}`}
                      >
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 transform whitespace-nowrap text-xs text-green-700">
                          Financiado
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100% ({formatCurrency(baseOrcamento)})</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-xs font-medium text-blue-800">Custos com Recursos</p>
                    <p className="text-lg font-semibold text-blue-900">
                      {formatCurrency(displayData.custosConcluidos.recursos)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-100 p-4">
                    <p className="text-xs font-medium text-gray-700">Custos com Materiais</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(displayData.custosConcluidos.materiais)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Overall Comparison Chart (Unfiltered) */}
              {dadosGraficoComparacao.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-4 text-sm font-medium text-gray-900">
                    Comparação Anual (Geral)
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dadosGraficoComparacao}
                        margin={{ top: 10, right: 30, left: 30, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                          dataKey="ano"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                          tickFormatter={(value: number) => `${formatNumber(value / 1000, 0)}k €`}
                        />
                        <RechartsTooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label: string) => `Ano: ${label}`}
                        />
                        <Bar
                          dataKey="submetido"
                          name="Orçamento Submetido"
                          fill="#3B82F6"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="real"
                          name="Custos Reais"
                          fill="#60A5FA"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Orçamento Submetido Tab (Unfiltered Data) === */}
        <TabsContent value="orcamento-submetido" className="space-y-6">
          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Orçamento Submetido por Ano</CardTitle>
              <p className="text-sm text-gray-500">
                Apresenta o orçamento submetido baseado em alocações de recursos por ano.
              </p>
            </CardHeader>
            <CardContent>
              {/* Use unfiltered detalhesAnuais here */}
              {detalhesAnuais.length > 0 ? (
                <>
                  <div className="mb-6 h-80">
                    {/* Chart */}
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dadosGraficoSubmissao} // Uses unfiltered chart data
                        margin={{ top: 10, right: 30, left: 30, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                          dataKey="ano"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                          tickFormatter={(value: number) => `${formatNumber(value / 1000, 0)}k €`}
                        />
                        <RechartsTooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label: string) => `Ano: ${label}`}
                        />
                        <Bar
                          dataKey="orcamento"
                          name="Orçamento Submetido"
                          fill="#3B82F6"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="valorFinanciado"
                          name="Valor Financiado"
                          fill="#60A5FA"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                    {/* Table */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-2 text-left font-medium text-gray-500">Ano</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">
                            ETIs Alocados
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">
                            Orçamento Submetido
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">
                            Valor Financiado
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">Margem</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">VAB</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">
                            VAB/Custos
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Use unfiltered detalhesAnuais */}
                        {detalhesAnuais.map((detalhe: DetalheAnualMapped) => (
                          <tr
                            key={detalhe.ano}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 font-medium">{detalhe.ano}</td>
                            <td className="px-4 py-3 text-right">
                              {formatNumber(detalhe.alocacoes, 1)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(detalhe.orcamento.submetido)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(detalhe.valorFinanciado)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatPercentage(detalhe.margem)}
                            </td>
                            <td className="px-4 py-3 text-right">{formatCurrency(detalhe.vab)}</td>
                            <td className="px-4 py-3 text-right">
                              {formatNumber(detalhe.vabCustosPessoal)}
                            </td>
                          </tr>
                        ))}
                        {/* Totals Row (Uses overall financas data) */}
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-4 py-3">Total</td>
                          <td className="px-4 py-3 text-right">{formatNumber(totalEtis, 1)}</td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(financas.orcamentoSubmetido)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(financas.valorFinanciado)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatPercentage(financas.margem)}
                          </td>
                          <td className="px-4 py-3 text-right">{formatCurrency(financas.vab)}</td>
                          <td className="px-4 py-3 text-right">
                            {formatNumber(financas.vabCustosPessoal)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Cards (Uses overall financas data) */}
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-blue-50 p-4">
                      <h3 className="text-sm font-medium text-blue-800">Taxa de Financiamento</h3>
                      <p className="text-2xl font-semibold text-blue-900">
                        {formatPercentage(financas.taxaFinanciamento)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4">
                      <h3 className="text-sm font-medium text-blue-800">Valor ETI Médio</h3>
                      <p className="text-2xl font-semibold text-blue-900">
                        {formatCurrency(
                          totalEtis > 0 ? (financas.orcamentoSubmetido ?? 0) / totalEtis : 0
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4">
                      <h3 className="text-sm font-medium text-blue-800">Total ETIs Alocados</h3>
                      <p className="text-2xl font-semibold text-blue-900">
                        {formatNumber(totalEtis, 1)}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg bg-gray-50 p-8 text-center">
                  <p className="text-sm text-gray-500">
                    Sem dados anuais de orçamento submetido disponíveis.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Orçamento Real Tab (Unfiltered Data) === */}
        <TabsContent value="orcamento-real" className="space-y-6">
          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Orçamento Real por Ano</CardTitle>
              <p className="text-sm text-gray-500">
                Apresenta o orçamento real baseado em custos de recursos e materiais por ano.
              </p>
            </CardHeader>
            <CardContent>
              {/* Use unfiltered detalhesAnuais here */}
              {detalhesAnuais.length > 0 ? (
                <>
                  <div className="mb-6 h-80">
                    {/* Chart */}
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dadosGraficoReal} // Uses unfiltered chart data
                        margin={{ top: 10, right: 30, left: 30, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                          dataKey="ano"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                          tickFormatter={(value: number) => `${formatNumber(value / 1000, 0)}k €`}
                        />
                        <RechartsTooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label: string) => `Ano: ${label}`}
                        />
                        <Bar
                          dataKey="recursos"
                          name="Recursos Humanos"
                          stackId="a"
                          fill="#3B82F6"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="materiais"
                          name="Materiais"
                          stackId="a"
                          fill="#60A5FA"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                    {/* Table */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-2 text-left font-medium text-gray-500">Ano</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">
                            Recursos Humanos
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">
                            Materiais
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">
                            Custos Totais
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">
                            Overhead
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">Margem</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">VAB</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">
                            VAB/Custos
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Use unfiltered detalhesAnuais */}
                        {detalhesAnuais.map((detalhe: DetalheAnualMapped) => (
                          <tr
                            key={detalhe.ano}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 font-medium">{detalhe.ano}</td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(detalhe.orcamento.real.recursos)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(detalhe.orcamento.real.materiais)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(detalhe.orcamento.real.total)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(detalhe.overhead)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatPercentage(detalhe.margem)}
                            </td>
                            <td className="px-4 py-3 text-right">{formatCurrency(detalhe.vab)}</td>
                            <td className="px-4 py-3 text-right">
                              {formatNumber(detalhe.vabCustosPessoal)}
                            </td>
                          </tr>
                        ))}
                        {/* Totals Row (Uses overall financas data) */}
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-4 py-3">Total</td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(financas.custosReais.recursos)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(financas.custosReais.materiais)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(financas.custosReais.total)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(financas.overhead)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatPercentage(financas.margem)}
                          </td>
                          <td className="px-4 py-3 text-right">{formatCurrency(financas.vab)}</td>
                          <td className="px-4 py-3 text-right">
                            {formatNumber(financas.vabCustosPessoal)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Result Card (Overall) */}
                  <div className="mt-6">
                    <div
                      className={`rounded-lg p-4 ${(financas.resultado ?? 0) >= 0 ? "bg-green-50" : "bg-red-50"}`}
                    >
                      <h3
                        className={`text-sm font-medium ${(financas.resultado ?? 0) >= 0 ? "text-green-800" : "text-red-800"}`}
                      >
                        Resultado Financeiro (Total)
                      </h3>
                      <p
                        className={`text-2xl font-semibold ${(financas.resultado ?? 0) >= 0 ? "text-green-900" : "text-red-900"}`}
                      >
                        {formatCurrency(financas.resultado)}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Valor Financiado - Custos Reais + Overhead (Geral do Projeto)
                      </p>
                    </div>
                  </div>

                  {/* Summary Cards (Overall) */}
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-gray-100 p-4">
                      <h3 className="text-sm font-medium text-gray-700">
                        Custos Reais Totais (Geral)
                      </h3>
                      <p className="text-2xl font-semibold text-gray-900">
                        {formatCurrency(financas.custosReais.total)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-100 p-4">
                      <h3 className="text-sm font-medium text-gray-700">Overhead (Geral)</h3>
                      <p className="text-2xl font-semibold text-gray-900">
                        {formatCurrency(financas.overhead)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-100 p-4">
                      <h3 className="text-sm font-medium text-gray-700">
                        Progresso Custos (Geral)
                      </h3>
                      <p className="text-2xl font-semibold text-gray-900">
                        {formatPercentage(
                          (financas.custosReais.total ?? 0) > 0
                            ? Math.min(
                                ((financas.custosConcluidos?.total ?? 0) /
                                  (financas.custosReais.total ?? 1)) *
                                  100,
                                100
                              )
                            : 0,
                          0
                        )}
                      </p>
                      <div className="relative mt-2">
                        <Progress
                          value={
                            (financas.custosReais.total ?? 0) > 0
                              ? Math.min(
                                  ((financas.custosConcluidos?.total ?? 0) /
                                    (financas.custosReais.total ?? 1)) *
                                    100,
                                  100
                                )
                              : 0
                          }
                          className="h-2"
                        />
                        {/* Indicador do valor financiado na barra de progresso geral */}
                        {(financas.valorFinanciado ?? 0) > 0 &&
                          (financas.custosReais.total ?? 0) > 0 && (
                            <div
                              className="absolute top-0 h-3 w-0.5 bg-green-600"
                              style={{
                                left: `${Math.min(((financas.valorFinanciado ?? 0) / (financas.custosReais.total ?? 1)) * 100, 100)}%`,
                                transform: "translateX(-50%)",
                              }}
                            />
                          )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg bg-gray-50 p-8 text-center">
                  <p className="text-sm text-gray-500">
                    Sem dados anuais de orçamento real disponíveis.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Folga Tab === */}
        <TabsContent value="folga" className="space-y-6">
          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Folga Financeira</CardTitle>
              <p className="text-sm text-gray-500">
                Apresenta a folga financeira (diferença entre valor financiado e custos reais +
                overhead) por ano.
              </p>
            </CardHeader>
            <CardContent>
              {detalhesAnuais.length > 0 ? (
                <>
                  <div className="mb-6 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={detalhesAnuais.map((detalhe) => {
                          const primeiroAno =
                            Math.min(...detalhesAnuais.map((d) => d.ano)) === detalhe.ano;
                          return {
                            ano: detalhe.ano.toString(),
                            folga: primeiroAno
                              ? detalhe.orcamento.submetido - detalhe.orcamento.real.total
                              : detalhe.orcamento.submetido -
                                detalhe.orcamento.real.total +
                                detalhe.overhead,
                            orcamentoSubmetido: detalhe.orcamento.submetido,
                            custosReais: detalhe.orcamento.real.total,
                            overhead: detalhe.overhead,
                          };
                        })}
                        margin={{ top: 10, right: 30, left: 30, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                          dataKey="ano"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                          tickFormatter={(value: number) => `${formatNumber(value / 1000, 0)}k €`}
                        />
                        <RechartsTooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label: string) => `Ano: ${label}`}
                        />
                        <Bar dataKey="folga" name="Folga" fill="#22C55E" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-2 text-left font-medium text-gray-500">Ano</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">
                            Orçamento Submetido
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">
                            Custos Reais
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">
                            Overhead
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">Folga</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">
                            % do Orçamento
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalhesAnuais.map((detalhe: DetalheAnualMapped) => {
                          const primeiroAno =
                            Math.min(...detalhesAnuais.map((d) => d.ano)) === detalhe.ano;
                          const folga = primeiroAno
                            ? detalhe.orcamento.submetido - detalhe.orcamento.real.total
                            : detalhe.orcamento.submetido -
                              detalhe.orcamento.real.total +
                              detalhe.overhead;
                          const percentagemFolga = (folga / detalhe.orcamento.submetido) * 100;

                          return (
                            <tr
                              key={detalhe.ano}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="px-4 py-3 font-medium">{detalhe.ano}</td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(detalhe.orcamento.submetido)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(detalhe.orcamento.real.total)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(primeiroAno ? 0 : detalhe.overhead)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={folga >= 0 ? "text-green-600" : "text-red-600"}>
                                  {formatCurrency(folga)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={
                                    percentagemFolga >= 0 ? "text-green-600" : "text-red-600"
                                  }
                                >
                                  {formatPercentage(percentagemFolga)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {/* Totals Row */}
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-4 py-3">Total</td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(financas.orcamentoSubmetido)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(financas.custosReais.total)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(financas.overhead)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {(() => {
                              const primeiroAnoOverhead =
                                detalhesAnuais.find(
                                  (d) => d.ano === Math.min(...detalhesAnuais.map((d) => d.ano))
                                )?.overhead ?? 0;
                              const folgaTotal =
                                financas.orcamentoSubmetido -
                                financas.custosReais.total +
                                (financas.overhead - primeiroAnoOverhead);
                              return (
                                <span
                                  className={folgaTotal >= 0 ? "text-green-600" : "text-red-600"}
                                >
                                  {formatCurrency(folgaTotal)}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {(() => {
                              const primeiroAnoOverhead =
                                detalhesAnuais.find(
                                  (d) => d.ano === Math.min(...detalhesAnuais.map((d) => d.ano))
                                )?.overhead ?? 0;
                              const folgaTotal =
                                financas.orcamentoSubmetido -
                                financas.custosReais.total +
                                (financas.overhead - primeiroAnoOverhead);
                              const percentagemFolgaTotal =
                                (folgaTotal / financas.orcamentoSubmetido) * 100;
                              return (
                                <span
                                  className={
                                    percentagemFolgaTotal >= 0 ? "text-green-600" : "text-red-600"
                                  }
                                >
                                  {formatPercentage(percentagemFolgaTotal)}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Cards */}
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div
                      className={`rounded-lg p-4 ${(() => {
                        const primeiroAnoOverhead =
                          detalhesAnuais.find(
                            (d) => d.ano === Math.min(...detalhesAnuais.map((d) => d.ano))
                          )?.overhead ?? 0;
                        const folgaTotal =
                          financas.orcamentoSubmetido -
                          financas.custosReais.total +
                          (financas.overhead - primeiroAnoOverhead);
                        return folgaTotal >= 0 ? "bg-green-50" : "bg-red-50";
                      })()}`}
                    >
                      <h3 className="text-sm font-medium text-gray-700">Folga Total</h3>
                      <p
                        className={`text-2xl font-semibold ${(() => {
                          const primeiroAnoOverhead =
                            detalhesAnuais.find(
                              (d) => d.ano === Math.min(...detalhesAnuais.map((d) => d.ano))
                            )?.overhead ?? 0;
                          const folgaTotal =
                            financas.orcamentoSubmetido -
                            financas.custosReais.total +
                            (financas.overhead - primeiroAnoOverhead);
                          return folgaTotal >= 0 ? "text-green-900" : "text-red-900";
                        })()}`}
                      >
                        {(() => {
                          const primeiroAnoOverhead =
                            detalhesAnuais.find(
                              (d) => d.ano === Math.min(...detalhesAnuais.map((d) => d.ano))
                            )?.overhead ?? 0;
                          return formatCurrency(
                            financas.orcamentoSubmetido -
                              financas.custosReais.total +
                              (financas.overhead - primeiroAnoOverhead)
                          );
                        })()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4">
                      <h3 className="text-sm font-medium text-blue-800">Média Anual da Folga</h3>
                      <p className="text-2xl font-semibold text-blue-900">
                        {formatCurrency(
                          (detalhesAnuais as DetalheAnualMapped[]).reduce(
                            (acc: number, detalhe: DetalheAnualMapped) => {
                              const primeiroAno =
                                Math.min(...detalhesAnuais.map((d) => d.ano)) === detalhe.ano;
                              return (
                                acc +
                                (primeiroAno
                                  ? detalhe.orcamento.submetido - detalhe.orcamento.real.total
                                  : detalhe.orcamento.submetido -
                                    detalhe.orcamento.real.total +
                                    detalhe.overhead)
                              );
                            },
                            0
                          ) / detalhesAnuais.length
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-100 p-4">
                      <h3 className="text-sm font-medium text-gray-700">% Média da Folga</h3>
                      <p className="text-2xl font-semibold text-gray-900">
                        {formatPercentage(
                          (detalhesAnuais as DetalheAnualMapped[]).reduce(
                            (acc: number, detalhe: DetalheAnualMapped) => {
                              const primeiroAno =
                                Math.min(...detalhesAnuais.map((d) => d.ano)) === detalhe.ano;
                              const folga = primeiroAno
                                ? detalhe.orcamento.submetido - detalhe.orcamento.real.total
                                : detalhe.orcamento.submetido -
                                  detalhe.orcamento.real.total +
                                  detalhe.overhead;
                              return acc + (folga / detalhe.orcamento.submetido) * 100;
                            },
                            0
                          ) / detalhesAnuais.length
                        )}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg bg-gray-50 p-8 text-center">
                  <p className="text-sm text-gray-500">
                    Sem dados de folga financeira disponíveis.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProjetoFinancas;
