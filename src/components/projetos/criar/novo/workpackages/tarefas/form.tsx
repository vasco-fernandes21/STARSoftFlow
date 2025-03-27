import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { X, Save, Calendar } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { toast } from "sonner";
import type { TarefaWithRelations } from "../../../../types";

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
  initialData
}: TarefaFormProps) {
  const [formData, setFormData] = useState({
    nome: initialData?.nome || '',
    descricao: initialData?.descricao || '',
    inicio: initialData?.inicio ? new Date(initialData.inicio) : workpackageInicio || new Date(),
    fim: initialData?.fim ? new Date(initialData.fim) : workpackageFim || new Date(),
  });

  const handleSubmit = () => {
    if (!formData.nome) {
      toast.error("O nome da tarefa é obrigatório");
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
      estado: false
    });
  };

  return (
    <div className="p-4 border border-azul/10 rounded-lg bg-white/70 backdrop-blur-sm">
      <div className="grid gap-2.5">
        <div>
          <Label htmlFor="nome-tarefa" className="text-azul/80 text-xs">Nome da Tarefa</Label>
          <Input
            id="nome-tarefa"
            placeholder="Ex: Desenvolvimento do Frontend"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="mt-1 h-8 text-sm"
          />
        </div>
        
        <div>
          <Label htmlFor="descricao-tarefa" className="text-azul/80 text-xs">Descrição</Label>
          <Textarea
            id="descricao-tarefa"
            placeholder="Descreva a tarefa..."
            value={formData.descricao || ""}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            className="mt-1 min-h-[50px] text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3 w-3 text-azul/60" />
              <Label htmlFor="data-inicio" className="text-azul/80 text-xs">Data de Início</Label>
            </div>
            <DatePicker
              value={formData.inicio}
              onChange={(date) => date && setFormData({ ...formData, inicio: date })}
              minDate={workpackageInicio}
              maxDate={workpackageFim}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3 w-3 text-azul/60" />
              <Label htmlFor="data-fim" className="text-azul/80 text-xs">Data de Fim</Label>
            </div>
            <DatePicker
              value={formData.fim}
              onChange={(date) => date && setFormData({ ...formData, fim: date })}
              minDate={formData.inicio || workpackageInicio}
              maxDate={workpackageFim}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-1.5">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-7 text-xs border-azul/20 text-azul/70 hover:bg-azul/5"
          >
            <X className="h-3 w-3 mr-1.5" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="h-7 text-xs bg-azul hover:bg-azul/90 text-white"
          >
            <Save className="h-3 w-3 mr-1.5" />
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
