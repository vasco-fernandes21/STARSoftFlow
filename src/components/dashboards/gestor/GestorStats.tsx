"use client";

import { api } from "@/trpc/react";
import { Users, AlertCircle, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/common/StatCard";

export function GestorStats() {
  const { data: stats, isLoading } = api.gestor.getGestorStats.useQuery(undefined, {
    refetchOnWindowFocus: false
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        icon={Users}
        label="Ocupação Média"
        value={stats?.ocupacaoMediaEquipe ? Math.round(stats.ocupacaoMediaEquipe * 100) : 0}
        suffix="%"
        iconClassName="text-blue-500"
        iconContainerClassName="bg-blue-50"
        secondaryText={`Referente a ${stats?.mesReferencia}/${stats?.anoReferencia}`}
      />
      <StatCard
        icon={AlertCircle}
        label="Projetos em Atraso"
        value={stats?.projetosComEntregaveisAtrasados ?? 0}
        iconClassName="text-rose-500"
        iconContainerClassName="bg-rose-50"
        secondaryText="Com entregáveis atrasados"
      />
      <StatCard
        icon={Bell}
        label="Notificações"
        value={stats?.notificacoesNaoLidas ?? 0}
        iconClassName="text-amber-500"
        iconContainerClassName="bg-amber-50"
        secondaryText="Não lidas"
      />
    </div>
  );
} 