"use client";

import React, { useMemo } from 'react';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
  Users,
  Package,
  BriefcaseBusiness,
  TrendingDown,
  LifeBuoy,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatCurrency, formatPercentage } from "./utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// --- StatCard Component ---
interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  colorClass?: string;
  subtitle?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
}

function StatCard({
  title,
  value,
  icon,
  colorClass = "bg-blue-50",
  subtitle,
  trendDirection,
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="flex items-center">
            <p className="text-2xl font-semibold">{value}</p>
            {trendDirection && (
              <div className="ml-2 rounded-md px-1.5 py-0.5" style={{ 
                backgroundColor: trendDirection === 'up' ? 'rgba(34, 197, 94, 0.1)' : 
                  trendDirection === 'down' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)' 
              }}>
                {trendDirection === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : trendDirection === 'down' ? (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                ) : null}
              </div>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className={`rounded-full p-3 ${colorClass}`}>{icon}</div>
      </div>
    </div>
  );
}

// --- OverviewTab Component ---
interface OverviewTabProps {
  projetoId: string;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
}

export function OverviewTab({
  projetoId,
  selectedYear,
  setSelectedYear,
}: OverviewTabProps) {
  // Fetch project details to determine available years
  const { data: projetoDetails } = api.projeto.findById.useQuery(
    projetoId,
    { enabled: !!projetoId }
  );

  // Fetch financial vision data
  const { data: visaoProjeto, isLoading: isLoadingVisao } = api.financas.getVisaoProjeto.useQuery({
    projetoId,
    ano: selectedYear !== "todos" ? parseInt(selectedYear) : undefined,
  });

  // Fetch financial panel data
  const { data: painelFinanceiro, isLoading: isLoadingPainel } = api.financas.getPainelFinanceiroProjeto.useQuery(
    { projetoId },
    { enabled: !!projetoId }
  );

  // Determine available years from project start and end dates
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<number>();
    const currentYear = new Date().getFullYear();
    
    // Add current year and previous year as defaults
    anos.add(currentYear);
    anos.add(currentYear - 1);
    
    // Add years from project duration if available
    if (projetoDetails?.inicio || projetoDetails?.fim) {
      const startYear = projetoDetails.inicio 
        ? new Date(projetoDetails.inicio).getFullYear() 
        : currentYear - 1;
      
      const endYear = projetoDetails.fim 
        ? new Date(projetoDetails.fim).getFullYear() 
        : currentYear + 1;
      
      for (let year = startYear; year <= endYear; year++) {
        anos.add(year);
      }
    }
    
    return Array.from(anos).sort((a, b) => b - a); // Sort descending
  }, [projetoDetails]);

  if (isLoadingVisao || isLoadingPainel) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[120px] w-full" />
        </div>
        <Skeleton className="h-[140px] w-full" />
        <Skeleton className="h-[180px] w-full" />
      </div>
    );
  }

  if (!visaoProjeto || !painelFinanceiro) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8">
        <div className="text-center">
          <p className="text-sm text-gray-500">Não foi possível carregar os dados financeiros</p>
          <p className="mt-2 text-xs text-gray-400">Verifique a conexão ou tente novamente mais tarde</p>
        </div>
      </div>
    );
  }

  const valorFinanciadoSubmetido = visaoProjeto.orcamentoSubmetido * visaoProjeto.taxa_financiamento;
  const valorFinanciadoReal = visaoProjeto.orcamentoReal * visaoProjeto.taxa_financiamento;

  const isETIBased = painelFinanceiro.tipoCalculoPrevisto === 'ETI_DB';
  const totalOrcamento = isETIBased 
    ? painelFinanceiro.orcamentoPrevistoGlobalComETI ?? 0
    : (painelFinanceiro.previstoRecursosSnapshot ?? 0) + (painelFinanceiro.previstoMateriaisSnapshot ?? 0);
  
  const totalGasto = (painelFinanceiro.realizadoRecursos ?? 0) + (painelFinanceiro.realizadoMateriais ?? 0);
  const totalPercent = totalOrcamento > 0 ? Math.min((totalGasto / totalOrcamento) * 100, 100) : 0;

  // For non-ETI based, calculate separate percentages for resources and materials
  const rhOrcamento = painelFinanceiro.previstoRecursosSnapshot ?? 0;
  const rhGasto = painelFinanceiro.realizadoRecursos ?? 0;
  const rhPercent = rhOrcamento > 0 ? Math.min((rhGasto / rhOrcamento) * 100, 100) : 0;

  const matOrcamento = painelFinanceiro.previstoMateriaisSnapshot ?? 0;
  const matGasto = painelFinanceiro.realizadoMateriais ?? 0;
  const matPercent = matOrcamento > 0 ? Math.min((matGasto / matOrcamento) * 100, 100) : 0;

  return (
    <div className="space-y-8">
      {/* Year Filter */}
      <div className="flex justify-end">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[180px] border-none bg-gray-50 shadow-sm">
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4 text-gray-400" />
              <SelectValue placeholder="Filtrar por ano..." />
            </div>
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

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Orçamento Submetido"
          value={formatCurrency(visaoProjeto.orcamentoSubmetido)}
          subtitle={`Financiado: ${formatCurrency(valorFinanciadoSubmetido)}`}
          icon={<Wallet className="h-5 w-5 text-blue-600" />}
          colorClass="bg-blue-50"
        />

        <StatCard
          title="Orçamento Real"
          value={formatCurrency(visaoProjeto.orcamentoReal)}
          subtitle={`Financiado: ${formatCurrency(valorFinanciadoReal)}`}
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          colorClass="bg-green-50"
        />

        <StatCard
          title="Resultado Financeiro"
          value={formatCurrency(visaoProjeto.resultadoFinanceiro)}
          trendDirection={visaoProjeto.resultadoFinanceiro >= 0 ? 'up' : 'down'}
          icon={<TrendingUp className={`h-5 w-5 ${visaoProjeto.resultadoFinanceiro >= 0 ? "text-green-600" : "text-red-600"}`} />}
          colorClass={visaoProjeto.resultadoFinanceiro >= 0 ? "bg-green-50" : "bg-red-50"}
        />

        <StatCard
          title="Margem"
          value={formatPercentage(visaoProjeto.margem)}
          trendDirection={visaoProjeto.margem >= 0 ? 'up' : 'down'}
          icon={<Percent className={`h-5 w-5 ${visaoProjeto.margem >= 0 ? "text-green-600" : "text-red-600"}`} />}
          colorClass={visaoProjeto.margem >= 0 ? "bg-green-50" : "bg-red-50"}
        />
      </div>

      {/* Progress Section */}
      <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">
              Progresso Financeiro {selectedYear !== "todos" ? `(${selectedYear})` : ""}
            </h2>
            <p className="text-xs text-gray-500">
              Monitorização dos gastos em comparação com o orçamento
            </p>
          </div>
          <Badge variant={totalPercent < 50 ? "outline" : totalPercent < 80 ? "secondary" : "default"} className="px-2 py-1">
            {totalPercent.toFixed(0)}% Utilizado
          </Badge>
        </div>
        
        <div className="mt-6">
          {isETIBased ? (
            // ETI Based View
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span className="font-medium">Progresso Total (ETI)</span>
                <span>
                  {formatCurrency(totalGasto)} <span className="text-gray-400">de</span> {formatCurrency(totalOrcamento)}
                </span>
              </div>
              <div className="space-y-2">
                <Progress 
                  value={totalPercent} 
                  className="h-3 w-full bg-gray-100" 
                  indicatorClassName={totalPercent < 50 ? "bg-blue-500" : totalPercent < 80 ? "bg-yellow-500" : "bg-green-500"}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          ) : (
            // Detailed View (Resources and Materials)
            <div className="space-y-6">
              {/* Resources Progress */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-blue-50 p-1.5">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-700">Recursos Humanos</span>
                  </div>
                  <span className="text-gray-600">
                    {formatCurrency(rhGasto)} <span className="text-gray-400">de</span> {formatCurrency(rhOrcamento)}
                  </span>
                </div>
                <div className="space-y-1">
                  <Progress 
                    value={rhPercent} 
                    className="h-2.5 w-full bg-gray-100" 
                    indicatorClassName="bg-blue-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{rhPercent.toFixed(0)}% Utilizado</span>
                    <span>Restante: {formatCurrency(rhOrcamento - rhGasto)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Materials Progress */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-green-50 p-1.5">
                      <Package className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="font-medium text-gray-700">Materiais</span>
                  </div>
                  <span className="text-gray-600">
                    {formatCurrency(matGasto)} <span className="text-gray-400">de</span> {formatCurrency(matOrcamento)}
                  </span>
                </div>
                <div className="space-y-1">
                  <Progress 
                    value={matPercent} 
                    className="h-2.5 w-full bg-gray-100" 
                    indicatorClassName="bg-green-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{matPercent.toFixed(0)}% Utilizado</span>
                    <span>Restante: {formatCurrency(matOrcamento - matGasto)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Metrics Section */}
      <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-medium">
            Métricas Adicionais
          </h2>
          <p className="text-xs text-gray-500">
            Indicadores financeiros complementares para avaliação do projeto
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 p-5">
            <div className="mb-3 flex items-center">
              <div className="mr-3 rounded-full bg-indigo-50 p-2">
                <BriefcaseBusiness className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-700">VAB / Custos Pessoal</h3>
            </div>
            <p className="text-2xl font-semibold text-slate-800">
              {formatNumber(visaoProjeto.vabCustosPessoal, 2)}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Valor acrescentado bruto por custos com pessoal
            </p>
          </div>
          
          <div className="rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 p-5">
            <div className="mb-3 flex items-center">
              <div className="mr-3 rounded-full bg-blue-50 p-2">
                <LifeBuoy className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-700">Folga</h3>
            </div>
            <p className={`text-2xl font-semibold ${visaoProjeto.folga >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(visaoProjeto.folga)}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Diferença entre orçamento e custos reais
            </p>
          </div>
          
          <div className="rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 p-5">
            <div className="mb-3 flex items-center">
              <div className="mr-3 rounded-full bg-green-50 p-2">
                <Percent className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-700">Taxa de Financiamento</h3>
            </div>
            <p className="text-2xl font-semibold text-slate-800">
              {formatPercentage(visaoProjeto.taxa_financiamento)}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Percentagem de financiamento do projeto
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewTab; 