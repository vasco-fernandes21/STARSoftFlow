import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  X, 
  TrendingUp, 
  Package, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  ChevronLeft,
  ChevronRight 
} from "lucide-react";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MESES = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export function AdminDespesas() {
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual.toString());
  const [activeTab, setActiveTab] = useState("alocacoes");
  const utils = api.useUtils();

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);

  // Prefetch data
  useEffect(() => {
    void utils.admin.getDespesas.prefetch({
      ano: anoAtual,
      mes: parseInt(mesSelecionado)
    });
  }, [utils, mesSelecionado]);

  const { data: despesasData, isLoading } = api.admin.getDespesas.useQuery({
    ano: anoAtual,
    mes: parseInt(mesSelecionado)
  }, {
    refetchOnWindowFocus: false
  });

  // Obter os dados do mês selecionado
  const dadosMes = despesasData?.find(d => d.mes === parseInt(mesSelecionado));

  // Formatação de valores monetários em euros
  const formatarEuros = (valor: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor);
  };

  // Formatação de valor de ocupação (0 a 1) para percentagem
  const formatarOcupacao = (ocupacao: number) => {
    return `${(ocupacao * 100).toFixed(1)}%`;
  };

  // Calcular totais para cartões de resumo
  const totalEstimado = dadosMes ? (dadosMes.totais.custoRecursosEstimado + dadosMes.totais.custoMateriaisEstimado) : 0;
  const totalRealizado = dadosMes ? (dadosMes.totais.custoRecursosRealizado + dadosMes.totais.custoMateriaisRealizado) : 0;
  const percentRealizado = totalEstimado > 0 ? (totalRealizado / totalEstimado) * 100 : 0;
  const diferencaRealEstimado = totalRealizado - totalEstimado;

  // Pagination data for current tab
  const paginatedData = useMemo(() => {
    if (!dadosMes) return { data: [], totalPages: 0 };
    
    const items = activeTab === "alocacoes" ? dadosMes.alocacoes : dadosMes.materiais;
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Get current page data
    const startIndex = currentPage * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedItems = items.slice(startIndex, endIndex);
    
    return {
      data: paginatedItems,
      totalItems,
      totalPages,
      startIndex,
      endIndex
    };
  }, [dadosMes, activeTab, currentPage, itemsPerPage]);

  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentPage(0);
  }, [activeTab, mesSelecionado]);

  // Generate pagination numbers
  const paginationNumbers = useMemo(() => {
    const totalPages = paginatedData.totalPages;
    if (totalPages <= 1) return [];
    
    const pageNumbers: (number | string)[] = [];
    const MAX_VISIBLE_PAGES_AROUND_CURRENT = 1;
    const MAX_TOTAL_VISIBLE_BUTTONS = 5;

    if (totalPages <= MAX_TOTAL_VISIBLE_BUTTONS + 2) {
      for (let i = 0; i < totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(0);

      const startPage = Math.max(1, currentPage - MAX_VISIBLE_PAGES_AROUND_CURRENT);
      const endPage = Math.min(totalPages - 2, currentPage + MAX_VISIBLE_PAGES_AROUND_CURRENT);

      if (startPage > 1) {
        pageNumbers.push("...");
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (endPage < totalPages - 2) {
        pageNumbers.push("...");
      }

      pageNumbers.push(totalPages - 1);
    }

    return pageNumbers;
  }, [paginatedData.totalPages, currentPage]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Detalhamento de Despesas</CardTitle>
          <CardDescription>A carregar dados financeiros...</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[400px] w-full animate-pulse bg-slate-100 rounded-lg"></div>
        </CardContent>
      </Card>
    );
  }

  // Determinar qual conteúdo de tab está ativo para as métricas específicas
  const getActiveMetrics = () => {
    if (activeTab === "alocacoes") {
      return {
        titulo: "Recursos Humanos",
        icon: <Users className="h-4 w-4" />,
        estimado: dadosMes?.totais.custoRecursosEstimado || 0,
        realizado: dadosMes?.totais.custoRecursosRealizado || 0,
        percent: dadosMes?.totais.custoRecursosEstimado 
          ? (dadosMes.totais.custoRecursosRealizado / dadosMes.totais.custoRecursosEstimado * 100) 
          : 0
      };
    } else {
      return {
        titulo: "Materiais e Serviços",
        icon: <Package className="h-4 w-4" />,
        estimado: dadosMes?.totais.custoMateriaisEstimado || 0,
        realizado: dadosMes?.totais.custoMateriaisRealizado || 0,
        percent: dadosMes?.totais.custoMateriaisEstimado 
          ? (dadosMes.totais.custoMateriaisRealizado / dadosMes.totais.custoMateriaisEstimado * 100) 
          : 0
      };
    }
  };

  const activeMetrics = getActiveMetrics();

  return (
    <Card className="w-full overflow-hidden border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Panorama de Despesas
            </CardTitle>
            <CardDescription className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {MESES.find(m => m.value === mesSelecionado)?.label} de {anoAtual}
        </CardDescription>
          </div>
          
          <div className="flex items-center gap-3">
          <Select
            value={mesSelecionado}
            onValueChange={setMesSelecionado}
          >
              <SelectTrigger className="h-9 w-[180px] rounded-full border-slate-200 bg-white">
              <SelectValue placeholder="Selecionar mês" />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((mes) => (
                <SelectItem key={mes.value} value={mes.value}>{mes.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border-b border-slate-100">
          <div className="p-4 sm:border-r border-slate-100 group">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Estimado</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                {formatarEuros(totalEstimado)}
              </h3>
            </div>
          </div>
          
          <div className="p-4 sm:border-r border-slate-100 group">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Realizado</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                {formatarEuros(totalRealizado)}
              </h3>
            </div>
          </div>
          
          <div className="p-4 sm:border-r border-slate-100 group">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Balanço</p>
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "text-2xl font-bold transition-colors",
                diferencaRealEstimado >= 0 
                  ? "text-emerald-600 group-hover:text-emerald-500" 
                  : "text-rose-600 group-hover:text-rose-500"
              )}>
                {formatarEuros(Math.abs(diferencaRealEstimado))}
              </h3>
              {diferencaRealEstimado >= 0 ? (
                <ArrowUpRight className="h-5 w-5 text-emerald-600" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-rose-600" />
              )}
            </div>
          </div>
          
          <div className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Taxa de Execução</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold text-blue-600">
                {percentRealizado.toFixed(1)}%
              </h3>
              <Badge 
                className={cn(
                  "rounded-full",
                  percentRealizado > 90 ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" :
                  percentRealizado > 70 ? "bg-amber-100 text-amber-800 hover:bg-amber-200" :
                  "bg-rose-100 text-rose-800 hover:bg-rose-200"
                )}
              >
                {percentRealizado > 90 ? "Ótimo" : 
                 percentRealizado > 70 ? "Bom" : "Atenção"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Custom Tabs Navigation */}
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("alocacoes")}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors",
                "border-b-2 focus:outline-none",
                activeTab === "alocacoes"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              )}
            >
              <Users className="h-4 w-4" />
              Recursos Humanos
            </button>
            <button
              onClick={() => setActiveTab("materiais")}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors",
                "border-b-2 focus:outline-none",
                activeTab === "materiais"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              )}
            >
              <Package className="h-4 w-4" />
              Materiais e Serviços
            </button>
          </div>
        </div>

        {/* Active Tab Metrics */}
        <div className="bg-blue-50/50 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                {activeMetrics.icon}
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-800">{activeMetrics.titulo}</h3>
                <p className="text-xs text-slate-500">
                  {formatarEuros(activeMetrics.realizado)} de {formatarEuros(activeMetrics.estimado)} ({activeMetrics.percent.toFixed(1)}%)
                </p>
              </div>
            </div>
            
            {activeTab === "alocacoes" && (
              <div className="flex items-center gap-5 ml-4">
                <div className="flex flex-col items-end">
                  <p className="text-xs font-medium text-slate-500">Alocação Estimada</p>
                  <p className="text-sm font-medium text-blue-600">
                    {dadosMes?.alocacoes.reduce((sum, a) => sum + (a.ocupacaoEstimada || a.ocupacao), 0).toFixed(2)} ETI
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-xs font-medium text-slate-500">Alocação Realizada</p>
                  <p className="text-sm font-medium text-amber-600">
                    {dadosMes?.alocacoes.reduce((sum, a) => sum + (a.ocupacaoRealizada || a.ocupacao), 0).toFixed(2)} ETI
                  </p>
                </div>
              </div>
            )}
            
            <div className="relative w-36 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "absolute left-0 top-0 h-full rounded-full",
                  activeMetrics.percent > 90 ? "bg-emerald-500" :
                  activeMetrics.percent > 70 ? "bg-amber-500" :
                  "bg-rose-500"
                )}
                style={{ width: `${Math.min(100, activeMetrics.percent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === "alocacoes" && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-semibold text-xs uppercase text-slate-500 py-3">Utilizador</TableHead>
                    <TableHead className="font-semibold text-xs uppercase text-slate-500 py-3">Projeto / Workpackage</TableHead>
                    <TableHead className="font-semibold text-xs uppercase text-slate-500 py-3">Alocação Estimada</TableHead>
                    <TableHead className="font-semibold text-xs uppercase text-slate-500 py-3">Custo Estimado</TableHead>
                    <TableHead className="font-semibold text-xs uppercase text-slate-500 py-3">Alocação Realizada</TableHead>
                    <TableHead className="font-semibold text-xs uppercase text-slate-500 py-3">Custo Realizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.totalItems === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                        Nenhuma alocação encontrada para este mês
                      </TableCell>
                      </TableRow>
                    ) : (
                    paginatedData.data.map((alocacao, index) => (
                      <TableRow key={index} className="hover:bg-slate-50 border-b border-slate-100">
                        <TableCell className="font-medium text-sm text-slate-800">{alocacao.nome}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-blue-600">{alocacao.projeto}</span>
                            <span className="text-xs text-slate-500">{alocacao.workpackage}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {formatarOcupacao(alocacao.ocupacaoEstimada || alocacao.ocupacao)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-800">
                          {formatarEuros(alocacao.custoEstimado)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={alocacao.ocupacaoRealizada !== undefined ? "outline" : "secondary"} 
                                 className={cn(
                                   alocacao.ocupacaoRealizada !== undefined 
                                     ? "bg-amber-50 text-amber-700" 
                                     : "bg-slate-100 text-slate-500"
                                 )}>
                            {alocacao.ocupacaoRealizada !== undefined 
                              ? formatarOcupacao(alocacao.ocupacaoRealizada) 
                              : formatarOcupacao(alocacao.ocupacao)}
                          </Badge>
                          {alocacao.ocupacaoRealizada !== undefined && alocacao.ocupacaoEstimada !== undefined && (
                            <span className={cn(
                              "ml-2 text-xs",
                              alocacao.ocupacaoRealizada > alocacao.ocupacaoEstimada ? "text-rose-500" : 
                              alocacao.ocupacaoRealizada < alocacao.ocupacaoEstimada ? "text-emerald-500" : 
                              "text-slate-400"
                            )}>
                              {alocacao.ocupacaoRealizada > alocacao.ocupacaoEstimada ? "+" : 
                               alocacao.ocupacaoRealizada < alocacao.ocupacaoEstimada ? "-" : "="}
                              {Math.abs((alocacao.ocupacaoRealizada - alocacao.ocupacaoEstimada) * 100).toFixed(1)}%
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-sm", 
                            alocacao.custoRealizado > 0 ? "font-medium text-amber-600" : "text-slate-500"
                          )}>
                            {formatarEuros(alocacao.custoRealizado)}
                          </span>
                          {alocacao.custoRealizado > 0 && alocacao.custoEstimado > 0 && (
                            <span className={cn(
                              "ml-2 text-xs",
                              alocacao.custoRealizado > alocacao.custoEstimado ? "text-rose-500" : 
                              alocacao.custoRealizado < alocacao.custoEstimado ? "text-emerald-500" : 
                              "text-slate-400"
                            )}>
                              {alocacao.custoRealizado > alocacao.custoEstimado ? "+" : 
                               alocacao.custoRealizado < alocacao.custoEstimado ? "-" : "="}
                              {formatarEuros(Math.abs(alocacao.custoRealizado - alocacao.custoEstimado))}
                            </span>
                          )}
                        </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
            </div>
            )}

          {activeTab === "materiais" && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="font-semibold text-xs uppercase text-slate-500 py-3">Material</TableHead>
                    <TableHead className="font-semibold text-xs uppercase text-slate-500 py-3">Projeto / Workpackage</TableHead>
                    <TableHead className="font-semibold text-xs uppercase text-slate-500 py-3">Rubrica</TableHead>
                    <TableHead className="font-semibold text-xs uppercase text-slate-500 py-3">Quantidade</TableHead>
                    <TableHead className="font-semibold text-xs uppercase text-slate-500 py-3">Custo Total</TableHead>
                    <TableHead className="font-semibold text-xs uppercase text-slate-500 py-3">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {paginatedData.totalItems === 0 ? (
                      <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                        Nenhum material encontrado para este mês
                      </TableCell>
                      </TableRow>
                    ) : (
                    paginatedData.data.map((material, index) => (
                      <TableRow key={index} className="hover:bg-slate-50 border-b border-slate-100">
                        <TableCell className="font-medium text-sm text-slate-800">{material.nome}</TableCell>
                          <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-blue-600">{material.projeto}</span>
                            <span className="text-xs text-slate-500">{material.workpackage}</span>
                          </div>
                          </TableCell>
                          <TableCell>
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 font-normal">
                            {material.rubrica}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-800">{material.quantidade} un.</TableCell>
                        <TableCell className="text-sm font-medium text-slate-800">{formatarEuros(material.custoTotal)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {material.realizado ? (
                              <>
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
                                  <Check size={12} className="text-emerald-600" />
                                </span>
                                <span className="text-sm font-medium text-emerald-700">Concluído</span>
                              </>
                            ) : (
                              <>
                                <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-100 bg-amber-50">
                                  <span className="absolute h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping opacity-75"></span>
                                  <span className="relative h-2 w-2 rounded-full bg-amber-500"></span>
                                </span>
                                <span className="text-sm font-medium text-amber-700">Pendente</span>
                              </>
                            )}
                          </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
            </div>
            )}
          
          {/* Pagination */}
          {paginatedData.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">
                A mostrar{" "}
                <span className="font-medium text-slate-700">
                  {(paginatedData.startIndex ?? 0) + 1}-{paginatedData.endIndex ?? 0}
                </span>{" "}
                de{" "}
                <span className="font-medium text-slate-700">
                  {paginatedData.totalItems}
                </span>{" "}
                itens
              </p>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  aria-label="Página anterior"
                  className="h-7 w-7 rounded-md border-slate-200 bg-white p-0 text-slate-500 shadow-sm transition-all duration-150 hover:border-azul/30 hover:bg-slate-50 hover:text-azul hover:shadow-none disabled:opacity-50 disabled:hover:shadow-none"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {paginationNumbers.map((page, index) =>
                  typeof page === "number" ? (
                    <Button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      aria-label={`Ir para página ${page + 1}`}
                      className={cn(
                        "h-7 w-7 rounded-md p-0 text-xs shadow-sm transition-all duration-150 hover:shadow-none",
                        currentPage === page
                          ? "bg-azul font-medium text-white hover:bg-azul/90"
                          : "border border-slate-200 bg-white font-normal text-slate-600 hover:border-azul/30 hover:bg-slate-50 hover:text-azul"
                      )}
                    >
                      {page + 1}
                    </Button>
                  ) : (
                    <span
                      key={`ellipsis-${index}`}
                      className="flex h-7 w-4 items-center justify-center p-0 text-xs text-slate-400"
                    >
                      ...
                    </span>
                  )
                )}

                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage >= paginatedData.totalPages - 1}
                  onClick={() => setCurrentPage(prev => Math.min(paginatedData.totalPages - 1, prev + 1))}
                  aria-label="Próxima página"
                  className="h-7 w-7 rounded-md border-slate-200 bg-white p-0 text-slate-500 shadow-sm transition-all duration-150 hover:border-azul/30 hover:bg-slate-50 hover:text-azul hover:shadow-none disabled:opacity-50 disabled:hover:shadow-none"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 