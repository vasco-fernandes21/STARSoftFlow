"use client";

import { useState } from "react";
import { 
  Calendar, Clock, AlertTriangle, 
  Briefcase, ArrowUpRight, 
  TrendingUp, DollarSign, 
  AlertCircle, PieChart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { NovoProjeto } from "@/components/projetos/NovoProjeto";
import { StatsGrid } from "@/components/common/StatsGrid";
import { DespesasRecursosPorMes } from "@/components/admin/DespesasRecursosPorMes";
import ProjetosDestaque from "@/app/dashboard/components/ProjetosDestaque";
import type { StatItem } from "@/components/common/StatsGrid";
import type { EntregavelAlerta } from "@/server/api/routers/dashboard";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

export default function AdminDashboard() {
  const router = useRouter();
  
  // Fetch admin dashboard data
  const { 
    data: adminData, 
    isLoading: isLoadingAdminData
  } = api.dashboard.getAdminOverview.useQuery();
  
  // Fetch financial progress data
  const {
    data: projetosFinanceiros,
    isLoading: isLoadingProjetosFinanceiros
  } = api.dashboard.getProjetosProgresso.useQuery();

  // Fetch alerts data
  const {
    data: alertasEntregaveis,
    isLoading: isLoadingAlertas
  } = api.dashboard.getAlertasEntregaveis.useQuery();

  // Fetch resource occupation data
  const {
    data: ocupacaoRecursos,
    isLoading: isLoadingOcupacao
  } = api.dashboard.getOcupacaoRecursos.useQuery();

  // Fetch projects data for ProjetosDestaque
  const { 
    data: projetosEmDestaque, 
    isLoading: isLoadingProjetos 
  } = api.dashboard.getProjetosProgresso.useQuery({
    limiteRegistos: 3
  });

  // Transform data to match Projeto interface
  const projetosDestaque = projetosEmDestaque?.map(p => ({
    id: p.id,
    nome: p.nome,
    descricao: null,
    inicio: null,
    fim: null,
    estado: "EM_DESENVOLVIMENTO" as const,
    progressoFisico: p.percentualConcluido,
    progressoFinanceiro: p.percentualGasto,
    orcamentoTotal: p.orcamento,
    orcamentoUtilizado: p.orcamentoGasto,
    responsavel: {
      id: 'system',
      name: p.responsavel,
      email: null
    }
  }));

  // Componente de skeleton para carregamento
  const LoadingSkeleton = () => (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden border-none shadow-sm bg-white">
            <CardContent className="p-0">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card className="overflow-hidden border-none shadow-sm bg-white">
            <CardContent className="p-0">
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="overflow-hidden border-none shadow-sm bg-white">
            <CardContent className="p-0">
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // Se está a carregar dados, mostrar skeleton
  if (isLoadingAdminData || isLoadingProjetosFinanceiros || isLoadingAlertas || isLoadingOcupacao || isLoadingProjetos) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
        <LoadingSkeleton />
      </div>
    );
  }

  // Stats cards data
  const statsItems: StatItem[] = [
    {
      icon: Briefcase,
      label: "Projetos Ativos",
      value: projetosFinanceiros?.length ?? 0,
      iconClassName: "text-blue-600",
      iconContainerClassName: "bg-blue-50/80",
      badgeText: `${(projetosFinanceiros ?? []).filter(p => p.percentualGasto > 100).length} excedidos`,
      badgeIcon: AlertCircle,
      badgeClassName: "text-blue-600 bg-blue-50/80 hover:bg-blue-100/80 border-blue-100",
    },
    {
      icon: DollarSign,
      label: "Orçamento Total",
      value: Math.round((projetosFinanceiros?.reduce((acc, curr) => acc + curr.orcamento, 0) ?? 0) / 1000),
      iconClassName: "text-emerald-600",
      iconContainerClassName: "bg-emerald-50/80",
      badgeText: `${Math.round((projetosFinanceiros?.reduce((acc, curr) => acc + curr.orcamentoGasto, 0) ?? 0) / 1000)}K gastos`,
      badgeClassName: "text-emerald-600 bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-100",
      suffix: "K €"
    },
    {
      icon: Calendar,
      label: "Entregáveis em Alerta",
      value: alertasEntregaveis?.length ?? 0,
      iconClassName: "text-amber-600",
      iconContainerClassName: "bg-amber-50/80",
      badgeText: `${alertasEntregaveis?.filter(e => e.diasRestantes < 0).length ?? 0} atrasados`,
      badgeClassName: "text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 border-amber-100"
    },
    {
      icon: TrendingUp,
      label: "Ocupação Média",
      value: ocupacaoRecursos?.length ? Math.round(ocupacaoRecursos.reduce((acc, curr) => acc + curr.ocupacaoMedia, 0) / ocupacaoRecursos.length) : 0,
      iconClassName: "text-purple-600",
      iconContainerClassName: "bg-purple-50/80",
      suffix: "%",
      badgeText: "últimos 3 meses",
      badgeClassName: "text-purple-600 bg-purple-50/80 hover:bg-purple-100/80 border-purple-100",
    }
  ];

  // Formatar dados para gráficos
  const ocupacaoMensalData = adminData?.ocupacaoMensal || [];

  return (
    <div className="min-h-screen bg-[#F6F8FA] p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        {/* Header com título e botões */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Painel de Controlo</h1>
            <p className="text-slate-500 text-sm">Visão geral de todos os projetos e recursos da organização</p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <NovoProjeto />
          </div>
        </div>

        <div className="space-y-6">
          {/* KPI Cards */}
          <StatsGrid stats={statsItems} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-6">
            {/* Top Row - Combined Card */}
            <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row h-full">
                  {/* Left Side - Ocupação Chart */}
                  <div className="flex-1 p-6 lg:border-r border-slate-100/50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-medium text-slate-700">Ocupação Mensal</h3>
                        <p className="text-xs text-slate-500">Percentual médio de ocupação dos recursos</p>
                      </div>
                    </div>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={ocupacaoMensalData}
                          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                        >
                          <defs>
                            <linearGradient id="colorOcupacao" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis 
                            dataKey="mes" 
                            tick={{ fill: '#64748b', fontSize: 12 }} 
                            axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fill: '#64748b', fontSize: 12 }} 
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <Tooltip
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: 'none',
                              borderRadius: '8px',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
                            }}
                            formatter={(value) => [`${value}%`, 'Ocupação']}
                            labelStyle={{ color: '#1e293b', fontWeight: 500 }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="ocupacao" 
                            stroke="#4f46e5" 
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorOcupacao)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Right Side - Entregáveis em Alerta */}
                  <div className="flex-1 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-medium text-slate-700">Entregáveis em Alerta</h3>
                        <p className="text-xs text-slate-500">Entregáveis próximos ou atrasados</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {(alertasEntregaveis && alertasEntregaveis.length > 0) ? (
                        <>
                          {alertasEntregaveis.slice(0, 4).map((alerta) => (
                            <div key={alerta.id} className="p-3 hover:bg-slate-50/50 transition-colors rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center",
                                    alerta.diasRestantes < 0 ? "bg-red-100" :
                                    alerta.diasRestantes < 3 ? "bg-amber-100" : "bg-emerald-100"
                                  )}>
                                    <AlertTriangle className={cn(
                                      "h-4 w-4",
                                      alerta.diasRestantes < 0 ? "text-red-600" :
                                      alerta.diasRestantes < 3 ? "text-amber-600" : "text-emerald-600"
                                    )} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">{alerta.nome}</p>
                                    <p className="text-xs text-slate-500">
                                      {alerta.tarefa?.workpackage?.projeto?.nome || "Projeto não definido"}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant={alerta.diasRestantes < 0 ? "destructive" : "outline"} className="text-xs">
                                  {alerta.diasRestantes < 0 
                                    ? `${Math.abs(alerta.diasRestantes)} dias atrasado` 
                                    : `${alerta.diasRestantes} dias restantes`}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-60">
                          <p className="text-slate-500 text-sm">Não existem entregáveis em alerta</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Middle Row - Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Projetos em Destaque */}
              <ProjetosDestaque 
                projetos={projetosDestaque}
                isLoading={isLoadingProjetos}
              />

              {/* Recursos Ocupação */}
              <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
                <CardHeader className="border-b border-slate-100/50 px-6 py-4">
                  <CardTitle className="font-medium text-slate-800">Ocupação de Recursos</CardTitle>
                  <CardDescription className="text-slate-500">Percentual de ocupação por recurso</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={ocupacaoRecursos || []}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis 
                          dataKey="recurso" 
                          tick={{ fill: '#64748b', fontSize: 12 }} 
                          axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fill: '#64748b', fontSize: 12 }} 
                          axisLine={false}
                          tickLine={false}
                          domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: 'none',
                            borderRadius: '8px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
                          }}
                          formatter={(value) => [`${value}%`, 'Ocupação']}
                        />
                        <Bar 
                          dataKey="ocupacaoMedia" 
                          fill="#4f46e5" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Row - Full Width */}
            <DespesasRecursosPorMes />
          </div>
        </div>
      </div>
    </div>
  );
} 