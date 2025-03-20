import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Decimal } from "decimal.js";
import { ChevronLeft, ChevronRight, Calendar, User, Percent, Save, Plus, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gerarMesesEntreDatas } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface FormProps {
  workpackageId: string;
  inicio: Date;
  fim: Date;
  utilizadores: Array<{ id: string; name: string; email: string; regime: string }>;
  onAddAlocacao: (workpackageId: string, alocacoes: Array<{
    userId: string;
    mes: number;
    ano: number;
    ocupacao: Decimal;
    user?: any;
  }>) => void;
  onCancel: () => void;
  recursoEmEdicao?: {
    userId: string;
    alocacoes: Array<{
      mes: number;
      ano: number;
      ocupacao: any;
    }>;
  } | null;
}

type NovaAlocacao = {
  userId: string;
  mes: number;
  ano: number;
  ocupacao: number;
};

// Atualizar a interface para as ocupações validadas
type OcupacaoMensal = {
  mes: number;
  ocupacaoAprovada: number;  // projetos com estado true
  ocupacaoPendente: number;  // projetos com estado false
};

// Função para converter valor para número
function parseValorOcupacao(valor: string): number {
  const valorNormalizado = valor.replace(',', '.');
  const num = parseFloat(valorNormalizado);
  
  if (isNaN(num)) return 0;
  if (num > 1) return 1;
  if (num < 0) return 0;
  
  return num;
}

export function Form({ 
  workpackageId, 
  inicio, 
  fim, 
  utilizadores,
  onAddAlocacao, 
  onCancel,
  recursoEmEdicao
}: FormProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [alocacoes, setAlocacoes] = useState<NovaAlocacao[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [preencherTodosValue, setPreencherTodosValue] = useState<string>("");
  const [ocupacoesMensais, setOcupacoesMensais] = useState<OcupacaoMensal[]>([]);
  
  // Gerar lista de meses e anos (mover para fora do useEffect)
  const mesesDisponiveis = gerarMesesEntreDatas(inicio, fim);
  const anosDisponiveis = Array.from(new Set(mesesDisponiveis.map(mes => mes.ano))).sort();
  
  // Atualizar o useEffect para buscar os dois tipos de ocupação
  useEffect(() => {
    if (selectedUserId) {
      const anoAtual = anosDisponiveis[0] || new Date().getFullYear();
      
      fetch(`/api/trpc/utilizador.getOcupacaoMensal?input=${JSON.stringify({
        userId: selectedUserId,
        ano: anoAtual
      })}`)
        .then(res => res.json())
        .then(data => {
          if (data?.result?.data) {
            setOcupacoesMensais(data.result.data.map((o: any) => ({
              mes: o.mes,
              ocupacaoAprovada: o.ocupacaoAprovada || 0,
              ocupacaoPendente: o.ocupacaoPendente || 0
            })));
          } else {
            setOcupacoesMensais([]);
          }
        })
        .catch(error => {
          console.error("Erro ao buscar ocupações:", error);
          setOcupacoesMensais([]);
        });
    }
  }, [selectedUserId]);
  
  // Carregar dados do recurso em edição
  useEffect(() => {
    if (recursoEmEdicao) {
      setSelectedUserId(recursoEmEdicao.userId);
      
      const novasAlocacoes: NovaAlocacao[] = [];
      const novosInputValues: Record<string, string> = {};
      
      recursoEmEdicao.alocacoes.forEach(alocacao => {
        const ocupacao = alocacao.ocupacao instanceof Decimal 
          ? alocacao.ocupacao.toNumber() 
          : typeof alocacao.ocupacao === 'string' 
            ? parseFloat(alocacao.ocupacao) 
            : Number(alocacao.ocupacao);

        // Se a ocupação já estiver em percentagem (> 1), não multiplicar por 100
        const ocupacaoFinal = ocupacao > 1 ? ocupacao : ocupacao * 100;
        
        novasAlocacoes.push({
          userId: recursoEmEdicao.userId,
          mes: alocacao.mes,
          ano: alocacao.ano,
          ocupacao: ocupacaoFinal / 100 // Armazenar como decimal (0-1)
        });
        
        const chave = `${alocacao.mes}-${alocacao.ano}`;
        novosInputValues[chave] = ocupacaoFinal.toString().replace('.', ',');
      });
      
      setAlocacoes(novasAlocacoes);
      setInputValues(novosInputValues);
    }
  }, [recursoEmEdicao]);
  
  // Manipular alteração de ocupação
  const handleOcupacaoChange = (mes: number, ano: number, valor: string) => {
    const chave = `${mes}-${ano}`;
    setInputValues(prev => ({ ...prev, [chave]: valor }));
    
    // Converter valor
    const ocupacao = parseValorOcupacao(valor);
    
    // Verificar ocupação total
    const ocupacaoValidada = ocupacoesMensais.find(
      o => o.mes === mes
    )?.ocupacaoAprovada || 0;
    
    // Se a ocupação total ultrapassar 100%, alertar o utilizador
    if (ocupacao + ocupacaoValidada > 1) {
      alert(`Atenção: A ocupação total para ${format(new Date(ano, mes - 1), 'MMMM', { locale: pt })} será de ${((ocupacao + ocupacaoValidada) * 100).toFixed(0)}%`);
    }
    
    setAlocacoes(prev => {
      const index = prev.findIndex(a => 
        a.userId === selectedUserId && a.mes === mes && a.ano === ano
      );
      
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = {
          userId: updated[index]!.userId,
          mes: updated[index]!.mes,
          ano: updated[index]!.ano,
          ocupacao: ocupacao
        };
        return updated;
      } else if (selectedUserId) {
        return [...prev, { userId: selectedUserId, mes, ano, ocupacao }];
      } else {
        return prev;
      }
    });
  };
  
  // Preencher todos os meses com o mesmo valor
  const handlePreencherTodos = () => {
    if (!preencherTodosValue || !selectedUserId) return;
    
    const ocupacao = parseValorOcupacao(preencherTodosValue);
    
    const novosInputValues: Record<string, string> = {};
    const novasAlocacoes: NovaAlocacao[] = [];
    
    mesesDisponiveis.forEach(mes => {
      const chave = `${mes.mesNumero}-${mes.ano}`;
      novosInputValues[chave] = preencherTodosValue;
      
      novasAlocacoes.push({
        userId: selectedUserId,
        mes: mes.mesNumero,
        ano: mes.ano,
        ocupacao
      });
    });
    
    setInputValues(novosInputValues);
    setAlocacoes(novasAlocacoes);
  };
  
  // Obter o valor do input para um mês/ano específico
  const getInputValue = (mes: number, ano: number): string => {
    const chave = `${mes}-${ano}`;
    return inputValues[chave] || "";
  };
  
  // Obter o valor de ocupação para um mês/ano específico
  const getOcupacao = (mes: number, ano: number): number => {
    const alocacao = alocacoes.find(a => 
      a.userId === selectedUserId && a.mes === mes && a.ano === ano
    );
    return alocacao?.ocupacao || 0;
  };
  
  // Adicionar alocações
  const handleAddAlocacao = () => {
    if (!selectedUserId) {
      alert("Por favor, selecione um utilizador");
      return;
    }
    
    // Filtrar apenas alocações com ocupação > 0
    const alocacoesValidas = alocacoes.filter(a => a.ocupacao > 0);
    
    if (alocacoesValidas.length === 0) {
      alert("Por favor, defina pelo menos uma alocação com valor maior que 0");
      return;
    }
    
    // Encontrar o utilizador selecionado
    const userSelecionado = utilizadores.find(user => user.id === selectedUserId);
    
    // Converter para o formato esperado pelo onAddAlocacao
    const alocacoesFormatadas = alocacoesValidas.map(a => ({
      userId: selectedUserId,
      mes: a.mes,
      ano: a.ano,
      ocupacao: new Decimal(a.ocupacao),
      user: userSelecionado
    }));
    
    onAddAlocacao(workpackageId, alocacoesFormatadas);
  };
  
  // Validar entrada apenas com números, vírgulas e pontos
  const validarEntrada = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const permitidos = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '.', 'Backspace', 'ArrowLeft', 'ArrowRight', 'Tab', 'Delete'];
    if (!permitidos.includes(e.key)) {
      e.preventDefault();
    }
  };
  
  // Atualizar a função que calcula a ocupação total
  const calcularOcupacoes = (mes: number, ano: number) => {
    const ocupacaoAtual = getOcupacao(mes, ano);
    const dadosMes = ocupacoesMensais.find(o => o.mes === mes) || {
      ocupacaoAprovada: 0,
      ocupacaoPendente: 0
    };

    return {
      atual: ocupacaoAtual,
      aprovada: dadosMes.ocupacaoAprovada,
      pendente: dadosMes.ocupacaoPendente,
      total: ocupacaoAtual + dadosMes.ocupacaoAprovada + dadosMes.ocupacaoPendente
    };
  };

  // Função para determinar o status da ocupação
  const getOcupacaoStatus = (ocupacaoTotal: number) => {
    if (ocupacaoTotal > 1) return "sobre-alocado";
    if (ocupacaoTotal >= 0.8) return "limite";
    return "normal";
  };

  return (
    <Card className="border-azul/10 hover:border-azul/20 transition-all overflow-hidden">
      {/* Cabeçalho do Form */}
      <div className="p-4 flex justify-between items-start border-b border-azul/10">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-azul/10 flex items-center justify-center">
            <User className="h-4 w-4 text-azul" />
          </div>
          <div>
            <h5 className="text-sm font-medium text-azul">
              {recursoEmEdicao ? "Editar Alocação" : "Adicionar Recurso"}
            </h5>
            <div className="text-xs text-azul/70 mt-1">
              <Badge variant="outline" className="px-2 py-0 text-[10px] h-4 bg-azul/5 text-azul/80 border-azul/20">
                {recursoEmEdicao ? "Edição" : "Novo"}
              </Badge>
            </div>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-500"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Conteúdo do Form */}
      <div className="p-6 bg-azul/5 space-y-6">
        {/* Seleção de utilizador - só mostrar se não estiver em edição */}
        {!recursoEmEdicao && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-md bg-azul/10 flex items-center justify-center">
                <User className="h-3 w-3 text-azul" />
              </div>
              <Label htmlFor="user" className="text-xs font-medium text-azul/80">
                Selecione um recurso
              </Label>
            </div>
            <Select 
              value={selectedUserId} 
              onValueChange={setSelectedUserId}
            >
              <SelectTrigger id="user" className="w-full border-azul/20 h-10">
                <SelectValue placeholder="Selecione um utilizador" />
              </SelectTrigger>
              <SelectContent>
                {utilizadores.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-azul/10 flex items-center justify-center">
                        <User className="h-3 w-3 text-azul" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-xs text-azul/60">{user.regime}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Mostrar o resto do conteúdo apenas se houver um utilizador selecionado ou estiver em edição */}
        {(selectedUserId || recursoEmEdicao) && (
          <>
            {/* Preencher todos */}
            <div className="bg-white rounded-lg p-4 border border-azul/10 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md bg-azul/10 flex items-center justify-center">
                  <Percent className="h-3 w-3 text-azul" />
                </div>
                <Label htmlFor="preencherTodos" className="text-xs font-medium text-azul/80">
                  Preencher todos os meses
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  id="preencherTodos"
                  type="text"
                  value={preencherTodosValue}
                  onChange={(e) => setPreencherTodosValue(e.target.value)}
                  onKeyDown={validarEntrada}
                  className="h-9 text-center w-20 border-azul/20"
                  placeholder="0,5"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePreencherTodos}
                  className="h-9 px-4"
                >
                  Aplicar a todos
                </Button>
              </div>
            </div>

            {/* Alocações por mês */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md bg-azul/10 flex items-center justify-center">
                  <Calendar className="h-3 w-3 text-azul" />
                </div>
                <span className="text-xs font-medium text-azul/80">Alocações mensais</span>
              </div>

              <Tabs defaultValue={anosDisponiveis[0]?.toString()} className="bg-white rounded-lg p-4 border border-azul/10">
                <TabsList className="h-8 mb-4">
                  {anosDisponiveis.map(ano => (
                    <TabsTrigger key={ano} value={ano.toString()} className="text-xs px-3">
                      {ano}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {anosDisponiveis.map(ano => (
                  <TabsContent key={ano} value={ano.toString()} className="mt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {mesesDisponiveis
                        .filter(mes => mes.ano === ano)
                        .map(mes => {
                          const ocupacoes = calcularOcupacoes(mes.mesNumero, mes.ano);
                          const status = getOcupacaoStatus(ocupacoes.total);
                          
                          // Classes condicionais baseadas no status
                          const statusClasses = {
                            "sobre-alocado": {
                              bg: "bg-red-50",
                              text: "text-red-600",
                              border: "border-red-100",
                              progress: "bg-red-400"
                            },
                            "limite": {
                              bg: "bg-amber-50",
                              text: "text-amber-600",
                              border: "border-amber-100",
                              progress: "bg-amber-400"
                            },
                            "normal": {
                              bg: ocupacoes.atual >= 0.8 ? "bg-green-50" : 
                                  ocupacoes.atual >= 0.5 ? "bg-blue-50" : 
                                  ocupacoes.atual >= 0.3 ? "bg-amber-50" : "bg-gray-50",
                              text: ocupacoes.atual >= 0.8 ? "text-green-600" :
                                    ocupacoes.atual >= 0.5 ? "text-blue-600" :
                                    ocupacoes.atual >= 0.3 ? "text-amber-600" : "text-gray-600",
                              border: ocupacoes.atual >= 0.8 ? "border-green-100" :
                                      ocupacoes.atual >= 0.5 ? "border-blue-100" :
                                      ocupacoes.atual >= 0.3 ? "border-amber-100" : "border-gray-200",
                              progress: ocupacoes.atual >= 0.8 ? "bg-green-400" :
                                        ocupacoes.atual >= 0.5 ? "bg-blue-400" :
                                        ocupacoes.atual >= 0.3 ? "bg-amber-400" : "bg-gray-200"
                            }
                          }[status];

                          return (
                            <div 
                              key={mes.chave} 
                              className={`${statusClasses.bg} ${statusClasses.border} border rounded-md p-2`}
                            >
                              <div className="flex justify-between text-xs mb-1.5">
                                <span className={statusClasses.text}>
                                  {format(new Date(mes.ano, mes.mesNumero - 1), 'MMM', { locale: pt })}
                                </span>
                                <div className="flex flex-col items-end">
                                  <span className={`font-medium ${statusClasses.text}`}>
                                    {(ocupacoes.atual * 100).toFixed(0)}%
                                  </span>
                                  <span className="text-[10px] text-green-600">
                                    Aprovado: {(ocupacoes.aprovada * 100).toFixed(0)}%
                                  </span>
                                  <span className="text-[10px] text-amber-600">
                                    Pendente: {(ocupacoes.pendente * 100).toFixed(0)}%
                                  </span>
                                  <span className="text-[10px] text-azul/60">
                                    Total: {(ocupacoes.total * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>

                              {/* Barras de progresso */}
                              <div className="space-y-1">
                                {/* Ocupação atual (sendo inserida) */}
                                <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${statusClasses.progress} rounded-full transition-all duration-300`}
                                    style={{ width: `${ocupacoes.atual * 100}%` }}
                                  />
                                </div>
                                {/* Ocupação aprovada */}
                                <div className="h-1 bg-white/50 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-green-400 rounded-full transition-all duration-300"
                                    style={{ width: `${ocupacoes.aprovada * 100}%` }}
                                  />
                                </div>
                                {/* Ocupação pendente */}
                                <div className="h-1 bg-white/50 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                                    style={{ width: `${ocupacoes.pendente * 100}%` }}
                                  />
                                </div>
                              </div>

                              <div className="mt-2 flex items-center">
                                <Input
                                  type="text"
                                  value={getInputValue(mes.mesNumero, mes.ano)}
                                  onChange={(e) => handleOcupacaoChange(mes.mesNumero, mes.ano, e.target.value)}
                                  onKeyDown={validarEntrada}
                                  className={`h-7 text-xs text-center ${
                                    status === "sobre-alocado" ? "border-red-300 focus:border-red-500" : ""
                                  }`}
                                  placeholder="0,0"
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
            
            {/* Legenda */}
            <div className="bg-white rounded-lg p-4 border border-azul/10 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md bg-azul/10 flex items-center justify-center">
                  <Briefcase className="h-3 w-3 text-azul" />
                </div>
                <h6 className="text-xs font-medium text-azul/80">Legenda</h6>
              </div>
              
              <div className="flex flex-wrap gap-4 text-xs text-azul/60">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-azul/30" />
                  <span>Ocupação total</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span>Sobre-alocação</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span>Próximo do limite</span>
                </div>
              </div>
            </div>
            
            {/* Estatísticas */}
            <div className="bg-white rounded-lg p-4 border border-azul/10 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md bg-azul/10 flex items-center justify-center">
                  <Briefcase className="h-3 w-3 text-azul" />
                </div>
                <h6 className="text-xs font-medium text-azul/80">Estatísticas de Ocupação</h6>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-azul/70">Meses alocados</span>
                    <span className="text-azul font-medium">
                      {alocacoes.filter(a => a.ocupacao > 0).length}/{mesesDisponiveis.length}
                    </span>
                  </div>
                  <div className="h-1.5 bg-azul/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-azul/50 rounded-full transition-all duration-500"
                      style={{ width: `${(alocacoes.filter(a => a.ocupacao > 0).length / mesesDisponiveis.length) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-azul/70">Ocupação média</span>
                    <span className="text-azul font-medium">
                      {(alocacoes.reduce((acc, curr) => acc + curr.ocupacao, 0) / 
                       Math.max(1, alocacoes.filter(a => a.ocupacao > 0).length) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-azul/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-azul/50 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, alocacoes.reduce((acc, curr) => acc + curr.ocupacao, 0) / 
                       Math.max(1, alocacoes.filter(a => a.ocupacao > 0).length) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Botões de ação */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onCancel}
                className="h-10 px-4 rounded-lg"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddAlocacao}
                className="h-10 px-4 rounded-lg bg-azul hover:bg-azul/90"
              >
                {recursoEmEdicao ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Alterações
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Recurso
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
} 