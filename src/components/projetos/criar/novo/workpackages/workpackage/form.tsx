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
  projetoInicio: Date;
  projetoFim: Date;
};

export function WorkpackageForm({
  onSubmit,
  onCancel,
  initialData,
  projetoInicio,
  projetoFim,
}: WorkpackageFormProps) {
  const [nome, setNome] = useState(initialData?.nome || "");
  const [descricao, setDescricao] = useState(initialData?.descricao || "");
  const [inicio, setInicio] = useState<Date>(initialData?.inicio || projetoInicio || new Date());
  const [fim, setFim] = useState<Date>(initialData?.fim || projetoFim || new Date());

  const handleSubmit = () => {
    if (!nome.trim()) {
      toast.error("O nome do workpackage é obrigatório");
      return;
    }

    onSubmit({
      nome,
      descricao: descricao || null,
      inicio,
      fim,
    });
  };

  return (
    <Card className="border border-azul/10 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-azul/10">
          <Briefcase className="h-5 w-5 text-azul" />
        </div>
        <h3 className="text-lg font-medium text-azul">
          {initialData ? "Editar Workpackage" : "Novo Workpackage"}
        </h3>
      </div>

      <div className="grid gap-4">
        <div>
          <Label htmlFor="nome-wp" className="text-azul/80">
            Nome do Workpackage
          </Label>
          <Input
            id="nome-wp"
            placeholder="Ex: Desenvolvimento de Software"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="descricao-wp" className="text-azul/80">
            Descrição
          </Label>
          <Textarea
            id="descricao-wp"
            placeholder="Descreva o workpackage e seus objetivos..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-azul/60" />
              <Label htmlFor="data-inicio-wp" className="text-azul/80">
                Data de Início
              </Label>
            </div>
            <DatePicker
              value={inicio}
              onChange={(date) => date && setInicio(date)}
              minDate={projetoInicio}
              maxDate={projetoFim}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-azul/60" />
              <Label htmlFor="data-fim-wp" className="text-azul/80">
                Data de Conclusão
              </Label>
            </div>
            <DatePicker
              value={fim}
              onChange={(date) => date && setFim(date)}
              minDate={inicio}
              maxDate={projetoFim}
            />
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-azul/20 text-azul/70 hover:bg-azul/5"
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="bg-azul text-white hover:bg-azul/90"
          >
            <Save className="mr-2 h-4 w-4" />
            Guardar
          </Button>
        </div>
      </div>
    </Card>
  );
}
