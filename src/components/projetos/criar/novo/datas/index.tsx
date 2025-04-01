import { useProjetoForm } from "../../ProjetoFormContext";
import { TabNavigation } from "../../components/TabNavigation";
import { DateField } from "../../components/FormFields";
import { type ProjetoCreateInput } from "../../../types";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, CalendarClock } from "lucide-react";

interface DatasTabProps {
  onNavigateBack: () => void;
  onNavigateForward: () => void;
}

export function DatasTab({ onNavigateBack, onNavigateForward }: DatasTabProps) {
  const { state, dispatch } = useProjetoForm();

  const updateField = <K extends keyof ProjetoCreateInput>(
    field: K,
    value: ProjetoCreateInput[K]
  ) => {
    dispatch({ type: "UPDATE_PROJETO", data: { [field]: value } });
  };

  const isValid = Boolean(state.inicio && state.fim);

  // Converter string para Date se necessário
  const getDateValue = (dateValue: string | Date | null | undefined): Date | null => {
    if (!dateValue) return null;
    return dateValue instanceof Date ? dateValue : new Date(dateValue);
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1">
        <Card className="overflow-hidden rounded-xl border-azul/10 bg-white/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
          <CardContent className="space-y-8 p-6">
            <div className="max-w-3xl space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-azul/10 bg-white/50 p-5 shadow-sm transition-all duration-300 hover:bg-white/70 hover:shadow">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-azul/10 text-azul">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-medium text-azul">Data de Início</h3>
                  </div>

                  <DateField
                    label=""
                    value={getDateValue(state.inicio)}
                    onChange={(date) => updateField("inicio", date)}
                    tooltip="A data em que o projeto começa oficialmente"
                    required
                    className="mt-2"
                  />
                </div>

                <div className="rounded-xl border border-azul/10 bg-white/50 p-5 shadow-sm transition-all duration-300 hover:bg-white/70 hover:shadow">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-azul/10 text-azul">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-medium text-azul">Data de Conclusão</h3>
                  </div>

                  <DateField
                    label=""
                    value={getDateValue(state.fim)}
                    onChange={(date) => updateField("fim", date)}
                    tooltip="A data prevista para conclusão do projeto"
                    required
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-xs italic text-azul/60">
                * Selecione as datas nos calendários acima
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <TabNavigation
        onBack={onNavigateBack}
        onNext={onNavigateForward}
        backLabel="Anterior: Informações"
        nextLabel="Próximo: Finanças"
        isNextDisabled={!isValid}
      />
    </div>
  );
}
