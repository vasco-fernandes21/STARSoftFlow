import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { format, addMonths } from "date-fns";
import { pt } from "date-fns/locale";
import { Decimal } from "decimal.js";
import { gerarMesesEntreDatas } from "@/server/api/utils";
import { UserCheck, Calendar, Percent, Clock, BarChart3, BarChart2, Activity, Users, Award, TrendingUp, BarChart, PieChart } from "lucide-react";

interface DashboardAlocacoesProps {
  workpackage: any;
  recursos: Array<{
    userId: string;
    mes: number;
    ano: number;
    ocupacao: Decimal;
  }>;
  utilizadores: Array<{
    id: string;
    name: string | null;
    email: string | null;
  }>;
  inicio: Date;
  fim: Date;
}

type AlocacaoPorUser = {
  user: any;
  totalOcupacao: number;
  numMeses: number;
  mediaOcupacao: number;
  mesesAlocados: Record<string, number>;
};

// Função para obter a cor de acordo com o nível de ocupação
function getOcupacaoColor(ocupacao: number): string {
  if (ocupacao >= 0.8) return "bg-emerald-500";
  if (ocupacao >= 0.5) return "bg-blue-500";
  if (ocupacao >= 0.3) return "bg-amber-500";
  return "bg-slate-300";
}

// Função para obter o texto de acordo com o nível de ocupação
function getOcupacaoTextColor(ocupacao: number): string {
  if (ocupacao >= 0.8) return "text-emerald-600";
  if (ocupacao >= 0.5) return "text-blue-600";
  if (ocupacao >= 0.3) return "text-amber-600";
  return "text-slate-600";
}

// Função para converter decimal para string formatado com vírgula
function formatarDecimal(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

export function DashboardAlocacoes({ 
  workpackage, 
  recursos, 
  utilizadores,
  inicio,
  fim
}: DashboardAlocacoesProps) {
  // Se não houver recursos, mostrar mensagem
  if (!recursos || recursos.length === 0) {
    return (
      <Card className="border-azul/10 shadow-sm bg-white/80 backdrop-blur-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-azul/5 to-azul/10 pb-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-azul/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-azul" />
            </div>
            <div>
              <CardTitle className="text-azul">Alocações de Recursos</CardTitle>
              <CardDescription className="text-azul/60">
                {workpackage.nome}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-16 w-16 rounded-full bg-azul/5 flex items-center justify-center border border-azul/10">
              <Users className="h-8 w-8 text-azul/40" />
            </div>
            <p className="text-base font-medium text-azul/70">Nenhum recurso alocado</p>
            <p className="text-sm text-azul/60 max-w-md">
              Ainda não existem recursos alocados a este workpackage. Adicione recursos utilizando o botão "Adicionar Recurso" abaixo.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Processar dados para o dashboard
  const dadosAlocacao = useMemo(() => {
    // Agrupar recursos por usuário
    const recursosAgrupados: Record<string, AlocacaoPorUser> = {};
    
    recursos.forEach(recurso => {
      const userId = recurso.userId;
      const user = utilizadores.find(u => u.id === userId);
      const ocupacao = recurso.ocupacao instanceof Decimal 
        ? recurso.ocupacao.toNumber() 
        : typeof recurso.ocupacao === 'string' 
          ? parseFloat(recurso.ocupacao) 
          : Number(recurso.ocupacao);
      
      const chave = `${recurso.mes}-${recurso.ano}`;
      
      if (!recursosAgrupados[userId]) {
        recursosAgrupados[userId] = {
          user,
          totalOcupacao: 0,
          numMeses: 0,
          mediaOcupacao: 0,
          mesesAlocados: {}
        };
      }
      
      recursosAgrupados[userId].mesesAlocados[chave] = ocupacao;
      recursosAgrupados[userId].totalOcupacao += ocupacao;
      recursosAgrupados[userId].numMeses += 1;
    });
    
    // Calcular média de ocupação para cada usuário
    Object.values(recursosAgrupados).forEach(item => {
      item.mediaOcupacao = item.totalOcupacao / item.numMeses;
    });
    
    // Ordenar por total de ocupação
    const alocacoesPorUser = Object.values(recursosAgrupados).sort(
      (a, b) => b.totalOcupacao - a.totalOcupacao
    );
    
    // Calcular estatísticas globais
    const totalRecursosAlocados = alocacoesPorUser.length;
    const totalAlocacoes = recursos.length;
    const mediaAlocacoesPorRecurso = totalAlocacoes / Math.max(totalRecursosAlocados, 1);
    const mediaOcupacaoGlobal = recursos.reduce((acc, curr) => {
      const ocupacao = curr.ocupacao instanceof Decimal 
        ? curr.ocupacao.toNumber() 
        : typeof curr.ocupacao === 'string' 
          ? parseFloat(curr.ocupacao) 
          : Number(curr.ocupacao);
      return acc + ocupacao;
    }, 0) / Math.max(totalAlocacoes, 1);
    
    // Gerar dados para a visualização da timeline
    const mesesTimeline = gerarMesesEntreDatas(inicio, fim);
    
    return {
      alocacoesPorUser,
      totalRecursosAlocados,
      totalAlocacoes,
      mediaAlocacoesPorRecurso,
      mediaOcupacaoGlobal,
      mesesTimeline
    };
  }, [recursos, utilizadores, inicio, fim]);
  
  // Calcular métricas adicionais
  const mesesMaisAlocados = useMemo(() => {
    // Agrupar alocações por mês
    const alocacoesPorMes: Record<string, { total: number; contagem: number }> = {};
    
    recursos.forEach(recurso => {
      const chave = `${recurso.mes}-${recurso.ano}`;
      const ocupacao = recurso.ocupacao instanceof Decimal 
        ? recurso.ocupacao.toNumber() 
        : typeof recurso.ocupacao === 'string' 
          ? parseFloat(recurso.ocupacao) 
          : Number(recurso.ocupacao);
      
      if (!alocacoesPorMes[chave]) {
        alocacoesPorMes[chave] = { total: 0, contagem: 0 };
      }
      
      alocacoesPorMes[chave].total += ocupacao;
      alocacoesPorMes[chave].contagem += 1;
    });
    
    // Transformar em array e ordenar
    return Object.entries(alocacoesPorMes)
      .map(([chave, dados]) => {
        const [mes, ano] = chave.split('-').map(Number);
        const data = new Date(ano, mes - 1, 1);
        return {
          chave,
          mes,
          ano,
          total: dados.total,
          contagem: dados.contagem,
          media: dados.total / dados.contagem,
          formatado: format(data, 'MMM/yyyy', { locale: pt })
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [recursos]);
  
  return (
    <Card className="border-azul/10 shadow-sm bg-white/80 backdrop-blur-sm rounded-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-azul/5 to-azul/10 pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-azul/10 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-azul" />
            </div>
            <div>
              <CardTitle className="text-azul">Dashboard de Alocações</CardTitle>
              <CardDescription className="text-azul/60">
                {workpackage.nome} • {format(inicio, 'MMM/yyyy', { locale: pt })} - {format(fim, 'MMM/yyyy', { locale: pt })}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <Tabs defaultValue="timeline" className="w-full">
        <div className="px-4 border-b border-azul/10 bg-azul/5 flex justify-end">
          <TabsList className="h-8 bg-azul/5 border border-azul/10 my-2">
            <TabsTrigger value="timeline" className="h-6 text-xs data-[state=active]:bg-white">
              <BarChart2 className="h-3 w-3 mr-1" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="resumo" className="h-6 text-xs data-[state=active]:bg-white">
              <PieChart className="h-3 w-3 mr-1" />
              Resumo
            </TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="p-0">
          {/* Estatísticas */}
          <div className="grid grid-cols-4 gap-0 border-b border-azul/10">
            <div className="p-4 flex flex-col justify-center items-center border-r border-azul/10">
              <div className="flex items-center gap-1 mb-1">
                <Users className="h-3.5 w-3.5 text-azul" />
                <span className="text-xs text-azul/70 font-medium">Recursos</span>
              </div>
              <div className="text-xl font-semibold text-azul">
                {dadosAlocacao.totalRecursosAlocados}
              </div>
            </div>
            <div className="p-4 flex flex-col justify-center items-center border-r border-azul/10">
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="h-3.5 w-3.5 text-azul" />
                <span className="text-xs text-azul/70 font-medium">Alocações</span>
              </div>
              <div className="text-xl font-semibold text-azul">
                {dadosAlocacao.totalAlocacoes}
              </div>
            </div>
            <div className="p-4 flex flex-col justify-center items-center border-r border-azul/10">
              <div className="flex items-center gap-1 mb-1">
                <Activity className="h-3.5 w-3.5 text-azul" />
                <span className="text-xs text-azul/70 font-medium">Média/Recurso</span>
              </div>
              <div className="text-xl font-semibold text-azul">
                {dadosAlocacao.mediaAlocacoesPorRecurso.toFixed(1).replace('.', ',')}
              </div>
            </div>
            <div className="p-4 flex flex-col justify-center items-center">
              <div className="flex items-center gap-1 mb-1">
                <Percent className="h-3.5 w-3.5 text-azul" />
                <span className="text-xs text-azul/70 font-medium">Ocupação Média</span>
              </div>
              <div className="text-xl font-semibold text-azul">
                {formatarDecimal(dadosAlocacao.mediaOcupacaoGlobal * 100)}%
              </div>
            </div>
          </div>
          
          <TabsContent value="timeline" className="p-4 m-0">
            {/* Timeline de Alocações */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-azul mb-3 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Timeline de Alocações por Mês
              </h4>
              
              <div className="overflow-x-auto pb-2">
                <div className="min-w-full" style={{ minWidth: `${Math.max(dadosAlocacao.mesesTimeline.length * 80, 600)}px` }}>
                  {/* Cabeçalho da Timeline */}
                  <div className="flex">
                    <div className="w-36 flex-shrink-0"></div>
                    {dadosAlocacao.mesesTimeline.map(mes => (
                      <div key={mes.chave} className="flex-1 px-1 text-center">
                        <div className="text-xs text-azul/60 font-medium">
                          {mes.formatado}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Conteúdo da Timeline */}
                  <div className="mt-2 space-y-3">
                    {dadosAlocacao.alocacoesPorUser.map(alocacao => (
                      <div key={alocacao.user?.id} className="flex items-center">
                        <div className="w-36 flex-shrink-0 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-azul/10 flex items-center justify-center">
                              <UserCheck className="h-3.5 w-3.5 text-azul" />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-medium text-azul truncate">
                                {alocacao.user?.name || "Utilizador não encontrado"}
                              </div>
                              <div className="text-[10px] text-azul/50">
                                {alocacao.numMeses} mês(es)
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {dadosAlocacao.mesesTimeline.map(mes => {
                          const ocupacao = alocacao.mesesAlocados[mes.chave] || 0;
                          const altura = Math.max(ocupacao * 100, 2); // Mínimo de 2% para visibilidade
                          const corOcupacao = getOcupacaoColor(ocupacao);
                          
                          return (
                            <div key={mes.chave} className="flex-1 px-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="h-8 rounded-sm bg-azul/5 relative">
                                      <div 
                                        className={`absolute bottom-0 left-0 right-0 rounded-sm ${corOcupacao} transition-all duration-200`}
                                        style={{ height: `${altura}%` }}
                                      ></div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="bg-white shadow-lg border border-azul/10 p-2">
                                    <div className="text-xs font-medium">
                                      {alocacao.user?.name}
                                    </div>
                                    <div className="text-xs text-azul/70">
                                      {mes.formatado}: {formatarDecimal(ocupacao * 100)}%
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Legenda */}
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-azul/70">&ge; 80%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-azul/70">&ge; 50%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                <span className="text-xs text-azul/70">&ge; 30%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-slate-300"></div>
                <span className="text-xs text-azul/70">&lt; 30%</span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="resumo" className="p-4 m-0">
            {/* Resumo por Utilizador */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-azul mb-3 flex items-center gap-1">
                <Users className="h-4 w-4" />
                Resumo por Utilizador
              </h4>
              
              <div className="space-y-3">
                {dadosAlocacao.alocacoesPorUser.map(alocacao => {
                  const percentMedia = alocacao.mediaOcupacao * 100;
                  const corTexto = getOcupacaoTextColor(alocacao.mediaOcupacao);
                  const corBarra = getOcupacaoColor(alocacao.mediaOcupacao);
                  
                  return (
                    <div key={alocacao.user?.id} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-azul/10 flex items-center justify-center">
                            <UserCheck className="h-3 w-3 text-azul" />
                          </div>
                          <span className="text-sm font-medium text-azul">
                            {alocacao.user?.name || "Utilizador não encontrado"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="h-5 text-xs bg-azul/5">
                            {alocacao.numMeses} mês(es)
                          </Badge>
                          <span className={`text-xs font-medium ${corTexto}`}>
                            {formatarDecimal(percentMedia)}%
                          </span>
                        </div>
                      </div>
                      
                      <Progress 
                        value={percentMedia} 
                        className="h-2 bg-azul/10 group-hover:h-2.5 transition-all duration-200"
                        indicatorClassName={corBarra}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Top Meses */}
            <div>
              <h4 className="text-sm font-medium text-azul mb-3 flex items-center gap-1">
                <Award className="h-4 w-4" />
                Meses com Maior Alocação
              </h4>
              
              <div className="grid grid-cols-3 gap-3">
                {mesesMaisAlocados.slice(0, 6).map(mes => {
                  const mediaOcupacao = mes.media;
                  const corTexto = getOcupacaoTextColor(mediaOcupacao);
                  
                  return (
                    <div key={mes.chave} className="bg-white rounded-lg border border-azul/10 p-3 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <Badge 
                          variant="outline" 
                          className="h-5 text-xs bg-azul/5 font-medium"
                        >
                          {mes.formatado}
                        </Badge>
                        <div className={`text-xs font-semibold ${corTexto}`}>
                          {formatarDecimal(mediaOcupacao * 100)}%
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-azul/60">
                        <span>{mes.contagem} recurso(s)</span>
                        <span>Total: {formatarDecimal(mes.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="px-4 py-3 bg-azul/5 border-t border-azul/10 flex justify-between items-center">
        <span className="text-xs text-azul/60">
          Período de {format(inicio, 'dd/MM/yyyy', { locale: pt })} a {format(fim, 'dd/MM/yyyy', { locale: pt })}
        </span>
        <span className="text-xs text-azul/60">
          {dadosAlocacao.totalRecursosAlocados} recurso(s) • {dadosAlocacao.totalAlocacoes} alocação(ões)
        </span>
      </CardFooter>
    </Card>
  );
}