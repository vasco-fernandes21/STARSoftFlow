"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DespesaMensal {
  mes: number;
  ano: number;
  valorRH: number;
}

interface TotaisDespesas {
  valorTotalMateriais: number;
  valorTotalRH: number;
  valorTotal: number;
}

interface DadosDespesas {
  despesasMensais: DespesaMensal[];
  totais: TotaisDespesas;
}

interface OpcoesFiltroAno {
  anos: number[];
  anoAtual: number;
}

interface ChartDataPoint {
  name: string;
  recursos: number;
}

interface DespesasRecursosPorMesProps {
  title?: boolean;
}

const MESES: readonly string[] = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
] as const;

export function DespesasRecursosPorMes({ title = true }: DespesasRecursosPorMesProps) {
  // Estado para o ano selecionado
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [visualizationType, setVisualizationType] = useState<"bars" | "stacked">("bars");
  
  // Buscar anos disponíveis diretamente da API
  const { data: opcoesAno, isLoading: isLoadingAnos } = api.dashboard.getOpcoesFiltroAno.useQuery({
    incluiVazios: true
  }, {
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Buscar dados específicos do ano selecionado
  const { data: despesasData, isLoading } = api.dashboard.getDespesasMensais.useQuery({
    ano: selectedYear,
    limiteRegistos: 12 // Buscar todos os meses do ano
  }, {
    enabled: !!selectedYear
  });
  
  // Atualizar o ano selecionado se necessário
  useEffect(() => {
    if (opcoesAno?.anos && opcoesAno.anos.length > 0 && !opcoesAno.anos.includes(selectedYear)) {
      setSelectedYear(opcoesAno.anoAtual);
    }
  }, [opcoesAno, selectedYear]);

  // Formatação de moeda
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Preparar dados para o gráfico
  const prepareChartData = (): ChartDataPoint[] => {
    if (!despesasData?.despesasMensais || despesasData.despesasMensais.length === 0) {
      return MESES.map((mes) => ({
        name: mes,
        recursos: 0
      }));
    }

    return despesasData.despesasMensais
      .sort((a, b) => a.mes - b.mes)
      .map((d) => ({
        name: MESES[(d.mes - 1) % 12] || "Desconhecido", // Garantir valor padrão caso o índice seja inválido
        recursos: d.valorRH
      }));
  };
  
  const chartData = prepareChartData();

  // Componente de loading
  if (isLoading || isLoadingAnos) {
    return (
      <div className="h-72 flex items-center justify-center">
        <p className="text-slate-500">A carregar...</p>
      </div>
    );
  }

  // Lista de anos disponíveis para seleção
  const availableYears = opcoesAno?.anos || [new Date().getFullYear()];
  
  // Obter valores dos totais
  const valorTotalRH = despesasData?.totais.valorTotalRH || 0;
  const valorTotalMateriais = despesasData?.totais.valorTotalMateriais || 0;
  const valorTotal = despesasData?.totais.valorTotal || 0;

  // Componente com dados vazios
  if (!despesasData?.despesasMensais || despesasData.despesasMensais.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center">
        <p className="text-slate-500">Sem dados para mostrar em {selectedYear}</p>
      </div>
    );
  }

  // Componente completo com dados
  const ChartContent = () => (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {title && (
          <div>
            <CardTitle className="font-medium text-slate-800">Despesas Mensais</CardTitle>
            <CardDescription className="text-slate-500">
              Total: {formatCurrency(valorTotal)} • RH: {formatCurrency(valorTotalRH)} • Materiais: {formatCurrency(valorTotalMateriais)}
            </CardDescription>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Tabs
            defaultValue="bars"
            value={visualizationType}
            onValueChange={(value) => setVisualizationType(value as "bars" | "stacked")}
            className="w-[180px]"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bars">Barras</TabsTrigger>
              <TabsTrigger value="stacked">Linhas</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Selecionar ano" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="h-72 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          {visualizationType === "bars" ? (
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
                }}
                formatter={(value) => [formatCurrency(value as number), '']}
                labelStyle={{ color: '#1e293b', fontWeight: 500 }}
              />
              <Legend 
                iconType="circle" 
                verticalAlign="top" 
                height={36}
              />
              <Bar 
                dataKey="recursos" 
                name="Recursos Humanos" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          ) : (
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
                }}
                formatter={(value) => [formatCurrency(value as number), '']}
                labelStyle={{ color: '#1e293b', fontWeight: 500 }}
              />
              <Legend 
                iconType="circle" 
                verticalAlign="top" 
                height={36}
              />
              <Bar 
                dataKey="recursos" 
                name="Recursos Humanos" 
                fill="#4f46e5" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </>
  );

  if (!title) {
    return <ChartContent />;
  }

  return (
    <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
      <CardHeader className="border-b border-slate-100/50 px-6 py-4">
        <ChartContent />
      </CardHeader>
    </Card>
  );
} 