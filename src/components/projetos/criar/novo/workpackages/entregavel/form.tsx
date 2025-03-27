import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { FileText, X, Save } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { toast } from "sonner";

interface EntregavelFormProps {
  tarefaId: string;
  onSubmit: (tarefaId: string, entregavel: Omit<Prisma.EntregavelCreateInput, "tarefa">) => void;
  onCancel: () => void;
  tarefaDates: {
    inicio: Date;
    fim: Date;
  };
  initialData?: {
    id?: string;
    nome: string;
    data?: Date | null;
    estado?: boolean;
  };
}

export function EntregavelForm({ 
  tarefaId, 
  onSubmit, 
  onCancel,
  tarefaDates,
  initialData
}: EntregavelFormProps) {
  const [formData, setFormData] = useState({
    nome: initialData?.nome || '',
    data: initialData?.data || tarefaDates.fim
  });

  // Título dinâmico com base em criação/edição
  const isEditing = !!initialData;

  const handleSubmit = () => {
    if (!formData.nome) {
      toast.error("O nome do entregável é obrigatório");
      return;
    }

    // Verificar se a data está dentro do período da tarefa
    if (formData.data < tarefaDates.inicio) {
      toast.error("A data do entregável não pode ser anterior à data de início da tarefa");
      return;
    }

    if (formData.data > tarefaDates.fim) {
      toast.error("A data do entregável não pode ser posterior à data de fim da tarefa");
      return;
    }

    onSubmit(tarefaId, {
      nome: formData.nome,
      data: formData.data ? formData.data.toISOString() : null,
      estado: false,
      descricao: null
    });
  };

  return (
    <Card className="p-4 border border-azul/10 shadow-sm bg-white/70 backdrop-blur-sm mt-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-azul/10 flex items-center justify-center">
          <FileText className="h-4 w-4 text-azul" />
        </div>
        <h4 className="text-base font-medium text-azul">
          {isEditing ? "Editar Entregável" : "Novo Entregável"}
        </h4>
      </div>

      <div className="grid gap-3">
        <div>
          <Label htmlFor="nome-entregavel" className="text-azul/80 text-sm">Nome do Entregável</Label>
          <Input
            id="nome-entregavel"
            placeholder="Ex: Relatório Final"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="data-entrega" className="text-azul/80 text-sm">Data de Entrega</Label>
          <DatePicker
            value={formData.data}
            onChange={(date: Date | undefined) => date && setFormData({ ...formData, data: date })}
            minDate={tarefaDates.inicio}
            maxDate={tarefaDates.fim}
          />
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-azul hover:bg-azul/90 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {isEditing ? "Atualizar" : "Guardar"}
          </Button>
        </div>
      </div>
    </Card>
  );
}