import { useState, useContext } from "react";
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
import { EntregaveisContext } from "@/app/projetos/[id]/page";

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
  
  // Usar o contexto centralizado para entregáveis
  const entregaveisContext = useContext(EntregaveisContext);
  
  // Fallback para as mutações diretas caso o contexto não esteja disponível
  const mutations = useMutations(onUpdate);

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
    // Usar o toggleEstado do contexto centralizado se disponível
    if (entregaveisContext) {
      entregaveisContext.toggleEntregavelEstado(entregavelId, novoEstado);
    } else {
      // Fallback para mutação direta
      await mutations.entregavel.toggleEstado.mutate({ 
        id: entregavelId, 
        estado: novoEstado 
      });
    }
  };
  
  const handleRemoveEntregavel = async (entregavelId: string) => {
    if (confirm("Tem certeza que deseja remover este entregável?")) {
      await mutations.entregavel.delete.mutate(entregavelId);
    }
  };

  const handleFileUpload = async (entregavelId: string, file: File) => {
    try {
      // Aqui implementaria a lógica real de upload
      // Exemplo simulado:
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Após o upload bem-sucedido, atualizar o entregável
      if (entregaveisContext) {
        entregaveisContext.toggleEntregavelEstado(entregavelId, true);
      } else {
        await mutations.entregavel.toggleEstado.mutate({ 
          id: entregavelId, 
          estado: true
        });
      }
      
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
    <div className="grid gap-4">
      {/* Cabeçalho com contador de entregáveis */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-azul">Entregáveis</h3>
          {entregaveis && entregaveis.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-sm text-azul/80">
                {entregaveis.length - pendingEntregaveis}/{entregaveis.length} concluídos
              </span>
            </div>
          )}
        </div>
        <Button 
          onClick={handleAddEntregavel} 
          className="h-8 gap-1 text-xs bg-azul hover:bg-azul/90 text-white"
          disabled={addingEntregavel}
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </Button>
      </div>

      {addingEntregavel && (
        <EntregavelForm
          tarefaId={tarefaId}
          tarefaDates={{
            inicio: tarefa.inicio,
            fim: tarefa.fim
          }}
          onCancel={() => setAddingEntregavel(false)}
          onSubmit={(tarefaId, entregavel) => {
            mutations.entregavel.create.mutate({
              tarefaId,
              nome: entregavel.nome,
              descricao: entregavel.descricao || undefined,
              data: entregavel.data instanceof Date ? entregavel.data.toISOString() : entregavel.data
            });
          }}
        />
      )}

      {/* Lista de entregáveis */}
      {entregaveis && entregaveis.length > 0 ? (
        <div className="grid gap-3">
          {entregaveis.map((entregavel: Entregavel) => 
            submittingEntregavel === entregavel.id ? (
              <EntregavelSubmit
                key={entregavel.id}
                entregavelId={entregavel.id}
                nome={entregavel.nome}
                descricao={entregavel.descricao || undefined}
                data={entregavel.data}
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
                          ? "bg-verde border-verde/10 text-white" 
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
                          <span className="text-xs text-verde bg-verde/10 px-2 py-0.5 rounded-full">
                            Entregue
                          </span>
                        ) : (
                          <span className="text-xs text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                            Pendente
                          </span>
                        )}
                        <button
                          onClick={() => handleRemoveEntregavel(entregavel.id)}
                          className="text-zinc-400 hover:text-red-500"
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
                          {format(new Date(entregavel.data!), "dd/MM/yyyy")}
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
        <div className="p-8 text-center text-zinc-500 border border-dashed rounded-lg">
          {!isLoadingEntregaveis ? (
            <>
              <FileText className="h-10 w-10 mx-auto mb-2 text-zinc-300" />
              <p>Não há entregáveis definidos para esta tarefa.</p>
              <p className="text-sm mt-1">
                Clique em "Adicionar" para definir entregáveis.
              </p>
            </>
          ) : (
            <p>A carregar entregáveis...</p>
          )}
        </div>
      )}
    </div>
  );
}
