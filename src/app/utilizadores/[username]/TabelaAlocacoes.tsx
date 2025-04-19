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
  ChevronDown
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
import { ProjetoEstado } from "@prisma/client";
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  // Constantes
  const mesesFull = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  
  // Usar alocacoes das props
  const alocacoes = propAlocacoes;

  // Parâmetros da URL
  const params = useParams();
  const username = params?.username as string;

  // API para gerar PDF
  const { mutate: gerarPDF } = api.utilizador.gerarRelatorioPDF.useMutation({
    onSuccess: (data: { pdf: string; filename: string }) => {
      // Converter o Base64 para Blob
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      // Criar URL e fazer download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsGeneratingPDF(false);
    },
    onError: (error) => {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Por favor, tente novamente.");
      setIsGeneratingPDF(false);
    }
  });

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
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                )}
              >
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Horas Reais
              </TabsTrigger>
              <TabsTrigger 
                value="submetido" 
                className={cn(
                  "rounded-full text-xs font-medium transition-all duration-200 px-4",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
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
                      variant={modoComparacao ? "default" : "outline"}
                      size="sm" 
                      className={cn(
                        "w-full text-sm h-9 rounded-full transition-all",
                        modoComparacao ? "bg-blue-600 hover:bg-blue-700" : ""
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button 
                        onClick={handleSave} 
                        disabled={!podeSalvar || loading}
                        className={cn(
                          "h-9 gap-1 rounded-full px-4 text-sm transition-all duration-300",
                          podeSalvar 
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-md hover:from-blue-600 hover:to-blue-700" 
                            : "bg-slate-100 text-slate-400"
                        )}
                      >
                        {loading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        <span>Guardar Alterações</span>
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 text-white p-2 rounded-lg text-xs">
                    {podeSalvar 
                      ? "Guardar alterações nas alocações" 
                      : "As alocações devem totalizar os mesmos valores dos submetidos para guardar"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {mesSelecionado && (
              <Button 
                onClick={handleExportPDF} 
                disabled={isGeneratingPDF}
                className="h-9 gap-1 rounded-full px-4 text-sm transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-md hover:from-blue-700 hover:to-blue-800"
              >
                {isGeneratingPDF ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                <span>Exportar Relatório</span>
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-auto p-0 m-0">
          <Table className={cn(
            "border-separate border-spacing-y-0",
            mesSelecionado && "table-fixed",
            "animate-in fade-in duration-300"
          )}>
            <TableHeader>
              <TableRow className="border-b-0">
                <TableHead className={cn(
                  "bg-white/95 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-slate-500 sticky left-0 z-20",
                  mesSelecionado ? "w-[60%]" : "w-[180px]"
                )}>
                  Projeto / Workpackage
                </TableHead>
                {getMeses().map((mes) => (
                  <TableHead
                    key={mes}
                    className={cn(
                      "sticky top-0 z-10 bg-white/95 px-2 py-3 text-center text-sm font-semibold uppercase tracking-wider text-slate-500",
                      mes % 2 === 0 ? "bg-slate-50/50" : "",
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
              {projetos.map((projeto) => (
                <React.Fragment key={projeto.id}>
                  <TableRow className="group border-t border-slate-100 first:border-t-0">
                    <TableCell
                      colSpan={mesSelecionado ? 2 : 13}
                      className={cn(
                        "sticky left-0 z-10 border-y border-slate-200/70",
                        isSubmetido 
                          ? "bg-gradient-to-r from-indigo-50/90 to-indigo-50/70 text-indigo-900" 
                          : "bg-gradient-to-r from-blue-50/90 to-blue-50/70 text-blue-900",
                        "transition-colors duration-200"
                      )}
                    >
                      <div className="flex items-center gap-2 py-0.5">
                        <div className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium shadow-sm",
                          isSubmetido 
                            ? "bg-indigo-100 text-indigo-700" 
                            : "bg-blue-100 text-blue-700"
                        )}>
                          {projeto.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">{projeto.nome}</span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {Array.from(projeto.wps).map((wpId) => {
                    const wp = (isSubmetido ? alocacoes.submetido : alocacoes.real).find(
                      (a) => a.workpackage.id === wpId
                    )?.workpackage;

                    if (!wp) return null;

                    return (
                      <TableRow
                        key={`${projeto.id}-${wpId}`} 
                        className="group transition-all duration-200 ease-in-out hover:bg-slate-50/70"
                      >
                        <TableCell className={cn(
                          "px-4 py-2 align-middle text-sm sticky left-0 bg-white z-10 group-hover:bg-slate-50/70 transition-colors duration-200",
                          mesSelecionado && "max-w-0"
                        )}>
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              "h-1.5 w-1.5 rounded-full transition-colors duration-200",
                              isSubmetido ? "bg-indigo-400 group-hover:bg-indigo-500" : "bg-blue-400 group-hover:bg-blue-500"
                            )} />
                            <span className={cn(
                              "text-sm transition-colors duration-200 group-hover:text-slate-800",
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
                                "px-2 py-2 text-center align-middle transition-all duration-200",
                                mes % 2 === 0 ? "bg-slate-50/30" : "",
                                mesSelecionado && "w-[40%]",
                                !isSubmetido && temDiferenca && "bg-yellow-50/50"
                              )}
                            >
                              <div className="flex flex-col items-center">
                                {isSubmetido ? (
                                  <span className={cn(
                                    "text-sm",
                                    valorNum > 0 ? "font-medium text-indigo-700" : "text-slate-400"
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
                                      "h-8 text-center text-sm transition-all duration-200 focus:ring-2 focus:ring-offset-1",
                                      isEditing 
                                        ? "border-blue-300 bg-blue-50/60 shadow-sm ring-blue-200" 
                                        : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white",
                                      valorNum > 0 && "text-blue-700 font-medium",
                                      mesSelecionado && "text-base",
                                      temDiferenca && "border-yellow-300"
                                    )}
                                  />
                                )}
                                
                                {/* Modo comparação mostra a diferença */}
                                {modoComparacao && temDiferenca && (
                                  <div className={cn(
                                    "text-xs mt-1",
                                    diferenca > 0 ? "text-green-600" : "text-red-600"
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
            <TableFooter>
              <TableRow className="border-t border-slate-200">
                <TableCell className="bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-900 sticky left-0 z-10">
                  Total por Mês
                </TableCell>
                {getMeses().map((mes) => {
                  const totalReal = calcularTotal(alocacoes.real, mes);
                  const totalSubmetido = calcularTotal(alocacoes.submetido, mes);
                  const isDifferent = Math.abs(totalReal - totalSubmetido) >= 0.001;

                  return (
                    <TableCell
                      key={mes}
                      className={cn(
                        "bg-slate-50/80 px-2 py-3 text-center text-sm font-medium",
                        isDifferent && !isSubmetido ? "bg-yellow-50 text-yellow-700 border-b-2 border-yellow-300" : "",
                        !isDifferent && !isSubmetido ? "bg-green-50/40 text-green-700 border-b-2 border-green-300" : "",
                        mesSelecionado && "text-base"
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <span>{isSubmetido ? totalSubmetido.toFixed(2) : totalReal.toFixed(2)}</span>
                        
                        {/* Indicador visual de status para cada mês */}
                        {!isSubmetido && (
                          <div className="flex items-center mt-1 gap-1">
                            {isDifferent ? (
                              <span className="text-xs text-yellow-600 flex items-center">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Divergente
                              </span>
                            ) : (
                              <span className="text-xs text-green-600 flex items-center">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Correto
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Modo comparação para totais */}
                        {modoComparacao && isDifferent && (
                          <div className={cn(
                            "text-xs mt-1",
                            (totalReal > totalSubmetido) ? "text-green-600" : "text-red-600"
                          )}>
                            {isSubmetido 
                              ? "Ver alocações reais"
                              : (totalReal > totalSubmetido ? "+" : "") + (totalReal - totalSubmetido).toFixed(2)
                            }
                          </div>
                        )}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
              
              {!isSubmetido && (
                <TableRow className="border-t border-slate-200/50">
                  <TableCell className="bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-600 sticky left-0 z-10">
                    Total Submetido
                  </TableCell>
                  {getMeses().map((mes) => {
                    const totalSubmetido = calcularTotal(alocacoes.submetido, mes);
                    const totalReal = calcularTotal(alocacoes.real, mes);
                    const isDifferent = Math.abs(totalReal - totalSubmetido) >= 0.001;

                    return (
                      <TableCell
                        key={mes}
                        className={cn(
                          "bg-slate-50/80 px-2 py-3 text-center text-sm",
                          isDifferent 
                            ? "font-medium text-indigo-600 bg-indigo-50/40" 
                            : "text-slate-500",
                          mesSelecionado && "text-base"
                        )}
                      >
                        <div className="flex flex-col items-center">
                          <span>{totalSubmetido.toFixed(2)}</span>
                          {isDifferent && modoComparacao && (
                            <div className="text-xs mt-1 text-indigo-500">Objetivo</div>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              )}
            </TableFooter>
          </Table>
        </div>
        
        {/* Legenda */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <div className="flex items-center">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 mr-1.5">
                <Clock className="h-3 w-3" />
              </div>
              <span>Alocações Reais</span>
            </div>
            <div className="flex items-center">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 mr-1.5">
                <CheckCircle2 className="h-3 w-3" />
              </div>
              <span>Alocações Submetidas</span>
            </div>
            {modoComparacao && (
              <div className="flex items-center">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-yellow-700 mr-1.5">
                  <AlertCircle className="h-3 w-3" />
                </div>
                <span>Diferenças Destacadas</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de página que implementa a TabelaAlocacoes com obtenção direta de dados da API
export function AlocacoesPage() {
  const params = useParams();
  const username = params?.username as string;
  const currentYear = new Date().getFullYear();
  
  const [viewMode, setViewMode] = useState<"real" | "submetido">("real");
  const [ano, setAno] = useState(currentYear);
  
  // Obter alocações da API
  const { data, isLoading, error, refetch } = useAlocacoes(username, ano);
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>;
  }
  
  if (error || !data) {
    return <div className="flex flex-col items-center justify-center h-64 text-red-600">
      <AlertCircle className="h-8 w-8 mb-2" />
      <p>Erro ao carregar dados. Por favor, tente novamente.</p>
    </div>;
  }
  
  const handleSave = async (alocacoesReais: AlocacaoOriginal[]) => {
    // Implementar lógica de salvamento
    console.log("Salvando alocações:", alocacoesReais);
    // Após salvar, recarregar os dados
    await refetch();
  };
  
  return (
    <TabelaAlocacoes
      alocacoes={data}
      viewMode={viewMode}
      ano={ano}
      onSave={handleSave}
      singleYear={false}
    />
  );
}
