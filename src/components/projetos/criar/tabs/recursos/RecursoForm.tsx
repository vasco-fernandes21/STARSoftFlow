import { useState, useEffect, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, differenceInMonths } from "date-fns";
import { pt } from "date-fns/locale";
import { Decimal } from "decimal.js";
import { ChevronLeft, ChevronRight, Calendar, User, Users, Percent, X, Plus, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RecursoFormProps {
  workpackageId: string;
  inicio: Date;
  fim: Date;
  utilizadores: Array<{ id: string; name: string; email: string; regime: string }>;
  onAddAlocacao: (workpackageId: string, alocacoes: Array<{
    userId: string;
    mes: number;
    ano: number;
    ocupacao: Decimal;
  }>) => void;
  onCancel: () => void;
}

type NovaAlocacao = {
  userId: string;
  mes: number;
  ano: number;
  ocupacao: number;
};

// Função auxiliar para gerar meses entre datas
function gerarMesesEntreDatas(dataInicio: Date, dataFim: Date): {
  chave: string;
  nome: string;
  mesNumero: number;
  ano: number;
  data: Date;
  formatado: string;
}[] {
  const meses = [];
  const dataAtual = new Date(dataInicio);
  dataAtual.setDate(1); // Iniciar no primeiro dia do mês

  while (dataAtual <= dataFim) {
    const mesNumero = dataAtual.getMonth() + 1;
    const ano = dataAtual.getFullYear();
    const nomeMes = format(dataAtual, 'MMMM', { locale: pt });
    
    meses.push({
      chave: `${mesNumero}-${ano}`,
      nome: nomeMes,
      mesNumero,
      ano,
      data: new Date(dataAtual),
      formatado: format(dataAtual, 'MMM/yyyy', { locale: pt })
    });
    
    dataAtual.setMonth(dataAtual.getMonth() + 1);
  }
  
  return meses;
}

// Função para converter valor de string (com vírgula ou ponto) para número
function parseValorOcupacao(valor: string): number {
  // Substituir vírgula por ponto para cálculos
  const valorNormalizado = valor.replace(',', '.');
  const num = parseFloat(valorNormalizado);
  
  if (isNaN(num)) return 0;
  if (num > 1) return 1;
  if (num < 0) return 0;
  
  return num;
}

// Função para formatar número para exibição (com vírgula)
function formatarValorOcupacao(valor: number): string {
  if (valor === 0) return "0";
  return valor.toString().replace('.', ',');
}

export function RecursoForm({ 
  workpackageId, 
  inicio, 
  fim, 
  utilizadores,
  onAddAlocacao, 
  onCancel 
}: RecursoFormProps) {
  // Estado para controlar o utilizador selecionado
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  
  // Estados para controlar o ano e mês visualizados no calendário
  const [anoAtual, setAnoAtual] = useState<number>(inicio.getFullYear());
  const [alocacoes, setAlocacoes] = useState<NovaAlocacao[]>([]);
  
  // Estados para controlar valores em formato de texto nos inputs
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [preencherTodosValue, setPreencherTodosValue] = useState<string>("");
  
  // Gerar lista de meses entre as datas
  const mesesDisponiveis = gerarMesesEntreDatas(inicio, fim);
  
  // Filtrar meses por ano atual
  const mesesDoAnoAtual = mesesDisponiveis.filter(mes => mes.ano === anoAtual);
  
  // Calcular anos disponíveis
  const anosDisponiveis = Array.from(new Set(mesesDisponiveis.map(mes => mes.ano))).sort();
  
  // Navegar entre anos
  const navegarAnoAnterior = () => {
    if (anosDisponiveis.includes(anoAtual - 1)) {
      setAnoAtual(anoAtual - 1);
    }
  };
  
  const navegarProximoAno = () => {
    if (anosDisponiveis.includes(anoAtual + 1)) {
      setAnoAtual(anoAtual + 1);
    }
  };
  
  // Atualizar alocação quando o utilizador mudar
  useEffect(() => {
    setAlocacoes([]);
    setInputValues({});
    setPreencherTodosValue("");
  }, [selectedUserId]);
  
  // Manipular alteração de ocupação
  const handleOcupacaoChange = (mes: number, ano: number, valor: string) => {
    const chave = `${mes}-${ano}`;
    
    // Atualizar o valor do input para manter o que o utilizador digitou
    setInputValues(prev => ({
      ...prev,
      [chave]: valor
    }));
    
    // Converter e validar o valor
    const ocupacao = parseValorOcupacao(valor);
    
    setAlocacoes(prev => {
      // Verificar se já existe uma alocação para o mês/ano
      const index = prev.findIndex(a => 
        a.userId === selectedUserId && a.mes === mes && a.ano === ano
      );
      
      if (index >= 0) {
        // Atualizar alocação existente
        const updated = [...prev];
        updated[index] = { ...updated[index], ocupacao };
        return updated;
      } else {
        // Adicionar nova alocação
        return [...prev, { userId: selectedUserId, mes, ano, ocupacao }];
      }
    });
  };
  
  // Preencher todos os meses com o mesmo valor
  const handlePreencherTodos = (valor: string) => {
    setPreencherTodosValue(valor);
    
    const ocupacao = parseValorOcupacao(valor);
    
    // Atualizar valores de input para todos os meses
    const novosInputValues: Record<string, string> = {};
    mesesDisponiveis.forEach(mes => {
      const chave = `${mes.mesNumero}-${mes.ano}`;
      novosInputValues[chave] = valor;
    });
    setInputValues(novosInputValues);
    
    // Criar novas alocações para todos os meses
    const novasAlocacoes = mesesDisponiveis.map(mes => ({
      userId: selectedUserId,
      mes: mes.mesNumero,
      ano: mes.ano,
      ocupacao
    }));
    
    setAlocacoes(novasAlocacoes);
  };
  
  // Obter o valor de ocupação para um mês/ano específico
  const getOcupacao = (mes: number, ano: number): number => {
    const alocacao = alocacoes.find(a => 
      a.userId === selectedUserId && a.mes === mes && a.ano === ano
    );
    return alocacao?.ocupacao || 0;
  };
  
  // Obter o valor do input para um mês/ano específico
  const getInputValue = (mes: number, ano: number): string => {
    const chave = `${mes}-${ano}`;
    return inputValues[chave] || "";
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
    
    // Converter para o formato esperado pelo onAddAlocacao
    const alocacoesFormatadas = alocacoesValidas.map(a => ({
      userId: a.userId,
      mes: a.mes,
      ano: a.ano,
      ocupacao: new Decimal(a.ocupacao)
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
  
  return (
    <Card className="border border-azul/10 shadow-sm rounded-xl overflow-hidden">
      <CardContent className="p-0">
        {/* Cabeçalho */}
        <div className="bg-azul/5 p-4 border-b border-azul/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-azul" />
            <span className="font-medium text-azul">Adicionar alocação de recurso</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onCancel}
            className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Seleção de utilizador */}
        <div className="p-4 border-b border-azul/10">
          <Label htmlFor="user-select" className="text-sm text-azul/70 mb-2 block">
            Selecione o utilizador
          </Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger id="user-select" className="rounded-lg border-azul/20">
              <SelectValue placeholder="Selecionar utilizador" />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              {utilizadores.map(user => (
                <SelectItem key={user.id} value={user.id} className="py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-azul/10 flex items-center justify-center">
                      <User className="h-3 w-3 text-azul" />
                    </div>
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.regime}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedUserId && (
          <>
            {/* Navegação de anos */}
            <div className="p-4 flex items-center justify-between border-b border-azul/10">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={navegarAnoAnterior}
                disabled={!anosDisponiveis.includes(anoAtual - 1)}
                className="h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {anoAtual - 1}
              </Button>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-azul/60" />
                <span className="font-medium">{anoAtual}</span>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={navegarProximoAno}
                disabled={!anosDisponiveis.includes(anoAtual + 1)}
                className="h-8 px-2"
              >
                {anoAtual + 1}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            
            {/* Alocação mensal */}
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <Label className="text-sm text-azul/70">Ocupação mensal (0-1)</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="preencher-todos" className="text-xs text-azul/70">
                    Preencher todos
                  </Label>
                  <Input
                    id="preencher-todos"
                    type="text"
                    placeholder="0,0"
                    value={preencherTodosValue}
                    onKeyDown={validarEntrada}
                    className="w-16 h-7 text-xs rounded-lg border-azul/20"
                    onChange={(e) => handlePreencherTodos(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {mesesDoAnoAtual.map(mes => {
                  const ocupacao = getOcupacao(mes.mesNumero, mes.ano);
                  // Determinar a cor com base no valor de ocupação
                  let bgColor = "bg-gray-50";
                  let textColor = "text-gray-600";
                  if (ocupacao >= 0.8) {
                    bgColor = "bg-green-50";
                    textColor = "text-green-600";
                  } else if (ocupacao >= 0.5) {
                    bgColor = "bg-blue-50";
                    textColor = "text-blue-600";
                  } else if (ocupacao >= 0.3) {
                    bgColor = "bg-amber-50";
                    textColor = "text-amber-600";
                  }
                  
                  return (
                    <div 
                      key={mes.chave} 
                      className={`p-3 rounded-lg border ${bgColor} border-slate-200 flex flex-col`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-sm font-medium capitalize ${textColor}`}>
                          {mes.nome}
                        </span>
                        <Badge variant="outline" className="h-5 text-xs">
                          {mes.ano}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Percent className="h-3 w-3 text-azul/40" />
                        <Input
                          type="text"
                          placeholder="0,0"
                          value={getInputValue(mes.mesNumero, mes.ano)}
                          onKeyDown={validarEntrada}
                          className="h-8 text-sm rounded-lg border-azul/20"
                          onChange={(e) => handleOcupacaoChange(mes.mesNumero, mes.ano, e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Legenda */}
              <div className="mt-4 flex items-center gap-4 justify-center text-xs text-azul/60">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-green-50 border border-green-200"></div>
                  <span>&ge; 80%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-blue-50 border border-blue-200"></div>
                  <span>&ge; 50%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-amber-50 border border-amber-200"></div>
                  <span>&ge; 30%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-gray-50 border border-gray-200"></div>
                  <span>&lt; 30%</span>
                </div>
              </div>
            </div>
            
            {/* Sumário */}
            <div className="p-4 bg-azul/5 border-t border-azul/10">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-azul/60 block">
                    Total de meses alocados: {alocacoes.filter(a => a.ocupacao > 0).length} de {mesesDisponiveis.length}
                  </span>
                  <span className="text-xs text-azul/60 block">
                    Ocupação média: {(alocacoes.reduce((acc, curr) => acc + curr.ocupacao, 0) / Math.max(alocacoes.length, 1)).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onCancel}
                    className="rounded-lg border-azul/20 text-azul"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleAddAlocacao}
                    className="rounded-lg bg-azul text-white hover:bg-azul/90"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
