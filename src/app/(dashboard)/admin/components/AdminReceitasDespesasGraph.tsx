'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Euro } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';

type ReceitaDespesa = {
  mes: number;
  receitaTotal: number;
  despesaEstimada: number;
  despesaRealizada: number;
};

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Custom tooltip component for the chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="rounded-lg border border-slate-100 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
      <p className="mb-2 border-b border-slate-100 pb-1.5 text-sm font-semibold text-slate-800">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any, index: number) => {
          let color = "#64748b";
          let label = entry.name;
          
          // Map data keys to better labels and colors
          if (entry.dataKey === "receitaTotal") {
            color = "#3b82f6";
            label = "Receita Total";
          } else if (entry.dataKey === "despesaEstimada") {
            color = "#f59e0b";
            label = "Despesa Estimada";
          } else if (entry.dataKey === "despesaRealizada") {
            color = "#10b981";
            label = "Despesa Realizada";
          }
          
          return (
            <div key={`tooltip-item-${index}`} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs font-medium text-slate-600">{label}:</span>
              </div>
              <span className="text-xs font-semibold text-slate-800">
                {new Intl.NumberFormat('pt-PT', {
                  style: 'currency',
                  currency: 'EUR',
                  maximumFractionDigits: 0
                }).format(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Custom legend component
const CustomLegend = ({ payload }: any) => {
  if (!payload) return null;
  
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 px-4 pt-2 pb-4">
      {payload.map((entry: any, index: number) => {
        let color = entry.color;
        let label = "";
        
        // Map data keys to better labels
        if (entry.dataKey === "receitaTotal") {
          label = "Receita Total";
        } else if (entry.dataKey === "despesaEstimada") {
          label = "Despesa Estimada";
        } else if (entry.dataKey === "despesaRealizada") {
          label = "Despesa Realizada";
        }
        
        return (
          <div key={`legend-item-${index}`} className="flex items-center gap-2">
            <div 
              className={cn(
                "h-3 w-3 rounded-full",
                entry.dataKey === "despesaEstimada" ? "ring-2 ring-amber-200 ring-offset-1" : ""
              )}
              style={{ backgroundColor: color }} 
            />
            <span className="text-xs font-medium text-slate-700">{label}</span>
          </div>
        );
      })}
    </div>
  );
};

export function AdminReceitasDespesasGraph() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const utils = api.useUtils();

  // Prefetch data for current and next year
  useEffect(() => {
    void utils.admin.getReceitas.prefetch({ ano: currentYear });
    void utils.admin.getReceitas.prefetch({ ano: currentYear + 1 });
  }, [utils, currentYear]);

  // Prefetch data when year changes
  useEffect(() => {
    void utils.admin.getReceitas.prefetch({ ano: selectedYear });
  }, [utils, selectedYear]);

  // Fetch data from the API
  const { data, isLoading } = api.admin.getReceitas.useQuery(
    { ano: selectedYear },
    { refetchOnWindowFocus: false }
  );

  // Prepare chart data with month names
  const chartData = useMemo(() => {
    if (!data) return [];
    
    return data.map(item => ({
      ...item,
      name: MESES[item.mes - 1],
      // Calculate difference between revenue and expenses
      balanco: item.receitaTotal - item.despesaRealizada,
      // Calculate percentage of realized expenses vs estimated
      realizadoPercentage: item.despesaEstimada > 0 
        ? (item.despesaRealizada / item.despesaEstimada) * 100 
        : 0
    }));
  }, [data]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!chartData.length) return {
      totalReceita: 0,
      totalDespesaRealizada: 0,
      totalDespesaEstimada: 0,
      balanco: 0,
      percentualRealizado: 0
    };

    const totalReceita = chartData.reduce((sum, item) => sum + item.receitaTotal, 0);
    const totalDespesaRealizada = chartData.reduce((sum, item) => sum + item.despesaRealizada, 0);
    const totalDespesaEstimada = chartData.reduce((sum, item) => sum + item.despesaEstimada, 0);
    const balanco = totalReceita - totalDespesaRealizada;
    const percentualRealizado = totalDespesaEstimada > 0 
      ? (totalDespesaRealizada / totalDespesaEstimada) * 100 
      : 0;

    return {
      totalReceita,
      totalDespesaRealizada,
      totalDespesaEstimada,
      balanco,
      percentualRealizado
    };
  }, [chartData]);

  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Receitas vs Despesas</CardTitle>
          <CardDescription>A carregar dados financeiros...</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[400px] w-full animate-pulse bg-slate-100 rounded-lg"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-hidden border border-gray-100 bg-white shadow-md transition-all hover:shadow-lg">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Receitas vs Despesas
            </CardTitle>
            <CardDescription className="text-sm text-slate-500">
              Análise financeira por mês para o ano {selectedYear}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={chartType} onValueChange={(value) => setChartType(value as 'area' | 'bar')}>
              <SelectTrigger className="h-9 w-[130px] rounded-full">
                <SelectValue placeholder="Tipo de gráfico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">Área</SelectItem>
                <SelectItem value="bar">Barras</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
              <SelectTrigger className="h-9 w-[100px] rounded-full">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-0 border-b border-slate-100">
          <div className="p-4 border-r border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Receita Total</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalReceita)}</h3>
            </div>
          </div>
          
          <div className="p-4 border-r border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Despesa Realizada</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalDespesaRealizada)}</h3>
              <span className="text-xs text-slate-500">
                de {formatCurrency(summary.totalDespesaEstimada)}
              </span>
            </div>
          </div>
          
          <div className="p-4 border-r border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Balanço</p>
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "text-2xl font-bold",
                summary.balanco >= 0 ? "text-emerald-600" : "text-rose-600"
              )}>
                {formatCurrency(summary.balanco)}
              </h3>
              {summary.balanco >= 0 ? (
                <ArrowUpRight className="h-5 w-5 text-emerald-600" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-rose-600" />
              )}
            </div>
          </div>
          
          <div className="p-4">
            <p className="text-sm font-medium text-slate-500 mb-1">% Realizado</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold text-blue-600">
                {summary.percentualRealizado.toFixed(1)}%
              </h3>
              <Badge 
                className={cn(
                  "rounded-full",
                  summary.percentualRealizado > 90 ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" :
                  summary.percentualRealizado > 70 ? "bg-amber-100 text-amber-800 hover:bg-amber-200" :
                  "bg-rose-100 text-rose-800 hover:bg-rose-200"
                )}
              >
                {summary.percentualRealizado > 90 ? "Ótimo" : 
                 summary.percentualRealizado > 70 ? "Bom" : "Atenção"}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Chart */}
        <div className="p-6">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDespesaEstimada" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDespesaRealizada" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value/1000}k€`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />
                  <Area
                    type="monotone"
                    dataKey="receitaTotal"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorReceita)"
                    activeDot={{ r: 6, strokeWidth: 1, stroke: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="despesaEstimada"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="url(#colorDespesaEstimada)"
                    activeDot={{ r: 6, strokeWidth: 1, stroke: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="despesaRealizada"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorDespesaRealizada)"
                    activeDot={{ r: 6, strokeWidth: 1, stroke: '#fff' }}
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value/1000}k€`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend content={<CustomLegend />} />
                  <Bar 
                    dataKey="receitaTotal" 
                    name="Receita Total" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <Bar 
                    dataKey="despesaEstimada" 
                    name="Despesa Estimada" 
                    fill="#f59e0b" 
                    radius={[4, 4, 0, 0]} 
                    fillOpacity={0.7} 
                  />
                  <Bar 
                    dataKey="despesaRealizada" 
                    name="Despesa Realizada" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <ReferenceLine y={0} stroke="#cbd5e1" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 