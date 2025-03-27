import { FileText, Edit, Trash2, Check, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { EntregavelForm } from "./form";
import type { Prisma } from "@prisma/client";

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
  tarefaDates
}: EntregavelItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  const handleToggleEstado = () => {
    onToggleEstado(!entregavel.estado);
  };

  const handleEdit = async (_tarefaId: string, data: Omit<Prisma.EntregavelCreateInput, "tarefa">) => {
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
      return format(dataObj, 'dd/MM/yyyy');
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "Data inválida";
    }
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
    <div className="bg-white border rounded-md shadow-sm">
      <div className="p-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-azul/10 flex items-center justify-center">
            <FileText className="h-3 w-3 text-azul" />
          </div>
          <div>
            <h5 className="text-sm font-medium text-azul">{entregavel.nome}</h5>
            <div className="flex items-center gap-1">
              {!hideState && (
                <Badge variant={entregavel.estado ? "default" : "outline"} className={`px-1 py-0 text-[10px] h-4 ${entregavel.estado ? "bg-green-500 text-white" : ""}`}>
                  {entregavel.estado ? "Entregue" : "Pendente"}
                </Badge>
              )}
              <span className="text-xs text-gray-500">
                {formatarData(entregavel.data)}
              </span>
              
              {showTarefaInfo && entregavel.tarefaNome && (
                <Badge variant="secondary" className="px-1 py-0 text-[10px] h-4">
                  Tarefa: {entregavel.tarefaNome}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!hideState && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleEstado}
              className={`h-6 px-2 rounded-md ${entregavel.estado ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            >
              {entregavel.estado ? (
                <Check className="h-3 w-3 mr-1" />
              ) : (
                <Circle className="h-3 w-3 mr-1" />
              )}
              {entregavel.estado ? "Concluído" : "Pendente"}
            </Button>
          )}
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-6 w-6 p-0 rounded-md hover:bg-azul/10 text-azul"
            >
              <Edit className="h-3 w-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 rounded-md hover:bg-red-50 text-red-500"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
