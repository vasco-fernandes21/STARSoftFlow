"use client";

import { useMemo } from "react";
import { api } from "@/trpc/react";
import { ClipboardCheck, CalendarRange, BarChart2, Users, Briefcase, Target, Clock, Calendar, ArrowUpRight, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { ProjetoCompleto } from "@/components/projetos/types";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface VisaoGeralProps {
  projetoId: string;
}

export default function VisaoGeral({ projetoId }: VisaoGeralProps) {
  const router = useRouter();
  const params = useParams();
  
  // Query principal para buscar o projeto
  const { data: projeto, isLoading, error } = api.projeto.findById.useQuery(projetoId, {
    enabled: !!projetoId,
  });
  
  // Navegação para outras abas
  const handleNavigateToCronograma = () => {
    router.push(`/painel/projetos/${projetoId}/cronograma`);
  };
  
  const handleNavigateToEntregaveis = () => {
    // Isso depende de como sua aplicação está estruturada.
    // Se não houver uma página específica de entregáveis, pode navegar para workpackages
    router.push(`/painel/projetos/${projetoId}/workpackages`);
  };
  
  // Calcular estatísticas gerais do projeto
  const estatisticas = useMemo(() => {
    if (!projeto?.workpackages) {
      return {
        totalWorkpackages: 0,
        totalTarefas: 0,
        totalEntregaveis: 0,
        totalRecursos: 0,
        tarefasConcluidas: 0,
        entregaveisConcluidos: 0,
        progressoTarefas: 0,
        progressoEntregaveis: 0,
        progressoGeral: projeto?.progresso || 0,
        dataInicio: null,
        dataFim: null,
        duracaoMeses: 0,
        mesesDecorridos: 0,
        percentualTempo: 0
      };
    }
    
    // Coletar dados
    const workpackages = projeto.workpackages;
    
    // Tarefas e entregáveis
    const tarefas = workpackages.flatMap(wp => wp.tarefas);
    const entregaveis = tarefas.flatMap(t => t.entregaveis);
    
    // Recursos (alocações)
    const todosRecursos = workpackages.flatMap(wp => wp.recursos);
    const recursosUnicos = new Set(todosRecursos.map(r => r.userId));
    
    // Contagem de concluídos
    const tarefasConcluidas = tarefas.filter(t => t.estado).length;
    const entregaveisConcluidos = entregaveis.filter(e => e.estado).length;
    
    // Cálculo de progresso
    const progressoTarefas = tarefas.length > 0 
      ? Math.round((tarefasConcluidas / tarefas.length) * 100) 
      : 0;
      
    const progressoEntregaveis = entregaveis.length > 0 
      ? Math.round((entregaveisConcluidos / entregaveis.length) * 100) 
      : 0;
    
    // Datas e duração
    // Usar any para permitir acesso às propriedades que podem não estar no tipo
    const projetoAny = projeto as any;
    const dataInicio = projetoAny.data_inicio || projetoAny.inicio;
    const dataFim = projetoAny.data_fim || projetoAny.fim;
    
    let duracaoMeses = 0;
    let mesesDecorridos = 0;
    let percentualTempo = 0;
    
    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      const hoje = new Date();
      
      duracaoMeses = Math.round((fim.getTime() - inicio.getTime()) / (30 * 24 * 60 * 60 * 1000));
      
      if (hoje < inicio) {
        mesesDecorridos = 0;
        percentualTempo = 0;
      } else if (hoje > fim) {
        mesesDecorridos = duracaoMeses;
        percentualTempo = 100;
      } else {
        mesesDecorridos = Math.round((hoje.getTime() - inicio.getTime()) / (30 * 24 * 60 * 60 * 1000));
        percentualTempo = Math.round((mesesDecorridos / duracaoMeses) * 100);
      }
    }
    
    return {
      totalWorkpackages: workpackages.length,
      totalTarefas: tarefas.length,
      totalEntregaveis: entregaveis.length,
      totalRecursos: recursosUnicos.size,
      tarefasConcluidas,
      entregaveisConcluidos,
      progressoTarefas,
      progressoEntregaveis,
      progressoGeral: projeto.progresso || 0,
      dataInicio,
      dataFim,
      duracaoMeses,
      mesesDecorridos,
      percentualTempo
    };
  }, [projeto]);
  
  // Formatar data para exibição
  const formatarData = (data: Date | null) => {
    if (!data) return "Não definida";
    return new Date(data).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Estados de loading e erro
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  if (error || !projeto) {
    return (
      <div className="rounded-lg bg-red-50 p-8 text-center text-red-500">
        Erro ao carregar dados do projeto: {error?.message || "Projeto não encontrado"}
      </div>
    );
  }
  
  // Cast para any para permitir acesso às propriedades que podem não estar no tipo
  const projetoAny = projeto as any;
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho do Projeto */}
      <div className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-5 bg-white/80 backdrop-blur-sm">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">{projeto.nome}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {projetoAny.acronimo ? `${projetoAny.acronimo} - ` : ''}
                  {projetoAny.codigo || 'Sem código'}
                </p>
              </div>
              <Badge 
                variant="outline" 
                className={`px-3 py-1.5 text-sm font-semibold shadow-sm 
                  ${String(projeto.estado) === 'EM_CURSO' || String(projeto.estado) === 'EM_DESENVOLVIMENTO'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                    : String(projeto.estado) === 'CONCLUIDO' 
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                  }`}
              >
                {String(projeto.estado) === 'EM_CURSO' || String(projeto.estado) === 'EM_DESENVOLVIMENTO'
                  ? 'Em Curso' 
                  : String(projeto.estado) === 'CONCLUIDO' 
                    ? 'Concluído'
                    : 'Em Preparação'
                }
              </Badge>
            </div>
            
            <div className="prose prose-sm max-w-none text-gray-600">
              {projeto.descricao || (
                <p className="text-gray-400 italic">Sem descrição disponível</p>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-700">
                <Calendar className="mr-1 h-3.5 w-3.5" />
                Início: {formatarData(estatisticas.dataInicio)}
              </Badge>
              <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-700">
                <Calendar className="mr-1 h-3.5 w-3.5" />
                Fim: {formatarData(estatisticas.dataFim)}
              </Badge>
              {projetoAny.cliente && (
                <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">
                  Cliente: {projetoAny.cliente}
                </Badge>
              )}
              {projetoAny.tipo && (
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                  {projetoAny.tipo}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Barra de Progresso Geral */}
      <Card className="overflow-hidden border-none shadow-md transition-all duration-300 ease-in-out hover:shadow-lg rounded-xl">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="font-semibold text-gray-700">Progresso do Projeto</h3>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                {estatisticas.progressoGeral}%
              </Badge>
            </div>
            
            <div className="space-y-1">
              <Progress value={estatisticas.progressoGeral} className="h-2.5" />
              
              <div className="flex justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{estatisticas.mesesDecorridos} de {estatisticas.duracaoMeses} meses ({estatisticas.percentualTempo}%)</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Target className="h-3.5 w-3.5" />
                  <span>{estatisticas.tarefasConcluidas} de {estatisticas.totalTarefas} tarefas ({estatisticas.progressoTarefas}%)</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden border-none shadow-md transition-all duration-300 ease-in-out hover:shadow-lg rounded-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Work Packages</p>
                <div className="mt-1 text-2xl font-semibold text-slate-700">{estatisticas.totalWorkpackages}</div>
                {estatisticas.totalWorkpackages > 0 && (
                  <p className="text-xs text-gray-500">
                    {Math.round(estatisticas.totalTarefas / estatisticas.totalWorkpackages)} tarefas por WP
                  </p>
                )}
              </div>
              <div className="rounded-full p-3 bg-blue-50 flex-shrink-0 shadow-sm border border-blue-100">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-md transition-all duration-300 ease-in-out hover:shadow-lg rounded-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Tarefas</p>
                <div className="mt-1 text-2xl font-semibold text-emerald-600">{estatisticas.totalTarefas}</div>
                <p className="text-xs text-gray-500">
                  {estatisticas.tarefasConcluidas} concluídas ({estatisticas.progressoTarefas}%)
                </p>
              </div>
              <div className="rounded-full p-3 bg-emerald-50 flex-shrink-0 shadow-sm border border-emerald-100">
                <ClipboardCheck className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-md transition-all duration-300 ease-in-out hover:shadow-lg rounded-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Entregáveis</p>
                <div className="mt-1 text-2xl font-semibold text-amber-600">{estatisticas.totalEntregaveis}</div>
                <p className="text-xs text-gray-500">
                  {estatisticas.entregaveisConcluidos} concluídos ({estatisticas.progressoEntregaveis}%)
                </p>
              </div>
              <div className="rounded-full p-3 bg-amber-50 flex-shrink-0 shadow-sm border border-amber-100">
                <BarChart2 className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-md transition-all duration-300 ease-in-out hover:shadow-lg rounded-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Equipa</p>
                <div className="mt-1 text-2xl font-semibold text-purple-600">{estatisticas.totalRecursos}</div>
                <p className="text-xs text-gray-500">
                  recursos alocados
                </p>
              </div>
              <div className="rounded-full p-3 bg-purple-50 flex-shrink-0 shadow-sm border border-purple-100">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Timeline e Marcos */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="overflow-hidden border-none shadow-md transition-all duration-300 ease-in-out hover:shadow-lg rounded-xl">
          <CardHeader className="bg-gray-50/80 backdrop-blur-sm p-4 border-b border-slate-100/50">
            <CardTitle className="text-lg font-medium text-slate-700">Período do Projeto</CardTitle>
            <CardDescription>Cronograma e duração</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Data de Início</p>
                    <p className="text-sm text-gray-500">{formatarData(estatisticas.dataInicio)}</p>
                  </div>
                </div>
                
                <ArrowUpRight className="h-5 w-5 text-gray-300 rotate-90" />
                
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Data de Fim</p>
                    <p className="text-sm text-gray-500">{formatarData(estatisticas.dataFim)}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-slate-100 p-3 text-center">
                  <p className="text-xs text-gray-500">Duração</p>
                  <p className="text-lg font-semibold text-slate-700">{estatisticas.duracaoMeses} meses</p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3 text-center">
                  <p className="text-xs text-gray-500">Decorrido</p>
                  <p className="text-lg font-semibold text-emerald-600">{estatisticas.mesesDecorridos} meses</p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3 text-center">
                  <p className="text-xs text-gray-500">Progresso</p>
                  <p className="text-lg font-semibold text-amber-600">{estatisticas.percentualTempo}%</p>
                </div>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              className="w-full mt-2 rounded-lg border-slate-200 text-sm text-slate-700 hover:text-emerald-600 hover:border-emerald-200"
              onClick={handleNavigateToCronograma}
            >
              <CalendarRange className="mr-2 h-4 w-4" />
              Ver Cronograma Completo
            </Button>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-none shadow-md transition-all duration-300 ease-in-out hover:shadow-lg rounded-xl">
          <CardHeader className="bg-gray-50/80 backdrop-blur-sm p-4 border-b border-slate-100/50">
            <CardTitle className="text-lg font-medium text-slate-700">Marcos Recentes</CardTitle>
            <CardDescription>Entregáveis e tarefas importantes</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {projeto.workpackages.flatMap(wp => wp.tarefas).flatMap(t => t.entregaveis).filter(e => e.data).length > 0 ? (
              <div className="space-y-3">
                {projeto.workpackages
                  .flatMap(wp => wp.tarefas)
                  .flatMap(t => t.entregaveis.map(e => ({...e, tarefaNome: t.nome})))
                  .filter(e => e.data)
                  .sort((a, b) => new Date(b.data!).getTime() - new Date(a.data!).getTime())
                  .slice(0, 5)
                  .map((entregavel) => (
                    <div key={entregavel.id} className="flex items-start space-x-3 p-3 rounded-lg border border-slate-100">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        entregavel.estado 
                          ? "bg-emerald-50 text-emerald-600" 
                          : "bg-amber-50 text-amber-600"
                      }`}>
                        {entregavel.estado 
                          ? <Check className="h-4 w-4" />
                          : <Clock className="h-4 w-4" />
                        }
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entregavel.nome}</p>
                        <p className="text-xs text-gray-500">{entregavel.tarefaNome}</p>
                        <div className="flex items-center mt-1">
                          <Badge variant="outline" className="text-xs">
                            {new Date(entregavel.data!).toLocaleDateString('pt-PT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </Badge>
                          {entregavel.estado && (
                            <Badge className="ml-2 bg-emerald-50 text-emerald-600 border-emerald-200 text-xs">
                              Concluído
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                }
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full mt-2 rounded-lg border-slate-200 text-sm text-slate-700 hover:text-emerald-600 hover:border-emerald-200"
                  onClick={handleNavigateToEntregaveis}
                >
                  Ver Todos os Entregáveis
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart2 className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                <p>Nenhum entregável com data definida</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 