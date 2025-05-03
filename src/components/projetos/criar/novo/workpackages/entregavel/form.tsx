import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, X, Save } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { toast } from "sonner";
import { TextField, DateField } from "@/components/projetos/criar/components/FormFields";

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
  initialData,
}: EntregavelFormProps) {
  const [formData, setFormData] = useState({
    nome: initialData?.nome || "",
    data: initialData?.data || tarefaDates.fim,
  });

  // Título dinâmico com base em criação/edição
  const isEditing = !!initialData;

  const handleSubmit = () => {
    if (!formData.nome) {
      toast.error("O nome do entregável é obrigatório");
      return;
    }

    if (!formData.data) {
      toast.error("A data de entrega é obrigatória");
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
      descricao: null,
    });
  };

  return (
    <Card className="mt-2 border border-azul/10 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-azul/10">
          <FileText className="h-4 w-4 text-azul" />
        </div>
        <h4 className="text-base font-medium text-azul">
          {isEditing ? "Editar Entregável" : "Novo Entregável"}
        </h4>
      </div>

      <div className="grid gap-3">
        <TextField
          label="Nome do Entregável"
          value={formData.nome}
          onChange={(value) => setFormData({ ...formData, nome: value })}
          placeholder="Ex: Relatório Final"
          required
          id="nome-entregavel"
        />

        <DateField
          label="Data de Entrega"
          value={formData.data}
          onChange={(date) => {
            if (date) {
              // Ensure the date is within the task's date range
              if (date < tarefaDates.inicio) {
                setFormData({ ...formData, data: tarefaDates.inicio });
                toast.warning("Data ajustada para a data de início da tarefa");
              } else if (date > tarefaDates.fim) {
                setFormData({ ...formData, data: tarefaDates.fim });
                toast.warning("Data ajustada para a data de fim da tarefa");
              } else {
                setFormData({ ...formData, data: date });
              }
            }
          }}
          minDate={tarefaDates.inicio}
          maxDate={tarefaDates.fim}
          required
          id="data-entrega"
        />

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="bg-azul text-white hover:bg-azul/90">
            <Save className="mr-2 h-4 w-4" />
            {isEditing ? "Atualizar" : "Guardar"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
