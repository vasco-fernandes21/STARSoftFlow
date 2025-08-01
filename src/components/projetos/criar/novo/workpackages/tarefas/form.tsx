import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Save } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { toast } from "sonner";
import type { TarefaWithRelations } from "../../../../types";
import { TextField, TextareaField, DateField } from "@/components/projetos/criar/components/FormFields";

interface TarefaFormProps {
  workpackageId: string;
  workpackageInicio: Date;
  workpackageFim: Date;
  onSubmit: (workpackageId: string, tarefa: Omit<Prisma.TarefaCreateInput, "workpackage">) => void;
  onCancel: () => void;
  initialData?: Partial<TarefaWithRelations>;
}

export function TarefaForm({
  workpackageId,
  workpackageInicio,
  workpackageFim,
  onSubmit,
  onCancel,
  initialData,
}: TarefaFormProps) {
  const [formData, setFormData] = useState({
    nome: initialData?.nome || "",
    descricao: initialData?.descricao || "",
    inicio: initialData?.inicio ? new Date(initialData.inicio) : workpackageInicio || new Date(),
    fim: initialData?.fim ? new Date(initialData.fim) : workpackageFim || new Date(),
  });

  const handleSubmit = () => {
    if (!formData.nome) {
      toast.error("O nome da tarefa é obrigatório");
      return;
    }

    if (!formData.inicio || !formData.fim) {
      toast.error("As datas de início e fim são obrigatórias");
      return;
    }

    if (formData.fim < formData.inicio) {
      toast.error("A data de fim não pode ser anterior à data de início");
      return;
    }

    if (formData.inicio < workpackageInicio) {
      toast.error("A data de início não pode ser anterior à data de início do workpackage");
      return;
    }

    if (formData.fim > workpackageFim) {
      toast.error("A data de fim não pode ser posterior à data de fim do workpackage");
      return;
    }

    onSubmit(workpackageId, {
      nome: formData.nome,
      descricao: formData.descricao,
      inicio: formData.inicio,
      fim: formData.fim,
      estado: false,
    });
  };

  return (
    <div className="rounded-lg border border-azul/10 bg-white/70 p-4 backdrop-blur-sm">
      <div className="grid gap-2.5">
        <TextField
          label="Nome da Tarefa"
          value={formData.nome}
          onChange={(value) => setFormData({ ...formData, nome: value })}
          placeholder="Ex: Desenvolvimento do Frontend"
          required
          id="nome-tarefa"
        />

        <TextareaField
          label="Descrição"
          value={formData.descricao}
          onChange={(value) => setFormData({ ...formData, descricao: value })}
          placeholder="Descreva a tarefa..."
          id="descricao-tarefa"
          rows={3}
        />

        <div className="grid grid-cols-2 gap-3">
          <DateField
            label="Data de Início"
            value={formData.inicio}
            onChange={(date) => {
              if (date) {
                // Adjust fim if it's before the new inicio
                if (formData.fim && date > formData.fim) {
                  setFormData({ ...formData, inicio: date, fim: date });
                } else {
                  setFormData({ ...formData, inicio: date });
                }
              }
            }}
            minDate={workpackageInicio}
            maxDate={workpackageFim}
            required
            id="data-inicio"
          />

          <DateField
            label="Data de Fim"
            value={formData.fim}
            onChange={(date) => {
              if (date) {
                // Adjust inicio if it's after the new fim
                if (formData.inicio && date < formData.inicio) {
                  setFormData({ ...formData, inicio: date, fim: date });
                } else {
                  setFormData({ ...formData, fim: date });
                }
              }
            }}
            minDate={formData.inicio || workpackageInicio}
            maxDate={workpackageFim}
            required
            id="data-fim"
          />
        </div>

        <div className="mt-1.5 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-7 border-azul/20 text-xs text-azul/70 hover:bg-azul/5"
          >
            <X className="mr-1.5 h-3 w-3" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="h-7 bg-azul text-xs text-white hover:bg-azul/90"
          >
            <Save className="mr-1.5 h-3 w-3" />
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
