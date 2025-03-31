"use client";

// Componente que exibe uma visão geral financeira dos projetos

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine
} from "recharts";
import { 
  DollarSign, TrendingUp, Wallet, ChevronRight, ChevronDown,
  Package, Users, ChartBar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { type Rubrica } from "@prisma/client";

// Definição de tipos para representar a resposta da API
interface DetalheRecurso {
  userId: string;
  userName: string | null;
  salario: number;
  alocacao: number;
  custoAjustado: number;
  detalhesCalculo: {
    salarioBase: number;
    salarioAjustado: number;
    alocacao: number;
    formulaUsada: string;
  };
}

interface DetalheMaterial {
  id: number;
  nome: string;
  preco: number;
  quantidade: number;
  custoTotal: number;
  workpackage: {
    id: string;
    nome: string;
  };
  ano_utilizacao: number;
  estado: boolean;
}

interface DetalhesRubrica {
  rubrica: Rubrica;
  total: number;
  materiais: DetalheMaterial[];
}

interface DetalheAnual {
  ano: number;
  orcamento: {
    submetido: number;
    real: {
      recursos: number;
      materiais: number;
      total: number;
      detalhesRecursos: Array<{
        userId: string;
        userName: string | null;
        salario: number;
        alocacao: number;
        custoAjustado: number;
      }>;
    };
  };
  custosConcluidos: {
    recursos: number;
    materiais: number;
    total: number;
  };
  alocacoes: number;
  valorFinanciado: number;
  overhead: number;
  resultado: number;
  folga: number;
  vab: number;
  margem: number;
  vabCustosPessoal: number;
}

interface ProjetoFinancasData {
  orcamentoSubmetido: number;
  taxaFinanciamento: number;
  valorFinanciado: number;
  custosReais: {
    recursos: number;
    materiais: number;
    total: number;
    detalhesRecursos: DetalheRecurso[];
    detalhesMateriais: DetalhesRubrica[];
  };
  custosConcluidos: {
    recursos: number;
    materiais: number;
    total: number;
  };
  overhead: number;
  resultado: number;
  folga: number;
  vab: number;
  margem: number;
  vabCustosPessoal: number;
  anos?: number[];
  detalhesAnuais?: Array<{
    ano: number;
    orcamento: {
      submetido: number;
      real: {
        recursos: number;
        materiais: number;
        total: number;
        detalhesRecursos: DetalheRecurso[];
        detalhesMateriais: DetalhesRubrica[];
      };
    };
    custosConcluidos: {
      recursos: number;
      materiais: number;
      total: number;
    };
    alocacoes: number;
    valorFinanciado: number;
    overhead: number;
    resultado: number;
    folga: number;
    vab: number;
    margem: number;
    vabCustosPessoal: number;
  }>;
}

interface ProjetoFinanceiroItem {
  id: string;
  nome: string;
  estado: string;
  responsavel: {
    id: string;
    name: string | null;
  } | null;
  progresso: number;
  financas: ProjetoFinancasData;
}

interface TotaisConsolidados {
  totalProjetosConsultados: number;
  projetosComFinancas: number;
  orcamentoTotalSubmetido: number;
  valorTotalFinanciado: number;
  custosReaisTotal: number;
  custosConcluidosTotal: number;
  overheadTotal: number;
  resultadoTotal: number;
  folgaTotal: number;
}

interface ProjetosClassificados {
  saudaveis: number;
  emRisco: number;
  criticos: number;
  comResultadoPositivo: number;
  comResultadoNegativo: number;
}

interface VisaoGeralFinanceira {
  meta: {
    tipo: "visao_geral";
    filtroAno: number | null;
    apenasAtivos: boolean;
    incluiDetalhes: boolean;
  };
  projetos: ProjetoFinanceiroItem[];
  totaisConsolidados: TotaisConsolidados;
  projetosClassificados: ProjetosClassificados;
  taxaMediaFinanciamento: number;
  margemMedia: number;
  progressoFinanceiroMedio: number;
  progressoFisicoMedio: number;
  detalhesAnuais?: Array<DetalheAnual>;
}

// Helpers for formatting
const formatPercentage = (value: number | undefined | null, fractionDigits = 1): string => {
  if (typeof value !== 'number' || isNaN(value)) return "-";
  const percentValue = Math.abs(value) > 1 ? value / 100 : value;
  return percentValue.toLocaleString("pt-PT", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
};

// Status Badge Component
interface StatusBadgeProps {
  orcamento: number | null | undefined;
  custosReais: number | null | undefined;
}

function StatusBadge({ orcamento, custosReais }: StatusBadgeProps) {
  if (typeof orcamento !== 'number' || typeof custosReais !== 'number' || 
      isNaN(orcamento) || isNaN(custosReais) || orcamento <= 0) {
    return <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0.5 bg-slate-100 text-slate-500 hover:bg-slate-200 border-none">N/A</Badge>;
  }
  
  const ratio = (custosReais / orcamento) * 100;
  
  if (ratio < 70) 
    return <Badge variant="default" className="text-xs font-normal px-1.5 py-0.5 bg-slate-100 text-emerald-700 hover:bg-emerald-50 border-none">Saudável</Badge>;
  if (ratio < 90) 
    return <Badge variant="warning" className="text-xs font-normal px-1.5 py-0.5 bg-slate-100 text-amber-700 hover:bg-amber-50 border-none">Risco</Badge>;
  if (ratio < 100) 
    return <Badge variant="orange" className="text-xs font-normal px-1.5 py-0.5 bg-slate-100 text-orange-700 hover:bg-orange-50 border-none">Alerta</Badge>;
  
  return <Badge variant="destructive" className="text-xs font-normal px-1.5 py-0.5 bg-slate-100 text-red-700 hover:bg-red-50 border-none">Crítico</Badge>;
}

interface ProjetosFinancasOverviewProps {
  className?: string;
}

// Helper function to get badge variant based on project status
function getStatusVariant(estado: string): "default" | "warning" | "destructive" | "outline" {
  switch (estado.toLowerCase()) {
    case "em execução":
      return "default";
    case "risco":
      return "warning";
    case "crítico":
      return "destructive";
    default:
      return "outline";
  }
}

export function ProjetosFinancasOverview({ className }: ProjetosFinancasOverviewProps) {
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const { data, isLoading } = api.financas.getTotaisFinanceiros.useQuery({
    apenasAtivos: true,
    incluirDetalhesPorAno: true,
    ano: undefined
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 rounded-full border-2 border-t-transparent border-azul animate-spin" />
          <span className="text-sm text-slate-500">Carregando dados financeiros...</span>
        </div>
      </div>
    );
  }

  const visaoGeral = data as VisaoGeralFinanceira;
  const { projetos, totaisConsolidados: totais, projetosClassificados } = visaoGeral;

  // Função para filtrar projetos
  const filteredProjetos = projetos
    .filter(projeto => {
      // Filtro por termo de pesquisa (nome do projeto)
      const matchesSearch = searchTerm === "" || 
        projeto.nome.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro por status
      const matchesStatus = statusFilter === "todos" || 
        projeto.estado.toLowerCase() === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });

  return (
    <div className={cn("space-y-6", className)}>
      {/* Cabeçalho com filtros e estatísticas */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">Gestão Financeira de Projetos</h2>
          
          {/* Filtros e pesquisa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {/* Pesquisa */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="w-full pl-10 h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-azul"
                placeholder="Pesquisar projetos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro por status */}
              <div>
              <select
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-azul"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="todos">Todos os Estados</option>
                <option value="aprovado">Aprovado</option>
                <option value="em execução">Em Execução</option>
                <option value="risco">Em Risco</option>
                <option value="crítico">Crítico</option>
              </select>
            </div>
            
            {/* Botão para ver todos */}
            <div className="flex justify-end">
        <Button
          variant="outline"
                size="default"
                className="h-10 px-4 text-sm border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          asChild
        >
          <Link href="/projetos">
                  Ver Detalhes dos Projetos
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </Button>
            </div>
      </div>

          {/* Estatísticas rápidas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
              <div className="text-xs text-slate-500 mb-1">Total de Projetos</div>
              <div className="font-medium text-slate-900">{filteredProjetos.length}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
              <div className="text-xs text-slate-500 mb-1">Projetos Saudáveis</div>
              <div className="font-medium text-emerald-600">{projetosClassificados.saudaveis}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
              <div className="text-xs text-slate-500 mb-1">Projetos em Risco</div>
              <div className="font-medium text-amber-600">{projetosClassificados.emRisco}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
              <div className="text-xs text-slate-500 mb-1">Projetos Críticos</div>
              <div className="font-medium text-red-600">{projetosClassificados.criticos}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Projetos */}
          <div className="space-y-4">
        {filteredProjetos.length > 0 ? (
          filteredProjetos.map((projeto) => {
            // Calcular progresso físico e financeiro
            const progressoFisico = projeto.progresso;
            
            // Corrigir o cálculo do progresso financeiro/orçamental usando custosConcluidos
            // Essa é a forma correta que leva em conta apenas alocações passadas e materiais já comprados
            const baseOrcamento = projeto.financas.custosReais.total;
            const progressoFinanceiro = baseOrcamento > 0 
              ? (projeto.financas.custosConcluidos.total / baseOrcamento) * 100 
              : 0;

            // Obter a cor para o progresso financeiro
            const getProgressoFinanceiroColor = (progress: number) => {
              if (progress > 95) return "bg-red-500";
              if (progress > 80) return "bg-amber-500";
              if (progress > 70) return "bg-amber-400";
              return "bg-blue-500";
            };

            // Obter informações sobre folga do projeto
            const primeiroAnoOverhead = projeto.financas.detalhesAnuais?.find(
              d => d.ano === Math.min(...(projeto.financas.detalhesAnuais?.map(d => d.ano) ?? []))
            )?.overhead ?? 0;
            
            // Calcular folga excluindo o overhead do primeiro ano
            const folgaTotal = projeto.financas.orcamentoSubmetido - projeto.financas.custosReais.total + 
              (projeto.financas.overhead - primeiroAnoOverhead);
            
            // Calcular a soma do resultado e folga
            const resultadoMaisFolga = projeto.financas.resultado + folgaTotal;

              return (
              <div key={projeto.id} className="overflow-hidden rounded-lg bg-white border border-slate-100 shadow-sm hover:shadow transition-all group">
                {/* Cabeçalho do projeto */}
                <div 
                  className="p-4 flex items-start justify-between gap-4 border-b border-slate-100 cursor-pointer"
                  onClick={() => setExpandedProjectId(expandedProjectId === projeto.id ? null : projeto.id)}
                >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-azul transition-colors">
                          {projeto.nome}
                        </h3>
                        <Badge 
                          variant={getStatusVariant(projeto.estado)} 
                          className="text-xs font-normal px-1.5 py-0.5"
                        >
                          {projeto.estado}
                        </Badge>
                      </div>
                      
                    <div className="grid grid-cols-2 gap-y-2 gap-x-6 mt-3">
                      {/* Progresso Físico */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-500">Progresso Físico</span>
                          <span className="text-xs font-medium text-slate-700">{progressoFisico.toFixed(1)}%</span>
                        </div>
                        <div className="bg-slate-100 h-1.5 w-full rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${progressoFisico}%` }}
                          />
                      </div>
                    </div>

                      {/* Progresso Financeiro */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-500">Execução Orçamental Realizada</span>
                          <span className="text-xs font-medium text-slate-700">{progressoFinanceiro.toFixed(1)}%</span>
                        </div>
                        <div className="bg-slate-100 h-1.5 w-full rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", getProgressoFinanceiroColor(progressoFinanceiro))}
                            style={{ width: `${Math.min(progressoFinanceiro, 100)}%` }}
                          />
                        </div>
                      </div>
                          </div>
                        </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      {/* Responsável */}
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Users className="h-4 w-4" />
                        <span className="truncate max-w-[150px]">
                          {projeto.responsavel?.name || "Sem responsável"}
                        </span>
                      </div>

                      {/* Botão de expandir/fechar */}
                        <Button
                          variant="ghost"
                          size="icon"
                        className="shrink-0 text-slate-400 hover:text-slate-600 h-7 w-7"
                        >
                          {expandedProjectId === projeto.id ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    
                    {/* Status badge */}
                      <StatusBadge 
                        orcamento={projeto.financas.orcamentoSubmetido} 
                        custosReais={projeto.financas.custosReais.total} 
                      />
                    </div>
                  </div>

                {/* Informações financeiras */}
                <div className="p-4 grid grid-cols-4 gap-4 bg-slate-50/50">
                  {/* Despesas */}
                  <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                    <div className="text-xs text-slate-500 mb-1">Despesas</div>
                    <div className="font-medium text-slate-900">{formatCurrency(projeto.financas.custosReais.total)}</div>
                  </div>
                  
                  {/* Receitas */}
                  <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                    <div className="text-xs text-slate-500 mb-1">Receitas</div>
                    <div className={cn(
                      "font-medium",
                      resultadoMaisFolga >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {formatCurrency(resultadoMaisFolga)}
                    </div>
                  </div>
                  
                  {/* Custo RH */}
                  <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                    <div className="text-xs text-slate-500 mb-1">Custo RH</div>
                    <div className="font-medium text-slate-900">{formatCurrency(projeto.financas.custosReais.recursos)}</div>
                  </div>
                  
                  {/* Outros Custos */}
                  <div className="bg-white p-3 rounded-md border border-slate-100 shadow-sm">
                    <div className="text-xs text-slate-500 mb-1">Outros Custos</div>
                    <div className="font-medium text-slate-900">{formatCurrency(projeto.financas.custosReais.materiais)}</div>
                  </div>
                </div>

                {/* Detalhes (expandidos) */}
                  {expandedProjectId === projeto.id && (
                  <div className="border-t border-slate-100">
                    {/* Detalhes Anuais */}
                    <div className="p-4">
                        <h4 className="text-sm font-medium text-slate-700 mb-3">Detalhes por Ano</h4>
                        <div className="overflow-x-auto">
                        <Table className="w-full">
                            <TableHeader>
                            <TableRow className="bg-slate-50/80">
                                <TableHead>Ano</TableHead>
                                <TableHead className="text-right">Orçamento</TableHead>
                                <TableHead className="text-right">Custos Reais</TableHead>
                                <TableHead className="text-right">Valor Financiado</TableHead>
                                <TableHead className="text-right">Overhead</TableHead>
                                <TableHead className="text-right">Resultado</TableHead>
                                <TableHead className="text-right">Margem</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                            {projeto.financas.detalhesAnuais?.length ? (
                              projeto.financas.detalhesAnuais
                                  .sort((a, b) => b.ano - a.ano)
                                .map((detalhe) => (
                                  <TableRow key={`${projeto.id}-${detalhe.ano}`} className="hover:bg-slate-50">
                                    <TableCell className="font-medium">{detalhe.ano}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(detalhe.orcamento.submetido)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(detalhe.orcamento.real.total)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(detalhe.valorFinanciado)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(detalhe.overhead)}</TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn(
                                          "font-medium",
                                        detalhe.resultado > 0 ? "text-emerald-600" : "text-red-600"
                                        )}>
                                          {formatCurrency(detalhe.resultado)}
                                        </span>
                                      </TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn(
                                          "font-medium",
                                        detalhe.margem > 0 ? "text-emerald-600" : "text-red-600"
                                        )}>
                                        {formatPercentage(detalhe.margem / 100)}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))
                              ) : (
                                <TableRow>
                                <TableCell colSpan={7} className="text-center text-slate-500 py-4">
                                  Nenhum detalhe anual disponível
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                    {/* Recursos */}
                      {projeto.financas.custosReais.detalhesRecursos?.length > 0 && (
                      <div className="p-4 border-t border-slate-100 bg-slate-50/30">
                          <h4 className="text-sm font-medium text-slate-700 mb-3">Custos com Recursos</h4>
                          <div className="overflow-x-auto">
                          <Table className="w-full">
                              <TableHeader>
                              <TableRow className="bg-slate-50/80">
                                  <TableHead>Recurso</TableHead>
                                  <TableHead className="text-right">Alocação Total</TableHead>
                                  <TableHead className="text-right">Custo Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Object.values(
                                  (projeto.financas.custosReais.detalhesRecursos || [])
                                    .reduce<Record<string, {
                                      userId: string;
                                      userName: string | null;
                                      alocacaoTotal: number;
                                      custoTotal: number;
                                  }>>((acc, recurso) => {
                                      const key = recurso.userId;
                                      if (!acc[key]) {
                                        acc[key] = {
                                          userId: recurso.userId,
                                          userName: recurso.userName,
                                          alocacaoTotal: 0,
                                          custoTotal: 0
                                        };
                                      }
                                      acc[key].alocacaoTotal += recurso.alocacao;
                                      acc[key].custoTotal += recurso.custoAjustado;
                                      return acc;
                                    }, {})
                                ).map((recurso) => (
                                <TableRow key={recurso.userId} className="hover:bg-slate-50">
                                    <TableCell>{recurso.userName || "Sem nome"}</TableCell>
                                    <TableCell className="text-right">{formatPercentage(recurso.alocacaoTotal)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(recurso.custoTotal)}</TableCell>
                                  </TableRow>
                                ))}
                                {/* Linha de total */}
                              <TableRow className="border-t-2 border-slate-200 bg-slate-50/50 hover:bg-slate-50">
                                  <TableCell className="font-medium">Total</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatPercentage(
                                      (projeto.financas.custosReais.detalhesRecursos || [])
                                        .reduce((total, recurso) => total + recurso.alocacao, 0)
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(
                                      (projeto.financas.custosReais.detalhesRecursos || [])
                                        .reduce((total, recurso) => total + recurso.custoAjustado, 0)
                                    )}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                    {/* Outros Custos */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50/30">
                        <h4 className="text-sm font-medium text-slate-700 mb-3">Outros Custos</h4>
                        <div className="overflow-x-auto">
                        <Table className="w-full">
                            <TableHeader>
                            <TableRow className="bg-slate-50/80">
                                <TableHead>Rubrica</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Nº Materiais</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projeto.financas.custosReais.detalhesMateriais?.map((detalhe) => (
                              <TableRow key={detalhe.rubrica} className="hover:bg-slate-50">
                                  <TableCell>
                                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                      {detalhe.rubrica.replace(/_/g, ' ').toLowerCase()}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(detalhe.total)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {detalhe.materiais.length}
                                  </TableCell>
                                </TableRow>
                              ))}
                            <TableRow className="border-t-2 border-slate-200 bg-slate-50/50 hover:bg-slate-50">
                                <TableCell className="font-medium">Total</TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(projeto.financas.custosReais.materiais)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {projeto.financas.custosReais.detalhesMateriais?.reduce(
                                    (total, rubrica) => total + rubrica.materiais.length, 
                                    0
                                  ) ?? 0}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
          })
        ) : (
          <div className="bg-white p-8 rounded-lg border border-slate-200 text-center">
            <div className="text-slate-500 mb-2">Nenhum projeto encontrado</div>
            <p className="text-sm text-slate-400">Tente ajustar os filtros para ver mais resultados</p>
          </div>
        )}
      </div>
    </div>
  );
} 