import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Decimal } from "decimal.js";
import { Calendar, User, Save, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gerarMesesEntreDatas } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface FormProps {
  workpackageId: string;
  inicio: Date;
  fim: Date;
  utilizadores: Array<{ id: string; name: string; email: string; regime: string }>;
  onAddAlocacao: (
    workpackageId: string,
    alocacoes: Array<{
      userId: string;
      mes: number;
      ano: number;
      ocupacao: Decimal;
      user?: any;
    }>
  ) => void;
  onCancel: () => void;
  recursoEmEdicao?: {
    userId: string;
    alocacoes: Array<{
      mes: number;
      ano: number;
      ocupacao: any;
    }>;
  } | null;
  projetoEstado: "RASCUNHO" | "PENDENTE" | "APROVADO" | "EM_DESENVOLVIMENTO" | "CONCLUIDO";
  ocupacaoMensal?: {
    userId: string;
    mes: number;
    ocupacaoAprovada: number;
    ocupacaoPendente: number;
  }[];
  _projeto?: any;
  _alocacoesExistentes?: any[];
  _onAlocacoes?: (alocacoes: any[]) => void;
  _usersMappedById?: any;
  _isClienteAtivo?: boolean;
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
  ocupacaoAprovada: number; // projetos com estado true
  ocupacaoPendente: number; // projetos com estado false
};

// Função para converter valor para número
function parseValorOcupacao(valor: string): number {
  const valorNormalizado = valor.replace(",", ".");
  const num = parseFloat(valorNormalizado);

  // Se for NaN, retornar 0
  if (isNaN(num)) return 0;
  
  // Limitar entre 0 e 1
  if (num > 1) return 1;
  if (num < 0) return 0;

  return num;
}

// Função para determinar se uma alocação pode ser editada
function canEditAllocation(projetoEstado: string): {
  canEditApproved: boolean;
  canEditPending: boolean;
} {
  switch (projetoEstado) {
    case "RASCUNHO":
    case "PENDENTE":
      return { canEditApproved: false, canEditPending: true };
    case "APROVADO":
    case "EM_DESENVOLVIMENTO":
    case "CONCLUIDO":
      return { canEditApproved: true, canEditPending: false };
    default:
      return { canEditApproved: false, canEditPending: false };
  }
}

export function Form({
  workpackageId,
  inicio,
  fim,
  utilizadores,
  onAddAlocacao,
  onCancel,
  recursoEmEdicao,
  projetoEstado,
  _projeto = {},
  _alocacoesExistentes = [],
  _onAlocacoes = () => {},
  _usersMappedById = {},
  _isClienteAtivo = true,
}: FormProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [alocacoes, setAlocacoes] = useState<NovaAlocacao[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [preencherTodosValue, setPreencherTodosValue] = useState<string>("");
  const [ocupacoesMensais, setOcupacoesMensais] = useState<OcupacaoMensal[]>([]);

  // Gerar lista de meses e anos
  const mesesDisponiveis = gerarMesesEntreDatas(inicio, fim);
  const anosDisponiveis = Array.from(new Set(mesesDisponiveis.map((mes) => mes.ano))).sort();

  // Definir o ano atual
  const anoAtual = anosDisponiveis[0] || new Date().getFullYear();

  // Buscar ocupações mensais usando tRPC
  const { data: ocupacoesMensaisData, error: ocupacoesMensaisError } =
    api.utilizador.getOcupacaoMensal.useQuery(
      {
        userId: selectedUserId,
        ano: anoAtual,
      },
      {
        enabled: !!selectedUserId,
      }
    );

  // Lidar com erro separadamente no useEffect
  useEffect(() => {
    if (ocupacoesMensaisError) {
      console.error("Erro ao buscar ocupações:", ocupacoesMensaisError);
    }
  }, [ocupacoesMensaisError]);

  // Atualizar o estado de ocupações quando os dados forem carregados
  useEffect(() => {
    if (ocupacoesMensaisData) {
      setOcupacoesMensais(
        ocupacoesMensaisData.map((o) => ({
          mes: o.mes,
          ocupacaoAprovada: o.ocupacaoAprovada || 0,
          ocupacaoPendente: o.ocupacaoPendente || 0,
        }))
      );
    } else {
      setOcupacoesMensais([]);
    }
  }, [ocupacoesMensaisData]);

  // Carregar dados do recurso em edição
  useEffect(() => {
    if (recursoEmEdicao) {
      setSelectedUserId(recursoEmEdicao.userId);

      const novasAlocacoes: NovaAlocacao[] = [];
      const novosInputValues: Record<string, string> = {};

      recursoEmEdicao.alocacoes.forEach((alocacao) => {
        // Converter o valor da alocação para número
        const ocupacao =
          alocacao.ocupacao instanceof Decimal
            ? alocacao.ocupacao.toNumber()
            : typeof alocacao.ocupacao === "string"
              ? parseFloat(alocacao.ocupacao)
              : Number(alocacao.ocupacao);

        // Garantir que o valor está entre 0 e 1
        const ocupacaoFinal = ocupacao > 1 ? ocupacao / 100 : ocupacao;

        novasAlocacoes.push({
          userId: recursoEmEdicao.userId,
          mes: alocacao.mes,
          ano: alocacao.ano,
          ocupacao: ocupacaoFinal,
        });

        const chave = `${alocacao.mes}-${alocacao.ano}`;
        novosInputValues[chave] = ocupacaoFinal.toFixed(2).replace(".", ",");
      });

      setAlocacoes(novasAlocacoes);
      setInputValues(novosInputValues);
    }
  }, [recursoEmEdicao]);

  // Validar entrada apenas com números, vírgulas e pontos
  const validarEntrada = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Teclas de navegação e edição sempre permitidas
    const teclasSistema = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"];

    // Se for tecla de sistema, sempre permitir
    if (teclasSistema.includes(e.key)) {
      return;
    }

    // Números, vírgulas e pontos
    const caracteresPermitidos = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "."];

    // Se não for caracter permitido, bloquear
    if (!caracteresPermitidos.includes(e.key)) {
      e.preventDefault();
      return;
    }
    
    // Se for o primeiro caractere, só permitir 0 ou 1
    if (e.currentTarget.value.length === 0 && !["0", "1"].includes(e.key)) {
      e.preventDefault();
      return;
    }
    
    // Após o primeiro dígito, aplicar regras específicas
    if (e.currentTarget.value.length === 1) {
      // Se o primeiro caractere é 1, não permitir mais caracteres
      if (e.currentTarget.value === "1") {
        e.preventDefault();
        return;
      }
      
      // Se o primeiro caractere é 0, permitir apenas , ou .
      if (e.currentTarget.value === "0" && ![",", "."].includes(e.key)) {
        e.preventDefault();
        return;
      }
    }
    
    // Verificar se já tem 3 casas decimais
    const partes = e.currentTarget.value.split(/[,.]/);
    const parteDecimal = partes[1];
    if (parteDecimal && parteDecimal.length >= 3 && !teclasSistema.includes(e.key)) {
      e.preventDefault();
      return;
    }
  };

  // Atualizar a função que calcula a ocupação total
  const calcularOcupacoes = (mes: number, ano: number) => {
    const dadosMes = ocupacoesMensais.find((o) => o.mes === mes) || {
      ocupacaoAprovada: 0,
      ocupacaoPendente: 0,
    };

    const ocupacaoAtual = getOcupacao(mes, ano) * 100;
    const isApprovedProject =
      projetoEstado === "APROVADO" ||
      projetoEstado === "EM_DESENVOLVIMENTO" ||
      projetoEstado === "CONCLUIDO";

    // Em modo de edição
    if (recursoEmEdicao) {
      if (isApprovedProject) {
        // Em projetos aprovados, editar apenas a parte aprovada
        return {
          atual: ocupacaoAtual,
          aprovada: ocupacaoAtual,
          pendente: dadosMes.ocupacaoPendente * 100,
          total: ocupacaoAtual + dadosMes.ocupacaoPendente * 100,
          isEditable: true,
        };
      } else {
        // Em projetos pendentes, editar apenas a parte pendente
        return {
          atual: ocupacaoAtual,
          aprovada: dadosMes.ocupacaoAprovada * 100,
          pendente: ocupacaoAtual,
          total: dadosMes.ocupacaoAprovada * 100 + ocupacaoAtual,
          isEditable: true,
        };
      }
    }

    // Em modo de criação
    return {
      atual: ocupacaoAtual,
      aprovada: dadosMes.ocupacaoAprovada * 100,
      pendente: dadosMes.ocupacaoPendente * 100,
      total: ocupacaoAtual + dadosMes.ocupacaoAprovada * 100 + dadosMes.ocupacaoPendente * 100,
      isEditable: !isApprovedProject, // Só pode editar se não for projeto aprovado
    };
  };

  // Manipular alteração de ocupação
  const handleOcupacaoChange = (mes: number, ano: number, valor: string) => {
    const chave = `${mes}-${ano}`;
    const { canEditApproved, canEditPending } = canEditAllocation(projetoEstado);

    // Se não puder editar nenhum tipo de alocação, retornar
    if (!canEditApproved && !canEditPending) {
      return;
    }

    // Atualizar sempre o valor do input diretamente
    setInputValues((prev) => ({ ...prev, [chave]: valor }));

    // Apenas limpar a alocação se for string vazia
    if (valor === "") {
      setAlocacoes((prev) =>
        prev.filter((a) => !(a.userId === selectedUserId && a.mes === mes && a.ano === ano))
      );
      return;
    }

    // Validar o valor antes de atualizar alocações
    const valorNormalizado = valor.replace(",", ".");
    const num = parseFloat(valorNormalizado);

    // Se não for um número válido, não atualizar a alocação
    if (isNaN(num)) {
      return;
    }

    // Converter valor limitando a 1 (100%)
    const ocupacao = parseValorOcupacao(valor);

    // Em modo de edição, validar contra o tipo correto de ocupação
    if (recursoEmEdicao) {
      const dadosMes = ocupacoesMensais.find((o) => o.mes === mes);
      const ocupacaoExistente = canEditApproved
        ? dadosMes?.ocupacaoPendente || 0
        : dadosMes?.ocupacaoAprovada || 0;

      if (ocupacao + ocupacaoExistente > 1) {
        const tipoAlocacao = canEditApproved ? "aprovada" : "pendente";
        toast.warning(
          `Atenção: A ocupação total para ${format(new Date(ano, mes - 1), "MMMM")} 
          será de ${((ocupacao + ocupacaoExistente) * 100).toFixed(0)}%. 
          Você está editando a alocação ${tipoAlocacao}.`
        );
      }
    }

    // Atualizar alocações
    setAlocacoes((prev) => {
      const index = prev.findIndex(
        (a) => a.userId === selectedUserId && a.mes === mes && a.ano === ano
      );

      if (index >= 0) {
        const updated = [...prev];
        updated[index] = {
          userId: updated[index]!.userId,
          mes: updated[index]!.mes,
          ano: updated[index]!.ano,
          ocupacao: ocupacao,
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

    mesesDisponiveis.forEach((mes) => {
      const chave = `${mes.mesNumero}-${mes.ano}`;
      // Formatar com 2 casas decimais
      novosInputValues[chave] =
        typeof ocupacao === "number" ? ocupacao.toFixed(2).replace(".", ",") : "0,00";

      novasAlocacoes.push({
        userId: selectedUserId,
        mes: mes.mesNumero,
        ano: mes.ano,
        ocupacao,
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
    const alocacao = alocacoes.find(
      (a) => a.userId === selectedUserId && a.mes === mes && a.ano === ano
    );
    return alocacao?.ocupacao || 0;
  };

  // Adicionar alocações
  const handleAddAlocacao = () => {
    // Usar o ID do utilizador em edição ou do selecionado no dropdown
    const activeUserId = recursoEmEdicao?.userId || selectedUserId;

    if (!activeUserId) {
      alert("Por favor, selecione um utilizador");
      return;
    }

    // Filtrar apenas alocações com ocupação > 0
    const alocacoesValidas = alocacoes.filter((a) => a.ocupacao > 0);

    if (alocacoesValidas.length === 0) {
      alert("Por favor, defina pelo menos uma alocação com valor maior que 0");
      return;
    }

    // Encontrar o utilizador selecionado
    const userSelecionado = utilizadores.find((user) => user.id === activeUserId);

    // Converter para o formato esperado pelo onAddAlocacao
    const alocacoesFormatadas = alocacoesValidas.map((a) => ({
      userId: activeUserId,
      mes: a.mes,
      ano: a.ano,
      ocupacao: new Decimal(a.ocupacao),
      user: userSelecionado,
    }));

    onAddAlocacao(workpackageId, alocacoesFormatadas);
  };

  // Função para determinar o status da ocupação
  const getOcupacaoStatus = (ocupacaoTotal: number) => {
    if (ocupacaoTotal > 100) return "sobre-alocado";
    if (ocupacaoTotal >= 80) return "limite";
    return "normal";
  };

  return (
    <Card className="overflow-hidden border-azul/10 transition-all hover:border-azul/20">
      {/* Cabeçalho do Form - mostrar apenas quando não estiver em modo de edição */}
      {!recursoEmEdicao && (
        <div className="flex items-center justify-between border-b border-azul/10 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-azul/10">
              <User className="h-3.5 w-3.5 text-azul" />
            </div>
            <div>
              <h5 className="text-sm font-medium text-azul">Adicionar Recurso</h5>
              <Badge
                variant="outline"
                className="h-4 border-azul/20 bg-azul/5 px-1 py-0 text-[10px] text-azul/80"
              >
                Novo
              </Badge>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-7 w-7 rounded-lg p-0 hover:bg-red-50 hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Conteúdo do Form */}
      <div className={`space-y-4 bg-azul/5 ${recursoEmEdicao ? 'p-2 pt-1' : 'p-4'}`}>
        {/* Botão de cancelar para modo de edição */}
        {recursoEmEdicao && (
          <div className="flex justify-end mb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-7 w-7 rounded-lg p-0 hover:bg-red-50 hover:text-red-500"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        
        {/* Seleção de utilizador - só mostrar se não estiver em edição */}
        {!recursoEmEdicao && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-azul/10">
                <User className="h-3 w-3 text-azul" />
              </div>
              <Label htmlFor="user" className="text-xs font-medium text-azul/80">
                Selecione um recurso
              </Label>
            </div>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="user" className="h-9 w-full border-azul/20">
                <SelectValue placeholder="Selecione um utilizador" />
              </SelectTrigger>
              <SelectContent>
                {utilizadores.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-azul/10">
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
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-azul/10">
                  <Calendar className="h-3 w-3 text-azul" />
                </div>
                <span className="text-xs font-medium text-azul/80">Alocações mensais</span>
              </div>

              <Tabs
                defaultValue={anosDisponiveis[0]?.toString()}
                className="rounded-lg border border-azul/10 bg-white p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <TabsList className="h-8">
                    {anosDisponiveis.map((ano) => (
                      <TabsTrigger key={ano} value={ano.toString()} className="px-3 text-xs">
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
                      className="h-8 w-16 border-azul/20 text-center text-xs"
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

                {anosDisponiveis.map((ano) => (
                  <TabsContent key={ano} value={ano.toString()} className="mt-2">
                    <div className="mx-auto grid max-w-screen-xl grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
                      {mesesDisponiveis
                        .filter((mes) => mes.ano === ano)
                        .map((mes) => {
                          const ocupacoes = calcularOcupacoes(mes.mesNumero, mes.ano);
                          const status = getOcupacaoStatus(ocupacoes.total);

                          // Classes condicionais baseadas no status
                          const statusClasses = {
                            "sobre-alocado": {
                              bg: "bg-red-50",
                              text: "text-red-600",
                              border: "border-red-100",
                              progress: "bg-red-400",
                            },
                            limite: {
                              bg: "bg-amber-50",
                              text: "text-amber-600",
                              border: "border-amber-100",
                              progress: "bg-amber-400",
                            },
                            normal: {
                              bg:
                                ocupacoes.atual > 100
                                  ? "bg-red-50"
                                  : ocupacoes.atual >= 80
                                    ? "bg-green-50"
                                    : ocupacoes.atual >= 50
                                      ? "bg-blue-50"
                                      : ocupacoes.atual >= 1
                                        ? "bg-amber-50"
                                        : "bg-gray-50",
                              text:
                                ocupacoes.atual > 100
                                  ? "text-red-600"
                                  : ocupacoes.atual >= 80
                                    ? "text-green-600"
                                    : ocupacoes.atual >= 50
                                      ? "text-blue-600"
                                      : ocupacoes.atual >= 1
                                        ? "text-amber-600"
                                        : "text-gray-600",
                              border:
                                ocupacoes.atual > 100
                                  ? "border-red-100"
                                  : ocupacoes.atual >= 80
                                    ? "border-green-100"
                                    : ocupacoes.atual >= 50
                                      ? "border-blue-100"
                                      : ocupacoes.atual >= 1
                                        ? "border-amber-100"
                                        : "border-gray-200",
                              progress:
                                ocupacoes.atual > 100
                                  ? "bg-red-400"
                                  : ocupacoes.atual >= 80
                                    ? "bg-green-400"
                                    : ocupacoes.atual >= 50
                                      ? "bg-blue-400"
                                      : ocupacoes.atual >= 1
                                        ? "bg-amber-400"
                                        : "bg-gray-200",
                            },
                          }[status];

                          return (
                            <div
                              key={mes.chave}
                              className={`${statusClasses.bg} ${statusClasses.border} rounded-md border p-2`}
                            >
                              <div className="mb-1.5 flex justify-between text-xs">
                                <span className={statusClasses.text}>
                                  {format(new Date(mes.ano, mes.mesNumero - 1), "MMM")}
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
                                <div className="h-1.5 overflow-hidden rounded-full bg-white/50">
                                  <div
                                    className={`h-full ${statusClasses.progress} rounded-full transition-all duration-300`}
                                    style={{ width: `${ocupacoes.atual}%` }}
                                  />
                                </div>
                                {/* Ocupação aprovada */}
                                <div className="h-1 overflow-hidden rounded-full bg-white/50">
                                  <div
                                    className="h-full rounded-full bg-green-400 transition-all duration-300"
                                    style={{ width: `${ocupacoes.aprovada}%` }}
                                  />
                                </div>
                                {/* Ocupação pendente */}
                                <div className="h-1 overflow-hidden rounded-full bg-white/50">
                                  <div
                                    className="h-full rounded-full bg-amber-400 transition-all duration-300"
                                    style={{ width: `${ocupacoes.pendente}%` }}
                                  />
                                </div>
                              </div>

                              <div className="mt-2 flex items-center">
                                <Input
                                  type="text"
                                  value={getInputValue(mes.mesNumero, mes.ano)}
                                  onChange={(e) =>
                                    handleOcupacaoChange(mes.mesNumero, mes.ano, e.target.value)
                                  }
                                  onKeyDown={validarEntrada}
                                  className={`h-7 text-center text-xs ${
                                    status === "sobre-alocado"
                                      ? "border-red-300 focus:border-red-500"
                                      : ""
                                  }`}
                                  placeholder="0,00"
                                  disabled={!ocupacoes.isEditable}
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

            {/* Botões de ação */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onCancel} className="h-8 rounded-lg px-4">
                Cancelar
              </Button>
              <Button
                onClick={handleAddAlocacao}
                className="h-8 rounded-lg bg-azul px-4 hover:bg-azul/90"
              >
                {recursoEmEdicao ? (
                  <>
                    <Save className="mr-2 h-3.5 w-3.5" />
                    Guardar Alterações
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-3.5 w-3.5" />
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
