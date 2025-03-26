"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageLayout } from "@/components/common/PageLayout";
import { useProjetoForm } from "@/components/projetos/criar/ProjetoFormContext";
import { ProjetoHeader } from "@/components/projetos/criar/ProjetoHeader";
import { ProjetoProgressContainer } from "@/components/projetos/criar/ProjetoProgressContainer";
import { ProjetoFormPanel } from "@/components/projetos/criar/ProjetoFormPanel";
import { ProjetoCronograma } from "@/components/projetos/criar/ProjetoCronograma";
import { FaseType, fasesOrdem } from "@/components/projetos/types";
import { api } from "@/trpc/react";
import { ProjetoEstado, Rubrica, type Prisma } from "@prisma/client";
import { Decimal } from "decimal.js";
import { generateUUID } from "@/server/api/utils/token";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ImportarProjetoButton from "@/components/projetos/ImportarProjetoButton";
import StateMonitor from "@/components/projetos/StateMonitor";
import { ProjetoFormProvider } from "@/components/projetos/criar/ProjetoFormContext";

import { 
  InformacoesTab,
  FinancasTab,
  WorkpackagesTab,
  RecursosTab,
  ResumoTab 
} from "@/components/projetos/criar/novo";
import { TarefaWithRelations } from "@/components/projetos/types";

// Tipo para workpackage com todas as relações
type WorkpackageWithRelations = Prisma.WorkpackageGetPayload<{
  include: {
    tarefas: {
      include: {
        entregaveis: true
      }
    }
    materiais: true
    recursos: true
  }
}>;

// Definir a interface WorkpackageHandlers
export interface WorkpackageHandlers {
  // Workpackage handlers
  addWorkpackage: (workpackage: any) => void;
  updateWorkpackage: (id: string, data: any) => void;
  removeWorkpackage: (id: string) => void;
  
  // Tarefa handlers
  addTarefa: (workpackageId: string, tarefa: any) => void;
  updateTarefa: (workpackageId: string, tarefaId: string, data: any) => void;
  removeTarefa: (workpackageId: string, tarefaId: string) => void;
  
  // Material handlers
  addMaterial: (workpackageId: string, material: any) => void;
  updateMaterial: (workpackageId: string, materialId: number, data: any) => void;
  removeMaterial: (workpackageId: string, materialId: number) => void;
  
  // Entregavel handlers
  addEntregavel: (workpackageId: string, tarefaId: string, entregavel: any) => void;
  updateEntregavel: (workpackageId: string, tarefaId: string, entregavelId: string, data: any) => void;
  removeEntregavel: (workpackageId: string, tarefaId: string, entregavelId: string) => void;
  
  // Recurso handlers
  addRecurso: (workpackageId: string, recurso: any) => void;
  updateRecurso: (workpackageId: string, recursoId: number, data: any) => void;
  removeRecurso: (workpackageId: string, recursoId: number) => void;
}

function ProjetoFormContent() {
  const router = useRouter();
  const { state, dispatch } = useProjetoForm();
  const [faseAtual, setFaseAtual] = useState<FaseType>("informacoes");
  const [fasesConcluidas, setFasesConcluidas] = useState<Record<FaseType, boolean>>({} as Record<FaseType, boolean>);
  const [mostrarCronograma, setMostrarCronograma] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Mutation para criar projeto
  const criarProjetoMutation = api.projeto.createCompleto.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Projeto criado com sucesso!");
        router.push(`/projetos/${data.data.id}`);
      } else {
        toast.error("Erro ao criar projeto");
      }
    },
    onError: (error) => {
      console.error("Erro ao criar projeto:", error);
      toast.error(error.message || "Ocorreu um erro ao criar o projeto. Tente novamente.");
    },
    onSettled: () => {
      setSubmitLoading(false);
    }
  });

  // Verificar se fase está concluída
  useEffect(() => {
    setFasesConcluidas(prev => ({
      ...prev,
      informacoes: Boolean(
        state.nome?.trim() && 
        state.inicio && 
        state.fim && 
        new Date(state.fim) > new Date(state.inicio)
      ),
      financas: Boolean(
        state.overhead !== undefined && 
        state.taxa_financiamento !== undefined && 
        state.valor_eti !== undefined
      ),
      workpackages: Boolean(state.workpackages?.length),
      recursos: Boolean(state.workpackages?.some(wp => wp.recursos?.length > 0)),
      resumo: Boolean(
        state.nome?.trim() && 
        state.inicio && 
        state.fim && 
        state.overhead !== undefined && 
        state.taxa_financiamento !== undefined && 
        state.valor_eti !== undefined &&
        state.workpackages?.length
      )
    }));
  }, [state]);

  // Função para navegar para uma fase específica
  const navegarParaFase = (fase: FaseType) => {
    setFaseAtual(fase);
  };

  // Função para ir para a próxima fase
  const irParaProximaFase = () => {
    const faseAtualIndex = fasesOrdem.indexOf(faseAtual);
    const proximaFaseIndex = faseAtualIndex + 1;
    
    if (proximaFaseIndex < fasesOrdem.length) {
      const proximaFase = fasesOrdem[proximaFaseIndex];
      if (proximaFase) {
        setFaseAtual(proximaFase);
      }
    }
  };

  // Função para ir para a fase anterior
  const irParaFaseAnterior = () => {
    const faseAtualIndex = fasesOrdem.indexOf(faseAtual);
    const faseAnteriorIndex = faseAtualIndex - 1;
    
    if (faseAnteriorIndex >= 0) {
      const faseAnterior = fasesOrdem[faseAnteriorIndex];
      if (faseAnterior) {
        setFaseAtual(faseAnterior);
      }
    }
  };

  // Handlers agrupados em um objeto
 const workpackageHandlers: WorkpackageHandlers = {
    // Workpackages
    addWorkpackage: (workpackage) => {
      const newWorkpackage = {
        id: generateUUID(),
        projetoId: generateUUID(),
        nome: workpackage.nome,
        descricao: workpackage.descricao || null,
        inicio: workpackage.inicio ? new Date(workpackage.inicio) : null,
        fim: workpackage.fim ? new Date(workpackage.fim) : null,
        estado: workpackage.estado || false,
        tarefas: [],
        materiais: [],
        recursos: []
      };

      dispatch({
        type: "UPDATE_PROJETO",
        data: {
          workpackages: [...(state.workpackages || []), newWorkpackage]
        }
      });
      toast.success("Workpackage adicionado com sucesso!");
    },

    updateWorkpackage: (id, data) => {
      if (!state.workpackages) return;
      
      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === id
          ? {
              ...wp,
              nome: data.nome || wp.nome,
              descricao: data.descricao ?? wp.descricao,
              inicio: data.inicio ? new Date(data.inicio) : wp.inicio,
              fim: data.fim ? new Date(data.fim) : wp.fim,
              estado: data.estado ?? wp.estado
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
    },

    removeWorkpackage: (id) => {
      if (!state.workpackages) return;
      
      dispatch({
        type: "UPDATE_PROJETO",
        data: {
          workpackages: state.workpackages.filter(wp => wp.id !== id)
        }
      });
      toast.success("Workpackage removido com sucesso!");
    },

    // Tarefas
    addTarefa: (workpackageId, tarefa) => {
      if (!state.workpackages) return;
      
      const newTarefa = {
        id: generateUUID(),
        workpackageId: workpackageId,
        nome: tarefa.nome,
        descricao: tarefa.descricao || null,
        inicio: tarefa.inicio ? new Date(tarefa.inicio) : null,
        fim: tarefa.fim ? new Date(tarefa.fim) : null,
        estado: tarefa.estado || false,
        entregaveis: []
      };

      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === workpackageId
          ? {
              ...wp,
              tarefas: [...(wp.tarefas || []), newTarefa]
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
    },

    updateTarefa: (workpackageId, tarefaId, data) => {
      if (!state.workpackages) return;
      
      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === workpackageId
          ? {
              ...wp,
              tarefas: wp.tarefas?.map(t =>
                t.id === tarefaId
                  ? { 
                      ...t, 
                      nome: data.nome || t.nome,
                      descricao: data.descricao ?? t.descricao,
                      inicio: data.inicio ? new Date(data.inicio) : t.inicio,
                      fim: data.fim ? new Date(data.fim) : t.fim,
                      estado: data.estado ?? t.estado
                    }
                  : t
              ) || []
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
    },

    removeTarefa: (workpackageId, tarefaId) => {
      if (!state.workpackages) return;
      
      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === workpackageId
          ? {
              ...wp,
              tarefas: wp.tarefas?.filter(t => t.id !== tarefaId) || []
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
      toast.success("Tarefa removida com sucesso!");
    },

    // Materiais
    addMaterial: (workpackageId, material) => {
      if (!state.workpackages) return;
      
      const newMaterial = {
        id: Date.now(),
        workpackageId: workpackageId,
        nome: material.nome,
        preco: new Decimal(material.preco.toString()),
        quantidade: Number(material.quantidade),
        rubrica: material.rubrica || "MATERIAIS",
        ano_utilizacao: Number(material.ano_utilizacao),
        descricao: material.descricao || null,
        estado: material.estado || false
      };

      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === workpackageId
          ? {
              ...wp,
              materiais: [...(wp.materiais || []), newMaterial]
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
    },

    updateMaterial: (workpackageId, materialId, data) => {
      if (!state.workpackages) return;
      
      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === workpackageId
          ? {
              ...wp,
              materiais: wp.materiais?.map(m =>
                m.id === materialId
                  ? { 
                      ...m, 
                      nome: data.nome || m.nome,
                      preco: data.preco ? new Decimal(data.preco.toString()) : m.preco,
                      quantidade: data.quantidade !== undefined ? Number(data.quantidade) : m.quantidade,
                      rubrica: data.rubrica || m.rubrica,
                      ano_utilizacao: data.ano_utilizacao !== undefined ? Number(data.ano_utilizacao) : m.ano_utilizacao
                    }
                  : m
              ) || []
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
    },

    removeMaterial: (workpackageId, materialId) => {
      if (!state.workpackages) return;
      
      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === workpackageId
          ? {
              ...wp,
              materiais: wp.materiais?.filter(m => m.id !== materialId) || []
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
      toast.success("Material removido com sucesso!");
    },

    // Entregáveis
    addEntregavel: (workpackageId, tarefaId, entregavel) => {
      if (!state.workpackages) return;
      
      const newEntregavel = {
        id: generateUUID(),
        tarefaId: tarefaId,
        nome: entregavel.nome,
        descricao: entregavel.descricao || null,
        data: entregavel.data ? new Date(entregavel.data) : null,
        estado: false,
        anexo: null
      };

      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === workpackageId
          ? {
              ...wp,
              tarefas: wp.tarefas?.map(t =>
                t.id === tarefaId
                  ? {
                      ...t,
                      entregaveis: [...(t.entregaveis || []), newEntregavel]
                    }
                  : t
              ) || []
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
    },

    updateEntregavel: (workpackageId, tarefaId, entregavelId, data) => {
      if (!state.workpackages) return;
      
      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === workpackageId
          ? {
              ...wp,
              tarefas: wp.tarefas?.map(t =>
                t.id === tarefaId
                  ? {
                      ...t,
                      entregaveis: t.entregaveis?.map(e =>
                        e.id === entregavelId
                          ? { 
                              ...e, 
                              nome: data.nome || e.nome,
                              descricao: data.descricao ?? e.descricao,
                              data: data.data ? new Date(data.data) : e.data
                            }
                          : e
                      ) || []
                    }
                  : t
              ) || []
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
    },

    removeEntregavel: (workpackageId, tarefaId, entregavelId) => {
      if (!state.workpackages) return;
      
      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === workpackageId
          ? {
              ...wp,
              tarefas: wp.tarefas?.map(t =>
                t.id === tarefaId
                  ? {
                      ...t,
                      entregaveis: t.entregaveis?.filter(e => e.id !== entregavelId) || []
                    }
                  : t
              ) || []
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
      toast.success("Entregável removido com sucesso!");
    },

    // Recursos
    addRecurso: (workpackageId, recurso) => {
      if (!state.workpackages) return;
      
      const newRecurso = {
        id: Date.now(),
        workpackageId: workpackageId,
        mes: recurso.mes,
        ano: recurso.ano,
        ocupacao: new Decimal(recurso.ocupacao.toString()),
        userId: recurso.userId
      };

      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === workpackageId
          ? {
              ...wp,
              recursos: [...(wp.recursos || []), newRecurso]
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
    },

    updateRecurso: (workpackageId, recursoId, data) => {
      if (!state.workpackages) return;
      
      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === workpackageId
          ? {
              ...wp,
              recursos: wp.recursos?.map(r =>
                // @ts-ignore - Ignorar erro de tipagem para o ID
                r.id === recursoId
                  ? { 
                      ...r, 
                      mes: data.mes !== undefined ? data.mes : r.mes,
                      ano: data.ano !== undefined ? data.ano : r.ano,
                      ocupacao: data.ocupacao ? new Decimal(data.ocupacao.toString()) : r.ocupacao,
                      userId: data.userId || r.userId
                    }
                  : r
              ) || []
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
    },

    removeRecurso: (workpackageId, recursoId) => {
      if (!state.workpackages) return;
      
      const updatedWorkpackages = state.workpackages.map(wp =>
        wp.id === workpackageId
          ? {
              ...wp,
              recursos: wp.recursos?.filter(r => 
                // @ts-ignore - Ignorar erro de tipagem para o ID
                r.id !== recursoId
              ) || []
            }
          : wp
      );

      dispatch({
        type: "UPDATE_PROJETO",
        data: { workpackages: updatedWorkpackages }
      });
    }
  };

  // Renderizar o conteúdo da fase atual
  const renderizarConteudoFase = () => {
    switch (faseAtual) {
      case "informacoes":
        return <InformacoesTab onNavigateForward={irParaProximaFase} />;
      case "financas":
        return (
          <FinancasTab 
            onNavigateForward={irParaProximaFase} 
            onNavigateBack={irParaFaseAnterior} 
          />
        );
      case "workpackages":
        return (
          <div>
            <WorkpackagesTab 
              workpackages={state.workpackages as any || []}
              onNavigateForward={irParaProximaFase} 
              onNavigateBack={irParaFaseAnterior}
              handlers={workpackageHandlers}
            />
          </div>
        );
      case "recursos":
        return (
          <RecursosTab 
            onNavigateForward={irParaProximaFase} 
            onNavigateBack={irParaFaseAnterior} 
          />
        );
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

  // Função para atualizar um workpackage
  const handleUpdateWorkPackage = (workpackage: Partial<WorkpackageWithRelations>) => {
    if (!state.workpackages) return;
    
    const updatedWorkpackages = state.workpackages.map(wp => 
      wp.id === workpackage.id ? { ...wp, ...workpackage } : wp
    );
    
    dispatch({
      type: "UPDATE_PROJETO",
      data: { workpackages: updatedWorkpackages }
    });
  };

  // Função para atualizar uma tarefa
  const handleUpdateTarefa = (tarefa: Partial<Prisma.TarefaGetPayload<{ include: { entregaveis: true } }>>) => {
    const workpackageIndex = state.workpackages?.findIndex(wp => 
      wp.tarefas?.some(t => t.id === tarefa.id)
    );
    
    if (workpackageIndex !== undefined && workpackageIndex !== -1 && state.workpackages) {
      const updatedWorkpackages = [...state.workpackages];
      if (updatedWorkpackages[workpackageIndex]?.tarefas) {
        updatedWorkpackages[workpackageIndex] = {
          ...updatedWorkpackages[workpackageIndex],
          tarefas: updatedWorkpackages[workpackageIndex].tarefas.map(t => 
            t.id === tarefa.id ? { ...t, ...tarefa } : t
          )
        };
        
        dispatch({
          type: "UPDATE_PROJETO",
          data: { workpackages: updatedWorkpackages }
        });
      }
    }
  };

  // Handler para atualizar dados do projeto
  const handleUpdateProjeto = (data: Partial<typeof state>) => {
    dispatch({ type: "UPDATE_PROJETO", data });
  };

  // Função para calcular custos
  const calcularCustos = (workpackage: WorkpackageWithRelations) => {
    // Custos de recursos humanos
    const custosRH = workpackage.recursos.reduce((total, recurso) => {
      return total + new Decimal(recurso.ocupacao.toString()).toNumber();
    }, 0);

    // Custos de materiais
    const custosMateriais = workpackage.materiais.reduce((total, material) => {
      return total + material.preco.toNumber() * material.quantidade;
    }, 0);

    return {
      custosRH,
      custosMateriais,
      total: custosRH + custosMateriais
    };
  };

  // Handler para atualizar overhead
  const handleOverheadChange = (value: number) => {
    handleUpdateProjeto({ 
      overhead: new Decimal(value)
    });
  };

  // Handler para atualizar taxa de financiamento
  const handleTaxaFinanciamentoChange = (value: number) => {
    handleUpdateProjeto({ 
      taxa_financiamento: new Decimal(value)
    });
  };

  // Função para enviar o formulário
  const handleSubmit = async () => {
    // Verificar se todos os dados necessários estão preenchidos
    if (!fasesConcluidas.resumo) {
      toast.error("Complete todas as fases antes de finalizar.");
      return;
    }
    
    try {
      setSubmitLoading(true);
      
      // Preparar dados do projeto para enviar para a API
      const projetoData = {
        nome: state.nome || "",
        descricao: state.descricao || undefined,
        inicio: state.inicio instanceof Date ? state.inicio : state.inicio ? new Date(state.inicio) : undefined,
        fim: state.fim instanceof Date ? state.fim : state.fim ? new Date(state.fim) : undefined,
        estado: ProjetoEstado.PENDENTE,
        overhead: Number(state.overhead),
        taxa_financiamento: Number(state.taxa_financiamento),
        valor_eti: Number(state.valor_eti),
        financiamentoId: state.financiamentoId ? Number(state.financiamentoId) : undefined,
        
        workpackages: state.workpackages?.map(wp => ({
          nome: wp.nome || "",
          descricao: wp.descricao || undefined,
          inicio: wp.inicio instanceof Date ? wp.inicio : wp.inicio ? new Date(wp.inicio) : undefined,
          fim: wp.fim instanceof Date ? wp.fim : wp.fim ? new Date(wp.fim) : undefined,
          estado: Boolean(wp.estado),
          
          tarefas: wp.tarefas?.map(t => ({
            nome: t.nome || "",
            descricao: t.descricao || undefined,
            inicio: t.inicio instanceof Date ? t.inicio : t.inicio ? new Date(t.inicio) : undefined,
            fim: t.fim instanceof Date ? t.fim : t.fim ? new Date(t.fim) : undefined,
            estado: Boolean(t.estado),
            entregaveis: t.entregaveis?.map(e => ({
              nome: e.nome || "",
              descricao: e.descricao || undefined,
              data: e.data instanceof Date ? e.data : e.data ? new Date(e.data) : undefined
            })) || []
          })) || [],
          
          materiais: wp.materiais?.map(m => ({
            nome: m.nome || "",
            preco: Number(m.preco),
            quantidade: Number(m.quantidade),
            rubrica: m.rubrica || Rubrica.MATERIAIS,
            ano_utilizacao: Number(m.ano_utilizacao)
          })) || [],

          recursos: wp.recursos?.map(r => ({
            userId: r.userId,
            mes: r.mes,
            ano: r.ano,
            ocupacao: Number(r.ocupacao instanceof Decimal ? r.ocupacao.toNumber() : r.ocupacao)
          })) || []
        })) || []
      };
      
      // Chamar a API para criar o projeto
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
    <div className="flex flex-col md:flex-row gap-6 justify-between">
      <div className="space-y-4 flex-1">
        {/* Layout flexível para formulário e cronograma */}
        <div className="flex relative">
          {/* Conteúdo principal */}
          <div 
            className={`
              flex-1 space-y-6 
              transition-all duration-100 ease-in-out
              ${mostrarCronograma ? "w-3/5" : "w-full"}
            `}
          >
            {/* Container de progresso com shadow suave */}
            <div className="glass-card border-white/20 shadow-md transition-all duration-500 ease-in-out hover:shadow-lg rounded-2xl">
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

            {/* Formulário com shadow suave */}
            <div className="glass-card border-white/20 shadow-md transition-all duration-500 ease-in-out hover:shadow-lg rounded-2xl">
              <ProjetoFormPanel
                faseAtual={faseAtual}
              >
                {renderizarConteudoFase()}
              </ProjetoFormPanel>
            </div>
          </div>

          {/* Cronograma com animação e shadow */}
          <div 
            className={`
              transition-all duration-500 ease-in-out
              transform
              ${mostrarCronograma 
                ? "opacity-100 translate-x-0 w-2/5 pl-8" 
                : "opacity-0 translate-x-full w-0 overflow-hidden max-w-[50vw] p-0"}
            `}
          >
              <ProjetoCronograma
              state={state}
              handleUpdateWorkPackage={handleUpdateWorkPackage}
              handleUpdateTarefa={handleUpdateTarefa}
              />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CriarProjetoPage() {
  return (
    <PageLayout>
      <ProjetoFormProvider>
        <div className="h-full flex flex-col">
          {/* Cabeçalho com o botão de importação */}
          <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <ProjetoHeader />
              </div>
            </div>
             
            {/* Botão de importar Excel */}
            <div className="flex-shrink-0 mt-4 md:mt-0 space-x-2">
              <ImportarProjetoButton />
            </div>
          </div>
          
          <ProjetoFormContent />
          <StateMonitor />
        </div>
      </ProjetoFormProvider>
    </PageLayout>
  );
}