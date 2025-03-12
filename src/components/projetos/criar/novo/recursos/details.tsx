import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Decimal } from "decimal.js";
import { gerarMesesEntreDatas } from "@/server/api/utils";
import { UserCheck, Calendar, Percent, Users, BarChart2 } from "lucide-react";

interface DetailsProps {
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

export function Details({ workpackage, recursos, utilizadores, inicio, fim }: DetailsProps) {
  // Se não houver recursos, não renderizar nada
  if (!recursos || recursos.length === 0) {
    return null;
  }
  
  // Processar dados para a visualização
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
    
    // Gerar dados para a visualização da timeline
    const mesesTimeline = gerarMesesEntreDatas(inicio, fim);
    
    return {
      alocacoesPorUser,
      mesesTimeline
    };
  }, [recursos, utilizadores, inicio, fim]);
  
  return (
    <div className="bg-white rounded-xl border border-azul/10 overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-azul/10">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-azul" />
          <h3 className="font-medium text-azul">Visão Geral das Alocações</h3>
        </div>
      </div>
      
      <div className="p-4">
        <div className="space-y-8">
          {dadosAlocacao.alocacoesPorUser.map((alocacao, index) => (
            <div key={alocacao.user?.id || index}>
              {/* Cabeçalho do utilizador */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-azul/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-azul" />
                </div>
                <div>
                  <h4 className="font-medium text-azul">
                    {alocacao.user?.name || "Utilizador não encontrado"}
                  </h4>
                  <div className="flex items-center gap-3 text-sm text-azul/60">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {alocacao.numMeses} meses
                    </span>
                    <span className="flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5" />
                      Média: {formatarDecimal(alocacao.mediaOcupacao * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-12 gap-1">
                {dadosAlocacao.mesesTimeline.map(mes => {
                  const ocupacao = alocacao.mesesAlocados[mes.chave] || 0;
                  const ocupacaoPercentual = ocupacao * 100;
                  
                  return (
                    <TooltipProvider key={mes.chave}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="group relative">
                            {/* Mês label */}
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-azul/60 whitespace-nowrap hidden group-hover:block">
                              {mes.formatado}
                            </div>
                            
                            {/* Barra de ocupação */}
                            <div className="h-12 rounded-lg bg-slate-100 relative overflow-hidden">
                              <div 
                                className={`absolute bottom-0 left-0 w-full transition-all ${getOcupacaoColor(ocupacao)}`}
                                style={{ height: `${ocupacaoPercentual}%` }}
                              />
                              
                              {/* Valor da ocupação */}
                              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                                <span className={getOcupacaoTextColor(ocupacao)}>
                                  {ocupacaoPercentual > 0 ? `${Math.round(ocupacaoPercentual)}%` : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <p className="font-medium">{mes.formatado}</p>
                            <p>{formatarDecimal(ocupacaoPercentual)}% de alocação</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
              
              {index < dadosAlocacao.alocacoesPorUser.length - 1 && (
                <Separator className="my-8 bg-azul/10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 