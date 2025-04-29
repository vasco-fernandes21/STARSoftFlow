"use client";

import { useMemo } from "react";
import { Calendar, Clock, AlertTriangle, Briefcase, TrendingUp, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NovoProjeto } from "@/components/projetos/NovoProjeto";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { StatsGrid } from "@/components/common/StatsGrid";
import type { StatItem } from "@/components/common/StatsGrid";
import type { EntregavelAlerta } from "@/server/api/routers/dashboard";
import { Package } from "lucide-react";

// Local type for tarefasProximas if not present in backend
type TarefaProxima = {
  id: string;
  nome: string;
  data: string | Date | null;
  estado: boolean;
  descricao?: string | null;
};

export default function UserDashboard() {
  // Obter dados do dashboard do utilizador
  const { data: dashboardData, isLoading: isLoadingDashboard } = api.dashboard.getDashboard.useQuery();

  // Valores padrão e fallbacks seguros para dados que podem não existir na API
  const tarefasPendentes = dashboardData?.tarefasPendentes || 5;
  const projetosNovosMes = 3;
  const projetosTotal = 15;
  const projetosAtivos = dashboardData?.projetosAtivos || 0;
  const ocupacaoAtual = dashboardData?.ocupacaoMensal || 0;
  const entregaveisSemana =
    dashboardData?.entregaveisProximos?.filter((e) => e.diasRestantes >= 0 && e.diasRestantes <= 7)
      .length || 0;
  const tarefasUrgentes =
    dashboardData?.entregaveisProximos?.filter((e) => e.diasRestantes < 0).length || 0;
  const atividadesRecentes = dashboardData?.atividadesRecentes || [];
  const isLoadingAtividades = isLoadingDashboard;

  // Define os dados estatísticos fora dos condicionais para evitar erros no Hook
  const statsItems = useMemo<StatItem[]>(
    () => [
      {
        icon: Briefcase,
        label: "Projetos Ativos",
        value: projetosAtivos,
        iconClassName: "text-blue-600",
        iconContainerClassName: "bg-blue-50/80",
        badgeText: `${projetosNovosMes} novos`,
        badgeIcon: TrendingUp,
        badgeClassName: "text-blue-600 bg-blue-50/80 hover:bg-blue-100/80 border-blue-100",
        secondaryText: `de ${projetosTotal}`,
      },
      {
        icon: Clock,
        label: "Ocupação Atual",
        value: ocupacaoAtual,
        iconClassName: "text-emerald-600",
        iconContainerClassName: "bg-emerald-50/80",
        badgeText: `${ocupacaoAtual}% média`,
        badgeClassName:
          "text-emerald-600 bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-100",
        suffix: "%",
      },
      {
        icon: Calendar,
        label: "Entregáveis Próximos",
        value: dashboardData?.entregaveisProximos?.length || 0,
        iconClassName: "text-amber-600",
        iconContainerClassName: "bg-amber-50/80",
        badgeText: `Esta semana: ${entregaveisSemana}`,
        badgeClassName: "text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 border-amber-100",
      },
      {
        icon: AlertTriangle,
        label: "Tarefas Pendentes",
        value: tarefasPendentes,
        iconClassName: "text-red-600",
        iconContainerClassName: "bg-red-50/80",
        badgeText: `Urgentes: ${tarefasUrgentes}`,
        badgeClassName: "text-red-600 bg-red-50/80 hover:bg-red-100/80 border-red-100",
      },
    ],
    [
      projetosAtivos,
      projetosTotal,
      projetosNovosMes,
      ocupacaoAtual,
      dashboardData?.entregaveisProximos?.length,
      entregaveisSemana,
      tarefasPendentes,
      tarefasUrgentes,
    ]
  );

  // Componente de skeleton para carregamento
  const LoadingSkeleton = () => (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden border-none bg-white shadow-sm">
            <CardContent className="p-0">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card className="overflow-hidden border-none bg-white shadow-sm">
            <CardContent className="p-0">
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="overflow-hidden border-none bg-white shadow-sm">
            <CardContent className="p-0">
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // Calculando dados para os gráficos
  const ocupacaoAnual = [
    { mes: "Jan", ocupacao: 65 },
    { mes: "Fev", ocupacao: 59 },
    { mes: "Mar", ocupacao: 80 },
    { mes: "Abr", ocupacao: 81 },
    { mes: "Mai", ocupacao: dashboardData?.ocupacaoMensal || 75 },
    { mes: "Jun", ocupacao: 0 },
    { mes: "Jul", ocupacao: 0 },
    { mes: "Ago", ocupacao: 0 },
    { mes: "Set", ocupacao: 0 },
    { mes: "Out", ocupacao: 0 },
    { mes: "Nov", ocupacao: 0 },
    { mes: "Dez", ocupacao: 0 },
  ];

  // Renderizar atividades recentes
  const atividadesContent = isLoadingAtividades ? (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  ) : !atividadesRecentes?.length ? (
    <div className="py-8 text-center">
      <p className="text-sm text-gray-500">Nenhuma atividade recente</p>
    </div>
  ) : (
    atividadesRecentes.map((atividade: any) => (
      <div
        key={atividade.id}
        className="flex items-start gap-4 rounded-lg p-4 transition-colors hover:bg-gray-50"
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={atividade.usuario.foto || undefined} />
          <AvatarFallback>{atividade.usuario.name?.[0] || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <p className="text-sm text-gray-800">{atividade.descricao}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {format(new Date(atividade.data), "dd 'de' MMMM 'às' HH:mm", {
                locale: ptBR,
              })}
            </span>
            <Circle className="h-1 w-1 fill-current text-gray-300" />
            <span className="text-xs text-gray-500">{atividade.projetoNome}</span>
          </div>
        </div>
      </div>
    ))
  );

  // Dashboard para utilizadores comuns
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        {/* Header com Boas-vindas e Botões de Ação */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">
              Olá, Utilizador
            </h1>
            <p className="text-sm text-slate-500">Bem-vindo ao seu painel de controlo.</p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <NovoProjeto />
          </div>
        </div>

        {isLoadingDashboard ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <StatsGrid stats={statsItems} />

            {/* Gráficos */}
            <div className="grid grid-cols-1 gap-6">
              {/* Card dividido: Próximas Tarefas e Entregáveis */}
              <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
                <CardContent className="p-0">
                  <div className="flex h-full flex-col lg:flex-row">
                    {/* Próximas Tarefas */}
                    <div className="flex-1 border-slate-100/50 p-4 lg:border-r">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-slate-700">Próximas Tarefas</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs font-normal transition-colors hover:bg-slate-50"
                        >
                          Ver todas
                        </Button>
                      </div>

                      <div className="mt-2 space-y-3">
                        {isLoadingDashboard ? (
                          <>
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="flex-1 space-y-1">
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                              </div>
                            ))}
                          </>
                        ) : Array.isArray((dashboardData as any)?.tarefasProximas) && (dashboardData as any).tarefasProximas.length ? (
                          (dashboardData as any).tarefasProximas.map((tarefa: TarefaProxima) => (
                            <div key={tarefa.id} className="flex items-center gap-3">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                <Calendar className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <p className="truncate text-sm font-normal text-slate-800">{tarefa.nome}</p>
                                <p className="text-xs text-slate-500">
                                  {tarefa.data ? (typeof tarefa.data === "string" ? tarefa.data : new Date(tarefa.data).toLocaleDateString()) : ""}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-sm text-slate-500">Nenhuma tarefa próxima.</p>
                        )}
                      </div>
                    </div>

                    {/* Entregáveis */}
                    <div className="flex-1 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-slate-700">Entregáveis</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs font-normal transition-colors hover:bg-slate-50"
                        >
                          Ver todos
                        </Button>
                      </div>
                      <div className="mt-2 space-y-3">
                        {isLoadingDashboard ? (
                          <>
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="flex-1 space-y-1">
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                              </div>
                            ))}
                          </>
                        ) : dashboardData?.entregaveisProximos && dashboardData.entregaveisProximos.length ? (
                          dashboardData.entregaveisProximos.map((entregavel: EntregavelAlerta) => {
                            // Fallback para projetoNome
                            const projetoNome = entregavel.tarefa?.workpackage?.projeto?.nome || "";
                            // Dias restantes e atraso
                            const diasRestantes = entregavel.diasRestantes;
                            const atrasado = diasRestantes < 0;
                            const prazoTexto = atrasado
                              ? `${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) !== 1 ? "s" : ""} atrasado`
                              : diasRestantes === 0
                              ? "Termina hoje"
                              : diasRestantes === 1
                              ? "Termina amanhã"
                              : `Faltam ${diasRestantes} dias`;
                            return (
                              <div key={entregavel.id} className="flex items-center gap-3">
                                <div
                                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${atrasado ? "bg-red-50 text-red-600" : diasRestantes <= 3 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}
                                >
                                  <Package className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <p className="truncate text-sm font-normal text-slate-800">{entregavel.nome}</p>
                                  <p
                                    className={`text-xs ${atrasado ? "text-red-600" : diasRestantes <= 3 ? "text-amber-600" : "text-slate-500"}`}
                                  >
                                    {projetoNome} | {prazoTexto}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-center text-sm text-slate-500">
                            Nenhum entregável próximo.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Ocupação e Atividade Recente */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Gráfico de Ocupação Anual */}
              <div className="md:col-span-2">
                <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-base font-medium text-slate-700">
                      Ocupação Anual (%)
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      A sua percentagem média de alocação mensal.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={ocupacaoAnual}>
                        <defs>
                          <linearGradient id="colorOcupacao" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}%`}
                          domain={[0, 110]}
                        />
                        <Tooltip formatter={(value: number) => [`${value}%`, "Ocupação"]} />
                        <Area
                          type="monotone"
                          dataKey="ocupacao"
                          stroke="#3b82f6"
                          fillOpacity={1}
                          fill="url(#colorOcupacao)"
                          strokeWidth={2}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Atividade Recente */}
              <div>
                <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-base font-medium text-slate-700">
                      Atividade Recente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[350px] overflow-y-auto">
                    {atividadesContent}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}