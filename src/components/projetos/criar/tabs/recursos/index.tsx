import { useState, useEffect } from "react";
import { useProjetoForm } from "../../ProjetoFormContext";
import { TabNavigation } from "../../components/TabNavigation";
import { Users, User, Calendar, ChevronLeft, ChevronRight, Plus, X, Percent, Briefcase, Clock } from "lucide-react";
import { Card, CardContent, CardTitle, CardDescription, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { format, addMonths, differenceInMonths } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Decimal } from "decimal.js";
import { RecursoForm } from "./RecursoForm";
import { RecursoItem } from "./RecursoItem";
import { DashboardAlocacoes } from "./DashboardAlocacoes";
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
  
  // Verificar se há workpackages
  const hasWorkpackages = state.workpackages && state.workpackages.length > 0;
  
  // Verificar se podemos avançar (workpackages existem)
  const isValid = hasWorkpackages;
  
  // Obter workpackage selecionado
  const selectedWorkpackage = state.workpackages?.find(wp => wp.id === selectedWorkpackageId);

  // Função auxiliar para obter os recursos do workpackage
  const getRecursosDoWorkpackage = (wp: any) => {
    return wp?.recursos || [];
  };
  
  // Verificar se o workpackage selecionado tem recursos
  const hasRecursos = selectedWorkpackage && selectedWorkpackage.recursos && selectedWorkpackage.recursos.length > 0;

  return (
    <div className="flex flex-col min-h-[70vh]">
      <div className="p-4 flex-1">
        {/* Seleção de Workpackage */}
        <div className="mb-4">
          <Label className="text-sm text-azul/70 mb-2 block">Selecione um Workpackage</Label>
          <div className="flex gap-2 flex-wrap">
            {state.workpackages?.map(wp => {
              const numRecursos = wp.recursos?.length || 0;
              const recursosUnicos = [...new Set(
                (wp.recursos || []).map(r => r.userId)
              )].length;
              
              return (
                <Button
                  key={wp.id}
                  variant={selectedWorkpackageId === wp.id ? "default" : "outline"}
                  onClick={() => setSelectedWorkpackageId(wp.id)}
                  className={`rounded-xl px-4 py-2 flex items-center gap-2 ${
                    selectedWorkpackageId === wp.id 
                      ? "bg-azul text-white hover:bg-azul/90" 
                      : "bg-azul/10 hover:bg-azul/20 text-azul border-azul/20"
                  }`}
                >
                  <Briefcase className="h-4 w-4" />
                  <span>{wp.nome}</span>
                  {numRecursos > 0 && (
                    <Badge className="ml-1 bg-white/20 text-white text-xs">{recursosUnicos}</Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {!hasWorkpackages && (
          <Card className="border-azul/10 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-azul/30 mx-auto mb-4" />
              <CardTitle className="text-base mb-2">
                Nenhum Workpackage Disponível
              </CardTitle>
              <CardDescription>
                É necessário criar workpackages antes de alocar recursos.
                Volte à etapa anterior para adicionar workpackages ao projeto.
              </CardDescription>
              <Button 
                onClick={onNavigateBack}
                className="mt-6 bg-azul text-white hover:bg-azul/90 rounded-xl"
              >
                Voltar para Workpackages
              </Button>
            </CardContent>
          </Card>
        )}

        {hasWorkpackages && !selectedWorkpackageId && (
          <Card className="border-azul/10 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Briefcase className="h-12 w-12 text-azul/30 mx-auto mb-4" />
              <CardTitle className="text-base mb-2">
                Selecione um Workpackage
              </CardTitle>
              <CardDescription>
                Escolha um workpackage acima para começar a alocar recursos humanos.
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {selectedWorkpackage && (
          <div className="space-y-4">
            {/* Seção única com o dashboard e recursos */}
            <Card className="border border-azul/10 shadow-md bg-white/95 backdrop-blur-sm overflow-hidden rounded-xl">
              <CardHeader className="bg-gradient-to-r from-azul/5 to-azul/10 pb-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-azul/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-azul" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-azul">{selectedWorkpackage.nome}</CardTitle>
                      <CardDescription className="text-azul/60">
                        Alocação de Recursos Humanos
                      </CardDescription>
                    </div>
                  </div>
                  
                  {!addingRecurso && (
                    <Button
                      variant="outline"
                      onClick={() => setAddingRecurso(true)}
                      className="rounded-xl bg-azul/10 hover:bg-azul/20 text-azul border-azul/20"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Recurso
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="p-4">
                {addingRecurso && (
                  <div className="mb-6">
                    <RecursoForm 
                      workpackageId={selectedWorkpackage.id}
                      inicio={selectedWorkpackage.inicio ? new Date(selectedWorkpackage.inicio) : new Date()}
                      fim={selectedWorkpackage.fim ? new Date(selectedWorkpackage.fim) : new Date(new Date().setMonth(new Date().getMonth() + 6))}
                      utilizadores={MEMBROS_EQUIPA}
                      onAddAlocacao={(workpackageId, alocacoes) => {
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
                        toast.success("Recursos adicionados com sucesso");
                      }}
                      onCancel={() => setAddingRecurso(false)}
                    />
                  </div>
                )}

                {/* Conteúdo baseado na existência de recursos */}
                {hasRecursos ? (
                  <>
                    {/* Dashboard de visualização das alocações existentes */}
                    <DashboardAlocacoes 
                      workpackage={selectedWorkpackage} 
                      recursos={getRecursosDoWorkpackage(selectedWorkpackage)} 
                      utilizadores={MEMBROS_EQUIPA}
                      inicio={selectedWorkpackage.inicio ? new Date(selectedWorkpackage.inicio) : new Date()}
                      fim={selectedWorkpackage.fim ? new Date(selectedWorkpackage.fim) : new Date(new Date().setMonth(new Date().getMonth() + 6))}
                    />
                    
                    {/* Lista de recursos */}
                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-azul" />
                        <h3 className="font-medium text-azul">Recursos Alocados</h3>
                      </div>
                      
                      <div className="divide-y divide-azul/10">
                        {Object.entries(
                          selectedWorkpackage.recursos.reduce((acc: Record<string, { user: any; alocacoes: Record<string, number> }>, alocacao) => {
                            if (!alocacao) return acc; // Ignorar alocações undefined ou null
                            
                            const userId = alocacao.userId;
                            if (!acc[userId]) {
                              const user = MEMBROS_EQUIPA.find(u => u.id === userId);
                              acc[userId] = {
                                user,
                                alocacoes: {}
                              };
                            }
                            acc[userId].alocacoes[`${alocacao.mes}-${alocacao.ano}`] = Number(alocacao.ocupacao);
                            return acc;
                          }, {})
                        ).map(([userId, { user, alocacoes }]) => (
                          <div key={userId} className="py-4 space-y-3 hover:bg-azul/5 transition-colors px-4 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-azul/10 flex items-center justify-center border border-azul/20">
                                  <User className="h-5 w-5 text-azul" />
                                </div>
                                <div>
                                  <span className="font-medium text-azul block">
                                    {user?.name || "Utilizador não encontrado"}
                                  </span>
                                  <span className="text-xs text-azul/60 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {Object.keys(alocacoes).length} meses alocados
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const confirmed = window.confirm("Tem a certeza que deseja remover todas as alocações deste recurso?");
                                  if (confirmed) {
                                    Object.entries(alocacoes).forEach(([mesAno, _]) => {
                                      const [mes, ano] = mesAno.split("-").map(Number);
                                      dispatch({
                                        type: "REMOVE_ALOCACAO",
                                        workpackageId: selectedWorkpackage.id,
                                        userId,
                                        mes: mes || 1,
                                        ano: ano || new Date().getFullYear()
                                      });
                                    });
                                    toast.success("Alocações removidas com sucesso");
                                  }
                                }}
                                className="h-8 w-8 p-0 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Resumo de alocação */}
                            <div className="flex flex-wrap gap-2 pl-13">
                              {gerarMesesEntreDatas(
                                selectedWorkpackage.inicio ? new Date(selectedWorkpackage.inicio) : new Date(), 
                                selectedWorkpackage.fim ? new Date(selectedWorkpackage.fim) : new Date(new Date().setMonth(new Date().getMonth() + 6))
                              )
                                .filter(mes => Number(alocacoes[mes.chave] ?? 0) > 0)
                                .map(mes => {
                                  const valor = Number(alocacoes[mes.chave] ?? 0);
                                  let bgColor = "bg-azul/10";
                                  let textColor = "text-azul";
                                  let borderColor = "border-azul/20";
                                  
                                  if (valor >= 0.8) {
                                    bgColor = "bg-green-50";
                                    textColor = "text-green-600";
                                    borderColor = "border-green-200";
                                  } else if (valor >= 0.5) {
                                    bgColor = "bg-blue-50";
                                    textColor = "text-blue-600";
                                    borderColor = "border-blue-200";
                                  } else if (valor >= 0.3) {
                                    bgColor = "bg-amber-50";
                                    textColor = "text-amber-600";
                                    borderColor = "border-amber-200";
                                  } else {
                                    bgColor = "bg-gray-50";
                                    textColor = "text-gray-600";
                                    borderColor = "border-gray-200";
                                  }
                                  
                                  return (
                                    <Badge 
                                      key={mes.chave}
                                      className={`rounded-full px-2.5 py-1 text-xs ${bgColor} ${textColor} ${borderColor}`}
                                    >
                                      {mes.formatado}: {valor.toFixed(1).replace('.', ',')}
                                    </Badge>
                                  );
                                })
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  // Estado vazio - apenas uma mensagem centralizada
                  <div className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-20 w-20 rounded-full bg-azul/5 flex items-center justify-center border border-azul/10">
                        <Users className="h-10 w-10 text-azul/40" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-azul/70">Nenhum recurso alocado</p>
                        <p className="text-sm mt-1 text-azul/60 max-w-md mx-auto">
                          Ainda não existem recursos alocados a este workpackage. 
                          Adicione recursos utilizando o botão "Adicionar Recurso" acima.
                        </p>
                      </div>
                      {!addingRecurso && (
                        <Button
                          variant="outline"
                          onClick={() => setAddingRecurso(true)}
                          className="mt-4 rounded-xl bg-azul/10 hover:bg-azul/20 text-azul border-azul/20"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Recurso
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <TabNavigation
        onNext={onNavigateForward}
        onBack={onNavigateBack}
        backLabel="Anterior: Workpackages"
        nextLabel="Próximo: Resumo"
        isNextDisabled={!isValid}
      />
    </div>
  );
} 