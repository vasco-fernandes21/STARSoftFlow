import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Package, X, Save } from "lucide-react";
import { Prisma, Rubrica } from "@prisma/client";
import { toast } from "sonner";
import { DropdownField, NumberField } from "../../../components/FormFields";

interface MaterialFormProps {
  workpackageId: string;
  onSubmit: (workpackageId: string, material: Omit<Prisma.MaterialCreateInput, "workpackage">) => void;
  onCancel: () => void;
}

export function MaterialForm({ 
  workpackageId, 
  onSubmit, 
  onCancel 
}: MaterialFormProps) {
  const [formData, setFormData] = useState({
    nome: '',
    quantidade: 1,
    preco: '',
    ano_utilizacao: new Date().getFullYear(),
    rubrica: 'MATERIAIS' as Rubrica
  });

  const handleSubmit = () => {
    if (!formData.nome || formData.quantidade <= 0 || !formData.preco) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    onSubmit(workpackageId, {
      nome: formData.nome,
      quantidade: formData.quantidade,
      preco: Number(formData.preco.replace(',', '.')),
      ano_utilizacao: formData.ano_utilizacao,
      rubrica: formData.rubrica
    });
  };

  return (
    <Card className="p-4 border border-azul/10 shadow-sm bg-white/70 backdrop-blur-sm mt-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-azul/10 flex items-center justify-center">
          <Package className="h-4 w-4 text-azul" />
        </div>
        <h4 className="text-base font-medium text-azul">Novo Material</h4>
      </div>

      <div className="grid gap-3">
        <div>
          <Label htmlFor="nome-material" className="text-azul/80 text-sm">Nome do Material</Label>
          <Input
            id="nome-material"
            placeholder="Ex: Computador Portátil"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Quantidade"
            value={formData.quantidade}
            onChange={(value) => setFormData({ ...formData, quantidade: value })}
            min={1}
            id="quantidade-material"
            tooltip="Quantidade de unidades do material"
            required
          />
          
          <div>
            <Label htmlFor="valor-material" className="text-azul/80 text-sm">Preço Unitário (€)</Label>
            <Input
              id="valor-material"
              placeholder="Ex: 1200,00"
              value={formData.preco}
              onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Ano de Utilização"
            value={formData.ano_utilizacao}
            onChange={(value) => setFormData({ ...formData, ano_utilizacao: value })}
            min={new Date().getFullYear()}
            max={new Date().getFullYear() + 10}
            id="ano-material"
            tooltip="Ano em que o material será utilizado"
            required
          />
          
          <DropdownField
            label="Rubrica"
            value={formData.rubrica}
            onChange={(value) => setFormData({ ...formData, rubrica: value as Rubrica })}
            options={[
              { value: "MATERIAIS", label: "Materiais" },
              { value: "SERVICOS_TERCEIROS", label: "Serviços de Terceiros" },
              { value: "OUTROS_SERVICOS", label: "Outros Serviços" },
              { value: "DESLOCACAO_ESTADIAS", label: "Deslocação e Estadias" },
              { value: "OUTROS_CUSTOS", label: "Outros Custos" },
              { value: "CUSTOS_ESTRUTURA", label: "Custos de Estrutura" }
            ]}
            id="rubrica-material"
            tooltip="Categoria orçamental do material"
            required
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
            Guardar
          </Button>
        </div>
      </div>
    </Card>
  );
}