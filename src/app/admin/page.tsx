"use client";

import { 
  Briefcase, 
  TrendingUp, 
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { NovoProjeto } from "@/components/projetos/NovoProjeto";
import { StatsGrid } from "@/components/common/StatsGrid";
import type { StatItem } from "@/components/common/StatsGrid";
import type { RouterOutputs } from "@/trpc/react";
import { ProjetosFinancasOverview } from "@/components/admin/ProjetosFinancasOverview";

type ProjetoWithProgress = RouterOutputs["projeto"]["findAll"]["items"][number] & {
  progresso?: number;
  progressoFinanceiro?: number;
  orcamento?: {
    total?: number;
    utilizado?: number;
  };
};

export default function AdminDashboard() {
  const router = useRouter();

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
    limit: 10,
    estado: "EM_DESENVOLVIMENTO"
  });

  // Fetch pending projects data
  const {
    data: projetosPendentesData,
    isLoading: isLoadingProjetosPendentes
  } = api.projeto.findAll.useQuery({
    estado: "APROVADO"
  });

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
            <Skeleton className="h-32 w-full" />
          </Card>
        ))}
      </div>
      <div>
        <Card className="overflow-hidden border-none shadow-sm bg-white">
          <Skeleton className="h-80 w-full" />
        </Card>
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

          {/* Financial Overview */}
          <ProjetosFinancasOverview />
        </div>
      </div>
    </div>
  );
} 