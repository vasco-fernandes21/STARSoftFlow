"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import { 
  ResponsiveContainer, Tooltip, 
  XAxis, YAxis, CartesianGrid, BarChart, Bar
} from "recharts";
import { Wallet, DollarSign, TrendingUp, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { badgeVariants } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VariantProps } from "class-variance-authority";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ProjetoFinancasProps {
  projetoId: string;
}

// Formatação para exibição com localização PT
const formatNumber = (value: number, fractionDigits = 2) => {
  if (value === undefined || value === null) return "0";
  
  return value.toLocaleString("pt-PT", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
};

const formatCurrency = (value: number) => {
  if (value === undefined || value === null) return "0,00 €";
  
  return value.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatPercentage = (value: number) => {
  return value.toLocaleString("pt-PT", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
};

// Componente StatCard para exibir estatísticas
interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  colorClass?: string;
  subtitle?: string;
}

function StatCard({ title, value, icon, colorClass = "bg-blue-50", subtitle }: StatCardProps) {
  return (
    <Card className="overflow-hidden border-none shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          </div>
          <div className={`rounded-full p-3 ${colorClass}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Tipo para a variante do Badge baseado no componente real
type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

// Tipo para o status do orçamento
interface OrcamentoStatus {
  label: string;
  variant: BadgeVariant;
}

// Define the type for the annual details based on the API response
interface DetalheAnual {
  ano: number;
  orcamento: {
    submetido: number;
    real: {
      recursos: number;
      materiais: number;
      total: number;
    };
  };
  alocacoes: number;
  valorFinanciado: number;
  overhead: number;
  resultado: number;
}

export function ProjetoFinancas({ projetoId }: ProjetoFinancasProps) {
  const [anoSelecionado, setAnoSelecionado] = useState<number | undefined>(undefined);

  // Fetch all financial data with detailed annual breakdown
  const { data: financas, isLoading, error } = api.projeto.getTotaisFinanceiros.useQuery({
    projetoId,
    incluirDetalhesPorAno: true
  });

  // Helper for orçamento status
  const getOrcamentoStatus = (orcamentoTotal: number, custosReaisTotal: number): OrcamentoStatus => {
    const percentagemGasta = orcamentoTotal > 0 ? (custosReaisTotal / orcamentoTotal) * 100 : 0;

    if (percentagemGasta < 70) return { label: "Dentro do orçamento", variant: "default" };
    if (percentagemGasta < 90) return { label: "A aproximar-se do limite", variant: "warning" };
    if (percentagemGasta < 100) return { label: "Próximo do limite", variant: "orange" };
    return { label: "Acima do orçamento", variant: "red" };
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <Skeleton className="col-span-1 h-[400px] w-full rounded-xl lg:col-span-2" />
        <Skeleton className="col-span-1 h-[400px] w-full rounded-xl lg:col-span-2" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="rounded-lg bg-red-50 p-8 text-center shadow-sm">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-red-800">Erro ao carregar dados financeiros</h3>
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!financas) return null;
  
  // Get annual details safely
  const detalhesAnuais = financas.detalhesAnuais || [];
  const anos = financas.anos || [];
  
  // Calculate orçamento status
  const statusOrcamento = getOrcamentoStatus(financas.orcamentoSubmetido, financas.custosReais.total);

  // Preparar dados para gráficos de comparação anual
  const dadosGraficoComparacao = detalhesAnuais.map(detalhe => ({
    ano: detalhe.ano.toString(),
    submetido: detalhe.orcamento.submetido,
    real: detalhe.orcamento.real.total,
    resultado: detalhe.resultado
  }));

  // Preparar dados para gráfico de orçamento submetido
  const dadosGraficoSubmissao = detalhesAnuais.map(detalhe => ({
    ano: detalhe.ano.toString(),
    orcamento: detalhe.orcamento.submetido,
    alocacoes: detalhe.alocacoes,
    valorFinanciado: detalhe.valorFinanciado
  }));

  // Preparar dados para gráfico de orçamento real
  const dadosGraficoReal = detalhesAnuais.map(detalhe => ({
    ano: detalhe.ano.toString(),
    recursos: detalhe.orcamento.real.recursos,
    materiais: detalhe.orcamento.real.materiais,
    total: detalhe.orcamento.real.total,
    overhead: detalhe.overhead
  }));

  // Calculate progress percentage
  const progressoOrcamento = financas.orcamentoSubmetido > 0
    ? Math.min((financas.custosReais.total / financas.orcamentoSubmetido) * 100, 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Finanças</h1>
        <Badge variant={statusOrcamento.variant} className="px-3 py-1.5 text-sm font-medium">
          {statusOrcamento.label}
        </Badge>
      </div>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="orcamento-submetido">Orçamento Submetido</TabsTrigger>
          <TabsTrigger value="orcamento-real">Orçamento Real</TabsTrigger>
        </TabsList>
        
        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title="Orçamento Submetido" 
              value={formatCurrency(financas.orcamentoSubmetido)} 
              subtitle={`Taxa: ${formatNumber(financas.taxaFinanciamento)}%`}
              icon={<Wallet className="h-6 w-6 text-blue-600" />}
              colorClass="bg-blue-50"
            />
            <StatCard 
              title="Orçamento Real" 
              value={formatCurrency(financas.custosReais.total)} 
              subtitle={`Progresso: ${formatPercentage(progressoOrcamento/100)}`}
              icon={<DollarSign className="h-6 w-6 text-blue-500" />}
              colorClass="bg-blue-50"
            />
            <StatCard 
              title="Valor Financiado" 
              value={formatCurrency(financas.valorFinanciado)} 
              subtitle={`Overhead: ${formatCurrency(financas.overhead)}`}
              icon={<ArrowUpDown className="h-6 w-6 text-green-600" />}
              colorClass="bg-green-50"
            />
            <StatCard 
              title="Resultado Financeiro" 
              value={
                <span className={financas.resultado >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(financas.resultado)}
                </span>
              } 
              icon={<TrendingUp className={`h-6 w-6 ${financas.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`} />}
              colorClass={financas.resultado >= 0 ? 'bg-green-50' : 'bg-red-50'}
            />
          </div>
          
          {/* Progresso do Orçamento */}
          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Progresso Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Progresso</span>
                  <span>
                    {formatCurrency(financas.custosReais.total)}
                    {financas.orcamentoSubmetido > 0 && ` / ${formatCurrency(financas.orcamentoSubmetido)}`}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <Progress 
                    value={progressoOrcamento} 
                    className="h-3 w-full bg-gray-100" 
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-xs font-medium text-blue-800">Custos Recursos</p>
                    <p className="text-lg font-semibold text-blue-900">{formatCurrency(financas.custosReais.recursos)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-100 p-4">
                    <p className="text-xs font-medium text-gray-700">Custos Materiais</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(financas.custosReais.materiais)}</p>
                  </div>
                </div>
              </div>
              
              {/* Gráfico de Comparação Anual */}
              {detalhesAnuais.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Comparação de Orçamentos por Ano</h3>
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
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          tickFormatter={(value) => `${value / 1000}k €`}
                        />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value as number)}
                          labelFormatter={(label) => `Ano: ${label}`}
                        />
                        <Bar dataKey="submetido" name="Orçamento Submetido" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="real" name="Custos Reais" fill="#60A5FA" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Orçamento Submetido */}
        <TabsContent value="orcamento-submetido" className="space-y-6">
          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Orçamento Submetido por Ano</CardTitle>
              <p className="text-sm text-gray-500">Apresenta o orçamento submetido baseado em alocações de recursos por ano.</p>
            </CardHeader>
            <CardContent>
              {detalhesAnuais.length > 0 ? (
                <>
                  {/* Gráfico de Orçamento Submetido */}
                  <div className="h-80 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={dadosGraficoSubmissao}
                        margin={{ top: 10, right: 30, left: 30, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="ano" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          tickFormatter={(value) => `${value / 1000}k €`}
                        />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value as number)}
                          labelFormatter={(label) => `Ano: ${label}`}
                        />
                        <Bar dataKey="orcamento" name="Orçamento Submetido" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="valorFinanciado" name="Valor Financiado" fill="#60A5FA" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tabela de Detalhes Anuais */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-2 text-left font-medium text-gray-500">Ano</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">ETIs Alocados</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">Orçamento Submetido</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">Valor Financiado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalhesAnuais.map(detalhe => (
                          <tr key={detalhe.ano} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{detalhe.ano}</td>
                            <td className="px-4 py-3 text-right">{formatNumber(detalhe.alocacoes, 1)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(detalhe.orcamento.submetido)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(detalhe.valorFinanciado)}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-4 py-3">Total</td>
                          <td className="px-4 py-3 text-right">
                            {formatNumber(detalhesAnuais.reduce((acc, item) => acc + item.alocacoes, 0), 1)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(financas.orcamentoSubmetido)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(financas.valorFinanciado)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Resumo Financeiro */}
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-blue-50 p-4">
                      <h3 className="text-sm font-medium text-blue-800">Taxa de Financiamento</h3>
                      <p className="text-2xl font-semibold text-blue-900">{formatNumber(financas.taxaFinanciamento, 1)}%</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4">
                      <h3 className="text-sm font-medium text-blue-800">Valor ETI</h3>
                      <p className="text-2xl font-semibold text-blue-900">
                        {formatCurrency(financas.orcamentoSubmetido / detalhesAnuais.reduce((acc, item) => acc + item.alocacoes, 0))}
                      </p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4">
                      <h3 className="text-sm font-medium text-blue-800">Total ETIs Alocados</h3>
                      <p className="text-2xl font-semibold text-blue-900">
                        {formatNumber(detalhesAnuais.reduce((acc, item) => acc + item.alocacoes, 0), 1)}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg bg-gray-50 p-8 text-center">
                  <p className="text-sm text-gray-500">Sem dados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Orçamento Real */}
        <TabsContent value="orcamento-real" className="space-y-6">
          <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Orçamento Real por Ano</CardTitle>
              <p className="text-sm text-gray-500">Apresenta o orçamento real baseado em custos de recursos e materiais por ano.</p>
            </CardHeader>
            <CardContent>
              {detalhesAnuais.length > 0 ? (
                <>
                  {/* Gráfico de Orçamento Real */}
                  <div className="h-80 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={dadosGraficoReal}
                        margin={{ top: 10, right: 30, left: 30, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="ano" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          tickFormatter={(value) => `${value / 1000}k €`}
                        />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value as number)}
                          labelFormatter={(label) => `Ano: ${label}`}
                        />
                        <Bar dataKey="recursos" name="Recursos Humanos" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="materiais" name="Materiais" stackId="a" fill="#60A5FA" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tabela de Detalhes Anuais */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-2 text-left font-medium text-gray-500">Ano</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">Recursos Humanos</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">Materiais</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">Custos Totais</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">Overhead</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalhesAnuais.map(detalhe => (
                          <tr key={detalhe.ano} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{detalhe.ano}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(detalhe.orcamento.real.recursos)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(detalhe.orcamento.real.materiais)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(detalhe.orcamento.real.total)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(detalhe.overhead)}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-medium">
                          <td className="px-4 py-3">Total</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(financas.custosReais.recursos)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(financas.custosReais.materiais)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(financas.custosReais.total)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(financas.overhead)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Resultado Financeiro */}
                  <div className="mt-6">
                    <div className={`rounded-lg p-4 ${financas.resultado >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <h3 className={`text-sm font-medium ${financas.resultado >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                        Resultado Financeiro
                      </h3>
                      <p className={`text-2xl font-semibold ${financas.resultado >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                        {formatCurrency(financas.resultado)}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Valor Financiado - Custos Reais + Overhead
                      </p>
                    </div>
                  </div>

                  {/* Resumo Financeiro */}
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-gray-100 p-4">
                      <h3 className="text-sm font-medium text-gray-700">Custos Reais Totais</h3>
                      <p className="text-2xl font-semibold text-gray-900">{formatCurrency(financas.custosReais.total)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-100 p-4">
                      <h3 className="text-sm font-medium text-gray-700">Overhead</h3>
                      <p className="text-2xl font-semibold text-gray-900">{formatCurrency(financas.overhead)}</p>
                    </div>
                    <div className="rounded-lg bg-gray-100 p-4">
                      <h3 className="text-sm font-medium text-gray-700">Progresso Custos</h3>
                      <p className="text-2xl font-semibold text-gray-900">{formatPercentage(progressoOrcamento/100)}</p>
                      <div className="mt-2">
                        <Progress value={progressoOrcamento} className="h-2" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg bg-gray-50 p-8 text-center">
                  <p className="text-sm text-gray-500">Sem dados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Add default export to support lazy loading
export default ProjetoFinancas;