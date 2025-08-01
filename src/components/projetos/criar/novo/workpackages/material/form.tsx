import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Plus, Pencil, X, Percent, Briefcase } from "lucide-react";
import type { Rubrica } from "@prisma/client";
import {
  TextField,
  TextareaField,
  MoneyField,
  SelectField,
  NumberField,
  IntegerField,
} from "@/components/projetos/criar/components/FormFields";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

interface MaterialData {
  nome: string;
  descricao: string | null;
  preco: number;
  quantidade: number;
  ano_utilizacao: number;
  mes: number;
  rubrica: Rubrica;
  id?: number;
}

interface MaterialFormProps {
  workpackageId: string;
  workpackageDates?: {
    inicio?: Date | string | null;
    fim?: Date | string | null;
  };
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
  { value: "DESLOCACAO_ESTADAS", label: "Deslocação e Estadas" },
  { value: "OUTROS_CUSTOS", label: "Outros Custos" },
  { value: "CUSTOS_ESTRUTURA", label: "Custos de Estrutura" },
  { value: "INSTRUMENTOS_E_EQUIPAMENTOS", label: "Instrumentos e Equipamentos" },
  { value: "SUBCONTRATOS", label: "Subcontratos" },
];

// Opções para o campo de mês
const mesesOptions = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export function Form({
  workpackageId,
  workpackageDates,
  initialValues,
  onSubmit,
  onCancel,
  onUpdate,
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
    ).map((ano) => ({
      value: String(ano), // Converter para string para compatibilidade com SelectField
      label: ano.toString(),
    }));

    return { anoMinimo, anoMaximo, anosDisponiveis };
  }, [workpackageDates]);

  // Estado do formulário
  const [nome, setNome] = useState(initialValues?.nome || "");
  const [descricao, setDescricao] = useState<string | null>(initialValues?.descricao || null);
  const [preco, setPreco] = useState<number | null>(initialValues?.preco || null);
  const [quantidade, setQuantidade] = useState<number | null>(initialValues?.quantidade || null);
  const [anoUtilizacao, setAnoUtilizacao] = useState(
    initialValues?.ano_utilizacao || new Date().getFullYear()
  );
  const [mes, setMes] = useState(
    initialValues?.mes || new Date().getMonth() + 1
  );
  const [rubrica, setRubrica] = useState<Rubrica>(initialValues?.rubrica || "MATERIAIS");

  // Estado para o valor do ano como string (para o SelectField)
  const [anoUtilizacaoStr, setAnoUtilizacaoStr] = useState(String(anoUtilizacao));
  const [mesStr, setMesStr] = useState(String(mes));

  // Sincronizar o anoUtilizacao com anoUtilizacaoStr
  useEffect(() => {
    setAnoUtilizacaoStr(String(anoUtilizacao));
  }, [anoUtilizacao]);

  // Sincronizar o mes com mesStr
  useEffect(() => {
    setMesStr(String(mes));
  }, [mes]);

  // Estado de validação
  const [erros, setErros] = useState<{
    nome?: string;
    preco?: string;
    quantidade?: string;
    anoUtilizacao?: string;
    mes?: string;
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
      setMes(initialValues.mes || new Date().getMonth() + 1);
      setMesStr(String(initialValues.mes || new Date().getMonth() + 1));
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

    if (!preco || preco <= 0) {
      novosErros.preco = "O preço deve ser maior que zero";
    }

    if (!quantidade || quantidade <= 0) {
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
      if (!preco || preco <= 0) {
        setErros((prev) => ({ ...prev, preco: 'O preço deve ser maior que zero' }));
        return;
      }
      if (!quantidade || quantidade <= 0) {
        setErros((prev) => ({ ...prev, quantidade: 'A quantidade deve ser maior que zero' }));
        return;
      }
      const materialData = {
        nome,
        descricao: descricao === '' ? null : descricao,
        preco,
        quantidade,
        ano_utilizacao: anoUtilizacao,
        mes,
        rubrica,
        id: initialValues?.id,
      };
      onSubmit(workpackageId, materialData);
      if (onUpdate) { onUpdate(); }
    }
  };

  // Handler para alteração do ano via dropdown
  const handleAnoChange = (value: string) => {
    const anoNumerico = parseInt(value, 10);
    setAnoUtilizacaoStr(value);
    setAnoUtilizacao(anoNumerico);
  };

  // Handler para alteração do mês via dropdown
  const handleMesChange = (value: string) => {
    const mesNumerico = parseInt(value, 10);
    setMesStr(value);
    setMes(mesNumerico);
  };

  // Identificar se estamos em modo de edição
  const _isEditMode = !!initialValues?.id;

  return (
    <Card className="w-full overflow-hidden border-azul/10 transition-all hover:border-azul/20">
      {/* Cabeçalho do Form */}
      <div className="flex items-center justify-between border-b border-azul/10 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-azul/10">
            {_isEditMode ? (
              <Pencil className="h-4 w-4 text-azul" />
            ) : (
              <Package className="h-4 w-4 text-azul" />
            )}
          </div>
          <div>
            <h5 className="text-sm font-medium text-azul">
              {_isEditMode ? "Editar Material" : "Adicionar Material"}
            </h5>
            <Badge
              variant="outline"
              className="h-5 border-azul/20 bg-azul/5 px-2 py-0 text-[10px] text-azul/80"
            >
              {_isEditMode ? "Edição" : "Novo"}
            </Badge>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 rounded-lg p-0 hover:bg-red-50 hover:text-red-500"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Conteúdo do Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-6 bg-azul/5 p-4">
        {/* Informações Básicas */}
        <div className="w-full space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-azul/10">
              <Package className="h-3.5 w-3.5 text-azul" />
            </div>
            <Label className="text-sm font-medium text-azul/80">Informações Básicas</Label>
          </div>

          <div className="w-full space-y-4 rounded-lg border border-azul/10 bg-white p-4">
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
        <div className="w-full space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-azul/10">
              <Percent className="h-3.5 w-3.5 text-azul" />
            </div>
            <Label className="text-sm font-medium text-azul/80">Informações Financeiras</Label>
          </div>

          <div className="w-full rounded-lg border border-azul/10 bg-white p-4">
            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
              <MoneyField
                label="Preço Unitário"
                value={preco}
                onChange={setPreco}
                tooltip="Preço unitário do material em euros (€), com até 3 casas decimais"
                required
                helpText={erros.preco}
              />

              <IntegerField
                label="Quantidade"
                value={quantidade}
                onChange={setQuantidade}
                step={1}
                required
                helpText={erros.quantidade}
                tooltip="Quantidade inteira, maior ou igual a zero"
              />
            </div>
          </div>
        </div>

        {/* Classificação */}
        <div className="w-full space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-azul/10">
              <Briefcase className="h-3.5 w-3.5 text-azul" />
            </div>
            <Label className="text-sm font-medium text-azul/80">Classificação</Label>
          </div>

          <div className="w-full rounded-lg border border-azul/10 bg-white p-4">
            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
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
                label="Mês"
                value={mesStr}
                onChange={handleMesChange}
                options={mesesOptions}
                required
                helpText={erros.mes}
              />

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
        <div className="flex justify-end gap-3 border-t border-azul/10 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-9 rounded-lg px-6"
          >
            Cancelar
          </Button>
          <Button type="submit" className="h-9 rounded-lg bg-azul px-6 hover:bg-azul/90">
            {initialValues?.id ? (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Alterações
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Material
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
