"use client";

import { useEffect } from "react";
import { 
  Calendar, Clock, AlertTriangle, Search, 
  Briefcase, ArrowUpRight, 
  TrendingUp, Circle, Layers
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

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

  const distribuicaoTarefas = [
    { nome: "Completas", valor: tarefasCompletas, cor: "#10b981" },
    { nome: "Em Progresso", valor: tarefasEmProgresso, cor: "#3b82f6" },
    { nome: "Pendentes", valor: tarefasPendentes, cor: "#f59e0b" },
    { nome: "Atrasadas", valor: tarefasAtrasadas, cor: "#ef4444" },
  ];

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
    <div className="min-h-screen bg-[#F6F8FA] p-6">
      <div className="max-w-8xl mx-auto space-y-8">
        {/* Header com Boas-vindas e Botões de Ação */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-medium text-slate-800 tracking-tight">Olá, {session.user?.name?.split(' ')[0]}</h1>
            <p className="text-slate-500 text-sm">Bem-vindo ao seu painel de controlo. {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Pesquisar..."
                className="w-64 pl-10 pr-4 py-2 rounded-full border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              />
            </div>
            <NovoProjeto />
          </div>
        </div>

        {isLoadingDashboard ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="overflow-hidden border-none shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-blue-50/80 backdrop-blur-sm">
                      <Briefcase className="h-5 w-5 text-blue-600" />
                    </div>
                    <Badge variant="outline" className="text-blue-600 bg-blue-50/80 hover:bg-blue-100/80 border-blue-100 font-normal">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {projetosNovosMes} novos
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">Projetos Ativos</p>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-3xl font-normal text-slate-800">{projetosAtivos}</h2>
                      <p className="text-sm text-slate-400">de {projetosTotal}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-none shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-emerald-50/80 backdrop-blur-sm">
                      <Clock className="h-5 w-5 text-emerald-600" />
                    </div>
                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-100 font-normal">
                      {ocupacaoAtual}% média
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">Ocupação Atual</p>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-3xl font-normal text-slate-800">{ocupacaoAtual}%</h2>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-none shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-amber-50/80 backdrop-blur-sm">
                      <Calendar className="h-5 w-5 text-amber-600" />
                    </div>
                    <Badge variant="outline" className="text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 border-amber-100 font-normal">
                      Esta semana: {entregaveisSemana}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">Entregáveis Próximos</p>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-3xl font-normal text-slate-800">{dashboardData?.entregaveisProximos?.length || 0}</h2>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-none shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-red-50/80 backdrop-blur-sm">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <Badge variant="outline" className="text-red-600 bg-red-50/80 hover:bg-red-100/80 border-red-100 font-normal">
                      Urgentes: {tarefasUrgentes}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">Tarefas Pendentes</p>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-3xl font-normal text-slate-800">{tarefasPendentes}</h2>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos e Tarefas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gráfico de Ocupação */}
              <Card className="lg:col-span-2 overflow-hidden border-none shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="border-b border-slate-100/50 px-6 py-4">
                  <CardTitle className="font-medium text-slate-800">Ocupação Mensal</CardTitle>
                  <CardDescription className="text-slate-500">Percentual de ocupação ao longo do ano</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={ocupacaoAnual}
                        margin={{
                          top: 10,
                          right: 10,
                          left: 0,
                          bottom: 10,
                        }}
                      >
                        <defs>
                          <linearGradient id="colorOcupacao" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="mes" tick={{ fill: '#64748b' }} />
                        <YAxis tick={{ fill: '#64748b' }} />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: 'none',
                            borderRadius: '8px',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                          }}
                          formatter={(value) => [`${value}%`, 'Ocupação']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="ocupacao" 
                          stroke="#3b82f6" 
                          fillOpacity={1}
                          fill="url(#colorOcupacao)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Distribuição de Tarefas */}
              <Card className="overflow-hidden border-none shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="border-b border-slate-100/50 px-6 py-4">
                  <CardTitle className="font-medium text-slate-800">Distribuição de Tarefas</CardTitle>
                  <CardDescription className="text-slate-500">Estado atual das suas tarefas</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-72 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distribuicaoTarefas}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          fill="#8884d8"
                          paddingAngle={2}
                          dataKey="valor"
                          labelLine={false}
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {distribuicaoTarefas.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.cor} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [value, name]}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {distribuicaoTarefas.map((item, index) => (
                      <div key={index} className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.cor }}></div>
                        <span className="text-sm text-slate-600">{item.nome}</span>
                        <span className="ml-auto text-sm font-normal text-slate-800">{item.valor}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Próximos Entregáveis e Atividades Recentes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Próximos Entregáveis */}
              <Card className="overflow-hidden border-none shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="border-b border-slate-100/50 px-6 py-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="font-medium text-slate-800">Próximos Entregáveis</CardTitle>
                    <CardDescription className="text-slate-500">Entregáveis com prazo mais próximo</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/entregaveis')}
                    className="text-xs font-normal hover:bg-slate-50 transition-colors"
                  >
                    Ver todos
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {dashboardData?.entregaveisProximos && dashboardData.entregaveisProximos.length > 0 ? (
                    <div className="divide-y divide-slate-100/50">
                      {dashboardData.entregaveisProximos.slice(0, 4).map((entregavel) => {
                        const isPastDue = entregavel.data ? isBefore(new Date(entregavel.data), new Date()) : false;
                        const isCloseToDeadline = entregavel.data ? isBefore(
                          new Date(entregavel.data),
                          addDays(new Date(), 3)
                        ) : false;
                        const diasRestantes = entregavel.data ? differenceInDays(new Date(entregavel.data), new Date()) : null;
                        
                        return (
                          <div 
                            key={entregavel.id} 
                            className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                                {isPastDue ? (
                                  <Circle className="h-8 w-8 text-red-500" />
                                ) : isCloseToDeadline ? (
                                  <Circle className="h-8 w-8 text-amber-500" />
                                ) : (
                                  <Circle className="h-8 w-8 text-emerald-500" />
                                )}
                              </div>
                              <div>
                                <p className="font-normal text-slate-800">{entregavel.nome}</p>
                                <p className="text-xs text-slate-500">
                                  Projeto: {entregavel.tarefa?.workpackage?.projeto?.nome}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center">
                                {isPastDue ? (
                                  <Badge variant="destructive" className="text-xs font-normal">Atrasado</Badge>
                                ) : isCloseToDeadline ? (
                                  <Badge className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-200 font-normal">Urgente</Badge>
                                ) : (
                                  <Badge className="text-xs bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-normal">
                                    {diasRestantes} dias
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                {entregavel.data ? 
                                  format(new Date(entregavel.data), "dd MMM yyyy", { locale: ptBR }) : 
                                  "Sem data definida"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-slate-500">Não há entregáveis próximos.</p>
                  )}
                </CardContent>
              </Card>

              {/* Atividades Recentes */}
              <Card className="overflow-hidden border-none shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200">
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
                          <Avatar className="h-10 w-10 mr-3 ring-2 ring-white">
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

            {/* Projetos em Destaque */}
            <Card className="overflow-hidden border-none shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200">
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
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50/80 text-blue-600">
                              <Layers className="h-5 w-5" />
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
          </>
        )}
      </div>
    </div>
  );
}
