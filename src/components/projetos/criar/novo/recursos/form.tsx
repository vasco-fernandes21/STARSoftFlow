import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Decimal } from "decimal.js";
import { ChevronLeft, ChevronRight, Calendar, User, Percent, Save, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gerarMesesEntreDatas } from "@/server/api/utils";

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
  
  // Gerar lista de meses e anos
  const mesesDisponiveis = gerarMesesEntreDatas(inicio, fim);
  const anosDisponiveis = Array.from(new Set(mesesDisponiveis.map(mes => mes.ano))).sort();
  
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
        
        novasAlocacoes.push({
          userId: recursoEmEdicao.userId,
          mes: alocacao.mes,
          ano: alocacao.ano,
          ocupacao
        });
        
        const chave = `${alocacao.mes}-${alocacao.ano}`;
        novosInputValues[chave] = ocupacao.toString().replace('.', ',');
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
    
    // Converter para o formato esperado pelo onAddAlocacao
    const alocacoesFormatadas = alocacoesValidas.map(a => ({
      userId: selectedUserId,
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
    <div className="space-y-5 p-5 bg-white rounded-xl border border-azul/10">
      {/* Seleção de utilizador */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-azul/60" />
          <Label htmlFor="user" className="text-sm text-azul/70">
            Selecione um recurso
          </Label>
        </div>
        <Select 
          value={selectedUserId} 
          onValueChange={setSelectedUserId}
          disabled={!!recursoEmEdicao}
        >
          <SelectTrigger id="user" className="w-full border-azul/20">
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
                    <span>{user.name}</span>
                    <span className="text-xs text-azul/60">{user.regime}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedUserId && (
        <>
          {/* Preencher todos */}
          <div className="flex items-center gap-2 p-3 bg-azul/5 rounded-lg border border-azul/10">
            <Label htmlFor="preencherTodos" className="text-xs text-azul/70 whitespace-nowrap">
              Preencher todos:
            </Label>
            <div className="flex items-center gap-2 flex-1">
              <Input
                id="preencherTodos"
                type="text"
                value={preencherTodosValue}
                onChange={(e) => setPreencherTodosValue(e.target.value)}
                onKeyDown={validarEntrada}
                className="h-8 text-center w-16"
                placeholder="0,5"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handlePreencherTodos}
                className="h-8 ml-auto text-xs"
              >
                Aplicar
              </Button>
            </div>
          </div>

          {/* Alocações por mês */}
          <div className="space-y-3">
            <Tabs defaultValue={anosDisponiveis[0]?.toString()}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-azul/60" />
                  <span className="text-sm text-azul/70">Anos</span>
                </div>
                <TabsList className="h-8">
                  {anosDisponiveis.map(ano => (
                    <TabsTrigger key={ano} value={ano.toString()} className="text-xs px-3">
                      {ano}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {anosDisponiveis.map(ano => (
                <TabsContent key={ano} value={ano.toString()} className="mt-3">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {mesesDisponiveis
                      .filter(mes => mes.ano === ano)
                      .map(mes => {
                        const ocupacao = getOcupacao(mes.mesNumero, mes.ano);
                        let bgColor = "bg-gray-50";
                        let textColor = "text-gray-600";
                        let borderColor = "border-gray-200";
                        
                        if (ocupacao >= 0.8) {
                          bgColor = "bg-green-50";
                          textColor = "text-green-600";
                          borderColor = "border-green-200";
                        } else if (ocupacao >= 0.5) {
                          bgColor = "bg-blue-50";
                          textColor = "text-blue-600";
                          borderColor = "border-blue-200";
                        } else if (ocupacao >= 0.3) {
                          bgColor = "bg-amber-50";
                          textColor = "text-amber-600";
                          borderColor = "border-amber-200";
                        }
                        
                        return (
                          <div 
                            key={mes.chave} 
                            className={`p-2 rounded-lg border ${bgColor} ${borderColor}`}
                          >
                            <div className="flex justify-between items-center">
                              <span className={`text-xs font-medium capitalize ${textColor}`}>
                                {mes.nome}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <Input
                                type="text"
                                value={getInputValue(mes.mesNumero, mes.ano)}
                                onChange={(e) => handleOcupacaoChange(mes.mesNumero, mes.ano, e.target.value)}
                                onKeyDown={validarEntrada}
                                className="h-7 text-xs text-center"
                                placeholder="0,0"
                              />
                              <Percent className="h-3 w-3 text-azul/40 flex-shrink-0" />
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
          
          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-2 justify-end text-xs text-azul/60 pt-2">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-green-50 border border-green-200"></div>
              <span>&gt;80%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-blue-50 border border-blue-200"></div>
              <span>&gt;50%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-amber-50 border border-amber-200"></div>
              <span>&gt;30%</span>
            </div>
          </div>
          
          {/* Estatísticas e botões */}
          <div className="flex justify-between items-end border-t border-azul/10 pt-4 mt-4">
            <div className="text-xs text-azul/60">
              <div>{alocacoes.filter(a => a.ocupacao > 0).length} meses alocados</div>
              <div>Média: {(alocacoes.reduce((acc, curr) => acc + curr.ocupacao, 0) / Math.max(1, alocacoes.filter(a => a.ocupacao > 0).length)).toFixed(2).replace('.', ',')} de ocupação</div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onCancel}
                className="h-9 rounded-lg"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddAlocacao}
                className="h-9 rounded-lg bg-azul hover:bg-azul/90"
              >
                {recursoEmEdicao ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 