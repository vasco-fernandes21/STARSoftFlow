import { useState, useEffect } from "react";
import { useProjetoForm } from "../../ProjetoFormContext";
import { TabNavigation } from "../../components/TabNavigation";
import { Users, Briefcase, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import React from "react";
import type { Decimal } from "decimal.js";
import { Form } from "./form";
import { Item } from "./item";
import { api } from "@/trpc/react";

interface RecursosTabProps {
  onNavigateBack: () => void;
  onNavigateForward: () => void;
}
// Dados dos membros da equipa obtidos da API
const RecursosData = () => {
  const { data, isLoading, error } = api.utilizador.findAll.useQuery();

  if (isLoading) return { membrosEquipa: [], isLoading: true };
  if (error) {
    toast.error("Erro ao carregar utilizadores");
    return { membrosEquipa: [], error };
  }

  // Extrair os items da resposta paginada
  const membrosEquipa = data?.items || [];

  return { membrosEquipa };
};

export function RecursosTab({ onNavigateBack, onNavigateForward }: RecursosTabProps) {
  const { state, dispatch } = useProjetoForm();
  const [selectedWorkpackageId, setSelectedWorkpackageId] = useState<string>("");
  const [addingRecurso, setAddingRecurso] = useState(false);
  const [expandedRecursoId, setExpandedRecursoId] = useState<string | null>(null);
  const [editingRecursoId, setEditingRecursoId] = useState<string | null>(null);
  const [recursoEmEdicao, setRecursoEmEdicao] = useState<{
    userId: string;
    alocacoes: any[];
  } | null>(null);

  // Obter dados dos membros da equipa
  const { membrosEquipa = [] } = RecursosData();

  // Definir o tipo para os membros da equipa
  type MembroEquipa = {
    id: string;
    name: string | null;
    email: string | null;
    regime: string;
    [key: string]: any;
  };

  // Verificar se há workpackages
  const hasWorkpackages = state.workpackages && state.workpackages.length > 0;

  // Verificar se podemos avançar (workpackages existem)
  const isValid = hasWorkpackages;

  // Obter workpackage selecionado
  const selectedWorkpackage = state.workpackages?.find((wp) => wp.id === selectedWorkpackageId);

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
    workpackageId: string,
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
        workpackageId,
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
        workpackageId,
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
    setEditingRecursoId(null);
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
    setEditingRecursoId(null);
  }, [selectedWorkpackageId]);

  const formatarDataSegura = (ano: string | number, mes: string | number, formatString: string) => {
    try {
      const anoNum = Number(ano);
      const mesNum = Number(mes) - 1;

      if (isNaN(anoNum) || isNaN(mesNum) || mesNum < 0 || mesNum > 11) {
        return `${mes}/${ano}`;
      }

      const data = new Date(anoNum, mesNum);
      return format(data, formatString, { locale: pt });
    } catch (error) {
      console.error("Erro de formatação:", error, { mes, ano });
      return `${mes}/${ano}`;
    }
  };

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
        <div className="flex-1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-azul">
                {selectedWorkpackage ? selectedWorkpackage.nome : "Selecione um workpackage"}
              </h2>
              {selectedWorkpackage && (
                <p className="mt-1 text-sm text-gray-500">
                  {selectedWorkpackage.descricao || "Sem descrição"}
                </p>
              )}
            </div>

            {selectedWorkpackage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddingRecurso(true);
                  setRecursoEmEdicao(null);
                }}
                className="flex gap-1.5"
                disabled={addingRecurso}
              >
                <Plus className="h-4 w-4" />
                Adicionar Recurso
              </Button>
            )}
          </div>

          {!selectedWorkpackage ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-gray-500">
              <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-medium">Nenhum workpackage selecionado</h3>
              <p className="mx-auto max-w-md">
                Selecione um workpackage à esquerda para adicionar ou visualizar os recursos
                associados a ele.
              </p>
            </div>
          ) : addingRecurso ? (
            <Form
              workpackageId={selectedWorkpackageId}
              inicio={selectedWorkpackage.inicio || new Date()}
              fim={selectedWorkpackage.fim || new Date()}
              utilizadores={membrosEquipa.map(
                (u: MembroEquipa): { id: string; name: string; email: string; regime: string } => ({
                  id: u.id,
                  name: u.name || "",
                  email: u.email || "",
                  regime: u.regime,
                })
              )}
              onAddAlocacao={handleAddAlocacao}
              onCancel={() => {
                setAddingRecurso(false);
                setRecursoEmEdicao(null);
              }}
              recursoEmEdicao={recursoEmEdicao}
              projetoEstado={"RASCUNHO"}
            />
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
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Recurso
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.values(recursosAgrupados).map((recurso) => {
                    const user = membrosEquipa.find((m: MembroEquipa) => m.id === recurso.userId);
                    const isExpanded = expandedRecursoId === recurso.userId;

                    if (!user) return null;

                    // Converter as alocações para o formato esperado pelo componente Item
                    const alocacoesPorAnoMes = converterParaAlocacoesPorAnoMes(recurso.alocacoes);

                    return (
                      <Item
                        key={recurso.userId}
                        user={{
                          id: user.id,
                          name: user.name || "Utilizador desconhecido",
                          email: user.email || "",
                          regime: user.regime,
                        }}
                        alocacoesPorAnoMes={alocacoesPorAnoMes}
                        isExpanded={isExpanded}
                        onToggleExpand={() =>
                          setExpandedRecursoId(isExpanded ? null : recurso.userId)
                        }
                        onEdit={() => {
                          setEditingRecursoId(recurso.userId);
                          setAddingRecurso(true);
                          setRecursoEmEdicao(recurso);
                        }}
                        onRemove={() =>
                          handleRemoveRecurso(
                            selectedWorkpackageId,
                            recurso.userId,
                            recurso.alocacoes
                          )
                        }
                        inicio={selectedWorkpackage.inicio || new Date()}
                        fim={selectedWorkpackage.fim || new Date()}
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
