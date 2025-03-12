import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { type Prisma } from "@prisma/client";
import { Briefcase, Calendar, X, Save } from "lucide-react";
import { toast } from "sonner";

type WorkpackageFormProps = {
  onSubmit: (workpackage: Omit<Prisma.WorkpackageCreateInput, "projeto">) => void;
  onCancel: () => void;
  initialData?: {
    nome?: string;
    descricao?: string;
    inicio?: Date;
    fim?: Date;
  };
  projetoInicio?: Date; 
  projetoFim?: Date;
};

export function WorkpackageForm({ 
  onSubmit, 
  onCancel,
  initialData,
  projetoInicio,
  projetoFim
}: WorkpackageFormProps) {
  const [formData, setFormData] = useState({
    nome: initialData?.nome || '',
    descricao: initialData?.descricao || '',
    inicio: initialData?.inicio || projetoInicio,
    fim: initialData?.fim || projetoFim
  });

  const handleSubmit = () => {
    if (!formData.nome) {
      toast.error("O nome do workpackage é obrigatório");
      return;
    }

    onSubmit({
      nome: formData.nome,
      descricao: formData.descricao,
      inicio: formData.inicio,
      fim: formData.fim
    });
  };

  return (
    <Card className="p-6 border border-azul/10 shadow-sm bg-white/70 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-azul/10 flex items-center justify-center">
          <Briefcase className="h-5 w-5 text-azul" />
        </div>
        <h3 className="text-lg font-medium text-azul">
          {initialData ? "Editar Workpackage" : "Novo Workpackage"}
        </h3>
      </div>

      <div className="grid gap-4">
        <div>
          <Label htmlFor="nome-wp" className="text-azul/80">Nome do Workpackage</Label>
          <Input
            id="nome-wp"
            placeholder="Ex: Desenvolvimento de Software"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="mt-1.5"
          />
        </div>
        
        <div>
          <Label htmlFor="descricao-wp" className="text-azul/80">Descrição</Label>
          <Textarea
            id="descricao-wp"
            placeholder="Descreva o workpackage e seus objetivos..."
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            className="mt-1.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar className="h-4 w-4 text-azul/60" />
              <Label htmlFor="data-inicio-wp" className="text-azul/80">Data de Início</Label>
            </div>
            <DatePicker
              value={formData.inicio}
              onChange={(date) => setFormData({ ...formData, inicio: date })}
              minDate={projetoInicio}
              maxDate={projetoFim}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar className="h-4 w-4 text-azul/60" />
              <Label htmlFor="data-fim-wp" className="text-azul/80">Data de Conclusão</Label>
            </div>
            <DatePicker
              value={formData.fim}
              onChange={(date) => setFormData({ ...formData, fim: date })}
              minDate={formData.inicio || projetoInicio}
              maxDate={projetoFim}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-azul/20 text-azul/70 hover:bg-azul/5"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="button"
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