import { useProjetoForm } from "../../ProjetoFormContext";
import { TabNavigation } from "../../components/TabNavigation";
import { DateField } from "../../components/FormFields";
import { type ProjetoCreateInput } from "../../types";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, CalendarClock } from "lucide-react";

interface DatasTabProps {
  onNavigateBack: () => void;
  onNavigateForward: () => void;
}

export function DatasTab({ onNavigateBack, onNavigateForward }: DatasTabProps) {
  const { state, dispatch } = useProjetoForm();

  const updateField = <K extends keyof ProjetoCreateInput>(field: K, value: ProjetoCreateInput[K]) => {
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
        <Card className="border-azul/10 shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-md rounded-xl overflow-hidden">
          <CardContent className="p-6 space-y-8">
            <div className="space-y-6 max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-azul/10 rounded-xl p-5 shadow-sm bg-white/50 transition-all duration-300 hover:shadow hover:bg-white/70">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-azul/10 text-azul">
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
                
                <div className="border border-azul/10 rounded-xl p-5 shadow-sm bg-white/50 transition-all duration-300 hover:shadow hover:bg-white/70">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-azul/10 text-azul">
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
              <p className="text-xs text-azul/60 italic">
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