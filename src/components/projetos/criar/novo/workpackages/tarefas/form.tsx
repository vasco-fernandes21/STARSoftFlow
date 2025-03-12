import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Clock, X, Save } from "lucide-react";
import { Prisma } from "@prisma/client";
import { toast } from "sonner";
import { TarefaWithRelations } from "../../../types";

interface TarefaFormProps {
  workpackageId: string;
  onSubmit: (workpackageId: string, tarefa: Omit<Prisma.TarefaCreateInput, "workpackage">) => void;
  onCancel: () => void;
  initialData?: Partial<TarefaWithRelations>;
}

export function TarefaForm({ 
  workpackageId, 
  onSubmit, 
  onCancel, 
  initialData 
}: TarefaFormProps) {
  const [formData, setFormData] = useState({
    nome: initialData?.nome || '',
    descricao: initialData?.descricao || '',
    inicio: initialData?.inicio ? new Date(initialData.inicio) : new Date(),
    fim: initialData?.fim ? new Date(initialData.fim) : new Date(),
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

    onSubmit(workpackageId, {
      nome: formData.nome,
      descricao: formData.descricao,
      inicio: formData.inicio,
      fim: formData.fim,
      estado: false
    });
  };

  return (
    <Card className="p-4 border border-azul/10 shadow-sm bg-white/70 backdrop-blur-sm mt-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-azul/10 flex items-center justify-center">
          <Clock className="h-4 w-4 text-azul" />
        </div>
        <h4 className="text-base font-medium text-azul">
          {initialData?.id ? "Editar Tarefa" : "Nova Tarefa"}
        </h4>
      </div>

      <div className="grid gap-3">
        <div>
          <Label htmlFor="nome-tarefa" className="text-azul/80 text-sm">Nome da Tarefa</Label>
          <Input
            id="nome-tarefa"
            placeholder="Ex: Desenvolvimento do Frontend"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="descricao-tarefa" className="text-azul/80 text-sm">Descrição</Label>
          <Textarea
            id="descricao-tarefa"
            placeholder="Descreva a tarefa..."
            value={formData.descricao || ""}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            className="mt-1 min-h-[60px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="data-inicio" className="text-azul/80 text-sm">Data de Início</Label>
            <DatePicker
              value={formData.inicio}
              onChange={(date) => date && setFormData({ ...formData, inicio: date })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="data-fim" className="text-azul/80 text-sm">Data de Fim</Label>
            <DatePicker
              value={formData.fim}
              onChange={(date) => date && setFormData({ ...formData, fim: date })}
              className="mt-1"
            />
          </div>
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
            Guardar
          </Button>
        </div>
      </div>
    </Card>
  );
}
