import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Briefcase, X, Save } from "lucide-react";
import { type Prisma } from "@prisma/client";
import { toast } from "sonner";
import { TextField, TextareaField, DateField } from "@/components/projetos/criar/components/FormFields";

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
      <div className="mb-4 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-azul/80" />
        <h2 className="text-lg font-semibold text-azul/80">Detalhes do Workpackage</h2>
      </div>
      <div className="grid gap-4">
        <TextField
          label="Nome do Workpackage"
          value={nome}
          onChange={setNome}
          placeholder="Ex: Desenvolvimento de Software"
          required
          id="nome-wp"
        />

        <TextareaField
          label="Descrição"
          value={descricao}
          onChange={setDescricao}
          placeholder="Descreva o workpackage e seus objetivos..."
          id="descricao-wp"
          rows={4}
        />

        <div className="grid grid-cols-2 gap-4">
          <DateField
            label="Data de Início"
            value={inicio}
            onChange={(date) => date && setInicio(date)}
            minDate={projetoInicio}
            maxDate={projetoFim}
            required
            id="data-inicio-wp"
          />

          <DateField
            label="Data de Conclusão"
            value={fim}
            onChange={(date) => date && setFim(date)}
            minDate={inicio}
            maxDate={projetoFim}
            required
            id="data-fim-wp"
          />
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
