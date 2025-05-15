'use client';

import { api } from "@/trpc/react";
import { StatsGrid } from "@/components/common/StatsGrid";
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileCheck 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";
import { AdminReceitasDespesasGraph } from "./components/AdminReceitasDespesasGraph";
import { AdminDespesas } from "./components/AdminDespesas";

export default function AdminDashboard() {
  const { data: session } = useSession();
  // Fetch admin stats
  const { data: adminStats, isLoading } = api.admin.getAdminStats.useQuery(undefined, {
    refetchOnWindowFocus: false
  });

  // Calculate total active projects (approved + in development)
  const projetosAtivos = (adminStats?.projetosAprovados ?? 0) + (adminStats?.projetosEmDesenvolvimento ?? 0);

  const stats = [
    {
      icon: CheckCircle2,
      label: "Projetos Ativos",
      value: projetosAtivos,
      iconClassName: "text-emerald-500",
      iconContainerClassName: "bg-emerald-50",
      secondaryText: "Aprovados e em desenvolvimento",
    },
    {
      icon: FileCheck,
      label: "Projetos Aprovados",
      value: adminStats?.projetosAprovados ?? 0,
      iconClassName: "text-blue-500",
      iconContainerClassName: "bg-blue-50",
      secondaryText: "Prontos para iniciar",
    },
    {
      icon: Clock,
      label: "Projetos Pendentes",
      value: adminStats?.projetosPendentes ?? 0,
      iconClassName: "text-amber-500",
      iconContainerClassName: "bg-amber-50",
      secondaryText: "A aguardar aprovação",
    },
    {
      icon: AlertCircle,
      label: "Projetos Atrasados",
      value: adminStats?.projetosComEntregaveisAtrasados ?? 0,
      iconClassName: "text-rose-500",
      iconContainerClassName: "bg-rose-50",
      secondaryText: "Com entregáveis em atraso",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] p-8">
        <div className="mx-auto max-w-8xl space-y-6">
          <div className="space-y-1">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] p-8">
      <div className="mx-auto max-w-8xl space-y-6">
        {/* Header com Boas-vindas */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">
              Painel de Controlo
            </h1>
            <p className="text-sm text-slate-500">
              Olá {session?.user?.name?.split(' ')[0]}, aqui está o resumo da sua plataforma.
            </p>
          </div>
        </div>

        {/* Cards de estatísticas */}
        <StatsGrid stats={stats} />
        
        {/* Gráfico de Receitas e Despesas */}
        <div className="mt-6">
          <AdminReceitasDespesasGraph />
        </div>

        {/* Componente de Despesas */}
        <div className="mt-6">
          <AdminDespesas />
        </div>
      </div>
    </div>
  );
}
