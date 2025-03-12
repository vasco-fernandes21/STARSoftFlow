import { useProjetoForm } from "../../ProjetoFormContext";
import { TabNavigation } from "../../components/TabNavigation";
import { MoneyField, PercentageField } from "../../components/FormFields";
import { api } from "@/trpc/react";
import { useState } from "react";
import { CirclePercent, Settings2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GerirFinanciamentosModal } from "./GerirFinanciamentosModal";
import { type Financiamento } from "@prisma/client";
import { type Decimal } from "@prisma/client/runtime/library";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DropdownField } from "../../components/FormFields";

interface FinancasTabProps {
  onNavigateForward: () => void;
  onNavigateBack: () => void;
}

export function FinancasTab({ onNavigateForward, onNavigateBack }: FinancasTabProps) {
  const { state, dispatch } = useProjetoForm();
  const [modalAberto, setModalAberto] = useState(false);

  const { data: financiamentos } = api.financiamento.getAllSimple.useQuery();

  const handleOverheadChange = (value: number | null) => {
    dispatch({
      type: "UPDATE_FIELD",
      field: "overhead",
      value: value ?? 0
    });
  };

  const handleTaxaFinanciamentoChange = (value: number | null) => {
    dispatch({
      type: "UPDATE_FIELD",
      field: "taxa_financiamento",
      value: value ?? 0
    });
  };

  const handleValorEtiChange = (value: number | null) => {
    dispatch({
      type: "UPDATE_FIELD",
      field: "valor_eti",
      value: value ?? 0
    });
  };

  const handleFinanciamentoSelect = (value: string) => {
    const selectedFinanciamento = financiamentos?.find(f => f.id === parseInt(value));
    if (selectedFinanciamento) {
      dispatch({
        type: "UPDATE_FIELD",
        field: "financiamentoId",
        value: parseInt(value)
      });

      dispatch({
        type: "UPDATE_PROJETO",
        data: {
          overhead: selectedFinanciamento.overhead as unknown as Decimal,
          taxa_financiamento: selectedFinanciamento.taxa_financiamento as unknown as Decimal,
          valor_eti: selectedFinanciamento.valor_eti as unknown as Decimal
        }
      });
    }
  };

  const isValid = Boolean(state.financiamentoId);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna da Esquerda - Seleção de Financiamento */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <DropdownField
              label="Tipos de Financiamento"
              value={state.financiamentoId?.toString() ?? ""}
              onChange={handleFinanciamentoSelect}
              options={[
                ...(financiamentos?.map(f => ({
                  value: f.id.toString(),
                  label: f.nome,
                })) ?? [])
              ]}
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
      />
    </div>
  );
} 