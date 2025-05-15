import { useState, useEffect } from "react";
import { WorkpackageInformacoes } from "./informacoes";
import { WorkpackageTarefas } from "./tarefas";
import { WorkpackageRecursos } from "./recursos";
import { WorkpackageMateriais } from "./materiais";
import { ProgressoWorkpackage } from "./progresso";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CheckCircle2, Circle, X, Trash } from "lucide-react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WorkpackageCompleto, ProjetoCompleto } from "@/components/projetos/types";
import { Decimal } from "decimal.js";
import { toast } from "sonner";
import type { Prisma } from "@prisma/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useSession } from "next-auth/react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface MenuWorkpackageProps {
  workpackageId: string;
  onClose: () => void;
  projetoId: string;
  _onUpdate: () => Promise<void>;
  open: boolean;
  workpackage?: WorkpackageCompleto; // Usar o tipo específico
  projeto?: ProjetoCompleto; // Usar o tipo específico
}

// Add a helper function to handle the type conversion safely
function convertToWorkpackageCompleto(wp: any, proj?: any): WorkpackageCompleto {
  const defaultDate = new Date();

  return {
    id: wp?.id || "",
    nome: wp?.nome || "",
    descricao: wp?.descricao || "",
    projetoId: wp?.projetoId || "",
    inicio: wp?.inicio ? new Date(wp.inicio) : defaultDate,
    fim: wp?.fim ? new Date(wp.fim) : defaultDate,
    estado: wp?.estado || false,
    tarefas: wp?.tarefas || [],
    materiais: wp?.materiais || [],
    recursos: wp?.recursos || [],
    projeto: wp?.projeto
      ? {
          id: wp.projeto.id || "",
          nome: wp.projeto.nome || "",
          descricao: wp.projeto.descricao || "",
          inicio: wp.projeto.inicio ? new Date(wp.projeto.inicio) : defaultDate,
          fim: wp.projeto.fim ? new Date(wp.projeto.fim) : defaultDate,
          estado: wp.projeto.estado || "EM_ANDAMENTO",
          overhead:
            typeof wp.projeto.overhead === "string"
              ? new Decimal(wp.projeto.overhead)
              : wp.projeto.overhead || new Decimal(0),
          taxa_financiamento:
            typeof wp.projeto.taxa_financiamento === "string"
              ? new Decimal(wp.projeto.taxa_financiamento)
              : wp.projeto.taxa_financiamento || new Decimal(0),
          valor_eti:
            typeof wp.projeto.valor_eti === "string"
              ? new Decimal(wp.projeto.valor_eti)
              : wp.projeto.valor_eti || new Decimal(0),
          financiamentoId: wp.projeto.financiamentoId || 0,
          responsavelId: wp.projeto.responsavelId || "",
        }
      : proj
        ? {
            id: proj.id || "",
            nome: proj.nome || "",
            descricao: proj.descricao || "",
            inicio: proj.inicio ? new Date(proj.inicio) : defaultDate,
            fim: proj.fim ? new Date(proj.fim) : defaultDate,
            estado: proj.estado || "EM_ANDAMENTO",
            overhead:
              typeof proj.overhead === "string"
                ? new Decimal(proj.overhead)
                : proj.overhead || new Decimal(0),
            taxa_financiamento:
              typeof proj.taxa_financiamento === "string"
                ? new Decimal(proj.taxa_financiamento)
                : proj.taxa_financiamento || new Decimal(0),
            valor_eti:
              typeof proj.valor_eti === "string"
                ? new Decimal(proj.valor_eti)
                : proj.valor_eti || new Decimal(0),
            financiamentoId: proj.financiamentoId || 0,
            responsavelId: proj.responsavelId || "",
          }
        : {
            id: "",
            nome: "",
            descricao: "",
            inicio: defaultDate,
            fim: defaultDate,
            estado: "EM_ANDAMENTO",
            overhead: new Decimal(0),
            taxa_financiamento: new Decimal(0),
            valor_eti: new Decimal(0),
            financiamentoId: 0,
            responsavelId: "",
          },
  } as WorkpackageCompleto;
}

export function MenuWorkpackage({
  workpackageId,
  onClose,
  projetoId,
  _onUpdate,
  open,
  workpackage: externalWorkpackage,
  projeto,
}: MenuWorkpackageProps) {
  const [addingTarefa, setAddingTarefa] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  
  const { isAdmin, isGestor } = usePermissions();
  const { data: session } = useSession();
  const utils = api.useUtils();

  // API mutations
  const createTarefa = api.tarefa.create.useMutation({
    onSuccess: () => {
      utils.projeto.findById.invalidate(projetoId);
      setAddingTarefa(false);
      toast.success("Tarefa criada com sucesso");
    },
  });

  const updateTarefa = api.tarefa.update.useMutation({
    onSuccess: () => {
      utils.projeto.findById.invalidate(projetoId);
      toast.success("Tarefa atualizada com sucesso");
    },
  });

  const deleteTarefa = api.tarefa.delete.useMutation({
    onSuccess: () => {
      utils.projeto.findById.invalidate(projetoId);
      toast.success("Tarefa removida com sucesso");
    },
  });

  const createEntregavel = api.entregavel.create.useMutation({
    onSuccess: () => {
      utils.projeto.findById.invalidate(projetoId);
      toast.success("Entregável adicionado com sucesso");
    },
  });

  const updateEntregavel = api.entregavel.update.useMutation({
    onSuccess: () => {
      utils.projeto.findById.invalidate(projetoId);
      toast.success("Entregável atualizado com sucesso");
    },
  });

  const deleteEntregavel = api.entregavel.delete.useMutation({
    onSuccess: () => {
      utils.projeto.findById.invalidate(projetoId);
      toast.success("Entregável removido com sucesso");
    },
  });

  const deleteWorkpackage = api.workpackage.delete.useMutation({
    onSuccess: () => {
      utils.projeto.findById.invalidate(projetoId);
      utils.financas.getVisaoProjeto.invalidate();
      utils.financas.getComparacaoGastos.invalidate();
      utils.financas.getPainelFinanceiroProjeto.invalidate();
      toast.success('Workpackage apagado com sucesso!');
      onClose();
    },
  });

  // Se não temos o workpackage externamente, buscar da API
  const { data: apiWorkpackage, isLoading } = api.workpackage.findById.useQuery(
    { id: workpackageId },
    {
      staleTime: 1000 * 30,
      enabled: !!workpackageId && open && !externalWorkpackage,
    }
  );

  const workpackage = externalWorkpackage || apiWorkpackage;
  const fullWorkpackage = workpackage ? convertToWorkpackageCompleto(workpackage, projeto) : undefined;

  useEffect(() => {
    if (!open) setAddingTarefa(false);
  }, [open]);

  const isResponsavel = projeto?.responsavelId === session?.user?.id;
  const canEdit = isAdmin || isGestor || isResponsavel;

  // Handlers
  const handleSubmitTarefa = (
    workpackageId: string,
    tarefa: Omit<Prisma.TarefaCreateInput, "workpackage">
  ) => {
    createTarefa.mutate({
      nome: tarefa.nome,
      workpackageId: workpackageId,
      descricao: typeof tarefa.descricao === 'string' ? tarefa.descricao : undefined,
      inicio: tarefa.inicio instanceof Date ? tarefa.inicio : undefined,
      fim: tarefa.fim instanceof Date ? tarefa.fim : undefined,
      estado: false,
    });
  };

  const handleEditTarefa = async (tarefaId: string, tarefaData: Prisma.TarefaUpdateInput) => {
    try {
      const data = {
        nome: typeof tarefaData.nome === 'string' ? tarefaData.nome : undefined,
        descricao: typeof tarefaData.descricao === 'string' ? tarefaData.descricao : undefined,
        inicio: tarefaData.inicio instanceof Date ? tarefaData.inicio : undefined,
        fim: tarefaData.fim instanceof Date ? tarefaData.fim : undefined,
        estado: typeof tarefaData.estado === 'boolean' ? tarefaData.estado : undefined,
      };

      await updateTarefa.mutateAsync({
        id: tarefaId,
        data,
      });
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleToggleEstadoTarefa = async (tarefaId: string) => {
    try {
      const tarefa = fullWorkpackage?.tarefas?.find((t) => t.id === tarefaId);
      if (!tarefa) return;

      await updateTarefa.mutateAsync({
        id: tarefaId,
        data: {
          estado: !tarefa.estado,
        },
      });
    } catch (error) {
      console.error("Erro ao atualizar estado:", error);
      toast.error("Erro ao atualizar estado da tarefa");
    }
  };

  const handleDeleteTarefa = (tarefaId: string) => {
    try {
      deleteTarefa.mutate(tarefaId);
    } catch (error) {
      console.error("Erro ao remover tarefa:", error);
      toast.error("Erro ao remover tarefa");
    }
  };

  const handleAddEntregavel = async (
    tarefaId: string,
    entregavel: Omit<Prisma.EntregavelCreateInput, "tarefa">
  ) => {
    try {
      await createEntregavel.mutateAsync({
        tarefaId,
        nome: entregavel.nome,
        descricao: entregavel.descricao || undefined,
        data: entregavel.data instanceof Date ? entregavel.data.toISOString() : entregavel.data,
      });
    } catch (error) {
      console.error("Erro ao adicionar entregável:", error);
      toast.error("Erro ao adicionar entregável");
    }
  };

  const handleEditEntregavel = async (entregavelId: string, entregavelData: Prisma.EntregavelUpdateInput) => {
    try {
      const data = {
        nome: typeof entregavelData.nome === 'string' ? entregavelData.nome : undefined,
        descricao: typeof entregavelData.descricao === 'string' ? entregavelData.descricao : undefined,
        estado: typeof entregavelData.estado === 'boolean' ? entregavelData.estado : undefined,
        data: entregavelData.data instanceof Date ? entregavelData.data.toISOString() : undefined,
      };

      await updateEntregavel.mutateAsync({
        id: entregavelId,
        data,
      });
    } catch (error) {
      console.error("Erro ao atualizar entregável:", error);
      toast.error("Erro ao atualizar entregável");
    }
  };

  const handleDeleteEntregavel = (entregavelId: string) => {
    try {
      deleteEntregavel.mutate(entregavelId);
    } catch (error) {
      console.error("Erro ao remover entregável:", error);
      toast.error("Erro ao remover entregável");
    }
  };

  // Loading state
  if (!externalWorkpackage && isLoading) {
    return (
      <Sheet open={open} onOpenChange={onClose} modal={false}>
        <SheetContent className="w-full rounded-l-3xl border-l border-none border-white/30 bg-white/95 p-0 shadow-xl backdrop-blur-xl lg:w-[600px]">
          <div className="flex h-full flex-col items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-azul/20 border-t-azul"></div>
            <p className="mt-4 text-azul/70">A carregar informações...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!fullWorkpackage) {
    return (
      <Sheet open={open} onOpenChange={onClose} modal={false}>
        <SheetContent className="w-full rounded-l-3xl border-l border-none border-white/30 bg-white/95 p-0 shadow-xl backdrop-blur-xl lg:w-[600px]">
          <div className="flex h-full flex-col items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
              <X className="h-8 w-8 text-red-500" />
            </div>
            <p className="mt-4 font-medium text-gray-700">
              Não foi possível carregar o workpackage
            </p>
            <Button
              onClick={onClose}
              className="mt-6 rounded-xl bg-azul px-6 py-2 text-white hover:bg-azul/90"
            >
              Fechar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onClose} modal={false}>
      <SheetContent className="fixed bottom-0 right-0 top-0 w-full overflow-hidden rounded-l-3xl border-l border-white/20 bg-white p-0 shadow-2xl sm:max-w-none lg:w-[600px]">
        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-20 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-azul/10">
                    {fullWorkpackage.estado ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-azul/70" />
                    )}
                  </div>
                  <h1 className="text-xl font-bold text-gray-900">{fullWorkpackage.nome}</h1>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-9 w-9 rounded-full transition-colors hover:bg-red-100"
                          title="Apagar Workpackage"
                        >
                          <Trash className="h-5 w-5 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Apagar Workpackage</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Tem a certeza que deseja apagar este workpackage?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={async () => {
                              try {
                                await deleteWorkpackage.mutateAsync(fullWorkpackage.id);
                              } catch (error: any) {
                                toast.error(error?.message || 'Erro ao apagar workpackage');
                              } finally {
                                setOpenDeleteDialog(false);
                              }
                            }}
                          >
                            Apagar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-9 w-9 rounded-full transition-colors hover:bg-gray-100"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="divide-y divide-gray-100">
              {projetoId && (
                <>
                  <div className="px-5 py-6">
                    <WorkpackageInformacoes
                      workpackageId={fullWorkpackage.id}
                      projetoId={fullWorkpackage.projetoId}
                      _onClose={onClose}
                      workpackage={fullWorkpackage}
                      readOnly={!canEdit}
                    />
                  </div>
                  <div className="px-5 py-6">
                    <ProgressoWorkpackage
                      projetoId={projetoId}
                      workpackageId={fullWorkpackage.id}
                    />
                  </div>
                  <div className="px-5 py-6">
                    <WorkpackageTarefas
                      workpackage={fullWorkpackage}
                      _workpackageId={fullWorkpackage.id}
                      addingTarefa={addingTarefa}
                      setAddingTarefa={setAddingTarefa}
                      onSubmitTarefa={handleSubmitTarefa}
                      onEditTarefa={handleEditTarefa}
                      onToggleEstadoTarefa={handleToggleEstadoTarefa}
                      onDeleteTarefa={handleDeleteTarefa}
                      onAddEntregavel={handleAddEntregavel}
                      onEditEntregavel={handleEditEntregavel}
                      onDeleteEntregavel={handleDeleteEntregavel}
                      canEdit={canEdit}
                    />
                  </div>
                  <div className="px-5 py-6">
                    <WorkpackageRecursos
                      workpackage={fullWorkpackage}
                      _workpackageId={fullWorkpackage.id}
                      projetoId={projetoId}
                      canEdit={canEdit}
                    />
                  </div>
                  <div className="px-5 py-6">
                    <WorkpackageMateriais
                      workpackage={fullWorkpackage}
                      _workpackageId={fullWorkpackage.id}
                      projetoId={projetoId}
                      canEdit={canEdit}
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}