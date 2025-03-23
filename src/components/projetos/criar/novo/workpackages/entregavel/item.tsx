import { FileText, Edit, Trash2, Check, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useState, useEffect } from "react";
import { api } from "@/trpc/react"; 
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
  onEdit: () => void;
  onRemove: () => void;
  onToggleEstado: (estado: boolean) => void;
  showTarefaInfo?: boolean;
}

export function EntregavelItem({
  entregavel,
  onEdit,
  onRemove,
  onToggleEstado,
  showTarefaInfo = false
}: EntregavelItemProps) {
  // Simplificar para usar diretamente o estado do entregável das props
  // já que o TarefaItem vai controlar o estado local
  
  const handleToggleEstado = () => {
    // Chamar o callback com o novo estado (invertido)
    onToggleEstado(!entregavel.estado);
  };

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
              <Badge variant={entregavel.estado ? "default" : "outline"} className={`px-1 py-0 text-[10px] h-4 ${entregavel.estado ? "bg-green-500 text-white" : ""}`}>
                {entregavel.estado ? "Entregue" : "Pendente"}
              </Badge>
              <span className="text-xs text-gray-500">
                {entregavel.data ? format(entregavel.data, 'dd/MM/yyyy') : "Sem data"}
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
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
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
