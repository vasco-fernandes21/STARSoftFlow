import React from 'react';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  ArrowUpDown,
  Percent,
  FileText,
  Calendar,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatNumber, formatCurrency, formatPercentage } from "./utils";
import type { DisplayData } from "../ProjetoFinancas";
import { api } from "@/trpc/react";
import type { Rubrica } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DropdownField } from "@/components/projetos/criar/components/FormFields";
import { Skeleton } from "@/components/ui/skeleton";

// Removemos a definição de tipo manual e usamos inferência automática do tRPC

// --- Tipos de Dados --- 
type RubricaFinanceira = { rubrica: Rubrica; estimado: number; real: number };

// Tipo unificado para a fonte de dados usada nos cálculos, seja total ou um WP
type FonteDadosComparacao = {
  recursos: { estimado: number; real: number };
  materiais: { 
    estimado: number; // totalEstimado para WPs
    real: number;     // totalReal para WPs
    rubricas: RubricaFinanceira[];
  };
  geral: { estimado: number; real: number };
};

// --- StatCard Component (moved here) ---
interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  colorClass?: string;
  subtitle?: string;
  tooltipText?: string;
}

function StatCard({
  title,
  value,
  icon,
  colorClass = "bg-blue-50",
  subtitle,
  tooltipText,
}: StatCardProps) {
  const cardContent = (
    <Card className="h-full overflow-hidden border-none shadow-sm">
      <CardContent className="flex h-full flex-col p-6">
        <div className="flex flex-grow items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
            {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div className={`rounded-full p-3 ${colorClass} flex-shrink-0`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  // Using basic title attribute for tooltip as a fallback for simplicity
  return <div title={tooltipText}>{cardContent}</div>;
}
// --- End StatCard Component ---

export interface OverviewTabProps {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  anosDisponiveis: number[];
  displayData: DisplayData;
  progressoOrcamento: number;
  posicaoValorFinanciado: number;
  baseOrcamento: number;
  selectedWorkpackageId: string | undefined;
  setSelectedWorkpackageId: (wpId: string | undefined) => void;
  workpackagesList: any[]; // Usaremos inferência automática de tipos do tRPC
  comparacaoGastos: any; // Usaremos inferência automática de tipos do tRPC
  isLoadingComparacao: boolean;
  errorComparacao: any;
  onRefreshData?: () => void; // Função opcional de callback para atualizar dados
}

// Helper para formatar nome da Rubrica
function formatRubricaName(rubrica: Rubrica): string {
  return rubrica.toString().toLowerCase().replace(/_/g, " ");
}

export function OverviewTab({
  selectedYear,
  setSelectedYear,
  anosDisponiveis,
  displayData,
  progressoOrcamento,
  posicaoValorFinanciado,
  baseOrcamento,
  selectedWorkpackageId,
  setSelectedWorkpackageId,
  workpackagesList,
  comparacaoGastos,
  isLoadingComparacao,
  errorComparacao,
  onRefreshData,
}: OverviewTabProps) {
  // Acesso ao useUtils do tRPC para operações de cache
  const utils = api.useUtils();
  
  const handleWorkpackageChange = (value: string) => {
    setSelectedWorkpackageId(value === "todos" ? undefined : value);
  };

  // --- Determinar a Fonte de Dados Selecionada (Total ou WP específico) ---
  const fonteDadosSelecionada: FonteDadosComparacao | null = React.useMemo(() => {
    if (!comparacaoGastos) return null;

    const isTotal = !selectedWorkpackageId || selectedWorkpackageId === "todos";
    
    if (isTotal) {
        // Usar os totais gerais
        return {
            recursos: comparacaoGastos.total.recursos, // { estimado, real }
            materiais: { // { estimado, real, rubricas }
                estimado: comparacaoGastos.total.materiais.estimado,
                real: comparacaoGastos.total.materiais.real,
                rubricas: comparacaoGastos.total.materiais.rubricas,
            },
            geral: comparacaoGastos.total.geral // { estimado, real }
        } as FonteDadosComparacao;
    } else {
        // Encontrar o workpackage específico
        const wpSelecionado = comparacaoGastos.workpackages.find((wp: { id: string }) => wp.id === selectedWorkpackageId);
        if (!wpSelecionado) return null;

        // Mapear dados do WP para a estrutura FonteDadosComparacao
        return {
            recursos: wpSelecionado.recursos, // { estimado, real }
            materiais: { // { totalEstimado, totalReal, rubricas }
                estimado: wpSelecionado.materiais.totalEstimado,
                real: wpSelecionado.materiais.totalReal,
                rubricas: wpSelecionado.materiais.rubricas,
            },
            // Calcular geral para o WP selecionado
            geral: { 
                estimado: wpSelecionado.recursos.estimado + wpSelecionado.materiais.totalEstimado, 
                real: wpSelecionado.recursos.real + wpSelecionado.materiais.totalReal 
            }
        } as FonteDadosComparacao;
    }
  }, [comparacaoGastos, selectedWorkpackageId]);

  // --- Processamento de Dados para Tabelas (Baseado na Fonte Selecionada) ---
  const { dadosTabelaEstimado, dadosTabelaReal } = React.useMemo(() => {
    const estimado: Array<{ categoria: string; valor: number }> = [];
    const real: Array<{ categoria: string; valor: number }> = [];

    if (fonteDadosSelecionada) {
      // Tabela Real sempre usa os dados 'real'
      real.push({
        categoria: "Recursos Humanos",
        valor: fonteDadosSelecionada.recursos.real,
      });
      fonteDadosSelecionada.materiais.rubricas.forEach((r) => {
        if (r.real > 0) {
          const nomeFormatado = formatRubricaName(r.rubrica);
          real.push({ categoria: nomeFormatado, valor: r.real });
        }
      });

      // Tabela Estimado depende da flag ETI ou dos dados 'estimado'
      if (comparacaoGastos?.estimativaBaseadaEmETI) {
        // No modo ETI, o estimado é só o valor dos recursos (Aloc * ETI)
        estimado.push({
          categoria: "Orçamento Submetido (ETI)",
          valor: fonteDadosSelecionada.recursos.estimado, // Usa o estimado de recursos da fonte
        });
        // Não adiciona materiais/rubricas estimadas no modo ETI
      } else {
        // Modo Detalhado: usa os valores estimados
        estimado.push({
          categoria: "Recursos Humanos",
          valor: fonteDadosSelecionada.recursos.estimado,
        });
        fonteDadosSelecionada.materiais.rubricas.forEach((r) => {
          if (r.estimado > 0) {
            const nomeFormatado = formatRubricaName(r.rubrica);
            estimado.push({ categoria: nomeFormatado, valor: r.estimado });
          }
        });
      }
    }

    const ordenarCategorias = (a: { categoria: string }, b: { categoria: string }) => {
      if (a.categoria === "Recursos Humanos" || a.categoria === "Orçamento Submetido (ETI)") return -1;
      if (b.categoria === "Recursos Humanos" || b.categoria === "Orçamento Submetido (ETI)") return 1;
      return a.categoria.localeCompare(b.categoria);
    };

    return {
      dadosTabelaEstimado: estimado.sort(ordenarCategorias),
      dadosTabelaReal: real.sort(ordenarCategorias),
    };
  // Depende da fonte de dados selecionada e da flag ETI
  }, [fonteDadosSelecionada, comparacaoGastos?.estimativaBaseadaEmETI]);

  // Calcular totais gerais (Estimado e Real) a partir da fonte selecionada
  const totalGeralEstimado = fonteDadosSelecionada
      ? (comparacaoGastos?.estimativaBaseadaEmETI
          ? fonteDadosSelecionada.recursos.estimado // Estimado ETI é só Recursos * ETI
          : fonteDadosSelecionada.geral.estimado) // Estimado Detalhado é Recursos + Materiais
      : 0;
  const totalGeralReal = fonteDadosSelecionada?.geral.real ?? 0;
  const percentGastoGeral = totalGeralEstimado > 0 ? (totalGeralReal / totalGeralEstimado) * 100 : 0;

  const showComparisonCard = comparacaoGastos && comparacaoGastos.estado !== 'PENDENTE';

  // Preparar opções para o DropdownField
  const workpackageDropdownOptions = React.useMemo(() => {
      const options = (workpackagesList ?? []).map(wp => ({
        value: wp.id,
        label: wp.nome,
      }));
      return [
        { value: "todos", label: "Todos os Workpackages" }, 
        ...options
      ];
  }, [workpackagesList]);

  // Função para forçar o refetch dos dados usando o utils do tRPC
  const refreshData = () => {
    // Usar o callback se disponível
    if (onRefreshData) {
      onRefreshData();
    } else if (comparacaoGastos?.projetoId) {
      // Fallback para invalidação direta
      utils.financas.getComparacaoGastos.invalidate({ projetoId: comparacaoGastos.projetoId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Year Filter */}
      <div className="flex justify-end">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="mr-2 h-4 w-4 opacity-50" />
            <SelectValue placeholder="Filtrar por ano..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Anos</SelectItem>
            {anosDisponiveis.map((ano: number) => (
              <SelectItem key={ano} value={ano.toString()}>
                {ano}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* NOVA Seção - Cards de Orçamento e Financiamento */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2">
        {/* Card Orçamento Submetido e Valor Financiado */}
        <div className="flex items-center">
          <Card className="h-full w-full border-none shadow-sm">
            <CardContent className="flex h-full flex-col p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Lado Esquerdo - Orçamento Submetido */}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-500">Orçamento Submetido</h3>
                    <div className="rounded-full bg-blue-50 p-2">
                      <Wallet className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{formatCurrency(displayData.orcamentoSubmetido)}</div>
                  <p className="mt-1 text-xs text-gray-500">Taxa: {formatPercentage(displayData.taxaFinanciamento)}</p>
                </div>
                
                {/* Lado Direito - Valor Financiado */}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-500">Valor Financiado</h3>
                    <div className="rounded-full bg-green-50 p-2">
                      <ArrowUpDown className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-primary">{formatCurrency(displayData.valorFinanciado)}</div>
                  <p className="mt-1 text-xs text-gray-500">{formatPercentage(displayData.taxaFinanciamento)} do submetido</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Card Orçamento Real e Valor Financiado */}
        <div className="flex items-center">
          <Card className="h-full w-full border-none shadow-sm">
            <CardContent className="flex h-full flex-col p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Lado Esquerdo - Orçamento Real */}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-500">Orçamento Real</h3>
                    <div className="rounded-full bg-blue-50 p-2">
                      <DollarSign className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{formatCurrency(displayData.custosReais.total)}</div>
                  <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                    <p>Recursos: {formatCurrency(displayData.custosReais.recursos)}</p>
                    <p>Materiais: {formatCurrency(displayData.custosReais.materiais)}</p>
                  </div>
                </div>
                
                {/* Lado Direito - Valor Financiado */}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-500">Valor Financiado</h3>
                    <div className="rounded-full bg-green-50 p-2">
                      <ArrowUpDown className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-primary">
                    {formatCurrency(
                      displayData.custosReais.total && displayData.taxaFinanciamento
                        ? displayData.custosReais.total * displayData.taxaFinanciamento
                        : 0
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{formatPercentage(displayData.taxaFinanciamento)} do real</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stat Cards EXISTENTES (Segunda linha) - SEM ALTERAÇÕES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <StatCard
          title="Resultado Financeiro"
          value={
            <span className={(displayData.resultado ?? 0) >= 0 ? "text-green-600" : "text-red-600"}>
              {formatCurrency(displayData.resultado)}
            </span>
          }
          icon={
            <TrendingUp
              className={`h-6 w-6 ${(displayData.resultado ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}
            />
          }
          colorClass={(displayData.resultado ?? 0) >= 0 ? "bg-green-50" : "bg-red-50"}
          tooltipText="(Valor Financiado - Custos Reais) + Overhead."
        />
        <StatCard
          title="Margem"
          value={
            <span className={(displayData.margem ?? 0) >= 0 ? "text-green-600" : "text-red-600"}>
              {formatPercentage(displayData.margem)}
            </span>
          }
          icon={
            <Percent
              className={`h-6 w-6 ${(displayData.margem ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}
            />
          }
          colorClass={(displayData.margem ?? 0) >= 0 ? "bg-green-50" : "bg-red-50"}
          tooltipText="(Resultado Financeiro / Orçamento Submetido) * 100."
        />
        <StatCard
          title="VAB / Custos Pessoal"
          value={formatNumber(displayData.vabCustosPessoal)}
          subtitle={`VAB: ${formatCurrency(displayData.vab)}`}
          icon={<FileText className="h-6 w-6 text-indigo-600" />}
          colorClass="bg-indigo-50"
          tooltipText="Valor Acrescentado Bruto (VAB = Valor Financiado - Custos Materiais) a dividir pelos Custos com Pessoal."
        />
      </div>

      {/* Progress Card */}
      <Card className="overflow-hidden border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">
            Progresso Financeiro {selectedYear !== "todos" ? `(${selectedYear})` : "(Total)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Progresso</span>
              <span>
                {formatCurrency(displayData.custosConcluidos.total)}
                {(displayData.custosReais.total ?? 0) > 0 &&
                  ` / ${formatCurrency(displayData.custosReais.total)}`}
              </span>
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Progress value={progressoOrcamento} className="h-3 w-full bg-gray-100" />
                {/* Indicador do valor financiado */}
                {posicaoValorFinanciado > 0 && posicaoValorFinanciado < 100 && (
                  <div
                    className="absolute top-0 h-5 w-0.5 bg-green-600"
                    style={{
                      left: `${posicaoValorFinanciado}%`,
                      transform: "translateX(-50%)",
                    }}
                    title={`Valor Financiado: ${formatCurrency(displayData.valorFinanciado)}`}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 transform whitespace-nowrap text-xs text-green-700">
                      Financiado
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>50%</span>
                <span>100% ({formatCurrency(baseOrcamento)})</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-xs font-medium text-blue-800">Custos com Recursos</p>
                <p className="text-lg font-semibold text-blue-900">
                  {formatCurrency(displayData.custosConcluidos.recursos)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-100 p-4">
                <p className="text-xs font-medium text-gray-700">Custos com Materiais</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(displayData.custosConcluidos.materiais)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de Comparação - Renderização Condicional e Estilo Refinado */} 
      {showComparisonCard && (
         <Card className="overflow-hidden border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-medium">Comparação Estimado vs. Real</CardTitle>
              <DropdownField
                 id="workpackage-filter"
                 label=""
                 value={selectedWorkpackageId ?? "todos"} 
                 onChange={handleWorkpackageChange}
                 options={workpackageDropdownOptions}
                 placeholder="Filtrar por Workpackage..."
                 triggerClassName="w-[250px] bg-white/90 h-9 text-sm"
              />
            </CardHeader>
            <CardContent>
              {isLoadingComparacao && (
                <div className="space-y-4 pt-2">
                    <div className="space-y-2 border-b pb-4">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-4 w-1/4" />
                        </div>
                         <Skeleton className="h-2 w-full" />
                         <div className="flex justify-end">
                             <Skeleton className="h-3 w-1/6" />
                         </div>
                    </div>
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-1/2 mx-auto" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-6 w-full" />
                        </div>
                         <div className="space-y-2">
                            <Skeleton className="h-5 w-1/2 mx-auto" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-6 w-full" />
                        </div>
                    </div>
                </div>
              )}
              {errorComparacao && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-center">
                   <p className="text-sm font-medium text-red-700">Erro ao carregar dados de comparação:</p>
                   <p className="text-xs text-red-600">{errorComparacao.message}</p>
                </div>
              )}
              {!isLoadingComparacao && !errorComparacao && comparacaoGastos && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2 border-b pb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Gasto Real vs. {comparacaoGastos.estimativaBaseadaEmETI ? 'Submetido (ETI)' : 'Estimado'} {selectedWorkpackageId !== 'todos' && selectedWorkpackageId ? '(WP Selecionado)' : '(Geral)'}</span>
                        <span className="font-medium">
                          {formatCurrency(totalGeralReal)} /
                          <span className="text-gray-500"> {formatCurrency(totalGeralEstimado)}</span>
                        </span>
                      </div>
                      <Progress value={percentGastoGeral} className="h-2" />
                      <div className="flex justify-end text-xs font-medium">
                        {formatPercentage(percentGastoGeral / 100, 0)}
                      </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h3 className="text-center text-sm font-medium text-gray-600">
                         {comparacaoGastos.estimativaBaseadaEmETI ? 'Orçamento Submetido' : 'Custos Estimados'}
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="h-auto px-3 py-2 text-xs uppercase text-gray-500">{comparacaoGastos.estimativaBaseadaEmETI ? 'Base' : 'Categoria'}</TableHead>
                            <TableHead className="h-auto px-3 py-2 text-right text-xs uppercase text-gray-500">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dadosTabelaEstimado.map((item) => (
                            <TableRow key={`est-${item.categoria}`} className="border-gray-100 hover:bg-gray-50/50">
                              <TableCell className={`px-3 py-2 text-sm capitalize ${item.categoria === 'Recursos Humanos' || item.categoria === 'Orçamento Submetido (ETI)' ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                                {item.categoria}
                              </TableCell>
                              <TableCell className={`px-3 py-2 text-right text-sm ${item.categoria === 'Recursos Humanos' || item.categoria === 'Orçamento Submetido (ETI)' ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                                {formatCurrency(item.valor)}
                              </TableCell>
                            </TableRow>
                          ))}
                           {dadosTabelaEstimado.length === 0 && (
                              <TableRow className="border-gray-100">
                                <TableCell colSpan={2} className="px-3 py-4 text-center text-sm text-gray-400 italic">Sem dados estimados.</TableCell>
                              </TableRow>
                           )}
                        </TableBody>
                        <tfoot>
                          <TableRow className="border-t bg-gray-50 hover:bg-gray-100/60">
                              <TableCell className="px-3 py-2 text-sm font-semibold text-gray-700">
                                {comparacaoGastos.estimativaBaseadaEmETI ? 'Total Submetido (ETI)' : 'Total Geral Estimado'}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-right text-sm font-bold text-gray-800">
                                 {formatCurrency(totalGeralEstimado)}
                              </TableCell>
                          </TableRow>
                        </tfoot>
                      </Table>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-center text-sm font-medium text-gray-600">Custos Reais</h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="h-auto px-3 py-2 text-xs uppercase text-gray-500">Categoria</TableHead>
                            <TableHead className="h-auto px-3 py-2 text-right text-xs uppercase text-gray-500">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dadosTabelaReal.map((item) => (
                            <TableRow key={`real-${item.categoria}`} className="border-gray-100 hover:bg-gray-50/50">
                              <TableCell className={`px-3 py-2 text-sm capitalize ${item.categoria === 'Recursos Humanos' ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                                {item.categoria}
                              </TableCell>
                              <TableCell className={`px-3 py-2 text-right text-sm ${item.categoria === 'Recursos Humanos' ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                                {formatCurrency(item.valor)}
                              </TableCell>
                            </TableRow>
                          ))}
                           {dadosTabelaReal.length === 0 && (
                              <TableRow className="border-gray-100">
                                <TableCell colSpan={2} className="px-3 py-4 text-center text-sm text-gray-400 italic">Sem custos reais.</TableCell>
                              </TableRow>
                           )}
                        </TableBody>
                        <tfoot>
                           <TableRow className="border-t bg-gray-50 hover:bg-gray-100/60">
                              <TableCell className="px-3 py-2 text-sm font-semibold text-gray-700">Total Geral Real</TableCell>
                              <TableCell className="px-3 py-2 text-right text-sm font-bold text-gray-800">
                                 {formatCurrency(totalGeralReal)}
                              </TableCell>
                           </TableRow>
                        </tfoot>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
      )}
    </div>
  );
}