"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Briefcase, ArrowRightCircle, PieChart, Clock, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Interface atualizada
interface Alocacao {
  id: string;
  projeto: string;
  workpackage: string;
  percentagem: number;
}

interface AlocacoesTableProps {
  alocacoes: Alocacao[];
  isLoading: boolean;
  horasPotenciais?: number;
}

// Função auxiliar para agrupar alocações por projeto
function groupAlocacoesByProjeto(alocacoes: Alocacao[]) {
  return alocacoes.reduce<Record<string, Alocacao[]>>((acc, alocacao) => {
    const projeto = alocacao.projeto || "Sem Projeto Associado";
    if (!acc[projeto]) {
      acc[projeto] = [];
    }
    acc[projeto]?.push(alocacao);
    return acc;
  }, {});
}

export function AlocacoesTable({ alocacoes, isLoading, horasPotenciais = 176 }: AlocacoesTableProps) {
  // Usar React.useMemo para evitar recálculos desnecessários
  const alocacoesAgrupadas = React.useMemo(() => groupAlocacoesByProjeto(alocacoes), [alocacoes]);
  const projetos = React.useMemo(() => Object.keys(alocacoesAgrupadas), [alocacoesAgrupadas]);

  // Calcular totais também com useMemo
  const totais = React.useMemo(() => {
    const totaisPorProjeto: Record<string, { percentagem: number; horas: number }> = {};
    let totalGeralPercentagem = 0;
    let totalGeralHoras = 0;

    projetos.forEach((projeto) => {
      const totalProjetoPercentagem = alocacoesAgrupadas[projeto]?.reduce(
        (sum, aloc) => sum + aloc.percentagem,
        0
      ) ?? 0;
      
      const totalProjetoHoras = (totalProjetoPercentagem / 100) * horasPotenciais;
      
      totaisPorProjeto[projeto] = {
        percentagem: totalProjetoPercentagem,
        horas: totalProjetoHoras
      };
      
      totalGeralPercentagem += totalProjetoPercentagem;
      totalGeralHoras += totalProjetoHoras;
    });

    return { 
      totaisPorProjeto, 
      totalGeral: {
        percentagem: totalGeralPercentagem,
        horas: totalGeralHoras
      }
    };
  }, [projetos, alocacoesAgrupadas, horasPotenciais]);

  if (isLoading) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-gray-500 font-medium">A carregar dados...</p>
      </div>
    );
  }

  if (projetos.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-8 text-center">
        <div className="max-w-sm">
          <Briefcase className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Sem Alocações</h3>
          <p className="mt-2 text-sm text-gray-500">
            Não foram encontradas alocações para este período. Selecione outro mês ou verifique os dados.
          </p>
        </div>
      </div>
    );
  }

  // Calcular a ocupação total em percentagem
  const ocupacaoTotal = totais.totalGeral.percentagem;
  const getOcupacaoStyle = (valor: number) => {
    if (valor > 100) return { color: "text-red-600", bg: "bg-red-600", light: "bg-red-100" };
    if (valor > 90) return { color: "text-amber-600", bg: "bg-amber-600", light: "bg-amber-100" };
    if (valor > 70) return { color: "text-green-600", bg: "bg-green-600", light: "bg-green-100" };
    return { color: "text-blue-600", bg: "bg-blue-600", light: "bg-blue-100" };
  };

  const ocupacaoStyle = getOcupacaoStyle(ocupacaoTotal);

  // Cores para projetos (usando hsl para gerar cores distintas)
  const getProjetoColor = (index: number) => {
    const hue = (index * 137) % 360; // Distribuição de cores usando número áureo
    return `hsla(${hue}, 70%, 45%, 1)`;
  };

  return (
    <div className="divide-y divide-gray-100">
      {/* Resumo Visual em Cards */}
      <div className="p-6 bg-gradient-to-br from-blue-50/70 to-indigo-50/70">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
          {/* Ocupação Total */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium uppercase text-gray-500">Ocupação Total</h3>
            <div className="flex items-end gap-2">
              <span className={cn("text-3xl font-bold", ocupacaoStyle.color)}>
                {ocupacaoTotal.toFixed(1)}%
              </span>
              <span className="text-lg font-medium text-gray-500">
                ({totais.totalGeral.horas.toFixed(1)}h de {horasPotenciais}h)
              </span>
            </div>
            
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-gray-600">Capacidade</span>
                {ocupacaoTotal > 100 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center text-red-600 font-medium">
                          <AlertCircle className="h-3.5 w-3.5 mr-1" />
                          Sobrealocação
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Utilizador com mais de 100% de alocação</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="relative h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <Progress 
                  value={Math.min(ocupacaoTotal, 100)} 
                  className={cn("h-full transition-all", ocupacaoStyle.bg)}
                />
                {ocupacaoTotal > 100 && (
                  <div className="absolute top-0 left-0 h-full w-full border-r-2 border-white" style={{ width: "100%" }}></div>
                )}
              </div>
            </div>
          </div>

          {/* Distribuição por Projeto */}
          {projetos.length > 1 && (
            <div className="space-y-3 max-w-xs">
              <h3 className="text-xs font-medium uppercase text-gray-500">Distribuição por Projeto</h3>
              <div className="flex items-center gap-1.5 h-8">
                {projetos.map((projeto, index) => {
                  const percentagemRelativa = (totais.totaisPorProjeto[projeto]?.percentagem || 0) / ocupacaoTotal * 100;
                  const cor = getProjetoColor(index);
                  return (
                    <TooltipProvider key={projeto}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="h-full rounded-sm transition-all hover:opacity-90" 
                            style={{
                              backgroundColor: cor,
                              width: `${Math.max(percentagemRelativa, 5)}%`
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <p className="font-medium">{projeto}</p>
                            <p>{totais.totaisPorProjeto[projeto]?.percentagem.toFixed(1)}% ({totais.totaisPorProjeto[projeto]?.horas.toFixed(1)}h)</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader className="bg-gray-50/50">
            <TableRow className="hover:bg-gray-50/90">
              <TableHead className="w-[45%] font-medium text-gray-600">Projeto / Work Package</TableHead>
              <TableHead className="w-[30%] font-medium text-gray-600">Alocação</TableHead>
              <TableHead className="w-[25%] text-right font-medium text-gray-600">Horas</TableHead>
            </TableRow>
          </TableHeader>

          {projetos.map((projeto, projetoIndex) => {
            const projetoAlocacoes = alocacoesAgrupadas[projeto] || [];
            const totalProjeto = totais.totaisPorProjeto[projeto] || { percentagem: 0, horas: 0 };
            const projetoCor = getProjetoColor(projetoIndex);
            const projetoOcupacaoStyle = getOcupacaoStyle(totalProjeto.percentagem);
            
            return (
              <React.Fragment key={projeto}>
                {/* Linha com o nome do projeto e total */}
                <TableBody>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-100 transition-colors">
                    <TableCell className="py-3 border-l-4" style={{ borderLeftColor: projetoCor }}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold text-gray-900">{projeto}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">
                          {totalProjeto.percentagem.toFixed(1)}%
                        </span>
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full"
                            style={{ 
                              width: `${Math.min(totalProjeto.percentagem, 100)}%`,
                              backgroundColor: projetoCor
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-gray-900">
                      <div className="flex items-center justify-end gap-2">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {totalProjeto.horas.toFixed(1)}h
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Linhas dos workpackages */}
                  {projetoAlocacoes.map((alocacao) => {
                    const horasAlocacao = (alocacao.percentagem / 100) * horasPotenciais;
                    return (
                      <TableRow key={alocacao.id} className="hover:bg-gray-50/70 transition-colors">
                        <TableCell className="py-2 pl-8 text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <ArrowRightCircle className="h-3 w-3 text-gray-400" />
                            <span>{alocacao.workpackage}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 min-w-[50px]">
                              {alocacao.percentagem.toFixed(1)}%
                            </span>
                            <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full opacity-60"
                                style={{ 
                                  width: `${Math.min(alocacao.percentagem, 100)}%`,
                                  backgroundColor: projetoCor
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          {horasAlocacao.toFixed(1)}h
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </React.Fragment>
            );
          })}

          {/* Total Geral */}
          <TableFooter>
            <TableRow className="bg-gray-800 text-white hover:bg-gray-700 transition-colors">
              <TableCell className="font-bold">TOTAL</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <span className={cn("font-bold", ocupacaoStyle.color)}>
                    {totais.totalGeral.percentagem.toFixed(1)}%
                  </span>
                  <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all", ocupacaoStyle.bg)}
                      style={{ width: `${Math.min(ocupacaoTotal, 100)}%` }}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-bold">
                {totais.totalGeral.horas.toFixed(1)}h
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}