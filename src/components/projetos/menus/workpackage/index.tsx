import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/trpc/react";
import { Prisma, Rubrica, AlocacaoRecurso } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { WorkpackageHeader } from "./header";
import { WorkpackageDescricao } from "./descricao";
import { WorkpackageTarefas } from "./tarefas";
import { WorkpackageRecursos } from "./recursos";
import { WorkpackageMateriais } from "./materiais";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkpackageMutations } from "./useMutations";
import { gerarMesesEntreDatas } from "@/lib/utils";
import { toast } from "sonner";
import { WorkpackageCompleto } from "@/components/projetos/types";

interface MenuWorkpackageProps {
  workpackageId: string;
  open: boolean;
  onClose: () => void;
  startDate: Date;
  endDate: Date;
  onUpdate?: () => Promise<void>;
}

// usar o modelo do Prisma - remover NovaAlocacao
type CreateAlocacaoInput = Omit<AlocacaoRecurso, "id" | "workpackage">;

// Definir o tipo para as alocações válidas para resolver o problema do Decimal
type AlocacaoInputData = {
  userId: string;
  mes: number;
  ano: number;
  ocupacao: number;
};

export function MenuWorkpackage({ workpackageId, open, onClose, startDate, endDate, onUpdate }: MenuWorkpackageProps) {
  // estados gerais
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [addingTarefa, setAddingTarefa] = useState(false);
  const [addingRecurso, setAddingRecurso] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    nome: "",
    preco: 0,
    quantidade: 0,
    rubrica: "MATERIAIS" as Rubrica,
    ano_utilizacao: new Date().getFullYear()
  });
  const [selectedUserId, setSelectedUserId] = useState("");
  const [novasAlocacoes, setNovasAlocacoes] = useState<Record<string, string>>({});
  const [editingMaterial, setEditingMaterial] = useState<{
    id: string;
    field: 'quantidade' | 'preco';
    value: string;
  } | null>(null);

  // outros estados e querys
  const queryClient = useQueryClient();
  const { data: workpackage } = api.workpackage.getById.useQuery<WorkpackageCompleto>(
    { id: workpackageId },
    { enabled: !!workpackageId && open }
  );
  
  // obter mutations através do hook personalizado
  const mutations = useWorkpackageMutations(workpackageId, queryClient, onUpdate);
  
  // lógica para anos e meses
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
  
  // Handler para mudança de estado - corrigir erro de undefined
  const handleEstadoChange = async () => {
    if (!workpackage) return;
    
    await mutations.updateWorkpackageMutation.mutate({
      id: workpackageId,
      estado: !workpackage.estado
    });
  };

  // Handler para salvar nome
  const handleNameSave = async () => {
    if (newName.trim() === "") return;
    await mutations.updateWorkpackageMutation.mutate({
      id: workpackageId,
      nome: newName
    });
    setEditingName(false);
  };

  // Handler para salvar descrição
  const handleDescriptionSave = async () => {
    await mutations.updateWorkpackageMutation.mutate({
      id: workpackageId,
      descricao: newDescription
    });
    setEditingDescription(false);
  };

  // Handler para mudança de data
  const handleDateChange = async (field: 'inicio' | 'fim', date: Date | undefined) => {
    await mutations.updateWorkpackageMutation.mutate({
      id: workpackageId,
      [field]: date
    });
  };

  // Handler para adicionar alocação - corrigir erros de tipos
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
          if (mes !== undefined && ano !== undefined) {
            return {
              userId: selectedUserId,
              mes,
              ano,
              ocupacao: numeroValido
            };
          }
        }
        return null;
      })
      .filter((alocacao): alocacao is AlocacaoInputData => alocacao !== null);

    if (alocacoesValidas.length === 0) {
      toast.error("Nenhuma alocação válida para adicionar");
      return;
    }

    try {
      await Promise.all(
        alocacoesValidas.map(alocacao => 
          mutations.addAlocacaoMutation.mutate({
            workpackageId,
            userId: alocacao.userId,
            mes: alocacao.mes,
            ano: alocacao.ano,
            ocupacao: alocacao.ocupacao
          })
        )
      );
      
      // Limpar as alocações após adicionar com sucesso
      setNovasAlocacoes({});
      setSelectedUserId("");
    } catch (error) {
      toast.error("Erro ao adicionar alocações");
    }
  };

  // Handler para remover recurso - corrigir erros de undefined
  const handleRemoveRecurso = async (userId: string) => {
    if (!workpackage) return;
    
    try {
      const recurso = workpackage.recursos?.find(r => r.userId === userId);
      if (!recurso) return;
      
      // Obter todas as alocações do recurso, se existirem
      const alocacoes = workpackage.recursos
        .filter(r => r.userId === userId)
        .flatMap(r => {
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
            mutations.removeAlocacaoMutation.mutate({
              workpackageId,
              userId,
              mes,
              ano
            })
          )
        );
      }
      
      toast.success("Recurso removido com sucesso");
      queryClient.invalidateQueries({ queryKey: ["workpackage.getById", { id: workpackageId }] });
    } catch (error) {
      toast.error("Erro ao remover recurso");
    }
  };
  
  // renderização de loading state
  if (!workpackage) {
    return (
      <Sheet open={open} onOpenChange={onClose} modal={false}>
        <SheetContent className="p-0 w-[450px] bg-gradient-to-br from-gray-50 to-blue-50/50 shadow-2xl rounded-l-2xl border-l border-gray-200/50">
          {/* ... loading UI ... */}
        </SheetContent>
      </Sheet>
    );
  }
  
  return (
    <Sheet open={open} onOpenChange={onClose} modal={false}>
      <SheetContent className="w-full lg:w-[640px] p-0 overflow-y-auto sm:max-w-none bg-white/95 backdrop-blur-xl shadow-2xl border-l border-gray-100 rounded-l-3xl">
        <div className="h-full flex flex-col">
          {/* Header */}
          <WorkpackageHeader 
            workpackage={workpackage}
            editingName={editingName}
            setEditingName={setEditingName}
            newName={newName}
            setNewName={setNewName}
            onNameSave={handleNameSave}
            onClose={onClose}
            onEstadoChange={handleEstadoChange}
          />

          <ScrollArea className="flex-1 px-8">
            <div className="py-8 space-y-8">
              {/* Descrição */}
              <WorkpackageDescricao 
                workpackage={workpackage}
                editingDescription={editingDescription}
                setEditingDescription={setEditingDescription}
                newDescription={newDescription}
                setNewDescription={setNewDescription}
                onDescriptionSave={handleDescriptionSave}
              />

              {/* Tarefas */}
              <WorkpackageTarefas 
                workpackage={workpackage}
                workpackageId={workpackageId}
                addingTarefa={addingTarefa}
                setAddingTarefa={setAddingTarefa}
                toggleEntregavelEstado={mutations.toggleEntregavelEstado}
                createEntregavelMutation={mutations.createEntregavelMutation}
                deleteEntregavelMutation={mutations.deleteEntregavelMutation}
                queryClient={queryClient}
              />

              {/* Recursos */}
              <WorkpackageRecursos 
                workpackage={workpackage}
                workpackageId={workpackageId}
                addingRecurso={addingRecurso}
                setAddingRecurso={setAddingRecurso}
                onAddAlocacao={handleAddAlocacao}
                onRemoveRecurso={handleRemoveRecurso}
              />

              {/* Materiais */}
              <WorkpackageMateriais 
                workpackage={workpackage}
                workpackageId={workpackageId}
                addingMaterial={addingMaterial}
                setAddingMaterial={setAddingMaterial}
                deleteMaterialMutation={mutations.deleteMaterialMutation}
              />
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
