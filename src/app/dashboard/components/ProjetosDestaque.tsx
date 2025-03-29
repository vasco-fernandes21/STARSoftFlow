"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarMoeda, formatarPercentagem, formatarData } from "@/lib/formatters";
import { ProjetoEstado } from "@prisma/client";

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
  progressoFisico: number;
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
  limit?: number;
  projetos?: Projeto[];
  isLoading?: boolean;
}

export default function ProjetosDestaque({ 
  className, 
  projetos = [], 
  isLoading = false 
}: ProjetosDestaqueProps) {
  // Estado para armazenar projeto selecionado (para possível expansão futura)
  const [selecionado] = useState<string | null>(null);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-semibold text-gray-800">
          Projetos em Destaque
        </CardTitle>
        <Link href="/projetos" className="text-sm text-azul hover:underline">
          Ver todos
        </Link>
      </CardHeader>
      <CardContent>
        <p className="mb-5 text-sm text-gray-600">
          Projetos ativos e seu progresso
        </p>
        
        {isLoading ? (
          // Esqueleto de carregamento
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : projetos && projetos.length > 0 ? (
          <div className="space-y-6">
            {projetos.map((projeto: Projeto) => (
              <div
                key={projeto.id}
                className={`rounded-xl transition-all ${
                  selecionado === projeto.id
                    ? "bg-azul/5 shadow-md"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                <div className="px-3 py-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">{projeto.nome}</h3>
                    <Link href={`/projetos/${projeto.id}`} passHref>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-azul hover:bg-azul/10 hover:text-azul-dark"
                      >
                        <span className="text-xs">Ver</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>

                  {/* Barra de progresso físico/financeiro */}
                  <div className="mb-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        Progresso físico
                      </span>
                      <span className="text-xs font-medium text-gray-700">
                        {formatarPercentagem(projeto.progressoFisico ?? 0)}
                      </span>
                    </div>
                    <Progress value={projeto.progressoFisico ?? 0} className="h-2" />
                  </div>

                  <div className="mb-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        Progresso financeiro
                      </span>
                      <span className="text-xs font-medium text-gray-700">
                        {formatarPercentagem(projeto.progressoFinanceiro ?? 0)}
                      </span>
                    </div>
                    <Progress value={projeto.progressoFinanceiro ?? 0} className="h-2" />
                  </div>

                  {/* Dados adicionais */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <div className="flex flex-col gap-1">
                      <div className="text-gray-500">
                        Orçamento:{" "}
                        <span className="font-medium text-gray-700">
                          {formatarMoeda(projeto.orcamentoTotal ?? 0)}
                        </span>
                      </div>
                      <div className="text-gray-500">
                        Gasto:{" "}
                        <span className="font-medium text-gray-700">
                          {formatarMoeda(projeto.orcamentoUtilizado ?? 0)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-gray-500">
                        Início:{" "}
                        <span className="font-medium text-gray-700">
                          {projeto.inicio ? formatarData(projeto.inicio) : "N/D"}
                        </span>
                      </div>
                      <div className="text-gray-500">
                        Fim:{" "}
                        <span className="font-medium text-gray-700">
                          {projeto.fim ? formatarData(projeto.fim) : "N/D"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Responsável pelo projeto */}
                  {projeto.responsavel && (
                    <div className="mt-3 flex items-center text-xs text-gray-500">
                      <span>Responsável: </span>
                      <span className="ml-1 font-medium text-gray-700">
                        {projeto.responsavel.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="text-gray-500">
              Não há projetos em desenvolvimento no momento.
            </p>
            <Link href="/projetos/criar" passHref>
              <Button className="mt-3 bg-azul hover:bg-azul-dark">
                Criar novo projeto
                <ExternalLink className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 