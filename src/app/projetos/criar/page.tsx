"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageLayout } from "@/components/common/PageLayout";
import {
  useProjetoForm,
  ProjetoFormProvider,
  type ProjetoState,
} from "@/components/projetos/criar/ProjetoFormContext";
import { ProjetoHeader } from "@/components/projetos/criar/ProjetoHeader";
import { ProjetoProgressContainer } from "@/components/projetos/criar/ProjetoProgressContainer";
import { ProjetoFormPanel } from "@/components/projetos/criar/ProjetoFormPanel";
import { ProjetoCronograma } from "@/components/projetos/criar/ProjetoCronograma";
import type { FaseType } from "@/components/projetos/types";
import { fasesOrdem } from "@/components/projetos/types";
import { api } from "@/trpc/react";
import { ProjetoEstado, Rubrica } from "@prisma/client";
import { Decimal } from "decimal.js";
import { generateUUID } from "@/server/api/utils";
import ImportarProjetoButton from "@/components/projetos/ImportarProjetoButton";
import { Button } from "@/components/ui/button";
import { Save, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { usePermissions } from "@/hooks/usePermissions";

import {
  InformacoesTab,
  FinancasTab,
  WorkpackagesTab,
  RecursosTab,
  ResumoTab,
} from "@/components/projetos/criar/novo";

// Revert Interface para handlers de workpackage back to using 'any'
export interface WorkpackageHandlers {
  addWorkpackage: (workpackage: any) => void;
  updateWorkpackage: (id: string, data: any) => void;
  removeWorkpackage: (id: string) => void;
  addTarefa: (workpackageId: string, tarefa: any) => void;
  updateTarefa: (workpackageId: string, tarefaId: string, data: any) => void;
  removeTarefa: (workpackageId: string, tarefaId: string) => void;
  addMaterial: (workpackageId: string, material: any) => void;
  updateMaterial: (workpackageId: string, materialId: number, data: any) => void;
  removeMaterial: (workpackageId: string, materialId: number) => void;
  addEntregavel: (workpackageId: string, tarefaId: string, entregavel: any) => void;
  updateEntregavel: (
    workpackageId: string,
    tarefaId: string,
    entregavelId: string,
    data: any
  ) => void;
  removeEntregavel: (workpackageId: string, tarefaId: string, entregavelId: string) => void;
  addRecurso: (workpackageId: string, recurso: any) => void;
  updateRecurso: (workpackageId: string, userId: string, data: any) => void;
  removeRecurso: (workpackageId: string, userId: string) => void;
}

function ProjetoFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rascunhoId = searchParams?.get("rascunhoId") || null;
  const { state, dispatch } = useProjetoForm();
  const [faseAtual, setFaseAtual] = useState<FaseType>("informacoes");
  const [fasesConcluidas, setFasesConcluidas] = useState<Record<FaseType, boolean>>(
    {} as Record<FaseType, boolean>
  );
  const [mostrarCronograma, setMostrarCronograma] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const queryClient = useQueryClient();
  const { isComum } = usePermissions();

  // Query para carregar rascunho
  const { data: draftData } = api.rascunho.get.useQuery(
    { id: rascunhoId! },
    {
      enabled: !!rascunhoId,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: false,
    }
  );

  // Carregar rascunho quando disponível
  useEffect(() => {
    if (draftData?.conteudo) {
      dispatch({
        type: "SET_STATE",
        state: JSON.parse(JSON.stringify(draftData.conteudo)) as unknown as ProjetoState,
      });
      toast.success("Rascunho carregado com sucesso!");
    }
  }, [draftData, dispatch]);

  // Mutation para criar projeto
  const criarProjetoMutation = api.projeto.createCompleto.useMutation({
    onSuccess: (data) => {
      if (data.success && data.data?.id) {
        toast.success("Projeto criado com sucesso!");
        router.push(`/projetos/${data.data.id}`);

        // Invalidar queries em segundo plano (fire and forget)
        const projetosKey = getQueryKey(api.projeto.findAll);
        queryClient.invalidateQueries({ queryKey: projetosKey });

        if (rascunhoId && isComum) {
          const rascunhosKey = getQueryKey(api.rascunho.findAll);
          queryClient.invalidateQueries({ queryKey: rascunhosKey });
        }
      } else if (data.success && !data.data?.id) {
        console.error("Projeto criado com sucesso, mas ID está ausente nos dados de resposta:", data);
        toast.error("Projeto criado, mas ocorreu um erro ao obter o ID. Tente atualizar a lista de projetos.");
      } else { // data.success é false
        toast.error("Erro ao criar projeto");
      }
    },
    onError: (error) => {
      console.error("Erro ao criar projeto:", error);
      toast.error(error.message || "Ocorreu um erro ao criar o projeto. Tente novamente.");
    },
    onSettled: () => {
      setSubmitLoading(false);
    },
  });

  // Verificar se fase está concluída
  useEffect(() => {
    setFasesConcluidas((prev) => ({
      ...prev,
      informacoes: Boolean(
        state.nome?.trim() &&
          state.inicio &&
          state.fim &&
          new Date(state.fim) > new Date(state.inicio)
      ),
      financas: Boolean(
        state.overhead !== undefined && 
        state.overhead !== null &&
        state.taxa_financiamento !== undefined && 
        state.taxa_financiamento !== null &&
        state.valor_eti !== undefined && 
        state.valor_eti !== null &&
        state.financiamentoId // Adicionar verificação do tipo de financiamento
      ),
      workpackages: Boolean(state.workpackages?.length),
      recursos: Boolean(state.workpackages?.some((wp) => wp.recursos?.length > 0)),
      resumo: Boolean(
        state.nome?.trim() &&
          state.inicio &&
          state.fim &&
          state.overhead !== undefined &&
          state.overhead !== null &&
          state.taxa_financiamento !== undefined &&
          state.taxa_financiamento !== null &&
          state.valor_eti !== undefined &&
          state.valor_eti !== null &&
          state.financiamentoId && // Adicionar verificação do tipo de financiamento
          state.workpackages?.length
      ),
    }));
  }, [state]);

  // Navegação entre fases
  const navegarParaFase = (fase: FaseType) => {
    if (fasesOrdem.includes(fase)) {
      setFaseAtual(fase);
    }
  };

  const irParaProximaFase = () => {
    const faseAtualIndex = fasesOrdem.indexOf(faseAtual);
    if (faseAtualIndex < fasesOrdem.length - 1) {
      const proximaFase = fasesOrdem[faseAtualIndex + 1];
      if (proximaFase && fasesOrdem.includes(proximaFase)) {
        setFaseAtual(proximaFase);
      }
    }
  };

  const irParaFaseAnterior = () => {
    const faseAtualIndex = fasesOrdem.indexOf(faseAtual);
    if (faseAtualIndex > 0) {
      const faseAnterior = fasesOrdem[faseAtualIndex - 1];
      if (faseAnterior && fasesOrdem.includes(faseAnterior)) {
        setFaseAtual(faseAnterior);
      }
    }
  };

  // Handler implementations remain largely the same internally,
  // dispatching actions with correctly typed data for the reducer.
  // The 'any' type is only for the interface boundary.
  const workpackageHandlers: WorkpackageHandlers = {
    addWorkpackage: (workpackage) => {
      // Internal logic uses specific types
      const newWorkpackage = {
        // Implicitly matches WorkpackageState structure
        id: generateUUID(),
        nome: workpackage.nome,
        descricao: workpackage.descricao === undefined ? null : workpackage.descricao, // handle undefined from forms
        inicio: workpackage.inicio ? new Date(workpackage.inicio) : null, // handle string/Date from forms
        fim: workpackage.fim ? new Date(workpackage.fim) : null, // handle string/Date from forms
        estado: workpackage.estado || false,
        tarefas: [],
        materiais: [],
        recursos: [],
      };

      dispatch({
        type: "ADD_WORKPACKAGE",
        workpackage: newWorkpackage, 
      });
      toast.success("Workpackage adicionado com sucesso!");
    },

    updateWorkpackage: (id, data) => {
      // Adjust data before dispatching
      const dataToUpdate = {
        ...data,
        ...(data.descricao !== undefined && {
          descricao: data.descricao === undefined ? null : data.descricao,
        }),
        ...(data.inicio !== undefined && { inicio: data.inicio ? new Date(data.inicio) : null }),
        ...(data.fim !== undefined && { fim: data.fim ? new Date(data.fim) : null }),
      };
      dispatch({
        type: "UPDATE_WORKPACKAGE",
        id,
        data: dataToUpdate, // Dispatching correctly typed data
      });
    },

    removeWorkpackage: (id) => {
      dispatch({ type: "REMOVE_WORKPACKAGE", id });
      toast.success("Workpackage removido com sucesso!");
    },

    addTarefa: (workpackageId, tarefa) => {
      const newTarefa = {
        // Implicitly matches TarefaState
        id: generateUUID(),
        nome: tarefa.nome,
        descricao: tarefa.descricao === undefined ? null : tarefa.descricao,
        inicio: tarefa.inicio ? new Date(tarefa.inicio) : null,
        fim: tarefa.fim ? new Date(tarefa.fim) : null,
        estado: tarefa.estado || false,
        entregaveis: [],
      };
      dispatch({ type: "ADD_TAREFA", workpackageId, tarefa: newTarefa });
    },

    updateTarefa: (workpackageId, tarefaId, data) => {
      const dataToUpdate = {
        ...data,
        ...(data.descricao !== undefined && {
          descricao: data.descricao === undefined ? null : data.descricao,
        }),
        ...(data.inicio !== undefined && { inicio: data.inicio ? new Date(data.inicio) : null }),
        ...(data.fim !== undefined && { fim: data.fim ? new Date(data.fim) : null }),
      };
      dispatch({ type: "UPDATE_TAREFA", workpackageId, tarefaId, data: dataToUpdate });
    },

    removeTarefa: (workpackageId, tarefaId) => {
      dispatch({ type: "REMOVE_TAREFA", workpackageId, tarefaId });
      toast.success("Tarefa removida com sucesso!");
    },

    addMaterial: (workpackageId, material) => {
      const newMaterial = {
        // Implicitly matches MaterialState
        id: Date.now(),
        nome: material.nome,
        preco: new Decimal(material.preco?.toString() || "0"), // handle potential undefined
        quantidade: Number(material.quantidade || 0), // handle potential undefined
        rubrica: material.rubrica || "MATERIAIS",
        ano_utilizacao: Number(material.ano_utilizacao || new Date().getFullYear()), // handle potential undefined
        mes: Number(material.mes || new Date().getMonth() + 1), // handle potential undefined
        descricao: material.descricao === undefined ? null : material.descricao,
        estado: material.estado || false,
      };
      dispatch({ type: "ADD_MATERIAL", workpackageId, material: newMaterial });
    },

    updateMaterial: (workpackageId, materialId, data) => {
      const dataToUpdate = {
        ...data,
        ...(data.preco !== undefined && { preco: new Decimal(data.preco.toString()) }),
        ...(data.quantidade !== undefined && { quantidade: Number(data.quantidade) }),
        ...(data.ano_utilizacao !== undefined && { ano_utilizacao: Number(data.ano_utilizacao) }),
        ...(data.mes !== undefined && { mes: Number(data.mes) }),
        ...(data.descricao !== undefined && {
          descricao: data.descricao === undefined ? null : data.descricao,
        }),
      };
      delete dataToUpdate.id; // Ensure id is not passed
      dispatch({ type: "UPDATE_MATERIAL", workpackageId, materialId, data: dataToUpdate });
    },

    removeMaterial: (workpackageId, materialId) => {
      dispatch({ type: "REMOVE_MATERIAL", workpackageId, materialId });
      toast.success("Material removido com sucesso!");
    },

    addEntregavel: (workpackageId, tarefaId, entregavel) => {
      const newEntregavel = {
        // Implicitly matches EntregavelState
        id: generateUUID(),
        nome: entregavel.nome,
        descricao: entregavel.descricao === undefined ? null : entregavel.descricao,
        data: entregavel.data ? new Date(entregavel.data) : null,
        estado: false,
        anexo: null,
      };
      const workpackage = state.workpackages.find((wp) => wp.id === workpackageId);
      const tarefa = workpackage?.tarefas.find((t) => t.id === tarefaId);
      if (tarefa) {
        dispatch({
          type: "UPDATE_TAREFA",
          workpackageId,
          tarefaId,
          data: { entregaveis: [...tarefa.entregaveis, newEntregavel] },
        });
      }
    },

    updateEntregavel: (workpackageId, tarefaId, entregavelId, data) => {
      const workpackage = state.workpackages.find((wp) => wp.id === workpackageId);
      const tarefa = workpackage?.tarefas.find((t) => t.id === tarefaId);
      if (workpackage && tarefa) {
        const dataToUpdate = {
          ...data,
          ...(data.descricao !== undefined && {
            descricao: data.descricao === undefined ? null : data.descricao,
          }),
          ...(data.data !== undefined && { data: data.data ? new Date(data.data) : null }),
        };
        delete dataToUpdate.id; // Ensure id is not passed

        dispatch({
          type: "UPDATE_TAREFA",
          workpackageId,
          tarefaId,
          data: {
            entregaveis: tarefa.entregaveis.map((e) =>
              e.id === entregavelId ? { ...e, ...dataToUpdate } : e
            ),
          },
        });
      }
    },

    removeEntregavel: (workpackageId, tarefaId, entregavelId) => {
      const workpackage = state.workpackages.find((wp) => wp.id === workpackageId);
      const tarefa = workpackage?.tarefas.find((t) => t.id === tarefaId);
      if (workpackage && tarefa) {
        dispatch({
          type: "UPDATE_TAREFA",
          workpackageId,
          tarefaId,
          data: { entregaveis: tarefa.entregaveis.filter((e) => e.id !== entregavelId) },
        });
        toast.success("Entregável removido com sucesso!");
      }
    },

    addRecurso: (workpackageId, recurso) => {
      // Assuming recurso object has userId, mes, ano, ocupacao
      const newAlocacao = {
        // Implicitly matches RecursoState
        userId: recurso.userId,
        mes: Number(recurso.mes),
        ano: Number(recurso.ano),
        ocupacao: new Decimal(recurso.ocupacao?.toString() || "0"),
      };
      dispatch({ type: "ADD_ALOCACAO", workpackageId, alocacao: newAlocacao });
    },

    updateRecurso: (workpackageId, userId, data) => {
      // Data should only contain { ocupacao: number | string, mes?: number, ano?: number }
      const workpackage = state.workpackages.find((wp) => wp.id === workpackageId);
      // Find the specific allocation instance using mes/ano if provided in data, otherwise find any for the user
      const recursoInstance = workpackage?.recursos.find(
        (r) =>
          r.userId === userId &&
          (data.mes !== undefined ? r.mes === data.mes : true) &&
          (data.ano !== undefined ? r.ano === data.ano : true)
      );

      const ocupacaoDecimal = data.ocupacao ? new Decimal(data.ocupacao.toString()) : undefined;

      if (recursoInstance && ocupacaoDecimal !== undefined) {
        dispatch({
          type: "UPDATE_ALOCACAO",
          workpackageId,
          userId,
          mes: recursoInstance.mes, // Use mes from the found instance
          ano: recursoInstance.ano, // Use ano from the found instance
          data: { ocupacao: ocupacaoDecimal },
        });
      } else {
        // Handle case where specific mes/ano allocation wasn't found or ocupacao is missing
        console.warn(
          "Could not update resource allocation - instance not found or ocupacao missing",
          { workpackageId, userId, data }
        );
        // Optionally show a toast error
        // toast.error("Não foi possível atualizar a alocação do recurso.");
      }
    },

    removeRecurso: (workpackageId, userId) => {
      // This removes *all* allocations for the user in this WP
      dispatch({ type: "REMOVE_RECURSO_COMPLETO", workpackageId, userId });
      toast.success("Recurso removido com sucesso!");
    },
  };

  // Renderizar o conteúdo da fase atual
  const renderizarConteudoFase = () => {
    const commonProps = {
      onNavigateForward: irParaProximaFase,
      onNavigateBack: irParaFaseAnterior,
    };

    switch (faseAtual) {
      case "informacoes":
        return <InformacoesTab {...commonProps} />;
      case "financas":
        return <FinancasTab {...commonProps} />;
      case "workpackages":
        return (
          <WorkpackagesTab
            {...commonProps}
            workpackages={state.workpackages}
            handlers={workpackageHandlers}
            projetoInicio={state.inicio}
            projetoFim={state.fim}
          />
        );
      case "recursos":
        return <RecursosTab {...commonProps} />;
      case "resumo":
        return (
          <ResumoTab
            onNavigateBack={irParaFaseAnterior}
            onSubmit={handleSubmit}
            isSubmitting={submitLoading}
          />
        );
      default:
        return null;
    }
  };

  // Função para enviar o formulário
  const handleSubmit = async () => {
    if (!state.nome || !state.inicio || !state.fim) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (!fasesConcluidas.resumo) {
      toast.error("Complete todas as fases antes de finalizar.");
      return;
    }

    try {
      setSubmitLoading(true);

      const projetoData = {
        nome: state.nome,
        descricao: state.descricao || undefined,
        inicio: state.inicio instanceof Date ? state.inicio : new Date(state.inicio),
        fim: state.fim instanceof Date ? state.fim : new Date(state.fim),
        estado: ProjetoEstado.PENDENTE,
        overhead: Number(state.overhead),
        taxa_financiamento: Number(state.taxa_financiamento),
        valor_eti: Number(state.valor_eti),
        financiamentoId: state.financiamentoId ? Number(state.financiamentoId) : undefined,
        ...(rascunhoId && { rascunhoId }),

        workpackages: state.workpackages.map((wp) => ({
          nome: wp.nome,
          descricao: wp.descricao || undefined,
          inicio:
            wp.inicio instanceof Date ? wp.inicio : wp.inicio ? new Date(wp.inicio) : undefined,
          fim: wp.fim instanceof Date ? wp.fim : wp.fim ? new Date(wp.fim) : undefined,
          estado: Boolean(wp.estado),

          tarefas: wp.tarefas.map((t) => ({
            nome: t.nome,
            descricao: t.descricao || undefined,
            inicio: t.inicio instanceof Date ? t.inicio : t.inicio ? new Date(t.inicio) : undefined,
            fim: t.fim instanceof Date ? t.fim : t.fim ? new Date(t.fim) : undefined,
            estado: Boolean(t.estado),
            entregaveis: t.entregaveis.map((e) => ({
              nome: e.nome,
              descricao: e.descricao || undefined,
              data: e.data instanceof Date ? e.data : e.data ? new Date(e.data) : undefined,
            })),
          })),

          materiais: wp.materiais.map((m) => ({
            nome: m.nome,
            preco: Number(m.preco),
            quantidade: Number(m.quantidade),
            rubrica: m.rubrica || Rubrica.MATERIAIS,
            ano_utilizacao: Number(m.ano_utilizacao),
            mes: Number(m.mes || 1),
          })),

          recursos: wp.recursos.map((r) => ({
            userId: r.userId,
            mes: r.mes,
            ano: r.ano,
            ocupacao: Number(r.ocupacao instanceof Decimal ? r.ocupacao.toNumber() : r.ocupacao),
          })),
        })),
      };

      criarProjetoMutation.mutate(projetoData);
    } catch (error) {
      console.error("Erro ao criar projeto:", error);
      toast.error("Ocorreu um erro ao criar o projeto. Tente novamente.");
      setSubmitLoading(false);
    }
  };

  const progressoAtual = fasesOrdem.indexOf(faseAtual) + 1;
  const progressoTotal = fasesOrdem.length;
  const percentualProgresso = (progressoAtual / progressoTotal) * 100;

  return (
    <div className="flex flex-col justify-between gap-6 md:flex-row">
      <div className="flex-1 space-y-4">
        <div className="relative flex">
          <div
            className={`flex-1 space-y-6 transition-all duration-100 ease-in-out ${mostrarCronograma ? "w-3/5" : "w-full"} `}
          >
            <div className="glass-card rounded-2xl border-white/20 shadow-md transition-all duration-500 ease-in-out hover:shadow-lg">
              <ProjetoProgressContainer
                fasesOrdem={fasesOrdem}
                faseAtual={faseAtual}
                fasesConcluidas={fasesConcluidas}
                progressoAtual={progressoAtual}
                progressoTotal={progressoTotal}
                percentualProgresso={percentualProgresso}
                mostrarCronograma={mostrarCronograma}
                navegarParaFase={navegarParaFase}
                toggleCronograma={() => setMostrarCronograma(!mostrarCronograma)}
              />
            </div>

            <div className="glass-card rounded-2xl border-white/20 shadow-md transition-all duration-500 ease-in-out hover:shadow-lg">
              <ProjetoFormPanel _faseAtual={faseAtual}>{renderizarConteudoFase()}</ProjetoFormPanel>
            </div>
          </div>

          <div
            className={`transform transition-all duration-500 ease-in-out ${
              mostrarCronograma
                ? "w-2/5 translate-x-0 pl-8 opacity-100"
                : "w-0 max-w-[50vw] translate-x-full overflow-hidden p-0 opacity-0"
            } `}
          >
            <ProjetoCronograma
              state={state}
              _handleUpdateWorkPackage={(workpackage: any) => {
                if (workpackage.id) {
                  workpackageHandlers.updateWorkpackage(workpackage.id, workpackage);
                }
              }}
              _handleUpdateTarefa={(tarefa: any) => {
                const workpackage = state.workpackages.find((wp) =>
                  wp.tarefas.some((t) => t.id === tarefa.id)
                );
                if (workpackage && tarefa.id) {
                  workpackageHandlers.updateTarefa(workpackage.id, tarefa.id, tarefa);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper component to handle Suspense
function ProjetoFormWrapper() {
  return (
    <Suspense
      fallback={<div className="flex h-full items-center justify-center">A carregar...</div>}
    >
      <ProjetoFormContentWrapper />
    </Suspense>
  );
}

// Main page component
export default function CriarProjetoPage() {
  return (
    <PageLayout>
      <ProjetoFormProvider>
        <ProjetoFormWrapper />
      </ProjetoFormProvider>
    </PageLayout>
  );
}

function ProjetoFormContentWrapper() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rascunhoId = searchParams?.get("rascunhoId");
  const { state } = useProjetoForm();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Mutation para guardar rascunho
  const saveDraftMutation = api.rascunho.create.useMutation({
    onSuccess: (_data) => {
      toast.success("Rascunho guardado com sucesso!");
      router.push("/projetos");
      setShowSaveDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao guardar rascunho");
    },
  });

  // Mutation para atualizar rascunho
  const updateDraftMutation = api.rascunho.update.useMutation({
    onSuccess: (_data) => {
      toast.success("Rascunho atualizado com sucesso!");
      router.push("/projetos");
      setShowSaveDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar rascunho");
    },
  });

  // Mutation para apagar rascunho
  const deleteDraftMutation = api.rascunho.delete.useMutation({
    onSuccess: () => {
      toast.success("Rascunho apagado com sucesso!");
      router.push("/projetos");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao apagar rascunho");
    },
  });

  // Função para guardar rascunho
  const handleSaveDraft = () => {
    if (!state.nome?.trim()) {
      toast.error("Digite pelo menos o nome do projeto para guardar como rascunho");
      return;
    }

    try {
      // Clean up state before saving
      const cleanState = JSON.parse(
        JSON.stringify(state, (key, value) => {
          // Handle Date objects
          if (value instanceof Date) {
            return value.toISOString();
          }
          // Handle Decimal objects
          if (value && typeof value === "object" && value.constructor?.name === "Decimal") {
            return value.toString();
          }
          return value;
        })
      );

      if (rascunhoId) {
        // Se tiver rascunhoId, atualizar o rascunho existente
        updateDraftMutation.mutate({
          id: rascunhoId,
          titulo: state.nome,
          conteudo: cleanState,
        });
      } else {
        // Se não tiver rascunhoId, criar novo rascunho
        saveDraftMutation.mutate({
          titulo: state.nome,
          conteudo: cleanState,
        });
      }
    } catch (error) {
      console.error("Erro ao processar estado:", error);
      toast.error("Erro ao processar dados do rascunho");
    }
  };

  // Função para apagar rascunho
  const handleDeleteDraft = () => {
    if (rascunhoId) {
      deleteDraftMutation.mutate({ id: rascunhoId });
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Dialog para guardar rascunho */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {rascunhoId ? "Atualizar Rascunho" : "Guardar Rascunho"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {rascunhoId
                ? "Tem a certeza que deseja atualizar este rascunho?"
                : "Tem a certeza que deseja guardar este projeto como rascunho?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-azul/20 text-azul hover:bg-azul/5">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSaveDraft}
              disabled={saveDraftMutation.status === "pending" || updateDraftMutation.status === "pending"}
              className="rounded-full bg-azul text-white shadow-md transition-all duration-300 ease-in-out hover:bg-azul/90 hover:shadow-lg"
            >
              {saveDraftMutation.status === "pending" || updateDraftMutation.status === "pending"
                ? "A guardar..."
                : rascunhoId
                ? "Atualizar"
                : "Guardar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para apagar rascunho */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar Rascunho</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja apagar este rascunho? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border-azul/20 text-azul hover:bg-azul/5">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDraft}
              className="rounded-full bg-red-600 text-white shadow-md transition-all duration-300 ease-in-out hover:bg-red-700 hover:shadow-lg"
              disabled={deleteDraftMutation.status === "pending"}
            >
              {deleteDraftMutation.status === "pending" ? "A apagar..." : "Apagar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mb-8 flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ProjetoHeader />
          </div>
        </div>

        <div className="mt-4 flex-shrink-0 space-x-2 md:mt-0">
          {rascunhoId && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button 
            className="gap-2 rounded-full bg-white text-azul shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-white/90 hover:shadow-lg"
            onClick={() => setShowSaveDialog(true)}
          >
            <Save className="h-4 w-4" />
            {rascunhoId ? "Guardar Alterações" : "Guardar Rascunho"}
          </Button>
          <ImportarProjetoButton />
        </div>
      </div>

      <ProjetoFormContent />
    </div>
  );
}
