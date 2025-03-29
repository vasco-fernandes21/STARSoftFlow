"use client";

import { 
  Briefcase, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { NovoProjeto } from "@/components/projetos/NovoProjeto";
import { StatsGrid } from "@/components/common/StatsGrid";
import { DespesasRecursosPorMes } from "@/components/admin/DespesasRecursosPorMes";
import ProjetosDestaque from "@/app/dashboard/components/ProjetosDestaque";
import { ProximosEntregaveis } from "@/components/entregaveis/ProximosEntregaveis";
import type { StatItem } from "@/components/common/StatsGrid";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import type { RouterOutputs } from "@/trpc/react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type ProjetoWithProgress = RouterOutputs["projeto"]["findAll"]["items"][number];

export default function AdminDashboard() {
  const router = useRouter();
  // Pagination state for ProjetosDestaque
  const [projetoPage, setProjetoPage] = useState(0);
  const projsPerPage = 3;

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard
  } = api.dashboard.getDashboard.useQuery();

  // Fetch projects data using findAll
  const { 
    data: projetosData, 
    isLoading: isLoadingProjetos 
  } = api.projeto.findAll.useQuery({
    limit: 10, // Fetch more to enable pagination
    estado: "EM_DESENVOLVIMENTO"
  });

  // Fetch pending projects data
  const {
    data: projetosPendentesData,
    isLoading: isLoadingProjetosPendentes
  } = api.projeto.findAll.useQuery({
    estado: "APROVADO"
  });

  // Transform data to match Projeto interface
  
  const projetosDestaque = projetosData?.items.map((p: ProjetoWithProgress) => ({
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    inicio: p.inicio,
    fim: p.fim,
    estado: p.estado,
    progresso: p.progresso,
    progressoFinanceiro: p.progressoFinanceiro,
    orcamentoTotal: p.orcamento.total,
    orcamentoUtilizado: p.orcamento.utilizado,
    responsavel: p.responsavel
  }));

  // Calculate total pages for projects pagination
  const totalProjetosPages = projetosDestaque ? Math.ceil(projetosDestaque.length / projsPerPage) : 0;
  
  // Get current page projects
  const currentProjetos = projetosDestaque 
    ? projetosDestaque.slice(projetoPage * projsPerPage, (projetoPage + 1) * projsPerPage) 
    : [];

  // Navigation handlers
  const nextProjetoPage = () => {
    if (projetoPage < totalProjetosPages - 1) {
      setProjetoPage(prev => prev + 1);
    }
  };

  const prevProjetoPage = () => {
    if (projetoPage > 0) {
      setProjetoPage(prev => prev - 1);
    }
  };

  // Stats cards data
  const statsItems: StatItem[] = [
    {
      icon: Briefcase,
      label: "Projetos Ativos",
      value: (projetosData?.items.filter(p => p.estado === "EM_DESENVOLVIMENTO").length) ?? 0,
      iconClassName: "text-blue-600",
      iconContainerClassName: "bg-blue-50/80",
      badgeText: `${projetosPendentesData?.pagination.total ?? 0} aprovados`,
      badgeIcon: AlertCircle,
      badgeClassName: "text-blue-600 bg-blue-50/80 hover:bg-blue-100/80 border-blue-100",
    },
    {
      icon: AlertCircle,
      label: "Projetos Pendentes",
      value: projetosPendentesData?.pagination.total ?? 0,
      iconClassName: "text-amber-600",
      iconContainerClassName: "bg-amber-50/80",
      badgeText: `aguardando início`,
      badgeClassName: "text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 border-amber-100",
    },
    {
      icon: AlertTriangle,
      label: "Entregáveis em Alerta",
      value: dashboardData?.entregaveisProximos?.length ?? 0,
      iconClassName: "text-red-600",
      iconContainerClassName: "bg-red-50/80",
      badgeText: `${dashboardData?.entregaveisProximos?.filter(e => e.diasRestantes < 0).length ?? 0} atrasados`,
      badgeClassName: "text-red-600 bg-red-50/80 hover:bg-red-100/80 border-red-100"
    },
    {
      icon: TrendingUp,
      label: "Ocupação Média",
      value: dashboardData?.ocupacaoRecursos?.length 
        ? Math.round(dashboardData.ocupacaoRecursos.reduce((acc, curr) => acc + curr.ocupacaoMedia, 0) / dashboardData.ocupacaoRecursos.length) 
        : 0,
      iconClassName: "text-purple-600",
      iconContainerClassName: "bg-purple-50/80",
      suffix: "%",
      badgeText: "últimos 3 meses",
      badgeClassName: "text-purple-600 bg-purple-50/80 hover:bg-purple-100/80 border-purple-100",
    }
  ];

  // Loading skeleton component
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

  // Show loading skeleton if any data is loading
  if (isLoadingDashboard || isLoadingProjetos || isLoadingProjetosPendentes) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="h-full bg-bgApp p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        {/* Header com título e botões */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                  {/* Left Side - Projetos Destaque */}
                  <div className="flex-1 p-4 lg:border-r border-slate-100/50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-slate-700">Projetos em Destaque</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/projetos')}
                        className="text-xs font-normal hover:bg-slate-50 transition-colors h-7 px-2"
                      >
                        Ver todos
                      </Button>
                    </div>
                    <div className="h-[300px]">
                      <ProjetosDestaque 
                        projetos={projetosDestaque || []} 
                        isLoading={isLoadingProjetos}
                        title={false}
                      />
                    </div>
                  </div>

                  {/* Right Side - Entregáveis em Alerta */}
                  <div className="flex-1 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-slate-700">Próximos Entregáveis</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/entregaveis')}
                        className="text-xs font-normal hover:bg-slate-50 transition-colors h-7 px-2"
                      >
                        Ver todos
                      </Button>
                    </div>
                    <div className="space-y-3 mt-2">
                      <ProximosEntregaveis title={false} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Despesas */}
            <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
              <CardHeader className="border-b border-slate-100/50 px-6 py-4">
                <CardTitle className="font-medium text-slate-800">Despesas Mensais</CardTitle>
                <CardDescription className="text-slate-500">Acompanhamento de despesas da organização</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <DespesasRecursosPorMes title={false} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 