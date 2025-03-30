import { useProjetoForm } from "../../ProjetoFormContext";
import { TabNavigation } from "../../components/TabNavigation";
import { MoneyField, PercentageField } from "../../components/FormFields";
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

  const { data: financiamentosResponse } = api.financiamento.findAll.useQuery({
    limit: 100
  }) as { data: FinanciamentoResponse | undefined };

  const financiamentos = (financiamentosResponse?.items || []).map(f => ({
    ...f,
    overhead: new Decimal(f.overhead),
    taxa_financiamento: new Decimal(f.taxa_financiamento),
    valor_eti: new Decimal(f.valor_eti)
  })) as FinanciamentoInterno[];

  const handleOverheadChange = (value: number | null) => {
    dispatch({
      type: "SET_FIELD",
      field: "overhead",
      value: value ?? 0
    });
  };

  const handleTaxaFinanciamentoChange = (value: number | null) => {
    dispatch({
      type: "SET_FIELD",
      field: "taxa_financiamento",
      value: value ?? 0
    });
  };

  const handleValorEtiChange = (value: number | null) => {
    dispatch({
      type: "SET_FIELD",
      field: "valor_eti",
      value: value ?? 0
    });
  };

  const handleFinanciamentoSelect = (value: string) => {
    const selectedFinanciamento = financiamentos.find(
      (f) => f.id === parseInt(value)
    );
    
    if (selectedFinanciamento) {
      dispatch({
        type: "SET_FIELD",
        field: "financiamentoId",
        value: selectedFinanciamento.id
      });

      dispatch({
        type: "SET_FIELD",
        field: "overhead",
        value: selectedFinanciamento.overhead
      });
      
      dispatch({
        type: "SET_FIELD",
        field: "taxa_financiamento",
        value: selectedFinanciamento.taxa_financiamento
      });
      
      dispatch({
        type: "SET_FIELD",
        field: "valor_eti",
        value: selectedFinanciamento.valor_eti
      });
    }
  };

  const handleFinanciamentoCriado = (financiamento: FinanciamentoAPI) => {
    const financiamentoInterno: FinanciamentoInterno = {
      id: financiamento.id,
      nome: financiamento.nome,
      overhead: new Decimal(financiamento.overhead),
      taxa_financiamento: new Decimal(financiamento.taxa_financiamento),
      valor_eti: new Decimal(financiamento.valor_eti)
    };

    dispatch({
      type: "SET_FIELD",
      field: "financiamentoId",
      value: financiamentoInterno.id
    });

    dispatch({
      type: "SET_FIELD",
      field: "overhead",
      value: financiamentoInterno.overhead
    });
    
    dispatch({
      type: "SET_FIELD",
      field: "taxa_financiamento",
      value: financiamentoInterno.taxa_financiamento
    });
    
    dispatch({
      type: "SET_FIELD",
      field: "valor_eti",
      value: financiamentoInterno.valor_eti
    });
  };

  const isValid = Boolean(state.financiamentoId);

  return (
    <div className="space-y-8 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
              className="self-end mt-2 text-azul/80 hover:text-azul hover:bg-azul/5"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Gerir Tipos de Financiamento
            </Button>
          </div>
        </div>

        {/* Coluna da Direita - Valores */}
        <div className="flex flex-col gap-6">
          <PercentageField
            label="Overhead"
            value={Number(state.overhead ?? 0)}
            onChange={handleOverheadChange}
            required
            tooltip="Percentagem de overhead aplicada ao projeto"
            id="overhead"
          />

          <PercentageField
            label="Taxa de Financiamento"
            value={Number(state.taxa_financiamento ?? 0)}
            onChange={handleTaxaFinanciamentoChange}
            required
            tooltip="Taxa de financiamento do projeto"
            id="taxa-financiamento"
          />

          <MoneyField
            label="Valor ETI"
            value={Number(state.valor_eti ?? 0)}
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
        className="pt-4 border-t border-azul/10"
      />

      <GerirFinanciamentosModal 
        open={modalAberto} 
        onOpenChange={setModalAberto} 
        onFinanciamentoCriado={handleFinanciamentoCriado}
      />
    </div>
  );
} 