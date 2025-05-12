import { FileText, Edit, Trash2, Check, Circle, Paperclip, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { EntregavelForm } from "./form";
import type { Prisma } from "@prisma/client";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatBytes } from "@/lib/utils";

interface AnexoFile {
  url: string;
  fileName: string;
  fileType: string;
  fileExtension: string;
  uploadedAt: Date | string;
  size: number;
}

interface Entregavel {
  id: string;
  nome: string;
  data: Date | null;
  estado: boolean;
  tarefaId: string;
  tarefaNome?: string;
  descricao?: string | null;
  anexo?: string | null;
}

interface EntregavelItemProps {
  entregavel: Entregavel;
  onEdit: (data: Omit<Prisma.EntregavelCreateInput, "tarefa">) => Promise<void>;
  onRemove: () => void;
  onToggleEstado: (estado: boolean) => void;
  showTarefaInfo?: boolean;
  hideState?: boolean;
  readOnly?: boolean;
  tarefaDates: {
    inicio: Date;
    fim: Date;
  };
}

export function EntregavelItem({
  entregavel,
  onEdit,
  onRemove,
  onToggleEstado,
  showTarefaInfo = false,
  hideState = false,
  readOnly = false,
  tarefaDates,
}: EntregavelItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAnexosDialogOpen, setIsAnexosDialogOpen] = useState(false);


  const anexosQuery = api.entregavel.getAnexos.useQuery(entregavel.id, {
    enabled: isAnexosDialogOpen,
    refetchOnWindowFocus: false,
  });

  const handleToggleEstado = () => {
    onToggleEstado(!entregavel.estado);
  };

  const handleEdit = async (
    _tarefaId: string,
    data: Omit<Prisma.EntregavelCreateInput, "tarefa">
  ) => {
    try {
      await onEdit(data);
      setIsEditing(false);
      toast.success("Entregável atualizado com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar entregável:", error);
      toast.error("Erro ao atualizar entregável");
    }
  };

  const formatarData = (data: Date | null | string) => {
    if (!data) return "Sem data";

    try {
      const dataObj = data instanceof Date ? data : new Date(data);
      return format(dataObj, "dd/MM/yyyy");
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "Data inválida";
    }
  };

  const handleOpenAnexos = () => {
    setIsAnexosDialogOpen(true);
  };

  const handleViewAnexo = (url: string) => {
    window.open(url, '_blank');
  };

  if (isEditing) {
    return (
      <Card className="border-azul/10 p-4">
        <EntregavelForm
          tarefaId={entregavel.tarefaId}
          tarefaDates={tarefaDates}
          initialData={entregavel}
          onSubmit={handleEdit}
          onCancel={() => setIsEditing(false)}
        />
      </Card>
    );
  }

  return (
    <>
      <div className="rounded-md border bg-white shadow-sm">
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-azul/10">
              <FileText className="h-3 w-3 text-azul" />
            </div>
            <div>
              <h5 className="text-sm font-medium text-azul">{entregavel.nome}</h5>
              <div className="flex items-center gap-1">
                {!hideState && (
                  <Badge
                    variant={entregavel.estado ? "default" : "outline"}
                    className={`h-4 px-1 py-0 text-[10px] ${entregavel.estado ? "bg-green-500 text-white" : ""}`}
                  >
                    {entregavel.estado ? "Entregue" : "Pendente"}
                  </Badge>
                )}
                <span className="text-xs text-gray-500">{formatarData(entregavel.data)}</span>

                {showTarefaInfo && entregavel.tarefaNome && (
                  <Badge variant="secondary" className="h-4 px-1 py-0 text-[10px]">
                    Tarefa: {entregavel.tarefaNome}
                  </Badge>
                )}

                {entregavel.anexo && (
                  <Badge variant="outline" className="h-4 px-1 py-0 text-[10px] border-azul/30 text-azul">
                    <Paperclip className="h-2 w-2 mr-1" />
                    Anexos
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botões de ações */}
            <div className="flex gap-1">
              {entregavel.anexo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenAnexos}
                  className="h-6 rounded-md px-2 text-azul hover:bg-azul/10"
                  title="Ver anexos"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Ver Anexos
                </Button>
              )}
            </div>

            {!hideState && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleEstado}
                className={`h-6 rounded-md px-2 ${entregavel.estado ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
              >
                {entregavel.estado ? (
                  <Check className="mr-1 h-3 w-3" />
                ) : (
                  <Circle className="mr-1 h-3 w-3" />
                )}
                {entregavel.estado ? "Concluído" : "Pendente"}
              </Button>
            )}

            {!readOnly && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-6 w-6 rounded-md p-0 text-azul hover:bg-azul/10"
                >
                  <Edit className="h-3 w-3" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  className="h-6 w-6 rounded-md p-0 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para exibir anexos */}
      <Dialog open={isAnexosDialogOpen} onOpenChange={setIsAnexosDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Anexos do entregável</DialogTitle>
            <DialogDescription>
              {entregavel.nome}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {anexosQuery.isLoading ? (
              <div className="flex justify-center py-4">
                <span className="animate-spin text-azul">⏳</span>
              </div>
            ) : anexosQuery.isError ? (
              <div className="text-red-500 text-center py-4">
                Erro ao carregar anexos: {anexosQuery.error.message}
              </div>
            ) : anexosQuery.data && anexosQuery.data.length === 0 ? (
              <div className="text-gray-500 text-center py-4">
                Nenhum anexo encontrado
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {anexosQuery.data?.map((anexo: AnexoFile) => (
                  <div 
                    key={anexo.url} 
                    className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-azul/10">
                        <FileText className="h-4 w-4 text-azul" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{anexo.fileName}</p>
                        <div className="flex gap-2 text-xs text-gray-500">
                          <span>{anexo.fileType}</span>
                          <span>•</span>
                          <span>{formatBytes(anexo.size)}</span>
                          <span>•</span>
                          <span>{formatarData(anexo.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewAnexo(anexo.url)}
                        className="h-8 w-8 rounded-md p-0 text-azul hover:bg-azul/10"
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setIsAnexosDialogOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
