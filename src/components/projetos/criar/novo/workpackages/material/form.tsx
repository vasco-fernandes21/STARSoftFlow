import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Plus, Pencil, X, Percent, Briefcase } from "lucide-react";
import type { Rubrica } from "@prisma/client";
import { TextField, TextareaField, MoneyField, SelectField, NumberField } from "@/components/projetos/criar/components/FormFields";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

interface MaterialData {
  nome: string;
  descricao: string | null;
  preco: number;
  quantidade: number;
  ano_utilizacao: number;
  rubrica: Rubrica;
}

interface MaterialFormProps {
  workpackageId: string;
  workpackageDates?: {
    inicio?: Date | string | null;
    fim?: Date | string | null;
  };
  initialValues?: MaterialData & { id?: number };
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
  workpackageDates,
  initialValues, 
  onSubmit, 
  onCancel, 
  onUpdate 
}: MaterialFormProps) {
  // Calcular os anos válidos com base nas datas do workpackage
  const { anoMinimo, anoMaximo, anosDisponiveis } = useMemo(() => {
    const dataAtual = new Date();
    const anoAtual = dataAtual.getFullYear();
    
    let anoMinimo = anoAtual;
    let anoMaximo = anoAtual + 10; // valor padrão se não houver datas
    
    // Se tiver datas do workpackage, usa essas datas para limitar os anos
    if (workpackageDates) {
      if (workpackageDates.inicio) {
        const dataInicio = new Date(workpackageDates.inicio);
        anoMinimo = dataInicio.getFullYear();
      }
      
      if (workpackageDates.fim) {
        const dataFim = new Date(workpackageDates.fim);
        anoMaximo = dataFim.getFullYear();
      }
    }
    
    // Garantir que pelo menos o ano atual esteja disponível
    anoMinimo = Math.min(anoMinimo, anoAtual);
    anoMaximo = Math.max(anoMaximo, anoAtual);
    
    // Criar lista de anos para possível dropdown - convertendo para string para compatibilidade
    const anosDisponiveis = Array.from(
      { length: anoMaximo - anoMinimo + 1 },
      (_, i) => anoMinimo + i
    ).map(ano => ({
      value: String(ano), // Converter para string para compatibilidade com SelectField
      label: ano.toString()
    }));
    
    return { anoMinimo, anoMaximo, anosDisponiveis };
  }, [workpackageDates]);
  
  // Estado do formulário
  const [nome, setNome] = useState(initialValues?.nome || "");
  const [descricao, setDescricao] = useState<string | null>(initialValues?.descricao || null);
  const [preco, setPreco] = useState<number>(initialValues?.preco || 0);
  const [quantidade, setQuantidade] = useState(initialValues?.quantidade || 1);
  const [anoUtilizacao, setAnoUtilizacao] = useState(initialValues?.ano_utilizacao || new Date().getFullYear());
  const [rubrica, setRubrica] = useState<Rubrica>(initialValues?.rubrica || "MATERIAIS");
  
  // Estado para o valor do ano como string (para o SelectField)
  const [anoUtilizacaoStr, setAnoUtilizacaoStr] = useState(String(anoUtilizacao));
  
  // Sincronizar o anoUtilizacao com anoUtilizacaoStr
  useEffect(() => {
    setAnoUtilizacaoStr(String(anoUtilizacao));
  }, [anoUtilizacao]);
  
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
      setDescricao(initialValues.descricao);
      setPreco(initialValues.preco);
      setQuantidade(initialValues.quantidade);
      setAnoUtilizacao(initialValues.ano_utilizacao);
      setAnoUtilizacaoStr(String(initialValues.ano_utilizacao));
      setRubrica(initialValues.rubrica);
    }
  }, [initialValues]);
  
  // Garantir que o anoUtilizacao esteja dentro dos limites
  useEffect(() => {
    if (anoUtilizacao < anoMinimo) {
      setAnoUtilizacao(anoMinimo);
      setAnoUtilizacaoStr(String(anoMinimo));
    } else if (anoUtilizacao > anoMaximo) {
      setAnoUtilizacao(anoMaximo);
      setAnoUtilizacaoStr(String(anoMaximo));
    }
  }, [anoMinimo, anoMaximo, anoUtilizacao]);
  
  // Função para validar o formulário
  const validarFormulario = () => {
    const novosErros: typeof erros = {};
    
    if (!nome.trim()) {
      novosErros.nome = "O nome é obrigatório";
    } else if (nome.length < 3) {
      novosErros.nome = "Nome deve ter pelo menos 3 caracteres";
    }
    
    if (preco <= 0) {
      novosErros.preco = "O preço deve ser maior que zero";
    }
    
    if (quantidade <= 0) {
      novosErros.quantidade = "A quantidade deve ser maior que zero";
    }
    
    if (anoUtilizacao < anoMinimo || anoUtilizacao > anoMaximo) {
      novosErros.anoUtilizacao = `O ano deve estar entre ${anoMinimo} e ${anoMaximo}`;
    }
    
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };
  
  // Função para lidar com o envio do formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validarFormulario()) {
      // Preparar o objeto de dados garantindo que descricao seja sempre string ou null
      const materialData = {
        // Se estiver em modo de edição, manter o ID existente se disponível
        ...(initialValues?.id && { id: initialValues.id }),
        nome,
        descricao: descricao === "" ? null : descricao,
        preco,
        quantidade,
        ano_utilizacao: anoUtilizacao,
        rubrica
      };
      
      // Enviar dados para atualização
      onSubmit(workpackageId, materialData);
      
      if (onUpdate) {
        onUpdate();
      }
    }
  };
  
  // Handler para alteração do ano via dropdown
  const handleAnoChange = (value: string) => {
    const anoNumerico = parseInt(value, 10);
    setAnoUtilizacaoStr(value);
    setAnoUtilizacao(anoNumerico);
  };

  // Identificar se estamos em modo de edição
  const _isEditMode = !!initialValues?.id;

  return (
    <Card className="border-azul/10 hover:border-azul/20 transition-all overflow-hidden w-full">
      {/* Cabeçalho do Form */}
      <div className="p-4 flex justify-between items-center border-b border-azul/10 bg-white">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-azul/10 flex items-center justify-center">
            {_isEditMode ? 
              <Pencil className="h-4 w-4 text-azul" /> : 
              <Package className="h-4 w-4 text-azul" />
            }
          </div>
          <div>
            <h5 className="text-sm font-medium text-azul">
              {_isEditMode ? "Editar Material" : "Adicionar Material"}
            </h5>
            <Badge variant="outline" className="px-2 py-0 text-[10px] h-5 bg-azul/5 text-azul/80 border-azul/20">
              {_isEditMode ? "Edição" : "Novo"}
            </Badge>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-500"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Conteúdo do Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-azul/5 space-y-6 w-full">
        {/* Informações Básicas */}
        <div className="space-y-3 w-full">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-azul/10 flex items-center justify-center">
              <Package className="h-3.5 w-3.5 text-azul" />
            </div>
            <Label className="text-sm font-medium text-azul/80">
              Informações Básicas
            </Label>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-azul/10 space-y-4 w-full">
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
              value={descricao || ""}
              onChange={(value) => setDescricao(value === "" ? null : value)}
              placeholder="Descreva o material em detalhes..."
              rows={3}
            />
          </div>
        </div>

        {/* Informações Financeiras */}
        <div className="space-y-3 w-full">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-azul/10 flex items-center justify-center">
              <Percent className="h-3.5 w-3.5 text-azul" />
            </div>
            <Label className="text-sm font-medium text-azul/80">
              Informações Financeiras
            </Label>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-azul/10 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
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
          </div>
        </div>

        {/* Classificação */}
        <div className="space-y-3 w-full">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-azul/10 flex items-center justify-center">
              <Briefcase className="h-3.5 w-3.5 text-azul" />
            </div>
            <Label className="text-sm font-medium text-azul/80">
              Classificação
            </Label>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-azul/10 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {anosDisponiveis.length > 0 ? (
                <SelectField
                  label="Ano de Utilização"
                  value={anoUtilizacaoStr}
                  onChange={handleAnoChange}
                  options={anosDisponiveis}
                  required
                  helpText={erros.anoUtilizacao}
                />
              ) : (
                <NumberField
                  label="Ano de Utilização"
                  value={anoUtilizacao}
                  onChange={setAnoUtilizacao}
                  min={anoMinimo}
                  max={anoMaximo}
                  required
                  helpText={erros.anoUtilizacao}
                />
              )}
              
              <SelectField
                label="Rubrica"
                value={rubrica}
                onChange={(value) => setRubrica(value as Rubrica)}
                options={rubricaOptions}
                required
              />
            </div>
          </div>
        </div>
        
        {/* Botões de ação */}
        <div className="flex justify-end gap-3 pt-4 border-t border-azul/10">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-9 px-6 rounded-lg"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            className="h-9 px-6 rounded-lg bg-azul hover:bg-azul/90"
          >
            {_isEditMode ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Alterações
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Material
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}