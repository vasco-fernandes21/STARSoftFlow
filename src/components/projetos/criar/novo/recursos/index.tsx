import { useState, useEffect } from "react";
import { useProjetoForm } from "../../ProjetoFormContext";
import { TabNavigation } from "../../components/TabNavigation";
import { Users, Briefcase, Plus } from "lucide-react";
// These icons might be needed in the future:
// import { Trash2, UserIcon, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
// Date utilities not currently used:
// import { format } from "date-fns";
// import { pt } from "date-fns/locale";
import { toast } from "sonner";
import React from "react";
import { Decimal } from "decimal.js";
import { Form } from "./form";
import { Item } from "./item";
import { api } from "@/trpc/react";
import { FormContratado } from "./form-contratado";
import { UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface RecursosTabProps {
  onNavigateBack: () => void;
  onNavigateForward: () => void;
}

interface Alocacao {
  mes: number;
  ano: number;
  ocupacao: Decimal;
  workpackageId?: string;
  userId: string;
}

// Dados dos membros da equipa obtidos da API
const useRecursosData = () => {
  const { data } = api.utilizador.findAll.useQuery();

  if (!data) {
    toast.error("Erro ao carregar utilizadores");
    // Retorna estrutura consistente, mesmo com erro
    return { data: undefined }; 
  }

  // Retorna diretamente o resultado da query (ou undefined)
  return { data };
};

// Transform user data to match the expected User interface
const transformUser = (user: any) => ({
  id: user.id,
  name: user.name ?? "Utilizador desconhecido",
  email: user.email ?? "",
  regime: user.regime ?? null,
});

// Transform alocacoesPorAnoMes into the expected format
const transformAlocacoes = (
  alocacoesPorAnoMes: Record<string, Record<number, number>>,
  userId?: string
): Alocacao[] => {
  return Object.entries(alocacoesPorAnoMes).flatMap(([ano, meses]) =>
    Object.entries(meses).map(([mes, ocupacao]) => ({
      userId: userId ?? '',
      mes: parseInt(mes),
      ano: parseInt(ano),
      ocupacao: new Decimal(Number(ocupacao) / 100),
    }))
  );
};

export function RecursosTab({ onNavigateBack, onNavigateForward }: RecursosTabProps) {
  const { state, dispatch } = useProjetoForm();
  const [selectedWorkpackageId, setSelectedWorkpackageId] = useState<string>("");
  const [addingRecurso, setAddingRecurso] = useState(false);
  const [expandedRecursoId, setExpandedRecursoId] = useState<string | null>(null);
  const [recursoEmEdicao, setRecursoEmEdicao] = useState<{
    userId: string;
    alocacoes: any[];
  } | null>(null);

  // Obter dados dos membros da equipa usando o hook renomeado
  const { data: membrosEquipaData } = useRecursosData();
  
  // Extrair a lista de items ou usar um array vazio
  const listaMembrosEquipa = React.useMemo(() => membrosEquipaData?.items ?? [], [membrosEquipaData]);

  // Verificar se há workpackages
  const hasWorkpackages = state.workpackages && state.workpackages.length > 0;

  // Verificar se podemos avançar (workpackages existem)
  const isValid = hasWorkpackages;

  // Obter workpackage selecionado
  const selectedWorkpackage = state.workpackages?.find((wp) => wp.id === selectedWorkpackageId);

  // IDs dos utilizadores já alocados ao workpackage selecionado
  const utilizadoresAlocadosIds = React.useMemo(() => {
    if (!selectedWorkpackage?.recursos) return new Set<string>();
    return new Set(selectedWorkpackage.recursos.map((r) => r.userId));
  }, [selectedWorkpackage]);

  // Filtrar lista de membros da equipa para mostrar apenas os disponíveis
  const utilizadoresDisponiveis = (listaMembrosEquipa || []).map(transformUser).filter(
    (membro: { id: string }) => !utilizadoresAlocadosIds.has(membro.id)
  );

  // Agrupar recursos por utilizador
  const recursosAgrupados = React.useMemo(() => {
    if (!selectedWorkpackage?.recursos || selectedWorkpackage.recursos.length === 0) {
      return {};
    }

    return selectedWorkpackage.recursos.reduce(
      (acc: Record<string, { userId: string; alocacoes: any[] }>, alocacao) => {
        if (!alocacao) return acc;

        const userId = alocacao.userId;
        if (!acc[userId]) {
          acc[userId] = {
            userId,
            alocacoes: [],
          };
        }

        // Adiciona a alocação ao array de alocações do utilizador
        acc[userId].alocacoes.push({
          mes: alocacao.mes,
          ano: alocacao.ano,
          ocupacao: Number(alocacao.ocupacao ?? 0),
        });

        return acc;
      },
      {}
    );
  }, [selectedWorkpackage]);

  // Converter alocacoes para o formato esperado pelo componente Item
  const converterParaAlocacoesPorAnoMes = (
    alocacoes: Array<{ mes: number; ano: number; ocupacao: number }>
  ) => {
    return alocacoes.reduce((acc: Record<string, Record<number, number>>, alocacao) => {
      const { ano, mes, ocupacao } = alocacao;

      if (!acc[ano]) {
        acc[ano] = {};
      }

      acc[ano][mes] = ocupacao * 100; // Converter para porcentagem

      return acc;
    }, {});
  };

  // Função para adicionar alocação
  const handleAddAlocacao = (
    userId: string,
    alocacoes: Array<{
      userId: string;
      mes: number;
      ano: number;
      ocupacao: Decimal;
    }>
  ) => {
    // Se estiver editando, primeiro remover as alocações existentes
    if (recursoEmEdicao) {
      dispatch({
        type: "REMOVE_RECURSO_COMPLETO",
        workpackageId: selectedWorkpackageId,
        userId: recursoEmEdicao.userId,
      });

      toast.success("Recurso atualizado com sucesso");
    } else {
      toast.success("Recurso adicionado com sucesso");
    }

    // Adicionar novas alocações
    alocacoes.forEach((alocacao) => {
      dispatch({
        type: "ADD_ALOCACAO",
        workpackageId: selectedWorkpackageId,
        alocacao: {
          userId: alocacao.userId,
          mes: alocacao.mes,
          ano: alocacao.ano,
          ocupacao: alocacao.ocupacao,
        },
      });
    });

    setAddingRecurso(false);
    setRecursoEmEdicao(null);
    setExpandedRecursoId(null);
  };

  // Função para remover recurso
  const handleRemoveRecurso = (workpackageId: string, userId: string, _alocacoes: any[]) => {
    toast.warning("Tem a certeza que deseja remover este recurso?", {
      action: {
        label: "Remover",
        onClick: () => {
          dispatch({
            type: "REMOVE_RECURSO_COMPLETO",
            workpackageId,
            userId,
          });
          toast.success("Recurso removido com sucesso");
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {}, // Adicionando onClick para corrigir o erro de linter
      },
    });
  };

  // Resetar estados ao mudar de workpackage
  useEffect(() => {
    setAddingRecurso(false);
    setExpandedRecursoId(null);
    setRecursoEmEdicao(null);
  }, [selectedWorkpackageId]);

  return (
    <div className="flex flex-col">
      <div className="flex">
        {/* Painel lateral de seleção de workpackage */}
        <div className="w-72 border-r border-azul/10 bg-white/90 p-4">
          <div className="mb-4 flex items-center">
            <Briefcase className="mr-2 h-4 w-4 text-azul" />
            <span className="text-sm font-medium text-azul/70">Workpackages</span>
          </div>

          {hasWorkpackages ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-1">
                {state.workpackages?.map((wp) => (
                  <div
                    key={wp.id}
                    className={`cursor-pointer rounded-lg p-2.5 transition-all ${
                      selectedWorkpackageId === wp.id
                        ? "bg-azul text-white"
                        : "text-azul hover:bg-azul/5"
                    }`}
                    onClick={() => setSelectedWorkpackageId(wp.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="max-w-[180px] truncate text-sm font-medium">{wp.nome}</div>
                      {wp.recursos?.length > 0 && (
                        <Badge
                          variant={selectedWorkpackageId === wp.id ? "secondary" : "outline"}
                          className={selectedWorkpackageId === wp.id ? "bg-white/20" : "bg-azul/5"}
                        >
                          {[...new Set(wp.recursos.map((r) => r.userId))].length}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-1 max-w-[200px] truncate text-xs opacity-80">
                      {wp.descricao || "Sem descrição"}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              Nenhum workpackage disponível.
              <p className="mt-2">Crie workpackages na secção anterior.</p>
            </div>
          )}
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 p-6 relative">
          <div className="flex items-center gap-4 mb-6">
            {selectedWorkpackage && (
              <Button
                className="gap-2 rounded-full bg-azul text-white shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-azul/90 hover:shadow-lg"
                onClick={() => setAddingRecurso(true)}
              >
                <Plus className="h-4 w-4" />
                Adicionar recurso
              </Button>
            )}
            <FormContratado
              trigger={
                <Button
                  className="gap-2 rounded-full bg-green-600 text-white shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-green-700 hover:shadow-lg"
                  type="button"
                >
                  <UserPlus className="h-4 w-4" />
                  Criar contratado
                </Button>
              }
              onSuccess={() => {
                // Atualizar lista de membros ao criar contratado
                if (typeof window !== "undefined") {
                  // Forçar refetch se necessário
                  window.location.reload();
                }
              }}
            />
          </div>
          {addingRecurso && (
            <Dialog open={addingRecurso} onOpenChange={setAddingRecurso}>
              <DialogContent className="max-w-2xl w-full p-0 bg-transparent border-none shadow-none">
                <DialogTitle className="sr-only">Adicionar Recurso</DialogTitle>
                <Form
                  workpackageId={selectedWorkpackageId}
                  inicio={selectedWorkpackage?.inicio ?? new Date()}
                  fim={selectedWorkpackage?.fim ?? new Date()}
                  utilizadores={utilizadoresDisponiveis}
                  onAddAlocacao={handleAddAlocacao}
                  onCancel={() => setAddingRecurso(false)}
                  recursoEmEdicao={recursoEmEdicao}
                  projetoEstado={state.estado as "RASCUNHO" | "PENDENTE" | "APROVADO" | "EM_DESENVOLVIMENTO" | "CONCLUIDO"}
                  hideCloseButtonFromFormHeader
                />
              </DialogContent>
            </Dialog>
            )}
          {!selectedWorkpackage ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-gray-500">
              <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-medium">Nenhum workpackage selecionado</h3>
              <p className="mx-auto max-w-md">
                Selecione um workpackage à esquerda para adicionar ou visualizar os recursos
                associados a ele.
              </p>
            </div>
          ) : (
            <>
              {Object.keys(recursosAgrupados).length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center text-gray-500">
                  <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <h3 className="mb-2 text-lg font-medium">Nenhum recurso associado</h3>
                  <p className="mx-auto mb-4 max-w-md">
                    Este workpackage ainda não tem recursos atribuídos. Adicione o primeiro recurso!
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAddingRecurso(true);
                    }}
                    className="mx-auto flex gap-1.5"
                    disabled={utilizadoresDisponiveis.length === 0}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Recurso
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(recursosAgrupados).map(([userId, recurso]) => {
                    // Usar a listaMembrosEquipa diretamente
                    const user = listaMembrosEquipa.find((m: { id: string }) => m.id === userId);
                    if (!user) return null;

                    const isExpanded = expandedRecursoId === userId;
                    const alocacoesPorAnoMes = converterParaAlocacoesPorAnoMes(recurso.alocacoes);

                    return (
                      <Item
                        key={userId}
                        user={transformUser(user)}
                        alocacoes={transformAlocacoes(alocacoesPorAnoMes, userId)}
                        isExpanded={isExpanded}
                        onToggleExpand={() => setExpandedRecursoId(isExpanded ? null : userId)}
                        onRemove={() =>
                          handleRemoveRecurso(selectedWorkpackageId, userId, recurso.alocacoes)
                        }
                        inicio={selectedWorkpackage.inicio || new Date()}
                        fim={selectedWorkpackage.fim || new Date()}
                        projetoEstado={state.estado as "RASCUNHO" | "PENDENTE" | "APROVADO" | "EM_DESENVOLVIMENTO" | "CONCLUIDO"}
                        onUpdateAlocacao={(userId, alocacoes) =>
                          handleAddAlocacao(userId, alocacoes)
                        }
                        workpackageId={selectedWorkpackageId}
                        utilizadores={utilizadoresDisponiveis}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <TabNavigation
        onBack={onNavigateBack}
        onNext={onNavigateForward}
        showNextButton={true}
        isNextDisabled={!isValid}
      />
    </div>
  );
}
