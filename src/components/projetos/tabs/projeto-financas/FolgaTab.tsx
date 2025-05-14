"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { api } from "@/trpc/react";
import { formatNumber, formatCurrency, formatPercentage } from "./utils";

interface FolgaTabProps {
  projetoId: string;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
}

export function FolgaTab({
  projetoId,
  selectedYear,
  setSelectedYear,
}: FolgaTabProps) {
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

  // Get available years
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

  // For demo purposes - generate mock data by years for the chart
  // In a real scenario, you would fetch this data from an API
  const chartData = useMemo(() => {
    // If we have real data, we can process it
    if (visaoProjeto) {
      // In a real scenario, you would have a different API call to get yearly data
      // Here we're just creating some mock data based on the available years
      return anosDisponiveis.map(year => {
        const folgaValue = year === new Date().getFullYear() 
          ? visaoProjeto.folga
          : visaoProjeto.folga * (Math.random() * 0.5 + 0.75); // Random variation for demo
        
        return {
          ano: year.toString(),
          folga: folgaValue,
          orcamentoSubmetido: visaoProjeto.orcamentoSubmetido * (Math.random() * 0.3 + 0.85),
          orcamentoReal: visaoProjeto.orcamentoReal * (Math.random() * 0.3 + 0.85),
        };
      });
    }
    
    return [];
  }, [visaoProjeto, anosDisponiveis]);

  if (isLoadingVisao) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <Skeleton className="h-[250px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Year Filter */}
      <div className="flex justify-end">
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

      {/* Folga Card */}
      <Card className="overflow-hidden border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Folga Financeira</CardTitle>
          <CardDescription>
            Apresenta a folga financeira (diferença entre orçamento submetido e custos reais + overhead)
            {selectedYear !== "todos" ? ` para ${selectedYear}` : " por ano"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <>
              {/* Chart Section */}
              <div className="mb-6 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
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
                    <Legend />
                    <Bar 
                      dataKey="folga" 
                      name="Folga" 
                      fill="#10B981" 
                      radius={[4, 4, 0, 0]} 
                    />
                    <Bar 
                      dataKey="orcamentoSubmetido" 
                      name="Orçamento Submetido" 
                      fill="#60A5FA" 
                      radius={[4, 4, 0, 0]} 
                    />
                    <Bar 
                      dataKey="orcamentoReal" 
                      name="Orçamento Real" 
                      fill="#FBBF24" 
                      radius={[4, 4, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Section */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className={`rounded-lg p-4 ${visaoProjeto?.folga && visaoProjeto.folga >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                  <h3 className="text-sm font-medium text-gray-700">Folga Total</h3>
                  <p className={`text-2xl font-semibold ${visaoProjeto?.folga && visaoProjeto.folga >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatCurrency(visaoProjeto?.folga ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Diferença entre orçamento submetido e custos reais + overhead
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50 p-4">
                  <h3 className="text-sm font-medium text-gray-700">Orçamento Submetido</h3>
                  <p className="text-2xl font-semibold text-blue-700">
                    {formatCurrency(visaoProjeto?.orcamentoSubmetido ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Orçamento inicial submetido para o projeto
                  </p>
                </div>

                <div className="rounded-lg bg-amber-50 p-4">
                  <h3 className="text-sm font-medium text-gray-700">Orçamento Real</h3>
                  <p className="text-2xl font-semibold text-amber-700">
                    {formatCurrency(visaoProjeto?.orcamentoReal ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Custos reais incorridos até o momento
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="text-gray-500">Sem dados de folga disponíveis</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Table - could be added in a more complete implementation */}
    </div>
  );
}

export default FolgaTab; 