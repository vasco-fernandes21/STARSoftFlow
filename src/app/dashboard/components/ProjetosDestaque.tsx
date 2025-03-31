"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarPercentagem, formatarMoeda, formatarData } from "@/lib/formatters";
import type { ProjetoEstado } from "@prisma/client";

/**
 * Interface para o tipo de projeto retornado pela API
 */
interface Projeto {
  id: string;
  nome: string;
  descricao: string | null;
  inicio: Date | null;
  fim: Date | null;
  estado: ProjetoEstado;
  progresso: number;
  progressoFinanceiro: number;
  orcamentoTotal: number;
  orcamentoUtilizado: number;
  responsavel?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

/**
 * Componente que exibe os projetos em destaque no dashboard
 * Mostra informações resumidas e permite navegação rápida
 */
export interface ProjetosDestaqueProps {
  className?: string;
  projetos?: Projeto[];
  isLoading?: boolean;
  title?: boolean;
}

export default function ProjetosDestaque({ 
  className, 
  projetos = [], 
  isLoading = false,
  title = true 
}: ProjetosDestaqueProps) {
  // Paginação para os projetos
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 3;
  
  // Cálculos para paginação
  const totalPages = Math.ceil(projetos.length / itemsPerPage);
  const currentProjetos = projetos.slice(
    currentPage * itemsPerPage, 
    (currentPage + 1) * itemsPerPage
  );

  // Handlers para paginação
  const prevPage = () => setCurrentPage(prev => Math.max(0, prev - 1));
  const nextPage = () => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));

  // Determina a cor do progresso baseado no valor
  const getProgressColor = (value: number) => {
    if (value < 25) return "bg-red-500";
    if (value < 50) return "bg-amber-500";
    if (value < 75) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
    <div className={`${className || ''} h-full flex flex-col`}>
      {title && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-800">Projetos em Destaque</h2>
          <p className="text-xs text-slate-500">Projetos ativos e seu progresso</p>
        </div>
      )}

      {/* Lista de projetos */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          // Esqueleto de carregamento
          <div className="space-y-4">
            {Array.from({ length: itemsPerPage }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : projetos && projetos.length > 0 ? (
          // Lista de projetos
          <div className="space-y-4">
            {currentProjetos.map((projeto) => (
              <Link 
                key={projeto.id} 
                href={`/projetos/${projeto.id}`}
                className="block"
              >
                <div className="rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50/70 cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm text-slate-800 truncate mr-2">
                      {projeto.nome}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                      <Calendar className="h-3 w-3" />
                      <span>{projeto.inicio ? formatarData(projeto.inicio) : "N/D"}</span>
                      <span>-</span>
                      <span>{projeto.fim ? formatarData(projeto.fim) : "N/D"}</span>
                    </div>
                  </div>
                  
                  {/* Barras de progresso */}
                  <div className="space-y-2 mb-1">
                    {/* Progresso físico */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-blue-500" />
                          Progresso
                        </span>
                        <span className="text-xs font-medium text-slate-700">
                          {formatarPercentagem(projeto.progresso)}
                        </span>
                      </div>
                      <Progress 
                        value={projeto.progresso} 
                        className="h-1.5" 
                        indicatorClassName={getProgressColor(projeto.progresso)}
                      />
                    </div>
                    
                    {/* Progresso financeiro */}
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-emerald-500" />
                          Financeiro
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-slate-700">
                            {formatarPercentagem(projeto.progressoFinanceiro)}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({formatarMoeda(projeto.orcamentoTotal)})
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={projeto.progressoFinanceiro} 
                        className="h-1.5"
                        indicatorClassName={getProgressColor(projeto.progressoFinanceiro)}
                      />
                      <div className="flex justify-end mt-0.5">
                        <span className="text-xs text-slate-500">
                          {formatarMoeda(projeto.orcamentoUtilizado)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          // Mensagem para quando não há projetos
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center h-full flex items-center justify-center">
            <p className="text-sm text-gray-500">
              Não há projetos em desenvolvimento
            </p>
          </div>
        )}
      </div>

      {/* Controles de paginação */}
      {projetos.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-6 w-6 rounded-full border-slate-200" 
              onClick={prevPage}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs text-slate-500">
              {currentPage + 1}/{totalPages}
            </span>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-6 w-6 rounded-full border-slate-200" 
              onClick={nextPage}
              disabled={currentPage === totalPages - 1}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          <Link href="/projetos" className="text-xs text-azul hover:underline">
            Ver todos
          </Link>
        </div>
      )}
    </div>
  );
}

// Componente de esqueleto para carregamento
function CardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-24" />
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between mb-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-1.5 w-full" />
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-1.5 w-full" />
          <div className="flex justify-end mt-0.5">
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
} 