import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Plus, FileText, Check, Circle, Upload, Trash, Calendar } from "lucide-react";
import { EntregavelSubmit } from "@/components/projetos/menus/tarefa/submit";
import { EntregavelForm } from "@/components/projetos/criar/novo/workpackages/entregavel/form";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Entregavel } from "@prisma/client";
import { useMutations } from "@/hooks/useMutations";

// Tipo para o que vem da API
type EntregavelAPI = {
  id: string;
  nome: string;
  descricao: string | null;
  estado: boolean;
  data: string | null;
  anexo: string | null;
  tarefaId: string;
};

interface TarefaEntregaveisProps {
  tarefa: any;
  tarefaId: string;
  addingEntregavel: boolean;
  setAddingEntregavel: (adding: boolean) => void;
  onUpdate?: () => Promise<void>;
}

export function TarefaEntregaveis({ 
  tarefa, 
  tarefaId, 
  addingEntregavel, 
  setAddingEntregavel,
  onUpdate
}: TarefaEntregaveisProps) {
  const [submittingEntregavel, setSubmittingEntregavel] = useState<string | null>(null);
  
  // Usar mutations diretamente
  const mutations = useMutations();

  // Buscar entregáveis da tarefa
  const { 
    data: entregaveis = [], 
    isLoading: isLoadingEntregaveis,
    refetch: refetchEntregaveis 
  } = api.tarefa.getEntregaveisByTarefa.useQuery(
    tarefaId,
    { enabled: !!tarefaId }
  );

  const handleToggleEstado = async (entregavelId: string, novoEstado: boolean) => {
    await mutations.entregavel.update.mutate({ 
      id: entregavelId,
      data: { estado: novoEstado }
    });
  };
  
  const handleRemoveEntregavel = async (entregavelId: string) => {
    if (confirm("Tem a certeza que deseja remover este entregável?")) {
      await mutations.entregavel.delete.mutate(entregavelId);
    }
  };

  const handleFileUpload = async (entregavelId: string, file: File) => {
    try {
      // Aqui implementaria a lógica real de upload
      // Exemplo simulado:
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Após o upload bem-sucedido, atualizar o entregável - força estado como true
      await mutations.entregavel.update.mutate({ 
        id: entregavelId,
        data: { estado: true }  // Aqui mantemos o estado explícito porque queremos forçar para true
      });
      
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

  // Função wrapper para compatibilidade de tipos
  const refetchEntregaveisAsync = async (): Promise<void> => {
    await refetchEntregaveis();
  };

  // Determinar se há entregáveis pendentes
  const pendingEntregaveis = entregaveis.filter(e => e.estado === false).length;

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
            className="h-10 bg-azul hover:bg-azul/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Entregável
          </Button>
        )}
      </div>

      {/* Formulário para adicionar novo entregável */}
      {addingEntregavel && (
        <Card className="p-6 border border-azul/10 bg-white shadow-sm rounded-xl animate-in fade-in-50 slide-in-from-top-5 duration-200">
          <h3 className="text-lg font-medium text-azul mb-5">Novo Entregável</h3>
          <EntregavelForm
            tarefaId={tarefaId}
            tarefaDates={{
              inicio: tarefa.inicio,
              fim: tarefa.fim
            }}
            onCancel={handleCancelAddEntregavel}
            onSubmit={(tarefaId, entregavel) => {
              mutations.entregavel.create.mutate({
                tarefaId,
                nome: entregavel.nome,
                descricao: entregavel.descricao || undefined,
                data: entregavel.data instanceof Date ? entregavel.data.toISOString() : entregavel.data
              });
              setAddingEntregavel(false);
            }}
          />
        </Card>
      )}

      {/* Informações sobre o total */}
      <div className="w-full py-4 px-5 bg-azul/5 border border-azul/10 rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div className="flex items-center mb-3 sm:mb-0">
          <FileText className="h-5 w-5 text-azul mr-2" />
          <h3 className="text-sm font-medium text-azul">
            {entregaveis.length} {entregaveis.length === 1 ? 'entregável' : 'entregáveis'} adicionados
          </h3>
        </div>
        <div className="text-sm text-gray-700">
          <span className="font-medium">Concluídos:</span>{' '}
          <span className="font-bold text-azul/90">{entregaveis.length - pendingEntregaveis}/{entregaveis.length}</span>
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
              <Card key={entregavel.id} className="p-3 border border-azul/10 shadow-sm">
                <div className="flex gap-2">
                  <div className="mt-0.5">
                    <button
                      onClick={() => handleToggleEstado(entregavel.id, !entregavel.estado)}
                      className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                        entregavel.estado 
                          ? "bg-emerald-500 border-emerald-500/10 text-white" 
                          : "border-zinc-300 bg-white hover:bg-zinc-100"
                      }`}
                    >
                      {entregavel.estado && <Check className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="flex-1 grid gap-1">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-azul/90">{entregavel.nome}</span>
                      <div className="flex gap-1 items-center">
                        {entregavel.estado ? (
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100">
                            Entregue
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100">
                            Pendente
                          </Badge>
                        )}
                        <button
                          onClick={() => handleRemoveEntregavel(entregavel.id)}
                          className="text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    {entregavel.descricao && (
                      <p className="text-sm text-zinc-500">{entregavel.descricao}</p>
                    )}
                    
                    <div className="flex justify-between items-center mt-1">
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
                          className="h-7 text-xs border-azul/20 text-azul hover:bg-azul/5"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Submeter
                        </Button>
                      )}
                      
                      {entregavel.anexo && (
                        <Button 
                          variant="ghost" 
                          className="h-7 text-xs text-zinc-500 hover:text-azul"
                          onClick={() => window.open(entregavel.anexo || "", "_blank")}
                        >
                          <FileText className="h-3 w-3 mr-1" />
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
        <div className="text-center py-16 bg-white rounded-lg border border-azul/10 shadow-sm">
          <FileText className="h-12 w-12 text-azul/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-azul mb-2">Nenhum entregável adicionado</h3>
          <p className="text-sm text-azul/60 max-w-md mx-auto mb-6">
            Adicione entregáveis a esta tarefa para acompanhar o progresso
          </p>
          <Button
            onClick={handleAddEntregavel}
            className="bg-azul hover:bg-azul/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar primeiro entregável
          </Button>
        </div>
      )}
    </div>
  );
}
