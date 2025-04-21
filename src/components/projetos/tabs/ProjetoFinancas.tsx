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
import { OverviewTab } from "./projeto-financas/OverviewTab";
import { OrcamentoSubmetidoTab } from "./projeto-financas/OrcamentoSubmetidoTab";
import { OrcamentoRealTab } from "./projeto-financas/OrcamentoRealTab";
import { FolgaTab } from "./projeto-financas/FolgaTab";
import type { ProjetoEstado } from "@prisma/client";

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

export interface DetalheAnualMapped {
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
  estado: ProjetoEstado;
  orcamentoSubmetidoTipo: 'DB_PENDENTE' | 'ETI_SNAPSHOT' | 'DETALHADO_SNAPSHOT' | 'INVALIDO';
  orcamentoSubmetidoDetalhes: {
    recursos: number;
    materiais: number;
    overhead: number;
    overheadPercent: number;
  } | null;
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

export type FinancasComDetalhes = FinancasBase & {
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
    "custosReais" in data &&
    "detalhesAnuais" in data &&
    Array.isArray((data as any).detalhesAnuais) &&
    "anos" in data &&
    Array.isArray((data as any).anos) &&
    data.meta?.tipo === "projeto_individual"
  );
}

// Tipos para o Badge de Status
type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

interface OrcamentoStatus {
  label: string;
  variant: BadgeVariant;
}

// Interface for the data displayed in the Overview StatCards
export interface DisplayData {
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

// --- End Formatting Functions ---

// --- UI Components ---

// --- End UI Components ---

export function ProjetoFinancas({ projetoId }: ProjetoFinancasProps) {
  const [selectedYear, setSelectedYear] = useState<string>("todos");
  const [selectedWorkpackageId, setSelectedWorkpackageId] = useState<string | undefined>("todos"); // Estado para WP

  const {
    data: financas,
    isLoading: isLoadingFinancas,
    error: errorFinancas,
  } = api.financas.getTotaisFinanceiros.useQuery({
    projetoId,
    incluirDetalhesPorAno: true,
  });

  // Nova query para comparação de gastos
  const {
    data: comparacaoGastos,
    isLoading: isLoadingComparacao,
    error: errorComparacao,
  } = api.financas.getComparacaoGastos.useQuery({
    projetoId,
  }, {
    // Re-fetch quando selectedWorkpackageId muda
    enabled: !!projetoId, // Só executa se projetoId estiver definido
  });

  // Extrair lista de workpackages para o seletor
  const workpackagesList = comparacaoGastos?.workpackages ?? [];

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

  // --- Loading and Error States --- Combinar loading/error
  const isLoading = isLoadingFinancas || isLoadingComparacao;
  const error = errorFinancas || errorComparacao;

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
          {errorFinancas && <p className="text-sm text-red-600">Erro Finanças: {errorFinancas.message}</p>}
          {errorComparacao && <p className="text-sm text-red-600">Erro Comparação: {errorComparacao.message}</p>}
        </div>
      </div>
    );
  }

  // --- Data Validation and Processing ---
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
        <TabsContent value="overview">
          <OverviewTab
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            anosDisponiveis={anosDisponiveis}
            displayData={displayData}
            progressoOrcamento={progressoOrcamento}
            posicaoValorFinanciado={posicaoValorFinanciado}
            baseOrcamento={baseOrcamento}
            selectedWorkpackageId={selectedWorkpackageId}
            setSelectedWorkpackageId={setSelectedWorkpackageId}
            workpackagesList={workpackagesList}
            comparacaoGastos={comparacaoGastos}
            isLoadingComparacao={isLoadingComparacao}
            errorComparacao={errorComparacao}
          />
        </TabsContent>

        {/* === Orçamento Submetido Tab (Unfiltered Data) === */}
        <TabsContent value="orcamento-submetido">
           <OrcamentoSubmetidoTab
             financas={financas}
             detalhesAnuais={detalhesAnuais}
             totalEtis={totalEtis}
             dadosGraficoSubmissao={dadosGraficoSubmissao}
           />
        </TabsContent>

        {/* === Orçamento Real Tab (Unfiltered Data) === */}
        <TabsContent value="orcamento-real">
          <OrcamentoRealTab
            financas={financas}
            detalhesAnuais={detalhesAnuais}
            dadosGraficoReal={dadosGraficoReal}
          />
        </TabsContent>

        {/* === Folga Tab === */}
        <TabsContent value="folga">
           <FolgaTab
             financas={financas}
             detalhesAnuais={detalhesAnuais}
           />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProjetoFinancas;