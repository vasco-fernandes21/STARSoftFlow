"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { badgeVariants } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VariantProps } from "class-variance-authority";
import { OverviewTab } from "./projeto-financas/OverviewTab";
import { OrcamentoSubmetidoTab } from "./projeto-financas/OrcamentoSubmetidoTab";
import { OrcamentoRealTab } from "./projeto-financas/OrcamentoRealTab";
import { FolgaTab } from "./projeto-financas/FolgaTab";

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

interface ProjetoFinancasProps {
  projetoId: string;
}

export function ProjetoFinancas({ projetoId }: ProjetoFinancasProps) {
  const [selectedYear, setSelectedYear] = useState<string>("todos");
  const [selectedWorkpackageId, setSelectedWorkpackageId] = useState<string | undefined>("todos");
  
  // Usamos trpc.useUtils para acessar utilitários do TanStack Query
  const utils = api.useUtils();

  const {
    data: financas,
    isLoading: isLoadingFinancas,
    error: errorFinancas,
  } = api.financas.getTotaisFinanceiros.useQuery({
    projetoId,
    incluirDetalhesPorAno: true,
  });

  const {
    data: comparacaoGastos,
    isLoading: isLoadingComparacao,
    error: errorComparacao,
  } = api.financas.getComparacaoGastos.useQuery({
    projetoId,
  }, {
    enabled: !!projetoId,
  });

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

  // Verificar se temos os dados completos necessários
  if (!financas || !('detalhesAnuais' in financas) || !Array.isArray(financas.detalhesAnuais) || !('anos' in financas) || !Array.isArray(financas.anos)) {
    return (
      <div className="rounded-lg bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">
          Dados financeiros incompletos ou não disponíveis para análise detalhada.
        </p>
      </div>
    );
  }

  // Já sabemos que os dados estão corretos
  const detalhesAnuais = financas.detalhesAnuais;
  const anosDisponiveis = financas.anos.sort((a, b) => b - a);

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
    // Find data in the detalhesAnuais array
    const anoSelecionadoData = detalhesAnuais.find((d) => d.ano === yearNum);

    if (anoSelecionadoData) {
      // Use data for the selected year
      displayData = {
        orcamentoSubmetido: anoSelecionadoData.orcamento.submetido,
        taxaFinanciamento: financas.taxaFinanciamento, // Taxa is project-wide
        custosReais: {
          total: anoSelecionadoData.orcamento.real.recursos + anoSelecionadoData.orcamento.real.materiais,
          recursos: anoSelecionadoData.orcamento.real.recursos,
          materiais: anoSelecionadoData.orcamento.real.materiais,
        },
        custosConcluidos: {
          total: anoSelecionadoData.custosConcluidos?.total,
          recursos: anoSelecionadoData.custosConcluidos?.recursos,
          materiais: anoSelecionadoData.custosConcluidos?.materiais,
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

  // Status based on filtered data
  const statusOrcamento = getOrcamentoStatus(
    displayData.orcamentoSubmetido,
    displayData.custosConcluidos.total
  );

  // --- Chart Data Preparation (Unfiltered) ---
  const dadosGraficoSubmissao = detalhesAnuais.map((detalhe) => ({
    ano: detalhe.ano.toString(),
    orcamento: detalhe.orcamento.submetido,
    totalAlocacao: detalhe.totalAlocacao,
    valorFinanciado: detalhe.valorFinanciado,
  }));

  const dadosGraficoReal = detalhesAnuais.map((detalhe) => ({
    ano: detalhe.ano.toString(),
    recursos: detalhe.orcamento.real.recursos,
    materiais: detalhe.orcamento.real.materiais,
    total: detalhe.orcamento.real.recursos + detalhe.orcamento.real.materiais,
    overhead: detalhe.overhead,
  }));

  // Progress calculation based on filtered data - using custosConcluidos instead of custosReais
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
  const totalEtis = detalhesAnuais.reduce(
    (acc, item) => acc + (item.totalAlocacao ?? 0),
    0
  );

  // Função para atualizar os dados utilizando o TanStack Query invalidation
  const handleRefreshData = () => {
    utils.financas.getTotaisFinanceiros.invalidate({ projetoId });
    utils.financas.getComparacaoGastos.invalidate({ projetoId });
  };

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
            onRefreshData={handleRefreshData}
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