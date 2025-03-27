"use client";

import { useEffect, useState } from "react";
import { 
  Calendar, Clock, AlertTriangle, 
  Briefcase, ArrowUpRight, 
  TrendingUp, Circle, Layers
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NovoProjeto } from "@/components/projetos/NovoProjeto";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, isBefore, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import AdminDashboard from "./admin/page";
import { usePermissions } from "@/hooks/usePermissions";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function Page() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isAdmin } = usePermissions();
  
  // Redirecionar para a página de login se não houver sessão
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Obter dados do dashboard do utilizador (apenas para utilizadores não-admin)
  const { 
    data: dashboardData, 
    isLoading: isLoadingDashboard 
  } = api.dashboard.getUserDashboard.useQuery(undefined, {
    enabled: !isAdmin && !!session
  });
  
  // Obter atividades recentes (apenas para utilizadores não-admin)
  const { 
    data: atividadesRecentes, 
    isLoading: isLoadingAtividades 
  } = api.dashboard.getAtividadesRecentes.useQuery(undefined, {
    enabled: !isAdmin && !!session
  });

  // Valores padrão e fallbacks seguros para dados que podem não existir na API
  const tarefasCompletas = 12;
  const tarefasEmProgresso = 8;
  const tarefasPendentes = dashboardData?.tarefasPendentes || 5;
  const tarefasAtrasadas = 2;
  const projetosNovosMes = 3;
  const projetosTotal = 15;
  const projetosAtivos = dashboardData?.projetosAtivos || 0;
  const ocupacaoAtual = dashboardData?.ocupacaoMensal || 0;
  const entregaveisSemana = 2;
  const tarefasUrgentes = 1;

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
        <div className="max-w-8xl mx-auto text-center py-20">
          <h1 className="text-3xl font-bold">Bem-vindo ao Sistema de Gestão de Projetos</h1>
          <p className="mt-4">Por favor, faça login para acessar o seu painel de controlo.</p>
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

  // Dashboard para utilizadores comuns
  return (
    <div className="min-h-screen bg-[#F6F8FA] p-8">
      <div className="max-w-8xl mx-auto space-y-8">
        {/* Header com Boas-vindas e Botões de Ação */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-medium text-slate-800 tracking-tight">Olá, {session?.user?.name?.split(' ')[0]}</h1>
            <p className="text-slate-500 text-sm">Bem-vindo ao seu painel de controlo.</p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <NovoProjeto />
          </div>
        </div>

        {isLoadingDashboard ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg hover:translate-y-[-1px]">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center shadow-sm bg-blue-50/80">
                      <Briefcase className="h-4 w-4 text-blue-600" />
                    </div>
                    <Badge variant="outline" className="text-xs text-blue-600 bg-blue-50/80 hover:bg-blue-100/80 border-blue-100 font-normal py-0.5 px-2">
                      <TrendingUp className="h-2.5 w-2.5 mr-1" />
                      {projetosNovosMes} novos
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Projetos Ativos</p>
                    <div className="flex items-baseline gap-1">
                      <h2 className="text-3xl font-medium text-slate-800">{projetosAtivos}</h2>
                      <p className="text-xs text-slate-400">de {projetosTotal}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg hover:translate-y-[-1px]">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center shadow-sm bg-emerald-50/80">
                      <Clock className="h-4 w-4 text-emerald-600" />
                    </div>
                    <Badge variant="outline" className="text-xs text-emerald-600 bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-100 font-normal py-0.5 px-2">
                      {ocupacaoAtual}% média
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Ocupação Atual</p>
                    <div className="flex items-baseline gap-1">
                      <h2 className="text-3xl font-medium text-slate-800">{ocupacaoAtual}</h2>
                      <p className="text-3xl font-medium text-slate-800">%</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg hover:translate-y-[-1px]">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center shadow-sm bg-amber-50/80">
                      <Calendar className="h-4 w-4 text-amber-600" />
                    </div>
                    <Badge variant="outline" className="text-xs text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 border-amber-100 font-normal py-0.5 px-2">
                      Esta semana: {entregaveisSemana}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Entregáveis Próximos</p>
                    <div className="flex items-baseline gap-1">
                      <h2 className="text-3xl font-medium text-slate-800">{dashboardData?.entregaveisProximos?.length || 0}</h2>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg hover:translate-y-[-1px]">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center shadow-sm bg-red-50/80">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <Badge variant="outline" className="text-xs text-red-600 bg-red-50/80 hover:bg-red-100/80 border-red-100 font-normal py-0.5 px-2">
                      Urgentes: {tarefasUrgentes}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Tarefas Pendentes</p>
                    <div className="flex items-baseline gap-1">
                      <h2 className="text-3xl font-medium text-slate-800">{tarefasPendentes}</h2>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 gap-6">
              {/* Card dividido: Próximas Tarefas e Entregáveis */}
              <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row h-full">
                    {/* Próximas Tarefas */}
                    <div className="flex-1 p-4 lg:border-r border-slate-100/50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-700">Próximas Tarefas</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push('/tarefas')}
                          className="text-xs font-normal hover:bg-slate-50 transition-colors h-7 px-2"
                        >
                          Ver todas
                        </Button>
                      </div>
                      
                      <div className="space-y-3 mt-2">
                        {isLoadingDashboard ? (
                          <>
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="space-y-1 flex-1">
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
                                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Circle className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">Atualizar documentação técnica</p>
                                    <p className="text-xs text-slate-500">Projeto: INOVC+ • 2 dias restantes</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                                    <Circle className="h-5 w-5 text-amber-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">Enviar relatório de progresso</p>
                                    <p className="text-xs text-slate-500">Projeto: DreamFAB • Hoje</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Circle className="h-5 w-5 text-emerald-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">Preparar apresentação final</p>
                                    <p className="text-xs text-slate-500">Projeto: IAMFat • 5 dias restantes</p>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <p className="text-center py-2 text-slate-500 text-sm">Não há tarefas pendentes.</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Próximos Entregáveis */}
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
                        {isLoadingDashboard ? (
                          <>
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="space-y-1 flex-1">
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <>
                            {dashboardData?.entregaveisProximos && dashboardData.entregaveisProximos.length > 0 ? (
                              <>
                                {dashboardData.entregaveisProximos.slice(0, 3).map((entregavel) => {
                                  const isPastDue = entregavel.data ? isBefore(new Date(entregavel.data), new Date()) : false;
                                  const isCloseToDeadline = entregavel.data ? isBefore(
                                    new Date(entregavel.data),
                                    addDays(new Date(), 3)
                                  ) : false;
                                  const diasRestantes = entregavel.data 
                                    ? differenceInDays(new Date(entregavel.data), new Date()) 
                                    : null;
                                  
                                  return (
                                    <div key={entregavel.id} className="flex items-start gap-3">
                                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                        isPastDue 
                                          ? "bg-red-100" 
                                          : isCloseToDeadline 
                                            ? "bg-amber-100" 
                                            : "bg-emerald-100"
                                      }`}>
                                        <Circle className={`h-5 w-5 ${
                                          isPastDue 
                                            ? "text-red-600" 
                                            : isCloseToDeadline 
                                              ? "text-amber-600" 
                                              : "text-emerald-600"
                                        }`} />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-slate-800">{entregavel.nome}</p>
                                        <p className="text-xs text-slate-500">
                                          Projeto: {entregavel.tarefa?.workpackage?.projeto?.nome || "N/A"} • 
                                          {isPastDue 
                                            ? " Atrasado" 
                                            : diasRestantes === 0 
                                              ? " Hoje" 
                                              : ` ${diasRestantes} dias`
                                          }
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </>
                            ) : (
                              <p className="text-center py-2 text-slate-500 text-sm">Não há entregáveis próximos.</p>
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
                  <CardDescription className="text-slate-500">Percentual de ocupação ao longo do ano</CardDescription>
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
            </div>

            {/* Projetos em Destaque e Atividades Recentes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Projetos em Destaque */}
              <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
                <CardHeader className="border-b border-slate-100/50 px-6 py-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="font-medium text-slate-800">Projetos em Destaque</CardTitle>
                    <CardDescription className="text-slate-500">Seus projetos ativos e seu progresso</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/projetos')}
                    className="text-xs font-normal hover:bg-slate-50 transition-colors"
                  >
                    Ver todos
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {dashboardData?.projetos && dashboardData.projetos.length > 0 ? (
                    <div className="divide-y divide-slate-100/50">
                      {dashboardData.projetos.slice(0, 4).map((projeto) => (
                        <div key={projeto.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full backdrop-blur-sm flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-300 bg-blue-50/80">
                                <Layers className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-normal text-slate-800">{projeto.nome}</p>
                                <p className="text-xs text-slate-500">
                                  {projeto.workpackages} workpackages • {projeto.totalTarefas} tarefas
                                </p>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="gap-1 h-8 font-normal hover:bg-slate-50"
                              onClick={() => router.push(`/projetos/${projeto.id}`)}
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              Ver
                            </Button>
                          </div>
                          
                          <div className="space-y-1 mt-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Progresso</span>
                              <span className="font-normal text-slate-700">{projeto.percentualConcluido}%</span>
                            </div>
                            <Progress 
                              value={projeto.percentualConcluido} 
                              className="h-1.5" 
                              indicatorClassName={cn(
                                projeto.percentualConcluido < 30 ? "bg-red-500" :
                                projeto.percentualConcluido < 70 ? "bg-amber-500" :
                                "bg-emerald-500"
                              )}
                            />
                          </div>
                          
                          <div className="flex gap-2 mt-3">
                            <Badge variant="outline" className="text-xs text-slate-600 font-normal">
                              Início: {projeto.inicio ? format(new Date(projeto.inicio), "dd MMM yyyy", { locale: ptBR }) : "Indefinido"}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-slate-600 font-normal">
                              Fim: {projeto.fim ? format(new Date(projeto.fim), "dd MMM yyyy", { locale: ptBR }) : "Indefinido"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-slate-500">Não há projetos em desenvolvimento.</p>
                  )}
                </CardContent>
              </Card>

              {/* Atividades Recentes */}
              <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg">
                <CardHeader className="border-b border-slate-100/50 px-6 py-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="font-medium text-slate-800">Atividades Recentes</CardTitle>
                    <CardDescription className="text-slate-500">Últimas atualizações nos seus projetos</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/atividades')}
                    className="text-xs font-normal hover:bg-slate-50 transition-colors"
                  >
                    Ver todas
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingAtividades ? (
                    <div className="space-y-4 p-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : atividadesRecentes && atividadesRecentes.length > 0 ? (
                    <div className="divide-y divide-slate-100/50">
                      {atividadesRecentes.slice(0, 4).map((atividade) => (
                        <div key={atividade.id} className="flex items-start p-4 hover:bg-slate-50/50 transition-colors">
                          <Avatar className="h-10 w-10 mr-3 ring-2 ring-white shadow-sm">
                            <AvatarImage src={atividade.usuario.foto || undefined} alt={atividade.usuario.name || ""} />
                            <AvatarFallback>{atividade.usuario.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-normal text-slate-800">{atividade.usuario.name}</span>
                              {" "}
                              <span className="text-slate-600">{atividade.descricao}</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {format(new Date(atividade.data), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-slate-500">Não há atividades recentes.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
