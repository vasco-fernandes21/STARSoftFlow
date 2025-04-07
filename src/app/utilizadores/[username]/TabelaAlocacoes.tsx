"use client";

import React from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Save, Loader2, CheckCircle2, XCircle, Calendar, FileText, Briefcase, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SelectField } from "@/components/projetos/criar/components/FormFields";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AlocacaoOriginal {
  ano: number;
  mes: number;
  ocupacao: number;
  workpackage: { id: string; nome: string };
  projeto: { id: string; nome: string };
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

// Definindo uma interface para trabalhar com projetos e workpackages
interface ProjetoInfo {
  nome: string;
  wps: Set<string>;
}

export function TabelaAlocacoes({ alocacoes, viewMode, ano, onSave, singleYear }: TabelaProps) {
  const isSubmetido = viewMode === "submetido";
  const [anoSelecionado, setAnoSelecionado] = React.useState(ano);
  const [mesSelecionado, setMesSelecionado] = React.useState<number | null>(null);
  const [editValues, setEditValues] = React.useState<Map<string, string>>(new Map());
  const [loading, setLoading] = React.useState(false);

  const mesesFull = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  function getMeses() {
    if (mesSelecionado !== null) {
      return [mesSelecionado];
    }
    return Array.from({length:12}, (_,i)=> i+1);
  }

  function getValor(wpId: string, mes: number): number {
    if (isSubmetido) {
      return alocacoes.submetido.find(a => a.ano===anoSelecionado && a.mes===mes && a.workpackage.id===wpId)?.ocupacao ?? 0;
    }
    const key = `${wpId}-${mes}-${anoSelecionado}`;
    if(editValues.has(key)){
      const val = editValues.get(key)!;
      // Handle empty or partial input cases
      if (val === "" || val === "0," || val === "0") return 0;
      return parseFloat(val.replace(",",".")) || 0;
    }
    return alocacoes.real.find(a => a.ano===anoSelecionado && a.mes===mes && a.workpackage.id===wpId)?.ocupacao ?? 0;
  }

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

  // Calcula total por mês para lista informada
  function calcularTotal(arr:AlocacaoOriginal[], mes: number) {
    // Para alocações submetidas, usamos o método antigo
    if (arr === alocacoes.submetido) {
      return arr.filter(a=>a.ano===anoSelecionado && a.mes===mes).reduce((s,a)=>s+a.ocupacao,0);
    }
    
    // Para alocações reais, calculamos com base nos valores editados
    if (arr === alocacoes.real) {
      // Pegar todos os workpackages disponíveis
      const workpackages = Array.from(
        projetos.entries()
      ).flatMap(([_, { wps }]) => Array.from(wps));
      
      // Calcular a soma usando getValor para cada workpackage
      return workpackages.reduce((sum, wpId) => {
        return sum + getValor(wpId, mes);
      }, 0);
    }
    
    // Caso padrão (não deve acontecer)
    return arr.filter(a=>a.ano===anoSelecionado && a.mes===mes).reduce((s,a)=>s+a.ocupacao,0);
  }

  function calcularTotalGeral(arr:AlocacaoOriginal[]){
    return arr.filter(a=>a.ano===anoSelecionado).reduce((s,a)=>s+a.ocupacao,0);
  }

  const projetos = React.useMemo(()=>{
    const map = new Map<string, ProjetoInfo>();
    (isSubmetido ? alocacoes.submetido : alocacoes.real).forEach(a=>{
      if(!map.has(a.projeto.id)){
        map.set(a.projeto.id,{nome:a.projeto.nome,wps:new Set()});
      }
      const projeto = map.get(a.projeto.id);
      if (projeto) {
        projeto.wps.add(a.workpackage.id);
      }
    });
    return map;
  },[alocacoes, anoSelecionado, isSubmetido]);

  // Validação — só pode salvar se todos os meses baterem
  const podeSalvar = React.useMemo(()=>{
    return getMeses().every(mes=> 
        Math.abs(calcularTotal(alocacoes.real, mes) - calcularTotal(alocacoes.submetido, mes)) < 0.001
    );
  },[alocacoes, anoSelecionado]);

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
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <Badge variant={isSubmetido ? "outline" : "default"} className={cn(
              "h-7 rounded-full px-3",
              isSubmetido 
                ? "border-indigo-200 bg-indigo-50 text-indigo-700" 
                : "bg-blue-600 text-white"
            )}>
              {isSubmetido ? "Submetido" : "Real"}
            </Badge>
            <Badge variant="outline" className="h-7 rounded-full border-slate-200 px-3 text-slate-600">
              <Calendar className="mr-1.5 h-3.5 w-3.5" /> {anoSelecionado}
            </Badge>
            {mesSelecionado && (
              <Badge variant="outline" className="h-7 rounded-full border-blue-200 bg-blue-50 px-3 text-blue-700">
                {mesesFull[mesSelecionado - 1]}
              </Badge>
            )}
            {!isSubmetido && !podeSalvar && (
              <Badge variant="destructive" className="h-7 rounded-full px-3">
                <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                Totais Divergentes
            </Badge>
          )}
          </div>
          
          <div className="flex items-center gap-3">
            {!singleYear && (
          <SelectField
                label=""
            value={anoSelecionado.toString()}
                onChange={v=>setAnoSelecionado(parseInt(v))}
                options={(alocacoes.anos ?? [ano]).map(a=>({label:`${a}`,value:`${a}`}))}
                className="w-[100px]"
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
              className="w-[160px]"
            />
            
            {!isSubmetido && (
              <Button 
                onClick={handleSave} 
                disabled={!podeSalvar || loading}
                className={cn(
                  "h-9 gap-2 rounded-full transition-all duration-200",
                  podeSalvar 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "bg-slate-100 text-slate-400"
                )}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Guardar</span>
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-auto">
          <Table className={cn(
            "border-separate border-spacing-y-0.5",
            mesSelecionado && "table-fixed"
          )}>
            <TableHeader>
              <TableRow className="border-b-0">
                <TableHead className={cn(
                  "bg-white/95 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500",
                  mesSelecionado ? "w-[60%]" : "w-[200px]"
                )}>
                  Projeto / Workpackage
                </TableHead>
                {getMeses().map((mes) => (
                  <TableHead
                    key={mes}
                    className={cn(
                      "sticky top-0 z-10 bg-white/95 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500",
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
              {Array.from(projetos.entries()).map(([projetoId, { nome: projetoNome, wps }]) => (
                <React.Fragment key={projetoId}>
                  {/* Project Row */}
                  <TableRow className="group border-t border-slate-100 first:border-t-0">
                    <TableCell
                      colSpan={mesSelecionado ? 2 : 13}
                      className={cn(
                        "bg-slate-50/80 px-6 py-2.5",
                        isSubmetido ? "bg-indigo-50/50" : "bg-blue-50/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium shadow-sm",
                          isSubmetido 
                            ? "bg-indigo-100 text-indigo-700" 
                            : "bg-blue-100 text-blue-700"
                        )}>
                          {projetoNome.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-700">{projetoNome}</span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Workpackage Rows */}
                  {Array.from(wps).map((wpId) => {
                    const wp = (isSubmetido ? alocacoes.submetido : alocacoes.real).find(
                      (a) => a.workpackage.id === wpId
                    )?.workpackage;

                    if (!wp) return null;

                    return (
                      <TableRow
                        key={`${projetoId}-${wpId}`} 
                        className={cn(
                          "group transition-all duration-150 ease-in-out hover:bg-slate-50/70",
                          "border-b-0"
                        )}
                      >
                        <TableCell className={cn(
                          "px-6 py-2.5 align-middle text-sm",
                          mesSelecionado && "max-w-0"
                        )}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-1.5 w-1.5 rounded-full",
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
                          const isEditing = editValues.has(`${wpId}-${mes}-${anoSelecionado}`);
                          
                          return (
                            <TableCell 
                              key={mes} 
                                  className={cn(
                                "px-3 py-2.5 text-center align-middle",
                                mes % 2 === 0 ? "bg-slate-50/30" : "",
                                mesSelecionado && "w-[40%]"
                              )}
                            >
                              {isSubmetido ? (
                                <span className={cn(
                                  "text-sm",
                                  valor > 0 ? "font-medium text-indigo-700" : "text-slate-400"
                                )}>
                                  {valor.toFixed(2)}
                                </span>
                              ) : (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Input
                                        type="text"
                                        value={isEditing ? editValues.get(`${wpId}-${mes}-${anoSelecionado}`) : valor.toFixed(2).replace(".", ",")}
                                        onChange={(e) => handleInputChange(wpId, mes, e)}
                                        placeholder="0,00"
                                        className={cn(
                                          "h-8 text-center transition-all duration-200",
                                          isEditing 
                                            ? "border-blue-200 bg-blue-50/50 shadow-sm" 
                                            : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white",
                                          valor > 0 && "text-blue-700",
                                          mesSelecionado && "text-lg"
                                        )}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      Valor em percentagem (0-100%)
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
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
                <TableCell className="bg-slate-50/80 px-6 py-3 text-sm font-medium text-slate-900">
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
                        "bg-slate-50/80 px-3 py-3 text-center text-sm font-medium",
                        isDifferent && !isSubmetido && "bg-red-50 text-red-600",
                        mesSelecionado && "text-lg"
                      )}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{isSubmetido ? totalSubmetido.toFixed(2) : totalReal.toFixed(2)}</span>
                          </TooltipTrigger>
                          {isDifferent && !isSubmetido && (
                            <TooltipContent>
                              <p className="text-xs">
                                Submetido: {totalSubmetido.toFixed(2)}
                                <br />
                                Real: {totalReal.toFixed(2)}
                              </p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                  </TableCell>
                  );
                })}
              </TableRow>
              
              {!isSubmetido && (
                <TableRow className="border-t border-slate-200/50">
                  <TableCell className="bg-slate-50/80 px-6 py-3 text-sm font-medium text-slate-600">
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
                          "bg-slate-50/80 px-3 py-3 text-center text-sm",
                          isDifferent 
                            ? "font-medium text-indigo-600" 
                            : "text-slate-500",
                          mesSelecionado && "text-lg"
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
