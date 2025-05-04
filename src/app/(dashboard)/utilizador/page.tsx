"use client";

import { useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Briefcase, 
  TrendingUp, 
  Package, 
  Bell,
  FileEdit,
  XCircle,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NovoProjeto } from "@/components/projetos/NovoProjeto";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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

// Local type for tarefasProximas if not present in backend
type TarefaProxima = {
  id: string;
  nome: string;
  data: string | Date | null;
  estado: boolean;
  descricao?: string | null;
};

// Local type for próximos eventos
type ProximoEvento = {
  id: string;
  tipo: "tarefa" | "entregavel";
  nome: string;
  descricao?: string | null;
  dataLimite?: Date | string | null;
  diasRestantes?: number | null;
  workpackage: {
    id: string;
    nome: string;
  };
  projeto: {
    id: string;
    nome: string;
  };
};

// Função auxiliar para obter o ícone da notificação baseado na entidade
function getNotificationIcon(entidade: string) {
  switch (entidade) {
    case "PROJETO":
      return Briefcase;
    case "WORKPACKAGE":
      return FileEdit;
    case "ENTREGAVEL":
      return Package;
    case "TAREFA":
      return CheckCircle2;
    case "ALOCACAO":
      return Calendar;
    case "SISTEMA":
    default:
      return Bell;
  }
}

// Cores por tipo de entidade para notificações
const NOTIFICATION_COLORS = {
  PROJETO: "text-purple-600 bg-purple-50",
  WORKPACKAGE: "text-green-600 bg-green-50",
  ENTREGAVEL: "text-blue-600 bg-blue-50",
  TAREFA: "text-cyan-600 bg-cyan-50",
  ALOCACAO: "text-amber-600 bg-amber-50",
  SISTEMA: "text-slate-600 bg-slate-50",
};

export default function UserDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const utils = api.useUtils();

  // Obter dados do dashboard do utilizador
  const { data: dashboardData, isLoading: isLoadingDashboard } = api.dashboard.getDashboard.useQuery();
  
  // Consultar eventos próximos do utilizador (novo controlador)
  const { data: proximosEventosData, isLoading: isLoadingProximosEventos } = api.dashboard.proximosEventos.useQuery(
    { 
      userId: session?.user?.id || "", 
      limit: 10 
    },
    { 
      enabled: !!session?.user?.id,
      staleTime: 1000 * 60 * 5 // 5 minutos
    }
  );
  
  // Consultar notificações recentes (não lidas)
  const { data: notificacoes, isLoading: isLoadingNotificacoes } = api.notificacao.listar.useQuery(
    { estado: "NAO_LIDA" },
    { 
      enabled: !!session?.user?.id,
      staleTime: 1000 * 60 * 5, // 5 minutos
    }
  );
  
  // Consultar contagem de notificações não lidas
  const { data: notificacoesNaoLidas } = api.notificacao.contarNaoLidas.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );

  // Valores padrão e fallbacks seguros para dados que podem não existir na API
  const tarefasPendentes = dashboardData?.tarefasPendentes || 0;
  const projetosAtivos = dashboardData?.projetosAtivos || 0;
  const projetosPendentes = dashboardData?.projetosPendentes || 0;
  const tarefasUrgentes =
    dashboardData?.entregaveisProximos?.filter((e) => e.diasRestantes < 0).length || 0;
    
  // Calcular entregáveis do mês atual
  const mesAtual = new Date().getMonth() + 1; // JavaScript usa meses 0-11, ajustamos para 1-12
  const anoAtual = new Date().getFullYear();
  const nomeMesAtual = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][mesAtual - 1];
  
  // Usar os entregáveis do mês atual já retornados pelo backend
  const entregaveisMesAtual = dashboardData?.entregaveisMesAtual || [];
  const totalEntregaveisMesAtual = entregaveisMesAtual.length;
  const entregaveisPendentesMesAtual = entregaveisMesAtual.filter(e => !e.estado).length;

  // Define os dados estatísticos simplificados
  const statsItems = useMemo<StatItem[]>(
    () => [
      {
        icon: Briefcase,
        label: "Projetos Alocados",
        value: projetosAtivos,
        iconClassName: "text-blue-600",
        iconContainerClassName: "bg-blue-50/80",
        badgeText: projetosPendentes > 0 ? `${projetosPendentes} pendentes` : "Sem pendentes",
        badgeClassName: "text-blue-600 bg-blue-50/80 hover:bg-blue-100/80 border-blue-100",
      },
      {
        icon: Package,
        label: `Entregáveis (${nomeMesAtual} ${anoAtual})`,
        value: totalEntregaveisMesAtual,
        iconClassName: "text-emerald-600",
        iconContainerClassName: "bg-emerald-50/80",
        badgeText: entregaveisPendentesMesAtual > 0 ? `${entregaveisPendentesMesAtual} pendentes` : "Todos concluídos",
        badgeClassName: entregaveisPendentesMesAtual > 0 
          ? "text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 border-amber-100"
          : "text-emerald-600 bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-100",
      },
      {
        icon: Bell,
        label: "Notificações",
        value: notificacoesNaoLidas || 0,
        iconClassName: "text-amber-600",
        iconContainerClassName: "bg-amber-50/80",
        badgeText: notificacoesNaoLidas ? "Não lidas" : "Nenhuma nova",
        badgeClassName: notificacoesNaoLidas 
          ? "text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 border-amber-100"
          : "text-slate-500 bg-slate-50 hover:bg-slate-100 border-slate-100",
      },
    ],
    [
      projetosAtivos,
      projetosPendentes,
      totalEntregaveisMesAtual,
      entregaveisPendentesMesAtual,
      notificacoesNaoLidas,
    ]
  );

  // Handler para marcar notificação como lida e navegar
  const marcarComoLidaMutation = api.notificacao.marcarComoLida.useMutation({
    onSuccess: () => {
      // Invalidar a consulta de notificações para atualizar a UI
      utils.notificacao.listar.invalidate();
      utils.notificacao.contarNaoLidas.invalidate();
    }
  });
  
  const handleNotificacaoClick = useCallback(async (notificacao: any) => {
    try {
      // Marcar como lida
      await marcarComoLidaMutation.mutateAsync(notificacao.id);
      
      // Navegar para o item relacionado
      switch (notificacao.entidade) {
        case "PROJETO":
          router.push(`/projetos/${notificacao.entidadeId}`);
          break;
        case "WORKPACKAGE":
          router.push(`/projetos/${notificacao.entidadeId}/workpackages`);
          break;
        case "ENTREGAVEL":
          router.push(`/projetos/entregaveis/${notificacao.entidadeId}`);
          break;
        case "TAREFA":
          router.push(`/projetos/tarefas/${notificacao.entidadeId}`);
          break;
        case "ALOCACAO":
          router.push(`/utilizadores/${notificacao.entidadeId}`);
          break;
        default:
          router.push("/notificacoes");
      }
    } catch (error) {
      console.error("Erro ao processar notificação:", error);
    }
  }, [router, marcarComoLidaMutation]);

  // Componente de skeleton para carregamento
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      {/* Primeira linha: 3 cards de estatísticas */}
      <div className="grid gap-6 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="overflow-hidden border border-gray-100 bg-white shadow-sm">
            <CardHeader className="space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Segunda linha: Próximos Eventos e Notificações Recentes */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-1">
          <Card className="overflow-hidden border border-gray-100 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-48 mt-1" />
            </CardHeader>
            <CardContent className="p-0">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-1">
          <Card className="overflow-hidden border border-gray-100 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-56 mt-1" />
            </CardHeader>
            <CardContent className="p-0">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Terceira linha: Gráfico de Ocupação Anual */}
      <div className="grid grid-cols-1">
        <Card className="overflow-hidden border border-gray-100 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48 mt-1" />
          </CardHeader>
          <CardContent className="p-0">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Calculando dados para os gráficos
  const { data: ocupacaoMensalData } = api.utilizador.getOcupacaoMensal.useQuery(
    {
      userId: session?.user?.id || "",
      ano: new Date().getFullYear(),
    },
    {
      enabled: !!session?.user?.id,
    }
  );

  const ocupacaoAnual = useMemo(() => {
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return meses.map((mes, index) => {
      const dadosMes = ocupacaoMensalData?.find(d => d.mes === index + 1);
      return {
        mes,
        ocupacaoAprovada: dadosMes ? Math.round(dadosMes.ocupacaoAprovada * 100) : 0,
        ocupacaoPendente: dadosMes ? Math.round(dadosMes.ocupacaoPendente * 100) : 0,
        ocupacaoTotal: dadosMes 
          ? Math.round((dadosMes.ocupacaoAprovada + dadosMes.ocupacaoPendente) * 100) 
          : 0
      };
    });
  }, [ocupacaoMensalData]);

  // Usando os dados do novo controlador proximosEventos
  const proximosItens = useMemo(() => {
    if (!proximosEventosData?.eventos?.length) return [];
    
    return proximosEventosData.eventos.map((evento: any) => ({
      id: evento.id,
      tipo: evento.tipo,
      nome: evento.nome,
      dataLimite: evento.dataLimite,
      diasRestantes: evento.diasRestantes,
      projetoNome: evento.projeto.nome,
      projetoId: evento.projeto.id,
      workpackageNome: evento.workpackage.nome,
      workpackageId: evento.workpackage.id,
    }));
  }, [proximosEventosData]);

  // Dashboard para utilizadores comuns
  return (
    <div className="min-h-screen bg-[#F7F9FC] p-8">
      <div className="mx-auto max-w-8xl space-y-6">
        {/* Header com Boas-vindas e Botões de Ação */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">
              Painel de Controlo
            </h1>
            <p className="text-sm text-slate-500">
              Olá {session?.user?.name?.split(' ')[0]}, acompanhe aqui o seu trabalho.
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <NovoProjeto />
          </div>
        </div>

        {isLoadingDashboard ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-6">
            {/* Primeira linha: 3 cards de estatísticas */}
            <div className="grid gap-6 md:grid-cols-3">
              {statsItems.map((stat) => (
                <Card key={stat.label} className="overflow-hidden border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">{stat.label}</CardTitle>
                    <stat.icon className={`h-5 w-5 ${stat.iconClassName}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
                    {stat.badgeText && (
                      <p className={`mt-1 text-xs ${stat.badgeClassName?.includes('red') ? 'text-red-600' : 'text-slate-500'}`}>
                        {stat.badgeText}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Segunda linha: Próximos Eventos e Notificações Recentes lado a lado */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Próximos Eventos */}
              <div className="md:col-span-1">
                <Card className="h-full overflow-hidden border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium text-slate-700">
                        Próximos Eventos
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-slate-500">
                      Tarefas e entregáveis ordenados por prazo
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50 scrollbar-thumb-rounded-full">
                      {isLoadingProximosEventos ? (
                        <div className="space-y-4 pt-2">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-lg p-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : proximosItens.length === 0 ? (
                        <div className="flex h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                          <Calendar className="mb-3 h-12 w-12 text-slate-300" />
                          <p className="text-sm font-medium text-slate-600">Nenhum evento próximo</p>
                          <p className="mt-1 text-xs text-slate-400">Tarefas e entregáveis aparecerão aqui.</p>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-2">
                          {proximosItens.map((item) => {
                            const diasRestantes = item.diasRestantes ?? null;
                            const atrasado = typeof diasRestantes === 'number' && diasRestantes < 0;
                            
                            let dataExibicao = "";
                            if (item.dataLimite) {
                              const data = new Date(item.dataLimite);
                              dataExibicao = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short' }).format(data);
                            }
                            
                            const prazoTexto = 
                              diasRestantes === null || diasRestantes === undefined ? "Sem prazo" :
                              atrasado ? `${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) !== 1 ? "s" : ""} atraso` :
                              diasRestantes === 0 ? "Hoje" :
                              diasRestantes === 1 ? "Amanhã" :
                              `Faltam ${diasRestantes} dias`;
                              
                            return (
                              <div 
                                key={`${item.tipo}-${item.id}`} 
                                className="group flex cursor-pointer items-center gap-3 rounded-lg border border-transparent p-3 transition-colors duration-150 hover:border-slate-100 hover:bg-slate-50/80"
                                onClick={() => item.tipo === 'tarefa' 
                                  ? router.push(`/projetos/${item.projetoId}?tab=tarefas`) 
                                  : router.push(`/projetos/${item.projetoId}?tab=entregaveis`)}
                              >
                                <div
                                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full 
                                    ${item.tipo === "entregavel"
                                      ? atrasado ? "bg-red-100 text-red-700" : diasRestantes !== null && diasRestantes <= 3 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                      : "bg-blue-100 text-blue-700"
                                    }`}
                                >
                                  {item.tipo === "entregavel" ? (
                                    <Package className="h-4 w-4" />
                                  ) : (
                                    <Calendar className="h-4 w-4" />
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="truncate text-sm font-medium text-slate-800 group-hover:text-blue-700">
                                      {item.nome}
                                    </p>
                                    {dataExibicao && (
                                      <span className="ml-2 flex-shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 group-hover:bg-slate-200">
                                        {dataExibicao}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="mt-0.5 flex flex-col xs:flex-row xs:items-center text-xs">
                                    <span className="truncate text-slate-500">
                                      {item.projetoNome}
                                    </span>
                                    
                                    <div className="hidden xs:flex xs:items-center">
                                      <span className="mx-1.5 h-0.5 w-0.5 rounded-full bg-slate-300"></span>
                                      
                                      <span className={`font-medium 
                                        ${atrasado ? "text-red-600" : typeof diasRestantes === 'number' && diasRestantes <= 3 ? "text-amber-600" : "text-slate-500"}
                                      `}>
                                        {prazoTexto}
                                      </span>
                                    </div>
                                    
                                    <span className={`xs:hidden font-medium 
                                      ${atrasado ? "text-red-600" : typeof diasRestantes === 'number' && diasRestantes <= 3 ? "text-amber-600" : "text-slate-500"}
                                    `}>
                                      {prazoTexto}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Notificações Recentes */}
              <div className="md:col-span-1">
                <Card className="h-full overflow-hidden border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium text-slate-700">
                        Notificações Recentes
                      </CardTitle>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-7 px-2 text-xs font-medium text-blue-600 hover:text-blue-800"
                        onClick={() => router.push('/projetos')}
                      >
                        Ver todos
                      </Button>
                    </div>
                    <CardDescription className="text-xs text-slate-500">
                      Atualizações importantes dos seus projetos e tarefas
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50 scrollbar-thumb-rounded-full">
                      {isLoadingNotificacoes ? (
                        <div className="space-y-3">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-start gap-2 rounded-lg py-2 px-2">
                              <Skeleton className="h-7 w-7 rounded-full" />
                              <div className="flex-1 space-y-1">
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-2 w-2/3" />
                                <Skeleton className="h-2 w-1/3" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : !notificacoes?.length ? (
                        <div className="flex h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                          <Bell className="mb-2 h-10 w-10 text-slate-300" />
                          <p className="text-sm font-medium text-slate-600">Nenhuma notificação pendente</p>
                          <p className="mt-1 text-xs text-slate-400">As notificações não lidas aparecerão aqui.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {notificacoes.slice(0, 6).map((notificacao: any) => {
                            const Icon = getNotificationIcon(notificacao.entidade);
                            const colorClass = NOTIFICATION_COLORS[notificacao.entidade as keyof typeof NOTIFICATION_COLORS] || NOTIFICATION_COLORS.SISTEMA;
                            const dataFormatada = formatDistanceToNow(new Date(notificacao.dataEmissao), { 
                              addSuffix: true, 
                              locale: ptBR 
                            });
                            
                            return (
                              <div 
                                key={notificacao.id}
                                className="group flex cursor-pointer items-start gap-2 rounded-lg py-2 px-2 transition-colors duration-150 hover:bg-slate-50"
                                onClick={() => handleNotificacaoClick(notificacao)}
                              >
                                <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <h4 className="text-sm font-medium text-slate-800 group-hover:text-blue-700 line-clamp-1 pr-1">{notificacao.titulo}</h4>
                                    
                                    {notificacao.urgencia === "ALTA" && (
                                      <Badge className="ml-1 shrink-0 bg-red-100 text-red-700 border-red-200 hover:bg-red-200 text-[11px] px-1.5 py-0">
                                        Urgente
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <p className="text-xs text-slate-600 line-clamp-1">{notificacao.descricao}</p>
                                  
                                  <p className="text-[11px] text-slate-500">{dataFormatada}</p>
                                </div>
                              </div>
                            );
                          })}
                          
                          {notificacoes.length > 6 && (
                            <div className="pt-1 pb-0.5 text-center border-t border-slate-100">
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="text-xs text-blue-600 hover:text-blue-800 h-6 px-2"
                                onClick={() => router.push('/notificacoes')}
                              >
                                Ver mais {notificacoes.length - 6} notificações
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Terceira linha: Gráfico de Ocupação Anual em largura total */}
            <div className="grid grid-cols-1">
              <Card className="overflow-hidden border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-slate-700">
                    Ocupação Anual
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Percentagem de alocação mensal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm bg-[#22c55e] opacity-70"></span>
                      <span className="text-xs text-slate-600">Aprovada</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm bg-[#3b82f6] opacity-60"></span>
                      <span className="text-xs text-slate-600">Pendente</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={ocupacaoAnual}>
                      <defs>
                        <linearGradient id="colorAprovada" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.7} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPendente" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="mes" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        stroke="#64748b" 
                        padding={{ left: 10, right: 10 }}
                      />
                      <YAxis
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 'auto']}
                        stroke="#64748b"
                        width={40}
                        tickMargin={6}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          const label = name === "ocupacaoAprovada" 
                            ? "Aprovada" 
                            : name === "ocupacaoPendente" 
                              ? "Pendente" 
                              : "Total";
                          const color = name === "ocupacaoAprovada" 
                            ? "#22c55e" 
                            : name === "ocupacaoPendente" 
                              ? "#3b82f6" 
                              : "#64748b";
                          return [
                            <span key="value" style={{ color: color, fontWeight: 500 }}>{`${value}%`}</span>,
                            <span key="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ 
                                display: 'inline-block', 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                backgroundColor: color 
                              }}></span>
                              {label}
                            </span>
                          ];
                        }} 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          padding: '10px 14px',
                          fontSize: '13px',
                        }}
                        itemStyle={{ padding: '3px 0' }}
                        labelStyle={{ fontWeight: 600, fontSize: '14px', color: '#334155', marginBottom: '4px' }}
                        wrapperStyle={{ outline: 'none' }}
                        labelFormatter={(label) => {
                          return <span style={{ color: '#334155', fontWeight: 'bold', borderBottom: '1px solid #f1f5f9', display: 'block', paddingBottom: '4px', marginBottom: '6px' }}>{label}</span>;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="ocupacaoAprovada"
                        name="ocupacaoAprovada"
                        stroke="#22c55e"
                        fillOpacity={1}
                        fill="url(#colorAprovada)"
                        strokeWidth={2}
                        dot={{ r: 1.5, fill: "#22c55e", stroke: "#22c55e", strokeWidth: 2 }}
                        activeDot={{ r: 4, strokeWidth: 1, fill: "#22c55e", stroke: "#fff" }}
                        stackId="1"
                      />
                      <Area
                        type="monotone"
                        dataKey="ocupacaoPendente"
                        name="ocupacaoPendente"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorPendente)"
                        strokeWidth={2}
                        dot={{ r: 1.5, fill: "#3b82f6", stroke: "#3b82f6", strokeWidth: 2 }}
                        activeDot={{ r: 4, strokeWidth: 1, fill: "#3b82f6", stroke: "#fff" }}
                        stackId="1"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}