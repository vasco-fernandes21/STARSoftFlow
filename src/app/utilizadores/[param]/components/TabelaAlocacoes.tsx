"use client";

import React, { useMemo, useCallback, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Save, 
  Loader2, 
  Calendar, 
  FileText, 
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SelectField } from "@/components/projetos/criar/components/FormFields";
import { api } from "@/trpc/react";
import type { ProjetoEstado } from "@prisma/client";
import { useParams } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePDFExport } from '@/hooks/usePDFExport';

interface AlocacaoOriginal {
  ano: number;
  mes: number;
  ocupacao: number;
  workpackage: { id: string; nome: string };
  projeto: { id: string; nome: string; estado?: ProjetoEstado };
}

interface AlocacoesData {
  real: AlocacaoOriginal[];
  submetido: AlocacaoOriginal[];
  anos: number[];
}

interface TabelaProps {
  alocacoes: AlocacoesData;
  viewMode: "real" | "submetido";
  ano: number;
  onSave: (alocacoesReais: AlocacaoOriginal[]) => Promise<void> | void;
  singleYear?: boolean;
}

interface Projeto {
  id: string;
  nome: string;
  estado?: ProjetoEstado;
  wps: Set<string>;
}

// Novo hook para buscar alocações diretamente da API
export function useAlocacoes(username: string, ano?: number) {
  const query = api.utilizador.getAlocacoes.useQuery({ 
    userId: username,
    ano
  }, {
    refetchOnWindowFocus: false,
    // Não vamos processar caso não tenhamos dados
    enabled: !!username
  });

  // Transformar os dados para o formato esperado pelo componente
  const data = React.useMemo(() => {
    if (!query.data) return undefined;

    // Interface para os dados da API
    interface AlocacaoAPIItem {
      ano: number;
      mes: number;
      ocupacao: number;
      workpackageId: string;
      workpackageNome: string;
      projetoId: string;
      projetoNome: string;
      projetoEstado: ProjetoEstado;
    }

    // Mapear os dados para o formato AlocacoesData
    return {
      real: query.data.real.map((item: AlocacaoAPIItem) => ({
        ano: item.ano,
        mes: item.mes,
        ocupacao: item.ocupacao,
        workpackage: { 
          id: item.workpackageId, 
          nome: item.workpackageNome 
        },
        projeto: { 
          id: item.projetoId, 
          nome: item.projetoNome,
          estado: item.projetoEstado
        }
      })),
      submetido: query.data.pendente?.map((item: AlocacaoAPIItem) => ({
        ano: item.ano,
        mes: item.mes,
        ocupacao: item.ocupacao,
        workpackage: { 
          id: item.workpackageId, 
          nome: item.workpackageNome 
        },
        projeto: { 
          id: item.projetoId, 
          nome: item.projetoNome,
          estado: item.projetoEstado
        }
      })) || [],
      anos: query.data.anos
    };
  }, [query.data]);

  return { ...query, data };
}

export function TabelaAlocacoes({ alocacoes: propAlocacoes, viewMode: initialViewMode, ano, onSave, singleYear }: TabelaProps) {
  // Estado local para viewMode, permitindo alternar entre visões dentro do componente
  const [viewMode, setViewMode] = useState<"real" | "submetido">(initialViewMode);
  const isSubmetido = viewMode === "submetido";
  
  const [anoSelecionado, setAnoSelecionado] = useState(ano);
  const [mesSelecionado, setMesSelecionado] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Constantes
  const mesesFull = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  
  // Usar alocacoes das props
  const alocacoes = propAlocacoes;

  // Parâmetros da URL
  const params = useParams();
  const username = typeof params?.param === 'string' ? params.param : 
                  typeof params?.username === 'string' ? params.username : undefined;

  // API para gerar PDF
  const { mutate: gerarPDF } = usePDFExport();

  // Função para exportar PDF
  const handleExportPDF = () => {
    if (mesSelecionado) {
      setIsGeneratingPDF(true);
      if (!username) {
        alert('Erro: Username não encontrado na URL. Certifique-se de estar na página correta do utilizador.');
        setIsGeneratingPDF(false);
        return;
      }
      gerarPDF({
        username,
        mes: mesSelecionado,
        ano: anoSelecionado
      });
    } else {
      alert('Por favor, selecione um mês para exportar o relatório.');
    }
  };

  const getMeses = useCallback(() => {
    if (mesSelecionado !== null) {
      return [mesSelecionado];
    }
    return Array.from({length:12}, (_,i)=> i+1);
  }, [mesSelecionado]);

  // Memo para obter projetos
  const projetos = useMemo(() => {
    const projetosMap = new Map<string, Projeto>();
    // Ensure we handle the case where submetido might be undefined
    const allAllocations = [...alocacoes.real, ...(alocacoes.submetido || [])];
    
    allAllocations.forEach(a => {
      if (!projetosMap.has(a.projeto.id)) {
        projetosMap.set(a.projeto.id, {
          id: a.projeto.id,
          nome: a.projeto.nome,
          estado: a.projeto.estado,
          wps: new Set()
        });
      }
      const projeto = projetosMap.get(a.projeto.id);
      if (projeto) {
        projeto.wps.add(a.workpackage.id);
      }
    });
    return Array.from(projetosMap.values());
  }, [alocacoes.real, alocacoes.submetido]);

  // Função para obter valor real de alocação
  const getValorReal = useCallback((wpId: string, mes: number) => {
    const alocacao = alocacoes.real.find(a => 
      a.workpackage.id === wpId && 
      a.mes === mes && 
      a.ano === anoSelecionado
    );
    return alocacao ? alocacao.ocupacao : 0;
  }, [alocacoes.real, anoSelecionado]);

  // Função para obter valor submetido de alocação
  const getValorSubmetido = useCallback((wpId: string, mes: number) => {
    if (!alocacoes.submetido) return 0;
    
    const alocacao = alocacoes.submetido.find(a => 
      a.workpackage.id === wpId && 
      a.mes === mes && 
      a.ano === anoSelecionado
    );
    return alocacao ? alocacao.ocupacao : 0;
  }, [alocacoes.submetido, anoSelecionado]);

  // Função para obter valor com base no modo de visualização
  const getValor = useCallback((wpId: string, mes: number) => {
    return isSubmetido ? getValorSubmetido(wpId, mes) : getValorReal(wpId, mes);
  }, [isSubmetido, getValorReal, getValorSubmetido]);

  function handleInputChange(wpId: string, mes: number, e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    
    // If empty, allow it (user is typing)
    if (value === "") {
      const key = `${wpId}-${mes}-${anoSelecionado}`;
      setEditValues(prev => {
        const copy = new Map(prev);
        copy.set(key, value);
        return copy;
      });
      return;
    }

    // If first character is 1, only allow "1"
    if (value.startsWith("1")) {
      if (value !== "1") return;
    } 
    // If first character is 0, enforce 0,XX format
    else if (value.startsWith("0")) {
      // Allow "0" or "0," while typing
      if (value === "0" || value === "0,") {
        // Do nothing, allow it
      } 
      // Check if it follows 0,XX format
      else {
        const match = value.match(/^0,(\d{0,2})$/);
        if (!match) return;
      }
    } 
    // If doesn't start with 0 or 1, invalid
    else return;

    const key = `${wpId}-${mes}-${anoSelecionado}`;
    setEditValues(prev => {
      const copy = new Map(prev);
      copy.set(key, value);
      return copy;
    });
  }

  const calcularTotal = useCallback((arr: AlocacaoOriginal[], mes: number) => {
    if (!arr) return 0;
    
    const valoresFixos = arr
      .filter(a => a.ano === anoSelecionado && a.mes === mes)
      .reduce((s, a) => s + a.ocupacao, 0);
      
    // Se estamos calculando valores submetidos, retornar diretamente o valor fixo
    if (arr === alocacoes.submetido) {
      return valoresFixos;
    }
    
    // Se estamos editando valores reais, incluir os valores editados no cálculo total
    let total = valoresFixos;
    
    // Substituir valores editados
    arr.forEach(a => {
      if (a.ano === anoSelecionado && a.mes === mes) {
        const key = `${a.workpackage.id}-${mes}-${anoSelecionado}`;
        if (editValues.has(key)) {
          // Subtrair o valor original
          total -= a.ocupacao;
          
          // Adicionar o valor editado (convertendo a string para número)
          const editedValue = editValues.get(key) || "";
          const numValue = parseFloat(editedValue.replace(',', '.')) || 0;
          total += numValue;
        }
      }
    });
    
    return total;
  }, [anoSelecionado, editValues, alocacoes.submetido]);

  async function handleSave(){
    setLoading(true);
    try{
      await onSave(alocacoes.real);
    }finally{
      setLoading(false);
    }
  }

  return (
    <Card className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md transition-all hover:shadow-lg">
      <CardHeader className="px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Alocação de Horas</h3>
            <p className="text-sm text-slate-500">Gestão de alocações por projeto e workpackage</p>
          </div>
          
          <div className="flex items-center">
            <div className="bg-slate-100 p-0.5 rounded-full flex shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("real")}
                className={cn(
                  "h-8 rounded-full px-4 text-xs font-medium transition-all duration-200",
                  !isSubmetido 
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm" 
                    : "text-slate-600 hover:bg-slate-200/70"
                )}
              >
                Horas Reais
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("submetido")}
                className={cn(
                  "h-8 rounded-full px-4 text-xs font-medium transition-all duration-200",
                  isSubmetido 
                    ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-sm" 
                    : "text-slate-600 hover:bg-slate-200/70"
                )}
              >
                Horas Submetidas
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 bg-gradient-to-r from-white to-slate-50/50">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="h-7 rounded-full border-slate-200 px-3 text-sm text-slate-600 bg-white shadow-sm">
              <Calendar className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> 
              {anoSelecionado}
            </Badge>
            
            {mesSelecionado && (
              <Badge variant="outline" className="h-7 rounded-full border-blue-200 bg-blue-50 px-3 text-sm text-blue-700 shadow-sm">
                {mesesFull[mesSelecionado - 1]}
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Dropdown para seleção de filtros */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1 text-sm rounded-full shadow-sm transition-all hover:bg-slate-100">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Filtros</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 border-slate-200 shadow-lg">
                <div className="p-2 space-y-3">
                  {!singleYear && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Ano</label>
                      <SelectField
                        label=""
                        value={anoSelecionado.toString()}
                        onChange={v => setAnoSelecionado(parseInt(v))}
                        options={(alocacoes.anos ?? [ano]).map(a => ({ label: `${a}`, value: `${a}` }))}
                        className="w-full text-sm"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Mês</label>
                    <SelectField
                      label=""
                      value={mesSelecionado?.toString() ?? "todos"}
                      onChange={v => setMesSelecionado(v === "todos" ? null : parseInt(v))}
                      options={[
                        { label: "Todos os meses", value: "todos" },
                        ...mesesFull.map((mes, index) => ({
                          label: mes,
                          value: (index + 1).toString()
                        }))
                      ]}
                      className="w-full text-sm"
                    />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {!isSubmetido && (
              <Button 
                onClick={handleSave} 
                disabled={loading}
                className={cn(
                  "h-9 gap-1 rounded-full px-4 text-sm transition-all duration-300 shadow-sm",
                  "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-md hover:from-blue-600 hover:to-blue-700"
                )}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>Guardar</span>
              </Button>
            )}
            
            {mesSelecionado && (
              <Button 
                onClick={handleExportPDF} 
                disabled={isGeneratingPDF}
                variant="outline"
                size="sm"
                className="h-9 gap-1 rounded-full px-4 text-sm text-slate-700 hover:bg-slate-100 shadow-sm"
              >
                {isGeneratingPDF ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                <span>Exportar</span>
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-auto p-0 m-0">
          <Table className={cn(
            "w-full",
            mesSelecionado ? "min-w-[600px]" : "min-w-[800px]",
            "border-separate border-spacing-0",
            "animate-in fade-in duration-300"
          )}>
            <TableHeader className="sticky top-0 z-30 bg-white shadow-sm">
              <TableRow className="border-b-0">
                <TableHead className={cn(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 sticky left-0 z-40 bg-white",
                  mesSelecionado 
                    ? "w-[60%]" 
                    : (isSidebarCollapsed ? "w-[60px] min-w-[60px]" : "w-[280px] min-w-[280px]"),
                  "transition-all duration-300 ease-in-out"
                )}>
                  <div className="flex items-center justify-between">
                    <span className={cn(isSidebarCollapsed && "hidden")}>Projeto / Workpackage</span>
                    <Button 
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 text-slate-500 hover:bg-slate-200/50 rounded-full"
                      onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                      aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
                    >
                      {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                  </div>
                </TableHead>
                {getMeses().map((mes) => (
                  <TableHead
                    key={mes}
                    className={cn(
                      "px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500",
                      mes % 2 !== 0 ? "bg-slate-50/60" : "bg-white",
                      mesSelecionado && "w-[40%]"
                    )}
                  >
                    {mesSelecionado ? (
                      <span className="font-medium">Alocação de Horas</span>
                    ) : (
                      <span className="font-medium">{mesesFull[mes-1]?.slice(0,3) ?? ''}</span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {projetos.map((projeto, projIndex) => {
                // Get all workpackages for this project
                const projectWps = Array.from(projeto.wps).map(wpId => {
                  const wp = isSubmetido && alocacoes.submetido 
                    ? alocacoes.submetido.find(a => a.workpackage.id === wpId)?.workpackage
                    : alocacoes.real.find(a => a.workpackage.id === wpId)?.workpackage;
                  return wp;
                }).filter(Boolean);
                
                return (
                  <React.Fragment key={projeto.id}>
                    {/* Project header row */}
                    <TableRow className={cn(
                      "group",
                      projIndex > 0 ? "border-t border-slate-200" : ""
                    )}>
                      <TableCell
                        colSpan={mesSelecionado ? 2 : 13}
                        className={cn(
                          "sticky left-0 z-20 px-4 py-2",
                          isSubmetido 
                            ? "bg-indigo-50/80 text-indigo-900" 
                            : "bg-blue-50/80 text-blue-900",
                          "transition-colors duration-200"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold shadow-sm flex-shrink-0",
                            isSubmetido 
                              ? "bg-indigo-100 text-indigo-700" 
                              : "bg-blue-100 text-blue-700"
                          )}>
                            {projeto.nome.substring(0, 2).toUpperCase()}
                          </div>
                          <span className={cn(
                            "font-medium text-sm truncate", 
                            isSidebarCollapsed && "hidden",
                            mesSelecionado && "text-base"
                          )}>
                            {projeto.nome}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Workpackage rows */}
                    {projectWps.map((wp) => {
                      if (!wp) return null;
                      const wpId = wp.id;

                      return (
                        <TableRow
                          key={`${projeto.id}-${wpId}`}
                          className="group transition-all duration-150 ease-in-out hover:bg-slate-50/70"
                        >
                          <TableCell className={cn(
                            "px-4 py-3 align-middle text-sm sticky left-0 bg-white z-10 group-hover:bg-slate-50/70 transition-all duration-300 ease-in-out",
                            mesSelecionado && "max-w-0",
                            isSidebarCollapsed ? "w-0 p-0 opacity-0 pointer-events-none" : ""
                          )}>
                            <div className={cn("flex items-center gap-1.5 pl-4", isSidebarCollapsed && "hidden")}>
                              <div className={cn(
                                "h-2 w-2 rounded-full transition-colors duration-200 flex-shrink-0",
                                isSubmetido ? "bg-indigo-400 group-hover:bg-indigo-500" : "bg-blue-400 group-hover:bg-blue-500"
                              )} />
                              <span className={cn(
                                "text-sm transition-colors duration-200 group-hover:text-slate-800 truncate",
                                mesSelecionado && "line-clamp-1 font-medium"
                              )}>{wp.nome}</span>
                            </div>
                          </TableCell>
                          
                          {getMeses().map((mes) => {
                            const valor = getValor(wpId, mes);
                            const valorNum = typeof valor === 'number' ? valor : 0;
                            const isEditing = editValues.has(`${wpId}-${mes}-${anoSelecionado}`);
                            
                            return (
                              <TableCell 
                                key={mes} 
                                className={cn(
                                  "px-3 py-2 text-center align-middle transition-all duration-200",
                                  mes % 2 !== 0 ? "bg-slate-50/30" : "bg-white",
                                  mesSelecionado && "w-[40%]"
                                )}
                              >
                                <div className="flex flex-col items-center">
                                  {isSubmetido ? (
                                    <div className={cn(
                                      "flex items-center justify-center h-9 min-w-[80px] px-3 text-sm rounded-md",
                                      valorNum > 0 
                                        ? "font-medium text-indigo-700 bg-indigo-50/60 border border-indigo-100" 
                                        : "text-slate-400 bg-slate-50/50 border border-slate-100",
                                      mesSelecionado && "text-base h-10 min-w-[100px]"
                                    )}>
                                      {valorNum.toFixed(2)}
                                    </div>
                                  ) : (
                                    <Input
                                      type="text"
                                      value={isEditing ? editValues.get(`${wpId}-${mes}-${anoSelecionado}`) || "" : valorNum.toFixed(2).replace(".", ",")}
                                      onChange={(e) => handleInputChange(wpId, mes, e)}
                                      placeholder="0,00"
                                      className={cn(
                                        "h-9 min-w-[80px] text-center text-sm border rounded-md",
                                        "focus:border-blue-300 focus:ring-1 focus:ring-blue-300 focus:outline-none",
                                        "transition-all duration-200",
                                        isEditing 
                                          ? "bg-blue-50/60 border-blue-300 shadow-sm" 
                                          : valorNum > 0 
                                            ? "bg-blue-50/30 border-blue-100 text-blue-700 font-medium" 
                                            : "bg-slate-50/50 border-slate-100 text-slate-500",
                                        mesSelecionado && "text-base h-10 min-w-[100px]"
                                      )}
                                    />
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </TableBody>
            
            <TableFooter className="sticky bottom-0 z-20 bg-slate-100/95 backdrop-blur-sm">
              <TableRow className="border-t border-slate-200">
                <TableCell className={cn(
                  "px-4 py-3 text-sm font-semibold text-slate-700 sticky left-0 z-10 bg-slate-100/95 transition-all duration-300 ease-in-out",
                  isSidebarCollapsed ? "w-[60px] min-w-[60px] text-center" : ""
                )}>
                  <span className={cn(isSidebarCollapsed && "hidden")}>{isSubmetido ? "Total Submetido" : "Total Real"}</span>
                  {isSidebarCollapsed && <span title={isSubmetido ? "Total Submetido" : "Total Real"}>Σ</span>}
                </TableCell>
                {getMeses().map((mes) => {
                  const totalReal = calcularTotal(alocacoes.real, mes);
                  const totalSubmetido = calcularTotal(alocacoes.submetido, mes);
                  const totalAtual = isSubmetido ? totalSubmetido : totalReal;

                  return (
                    <TableCell
                      key={mes}
                      className={cn(
                        "px-3 py-3 text-center font-semibold",
                        isSubmetido 
                          ? "bg-indigo-100/40 text-indigo-800 text-sm" 
                          : "bg-blue-100/40 text-blue-800 text-sm",
                        mesSelecionado && "text-base"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center",
                        mesSelecionado && "text-lg"
                      )}>
                        {totalAtual.toFixed(2)}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-blue-400 mr-1.5"></div>
              <span>Alocações Reais</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-indigo-400 mr-1.5"></div>
              <span>Alocações Submetidas (Meta)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
