import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Plus, FileText, Check, Upload, Trash, Calendar } from "lucide-react";
import { EntregavelSubmit } from "@/components/projetos/menus/tarefa/submit";
import { EntregavelForm } from "@/components/projetos/criar/novo/workpackages/entregavel/form";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useMutations } from "@/hooks/useMutations";

interface TarefaEntregaveisProps {
  tarefa: any;
  tarefaId: string;
  addingEntregavel: boolean;
  setAddingEntregavel: (value: boolean) => void;
  onUpdate: (data: any) => Promise<void>;
  projetoId: string;
  onCreateEntregavel: (data: any) => Promise<void>;
  onUpdateEntregavel: (id: string, data: any) => Promise<void>;
  onDeleteEntregavel: (id: string) => Promise<void>;
}

export function TarefaEntregaveis({
  tarefa,
  tarefaId,
  addingEntregavel,
  setAddingEntregavel,
  onUpdate,
  projetoId,
  onCreateEntregavel,
  onUpdateEntregavel,
  onDeleteEntregavel,
}: TarefaEntregaveisProps) {
  const [submittingEntregavel, setSubmittingEntregavel] = useState<string | null>(null);

  // Usar mutations com o projetoId
  const mutations = useMutations(projetoId);

  // Buscar entregáveis da tarefa
  const { data: entregaveis = [] } = api.tarefa.getEntregaveisByTarefa.useQuery(tarefaId, {
    enabled: !!tarefaId,
  });

  const handleToggleEstado = async (entregavelId: string, novoEstado: boolean) => {
    await onUpdateEntregavel(entregavelId, { estado: novoEstado });
  };

  const handleRemoveEntregavel = async (entregavelId: string) => {
    if (confirm("Tem a certeza que deseja remover este entregável?")) {
      await onDeleteEntregavel(entregavelId);
    }
  };

  const handleFileUpload = async (entregavelId: string, _file: File) => {
    try {
      // Aqui implementaria a lógica real de upload
      // Exemplo simulado:
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Após o upload bem-sucedido, atualizar o entregável - força estado como true
      await onUpdateEntregavel(entregavelId, { estado: true });

      setSubmittingEntregavel(null);
      toast.success("Ficheiro enviado com sucesso");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao submeter ficheiro");
    }
  };

  const handleAddEntregavel = () => {
    setAddingEntregavel(true);
  };

  const handleCancelAddEntregavel = () => {
    setAddingEntregavel(false);
  };

  const handleSubmitEntregavel = (entregavelId: string) => {
    setSubmittingEntregavel(entregavelId);
  };

  const handleCancelSubmitEntregavel = () => {
    setSubmittingEntregavel(null);
  };

  // Determinar se há entregáveis pendentes
  const pendingEntregaveis = entregaveis.filter((e) => e.estado === false).length;

  // Atualizar o handler do submit
  const handleSubmit = async (data: any) => {
    try {
      await onCreateEntregavel({
        ...data,
        tarefaId,
      });

      setAddingEntregavel(false);
      await onUpdate({}); // Trigger refresh
      toast.success("Entregável adicionado com sucesso");
    } catch (error) {
      console.error("Erro ao criar entregável:", error);
      toast.error("Erro ao criar entregável");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Entregáveis</h2>
          <p className="text-sm text-gray-500">Gerir entregáveis da tarefa</p>
        </div>

        {!addingEntregavel && (
          <Button
            onClick={handleAddEntregavel}
            className="h-10 bg-azul text-white hover:bg-azul/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Entregável
          </Button>
        )}
      </div>

      {/* Formulário para adicionar novo entregável */}
      {addingEntregavel && (
        <Card className="rounded-xl border border-azul/10 bg-white p-6 shadow-sm duration-200 animate-in fade-in-50 slide-in-from-top-5">
          <h3 className="mb-5 text-lg font-medium text-azul">Novo Entregável</h3>
          <EntregavelForm
            tarefaId={tarefaId}
            tarefaDates={{
              inicio: tarefa.inicio,
              fim: tarefa.fim,
            }}
            onCancel={handleCancelAddEntregavel}
            onSubmit={handleSubmit}
          />
        </Card>
      )}

      {/* Informações sobre o total */}
      <div className="flex w-full flex-col rounded-lg border border-azul/10 bg-azul/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="mb-3 flex items-center sm:mb-0">
          <FileText className="mr-2 h-5 w-5 text-azul" />
          <h3 className="text-sm font-medium text-azul">
            {entregaveis.length} {entregaveis.length === 1 ? "entregável" : "entregáveis"}{" "}
            adicionados
          </h3>
        </div>
        <div className="text-sm text-gray-700">
          <span className="font-medium">Concluídos:</span>{" "}
          <span className="font-bold text-azul/90">
            {entregaveis.length - pendingEntregaveis}/{entregaveis.length}
          </span>
        </div>
      </div>

      {/* Lista de entregáveis */}
      {entregaveis && entregaveis.length > 0 ? (
        <div className="grid gap-3">
          {entregaveis.map((entregavel) =>
            submittingEntregavel === entregavel.id ? (
              <EntregavelSubmit
                key={entregavel.id}
                entregavelId={entregavel.id}
                nome={entregavel.nome}
                descricao={entregavel.descricao || undefined}
                data={entregavel.data ? new Date(entregavel.data) : null}
                onCancel={handleCancelSubmitEntregavel}
                onSubmit={handleFileUpload}
              />
            ) : (
              <Card key={entregavel.id} className="border border-azul/10 p-3 shadow-sm">
                <div className="flex gap-2">
                  <div className="mt-0.5">
                    <button
                      onClick={() => handleToggleEstado(entregavel.id, !entregavel.estado)}
                      className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                        entregavel.estado
                          ? "border-emerald-500/10 bg-emerald-500 text-white"
                          : "border-zinc-300 bg-white hover:bg-zinc-100"
                      }`}
                    >
                      {entregavel.estado && <Check className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="grid flex-1 gap-1">
                    <div className="flex items-start justify-between">
                      <span className="font-medium text-azul/90">{entregavel.nome}</span>
                      <div className="flex items-center gap-1">
                        {entregavel.estado ? (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                            Entregue
                          </Badge>
                        ) : (
                          <Badge className="border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100">
                            Pendente
                          </Badge>
                        )}
                        <button
                          onClick={() => handleRemoveEntregavel(entregavel.id)}
                          className="text-zinc-400 transition-colors hover:text-red-500"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {entregavel.descricao && (
                      <p className="text-sm text-zinc-500">{entregavel.descricao}</p>
                    )}

                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {entregavel.data && format(new Date(entregavel.data), "dd/MM/yyyy")}
                        </span>
                      </div>

                      {!entregavel.estado && (
                        <Button
                          onClick={() => handleSubmitEntregavel(entregavel.id)}
                          variant="outline"
                          className="h-7 border-azul/20 text-xs text-azul hover:bg-azul/5"
                        >
                          <Upload className="mr-1 h-3 w-3" />
                          Submeter
                        </Button>
                      )}

                      {entregavel.anexo && (
                        <Button
                          variant="ghost"
                          className="h-7 text-xs text-zinc-500 hover:text-azul"
                          onClick={() => window.open(entregavel.anexo || "", "_blank")}
                        >
                          <FileText className="mr-1 h-3 w-3" />
                          Ver Ficheiro
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-azul/10 bg-white py-16 text-center shadow-sm">
          <FileText className="mx-auto mb-4 h-12 w-12 text-azul/20" />
          <h3 className="mb-2 text-lg font-medium text-azul">Nenhum entregável adicionado</h3>
          <p className="mx-auto mb-6 max-w-md text-sm text-azul/60">
            Adicione entregáveis a esta tarefa para acompanhar o progresso
          </p>
          <Button onClick={handleAddEntregavel} className="bg-azul text-white hover:bg-azul/90">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar primeiro entregável
          </Button>
        </div>
      )}
    </div>
  );
}
