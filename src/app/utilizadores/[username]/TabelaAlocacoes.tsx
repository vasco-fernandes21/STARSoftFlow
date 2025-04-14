"use client";

import React, { useMemo, useCallback } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Calendar, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { SelectField } from "@/components/projetos/criar/components/FormFields";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/trpc/react";
import { ProjetoEstado } from "@prisma/client";
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

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

export function TabelaAlocacoes({ alocacoes, viewMode, ano, onSave, singleYear }: TabelaProps) {
  const isSubmetido = viewMode === "submetido";
  const [anoSelecionado, setAnoSelecionado] = React.useState(ano);
  const [mesSelecionado, setMesSelecionado] = React.useState<number | null>(null);
  const [editValues, setEditValues] = React.useState<Map<string, string>>(new Map());
  const [loading, setLoading] = React.useState(false);

  const mesesFull = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  // Adicionar estado para exportar PDF
  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);

  // Importar API para gerar PDF
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

  // Obter username dos parâmetros da rota
  const params = useParams();
  const username = params?.username as string;

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

  const getMeses = React.useCallback(() => {
    if (mesSelecionado !== null) {
      return [mesSelecionado];
    }
    return Array.from({length:12}, (_,i)=> i+1);
  }, [mesSelecionado]);

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

  const getValor = useCallback((wpId: string, mes: number) => {
    const alocacao = alocacoes.real.find(a => a.workpackage.id === wpId && a.mes === mes && a.ano === anoSelecionado);
    return alocacao ? alocacao.ocupacao : 0;
  }, [alocacoes.real, anoSelecionado]);

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
    return arr.filter(a => a.ano === anoSelecionado && a.mes === mes).reduce((s, a) => s + a.ocupacao, 0);
  }, [anoSelecionado]);

  // Validação — só pode salvar se todos os meses baterem
  const podeSalvar = React.useMemo(() => {
    return getMeses().every(mes => 
      Math.abs(calcularTotal(alocacoes.real, mes) - calcularTotal(alocacoes.submetido, mes)) < 0.001
    );
  }, [alocacoes, getMeses, calcularTotal]);

  async function handleSave(){
    if(!podeSalvar)return;
    setLoading(true);
    try{
      await onSave(alocacoes.real);
    }finally{
      setLoading(false);
    }
  }

  return (
    <Card className={cn(
      "relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md transition-all hover:shadow-lg",
      isSubmetido && "bg-indigo-50/5"
    )}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <div className="flex items-center gap-2">
            <Badge variant={isSubmetido ? "outline" : "default"} className={cn(
              "h-6 rounded-full px-2 text-xs",
              isSubmetido 
                ? "border-indigo-200 bg-indigo-50 text-indigo-700" 
                : "bg-blue-600 text-white"
            )}>
              {isSubmetido ? "Submetido" : "Real"}
            </Badge>
            <Badge variant="outline" className="h-6 rounded-full border-slate-200 px-2 text-xs text-slate-600">
              <Calendar className="mr-1 h-3 w-3" /> {anoSelecionado}
            </Badge>
            {mesSelecionado && (
              <Badge variant="outline" className="h-6 rounded-full border-blue-200 bg-blue-50 px-2 text-xs text-blue-700">
                {mesesFull[mesSelecionado - 1]}
              </Badge>
            )}
            {!isSubmetido && !podeSalvar && (
              <Badge variant="destructive" className="h-6 rounded-full px-2 text-xs">
                <AlertCircle className="mr-1 h-3 w-3" />
                Totais Divergentes
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!singleYear && (
              <SelectField
                label=""
                value={anoSelecionado.toString()}
                onChange={v=>setAnoSelecionado(parseInt(v))}
                options={(alocacoes.anos ?? [ano]).map(a=>({label:`${a}`,value:`${a}`}))}
                className="w-[90px] text-sm"
              />
            )}
            
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
              className="w-[140px] text-sm"
            />
            
            {!isSubmetido && (
              <Button 
                onClick={handleSave} 
                disabled={!podeSalvar || loading}
                className={cn(
                  "h-7 gap-1.5 rounded-full px-3 text-sm transition-all duration-200",
                  podeSalvar 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "bg-slate-100 text-slate-400"
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
                className="h-7 gap-1.5 rounded-full px-3 text-sm transition-all duration-200 bg-azul text-white hover:bg-azul/90"
              >
                {isGeneratingPDF ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                <span>Exportar PDF</span>
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-auto">
          <Table className={cn(
            "border-separate border-spacing-y-0",
            mesSelecionado && "table-fixed"
          )}>
            <TableHeader>
              <TableRow className="border-b-0">
                <TableHead className={cn(
                  "bg-white/95 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500",
                  mesSelecionado ? "w-[60%]" : "w-[180px]"
                )}>
                  Projeto / Workpackage
                </TableHead>
                {getMeses().map((mes) => (
                  <TableHead
                    key={mes}
                    className={cn(
                      "sticky top-0 z-10 bg-white/95 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500",
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
                        "bg-slate-50/80 px-4 py-1.5",
                        isSubmetido ? "bg-indigo-50/50" : "bg-blue-50/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-lg text-xs font-medium shadow-sm",
                          isSubmetido 
                            ? "bg-indigo-100 text-indigo-700" 
                            : "bg-blue-100 text-blue-700"
                        )}>
                          {projeto.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm text-slate-700">{projeto.nome}</span>
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
                        className="group transition-all duration-150 ease-in-out hover:bg-slate-50/70"
                      >
                        <TableCell className={cn(
                          "px-4 py-1.5 align-middle text-xs",
                          mesSelecionado && "max-w-0"
                        )}>
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              "h-1 w-1 rounded-full",
                              isSubmetido ? "bg-indigo-400" : "bg-blue-400"
                            )} />
                            <span className={cn(
                              "text-slate-600",
                              mesSelecionado && "line-clamp-1"
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
                                "px-2 py-1.5 text-center align-middle",
                                mes % 2 === 0 ? "bg-slate-50/30" : "",
                                mesSelecionado && "w-[40%]"
                              )}
                            >
                              {isSubmetido ? (
                                <span className={cn(
                                  "text-xs",
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
                                    "h-6 text-center text-xs transition-all duration-200",
                                    isEditing 
                                      ? "border-blue-200 bg-blue-50/50 shadow-sm" 
                                      : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white",
                                    valorNum > 0 && "text-blue-700",
                                    mesSelecionado && "text-sm"
                                  )}
                                />
                              )}
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
                <TableCell className="bg-slate-50/80 px-4 py-2 text-xs font-medium text-slate-900">
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
                        "bg-slate-50/80 px-2 py-2 text-center text-xs font-medium",
                        isDifferent && !isSubmetido && "bg-red-50 text-red-600",
                        mesSelecionado && "text-sm"
                      )}
                    >
                      {isSubmetido ? totalSubmetido.toFixed(2) : totalReal.toFixed(2)}
                    </TableCell>
                  );
                })}
              </TableRow>
              
              {!isSubmetido && (
                <TableRow className="border-t border-slate-200/50">
                  <TableCell className="bg-slate-50/80 px-4 py-2 text-xs font-medium text-slate-600">
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
                          "bg-slate-50/80 px-2 py-2 text-center text-xs",
                          isDifferent 
                            ? "font-medium text-indigo-600" 
                            : "text-slate-500",
                          mesSelecionado && "text-sm"
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
      </CardContent>
    </Card>
  );
}
