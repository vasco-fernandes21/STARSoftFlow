import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Decimal } from "decimal.js";
import { ChevronLeft, ChevronRight, Calendar, User, Percent, Save, Plus, Briefcase, X } from "lucide-react";
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

        // Garantir que o valor está entre 0 e 1
        const ocupacaoFinal = ocupacao > 1 ? ocupacao / 100 : ocupacao;
        
        novasAlocacoes.push({
          userId: recursoEmEdicao.userId,
          mes: alocacao.mes,
          ano: alocacao.ano,
          ocupacao: ocupacaoFinal // Armazenar como decimal (0-1)
        });
        
        const chave = `${alocacao.mes}-${alocacao.ano}`;
        // Formatar com 2 casas decimais
        novosInputValues[chave] = ocupacaoFinal.toFixed(2).replace('.', ',');
      });
      
      setAlocacoes(novasAlocacoes);
      setInputValues(novosInputValues);
    }
  }, [recursoEmEdicao]);
  
  // Validar entrada apenas com números, vírgulas e pontos
  const validarEntrada = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Teclas de navegação e edição sempre permitidas
    const teclasSistema = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    
    // Se for tecla de sistema, sempre permitir
    if (teclasSistema.includes(e.key)) {
      return;
    }
    
    // Números, vírgulas e pontos
    const caracteresPermitidos = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '.'];
    
    // Se não for caracter permitido, bloquear
    if (!caracteresPermitidos.includes(e.key)) {
      e.preventDefault();
      return;
    }
    
    // Se for o primeiro caractere, só permitir 0 ou 1
    if (e.currentTarget.value.length === 0 && !['0', '1'].includes(e.key)) {
      e.preventDefault();
      return;
    }
    
    // Se já tiver o primeiro dígito e não for vírgula ou ponto, bloquear segundo dígito
    if (e.currentTarget.value.length === 1 && !/^[01]$/.test(e.currentTarget.value) && !['0', '1', ',', '.'].includes(e.key)) {
      e.preventDefault();
      return;
    }
  };
  
  // Manipular alteração de ocupação
  const handleOcupacaoChange = (mes: number, ano: number, valor: string) => {
    const chave = `${mes}-${ano}`;
    
    // Sempre atualizar o valor de exibição do input, independentemente do valor
    setInputValues(prev => ({ ...prev, [chave]: valor }));
    
    // Se for vazio, remover a alocação e retornar
    if (valor === "") {
      setAlocacoes(prev => 
        prev.filter(a => !(a.userId === selectedUserId && a.mes === mes && a.ano === ano))
      );
      return;
    }
    
    // Validar o valor antes de atualizar
    const valorNormalizado = valor.replace(',', '.');
    const num = parseFloat(valorNormalizado);
    
    // Se não for um número válido, não atualizar a alocação mas manter o texto no input
    if (isNaN(num)) {
      return;
    }
    
    // Se o valor for maior que 1, limitar a 1
    if (num > 1) {
      setInputValues(prev => ({ ...prev, [chave]: "1,00" }));
    } 
    // Nota: Removemos a formatação automática aqui para permitir edição completa
    
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
      // Formatar com 2 casas decimais
      novosInputValues[chave] = typeof ocupacao === 'number' ? 
        ocupacao.toFixed(2).replace('.', ',') : 
        "0,00";
      
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
  
  // Atualizar a função que calcula a ocupação total
  const calcularOcupacoes = (mes: number, ano: number) => {
    const ocupacaoAtual = getOcupacao(mes, ano) * 100; // Converter para percentagem
    const dadosMes = ocupacoesMensais.find(o => o.mes === mes) || {
      ocupacaoAprovada: 0,
      ocupacaoPendente: 0
    };

    // Multiplicar valores por 100 para converter em percentagem
    return {
      atual: ocupacaoAtual,
      aprovada: dadosMes.ocupacaoAprovada * 100,
      pendente: dadosMes.ocupacaoPendente * 100,
      total: ocupacaoAtual + (dadosMes.ocupacaoAprovada * 100) + (dadosMes.ocupacaoPendente * 100)
    };
  };

  // Função para determinar o status da ocupação
  const getOcupacaoStatus = (ocupacaoTotal: number) => {
    if (ocupacaoTotal > 100) return "sobre-alocado";
    if (ocupacaoTotal >= 80) return "limite";
    return "normal";
  };

  // Formatar o valor ao perder o foco
  const handleInputBlur = (mes: number, ano: number) => {
    const chave = `${mes}-${ano}`;
    const valorAtual = inputValues[chave];
    
    // Se estiver vazio, não fazer nada
    if (!valorAtual) return;
    
    // Validar e formatar o valor
    const valorNormalizado = valorAtual.replace(',', '.');
    const num = parseFloat(valorNormalizado);
    
    if (!isNaN(num)) {
      // Formatar com 2 casas decimais
      const valorFormatado = (num > 1 ? 1 : num).toFixed(2).replace('.', ',');
      setInputValues(prev => ({ ...prev, [chave]: valorFormatado }));
    }
  };

  return (
    <Card className="border-azul/10 hover:border-azul/20 transition-all overflow-hidden">
      {/* Cabeçalho do Form */}
      <div className="p-3 flex justify-between items-center border-b border-azul/10">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-azul/10 flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-azul" />
          </div>
          <div>
            <h5 className="text-sm font-medium text-azul">
              {recursoEmEdicao ? "Editar Alocação" : "Adicionar Recurso"}
            </h5>
            <Badge variant="outline" className="px-1 py-0 text-[10px] h-4 bg-azul/5 text-azul/80 border-azul/20">
              {recursoEmEdicao ? "Edição" : "Novo"}
            </Badge>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 hover:text-red-500"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Conteúdo do Form */}
      <div className="p-4 bg-azul/5 space-y-4">
        {/* Seleção de utilizador - só mostrar se não estiver em edição */}
        {!recursoEmEdicao && (
          <div className="space-y-2">
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
              <SelectTrigger id="user" className="w-full border-azul/20 h-9">
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
            {/* Alocações por mês */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md bg-azul/10 flex items-center justify-center">
                  <Calendar className="h-3 w-3 text-azul" />
                </div>
                <span className="text-xs font-medium text-azul/80">Alocações mensais</span>
              </div>

              <Tabs defaultValue={anosDisponiveis[0]?.toString()} className="bg-white rounded-lg p-3 border border-azul/10">
                <div className="flex items-center justify-between mb-3">
                  <TabsList className="h-8">
                    {anosDisponiveis.map(ano => (
                      <TabsTrigger key={ano} value={ano.toString()} className="text-xs px-3">
                        {ano}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={preencherTodosValue}
                      onChange={(e) => setPreencherTodosValue(e.target.value)}
                      onKeyDown={validarEntrada}
                      className="h-8 text-center w-16 border-azul/20 text-xs"
                      placeholder="0,5"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePreencherTodos}
                      className="h-8 px-2 text-xs"
                    >
                      Aplicar a todos
                    </Button>
                  </div>
                </div>

                {anosDisponiveis.map(ano => (
                  <TabsContent key={ano} value={ano.toString()} className="mt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
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
                              bg: ocupacoes.atual > 100 ? "bg-red-50" :
                                  ocupacoes.atual >= 80 ? "bg-green-50" : 
                                  ocupacoes.atual >= 50 ? "bg-blue-50" : 
                                  ocupacoes.atual >= 1 ? "bg-amber-50" : "bg-gray-50",
                              text: ocupacoes.atual > 100 ? "text-red-600" :
                                    ocupacoes.atual >= 80 ? "text-green-600" :
                                    ocupacoes.atual >= 50 ? "text-blue-600" :
                                    ocupacoes.atual >= 1 ? "text-amber-600" : "text-gray-600",
                              border: ocupacoes.atual > 100 ? "border-red-100" :
                                      ocupacoes.atual >= 80 ? "border-green-100" :
                                      ocupacoes.atual >= 50 ? "border-blue-100" :
                                      ocupacoes.atual >= 1 ? "border-amber-100" : "border-gray-200",
                              progress: ocupacoes.atual > 100 ? "bg-red-400" :
                                        ocupacoes.atual >= 80 ? "bg-green-400" :
                                        ocupacoes.atual >= 50 ? "bg-blue-400" :
                                        ocupacoes.atual >= 1 ? "bg-amber-400" : "bg-gray-200"
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
                                    {ocupacoes.atual.toFixed(0)}%
                                  </span>
                                  <span className="text-[10px] text-green-600">
                                    Aprovado: {ocupacoes.aprovada.toFixed(0)}%
                                  </span>
                                  <span className="text-[10px] text-amber-600">
                                    Pendente: {ocupacoes.pendente.toFixed(0)}%
                                  </span>
                                  <span className="text-[10px] text-azul/60">
                                    Total: {ocupacoes.total.toFixed(0)}%
                                  </span>
                                </div>
                              </div>

                              {/* Barras de progresso */}
                              <div className="space-y-1">
                                {/* Ocupação atual (sendo inserida) */}
                                <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${statusClasses.progress} rounded-full transition-all duration-300`}
                                    style={{ width: `${ocupacoes.atual}%` }}
                                  />
                                </div>
                                {/* Ocupação aprovada */}
                                <div className="h-1 bg-white/50 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-green-400 rounded-full transition-all duration-300"
                                    style={{ width: `${ocupacoes.aprovada}%` }}
                                  />
                                </div>
                                {/* Ocupação pendente */}
                                <div className="h-1 bg-white/50 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                                    style={{ width: `${ocupacoes.pendente}%` }}
                                  />
                                </div>
                              </div>

                              <div className="mt-2 flex items-center">
                                <Input
                                  type="text"
                                  value={getInputValue(mes.mesNumero, mes.ano)}
                                  onChange={(e) => handleOcupacaoChange(mes.mesNumero, mes.ano, e.target.value)}
                                  onBlur={() => handleInputBlur(mes.mesNumero, mes.ano)}
                                  onKeyDown={validarEntrada}
                                  className={`h-7 text-xs text-center ${
                                    status === "sobre-alocado" ? "border-red-300 focus:border-red-500" : ""
                                  }`}
                                  placeholder="0,00"
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
          </>
        )}
      </div>
    </Card>
  );
}