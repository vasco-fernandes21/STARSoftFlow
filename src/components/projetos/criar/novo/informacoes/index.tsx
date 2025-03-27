import { useProjetoForm } from "../../ProjetoFormContext";
import { TabNavigation } from "../../components/TabNavigation";
import { TextField, TextareaField, DateField } from "../../components/FormFields";
import { type ProjetoCreateInput } from "../../../types";
import { differenceInDays, differenceInMonths, differenceInYears, addDays } from "date-fns";

interface InformacoesTabProps {
  onNavigateForward: () => void;
}

export function InformacoesTab({ onNavigateForward }: InformacoesTabProps) {
  const { state, dispatch } = useProjetoForm();

  const updateField = (field: keyof ProjetoCreateInput, value: unknown) => {
    dispatch({ 
      type: "UPDATE_PROJETO", 
      data: { [field]: value } 
    });
  };

  // Função para calcular e formatar a duração do projeto
  const getDuracaoProjeto = () => {
    if (!state.inicio || !state.fim) return null;

    const inicio = new Date(state.inicio);
    const fim = new Date(state.fim);
    
    const anos = differenceInYears(fim, inicio);
    const meses = differenceInMonths(fim, inicio) % 12;
    const dias = differenceInDays(fim, inicio) % 30;

    const partes = [];
    if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
    if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`);
    if (dias > 0) partes.push(`${dias} ${dias === 1 ? 'dia' : 'dias'}`);

    return partes.join(', ');
  };

  const isValid = Boolean(
    state.nome?.trim() && 
    state.inicio && 
    state.fim && 
    new Date(state.fim) > new Date(state.inicio)
  );

  const duracaoProjeto = getDuracaoProjeto();

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna da Esquerda - Identificação */}
        <div className="flex flex-col space-y-6">
          <TextField
            label="Nome do Projeto"
            value={state.nome || ""}
            onChange={(value) => updateField("nome", value)}
            placeholder="Ex: INOVC+"
            required
            tooltip="Nome descritivo e único para o projeto"
            id="nome-projeto"
          />
          
          <TextareaField
            label="Descrição"
            value={state.descricao || ""}
            onChange={(value) => updateField("descricao", value)}
            placeholder="Descreva brevemente o projeto..."
            tooltip="Uma breve descrição dos objetivos e tema do projeto"
            id="descricao-projeto"
            rows={4}
          />
        </div>

        {/* Coluna da Direita - Cronograma */}
        <div className="flex flex-col space-y-6">
          <DateField
            label="Data de Início"
            value={state.inicio ? new Date(state.inicio) : null}
            onChange={(date) => updateField("inicio", date)}
            required
            tooltip="Data de início do projeto"
            id="data-inicio"
          />
          
          <DateField
            label="Data de Fim"
            value={state.fim ? new Date(state.fim) : null}
            onChange={(date) => updateField("fim", date)}
            required
            tooltip="Data de conclusão prevista do projeto"
            id="data-fim"
            minDate={state.inicio ? addDays(new Date(state.inicio), 1) : undefined}
          />

          {duracaoProjeto && (
            <div className="p-4 bg-azul/5 rounded-xl border border-azul/10">
              <p className="text-sm text-azul/80">
                <span className="font-medium">Duração do projeto:</span>{" "}
                {duracaoProjeto}
              </p>
            </div>
          )}

          {state.inicio && state.fim && new Date(state.fim) <= new Date(state.inicio) && (
            <p className="text-sm text-rose-500 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
              A data de fim deve ser posterior à data de início
            </p>
          )}
        </div>
      </div>

      <TabNavigation
        onNext={onNavigateForward}
        showBackButton={false}
        nextLabel="Próximo: Finanças"
        isNextDisabled={!isValid}
        className="mt-4"
      />
    </div>
  );
} 