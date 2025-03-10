import { useState, useEffect } from "react";
import { useProjetoForm } from "../../ProjetoFormContext";
import { TabNavigation } from "../../components/TabNavigation";
import { Users, User, Calendar, ChevronLeft, ChevronRight, Plus, X, Percent, Briefcase, Clock, BarChart, PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { format, addMonths, differenceInMonths, isEqual } from "date-fns";
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

interface RecursosTabProps {
  onNavigateBack: () => void;
  onNavigateForward: () => void;
}

// Função para gerar meses entre datas
function gerarMesesEntreDatas(dataInicio: Date, dataFim: Date): {
  chave: string;
  nome: string;
  mesNumero: number;
  ano: number;
  data: Date;
  formatado: string;
}[] {
  const meses = [];
  const numMeses = differenceInMonths(dataFim, dataInicio) + 1;
  
  for (let i = 0; i < numMeses; i++) {
    const data = addMonths(dataInicio, i);
    const mesNumero = data.getMonth() + 1;
    const ano = data.getFullYear();
    const nome = format(data, 'MMM', { locale: pt });
    const chave = `${mesNumero}-${ano}`;
    const formatado = `${nome.charAt(0).toUpperCase() + nome.slice(1, 3)}/${String(ano).slice(2)}`;
    
    meses.push({
      chave,
      nome,
      mesNumero,
      ano,
      data,
      formatado
    });
  }
  
  return meses;
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
  
  // Verificar se há workpackages
  const hasWorkpackages = state.workpackages && state.workpackages.length > 0;
  
  // Verificar se podemos avançar (workpackages existem)
  const isValid = hasWorkpackages;
  
  // Obter workpackage selecionado
  const selectedWorkpackage = state.workpackages?.find(wp => wp.id === selectedWorkpackageId);

  // Depuração
  useEffect(() => {
    if (selectedWorkpackage) {
      console.log("WP selecionado:", selectedWorkpackage);
      console.log("Recursos no WP:", {
        recursos: selectedWorkpackage.recursos || [],
        alocacaoRecursos: selectedWorkpackage.alocacaoRecursos || []
      });
    }
  }, [selectedWorkpackage]);

  // Função auxiliar para obter os recursos do workpackage
  const getRecursosDoWorkpackage = (wp: any) => {
    // Verificar ambas as propriedades e usar a que tiver dados
    if (wp?.alocacaoRecursos?.length) {
      return wp.alocacaoRecursos;
    }
    
    return wp?.recursos || [];
  };

  return (
    <div className="flex flex-col min-h-[70vh]">
      <div className="p-6 flex-1">
        {/* Seleção de Workpackage */}
        <div className="mb-6">
          <Label className="text-sm text-azul/70 mb-2 block">Selecione um Workpackage</Label>
          <div className="flex gap-4 flex-wrap">
            {state.workpackages?.map(wp => {
              // Contar recursos já alocados - verificar ambas as propriedades
              const numRecursos = (wp.alocacaoRecursos?.length || 0) + (wp.recursos?.length || 0);
              const recursosUnicos = [...new Set([
                ...(wp.recursos || []).map(r => r.userId),
                ...(wp.alocacaoRecursos || []).map(r => r.userId)
              ])].length;
              
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
          <>
            {/* Dashboard de visualização das alocações existentes */}
            <DashboardAlocacoes 
              workpackage={selectedWorkpackage} 
              recursos={getRecursosDoWorkpackage(selectedWorkpackage)} 
              utilizadores={MEMBROS_EQUIPA}
              inicio={selectedWorkpackage.inicio ? new Date(selectedWorkpackage.inicio) : new Date()}
              fim={selectedWorkpackage.fim ? new Date(selectedWorkpackage.fim) : new Date(new Date().setMonth(new Date().getMonth() + 6))}
            />
            
            <div className="h-6" /> {/* Spacer */}
            
            <AlocacaoRecursos
              workpackageId={selectedWorkpackage.id}
              workpackageNome={selectedWorkpackage.nome || ""}
              inicio={selectedWorkpackage.inicio ? new Date(selectedWorkpackage.inicio) : new Date()}
              fim={selectedWorkpackage.fim ? new Date(selectedWorkpackage.fim) : new Date(new Date().setMonth(new Date().getMonth() + 6))}
              alocacaoRecursos={getRecursosDoWorkpackage(selectedWorkpackage)}
              utilizadores={MEMBROS_EQUIPA}
              onAddAlocacao={(workpackageId, alocacoes) => {
                alocacoes.forEach(alocacao => {
                  dispatch({
                    type: "ADD_RECURSO",
                    workpackageId,
                    recurso: {
                      ...alocacao,
                      workpackageId
                    }
                  });
                });
              }}
              onRemoveAlocacao={(workpackageId, userId, mes, ano) => {
                dispatch({
                  type: "REMOVE_RECURSO",
                  workpackageId,
                  userId,
                  mes,
                  ano
                });
              }}
            />
          </>
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

// Novo componente Dashboard de visualização
interface DashboardAlocacoesProps {
  workpackage: any;
  recursos: Array<{
    userId: string;
    mes: number;
    ano: number;
    ocupacao: number;
  }>;
  utilizadores: Array<{
    id: string;
    name: string | null;
    email: string | null;
  }>;
  inicio: Date;
  fim: Date;
}

function DashboardAlocacoes({ 
  workpackage, 
  recursos, 
  utilizadores,
  inicio,
  fim
}: DashboardAlocacoesProps) {
  // Verificação mais robusta de recursos vazios
  if (!recursos || !recursos.length) {
    console.log("Sem recursos para mostrar no Dashboard");
    return null;
  }
  
  console.log("Renderizando dashboard com recursos:", recursos);
  
  const mesesEntreDatas = gerarMesesEntreDatas(inicio, fim);
  
  // Agrupar recursos por utilizador
  const recursosPorUser = recursos.reduce((acc: Record<string, any>, recurso) => {
    if (!acc[recurso.userId]) {
      const user = utilizadores.find(u => u.id === recurso.userId);
      acc[recurso.userId] = {
        user,
        alocacoes: []
      };
    }
    
    acc[recurso.userId].alocacoes.push(recurso);
    return acc;
  }, {});
  
  // Calcular estatísticas de alocação
  const numUtilizadores = Object.keys(recursosPorUser).length;
  const totalAlocacoes = recursos.length;
  const mediaPorUtilizador = numUtilizadores ? (totalAlocacoes / numUtilizadores).toFixed(1) : 0;
  
  // Calcular ocupação média por mês
  const ocupacaoPorMes: Record<string, { total: number, count: number }> = {};
  recursos.forEach(recurso => {
    const chave = `${recurso.mes}-${recurso.ano}`;
    if (!ocupacaoPorMes[chave]) {
      ocupacaoPorMes[chave] = { total: 0, count: 0 };
    }
    ocupacaoPorMes[chave].total += recurso.ocupacao;
    ocupacaoPorMes[chave].count += 1;
  });
  
  return (
    <Card className="border-azul/10 shadow-lg bg-white/95 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Recursos Alocados ao Workpackage
        </CardTitle>
        <CardDescription>
          Visão geral das alocações de recursos para {workpackage.nome}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-4">
        {/* Estatísticas principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-azul/5 rounded-xl p-4 flex items-center">
            <div className="h-12 w-12 rounded-xl bg-azul/10 flex items-center justify-center mr-4">
              <Users className="h-6 w-6 text-azul" />
            </div>
            <div>
              <p className="text-sm text-azul/70">Recursos Alocados</p>
              <p className="text-2xl font-semibold text-azul">{numUtilizadores}</p>
            </div>
          </div>
          
          <div className="bg-azul/5 rounded-xl p-4 flex items-center">
            <div className="h-12 w-12 rounded-xl bg-azul/10 flex items-center justify-center mr-4">
              <Calendar className="h-6 w-6 text-azul" />
            </div>
            <div>
              <p className="text-sm text-azul/70">Total de Alocações</p>
              <p className="text-2xl font-semibold text-azul">{totalAlocacoes}</p>
            </div>
          </div>
          
          <div className="bg-azul/5 rounded-xl p-4 flex items-center">
            <div className="h-12 w-12 rounded-xl bg-azul/10 flex items-center justify-center mr-4">
              <Clock className="h-6 w-6 text-azul" />
            </div>
            <div>
              <p className="text-sm text-azul/70">Média de meses/recurso</p>
              <p className="text-2xl font-semibold text-azul">{mediaPorUtilizador}</p>
            </div>
          </div>
        </div>
        
        {/* Distribuição temporal das alocações */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-azul/70 mb-3">Distribuição Temporal de Recursos</h4>
          <div className="bg-azul/5 rounded-xl p-4">
            <div className="flex items-center">
              <ScrollArea className="w-full">
                <div className="min-w-[700px]">
                  <div className="flex">
                    {mesesEntreDatas.map(mes => (
                      <div key={mes.chave} className="flex-1 text-center">
                        <p className="text-xs text-azul/70 font-medium">
                          {mes.formatado}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="h-2 my-2"></div>
                  
                  {/* Timeline para cada recurso */}
                  {Object.entries(recursosPorUser).map(([userId, { user, alocacoes }]) => (
                    <div key={userId} className="flex items-center mt-2">
                      <div className="w-32 flex-shrink-0">
                        <p className="text-xs font-medium text-azul truncate">
                          {user?.name || "Utilizador"}
                        </p>
                      </div>
                      
                      <div className="flex flex-1">
                        {mesesEntreDatas.map(mes => {
                          const alocacao = alocacoes.find(
                            (a: any) => a.mes === mes.mesNumero && a.ano === mes.ano
                          );
                          
                          let bgColor = "bg-gray-100";
                          let textColor = "text-gray-400";
                          
                          if (alocacao) {
                            if (alocacao.ocupacao >= 0.8) {
                              bgColor = "bg-green-100";
                              textColor = "text-green-600";
                            } else if (alocacao.ocupacao >= 0.5) {
                              bgColor = "bg-blue-100";
                              textColor = "text-blue-600";
                            } else if (alocacao.ocupacao >= 0.3) {
                              bgColor = "bg-amber-100";
                              textColor = "text-amber-600";
                            } else {
                              bgColor = "bg-gray-100";
                              textColor = "text-gray-500";
                            }
                          }
                          
                          return (
                            <TooltipProvider key={mes.chave}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex-1 px-1">
                                    <div 
                                      className={`h-6 rounded-md ${alocacao ? bgColor : "bg-transparent"} 
                                        border ${alocacao ? "border-transparent" : "border-dashed border-gray-200"} 
                                        flex items-center justify-center`}
                                    >
                                      {alocacao && (
                                        <span className={`text-xs font-medium ${textColor}`}>
                                          {(alocacao.ocupacao * 100).toFixed(0)}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {alocacao ? (
                                    <div className="text-xs">
                                      <p><strong>{user?.name}</strong></p>
                                      <p>{mes.formatado}: {(alocacao.ocupacao * 100).toFixed(0)}% de alocação</p>
                                    </div>
                                  ) : (
                                    <div className="text-xs">
                                      <p><strong>{user?.name}</strong></p>
                                      <p>Sem alocação em {mes.formatado}</p>
                                    </div>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
        
        {/* Legenda */}
        <div className="flex justify-center gap-4 text-xs text-azul/70">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-100 mr-1"></div>
            <span>&gt;= 80%</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-100 mr-1"></div>
            <span>&gt;= 50%</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-amber-100 mr-1"></div>
            <span>&gt;= 30%</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gray-100 mr-1"></div>
            <span>&lt; 30%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AlocacaoRecursosProps {
  workpackageId: string;
  workpackageNome: string;
  inicio: Date;
  fim: Date;
  alocacaoRecursos: Array<{
    userId: string;
    mes: number;
    ano: number;
    ocupacao: number;
  }>;
  utilizadores: Array<{
    id: string;
    name: string | null;
    email: string | null;
  }>;
  onAddAlocacao: (workpackageId: string, alocacoes: Array<{
    userId: string;
    mes: number;
    ano: number;
    ocupacao: number;
  }>) => void;
  onRemoveAlocacao: (workpackageId: string, userId: string, mes: number, ano: number) => void;
}

function AlocacaoRecursos({ 
  workpackageId,
  workpackageNome,
  inicio,
  fim,
  alocacaoRecursos,
  utilizadores,
  onAddAlocacao,
  onRemoveAlocacao
}: AlocacaoRecursosProps) {
  const [addingRecurso, setAddingRecurso] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [novasAlocacoes, setNovasAlocacoes] = useState<Record<string, string>>({});
  const [anoSelecionado, setAnoSelecionado] = useState<string>("");

  const mesesEntreDatas = gerarMesesEntreDatas(inicio, fim);
  const mesesPorAno = mesesEntreDatas.reduce((acc, mes) => {
    const ano = mes.ano.toString();
    if (!acc[ano]) {
      acc[ano] = [];
    }
    acc[ano].push(mes);
    return acc;
  }, {} as Record<string, typeof mesesEntreDatas>);
  
  const anosDisponiveis = Object.keys(mesesPorAno).sort();

  // Definir o ano selecionado como o primeiro ano disponível
  useEffect(() => {
    if (anosDisponiveis.length > 0 && !anoSelecionado) {
      setAnoSelecionado(anosDisponiveis[0] || "");
    }
  }, [anosDisponiveis]);

  // Função para adicionar nova alocação
  const handleAddAlocacao = () => {
    if (!selectedUserId) {
      toast.error("Selecione um colaborador");
      return;
    }

    const alocacoesValidas = Object.entries(novasAlocacoes)
      .map(([mesAno, valor]) => {
        const numeroValido = parseFloat(valor.replace(',', '.'));
        if (!isNaN(numeroValido)) {
          const [mes, ano] = mesAno.split("-").map(Number);
          return {
            userId: selectedUserId,
            mes,
            ano,
            ocupacao: numeroValido
          };
        }
        return null;
      })
      .filter((alocacao): alocacao is { userId: string; mes: number; ano: number; ocupacao: number; } => alocacao !== null);

    if (alocacoesValidas.length === 0) {
      toast.error("Nenhuma alocação válida para adicionar");
      return;
    }

    onAddAlocacao(workpackageId, alocacoesValidas);
    setAddingRecurso(false);
    setNovasAlocacoes({});
    setSelectedUserId("");
    toast.success("Recurso alocado com sucesso");
  };

  // Função para preencher todos os meses com o mesmo valor
  const preencherTodosMeses = (valor: string) => {
    const novasAlocacoesTemp = { ...novasAlocacoes };
    mesesEntreDatas.forEach(mes => {
      novasAlocacoesTemp[mes.chave] = valor;
    });
    setNovasAlocacoes(novasAlocacoesTemp);
  };

  // Depuração
  useEffect(() => {
    console.log("AlocacaoRecursos recebeu:", alocacaoRecursos);
  }, [alocacaoRecursos]);

  return (
    <Card className="border border-azul/10 shadow-lg bg-white/95 backdrop-blur-sm p-6 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-azul/10 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-azul" />
          </div>
          <h3 className="text-lg font-medium text-azul">{workpackageNome}</h3>
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

      {addingRecurso && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-azul/10">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-azul/10 flex items-center justify-center">
                <User className="h-4 w-4 text-azul" />
              </div>
              <h4 className="text-base font-medium text-azul">Nova Alocação</h4>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setAddingRecurso(false);
                setNovasAlocacoes({});
                setSelectedUserId("");
              }}
              className="h-8 w-8 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm text-azul/70 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Colaborador
              </Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger className="w-full bg-white border-azul/20 focus:border-azul focus:ring-azul/20 rounded-xl">
                  <SelectValue placeholder="Selecionar colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {utilizadores?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email || "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUserId && (
              <div className="space-y-5 bg-azul/5 p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <Label className="text-sm text-azul/70 flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5" />
                    Alocação Mensal (0-1)
                  </Label>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => preencherTodosMeses("0.5")}
                        className="h-7 text-xs bg-white border-azul/20 hover:bg-azul/10 text-azul rounded-lg"
                      >
                        50%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => preencherTodosMeses("1")}
                        className="h-7 text-xs bg-white border-azul/20 hover:bg-azul/10 text-azul rounded-lg"
                      >
                        100%
                      </Button>
                    </div>
                    
                    <Separator orientation="vertical" className="h-6 bg-azul/10" />
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const indexAtual = anosDisponiveis.indexOf(anoSelecionado);
                          if (indexAtual > 0) {
                            const anoAnterior = anosDisponiveis[indexAtual - 1];
                            if (anoAnterior) {
                              setAnoSelecionado(anoAnterior);
                            }
                          }
                        }}
                        disabled={anosDisponiveis.indexOf(anoSelecionado) === 0}
                        className="h-7 w-7 p-0 rounded-full hover:bg-azul/10"
                      >
                        <ChevronLeft className="h-4 w-4 text-azul" />
                      </Button>
                      
                      <Badge variant="outline" className="bg-white font-semibold border-azul/20 text-azul px-3">
                        <Calendar className="h-3 w-3 mr-1" />
                        {anoSelecionado}
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const indexAtual = anosDisponiveis.indexOf(anoSelecionado);
                          if (indexAtual < anosDisponiveis.length - 1) {
                            const proximoAno = anosDisponiveis[indexAtual + 1];
                            if (proximoAno) {
                              setAnoSelecionado(proximoAno);
                            }
                          }
                        }}
                        disabled={anosDisponiveis.indexOf(anoSelecionado) === anosDisponiveis.length - 1}
                        className="h-7 w-7 p-0 rounded-full hover:bg-azul/10"
                      >
                        <ChevronRight className="h-4 w-4 text-azul" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <ScrollArea className="w-full">
                    <div className="grid grid-cols-6 gap-4">
                      {/* Janeiro a Junho */}
                      {mesesPorAno[anoSelecionado]?.filter(mes => mes.mesNumero <= 6).map(mes => (
                        <div key={mes.chave} className="flex flex-col items-center space-y-1">
                          <Label className="text-xs text-azul/70 font-medium">
                            {format(mes.data, 'MMM', { locale: pt }).charAt(0).toUpperCase() + 
                            format(mes.data, 'MMM', { locale: pt }).slice(1, 3)}/{String(mes.ano).slice(2)}
                          </Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            className="text-center h-9 w-20 text-sm bg-white border-azul/20 focus:border-azul focus:ring-azul/20 rounded-xl"
                            value={novasAlocacoes[mes.chave] || ""}
                            onChange={(e) => {
                              setNovasAlocacoes(prev => ({
                                ...prev,
                                [mes.chave]: e.target.value
                              }));
                            }}
                            placeholder="0,0"
                          />
                        </div>
                      ))}
                      
                      {/* Julho a Dezembro */}
                      {mesesPorAno[anoSelecionado]?.filter(mes => mes.mesNumero > 6).map(mes => (
                        <div key={mes.chave} className="flex flex-col items-center space-y-1">
                          <Label className="text-xs text-azul/70 font-medium">
                            {format(mes.data, 'MMM', { locale: pt }).charAt(0).toUpperCase() + 
                            format(mes.data, 'MMM', { locale: pt }).slice(1, 3)}/{String(mes.ano).slice(2)}
                          </Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            className="text-center h-9 w-20 text-sm bg-white border-azul/20 focus:border-azul focus:ring-azul/20 rounded-xl"
                            value={novasAlocacoes[mes.chave] || ""}
                            onChange={(e) => {
                              setNovasAlocacoes(prev => ({
                                ...prev,
                                [mes.chave]: e.target.value
                              }));
                            }}
                            placeholder="0,0"
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Resumo de alocação */}
                {Object.values(novasAlocacoes).some(v => parseFloat(v || "0") > 0) && (
                  <div className="mt-4 pt-4 border-t border-azul/10">
                    <Label className="text-xs text-azul/70 mb-2 block">Resumo de alocações:</Label>
                    <div className="flex flex-wrap gap-2">
                      {mesesEntreDatas
                        .filter(mes => parseFloat(novasAlocacoes[mes.chave] || "0") > 0)
                        .map(mes => (
                          <Badge 
                            key={mes.chave}
                            className="rounded-full px-2.5 py-1 text-xs bg-azul/10 text-azul border-azul/20"
                          >
                            {mes.formatado}: {(novasAlocacoes[mes.chave] || "0").replace('.', ',')}
                          </Badge>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setAddingRecurso(false);
                  setNovasAlocacoes({});
                  setSelectedUserId("");
                }}
                className="text-azul/60 hover:text-azul hover:bg-azul/10 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddAlocacao}
                disabled={!selectedUserId || Object.values(novasAlocacoes).every(v => v === "0" || v === "")}
                className="bg-azul text-white hover:bg-azul/90 rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Alocação
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="divide-y divide-azul/10">
        {(!alocacaoRecursos || !alocacaoRecursos.length) && (
          <div className="py-10 text-center text-azul/60">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-azul/5 flex items-center justify-center border border-azul/10">
                <Users className="h-8 w-8 text-azul/40" />
              </div>
              <div>
                <p className="font-medium text-azul/70">Nenhum recurso alocado</p>
                <p className="text-sm mt-1">Clique em "Adicionar Recurso" para começar</p>
              </div>
            </div>
          </div>
        )}

        {alocacaoRecursos && alocacaoRecursos.length > 0 && Object.entries(
          alocacaoRecursos.reduce((acc: Record<string, { user: any; alocacoes: Record<string, number> }>, alocacao) => {
            if (!alocacao) return acc; // Ignorar alocações undefined ou null
            
            const userId = alocacao.userId;
            if (!acc[userId]) {
              const user = utilizadores.find(u => u.id === userId);
              acc[userId] = {
                user,
                alocacoes: {}
              };
            }
            acc[userId].alocacoes[`${alocacao.mes}-${alocacao.ano}`] = Number(alocacao.ocupacao);
            return acc;
          }, {})
        ).map(([userId, { user, alocacoes }]) => (
          <div key={userId} className="py-5 space-y-3 hover:bg-azul/5 transition-colors px-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-azul/10 flex items-center justify-center border border-azul/20">
                  <User className="h-5 w-5 text-azul" />
                </div>
                <div>
                  <span className="font-medium text-azul block">
                    {user?.name || "Utilizador não encontrado"}
                  </span>
                  <span className="text-xs text-azul/60">
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
                      onRemoveAlocacao(
                        workpackageId, 
                        userId, 
                        mes || 1, 
                        ano || new Date().getFullYear()
                      );
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
              {mesesEntreDatas
                .filter(mes => Number(alocacoes[mes.chave] ?? 0) > 0)
                .map(mes => {
                  const valor = Number(alocacoes[mes.chave] ?? 0);
                  // Determinar a cor do badge com base no valor de alocação
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
    </Card>
  );
} 