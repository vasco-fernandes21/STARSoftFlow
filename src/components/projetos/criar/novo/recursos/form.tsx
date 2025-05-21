import { useState, useEffect, useMemo } from "react"; // Adicionar useMemo
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
import { pt } from "date-fns/locale";
import { utils } from "xlsx";

interface FormProps {
  workpackageId: string;
  inicio: Date;
  fim: Date;
  utilizadores: Array<{ id: string; name: string; email: string; regime: string | null }>;
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
  hideCloseButtonFromFormHeader?: boolean;
}

type NovaAlocacao = {
  userId: string;
  mes: number;
  ano: number;
  ocupacao: number; // Valor de 0 a 1
};

// Interface para as ocupações validadas da API
type ApiOcupacaoMensal = {
  mes: number;
  ano: number; // Adicionado para garantir unicidade com findAll que retorna ano
  ocupacaoAprovada: number; // projetos com estado true (0 a 1)
  ocupacaoPendente: number; // projetos com estado false (0 a 1)
};

// Nova interface para a pré-visualização dos totais mensais
interface PreviewTotalMensal {
  mes: number;
  ano: number;
  ocupacaoAprovada: number; // Total aprovado de TODAS as fontes para este user neste mês (0 a 1)
  ocupacaoPendente: number;  // Total pendente de TODAS as fontes para este user neste mês (0 a 1)
  // ocupacaoAtualNoForm: number; // O valor atual no input para ESTE workpackage (0 a 1) - opcional se necessário para display direto
}

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
      // Para rascunhos/pendentes, a alocação deste WP é considerada "pendente"
      return { canEditApproved: false, canEditPending: true };
    case "APROVADO":
    case "EM_DESENVOLVIMENTO":
    case "CONCLUIDO":
      // Para aprovados/em desenvolvimento/concluídos, a alocação deste WP é considerada "aprovada"
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
  hideCloseButtonFromFormHeader = false,
}: FormProps) {
  const utils = api.useUtils();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [alocacoes, setAlocacoes] = useState<NovaAlocacao[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [preencherTodosValue, setPreencherTodosValue] = useState<string>("");
  // Renomeado de ocupacoesMensais para apiOcupacoesMensais
  const [apiOcupacoesMensais, setApiOcupacoesMensais] = useState<ApiOcupacaoMensal[]>([]);
  // Novo estado para a pré-visualização dos totais
  const [previewTotaisMensais, setPreviewTotaisMensais] = useState<PreviewTotalMensal[]>([]);

  // Gerar lista de meses e anos com useMemo
  const mesesDisponiveis = useMemo(() => {
    return gerarMesesEntreDatas(inicio, fim);
  }, [inicio, fim]);

  const anosDisponiveis = useMemo(() => {
    return Array.from(new Set(mesesDisponiveis.map((mes) => mes.ano))).sort();
  }, [mesesDisponiveis]);

  // Definir o ano atual - NOTA: a query findAll agora pode precisar de uma lista de anos ou ser chamada por ano se mesesDisponiveis abrangem múltiplos anos.
  // Para simplificar, vamos assumir que a query findAll pode ser ajustada ou que o escopo é geralmente dentro de um ano ou que pegamos o primeiro ano.
  // const anoParaQuery = anosDisponiveis[0] || new Date().getFullYear(); // anoParaQuery não está sendo usado na query no momento


  // Buscar ocupações mensais usando tRPC
  const { data: ocupacoesMensaisData, error: ocupacoesMensaisError } =
    api.utilizador.alocacoes.findAll.useQuery(
      {
        userId: selectedUserId,
        // ano: anoParaQuery, // A API findAll pode precisar de uma lista de anos ou ser mais flexível
                           // Se a API espera um único ano, e o formulário abrange vários, isso precisa de ajuste.
                           // Por agora, vamos assumir que a API pode lidar com isso ou que pegamos dados para todos os anos relevantes.
                           // Se a API `findAll` não filtrar por ano ou aceitar uma lista de anos, ótimo.
                           // Se ela só aceita UM ano, e `mesesDisponiveis` tem vários, precisaremos de múltiplas queries ou ajuste na API.
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
      setApiOcupacoesMensais( // Renomeado
        ocupacoesMensaisData.map((o) => ({
          mes: o.mes,
          ano: o.ano, // Assumindo que a API retorna o ano
          ocupacaoAprovada: o.ocupacaoAprovada || 0,
          ocupacaoPendente: o.ocupacaoPendente || 0,
        }))
      );
    } else {
      setApiOcupacoesMensais([]); // Renomeado
    }
  }, [ocupacoesMensaisData]);


  // useEffect para calcular previewTotaisMensais
  useEffect(() => {
    if (!selectedUserId) {
      setPreviewTotaisMensais([]);
      return;
    }

    const newPreviewTotais: PreviewTotalMensal[] = mesesDisponiveis.map(mesAno => {
      const { mesNumero, ano } = mesAno;

      const apiDataParaMesAno = apiOcupacoesMensais.find(o => o.mes === mesNumero && o.ano === ano);
      let baseAprovado = apiDataParaMesAno?.ocupacaoAprovada || 0;
      let basePendente = apiDataParaMesAno?.ocupacaoPendente || 0;

      const alocacaoAtualNoFormObj = alocacoes.find(
        (a) => a.userId === selectedUserId && a.mes === mesNumero && a.ano === ano
      );
      const ocupacaoAtualNoForm = alocacaoAtualNoFormObj?.ocupacao || 0; // Valor de 0 a 1

      if (recursoEmEdicao && recursoEmEdicao.userId === selectedUserId) {
        const alocacaoOriginalEditada = recursoEmEdicao.alocacoes.find(
          (a) => a.mes === mesNumero && a.ano === ano
        );

        if (alocacaoOriginalEditada) {
          const alocOrig = alocacaoOriginalEditada.ocupacao;
          let ocupacaoOriginalNumValue = 0;

          if (alocOrig instanceof Decimal) {
            ocupacaoOriginalNumValue = alocOrig.toNumber();
          } else if (typeof alocOrig === 'string') {
            ocupacaoOriginalNumValue = parseFloat(alocOrig.replace(",", "."));
          } else if (typeof alocOrig === 'number') {
            ocupacaoOriginalNumValue = alocOrig;
          }

          let ocupacaoOriginalNormalizada = 0;
          if (!isNaN(ocupacaoOriginalNumValue)) {
            if (ocupacaoOriginalNumValue > 1 && ocupacaoOriginalNumValue <= 100) {
              ocupacaoOriginalNormalizada = ocupacaoOriginalNumValue / 100;
            } else if (ocupacaoOriginalNumValue >= 0 && ocupacaoOriginalNumValue <= 1) {
              ocupacaoOriginalNormalizada = ocupacaoOriginalNumValue;
            }
            ocupacaoOriginalNormalizada = Math.max(0, Math.min(ocupacaoOriginalNormalizada, 1));
          }
          
          const { canEditApproved: formEditaAprovadas, canEditPending: formEditaPendentes } = canEditAllocation(projetoEstado);

          if (formEditaAprovadas) { 
            baseAprovado -= ocupacaoOriginalNormalizada;
          } else if (formEditaPendentes) { 
            basePendente -= ocupacaoOriginalNormalizada;
          }
        }
      }

      let finalAprovado = baseAprovado;
      let finalPendente = basePendente;

      const { canEditApproved: inputAtualVaiParaAprovadas, canEditPending: inputAtualVaiParaPendentes } = canEditAllocation(projetoEstado);

      if (inputAtualVaiParaAprovadas) {
        finalAprovado += ocupacaoAtualNoForm;
      } else if (inputAtualVaiParaPendentes) {
        finalPendente += ocupacaoAtualNoForm;
      }

      finalAprovado = Math.max(0, finalAprovado); // Permitir que finalAprovado seja > 1 para exibição
      finalPendente = Math.max(0, finalPendente); 

      return {
        mes: mesNumero,
        ano: ano,
        ocupacaoAprovada: finalAprovado,
        ocupacaoPendente: finalPendente,
      };
    });

    setPreviewTotaisMensais(newPreviewTotais);

  }, [
    selectedUserId,
    apiOcupacoesMensais,
    alocacoes,
    recursoEmEdicao,
    projetoEstado,
    mesesDisponiveis,
  ]);


  // Carregar dados do recurso em edição
  useEffect(() => {
    if (recursoEmEdicao) {
      setSelectedUserId(recursoEmEdicao.userId);

      const novasAlocacoes: NovaAlocacao[] = [];
      const novosInputValues: Record<string, string> = {};

      recursoEmEdicao.alocacoes.forEach((alocacao) => {
        const alocOcupacao = alocacao.ocupacao;
        let ocupacaoNum = 0;
        if (alocOcupacao instanceof Decimal) {
            ocupacaoNum = alocOcupacao.toNumber();
        } else if (typeof alocOcupacao === "string") {
            ocupacaoNum = parseFloat(alocOcupacao.replace(",", "."));
        } else if (typeof alocOcupacao === "number") {
            ocupacaoNum = alocOcupacao;
        }
        
        let ocupacaoFinalNormalizada = 0;
        if (!isNaN(ocupacaoNum)) {
            if (ocupacaoNum > 1 && ocupacaoNum <= 100) { // ex: 50 para 50%
                ocupacaoFinalNormalizada = ocupacaoNum / 100;
            } else if (ocupacaoNum >= 0 && ocupacaoNum <= 1) { // ex: 0.5 para 50%
                ocupacaoFinalNormalizada = ocupacaoNum;
            }
             // Aplicar clamp final
            ocupacaoFinalNormalizada = Math.max(0, Math.min(ocupacaoFinalNormalizada, 1));
        }

        novasAlocacoes.push({
          userId: recursoEmEdicao.userId,
          mes: alocacao.mes,
          ano: alocacao.ano,
          ocupacao: ocupacaoFinalNormalizada, // Armazenar como 0-1
        });

        const chave = `${alocacao.mes}-${alocacao.ano}`;
        novosInputValues[chave] = ocupacaoFinalNormalizada.toFixed(2).replace(".", ",");
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

    // Se não for um número válido, não atualizar a alocação (mas o inputValues já foi atualizado)
    // Apenas não propaga para `alocacoes` se for inválido após parse.
    if (isNaN(num) && valor !== "") { // Se valor for "" já foi tratado
      // Mantém o input, mas não atualiza `alocacoes` se o valor não for número
      // ou podemos limpar `alocacoes` para este mês se o valor for inválido.
      // Por ora, se for NaN, `parseValorOcupacao` retornará 0, o que é ok.
    }

    const ocupacaoInput = parseValorOcupacao(valor); // valor 0-1

    // Lógica de aviso imediato
    if (selectedUserId && valor !== "") {
      const apiDataParaMesAno = apiOcupacoesMensais.find(o => o.mes === mes && o.ano === ano);
      let tempBaseAprovado = apiDataParaMesAno?.ocupacaoAprovada || 0;
      let tempBasePendente = apiDataParaMesAno?.ocupacaoPendente || 0;

      if (recursoEmEdicao && recursoEmEdicao.userId === selectedUserId) {
        const alocacaoOriginalEditada = recursoEmEdicao.alocacoes.find(a => a.mes === mes && a.ano === ano);
        if (alocacaoOriginalEditada) {
          const alocOrig = alocacaoOriginalEditada.ocupacao;
          let ocupacaoOriginalNumValue = 0;
          if (alocOrig instanceof Decimal) ocupacaoOriginalNumValue = alocOrig.toNumber();
          else if (typeof alocOrig === 'string') ocupacaoOriginalNumValue = parseFloat(alocOrig.replace(",", "."));
          else if (typeof alocOrig === 'number') ocupacaoOriginalNumValue = alocOrig;

          let ocupacaoOriginalNormalizada = 0;
          if (!isNaN(ocupacaoOriginalNumValue)) {
            if (ocupacaoOriginalNumValue > 1 && ocupacaoOriginalNumValue <= 100) ocupacaoOriginalNormalizada = ocupacaoOriginalNumValue / 100;
            else if (ocupacaoOriginalNumValue >= 0 && ocupacaoOriginalNumValue <= 1) ocupacaoOriginalNormalizada = ocupacaoOriginalNumValue;
            ocupacaoOriginalNormalizada = Math.max(0, Math.min(ocupacaoOriginalNormalizada, 1));
          }
          
          const { canEditApproved: formEditsApprovedSlot, canEditPending: formEditsPendingSlot } = canEditAllocation(projetoEstado);
          if (formEditsApprovedSlot) tempBaseAprovado -= ocupacaoOriginalNormalizada;
          else if (formEditsPendingSlot) tempBasePendente -= ocupacaoOriginalNormalizada;
        }
      }

      let tempFinalAprovado = tempBaseAprovado;
      // let tempFinalPendente = tempBasePendente; // Não usado no aviso de >100% aprovado
      const { canEditApproved: currentInputIsForApproved } = canEditAllocation(projetoEstado);

      if (currentInputIsForApproved) {
        tempFinalAprovado += ocupacaoInput;
      }
      // Não adicionar à pendente para o cálculo do aviso de >100% aprovado,
      // a menos que o input seja para pendente e queiramos avisar sobre pendente.
      // O foco é no limite de 100% aprovado.

      if (tempFinalAprovado > 1) {
        toast.warning(
          `Atenção: Com este valor, a ocupação total APROVADA para ${format(new Date(ano, mes - 1), "MMMM", { locale: pt })} 
          será de ${(tempFinalAprovado * 100).toFixed(0)}%, excedendo 100%.`
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
          ...updated[index]!,
          ocupacao: ocupacaoInput, // Usar o valor parseado e clampado (0-1)
        };
        return updated;
      } else if (selectedUserId) {
        return [...prev, { userId: selectedUserId, mes, ano, ocupacao: ocupacaoInput }];
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

  // Obter o valor de ocupação para um mês/ano específico (do estado `alocacoes`)
  const getOcupacaoAtualNoForm = (mes: number, ano: number): number => {
    const alocacao = alocacoes.find(
      (a) => a.userId === selectedUserId && a.mes === mes && a.ano === ano
    );
    return alocacao?.ocupacao || 0; // Retorna 0-1
  };

  const isSaveDisabled = previewTotaisMensais.some(preview => preview.ocupacaoAprovada > 1);

  // Adicionar alocações
  const handleAddAlocacao = () => {
    // const utils = api.useUtils(); // Remover daqui

    // Usar o ID do utilizador em edição ou do selecionado no dropdown
    const activeUserId = recursoEmEdicao?.userId || selectedUserId;

    if (!activeUserId) {
      alert("Por favor, selecione um utilizador");
      return;
    }

    // Verificar se alguma ocupação aprovada excede 100%
    const mesComExcesso = previewTotaisMensais.find(preview => preview.ocupacaoAprovada > 1);

    if (mesComExcesso) {
      const nomeMes = format(new Date(mesComExcesso.ano, mesComExcesso.mes - 1), "MMMM 'de' yyyy", { locale: pt });
      toast.error(
        `Não é possível guardar. A ocupação total aprovada para ${nomeMes} excede 100% (${(mesComExcesso.ocupacaoAprovada * 100).toFixed(0)}%). Por favor, ajuste os valores.`
      );
      return;
    }

    // Filtrar apenas alocações com ocupação > 0
    const alocacoesValidas = alocacoes.filter((a) => a.ocupacao > 0);

    if (alocacoesValidas.length === 0) {
      // Permitir salvar mesmo sem alocações válidas se o objetivo for remover todas as alocações de um recurso em edição.
      // No entanto, se não for edição e não houver alocações, alertar.
      if (!recursoEmEdicao) {
        alert("Por favor, defina pelo menos uma alocação com valor maior que 0, ou insira 0 para remover alocações existentes ao editar.");
        return;
      }
      // Se for edição e todas as ocupações foram zeradas, significa que o usuário quer remover todas as alocações.
      // Nesse caso, onAddAlocacao será chamado com um array vazio (ou com zeros), e o backend/lógica superior deve tratar isso.
    }

    // Encontrar o utilizador selecionado
    const userSelecionado = utilizadores.find((user) => user.id === activeUserId);

    // Converter para o formato esperado pelo onAddAlocacao
    // Mesmo que alocacoesValidas esteja vazio (no caso de zerar todas as alocações em edição),
    // precisamos enviar as alocações atuais (que podem conter zeros) para que a lógica superior possa processar a remoção/atualização para zero.
    const alocacoesParaEnvio = alocacoes
      .filter(a => a.userId === activeUserId) // Garantir que estamos enviando apenas as do user ativo
      .map((a) => ({
        userId: activeUserId,
        mes: a.mes,
        ano: a.ano,
        ocupacao: new Decimal(a.ocupacao), // Enviar o valor como está (pode ser 0)
        user: userSelecionado,
      }));

    // Se não houver alocacoes para o usuario ativo (nem mesmo com 0), e não for edição, não faz sentido prosseguir.
    // Se for edição e o usuário limpou tudo, alocacoesParaEnvio pode estar vazio se o estado 'alocacoes' foi completamente limpo.
    // A lógica de 'alocacoesValidas' acima já trata o caso de não haver NENHUMA alocação > 0.
    // Se o usuário zerou todas as alocações de um recurso em edição, alocacoesParaEnvio conterá essas alocações com ocupacao 0.
    if (alocacoesParaEnvio.length === 0 && !recursoEmEdicao && alocacoesValidas.length === 0) {
        alert("Não existem alocações para adicionar.");
        return;
    }

    onAddAlocacao(workpackageId, alocacoesParaEnvio);
    
    utils.utilizador.alocacoes.findAll.invalidate(); 

    if (!recursoEmEdicao) {
      setSelectedUserId("");
      setAlocacoes([]);
      setInputValues({});
      setPreencherTodosValue("");
      // A pré-visualização (previewTotaisMensais) será automaticamente limpa
      // pelo useEffect quando selectedUserId e alocacoes forem resetados.
    }
  };

  // Função para determinar o status da ocupação com base na pré-visualização
  const getOcupacaoStatusGlobal = (previewAprovadoDoMes: number | undefined) => {
    const val = previewAprovadoDoMes || 0;
    // val agora pode ser > 1, a lógica de "sobre-alocado" continua correta.
    if (val >= 1) return "sobre-alocado"; 
    if (val >= 0.8) return "limite";    
    return "normal"; 
  };

  return (
    <Card className="overflow-hidden border-azul/10 transition-all hover:border-azul/20">
      {/* Cabeçalho do Form - mostrar apenas quando não estiver em modo de edição E não for modal */}
      {!recursoEmEdicao && !hideCloseButtonFromFormHeader && (
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
                      <div className="flex flex-col items-start justify-center min-h-[1.5rem]">
                        <span className="text-sm font-medium leading-none">{user.name}</span>
                        <span className="text-xs text-azul/60 leading-none mt-0.5">{user.regime}</span>
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
                          // Obter os dados de pré-visualização para este mês/ano
                          const previewDoMes = previewTotaisMensais.find(
                            (p) => p.mes === mes.mesNumero && p.ano === mes.ano
                          );

                          const ocupacaoAtualInput = getOcupacaoAtualNoForm(mes.mesNumero, mes.ano); // 0-1
                          const displayOcupacaoAtualPercent = ocupacaoAtualInput * 100;

                          const displayPreviewAprovadaPercent = (previewDoMes?.ocupacaoAprovada || 0) * 100;
                          const displayPreviewPendentePercent = (previewDoMes?.ocupacaoPendente || 0) * 100;
                          const displayPreviewTotalPercent = displayPreviewAprovadaPercent + displayPreviewPendentePercent;
                          
                          const statusGlobal = getOcupacaoStatusGlobal(previewDoMes?.ocupacaoAprovada);

                          // Determinar se o input deve estar desabilitado
                          const { canEditApproved, canEditPending } = canEditAllocation(projetoEstado);
                          const isInputDisabled = !(canEditApproved || canEditPending);


                          // Classes condicionais baseadas no status GLOBAL (da ocupação aprovada total do user)
                          const statusClasses = {
                            "sobre-alocado": { // Aprovado >= 100%
                              bg: "bg-red-50",
                              text: "text-red-600",
                              border: "border-red-200", // Mais visível
                              progress: "bg-red-500", // Barra de progresso do input atual
                            },
                            limite: { // Aprovado 80% - 99%
                              bg: "bg-amber-50",
                              text: "text-amber-600",
                              border: "border-amber-200", // Mais visível
                              progress: "bg-amber-500", // Barra de progresso do input atual
                            },
                            normal: { // Aprovado < 80% - cor baseada no input atual
                              bg:
                                displayOcupacaoAtualPercent > 100 // Input atual > 100% (não deveria acontecer com parseValorOcupacao)
                                  ? "bg-red-50"
                                  : displayOcupacaoAtualPercent >= 80
                                    ? "bg-green-50" // Verde se input alto mas total aprovado ok
                                    : displayOcupacaoAtualPercent >= 50
                                      ? "bg-blue-50"
                                      : displayOcupacaoAtualPercent >= 1
                                        ? "bg-sky-50" // Alterado de amber para não confundir com 'limite' global
                                        : "bg-gray-50",
                              text: // Texto do nome do mês e % do input atual
                                displayOcupacaoAtualPercent > 100
                                  ? "text-red-600"
                                  : displayOcupacaoAtualPercent >= 80
                                    ? "text-green-600"
                                    : displayOcupacaoAtualPercent >= 50
                                      ? "text-blue-600"
                                      : displayOcupacaoAtualPercent >= 1
                                        ? "text-sky-700"
                                        : "text-gray-600",
                              border: "border-gray-200", // Borda padrão se normal
                              progress: // Cor da barra de progresso do input atual
                                displayOcupacaoAtualPercent > 100
                                  ? "bg-red-400"
                                  : displayOcupacaoAtualPercent >= 80
                                    ? "bg-green-400"
                                    : displayOcupacaoAtualPercent >= 50
                                      ? "bg-blue-400"
                                      : displayOcupacaoAtualPercent >= 1
                                        ? "bg-sky-400"
                                        : "bg-gray-300",
                            },
                          };
                          
                          const currentCardClasses = statusClasses[statusGlobal];

                          return (
                            <div
                              key={mes.chave}
                              className={`${currentCardClasses.bg} ${currentCardClasses.border} rounded-md border p-2`}
                            >
                              <div className="mb-1.5 flex justify-between text-xs">
                                <span className={currentCardClasses.text}>
                                  {format(new Date(mes.ano, mes.mesNumero - 1), "MMM", { locale: pt })}
                                </span>
                                <div className="flex flex-col items-end">
                                  <span className={`font-medium ${currentCardClasses.text}`}>
                                    {displayOcupacaoAtualPercent.toFixed(0)}% 
                                  </span>
                                  <span className="text-[10px] text-green-600 mt-0.5">
                                    Total Aprovado: {displayPreviewAprovadaPercent.toFixed(0)}%
                                  </span>
                                  <span className="text-[10px] text-amber-600">
                                    Total Pendente: {displayPreviewPendentePercent.toFixed(0)}%
                                  </span>
                                  {/* <span className="text-[10px] text-azul/60">
                                    Preview Total: {displayPreviewTotalPercent.toFixed(0)}%
                                  </span> */}
                                </div>
                              </div>

                              {/* Barras de progresso */}
                              <div className="space-y-1">
                                {/* Ocupação atual (sendo inserida para este WP) */}
                                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200/70">
                                  <div
                                    className={`h-full ${currentCardClasses.progress} rounded-full transition-all duration-300`}
                                    style={{ width: `${Math.min(displayOcupacaoAtualPercent, 100)}%` }} // Barra não passa de 100% visualmente
                                  />
                                </div>
                                {/* Ocupação Total Aprovada (do utilizador no mês) */}
                                <div className="h-1 overflow-hidden rounded-full bg-gray-200/70" title={`Total Aprovado: ${displayPreviewAprovadaPercent.toFixed(0)}%`}>
                                  <div
                                    className={`h-full rounded-full ${displayPreviewAprovadaPercent >= 100 ? 'bg-red-500' : displayPreviewAprovadaPercent >=80 ? 'bg-amber-500' : 'bg-green-500'} transition-all duration-300`}
                                    style={{ width: `${Math.min(displayPreviewAprovadaPercent, 100)}%` }}
                                  />
                                </div>
                                {/* Ocupação Total Pendente (do utilizador no mês) */}
                                <div className="h-1 overflow-hidden rounded-full bg-gray-200/70" title={`Total Pendente: ${displayPreviewPendentePercent.toFixed(0)}%`}>
                                  <div
                                    className="h-full rounded-full bg-yellow-500 transition-all duration-300" // Usar uma cor consistente para pendente
                                    style={{ width: `${Math.min(displayPreviewPendentePercent,100)}%` }} // Pendente também não deve passar 100% na barra
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
                                    statusGlobal === "sobre-alocado" // Input border if global approved is at 100%
                                      ? "border-red-400 focus:border-red-600 ring-red-500"
                                      : statusGlobal === "limite"
                                      ? "border-amber-400 focus:border-amber-600 ring-amber-500"
                                      : "border-azul/20" 
                                  }`}
                                  placeholder="0,00"
                                  disabled={isInputDisabled}
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
              {/* Botão de Adicionar/Guardar */}
              <Button
                onClick={handleAddAlocacao}
                disabled={isSaveDisabled || (!selectedUserId && !recursoEmEdicao)}
                className={`h-8 rounded-lg px-4 ${isSaveDisabled || (!selectedUserId && !recursoEmEdicao) ? 'disabled:cursor-not-allowed disabled:opacity-50' : 'bg-azul text-white hover:bg-azul/90'}`}
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
