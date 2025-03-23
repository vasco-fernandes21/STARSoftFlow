import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Package, X, Save } from "lucide-react";
import { Prisma, Rubrica } from "@prisma/client";
import { toast } from "sonner";
import { DropdownField, NumberField } from "../../../components/FormFields";
import { TextField, TextareaField, MoneyField, SelectField } from "@/components/projetos/criar/components/FormFields";

interface MaterialData {
  nome: string;
  descricao?: string;
  preco: number;
  quantidade: number;
  ano_utilizacao: number;
  rubrica: Rubrica;
}

interface MaterialFormProps {
  workpackageId: string;
  initialValues?: MaterialData;
  onSubmit: (workpackageId: string, material: MaterialData) => void;
  onCancel: () => void;
  onUpdate?: () => void;
}

// Opções para o campo de rubrica
const rubricaOptions = [
  { value: "MATERIAIS", label: "Materiais" },
  { value: "SERVICOS_TERCEIROS", label: "Serviços de Terceiros" },
  { value: "OUTROS_SERVICOS", label: "Outros Serviços" },
  { value: "DESLOCACAO_ESTADIAS", label: "Deslocação e Estadias" },
  { value: "OUTROS_CUSTOS", label: "Outros Custos" },
  { value: "CUSTOS_ESTRUTURA", label: "Custos de Estrutura" },
];

export function Form({ 
  workpackageId, 
  initialValues, 
  onSubmit, 
  onCancel, 
  onUpdate 
}: MaterialFormProps) {
  // Estado do formulário
  const [nome, setNome] = useState(initialValues?.nome || "");
  const [descricao, setDescricao] = useState(initialValues?.descricao || "");
  const [preco, setPreco] = useState<number>(initialValues?.preco || 0);
  const [quantidade, setQuantidade] = useState(initialValues?.quantidade || 1);
  const [anoUtilizacao, setAnoUtilizacao] = useState(initialValues?.ano_utilizacao || new Date().getFullYear());
  const [rubrica, setRubrica] = useState<Rubrica>(initialValues?.rubrica || "MATERIAIS");
  
  // Estado de validação
  const [erros, setErros] = useState<{
    nome?: string;
    preco?: string;
    quantidade?: string;
    anoUtilizacao?: string;
  }>({});
  
  // Atualizar estados quando initialValues mudar
  useEffect(() => {
    if (initialValues) {
      setNome(initialValues.nome);
      setDescricao(initialValues.descricao || "");
      setPreco(initialValues.preco);
      setQuantidade(initialValues.quantidade);
      setAnoUtilizacao(initialValues.ano_utilizacao);
      setRubrica(initialValues.rubrica);
    }
  }, [initialValues]);
  
  // Função para validar o formulário
  const validarFormulario = () => {
    const novosErros: typeof erros = {};
    
    if (!nome.trim()) {
      novosErros.nome = "O nome é obrigatório";
    }
    
    if (preco <= 0) {
      novosErros.preco = "O preço deve ser maior que zero";
    }
    
    if (quantidade <= 0) {
      novosErros.quantidade = "A quantidade deve ser maior que zero";
    }
    
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };
  
  // Função para lidar com o envio do formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validarFormulario()) {
      onSubmit(workpackageId, {
        nome,
        descricao: descricao || undefined,
        preco,
        quantidade,
        ano_utilizacao: anoUtilizacao,
        rubrica
      });
      
      if (onUpdate) {
        onUpdate();
      }
    }
  };
  
  return (
    <Card className="p-4 border border-azul/10 shadow-sm bg-white/70 backdrop-blur-sm mt-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-azul/10 flex items-center justify-center">
          <Package className="h-4 w-4 text-azul" />
        </div>
        <h4 className="text-base font-medium text-azul">Novo Material</h4>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Nome do Material"
          value={nome}
          onChange={setNome}
          placeholder="Ex: Servidor para processamento de dados"
          required
          helpText={erros.nome}
        />
        
        <TextareaField
          label="Descrição"
          value={descricao}
          onChange={setDescricao}
          placeholder="Descreva o material em detalhes..."
          rows={3}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MoneyField
            label="Preço Unitário"
            value={preco}
            onChange={(value) => value !== null && setPreco(value)}
            required
            helpText={erros.preco}
          />
          
          <NumberField
            label="Quantidade"
            value={quantidade}
            onChange={setQuantidade}
            min={1}
            required
            helpText={erros.quantidade}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField
            label="Ano de Utilização"
            value={anoUtilizacao}
            onChange={setAnoUtilizacao}
            min={2000}
            max={2100}
            required
            helpText={erros.anoUtilizacao}
          />
          
          <SelectField
            label="Rubrica"
            value={rubrica}
            onChange={(value) => setRubrica(value as Rubrica)}
            options={rubricaOptions}
            required
          />
        </div>
        
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button type="submit" className="bg-azul hover:bg-azul/90 text-white">
            {initialValues ? "Atualizar Material" : "Adicionar Material"}
          </Button>
        </div>
      </form>
    </Card>
  );
}