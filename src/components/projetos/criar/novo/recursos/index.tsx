import { useState, useEffect } from "react";
import { useProjetoForm } from "../../ProjetoFormContext";
import { TabNavigation } from "../../components/TabNavigation";
import { Users, User, Calendar, ChevronLeft, ChevronRight, Plus, X, Percent, Briefcase, Clock, LayoutGrid, Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Decimal } from "decimal.js";
import { Form } from "./form";
import { gerarMesesEntreDatas } from "@/server/api/utils";

interface RecursosTabProps {
  onNavigateBack: () => void;
  onNavigateForward: () => void;
}

// Simulação de dados - em um cenário real, viriam da API
const MEMBROS_EQUIPA = [
  { id: "1", name: "Ana Silva", email: "ana.silva@exemplo.pt", regime: "INTEGRAL" },
  { id: "2", name: "João Santos", email: "joao.santos@exemplo.pt", regime: "PARCIAL" },
  { id: "3", name: "Maria Oliveira", email: "maria.oliveira@exemplo.pt", regime: "INTEGRAL" },
  { id: "4", name: "Ricardo Ferreira", email: "ricardo.ferreira@exemplo.pt", regime: "PARCIAL" },
];

export function RecursosTab({ onNavigateBack, onNavigateForward }: RecursosTabProps) {
  const { state, dispatch } = useProjetoForm();
  const [selectedWorkpackageId, setSelectedWorkpackageId] = useState<string>("");
  const [addingRecurso, setAddingRecurso] = useState(false);
  const [expandedRecursoId, setExpandedRecursoId] = useState<string | null>(null);
  const [recursoEmEdicao, setRecursoEmEdicao] = useState<{userId: string; alocacoes: any[]} | null>(null);
  
  // Verificar se há workpackages
  const hasWorkpackages = state.workpackages && state.workpackages.length > 0;
  
  // Verificar se podemos avançar (workpackages existem)
  const isValid = hasWorkpackages;
  
  // Obter workpackage selecionado
  const selectedWorkpackage = state.workpackages?.find(wp => wp.id === selectedWorkpackageId);
  
  // Verificar se o workpackage selecionado tem recursos
  const hasRecursos = selectedWorkpackage && selectedWorkpackage.recursos && selectedWorkpackage.recursos.length > 0;

  // Agrupar recursos por utilizador
  const recursosAgrupados = React.useMemo(() => {
    if (!selectedWorkpackage?.recursos || selectedWorkpackage.recursos.length === 0) {
      return {};
    }

    return selectedWorkpackage.recursos.reduce((acc: Record<string, { userId: string; alocacoes: any[] }>, alocacao) => {
      if (!alocacao) return acc;
      
      const userId = alocacao.userId;
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          alocacoes: []
        };
      }
      
      // Adiciona a alocação ao array de alocações do utilizador
      acc[userId].alocacoes.push({
        mes: alocacao.mes,
        ano: alocacao.ano,
        ocupacao: Number(alocacao.ocupacao ?? 0)
      });
      
      return acc;
    }, {});
  }, [selectedWorkpackage]);

  // Função para adicionar alocação
  const handleAddAlocacao = (workpackageId: string, alocacoes: Array<{
    userId: string;
    mes: number;
    ano: number;
    ocupacao: Decimal;
  }>) => {
    // Se estiver editando, primeiro remover as alocações existentes
    if (recursoEmEdicao) {
      dispatch({
        type: "REMOVE_RECURSO_COMPLETO",
        workpackageId,
        userId: recursoEmEdicao.userId
      });
      
      toast.success("Recurso atualizado com sucesso");
    } else {
      toast.success("Recurso adicionado com sucesso");
    }
    
    // Adicionar novas alocações
    alocacoes.forEach(alocacao => {
      dispatch({
        type: "ADD_ALOCACAO",
        workpackageId,
        alocacao: {
          ...alocacao,
          workpackageId
        }
      });
    });
    
    setAddingRecurso(false);
    setRecursoEmEdicao(null);
    setExpandedRecursoId(null);
  };

  // Função para remover recurso
  const handleRemoveRecurso = (workpackageId: string, userId: string, alocacoes: any[]) => {
    toast.warning("Tem certeza que deseja remover este recurso?", {
      action: {
        label: "Remover",
        onClick: () => {
          dispatch({
            type: "REMOVE_RECURSO_COMPLETO",
            workpackageId,
            userId
          });
          toast.success("Recurso removido com sucesso");
        }
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {} // Adicionando onClick para corrigir o erro de linter
      }
    });
  };

  // Resetar estados ao mudar de workpackage
  useEffect(() => {
    setAddingRecurso(false);
    setExpandedRecursoId(null);
    setRecursoEmEdicao(null);
  }, [selectedWorkpackageId]);

  // Função para agrupar alocações por ano e mês
  const getAlocacoesPorAnoMes = (alocacoes: any[]) => {
    const agrupadas: Record<string, Record<number, number>> = {};
    
    alocacoes.forEach(alocacao => {
      const ano = String(alocacao.ano);
      const mes = Number(alocacao.mes);
      const ocupacao = Number(alocacao.ocupacao ?? 0) * 100;
      
      if (!agrupadas[ano]) {
        agrupadas[ano] = {};
      }
      
      agrupadas[ano][mes] = ocupacao;
    });
    
    return agrupadas;
  };

  const excelDateToJS = (excelDate: number) => {
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return {
      mes: date.getMonth() + 1,
      ano: date.getFullYear()
    };
  };

  const formatarDataSegura = (ano: string | number, mes: string | number, formatString: string) => {
    try {
      const anoNum = Number(ano);
      const mesNum = Number(mes) - 1;
      
      if (isNaN(anoNum) || isNaN(mesNum) || mesNum < 0 || mesNum > 11) {
        return `${mes}/${ano}`;
      }
      
      const data = new Date(anoNum, mesNum);
      return format(data, formatString, { locale: pt });
    } catch (error) {
      console.error("Erro de formatação:", error, { mes, ano });
      return `${mes}/${ano}`;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-4rem)]">
      <div className="flex-1 flex">
        {/* Painel lateral de seleção de workpackage */}
        <div className="w-72 border-r border-azul/10 bg-white/90 p-4">
          <div className="mb-4 flex items-center">
            <Briefcase className="h-4 w-4 text-azul mr-2" />
            <span className="text-sm text-azul/70 font-medium">Workpackages</span>
          </div>
          
          {hasWorkpackages ? (
            <ScrollArea className="h-[calc(100vh-10rem)]">
              <div className="space-y-1">
                {state.workpackages?.map(wp => (
                  <div 
                    key={wp.id} 
                    className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                      selectedWorkpackageId === wp.id 
                        ? 'bg-azul text-white' 
                        : 'hover:bg-azul/5 text-azul'
                    }`}
                    onClick={() => setSelectedWorkpackageId(wp.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium truncate max-w-[180px]">{wp.nome}</div>
                      {wp.recursos?.length > 0 && (
                        <Badge variant={selectedWorkpackageId === wp.id ? "secondary" : "outline"} 
                          className={selectedWorkpackageId === wp.id ? "bg-white/20" : "bg-azul/5"}>
                          {[...new Set(wp.recursos.map(r => r.userId))].length}
                        </Badge>
                      )}
                    </div>
                    <div className={`text-xs mt-0.5 ${selectedWorkpackageId === wp.id ? 'text-white/70' : 'text-azul/60'}`}>
                      {wp.inicio && wp.fim ? (
                        `${format(new Date(wp.inicio), 'MMM/yy', { locale: pt })} - ${format(new Date(wp.fim), 'MMM/yy', { locale: pt })}`
                      ) : 'Sem período definido'}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-60 text-center">
              <Briefcase className="h-10 w-10 text-azul/20 mb-3" />
              <p className="text-sm text-azul/60 mb-4">
                Nenhum workpackage criado
              </p>
              <Button 
                onClick={onNavigateBack} 
                className="text-azul bg-azul/10 hover:bg-azul/20 border-none"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Criar Workpackages
              </Button>
            </div>
          )}
        </div>

        {/* Área principal de conteúdo */}
        <div className="flex-1 flex flex-col">
          {!hasWorkpackages ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Users className="h-16 w-16 text-azul/30 mb-4" />
              <h3 className="text-lg font-medium text-azul mb-2">
                Nenhum Workpackage Disponível
              </h3>
              <p className="text-azul/60 text-center max-w-md mb-6">
                É necessário criar workpackages antes de alocar recursos.
              </p>
              <Button 
                onClick={onNavigateBack}
                className="bg-azul text-white hover:bg-azul/90 rounded-xl"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Voltar para Workpackages
              </Button>
            </div>
          ) : !selectedWorkpackageId ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <LayoutGrid className="h-16 w-16 text-azul/30 mb-4" />
              <h3 className="text-lg font-medium text-azul mb-2">
                Selecione um Workpackage
              </h3>
              <p className="text-azul/60 text-center max-w-md">
                Escolha um workpackage para começar a alocar recursos.
              </p>
            </div>
          ) : (
            <>
              {/* Barra de ações */}
              <div className="bg-white border-b border-azul/10 p-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => {
                      setAddingRecurso(!addingRecurso);
                      setRecursoEmEdicao(null);
                      setExpandedRecursoId(null);
                    }}
                    className={`rounded-lg ${addingRecurso 
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200" 
                      : "bg-azul text-white hover:bg-azul/90"}`}
                    size="sm"
                  >
                    {addingRecurso ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Recurso
                      </>
                    )}
                  </Button>
                </div>
                <div className="text-sm text-azul/70">
                  {selectedWorkpackage && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(
                          selectedWorkpackage.inicio ? new Date(selectedWorkpackage.inicio) : new Date(),
                          'MMM/yyyy',
                          { locale: pt }
                        )} - {format(
                          selectedWorkpackage.fim ? new Date(selectedWorkpackage.fim) : new Date(new Date().setMonth(new Date().getMonth() + 6)),
                          'MMM/yyyy',
                          { locale: pt }
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Conteúdo principal */}
              <div className="flex-1 overflow-hidden">
                {/* Formulário expansível */}
                {addingRecurso && selectedWorkpackage && (
                  <div className="border-b border-azul/10 bg-slate-50 sticky top-[57px] z-10">
                    <Form 
                      workpackageId={selectedWorkpackage.id}
                      inicio={selectedWorkpackage.inicio ? new Date(selectedWorkpackage.inicio) : new Date()}
                      fim={selectedWorkpackage.fim ? new Date(selectedWorkpackage.fim) : new Date(new Date().setMonth(new Date().getMonth() + 6))}
                      utilizadores={MEMBROS_EQUIPA}
                      onAddAlocacao={handleAddAlocacao}
                      onCancel={() => {
                        setAddingRecurso(false);
                        setRecursoEmEdicao(null);
                      }}
                      recursoEmEdicao={recursoEmEdicao}
                    />
                  </div>
                )}
                
                {/* Lista de recursos */}
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  {Object.entries(recursosAgrupados).length > 0 ? (
                    <div className="p-4">
                      {/* Cabeçalho da tabela */}
                      <div className="bg-azul/5 py-3 px-4 rounded-t-lg border border-azul/10 mb-1 hidden md:flex">
                        <div className="flex-1 text-xs font-medium text-azul/70">Recurso</div>
                        <div className="flex-[2] text-xs font-medium text-azul/70">Alocações</div>
                        <div className="flex-none w-24 text-xs font-medium text-azul/70 text-right">Ações</div>
                      </div>
                      
                      {/* Linhas de recursos */}
                      <div className="space-y-1">
                        {Object.entries(recursosAgrupados).map(([userId, recurso]) => {
                          const membroEquipa = MEMBROS_EQUIPA.find(u => u.id === userId);
                          const isExpanded = expandedRecursoId === userId;
                          const alocacoesPorAnoMes = getAlocacoesPorAnoMes(recurso.alocacoes);
                          
                          return (
                            <div 
                              key={userId} 
                              className={`
                                border border-azul/10 rounded-lg bg-white overflow-hidden
                                ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'}
                                transition-shadow
                              `}
                            >
                              {/* Linha principal */}
                              <div 
                                className="px-4 py-3 flex items-center cursor-pointer"
                                onClick={() => {
                                  if (expandedRecursoId === userId) {
                                    setExpandedRecursoId(null);
                                  } else {
                                    setExpandedRecursoId(userId);
                                  }
                                }}
                              >
                                {/* Coluna do recurso */}
                                <div className="flex-1 flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-azul/10 flex items-center justify-center shrink-0">
                                    <User className="h-5 w-5 text-azul" />
                                  </div>
                                  <div>
                                    <h3 className="font-medium text-azul">{membroEquipa?.name}</h3>
                                    <div className="text-xs text-azul/60 flex items-center gap-1">
                                      <Badge variant="outline" className="px-1 py-0 text-[10px] h-4">
                                        {membroEquipa?.regime}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Coluna de alocações */}
                                <div className="flex-[2] hidden md:flex">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {Object.entries(alocacoesPorAnoMes).slice(0, 2).flatMap(([ano, meses]) => 
                                      Object.entries(meses).slice(0, 6).map(([mes, ocupacao]) => {
                                        let badgeClass = "bg-slate-50 text-slate-600 border-slate-200";
                                        
                                        if (ocupacao >= 80) {
                                          badgeClass = "bg-green-50 text-green-600 border-green-200";
                                        } else if (ocupacao >= 50) {
                                          badgeClass = "bg-blue-50 text-blue-600 border-blue-200";
                                        } else if (ocupacao >= 30) {
                                          badgeClass = "bg-amber-50 text-amber-600 border-amber-200";
                                        }
                                        
                                        return (
                                          <Badge 
                                            key={`${mes}-${ano}`}
                                            variant="outline"
                                            className={`${badgeClass} text-xs whitespace-nowrap`}
                                          >
                                            {formatarDataSegura(ano, mes, 'MMM/yyyy')}:
                                            {' '}
                                            {Math.round(ocupacao)}%
                                          </Badge>
                                        );
                                      })
                                    )}
                                    
                                    {recurso.alocacoes.length > 6 && !isExpanded && (
                                      <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-300 text-xs py-0.5">
                                        +{recurso.alocacoes.length - 6} mais
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Coluna de ações */}
                                <div className="flex-none w-24 flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRecursoEmEdicao(recurso);
                                      setAddingRecurso(true);
                                      setExpandedRecursoId(null);
                                    }}
                                    className="h-8 w-8 p-0 rounded-full text-azul hover:bg-azul/10"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (selectedWorkpackage) {
                                        handleRemoveRecurso(selectedWorkpackage.id, userId, recurso.alocacoes);
                                      }
                                    }}
                                    className="h-8 w-8 p-0 rounded-full hover:bg-red-50 hover:text-red-500"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-full text-azul/60 hover:bg-azul/10 hover:text-azul"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Área expandida - Visualização por anos/meses */}
                              {isExpanded && (
                                <div className="bg-azul/5 p-4 border-t border-azul/10">
                                  <div className="space-y-4">
                                    {Object.entries(alocacoesPorAnoMes).sort().map(([ano, meses]) => (
                                      <div key={ano} className="space-y-1">
                                        <h4 className="text-sm font-medium text-azul mb-2">{ano}</h4>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                          {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
                                            const ocupacao = meses[mes] || 0;
                                            let badgeClass = "bg-slate-50 text-slate-400 border-slate-200";
                                            let progressClass = "bg-slate-200";
                                            
                                            if (ocupacao >= 80) {
                                              badgeClass = "bg-green-50 text-green-600 border-green-100";
                                              progressClass = "bg-green-400";
                                            } else if (ocupacao >= 50) {
                                              badgeClass = "bg-blue-50 text-blue-600 border-blue-100";
                                              progressClass = "bg-blue-400";
                                            } else if (ocupacao >= 30) {
                                              badgeClass = "bg-amber-50 text-amber-600 border-amber-100";
                                              progressClass = "bg-amber-400";
                                            }
                                            
                                            return (
                                              <div 
                                                key={mes} 
                                                className={`
                                                  ${badgeClass} border rounded-md p-2
                                                  ${ocupacao === 0 ? 'opacity-50' : ''}
                                                `}
                                              >
                                                <div className="flex justify-between text-xs mb-1.5">
                                                  <span>
                                                    {formatarDataSegura(ano, mes, 'MMMM')}
                                                  </span>
                                                  <span className="font-medium">{ocupacao}%</span>
                                                </div>
                                                <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                                                  <div 
                                                    className={`h-full ${progressClass} rounded-full`}
                                                    style={{ width: `${ocupacao}%` }}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                      {!addingRecurso && (
                        <>
                          <Users className="h-12 w-12 text-azul/30 mb-4" />
                          <p className="text-azul/60 mb-6 max-w-md">
                            Este workpackage ainda não tem recursos alocados. 
                            Clique em "Adicionar Recurso" para começar.
                          </p>
                          <Button
                            onClick={() => setAddingRecurso(true)}
                            className="bg-azul text-white hover:bg-azul/90 rounded-lg"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Recurso
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navegação entre etapas */}
      <div className="border-t border-azul/10 bg-white/80 backdrop-blur-sm mt-auto">
        <TabNavigation
          onBack={onNavigateBack}
          onNext={onNavigateForward}
          isNextDisabled={!isValid}
          nextLabel="Avançar para Orçamento"
          backLabel="Voltar para Workpackages"
          className="max-w-screen-2xl mx-auto px-6"
        />
      </div>
    </div>
  );
} 