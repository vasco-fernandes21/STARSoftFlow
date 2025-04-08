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
import { Briefcase, ArrowRightCircle } from "lucide-react";

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

  // Converter a percentagem para horas
  const calcularHoras = (percentagem: number) => {
    return (percentagem / 100) * horasPotenciais;
  };

  // Calcular a ocupação total em percentagem
  const ocupacaoTotal = totais.totalGeral.percentagem;
  const ocupacaoClass = ocupacaoTotal > 100 
    ? "text-red-600" 
    : ocupacaoTotal > 90 
      ? "text-amber-600" 
      : "text-green-600";

  return (
    <div className="divide-y divide-gray-100">
      {/* Resumo Visual em Cards */}
      <div className="px-6 py-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
        <div className="mb-4">
          <h3 className="text-xs font-medium uppercase text-gray-500 mb-2">Ocupação Total</h3>
          <div className="flex items-end gap-2">
            <span className={cn("text-2xl font-bold", ocupacaoClass)}>
              {ocupacaoTotal.toFixed(1)}%
            </span>
            <span className="text-lg font-medium text-gray-500">
              ({totais.totalGeral.horas.toFixed(1)}h de {horasPotenciais}h)
            </span>
          </div>
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

          {projetos.map((projeto) => {
            const projetoAlocacoes = alocacoesAgrupadas[projeto] || [];
            const totalProjeto = totais.totaisPorProjeto[projeto] || { percentagem: 0, horas: 0 };
            
            return (
              <React.Fragment key={projeto}>
                {/* Linha com o nome do projeto e total */}
                <TableBody>
                  <TableRow className="bg-gray-50/80 font-medium">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{projeto}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-gray-700">
                        {totalProjeto.percentagem.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-gray-900">
                      {totalProjeto.horas.toFixed(1)}h
                    </TableCell>
                  </TableRow>

                  {/* Linhas dos workpackages */}
                  {projetoAlocacoes.map((alocacao) => {
                    const horasAlocacao = calcularHoras(alocacao.percentagem);
                    return (
                      <TableRow key={alocacao.id} className="hover:bg-gray-50/50">
                        <TableCell className="py-2 pl-8 text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <ArrowRightCircle className="h-3 w-3 text-gray-400" />
                            <span>{alocacao.workpackage}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {alocacao.percentagem.toFixed(1)}%
                          </span>
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
            <TableRow className="bg-gray-800 text-white hover:bg-gray-700">
              <TableCell className="font-bold">TOTAL</TableCell>
              <TableCell>
                <span className={cn("font-bold", ocupacaoClass)}>
                  {totais.totalGeral.percentagem.toFixed(1)}%
                </span>
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