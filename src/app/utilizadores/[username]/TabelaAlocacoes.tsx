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
  AlertCircle, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  ChevronDown,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SelectField } from "@/components/projetos/criar/components/FormFields";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { api } from "@/trpc/react";
import type { ProjetoEstado } from "@prisma/client";
import { useParams } from 'next/navigation';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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

    // Mapear os dados para o formato AlocacoesData
    return {
      real: query.data.real.map(item => ({
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
      submetido: query.data.submetido.map(item => ({
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
  const [modoComparacao, setModoComparacao] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Constantes
  const mesesFull = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  
  // Usar alocacoes das props
  const alocacoes = propAlocacoes;

  // Parâmetros da URL
  const params = useParams();
  const username = params?.username as string;

  // API para gerar PDF
  const { mutate: gerarPDF } = usePDFExport();

  // Função para exportar PDF
  const handleExportPDF = () => {
    if (mesSelecionado) {
      setIsGeneratingPDF(true);
      if (!username || username === 'unknown') {
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
    [...alocacoes.real, ...alocacoes.submetido].forEach(a => {
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

  // Validação — só pode salvar se todos os meses baterem
  const podeSalvar = useMemo(() => {
    return getMeses().every(mes => 
      Math.abs(calcularTotal(alocacoes.real, mes) - calcularTotal(alocacoes.submetido, mes)) < 0.001
    );
  }, [alocacoes, getMeses, calcularTotal]);

  async function handleSave(){
    if(!podeSalvar) return;
    setLoading(true);
    try{
      await onSave(alocacoes.real);
    }finally{
      setLoading(false);
    }
  }

  // Função para obter a diferença entre real e submetido
  const getDiferenca = useCallback((wpId: string, mes: number) => {
    const real = getValorReal(wpId, mes);
    const submetido = getValorSubmetido(wpId, mes);
    return real - submetido;
  }, [getValorReal, getValorSubmetido]);

  return (
    <Card className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md transition-all hover:shadow-lg">
      <CardHeader className="px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Alocação de Horas</h3>
            <p className="text-sm text-slate-500">Gestão de alocações por projeto e workpackage</p>
          </div>
          
          <Tabs 
            defaultValue={viewMode} 
            className="w-full sm:w-auto" 
            onValueChange={(v) => setViewMode(v as "real" | "submetido")}
          >
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-full p-1 h-9">
              <TabsTrigger 
                value="real" 
                className={cn(
                  "rounded-full text-xs font-medium transition-all duration-200 px-4",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white shadow-sm"
                )}
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Horas Reais
              </TabsTrigger>
              <TabsTrigger 
                value="submetido" 
                className={cn(
                  "rounded-full text-xs font-medium transition-all duration-200 px-4",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white shadow-sm"
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Horas Submetidas
              </TabsTrigger>
            </TabsList>
          </Tabs>
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
            
            {!isSubmetido && !podeSalvar && (
              <Badge variant="destructive" className="h-7 rounded-full px-3 text-sm animate-pulse shadow-sm">
                <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                <span>Totais Divergentes</span>
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Dropdown para seleção de filtros */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1 text-sm rounded-full shadow-sm transition-all hover:bg-slate-100">
                  <RefreshCw className="h-3.5 w-3.5" />
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
                  
                  <div className="pt-2 flex items-center">
                    <Button 
                      variant={modoComparacao ? "secondary" : "outline"}
                      size="sm" 
                      className={cn(
                        "w-full text-sm h-9 rounded-full transition-all shadow-sm",
                        modoComparacao ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : ""
                      )}
                      onClick={() => setModoComparacao(!modoComparacao)}
                    >
                      {modoComparacao ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                          <span>Ocultar Comparação</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          <span>Ver Comparação</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {!isSubmetido && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button 
                        onClick={handleSave} 
                        disabled={!podeSalvar || loading}
                        className={cn(
                          "h-9 gap-1 rounded-full px-4 text-sm transition-all duration-300 shadow-sm",
                          podeSalvar 
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-md hover:from-blue-600 hover:to-blue-700" 
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                      >
                        {loading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        <span>Guardar</span>
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 text-white p-2 rounded-md text-xs shadow-lg">
                    {podeSalvar 
                      ? "Guardar alterações nas alocações"
                      : "Os totais reais devem coincidir com os submetidos para guardar"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
            "w-full min-w-[800px]",
            "border-separate border-spacing-0",
            mesSelecionado && "table-fixed",
            "animate-in fade-in duration-300"
          )}>
            <TableHeader className="sticky top-0 z-30 bg-white shadow-sm">
              <TableRow className="border-b-0">
                <TableHead className={cn(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 sticky left-0 z-40 bg-white flex items-center justify-between",
                  mesSelecionado ? "w-[60%]" : (isSidebarCollapsed ? "w-[60px] min-w-[60px]" : "w-[220px] min-w-[220px]"),
                  "transition-all duration-300 ease-in-out"
                )}>
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
                      <span className="font-medium">Alocação</span>
                    ) : (
                      <span className="font-medium">{mesesFull[mes-1]?.slice(0,3) ?? ''}</span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {projetos.map((projeto, projIndex) => (
                <React.Fragment key={projeto.id}>
                  <TableRow className={cn(
                    "group",
                    projIndex > 0 ? "border-t border-slate-200" : ""
                  )}>
                    <TableCell
                      className={cn(
                        "sticky left-0 z-20 px-4 py-2 flex items-center justify-between",
                        isSubmetido 
                          ? "bg-indigo-50 text-indigo-900" 
                          : "bg-blue-50 text-blue-900",
                        "transition-colors duration-200"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold shadow-sm flex-shrink-0",
                          isSubmetido 
                            ? "bg-indigo-100 text-indigo-700" 
                            : "bg-blue-100 text-blue-700"
                        )}>
                          {projeto.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <span className={cn("font-medium text-sm truncate", isSidebarCollapsed && "hidden")}>{projeto.nome}</span>
                      </div>
                    </TableCell>
                    {getMeses().map((mes) => (
                      <TableCell
                        key={`${projeto.id}-mes-${mes}`}
                        className={cn(
                          "py-2",
                          isSubmetido ? "bg-indigo-50" : "bg-blue-50",
                          mes % 2 !== 0 ? "bg-opacity-60" : "bg-opacity-100",
                        )}
                      />
                    ))}
                  </TableRow>

                  {Array.from(projeto.wps).map((wpId) => {
                    const wp = (isSubmetido ? alocacoes.submetido : alocacoes.real).find(
                      (a) => a.workpackage.id === wpId
                    )?.workpackage;

                    if (!wp) return null;

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
                              "h-1.5 w-1.5 rounded-full transition-colors duration-200 flex-shrink-0",
                              isSubmetido ? "bg-indigo-400 group-hover:bg-indigo-500" : "bg-blue-400 group-hover:bg-blue-500"
                            )} />
                            <span className={cn(
                              "text-sm transition-colors duration-200 group-hover:text-slate-800 truncate",
                              mesSelecionado && "line-clamp-1"
                            )}>{wp.nome}</span>
                          </div>
                        </TableCell>
                        
                        {getMeses().map((mes) => {
                          const valor = getValor(wpId, mes);
                          const valorNum = typeof valor === 'number' ? valor : 0;
                          const isEditing = editValues.has(`${wpId}-${mes}-${anoSelecionado}`);
                          const diferenca = getDiferenca(wpId, mes);
                          const temDiferenca = Math.abs(diferenca) >= 0.01;
                          
                          return (
                            <TableCell 
                              key={mes} 
                              className={cn(
                                "px-3 py-2 text-center align-middle transition-all duration-200",
                                mes % 2 !== 0 ? "bg-slate-50/30" : "bg-white",
                                mesSelecionado && "w-[40%]",
                                !isSubmetido && temDiferenca && modoComparacao && "bg-yellow-50/50"
                              )}
                            >
                              <div className="flex flex-col items-center">
                                {isSubmetido ? (
                                  <span className={cn(
                                    "flex items-center justify-center h-8 w-[70px] text-sm rounded-md",
                                    valorNum > 0 ? "font-medium text-indigo-700 bg-indigo-50/60" : "text-slate-400"
                                  )}>
                                    {valorNum.toFixed(2)}
                                  </span>
                                ) : (
                                  <Input
                                    type="text"
                                    value={isEditing ? editValues.get(`${wpId}-${mes}-${anoSelecionado}`) : valorNum.toFixed(2).replace(".", ",")}
                                    onChange={(e) => handleInputChange(wpId, mes, e)}
                                    placeholder="0,00"
                                    className={cn(
                                      "h-8 w-[70px] text-center text-sm border border-transparent rounded-md",
                                      "bg-transparent focus:bg-white focus:border-blue-300 focus:ring-1 focus:ring-blue-300 focus:outline-none",
                                      "transition-all duration-200",
                                      isEditing && "bg-blue-50/60 border-blue-300 shadow-sm",
                                      valorNum > 0 && "text-blue-700 font-medium",
                                      mesSelecionado && "text-base w-[80px]",
                                      temDiferenca && modoComparacao && "border-yellow-400 bg-yellow-50/50"
                                    )}
                                  />
                                )}
                                
                                {modoComparacao && temDiferenca && (
                                  <div className={cn(
                                    "text-[11px] mt-1 font-medium",
                                    diferenca > 0 ? "text-emerald-600" : "text-red-600"
                                  )}>
                                    {diferenca > 0 ? "+" : ""}{diferenca.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              ))}
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
                  const isDifferent = Math.abs(totalReal - totalSubmetido) >= 0.001;
                  const totalAtual = isSubmetido ? totalSubmetido : totalReal;

                  return (
                    <TableCell
                      key={mes}
                      className={cn(
                        "px-3 py-3 text-center text-sm font-semibold",
                        isDifferent && !isSubmetido ? "bg-yellow-100/70 text-yellow-800" : "text-slate-700",
                        !isDifferent && !isSubmetido ? "bg-emerald-100/60 text-emerald-800" : "",
                        mesSelecionado && "text-base"
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <span>{totalAtual.toFixed(2)}</span>
                        {!isSubmetido && (
                          <div className={cn(
                              "flex items-center mt-1 text-xs font-medium",
                              isDifferent ? "text-yellow-700" : "text-emerald-700"
                          )}>
                            {isDifferent ? (
                              <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 mr-1 flex-shrink-0" />
                            )}
                            {isDifferent ? "Divergente" : "Correto"}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
              
              {!isSubmetido && (
                <TableRow className="border-t border-slate-200/50">
                  <TableCell className={cn(
                    "px-4 py-3 text-sm font-medium text-slate-500 sticky left-0 z-10 bg-slate-100/95 transition-all duration-300 ease-in-out",
                    isSidebarCollapsed ? "w-[60px] min-w-[60px] text-center" : ""
                  )}>
                    <span className={cn(isSidebarCollapsed && "hidden")}>Meta (Submetido)</span>
                    {isSidebarCollapsed && <span title="Meta (Submetido)">🎯</span>}
                  </TableCell>
                  {getMeses().map((mes) => {
                    const totalSubmetido = calcularTotal(alocacoes.submetido, mes);
                    return (
                      <TableCell
                        key={mes}
                        className={cn(
                          "px-3 py-3 text-center text-sm font-medium text-slate-500",
                          mesSelecionado && "text-base"
                        )}
                      >
                        {totalSubmetido.toFixed(2)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              )}
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
            {modoComparacao && (
              <>
                <div className="flex items-center">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-yellow-700 mr-1.5">
                    <AlertCircle className="h-3 w-3" />
                  </div>
                  <span>Diferença Real vs. Submetido</span>
                </div>
                <div className="flex items-center text-emerald-600">
                  <span className="font-mono mr-1">+0.10</span>
                  <span>Real Maior</span>
                </div>
                <div className="flex items-center text-red-600">
                  <span className="font-mono mr-1">-0.10</span>
                  <span>Real Menor</span>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
