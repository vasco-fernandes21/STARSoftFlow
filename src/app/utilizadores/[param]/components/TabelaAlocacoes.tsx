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
  Info,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SelectField } from "@/components/projetos/criar/components/FormFields";
import { api } from "@/trpc/react";
import type { ProjetoEstado } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePDFExport } from '@/hooks/usePDFExport';
import { toast } from "sonner";

interface AlocacaoAPIItem {
  workpackageId: string | null;
  workpackageNome: string | null;
  projetoId: string | null;
  projetoNome: string | null;
  projetoEstado?: ProjetoEstado | null;
  mes: number;
  ano: number;
  ocupacao: number;
}

export interface AlocacoesApiResponse {
  real: AlocacaoAPIItem[];
  submetido: AlocacaoAPIItem[];
  anos: number[];
  projetosIds: string[];
}

interface Projeto {
  id: string;
  nome: string;
  estado?: ProjetoEstado;
  wps: Set<string>;
}

interface AlocacaoOriginal {
  ano: number;
  mes: number;
  ocupacao: number;
  workpackage: { id: string | null; nome: string | null };
  projeto: { id: string | null; nome: string | null; estado?: ProjetoEstado };
}

interface AlocacoesData {
  real: AlocacaoOriginal[];
  submetido: AlocacaoOriginal[];
  pendente: AlocacaoOriginal[];
  anos: number[];
}

interface Props {
  userId: string;
}

export function TabelaAlocacoes({ userId }: Props) {
  const [viewMode, setViewMode] = useState<"real" | "submetido">("real");
  const isSubmetido = viewMode === "submetido";
  
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Map<string, string>>(new Map());
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const mesesFull = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  
  const { mutate: gerarPDF } = usePDFExport();

  const [isSaving, setIsSaving] = useState(false);

  const utils = api.useUtils();

  // CUID check function
  const isCUID = (id: string | undefined): boolean => {
    if (!id) return false;
    return id.length === 25; // Simplified check for 25 characters
  };

  const { 
    data: apiData, 
    isLoading: isLoadingAlocacoes, 
    error: alocacoesError,
    refetch: refetchAlocacoes 
  } = api.utilizador.alocacoes.findCompleto.useQuery(
    {
      userId,
      ano: anoSelecionado
    },
    {
      enabled: !!userId,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    }
  );
  
  const { 
    data: totaisAlocacoesProjetos, 
    isLoading: isLoadingTotaisAlocacoes 
  } = api.projeto.estatisticas.getTotalAlocacoes.useQuery(
    {
      projetoIds: apiData?.projetosIds ?? [],
      ano: anoSelecionado,
    },
    {
      enabled: !!apiData?.projetosIds && apiData.projetosIds.length > 0,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const updateManyMutation = api.utilizador.alocacoes.updateMany.useMutation({
    onSuccess: () => {
      toast.success("Alocações guardadas com sucesso!");
      refetchAlocacoes();
      utils.projeto.estatisticas.getTotalAlocacoes.invalidate();
      setEditValues(new Map());
    },
    onError: (error: any) => {
      toast.error(`Erro ao guardar alocações: ${error.message}`);
    },
    onSettled: () => {
      setIsSaving(false);
    }
  });

  const processedAlocacoes = useMemo<AlocacoesData>(() => {
    if (!apiData) {
      return { real: [], submetido: [], pendente: [], anos: [anoSelecionado] };
    }
    const mapApiItemToOriginal = (item: AlocacaoAPIItem): AlocacaoOriginal => ({
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
        estado: item.projetoEstado ?? undefined
      }
    });
    return {
      real: apiData.real.map(mapApiItemToOriginal),
      submetido: apiData.submetido?.map(mapApiItemToOriginal) || [],
      pendente: apiData.pendente?.map(mapApiItemToOriginal) || [],
      anos: apiData.anos && apiData.anos.length > 0 ? apiData.anos.filter((ano: number) => !isNaN(ano)) : [anoSelecionado]
    };
  }, [apiData, anoSelecionado]);

  const alocacoes = processedAlocacoes;

  const alocacoesSummary = useMemo(() => {
    if (!totaisAlocacoesProjetos || isLoadingTotaisAlocacoes || totaisAlocacoesProjetos.length === 0) {
      return null;
    }

    // Find projects with discrepancies
    const projetosComDiscrepancia = totaisAlocacoesProjetos
      .filter(item => Math.abs(item.totalAlocacoesReais - item.totalAlocacoesSubmetidas) > 0.01) // Use small epsilon for floating point comparison
      .map(item => ({
        nome: item.nome,
        reais: item.totalAlocacoesReais,
        submetidas: item.totalAlocacoesSubmetidas,
        diferenca: item.totalAlocacoesReais - item.totalAlocacoesSubmetidas
      }));

    if (projetosComDiscrepancia.length === 0) return null;

    return {
      projetosComDiscrepancia
    };
  }, [totaisAlocacoesProjetos, isLoadingTotaisAlocacoes]);

  const handleExportPDF = () => {
    if (mesSelecionado) {
      setIsGeneratingPDF(true);
      if (!userId) {
        alert('Erro: ID do Utilizador não encontrado. Certifique-se de estar na página correta do utilizador.');
        setIsGeneratingPDF(false);
        return;
      }
      gerarPDF({
        id: userId,
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

  const projetos = useMemo(() => {
    const projetosMap = new Map<string, Projeto>();
    const allAllocations = [
      ...alocacoes.real.filter((a: AlocacaoOriginal) => a.ano === anoSelecionado && a.workpackage.id !== null && a.workpackage.id !== ""),
      ...(alocacoes.submetido?.filter((a: AlocacaoOriginal) => a.ano === anoSelecionado && a.workpackage.id !== null && a.workpackage.id !== "") || [])
    ];
    
    allAllocations.forEach((a: AlocacaoOriginal) => {
      if (!a.projeto.id) return; // Ignorar alocações sem projeto (férias/ausências)
      
      if (!projetosMap.has(a.projeto.id)) {
        projetosMap.set(a.projeto.id, {
          id: a.projeto.id,
          nome: a.projeto.nome ?? "Sem nome",
          estado: a.projeto.estado,
          wps: new Set()
        });
      }
      const projeto = projetosMap.get(a.projeto.id);
      if (projeto && a.workpackage.id) {
        projeto.wps.add(a.workpackage.id);
      }
    });
    return Array.from(projetosMap.values());
  }, [alocacoes.real, alocacoes.submetido, anoSelecionado]);

  const getValorReal = useCallback((wpId: string, mes: number) => {
    const alocacao = alocacoes.real.find((a: AlocacaoOriginal) => 
      a.workpackage.id === wpId && 
      a.mes === mes && 
      a.ano === anoSelecionado
    );
    return alocacao ? alocacao.ocupacao : 0;
  }, [alocacoes.real, anoSelecionado]);

  const getValorSubmetido = useCallback((wpId: string, mes: number) => {
    if (!alocacoes.submetido) return 0;
    
    const alocacao = alocacoes.submetido.find((a: AlocacaoOriginal) => 
      a.workpackage.id === wpId && 
      a.mes === mes && 
      a.ano === anoSelecionado
    );
    return alocacao ? alocacao.ocupacao : 0;
  }, [alocacoes.submetido, anoSelecionado]);

  const getValor = useCallback((wpId: string, mes: number) => {
    return isSubmetido ? getValorSubmetido(wpId, mes) : getValorReal(wpId, mes);
  }, [isSubmetido, getValorReal, getValorSubmetido]);

  const getValorFerias = useCallback((mes: number) => {
    const alocacoes = isSubmetido ? processedAlocacoes.submetido : processedAlocacoes.real;
    if (!alocacoes) return 0;
    
    // Filtrar as alocações que não possuem workpackage (férias/ausências)
    const alocacaoFerias = alocacoes.find(a => 
      (a.workpackage.id === null || a.workpackage.id === "") && 
      a.mes === mes && 
      a.ano === anoSelecionado
    );
    
    return alocacaoFerias ? alocacaoFerias.ocupacao : 0;
  }, [isSubmetido, processedAlocacoes, anoSelecionado]);

  function handleInputChange(wpId: string, mes: number, e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    const key = wpId === "ferias" ? `ferias-${mes}-${anoSelecionado}` : `${wpId}-${mes}-${anoSelecionado}`;
    
    // Always store the value first, validation comes after
    setEditValues(prev => {
      const copy = new Map(prev);
      copy.set(key, value);
      return copy;
    });

    // If empty, we've already stored it, so return
    if (value === "") return;

    // Validate the input format
    if (value.startsWith("1")) {
      if (value !== "1") {
        setEditValues(prev => {
          const copy = new Map(prev);
          copy.delete(key); // Remove invalid value
          return copy;
        });
      }
    } 
    else if (value.startsWith("0")) {
      if (value === "0" || value === "0," || value.match(/^0,\d{0,2}$/)) {
        // Valid format, we keep it (already stored)
        return;
      } else {
        setEditValues(prev => {
          const copy = new Map(prev);
          copy.delete(key); // Remove invalid value
          return copy;
        });
      }
    } 
    else {
      setEditValues(prev => {
        const copy = new Map(prev);
        copy.delete(key); // Remove invalid value
        return copy;
      });
    }
  }

  const calcularTotal = useCallback((arr: AlocacaoOriginal[], mes: number) => {
    if (!arr) return 0;
    
    const valoresFixos = arr
      .filter(a => a.ano === anoSelecionado && a.mes === mes)
      .reduce((s, a) => s + a.ocupacao, 0);
      
    if (arr === alocacoes.submetido) {
      return valoresFixos;
    }
    
    let total = 0; // Iniciar do zero e calcular tudo
    
    // Processar todas as alocações regulares (com workpackageId)
    arr.forEach(a => {
      if (a.ano === anoSelecionado && a.mes === mes) {
        if (a.workpackage.id !== null) {
          const key = `${a.workpackage.id}-${mes}-${anoSelecionado}`;
          if (editValues.has(key)) {
            const editedValue = editValues.get(key) || "";
            const numValue = parseFloat(editedValue.replace(',', '.')) || 0;
            total += numValue;
          } else {
            total += a.ocupacao;
          }
        }
      }
    });
    
    // Adicionar férias/ausências ao total
    const feriasKey = `ferias-${mes}-${anoSelecionado}`;
    if (editValues.has(feriasKey)) {
      const editedValue = editValues.get(feriasKey) || "";
      const numValue = parseFloat(editedValue.replace(',', '.')) || 0;
      total += numValue;
    } else {
      // Procurar alocações de férias existentes
      const alocacaoFerias = arr.find(a => 
        (a.workpackage.id === null || a.workpackage.id === "") && 
        a.mes === mes && 
        a.ano === anoSelecionado
      );
      if (alocacaoFerias) {
        total += alocacaoFerias.ocupacao;
      }
    }
    
    return total;
  }, [anoSelecionado, editValues, alocacoes.submetido]);

  async function handleSave() {
    setIsSaving(true);

    if (!userId) {
      toast.error("ID do utilizador não encontrado. Não é possível guardar.");
      setIsSaving(false);
      return;
    }

    const payload: Array<{ workpackageId: string; userId: string; mes: number; ano: number; ocupacao: number }> = [];

    // Create a map of original values for easy lookup
    const originalValuesMap = new Map<string, number>();
    if (apiData?.real) {
      apiData.real.forEach((aloc: AlocacaoAPIItem) => {
        if (aloc.ano === anoSelecionado) {
          originalValuesMap.set(`${aloc.workpackageId}-${aloc.mes}`, aloc.ocupacao);
        }
      });
    }

    // Verificar se algum mês excede 100% de alocação
    const mesesParaValidar = new Set<number>();
    for (const [key, _] of editValues.entries()) {
      if (key.includes('-')) {
        const parts = key.split('-');
        if (parts.length >= 2) {
          const mes = parseInt(parts[parts.length-2] ?? "");
          if (!isNaN(mes)) {
            mesesParaValidar.add(mes);
          }
        }
      }
    }

    let temExcesso = false;
    for (const mes of mesesParaValidar) {
      const total = calcularTotal(alocacoes.real, mes);
      if (total > 1.0) {
        toast.error(`O mês ${mesesFull[mes-1]} excede 100% de alocação total (${(total*100).toFixed(1)}%). Por favor, ajuste as alocações.`);
        temExcesso = true;
        break;
      }
    }

    if (temExcesso) {
      setIsSaving(false);
      return;
    }

    // Debug: Log all edit values
    console.log('All edit values:', Array.from(editValues.entries()));

    // Iterate over edited values
    for (const [key, valueStr] of editValues.entries()) {
      // Debug: Log the current key being processed
      console.log('Processing key:', key);
      
      if (key.startsWith('ferias-')) {
        // Caso especial para férias/ausências (sem workpackageId)
        const parts = key.split('-');
        if (parts.length !== 3) {
          console.warn('Invalid ferias key format:', key);
          continue;
        }
        
        const [_, mesStr, anoStr] = parts;
        const mes = parseInt(mesStr ?? "");
        const ano = parseInt(anoStr ?? "");
        
        if (isNaN(mes) || isNaN(ano) || ano !== anoSelecionado) {
          console.warn('Invalid mes/ano for ferias:', { mes, ano, anoSelecionado });
          continue;
        }
        
        // Convert the edited value to a number, handling empty strings and commas
        let editedValue: number;
        if (valueStr.trim() === "") {
          editedValue = 0;
        } else {
          // Replace comma with dot and parse
          editedValue = parseFloat(valueStr.replace(',', '.'));
          if (isNaN(editedValue)) {
            console.warn('Invalid edited value for ferias:', valueStr);
            continue;
          }
        }
        
        const editedValueFixed = Number(editedValue.toFixed(2));
        
        payload.push({
          workpackageId: "", // Usando string vazia em vez de null para férias/ausências
          userId: userId,
          mes: mes,
          ano: anoSelecionado,
          ocupacao: editedValueFixed
        });
        
        continue; // Vá para a próxima iteração
      }
      
      // Extract workpackageId - it might contain hyphens, so we need to handle it differently
      const lastTwoHyphens = key.split('-').slice(-2);
      if (lastTwoHyphens.length !== 2) {
        console.warn('Invalid key format (not enough parts):', key);
        continue;
      }

      const [mesStr, anoStr] = lastTwoHyphens;
      const wpId = key.slice(0, key.length - (mesStr?.length ?? 0) - (anoStr?.length ?? 0) - 2); // -2 for the two hyphens

      if (!wpId || !mesStr || !anoStr) {
        console.warn('Invalid key parts:', { wpId, mesStr, anoStr });
        continue;
      }

      // Debug: Log the parsed parts
      console.log('Parsed parts:', { wpId, mesStr, anoStr });

      const mes = parseInt(mesStr ?? "");
      const ano = parseInt(anoStr ?? "");

      if (isNaN(mes) || isNaN(ano) || ano !== anoSelecionado) {
        console.warn('Invalid mes/ano:', { mes, ano, anoSelecionado });
        continue;
      }

      // Convert the edited value to a number, handling empty strings and commas
      let editedValue: number;
      if (valueStr.trim() === "") {
        editedValue = 0;
      } else {
        // Replace comma with dot and parse
        editedValue = parseFloat(valueStr.replace(',', '.'));
        if (isNaN(editedValue)) {
          console.warn('Invalid edited value:', valueStr);
          continue;
        }
      }

      // Get the original value (0 if it didn't exist)
      const originalValue = originalValuesMap.get(`${wpId}-${mes}`) ?? 0;

      // Compare the values with fixed precision to avoid floating point issues
      const originalValueFixed = Number(originalValue.toFixed(2));
      const editedValueFixed = Number(editedValue.toFixed(2));

      // Debug: Log the values being compared
      console.log('Values:', { originalValueFixed, editedValueFixed });

      // Always include in payload if the cell was edited (has blue border)
      payload.push({
        workpackageId: wpId,
        userId: userId,
        mes: mes,
        ano: anoSelecionado,
        ocupacao: editedValueFixed
      });
    }

    if (payload.length > 0) {
      console.log('Saving changes:', payload);
      updateManyMutation.mutate(payload);
    } else {
      toast.info("Nenhuma alteração para guardar.");
      setIsSaving(false);
    }
  }

  if (isLoadingAlocacoes) {
    return (
      <Card className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md">
        <CardHeader className="px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Alocação de Horas</h3>
        </CardHeader>
        <CardContent className="p-5 text-center text-slate-500 flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
          A carregar dados de alocação...
        </CardContent>
      </Card>
    );
  }

  if (alocacoesError) {
    return (
      <Card className="relative overflow-hidden rounded-xl border border-red-200 bg-red-50 shadow-md">
        <CardHeader className="px-5 py-4 bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200">
          <h3 className="text-lg font-semibold text-red-700">Erro ao Carregar Alocações</h3>
        </CardHeader>
        <CardContent className="p-5 text-center text-red-600">
          <p>Não foi possível carregar os dados de alocação.</p>
          <p className="text-sm">{alocacoesError.message}</p>
          <Button onClick={() => refetchAlocacoes()} variant="destructive" className="mt-4">Tentar Novamente</Button>
        </CardContent>
      </Card>
    );
  }

  const dropdownAnos = alocacoes.anos.length > 0 ? alocacoes.anos : [anoSelecionado];

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
        {alocacoesSummary && (
          <div className="px-5 py-3 border-b border-slate-100">
            <div className="bg-gradient-to-r from-amber-50 to-amber-100/70 border border-amber-200/70 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-start gap-3 p-4">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="bg-amber-100 h-9 w-9 rounded-full flex items-center justify-center shadow-sm">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                      Divergências de Alocação Detectadas
                      <Badge variant="outline" className="bg-amber-100/70 text-amber-700 border-amber-200 text-[10px] h-5 font-medium">
                        {anoSelecionado}
                      </Badge>
                    </h4>
                    <span className="text-xs text-amber-600 bg-amber-100/60 px-2 py-0.5 rounded-full border border-amber-200/60">
                      {alocacoesSummary.projetosComDiscrepancia.length} {alocacoesSummary.projetosComDiscrepancia.length === 1 ? 'projeto' : 'projetos'} com divergências
                    </span>
                  </div>
                  <p className="text-xs text-amber-700 mb-3">
                    As ETIs reais registradas diferem das ETIs submetidas nos seguintes projetos:
                  </p>
                  <div className="bg-white/60 rounded-lg border border-amber-200/40 overflow-hidden">
                    <table className="min-w-full divide-y divide-amber-200/60">
                      <thead className="bg-amber-50/80">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-amber-800 tracking-wider">Projeto</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-amber-800 tracking-wider w-[110px]">ETIs Reais</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-amber-800 tracking-wider w-[140px]">ETIs Submetidas</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-amber-800 tracking-wider w-[100px]">Diferença</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-amber-100/60">
                        {alocacoesSummary.projetosComDiscrepancia.map((projeto, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}>
                            <td className="px-3 py-2 text-xs text-amber-900 font-medium">
                              {projeto.nome}
                            </td>
                            <td className="px-3 py-2 text-xs text-center text-amber-900 font-medium">
                              {projeto.reais.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-xs text-center text-amber-900 font-medium">
                              {projeto.submetidas.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-xs text-center">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                projeto.diferenca < 0 
                                  ? "bg-red-100 text-red-700" 
                                  : "bg-blue-100 text-blue-700"
                              )}>
                                {projeto.diferenca < 0 ? "-" : "+"}{Math.abs(projeto.diferenca).toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-700">
                    <Info className="h-3.5 w-3.5 text-amber-500" />
                    <span>Valores positivos indicam excesso de ETIs reais; valores negativos indicam falta de ETIs reais em relação às submetidas.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Ano</label>
                    <SelectField
                      label=""
                      value={anoSelecionado.toString()}
                      onChange={v => {
                        setAnoSelecionado(parseInt(v));
                        setEditValues(new Map());
                      }}
                      options={dropdownAnos.map(a => ({ label: a.toString(), value: a.toString() }))}
                      className="w-full text-sm"
                    />
                  </div>
                  
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
                disabled={isSaving || editValues.size === 0}
                className={cn(
                  "h-9 gap-1 rounded-full px-4 text-sm transition-all duration-300 shadow-sm",
                  "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-md hover:from-blue-600 hover:to-blue-700",
                  (isSaving || editValues.size === 0) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSaving ? (
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
              {(() => {
                const alocacoesAnoAtual = {
                  real: alocacoes.real.filter(a => a.ano === anoSelecionado),
                  submetido: alocacoes.submetido.filter(a => a.ano === anoSelecionado)
                };
                
                if ((!apiData || (alocacoesAnoAtual.real.length === 0 && alocacoesAnoAtual.submetido.length === 0)) && !isLoadingAlocacoes) {
                  return (
                    <TableRow>
                      <TableCell colSpan={getMeses().length + 1} className="text-center py-10 text-slate-500">
                        Nenhuma alocação encontrada para o ano de {anoSelecionado}.
                      </TableCell>
                    </TableRow>
                  );
                }
                
                return projetos.map((projeto, projIndex) => {
                  const projectWps = Array.from(projeto.wps).map(wpId => {
                    const wpSource = isSubmetido ? alocacoes.submetido : alocacoes.real;
                    const alocacaoCorrespondente = wpSource.find(a => a.workpackage.id === wpId && a.ano === anoSelecionado);
                    return alocacaoCorrespondente ? alocacaoCorrespondente.workpackage : null;
                  }).filter(Boolean) as { id: string; nome: string }[];
                  
                  if (projectWps.length === 0 && apiData) return null; 

                  return (
                    <React.Fragment key={projeto.id}>
                      <TableRow className={cn(
                        "group",
                        projIndex > 0 ? "border-t border-slate-200" : ""
                      )}>
                        <TableCell
                          colSpan={mesSelecionado ? 2 : getMeses().length + 1}
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
                                        {valorNum > 0 ? valorNum.toFixed(2) : ""}
                                      </div>
                                    ) : (
                                      <Input
                                        type="text"
                                        value={isEditing ? editValues.get(`${wpId}-${mes}-${anoSelecionado}`) || "" : (valorNum > 0 ? valorNum.toFixed(2).replace(".", ",") : "")}
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
                });
              })()}
            </TableBody>
            
            <TableFooter className="sticky bottom-0 z-20 bg-slate-100/95 backdrop-blur-sm">
              <TableRow className="border-t border-slate-200 hover:bg-slate-50/70">
                <TableCell className={cn(
                  "px-4 py-3 text-sm font-medium text-slate-700 sticky left-0 z-10 bg-slate-50/80 transition-all duration-300 ease-in-out",
                  isSidebarCollapsed ? "w-[60px] min-w-[60px] text-center" : ""
                )}>
                  <span className={cn(isSidebarCollapsed && "hidden")}>Férias/Ausências</span>
                  {isSidebarCollapsed && <span title="Férias/Ausências">🏖️</span>}
                </TableCell>
                {getMeses().map((mes) => {
                  const valorFerias = getValorFerias(mes);
                  const feriasKey = `ferias-${mes}-${anoSelecionado}`;
                  const isEditing = editValues.has(feriasKey);
                  
                  return (
                    <TableCell
                      key={mes}
                      className={cn(
                        "px-3 py-2 text-center align-middle transition-all duration-200",
                        mes % 2 !== 0 ? "bg-slate-50/30" : "bg-white"
                      )}
                    >
                      {isSubmetido ? (
                        <div className={cn(
                          "flex items-center justify-center h-9 min-w-[80px] px-3 text-sm rounded-md",
                          valorFerias > 0 
                            ? "font-medium text-indigo-700 bg-indigo-50/60 border border-indigo-100" 
                            : "text-slate-400 bg-slate-50/50 border border-slate-100",
                          mesSelecionado && "text-base h-10 min-w-[100px]"
                        )}>
                          {valorFerias > 0 ? valorFerias.toFixed(2) : ""}
                        </div>
                      ) : (
                        <Input
                          type="text"
                          value={isEditing ? editValues.get(feriasKey) || "" : (valorFerias > 0 ? valorFerias.toFixed(2).replace(".", ",") : "")}
                          onChange={(e) => handleInputChange("ferias", mes, e)}
                          placeholder="0,00"
                          className={cn(
                            "h-9 min-w-[80px] text-center text-sm border rounded-md",
                            "focus:border-amber-300 focus:ring-1 focus:ring-amber-300 focus:outline-none",
                            "transition-all duration-200",
                            isEditing 
                              ? "bg-amber-50/60 border-amber-300 shadow-sm" 
                              : valorFerias > 0 
                                ? "bg-amber-50/30 border-amber-100 text-amber-700 font-medium" 
                                : "bg-slate-50/50 border-slate-100 text-slate-500",
                            mesSelecionado && "text-base h-10 min-w-[100px]"
                          )}
                        />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
              
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
                  
                  // Determinar cores baseadas na porcentagem de alocação
                  const excedeuLimite = totalAtual > 1.0;
                  const proximoDoLimite = totalAtual >= 0.95 && totalAtual <= 1.0;

                  return (
                    <TableCell
                      key={mes}
                      className={cn(
                        "px-3 py-3 text-center font-semibold",
                        isSubmetido 
                          ? excedeuLimite 
                            ? "bg-red-100/50 text-red-800 text-sm"
                            : proximoDoLimite
                              ? "bg-amber-100/40 text-amber-800 text-sm"
                              : "bg-indigo-100/40 text-indigo-800 text-sm" 
                          : excedeuLimite
                            ? "bg-red-100/50 text-red-800 text-sm"
                            : proximoDoLimite
                              ? "bg-amber-100/40 text-amber-800 text-sm"
                              : "bg-blue-100/40 text-blue-800 text-sm",
                        mesSelecionado && "text-base"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center",
                        mesSelecionado && "text-lg"
                      )}>
                        {excedeuLimite && <AlertTriangle className="h-3.5 w-3.5 text-red-600 mr-1.5" />}
                        {totalAtual.toFixed(2)}
                        {totalAtual > 0 && <span className="text-xs ml-1.5">({(totalAtual * 100).toFixed(0)}%)</span>}
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
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-amber-400 mr-1.5"></div>
              <span>Férias/Ausências</span>
            </div>
            <div className="flex items-center ml-auto">
              <AlertTriangle className="h-3 w-3 text-amber-500 mr-1" />
              <span>O total de alocações (incl. férias/ausências) não pode exceder 100%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
