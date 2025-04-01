"use client";

import { useEffect, useMemo } from "react";
import { Calendar, Clock, AlertTriangle, Briefcase, TrendingUp, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NovoProjeto } from "@/components/projetos/NovoProjeto";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, isBefore, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import { usePermissions } from "@/hooks/usePermissions";
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
import type { AtividadeRecente } from "@/server/api/routers/dashboard";

// Importação dinâmica para evitar problemas de circular dependency
const AdminDashboard = dynamic(() => import("@/components/admin/Dashboard"), {
  loading: () => (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <Skeleton className="h-full w-full" />
    </div>
  ),
  ssr: false,
});

export default function Page() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isAdmin } = usePermissions();

  // Redirecionar para a página de login se não houver sessão
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/(auth)/login");
    }
  }, [status, router]);

  // Obter dados do dashboard do utilizador (apenas para utilizadores não-admin)
  const { data: dashboardData, isLoading: isLoadingDashboard } =
    api.dashboard.getDashboard.useQuery(undefined, {
      enabled: !isAdmin && !!session,
    });

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

  // Se estiver a carregar a sessão, mostrar skeleton
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
        <LoadingSkeleton />
      </div>
    );
  }

  // Se não houver sessão, mostrar uma mensagem de boas-vindas
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
        <div className="max-w-8xl mx-auto py-20 text-center">
          <h1 className="text-3xl font-extrabold">Bem-vindo ao Sistema de Gestão de Projetos</h1>
          <p className="mt-4">Por favor, faça login para aceder ao seu painel de controlo.</p>
        </div>
      </div>
    );
  }

  // Se o utilizador for admin, renderizar a dashboard de administração
  if (isAdmin) {
    return <AdminDashboard />;
  }

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
    atividadesRecentes.map((atividade: AtividadeRecente) => (
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
              Olá, {session?.user?.name?.split(" ")[0]}
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
                          onClick={() => router.push("/tarefas")}
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
                        ) : (
                          <>
                            {dashboardData?.tarefasPendentes ? (
                              <>
                                {/* Aqui iriam as tarefas próximas - dados de exemplo */}
                                <div className="flex items-start gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                                    <Circle className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">
                                      Atualizar documentação técnica
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Projeto: INOVC+ • 2 dias restantes
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                                    <Circle className="h-5 w-5 text-amber-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">
                                      Enviar relatório de progresso
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Projeto: DreamFAB • Hoje
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                                    <Circle className="h-5 w-5 text-emerald-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">
                                      Preparar apresentação final
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Projeto: IAMFat • 5 dias restantes
                                    </p>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <p className="py-2 text-center text-sm text-slate-500">
                                Não há tarefas pendentes.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Próximos Entregáveis */}
                    <div className="flex-1 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-slate-700">Próximos Entregáveis</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push("/entregaveis")}
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
                        ) : (
                          <>
                            {dashboardData?.entregaveisProximos &&
                            dashboardData.entregaveisProximos.length > 0 ? (
                              <>
                                {dashboardData.entregaveisProximos.slice(0, 3).map((entregavel) => {
                                  const isPastDue = entregavel.data
                                    ? isBefore(new Date(entregavel.data), new Date())
                                    : false;
                                  const isCloseToDeadline = entregavel.data
                                    ? isBefore(new Date(entregavel.data), addDays(new Date(), 3))
                                    : false;
                                  const diasRestantes = entregavel.data
                                    ? differenceInDays(new Date(entregavel.data), new Date())
                                    : null;

                                  return (
                                    <div key={entregavel.id} className="flex items-start gap-3">
                                      <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                          isPastDue
                                            ? "bg-red-100"
                                            : isCloseToDeadline
                                              ? "bg-amber-100"
                                              : "bg-emerald-100"
                                        }`}
                                      >
                                        <Circle
                                          className={`h-5 w-5 ${
                                            isPastDue
                                              ? "text-red-600"
                                              : isCloseToDeadline
                                                ? "text-amber-600"
                                                : "text-emerald-600"
                                          }`}
                                        />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-slate-800">
                                          {entregavel.nome}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          Projeto:{" "}
                                          {entregavel.tarefa?.workpackage?.projeto?.nome || "N/A"} •
                                          {isPastDue
                                            ? " Atrasado"
                                            : diasRestantes === 0
                                              ? " Hoje"
                                              : ` ${diasRestantes} dias`}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </>
                            ) : (
                              <p className="py-2 text-center text-sm text-slate-500">
                                Não há entregáveis próximos.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico de Ocupação */}
              <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
                <CardHeader className="border-b border-slate-100/50 px-6 py-4">
                  <CardTitle className="font-medium text-slate-800">Ocupação Mensal</CardTitle>
                  <CardDescription className="text-slate-500">
                    Percentual de ocupação ao longo do ano
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={ocupacaoAnual}
                        margin={{
                          top: 10,
                          right: 30,
                          left: 20,
                          bottom: 10,
                        }}
                      >
                        <defs>
                          <linearGradient id="colorOcupacao" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="mes"
                          tick={{ fill: "#64748b", fontSize: 12 }}
                          axisLine={{ stroke: "#e2e8f0", strokeWidth: 1 }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#64748b", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "none",
                            borderRadius: "8px",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                          }}
                          formatter={(value) => [`${value}%`, "Ocupação"]}
                          labelStyle={{ color: "#1e293b", fontWeight: 500 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="ocupacao"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorOcupacao)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Atividades Recentes */}
              <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
                <CardHeader className="border-b border-slate-100/50 px-6 py-4">
                  <CardTitle className="font-medium text-slate-800">Atividades Recentes</CardTitle>
                  <CardDescription className="text-slate-500">
                    Últimas ações na plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-4">{atividadesContent}</CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
