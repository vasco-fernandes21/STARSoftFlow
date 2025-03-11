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

              {/* Alocação de Recursos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gray-100/80 flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-700" />
                    </div>
                    <h3 className="text-base font-medium text-gray-700">Alocação de Recursos</h3>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setAddingRecurso(true)}
                    className="rounded-xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 border-gray-200"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Adicionar Recurso
                  </Button>
                </div>

                {addingRecurso && (
                  <Card className="border border-gray-100 shadow-lg bg-white/90 backdrop-blur-sm p-6 rounded-xl mb-4">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-medium text-gray-700">Nova Alocação</h4>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setAddingRecurso(false);
                            setNovasAlocacoes({});
                            setSelectedUserId("");
                          }}
                          className="h-8 w-8 rounded-xl hover:bg-red-50 hover:text-red-500"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-sm text-gray-500">Colaborador</Label>
                          <Select
                            value={selectedUserId}
                            onValueChange={setSelectedUserId}
                          >
                            <SelectTrigger className="w-full bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200/20 rounded-xl">
                              <SelectValue placeholder="Selecionar colaborador" />
                            </SelectTrigger>
                            <SelectContent>
                              {utilizadores?.items?.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name || user.email || "Sem nome"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedUserId && (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <Label className="text-sm text-gray-500">Alocação Mensal (0-1)</Label>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={navegarAnoAnterior}
                                  disabled={anosDisponiveis.indexOf(anoSelecionado) === 0}
                                  className="h-7 w-7 p-0 rounded-full"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                
                                <Badge variant="outline" className="bg-white font-semibold">
                                  {anoSelecionado}
                                </Badge>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={navegarProximoAno}
                                  disabled={anosDisponiveis.indexOf(anoSelecionado) === anosDisponiveis.length - 1}
                                  className="h-7 w-7 p-0 rounded-full"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="relative">
                              <ScrollArea className="w-full">
                                <div className="grid grid-cols-6 gap-4">
                                  {/* Janeiro a Junho */}
                                  {mesesPorAno[anoSelecionado]?.filter(mes => mes.mesNumero <= 6).map(mes => (
                                    <div key={mes.chave} className="flex flex-col items-center space-y-1">
                                      <Label className="text-xs text-gray-500">
                                        {format(mes.data, 'MMM', { locale: ptBR }).charAt(0).toUpperCase() + 
                                        format(mes.data, 'MMM', { locale: ptBR }).slice(1, 3)}/{String(mes.ano).slice(2)}
                                      </Label>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        className="text-center h-9 w-20 text-sm bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200/20 rounded-xl"
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
                                      <Label className="text-xs text-gray-500">
                                        {format(mes.data, 'MMM', { locale: ptBR }).charAt(0).toUpperCase() + 
                                        format(mes.data, 'MMM', { locale: ptBR }).slice(1, 3)}/{String(mes.ano).slice(2)}
                                      </Label>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        className="text-center h-9 w-20 text-sm bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200/20 rounded-xl"
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
                            <div className="flex flex-wrap gap-2">
                              {mesesEntreDatas
                                .filter(mes => parseFloat(novasAlocacoes[mes.chave] || "0") > 0)
                                .map(mes => (
                                  <Badge 
                                    key={mes.chave}
                                    className="rounded-full px-2 py-1 text-xs bg-blue-50/70 text-azul border-blue-200"
                                  >
                                    {mes.formatado}: {(novasAlocacoes[mes.chave] || "0").replace('.', ',')}
                                  </Badge>
                                ))
                              }
                            </div>
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
                            className="text-gray-500 hover:text-gray-700 rounded-xl"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleAddAlocacao}
                            disabled={!selectedUserId || Object.values(novasAlocacoes).every(v => v === "0")}
                            className="bg-gray-900 text-white hover:bg-gray-800 rounded-xl"
                          >
                            Adicionar Alocação
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                <Card className="border border-gray-100 shadow-lg bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
                  {/* Agrupar recursos por utilizador */}
                  <div className="divide-y divide-gray-100">
                    {(workpackage?.recursos ?? []).length > 0 ? (
                      Object.entries(
                        (workpackage?.recursos ?? []).reduce((acc, alocacao) => {
                          acc[alocacao.userId] = acc[alocacao.userId] || { user: alocacao.user, alocacoes: {} };
                          acc[alocacao.userId].alocacoes[`${alocacao.mes}-${alocacao.ano}`] = Number(alocacao.ocupacao);
                          return acc;
                        }, {} as Record<string, { user: any; alocacoes: Record<string, number> }>)
                      ).map(([userId, { user, alocacoes }]) => (
                        <div key={userId} className="p-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                                <Users className="h-4 w-4 text-gray-600" />
                              </div>
                              <span className="font-medium text-gray-800">
                                {user?.name || "Utilizador não encontrado"}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const confirmed = window.confirm("Tem a certeza que deseja remover todas as alocações deste recurso?");
                                if (confirmed) {
                                  Object.entries(alocacoes).forEach(([mesAno, _]) => {
                                    const [mes, ano] = mesAno.split("-").map(Number);
                                    handleRemoveAlocacao(
                                      userId, 
                                      mes || 1, 
                                      ano || new Date().getFullYear()
                                    );
                                  });
                                }
                              }}
                              className="h-7 w-7 p-0 rounded-full hover:bg-red-50 hover:text-red-500"
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Alocação mensal para este utilizador */}
                          <div className="bg-gray-50/50 p-4 rounded-lg space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-medium text-gray-700">Alocação Mensal (0-1)</h4>
                              
                              {anosDisponiveis.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={navegarAnoAnterior}
                                    disabled={anosDisponiveis.indexOf(anoSelecionado) === 0}
                                    className="h-7 w-7 p-0 rounded-full"
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                  
                                  <Badge variant="outline" className="bg-white font-semibold">
                                    {anoSelecionado}
                                  </Badge>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={navegarProximoAno}
                                    disabled={anosDisponiveis.indexOf(anoSelecionado) === anosDisponiveis.length - 1}
                                    className="h-7 w-7 p-0 rounded-full"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            <div className="relative">
                              <ScrollArea className="w-full">
                                <div className="grid grid-cols-6 gap-4">
                                  {/* Janeiro a Junho */}
                                  {mesesPorAno[anoSelecionado]?.filter(mes => mes.mesNumero <= 6).map(mes => (
                                    <div key={mes.chave} className="flex flex-col items-center space-y-1">
                                      <Label className="text-xs text-gray-500">
                                        {format(mes.data, 'MMM', { locale: ptBR }).charAt(0).toUpperCase() + 
                                        format(mes.data, 'MMM', { locale: ptBR }).slice(1, 3)}/{String(mes.ano).slice(2)}
                                      </Label>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        className="text-center h-9 w-20 text-sm bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200/20 rounded-xl"
                                        value={alocacoes[mes.chave]?.toString().replace('.', ',') || ""}
                                        onChange={(e) => {
                                          const valor = e.target.value.replace(',', '.');
                                          
                                          // Se estiver vazio, remove a alocação
                                          if (valor === "") {
                                            handleRemoveAlocacao(
                                              userId, 
                                              mes.mesNumero || 1, 
                                              mes.ano || new Date().getFullYear()
                                            );
                                            return;
                                          }

                                          // Permite apenas números e um ponto decimal
                                          if (/^\d*\.?\d*$/.test(valor)) {
                                            const numeroValido = parseFloat(valor);
                                            // Se for um número válido entre 0 e 1, atualiza
                                            if (!isNaN(numeroValido) && numeroValido > 0 && numeroValido <= 1) {
                                              addAlocacaoMutation.mutate({
                                                workpackageId,
                                                userId,
                                                mes: mes.mesNumero || 1,
                                                ano: mes.ano || new Date().getFullYear(),
                                                ocupacao: numeroValido
                                              });
                                            }
                                          }
                                        }}
                                        placeholder="0,0"
                                      />
                                    </div>
                                  ))}
                                  
                                  {/* Julho a Dezembro */}
                                  {mesesPorAno[anoSelecionado]?.filter(mes => mes.mesNumero > 6).map(mes => (
                                    <div key={mes.chave} className="flex flex-col items-center space-y-1">
                                      <Label className="text-xs text-gray-500">
                                        {format(mes.data, 'MMM', { locale: ptBR }).charAt(0).toUpperCase() + 
                                        format(mes.data, 'MMM', { locale: ptBR }).slice(1, 3)}/{String(mes.ano).slice(2)}
                                      </Label>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        className="text-center h-9 w-20 text-sm bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200/20 rounded-xl"
                                        value={alocacoes[mes.chave]?.toString().replace('.', ',') || ""}
                                        onChange={(e) => {
                                          const valor = e.target.value.replace(',', '.');
                                          
                                          // Se estiver vazio, remove a alocação
                                          if (valor === "") {
                                            handleRemoveAlocacao(
                                              userId, 
                                              mes.mesNumero || 1, 
                                              mes.ano || new Date().getFullYear()
                                            );
                                            return;
                                          }

                                          // Permite apenas números e um ponto decimal
                                          if (/^\d*\.?\d*$/.test(valor)) {
                                            const numeroValido = parseFloat(valor);
                                            // Se for um número válido entre 0 e 1, atualiza
                                            if (!isNaN(numeroValido) && numeroValido > 0 && numeroValido <= 1) {
                                              addAlocacaoMutation.mutate({
                                                workpackageId,
                                                userId,
                                                mes: mes.mesNumero || 1,
                                                ano: mes.ano || new Date().getFullYear(),
                                                ocupacao: numeroValido
                                              });
                                            }
                                          }
                                        }}
                                        placeholder="0,0"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                            
                            {/* Resumo de alocação */}
                            <div className="flex flex-wrap gap-2">
                              {mesesEntreDatas
                                .filter(mes => Number(alocacoes[mes.chave] ?? 0) > 0)
                                .map(mes => (
                                  <Badge 
                                    key={mes.chave}
                                    className="rounded-full px-2 py-1 text-xs bg-blue-50/70 text-azul border-blue-200"
                                  >
                                    {mes.formatado}: {Number(alocacoes[mes.chave] ?? 0).toFixed(1)}
                                  </Badge>
                                ))
                              }
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-gray-400" />
                          <p>Nenhum recurso alocado</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Materiais */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gray-100/80 flex items-center justify-center">
                      <Package className="h-5 w-5 text-gray-700" />
                    </div>
                    <h3 className="text-base font-medium text-gray-700">Materiais</h3>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setAddingMaterial(true)}
                    className="rounded-xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 border-gray-200"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Adicionar Material
                  </Button>
                </div>

                {addingMaterial && (
                  <Card className="border border-gray-100 shadow-lg bg-white/90 backdrop-blur-sm p-6 rounded-xl mb-4">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-medium text-gray-700">Novo Material</h4>
                        <Button
                          variant="ghost"
                          onClick={() => setAddingMaterial(false)}
                          className="h-8 w-8 rounded-xl hover:bg-red-50 hover:text-red-500"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                          <Label className="text-sm text-gray-500">Nome do Material</Label>
                          <Input
                            value={newMaterial.nome}
                            onChange={(e) => setNewMaterial({ ...newMaterial, nome: e.target.value })}
                            className="w-full bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200/20 rounded-xl"
                            placeholder="Ex: Computador Portátil"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-gray-500">Quantidade</Label>
                          <Input
                            type="number"
                            value={newMaterial.quantidade || ""}
                            onChange={(e) => setNewMaterial({ 
                              ...newMaterial, 
                              quantidade: parseFloat(e.target.value) || 0 
                            })}
                            className="w-full bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200/20 rounded-xl"
                            placeholder="Ex: 1"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-gray-500">Preço Unitário (€)</Label>
                          <Input
                            type="number"
                            value={newMaterial.preco || ""}
                            onChange={(e) => setNewMaterial({ 
                              ...newMaterial, 
                              preco: parseFloat(e.target.value) || 0 
                            })}
                            className="w-full bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200/20 rounded-xl"
                            placeholder="Ex: 1000.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-gray-500">Rubrica</Label>
                          <Select
                            value={newMaterial.rubrica}
                            onValueChange={(value) => setNewMaterial({ 
                              ...newMaterial, 
                              rubrica: value as Rubrica 
                            })}
                          >
                            <SelectTrigger className="w-full bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200/20 rounded-xl">
                              <SelectValue placeholder="Selecione a rubrica" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MATERIAIS">Materiais</SelectItem>
                              <SelectItem value="SERVICOS_TERCEIROS">Serviços de Terceiros</SelectItem>
                              <SelectItem value="OUTROS_SERVICOS">Outros Serviços</SelectItem>
                              <SelectItem value="DESLOCACAO_ESTADIAS">Deslocação e Estadias</SelectItem>
                              <SelectItem value="OUTROS_CUSTOS">Outros Custos</SelectItem>
                              <SelectItem value="CUSTOS_ESTRUTURA">Custos de Estrutura</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-gray-500">Ano de Utilização</Label>
                          <Input
                            type="number"
                            value={newMaterial.ano_utilizacao}
                            onChange={(e) => setNewMaterial({ 
                              ...newMaterial, 
                              ano_utilizacao: parseInt(e.target.value) || new Date().getFullYear() 
                            })}
                            className="w-full bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200/20 rounded-xl"
                            placeholder={new Date().getFullYear().toString()}
                          />
                        </div>

                        <div className="col-span-2 flex items-center justify-between pt-4">
                          <div className="flex items-center gap-2">
                            <Euro className="h-5 w-5 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                              Total: {(newMaterial.quantidade * newMaterial.preco).toLocaleString("pt-PT", {
                                style: "currency",
                                currency: "EUR"
                              })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              onClick={() => setAddingMaterial(false)}
                              className="text-gray-500 hover:text-gray-700 rounded-xl"
                            >
                              Cancelar
                            </Button>
                            <Button
                              onClick={handleAddMaterial}
                              className="bg-gray-900 text-white hover:bg-gray-800 rounded-xl"
                            >
                              Adicionar Material
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                <Card className="border border-gray-100 shadow-lg bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50/80">
                      <TableRow className="hover:bg-transparent border-gray-100">
                        <TableHead className="py-4 text-sm font-medium text-gray-700">Nome</TableHead>
                        <TableHead className="py-4 text-sm font-medium text-gray-700">Rubrica</TableHead>
                        <TableHead className="py-4 text-sm font-medium text-gray-700 text-right">Quantidade</TableHead>
                        <TableHead className="py-4 text-sm font-medium text-gray-700 text-right">Preço Unit.</TableHead>
                        <TableHead className="py-4 text-sm font-medium text-gray-700 text-right">Total</TableHead>
                        <TableHead className="w-[70px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workpackage?.materiais?.map(material => (
                        <TableRow key={material.id} className="border-gray-100 hover:bg-gray-50/50">
                          <TableCell className="py-4 text-gray-600">{material.nome}</TableCell>
                          <TableCell className="py-4 text-gray-500">{material.rubrica.replace(/_/g, " ")}</TableCell>
                          <TableCell className="py-4 text-right">
                            {editingMaterial?.id === material.id.toString() ? (
                              <div className="flex items-center gap-2 justify-end">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={editingMaterial.value}
                                  onChange={(e) => handleMaterialValueChange(material.id.toString(), 'quantidade', e.target.value)}
                                  className="w-24 text-right"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveMaterial(material.id.toString())}
                                  className="h-8 w-8 p-0"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingMaterial({ 
                                  id: material.id.toString(), 
                                  field: 'quantidade',
                                  value: material.quantidade.toString().replace('.', ',')
                                })}
                                className="hover:text-azul"
                              >
                                {material.quantidade}
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-right">
                            {editingMaterial?.id === material.id.toString() ? (
                              <div className="flex items-center gap-2 justify-end">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={editingMaterial.value}
                                  onChange={(e) => handleMaterialValueChange(material.id.toString(), 'preco', e.target.value)}
                                  className="w-24 text-right"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveMaterial(material.id.toString())}
                                  className="h-8 w-8 p-0"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingMaterial({ 
                                  id: material.id.toString(), 
                                  field: 'preco',
                                  value: material.preco.toString().replace('.', ',')
                                })}
                                className="hover:text-azul"
                              >
                                {Number(material.preco).toLocaleString('pt-PT', { 
                                  style: 'currency', 
                                  currency: 'EUR' 
                                })}
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-right font-medium text-gray-900">
                            {(material.quantidade * Number(material.preco)).toLocaleString("pt-PT", {
                              style: "currency",
                              currency: "EUR"
                            })}
                          </TableCell>
                          <TableCell className="py-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const confirmed = window.confirm("Tem a certeza que deseja remover este material?");
                                if (confirmed) {
                                  deleteMaterialMutation.mutate({
                                    workpackageId,
                                    materialId: Number(material.id)
                                  });
                                }
                              }}
                              className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-500"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 border-gray-100 bg-gray-50/80">
                        <TableCell colSpan={4} className="py-4 text-right font-medium text-gray-700">
                          Total
                        </TableCell>
                        <TableCell className="py-4 text-right font-semibold text-gray-900">
                          {(workpackage?.materiais ?? []).reduce(
                            (total, material) => total + (material.quantidade * Number(material.preco)),
                            0
                          ).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}