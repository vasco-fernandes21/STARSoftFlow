"use client";

import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DespesaMensal {
  mes: number;
  ano: number;
  valorRH: number;
  valorMateriais: number;
  valorTotal: number;
}

export function DespesasRecursosPorMes() {
  const { data: despesas, isLoading } = api.dashboard.getDespesasMensais.useQuery({
    ano: new Date().getFullYear(),
    limiteRegistos: 6 // últimos 6 meses fixos
  });

  if (isLoading) {
    return (
      <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
        <CardHeader className="border-b border-slate-100/50 px-6 py-4">
          <CardTitle className="font-medium text-slate-800">Despesas Mensais</CardTitle>
          <CardDescription className="text-slate-500">Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex h-60 items-center justify-center">
            <p className="text-slate-500">A carregar...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!despesas?.length) {
    return (
      <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
        <CardHeader className="border-b border-slate-100/50 px-6 py-4">
          <CardTitle className="font-medium text-slate-800">Despesas Mensais</CardTitle>
          <CardDescription className="text-slate-500">Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex h-60 items-center justify-center">
            <p className="text-slate-500">Sem dados para mostrar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // formatar dados para o gráfico
  const chartData = despesas.map((d: DespesaMensal) => ({
    name: `${d.mes}/${d.ano}`,
    rh: d.valorRH,
    materiais: d.valorMateriais,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
      <CardHeader className="border-b border-slate-100/50 px-6 py-4">
        <CardTitle className="font-medium text-slate-800">Despesas Mensais</CardTitle>
        <CardDescription className="text-slate-500">Últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
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
              <Bar 
                dataKey="rh" 
                name="Recursos Humanos" 
                fill="#4f46e5" 
                radius={[4, 4, 0, 0]} 
                stackId="stack"
              />
              <Bar 
                dataKey="materiais" 
                name="Materiais" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
                stackId="stack"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-xs text-slate-500 flex justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#4f46e5]"></div>
            <span>Recursos Humanos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#10b981]"></div>
            <span>Materiais</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 