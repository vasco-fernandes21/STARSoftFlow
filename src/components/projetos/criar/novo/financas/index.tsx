import { useProjetoForm } from "../../ProjetoFormContext";
import { TabNavigation } from "../../components/TabNavigation";
import { MoneyField, PercentageField, IntegerPercentageField } from "../../components/FormFields";
import { api } from "@/trpc/react";
import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GerirFinanciamentosModal } from "./GerirFinanciamentosModal";
import { Decimal } from "decimal.js";
import { DropdownField } from "../../components/FormFields";

// Tipo para o que vem da API
type FinanciamentoAPI = {
  id: number;
  nome: string;
  overhead: string;
  taxa_financiamento: string;
  valor_eti: string;
};

// Tipo para os dados formatados
type FinanciamentoInterno = {
  id: number;
  nome: string;
  overhead: Decimal;
  taxa_financiamento: Decimal;
  valor_eti: Decimal;
};

// Tipo para a resposta da API
type FinanciamentoResponse = {
  items: FinanciamentoAPI[];
  total: number;
};

interface FinancasTabProps {
  onNavigateForward: () => void;
  onNavigateBack: () => void;
}

export function FinancasTab({ onNavigateForward, onNavigateBack }: FinancasTabProps) {
  const { state, dispatch } = useProjetoForm();
  const [modalAberto, setModalAberto] = useState(false);
  const [localValues, setLocalValues] = useState({
    overhead: state.overhead?.toString() ?? '',
    taxa_financiamento: state.taxa_financiamento?.toString() ?? '',
    valor_eti: state.valor_eti?.toString() ?? ''
  });

  const { data: financiamentosResponse } = api.financiamento.findAll.useQuery({
    limit: 100,
  }) as { data: FinanciamentoResponse | undefined };

  const financiamentos = (financiamentosResponse?.items || []).map((f) => ({
    ...f,
    overhead: new Decimal(f.overhead),
    taxa_financiamento: new Decimal(f.taxa_financiamento),
    valor_eti: new Decimal(f.valor_eti),
  })) as FinanciamentoInterno[];

  const handleOverheadChange = (value: number | null) => {
    dispatch({
      type: "SET_FIELD",
      field: "overhead",
      value: value ?? 0,
    });
  };

  const handleTaxaFinanciamentoChange = (value: number | null) => {
    console.log("handleTaxaFinanciamentoChange recebeu:", value);
    
    // Se o valor for null, definimos como null no estado (em vez de 0)
    const validValue = value === null ? null : value;
    
    dispatch({
      type: "SET_FIELD",
      field: "taxa_financiamento",
      value: validValue,
    });
  };

  const handleValorEtiChange = (value: number | null) => {
    dispatch({
      type: "SET_FIELD",
      field: "valor_eti",
      value: value ?? 0,
    });
  };

  const handleFinanciamentoSelect = (value: string) => {
    const selectedFinanciamento = financiamentos.find((f) => f.id === parseInt(value));

    if (selectedFinanciamento) {
      dispatch({
        type: "SET_FIELD",
        field: "financiamentoId",
        value: selectedFinanciamento.id,
      });

      dispatch({
        type: "SET_FIELD",
        field: "overhead",
        value: Number(selectedFinanciamento.overhead.toFixed(2)),
      });

      dispatch({
        type: "SET_FIELD",
        field: "taxa_financiamento",
        value: Number(selectedFinanciamento.taxa_financiamento.toFixed(2)),
      });

      dispatch({
        type: "SET_FIELD",
        field: "valor_eti",
        value: Number(selectedFinanciamento.valor_eti.toFixed(2)),
      });
    }
  };

  const handleFinanciamentoCriado = (financiamento: FinanciamentoAPI) => {
    const financiamentoInterno: FinanciamentoInterno = {
      id: financiamento.id,
      nome: financiamento.nome,
      overhead: new Decimal(financiamento.overhead),
      taxa_financiamento: new Decimal(financiamento.taxa_financiamento),
      valor_eti: new Decimal(financiamento.valor_eti),
    };

    dispatch({
      type: "SET_FIELD",
      field: "financiamentoId",
      value: financiamentoInterno.id,
    });

    dispatch({
      type: "SET_FIELD",
      field: "overhead",
      value: financiamentoInterno.overhead,
    });

    dispatch({
      type: "SET_FIELD",
      field: "taxa_financiamento",
      value: financiamentoInterno.taxa_financiamento,
    });

    dispatch({
      type: "SET_FIELD",
      field: "valor_eti",
      value: financiamentoInterno.valor_eti,
    });
  };

  const isValid = Boolean(state.financiamentoId);

  return (
    <div className="space-y-8 p-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Coluna da Esquerda - Seleção de Financiamento */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <DropdownField
              label="Tipos de Financiamento"
              value={state.financiamentoId?.toString() ?? ""}
              onChange={handleFinanciamentoSelect}
              options={financiamentos.map((f) => ({
                value: f.id.toString(),
                label: f.nome,
              }))}
              required
              tooltip="Selecione o tipo de financiamento para o projeto"
              id="tipo-financiamento"
              placeholder="Selecione um tipo de financiamento"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalAberto(true)}
              className="mt-2 self-end text-azul/80 hover:bg-azul/5 hover:text-azul"
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Gerir Tipos de Financiamento
            </Button>
          </div>
        </div>

        {/* Coluna da Direita - Valores */}
        <div className="flex flex-col gap-6">
          <PercentageField
            label="Custos Indiretos"
            value={state.overhead ? Number(state.overhead) : null}
            onChange={handleOverheadChange}
            required
            tooltip="Percentagem de overhead aplicada ao projeto (valor entre 0 e 100 com 2 casas decimais)"
            id="overhead"
          />

          <IntegerPercentageField
            label="Taxa de Financiamento"
            value={state.taxa_financiamento !== null && state.taxa_financiamento !== undefined ? Number(state.taxa_financiamento) : null}
            onChange={handleTaxaFinanciamentoChange}
            required
            tooltip="Taxa de financiamento do projeto (valor inteiro entre 0 e 100)"
            id="taxa-financiamento"
          />

          <MoneyField
            label="Valor ETI"
            value={state.valor_eti ? Number(state.valor_eti) : null}
            onChange={handleValorEtiChange}
            required
            tooltip="Valor do ETI (Equivalente a Tempo Integral)"
            id="valor-eti"
          />
        </div>
      </div>

      <TabNavigation
        onNext={onNavigateForward}
        onBack={onNavigateBack}
        nextLabel="Próximo: Workpackages"
        backLabel="Anterior: Informações"
        isNextDisabled={!isValid}
        className="border-t border-azul/10 pt-4"
      />

      <GerirFinanciamentosModal
        open={modalAberto}
        onOpenChange={setModalAberto}
        onFinanciamentoCriado={handleFinanciamentoCriado}
      />
    </div>
  );
}
