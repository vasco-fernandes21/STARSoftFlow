import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { format, addMonths, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { 
  CalendarIcon, 
  FileIcon, 
  XIcon, 
  ClockIcon, 
  CheckIcon, 
  PencilIcon, 
  TrashIcon, 
  PlusIcon,
  Package,
  Euro,
  Users,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rubrica, type Prisma } from "@prisma/client";
import { Form as RecursoForm } from "@/components/projetos/criar/novo/recursos/form";
import { Item as RecursoItem } from "@/components/projetos/criar/novo/recursos/item";
import { MaterialForm } from "@/components/projetos/criar/novo/workpackages/material/form";
import { TarefaForm } from "@/components/projetos/criar/novo/workpackages/tarefas/form";
import { TarefaItem } from "@/components/projetos/criar/novo/workpackages/tarefas/item";
import { Details } from "@/components/projetos/criar/novo/recursos/details";

type WorkpackageWithRelations = Prisma.WorkpackageGetPayload<{
  include: {
    projeto: true;
    tarefas: {
      include: {
        entregaveis: true;
      };
    };
    materiais: true;
    recursos: {
      include: {
        user: true;
      };
    };
  };
}>;

type MaterialWithRelations = Prisma.MaterialGetPayload<{
  include: { workpackage: true }
}>;

type AlocacaoRecursoWithRelations = Prisma.AlocacaoRecursoGetPayload<{
  include: { user: true }
}>;

interface MenuWorkpackageProps {
  workpackageId: string;
  open: boolean;
  onClose: () => void;
  startDate: Date;
  endDate: Date;
  onUpdate?: () => Promise<void>;
}

type NovaAlocacao = {
  userId: string;
  mes: number;
  ano: number;
  ocupacao: number;
};

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
    const nome = format(data, 'MMM', { locale: ptBR });
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

// Adicionar função para formatar data de forma segura
function formatarDataSegura(ano: string | number, mes: string | number, formatString: string): string {
  try {
    const data = new Date(Number(ano), Number(mes) - 1);
    return format(data, formatString, { locale: ptBR });
  } catch (error) {
    return "Data inválida";
  }
}

// Função para agrupar alocações por ano e mês com validação
function agruparAlocacoesPorAnoMes(alocacoes: Array<{
  mes: number;
  ano: number;
  ocupacao: any;
}> | undefined) {
  if (!alocacoes || !Array.isArray(alocacoes)) {
    return {};
  }

  return alocacoes.reduce((acc, alocacao) => {
    if (!alocacao || typeof alocacao.ano === 'undefined' || typeof alocacao.mes === 'undefined') {
      return acc;
    }

    const ano = alocacao.ano.toString();
    if (!acc[ano]) {
      acc[ano] = {};
    }

    // Garantir que ocupacao seja um número
    const ocupacaoNumero = typeof alocacao.ocupacao === 'number' 
      ? alocacao.ocupacao 
      : typeof alocacao.ocupacao === 'string'
        ? parseFloat(alocacao.ocupacao)
        : Number(alocacao.ocupacao) || 0;

    acc[ano][alocacao.mes] = ocupacaoNumero * 100;
    return acc;
  }, {} as Record<string, Record<number, number>>);
}

export function MenuWorkpackage({ workpackageId, open, onClose, startDate, endDate, onUpdate }: MenuWorkpackageProps) {
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    nome: "",
    preco: 0,
    quantidade: 0,
    rubrica: "MATERIAIS" as Rubrica,
    ano_utilizacao: new Date().getFullYear()
  });
  const [addingRecurso, setAddingRecurso] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [novasAlocacoes, setNovasAlocacoes] = useState<Record<string, string>>({});
  const [editingMaterial, setEditingMaterial] = useState<{
    id: string;
    field: 'quantidade' | 'preco';
    value: string;
  } | null>(null);
  const [addingTarefa, setAddingTarefa] = useState(false);

  // Adicionar estado para expandir/colapsar recursos
  const [expandedRecursos, setExpandedRecursos] = useState<Record<string, boolean>>({});

  const { data: workpackage, refetch: refetchWorkpackage } = api.workpackage.getById.useQuery<WorkpackageWithRelations>(
    { id: workpackageId },
    { enabled: !!workpackageId && open }
  );

  const utils = api.useContext();

  const updateWorkpackageMutation = api.workpackage.update.useMutation({
    onSuccess: async () => {
      await refetchWorkpackage();
      if (onUpdate) {
        await onUpdate();
      }
      toast.success("Workpackage atualizado");
    }
  });

  const createMaterialMutation = api.workpackage.addMaterial.useMutation({
    onSuccess: async () => {
      await refetchWorkpackage();
      if (onUpdate) {
        await onUpdate();
      }
      setAddingMaterial(false);
      setNewMaterial({
        nome: "",
        preco: 0,
        quantidade: 0,
        rubrica: "MATERIAIS" as Rubrica,
        ano_utilizacao: new Date().getFullYear()
      });
      toast.success("Material adicionado");
    }
  });

  const deleteMaterialMutation = api.workpackage.removeMaterial.useMutation({
    onSuccess: () => {
      refetchWorkpackage();
      toast.success("Material removido");
    }
  });

  // Buscar utilizadores disponíveis
  const { data: utilizadores } = api.utilizador.getAll.useQuery(
    { limit: 100 },
    { staleTime: 5 * 60 * 1000 }
  );

  // Mutation para adicionar alocação
  const addAlocacaoMutation = api.workpackage.addAlocacao.useMutation({
    onSuccess: () => {
      refetchWorkpackage();
      setAddingRecurso(false);
      toast.success("Recurso alocado com sucesso");
      setNovasAlocacoes({});
      setSelectedUserId("");
    }
  });

  // Mutation para remover alocação
  const removeAlocacaoMutation = api.workpackage.removeAlocacao.useMutation({
    onSuccess: () => {
      refetchWorkpackage();
      toast.success("Alocação removida com sucesso");
    }
  });

  // Adicionar mutation para atualizar material
  const updateMaterialMutation = api.material.update.useMutation({
    onSuccess: () => {
      refetchWorkpackage();
      setEditingMaterial(null);
      toast.success('Material atualizado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar material');
    }
  });

  // Gerar array de meses entre as datas do projeto
  const mesesEntreDatas = gerarMesesEntreDatas(startDate, endDate);
    
  // Agrupar meses por ano
  const mesesPorAno = mesesEntreDatas.reduce((acc, mes) => {
    const ano = mes.ano.toString();
    if (!acc[ano]) {
      acc[ano] = [];
    }
    acc[ano].push(mes);
    return acc;
  }, {} as Record<string, typeof mesesEntreDatas>);
  
  // Lista de anos disponíveis
  const anosDisponiveis = Object.keys(mesesPorAno).sort();
  
  // Estado para o ano selecionado
  const [anoSelecionado, setAnoSelecionado] = useState<string>("");
  
  // Definir o ano selecionado como o primeiro ano disponível
  useEffect(() => {
    if (anosDisponiveis.length > 0 && !anoSelecionado) {
      setAnoSelecionado(anosDisponiveis[0] || "");
    }
  }, [anosDisponiveis, anoSelecionado]);

  // Navegação entre anos
  const navegarAnoAnterior = () => {
    const indexAtual = anosDisponiveis.indexOf(anoSelecionado);
    if (indexAtual > 0) {
      const anoAnterior = anosDisponiveis[indexAtual - 1];
      if (anoAnterior) {
        setAnoSelecionado(anoAnterior);
      }
    }
  };
  
  const navegarProximoAno = () => {
    const indexAtual = anosDisponiveis.indexOf(anoSelecionado);
    if (indexAtual < anosDisponiveis.length - 1) {
      const proximoAno = anosDisponiveis[indexAtual + 1];
      if (proximoAno) {
        setAnoSelecionado(proximoAno);
      }
    }
  };

  if (!workpackage) {
    return (
      <Sheet open={open} onOpenChange={onClose} modal={false}>
        <SheetContent 
          className="p-0 w-[450px] bg-gradient-to-br from-gray-50 to-blue-50/50 shadow-2xl rounded-l-2xl border-l border-gray-200/50"
        >
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-75"></div>
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-150"></div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const handleEstadoChange = async () => {
    await updateWorkpackageMutation.mutate({
      id: workpackageId,
      estado: !workpackage.estado
    });
  };

  const handleNameSave = async () => {
    if (newName.trim() === "") return;
    await updateWorkpackageMutation.mutate({
      id: workpackageId,
      nome: newName
    });
    setEditingName(false);
  };

  const handleDescriptionSave = async () => {
    await updateWorkpackageMutation.mutate({
      id: workpackageId,
      descricao: newDescription
    });
    setEditingDescription(false);
  };

  const handleDateChange = async (field: 'inicio' | 'fim', date: Date | undefined) => {
    await updateWorkpackageMutation.mutate({
      id: workpackageId,
      [field]: date
    });
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.nome || newMaterial.quantidade <= 0 || newMaterial.preco <= 0) {
      toast.error("Preencha todos os campos do material corretamente");
      return;
    }
    await createMaterialMutation.mutate({ workpackageId, ...newMaterial });
  };

  // Função para adicionar nova alocação
  const handleAddAlocacao = async () => {
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
      .filter((alocacao): alocacao is NovaAlocacao => alocacao !== null);

    if (alocacoesValidas.length === 0) {
      toast.error("Nenhuma alocação válida para adicionar");
      return;
    }

    try {
      await Promise.all(
        alocacoesValidas.map(alocacao => 
          addAlocacaoMutation.mutate({
            workpackageId,
            ...alocacao
          })
        )
      );
      
      // Limpar as alocações após adicionar com sucesso
      setNovasAlocacoes({});
    } catch (error) {
      toast.error("Erro ao adicionar alocações");
    }
  };

  // Função para remover alocação
  const handleRemoveAlocacao = async (userId: string, mes: number, ano: number) => {
    await removeAlocacaoMutation.mutate({
      workpackageId,
      userId,
      mes,
      ano
    });
  };

  // Função para remover todas as alocações de um recurso
  const handleRemoveRecurso = async (userId: string) => {
    try {
      const recurso = workpackage.recursos?.find(r => r.userId === userId);
      if (!recurso) return;
      
      // Obter todas as alocações do recurso, se existirem
      const alocacoes = workpackage.recursos
        .filter(r => r.userId === userId)
        .flatMap(r => {
          // Verificar se o recurso tem a propriedade alocacoes
          if ('alocacoes' in r && Array.isArray(r.alocacoes)) {
            return r.alocacoes.map(a => ({
              mes: a.mes,
              ano: a.ano
            }));
          }
          return [];
        });
      
      // Remover todas as alocações do recurso
      if (alocacoes.length > 0) {
        await Promise.all(
          alocacoes.map(({mes, ano}) => 
            removeAlocacaoMutation.mutate({
              workpackageId,
              userId,
              mes,
              ano
            })
          )
        );
      }
      
      toast.success("Recurso removido com sucesso");
      await refetchWorkpackage();
    } catch (error) {
      toast.error("Erro ao remover recurso");
    }
  };

  // Atualizar o handleMaterialValueChange para não enviar para a API imediatamente
  const handleMaterialValueChange = (
    materialId: string,
    field: 'quantidade' | 'preco',
    value: string
  ) => {
    // Se o valor estiver vazio, permite a edição continuar
    if (!value) {
      setEditingMaterial(prev => prev ? { ...prev, value } : null);
      return;
    }

    // Remove todos os caracteres não numéricos exceto . e ,
    const sanitizedValue = value.replace(/[^\d.,]/g, '');
    
    // Converte vírgula para ponto para processamento
    const normalizedValue = sanitizedValue.replace(',', '.');
    
    // Verifica se é um número válido
    if (!/^\d*\.?\d*$/.test(normalizedValue)) return;
    
    const numeroValido = parseFloat(normalizedValue);
    if (isNaN(numeroValido)) return;

    // Apenas atualiza o estado local
    setEditingMaterial(prev => prev ? { ...prev, value: sanitizedValue } : null);
  };

  // Substituir a chamada direta à API pela mutation
  const handleSaveMaterial = async (materialId: string) => {
    if (!editingMaterial) return;

    const value = editingMaterial.value.replace(',', '.');
    const numeroValido = parseFloat(value);

    if (isNaN(numeroValido)) {
      toast.error('Valor inválido');
      return;
    }

    try {
      await updateMaterialMutation.mutate({
        id: parseInt(materialId),
        data: {
          [editingMaterial.field]: numeroValido
        }
      });
    } catch (error) {
      toast.error('Erro ao atualizar material');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose} modal={false}>
      <SheetContent 
        className="w-full lg:w-[640px] p-0 overflow-y-auto sm:max-w-none bg-white/95 backdrop-blur-xl shadow-2xl border-l border-gray-100 rounded-l-3xl"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-100 bg-gradient-to-b from-white via-white to-gray-50/50 p-8 sticky top-0 z-10">
            <SheetHeader className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  {editingName ? (
                    <div className="flex items-center gap-3 w-full">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200/20 text-lg font-medium rounded-xl"
                        placeholder="Nome do workpackage"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          onClick={handleNameSave}
                          className="h-10 w-10 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-700"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setEditingName(false)}
                          className="h-10 w-10 rounded-xl hover:bg-red-50 text-red-500"
                        >
                          <XIcon className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-semibold text-gray-800 tracking-tight">
                        {workpackage.nome}
                      </h2>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setNewName(workpackage.nome);
                          setEditingName(true);
                        }}
                        className="h-9 w-9 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-700"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <Button 
                    variant="ghost"
                    onClick={onClose}
                    className="h-10 w-10 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-700"
                  >
                    <XIcon className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    className={cn(
                      "rounded-xl px-4 py-1.5 font-medium cursor-pointer transition-all duration-200",
                      workpackage.estado
                        ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                    onClick={handleEstadoChange}
                  >
                    {workpackage.estado ? "Concluído" : "Em progresso"}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {workpackage.inicio && workpackage.fim && (
                      <>
                        {format(new Date(workpackage.inicio), "dd MMM", { locale: ptBR })} - {" "}
                        {format(new Date(workpackage.fim), "dd MMM yyyy", { locale: ptBR })}
                      </>
                    )}
                  </span>
                </div>
              </div>
            </SheetHeader>
          </div>

          <ScrollArea className="flex-1 px-8">
            <div className="py-8 space-y-8">
              {/* Descrição */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gray-100/80 flex items-center justify-center">
                      <FileIcon className="h-5 w-5 text-gray-700" />
                    </div>
                    <h3 className="text-base font-medium text-gray-700">Descrição</h3>
                  </div>
                  {!editingDescription && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setNewDescription(workpackage.descricao || "");
                        setEditingDescription(true);
                      }}
                      className="h-8 w-8 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-700"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <Card className="border border-gray-100 shadow-lg bg-white/90 backdrop-blur-sm p-6 rounded-xl">
                  {editingDescription ? (
                    <div className="space-y-4">
                      <Textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        className="min-h-[120px] border-gray-200 focus:border-gray-300 focus:ring-gray-200/20 rounded-xl"
                        placeholder="Descrição do workpackage"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => setEditingDescription(false)}
                          className="text-gray-500 hover:text-gray-700 rounded-xl"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleDescriptionSave}
                          className="bg-gray-900 text-white hover:bg-gray-800 rounded-xl"
                        >
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {workpackage.descricao || "Sem descrição"}
                    </p>
                  )}
                </Card>
              </div>

              {/* Tarefas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Tarefas</span>
                  {!addingTarefa && (
                        <Button
                          variant="ghost"
                      onClick={() => setAddingTarefa(true)}
                      className="h-7 w-7 rounded-md bg-gray-50"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                        </Button>
                  )}
                      </div>

                        <div className="space-y-2">
                  {addingTarefa && (
                    <div className="bg-gray-50/50 rounded-md p-3">
                      <TarefaForm
                        workpackageId={workpackageId}
                        workpackageInicio={workpackage.inicio || new Date()}
                        workpackageFim={workpackage.fim || new Date()}
                        onSubmit={() => {
                          setAddingTarefa(false);
                          refetchWorkpackage();
                        }}
                        onCancel={() => setAddingTarefa(false)}
                      />
                    </div>
                  )}

                  {workpackage.tarefas.map((tarefa) => (
                    <TarefaItem
                      key={tarefa.id}
                      tarefa={tarefa}
                      workpackageId={workpackageId}
                      handlers={{
                        addEntregavel: () => {},
                        removeEntregavel: () => {},
                        removeTarefa: () => {}
                      }}
                    />
                  ))}
                </div>
                            </div>

              {/* Recursos */}
              <div className="space-y-2">
                          <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Recursos</span>
                  {!addingRecurso && (
                            <Button
                              variant="ghost"
                      onClick={() => setAddingRecurso(true)}
                      className="h-7 w-7 rounded-md bg-gray-50"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                            </Button>
                              )}
                            </div>
                            
                <div className="space-y-2">
                  {addingRecurso && (
                    <div className="bg-gray-50/50 rounded-md p-3">
                      <RecursoForm
                        workpackageId={workpackageId}
                        inicio={workpackage.inicio || new Date()}
                        fim={workpackage.fim || new Date()}
                        onCancel={() => setAddingRecurso(false)}
                        onAddAlocacao={handleAddAlocacao}
                        utilizadores={utilizadores?.data || []}
                      />  
                    </div>
                  )}

                  {/* Agrupar recursos por userId para evitar duplicação */}
                  {(() => {
                    // Criar um mapa para agrupar recursos pelo userId
                    const recursosAgrupados = new Map();
                    
                    // Agrupar recursos pelo userId
                    workpackage.recursos?.forEach(recurso => {
                      if (!recurso) return;
                      
                      if (!recursosAgrupados.has(recurso.userId)) {
                        recursosAgrupados.set(recurso.userId, {
                          userId: recurso.userId,
                          user: recurso.user,
                          alocacoes: []
                        });
                      }
                      
                      // Adicionar alocações ao recurso agrupado
                      if ('alocacoes' in recurso && Array.isArray(recurso.alocacoes)) {
                        const recursoAgrupado = recursosAgrupados.get(recurso.userId);
                        recursoAgrupado.alocacoes = [
                          ...recursoAgrupado.alocacoes,
                          ...recurso.alocacoes
                        ];
                      }
                    });
                    
                    // Converter mapa para array e renderizar
                    return Array.from(recursosAgrupados.values()).map(recurso => {
                      const alocacoesPorAnoMes = agruparAlocacoesPorAnoMes(recurso.alocacoes);
                      const isExpanded = expandedRecursos[recurso.userId] || false;
                      
                      return (
                        <Details
                          key={`${recurso.userId}-${workpackageId}`}
                          userId={recurso.userId}
                          recurso={{
                            userId: recurso.userId,
                            alocacoes: recurso.alocacoes || []
                          }}
                          membroEquipa={recurso.user}
                          isExpanded={isExpanded}
                          workpackageId={workpackageId}
                          onToggleExpand={() => {
                            setExpandedRecursos(prev => ({
                              ...prev,
                              [recurso.userId]: !isExpanded
                            }));
                          }}
                          onEdit={() => {
                            // Lógica adicional se necessário
                          }}
                          onRemove={() => {
                            handleRemoveRecurso(recurso.userId);
                          }}
                          formatarDataSegura={formatarDataSegura}
                          alocacoesPorAnoMes={alocacoesPorAnoMes}
                          utilizadores={utilizadores?.data || []}
                          inicio={workpackage.inicio || new Date()}
                          fim={workpackage.fim || new Date()}
                          onSaveEdit={(workpackageId, alocacoes) => {
                            Promise.all(
                              alocacoes.map(alocacao => 
                                addAlocacaoMutation.mutate({
                                  workpackageId,
                                  userId: alocacao.userId,
                                  mes: alocacao.mes,
                                  ano: alocacao.ano,
                                  ocupacao: Number(alocacao.ocupacao)
                                })
                              )
                            ).then(() => {
                              refetchWorkpackage();
                            });
                          }}
                        />
                      );
                    });
                  })()}
                                    </div>
              </div>

              {/* Materiais */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Materiais</span>
                  {!addingMaterial && (
                  <Button
                      variant="ghost"
                    onClick={() => setAddingMaterial(true)}
                      className="h-7 w-7 rounded-md bg-gray-50"
                  >
                      <PlusIcon className="h-3.5 w-3.5" />
                  </Button>
                  )}
                </div>

                <div className="space-y-2">
                {addingMaterial && (
                    <div className="bg-gray-50/50 rounded-md p-3">
                      <MaterialForm
                        workpackageId={workpackageId}
                        onCancel={() => setAddingMaterial(false)}
                        onSuccess={() => {
                          setAddingMaterial(false);
                          refetchWorkpackage();
                        }}
                          />
                        </div>
                  )}

                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Rubrica</TableHead>
                        <TableHead className="text-xs text-right">Qtd.</TableHead>
                        <TableHead className="text-xs text-right">Preço</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workpackage.materiais.map((material) => (
                        <TableRow key={material.id}>
                          <TableCell className="text-xs">{material.nome}</TableCell>
                          <TableCell className="text-xs">{material.rubrica}</TableCell>
                          <TableCell className="text-xs text-right">{material.quantidade}</TableCell>
                          <TableCell className="text-xs text-right">
                            {material.preco.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium">
                            {(material.quantidade * Number(material.preco)).toLocaleString('pt-PT', {
                                  style: 'currency', 
                                  currency: 'EUR' 
                                })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMaterialMutation.mutate({
                                    workpackageId,
                                materialId: material.id
                              })}
                              className="h-6 w-6 p-0 rounded-md hover:bg-red-50 hover:text-red-500"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}