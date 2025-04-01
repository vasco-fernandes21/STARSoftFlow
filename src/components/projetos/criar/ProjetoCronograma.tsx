import { Calendar } from "lucide-react";
import { Cronograma } from "@/components/projetos/tabs/Cronograma";
import { useProjetoForm } from "./ProjetoFormContext";
import type { ProjetoCompleto } from "@/components/projetos/types";

interface ProjetoCronogramaProps {
  _handleUpdateWorkPackage?: (workpackage: any) => void;
  _handleUpdateTarefa?: (tarefa: any) => void;
  state?: any;
  height?: string | number;
}

export function ProjetoCronograma({
  _handleUpdateWorkPackage,
  _handleUpdateTarefa,
  state: externalState,
  height = "100%",
}: ProjetoCronogramaProps) {
  // Use external state if provided, otherwise use context
  const contextState = useProjetoForm().state;
  const state = externalState || contextState;

  const renderCronograma = () => {
    try {
      // Se não tiver dados suficientes, mostrar mensagem
      if (!state.inicio || !state.fim || !state.workpackages || state.workpackages.length === 0) {
        return (
          <div className="flex h-full flex-col items-center justify-center p-5 text-azul/70">
            <Calendar className="mb-4 h-16 w-16 text-azul/30" />
            <h3 className="mb-2 text-lg font-medium">Ainda não há dados suficientes</h3>
            <p className="max-w-sm text-center text-sm">
              Para visualizar o cronograma, preencha as datas de início e fim do projeto e adicione
              pelo menos um workpackage com tarefas.
            </p>
          </div>
        );
      }

      // Converter para tipos compatíveis
      const startDate = state.inicio ? new Date(state.inicio) : new Date();
      const endDate = state.fim
        ? new Date(state.fim)
        : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      // Mapear workpackages para o formato esperado pelo Cronograma
      const workpackages = state.workpackages.map((wp: any) => ({
        id: wp.id,
        nome: wp.nome || "",
        descricao: wp.descricao || null,
        inicio: wp.inicio || null,
        fim: wp.fim || null,
        estado: wp.estado || false,
        projetoId: "temp",
        tarefas: wp.tarefas
          ? wp.tarefas.map((t: any) => ({
              id: t.id,
              nome: t.nome || "",
              descricao: t.descricao || null,
              inicio: t.inicio || null,
              fim: t.fim || null,
              estado: t.estado || false,
              workpackageId: wp.id,
              entregaveis: t.entregaveis || [],
            }))
          : [],
        materiais: wp.materiais || [],
        recursos: wp.recursos || [],
      }));

      const projetoData: ProjetoCompleto = {
        id: "temp",
        nome: state.nome || "Novo Projeto",
        descricao: state.descricao || "",
        inicio: state.inicio || startDate,
        fim: state.fim || endDate,
        estado: state.estado || "RASCUNHO",
        responsavelId: null,
        overhead: state.overhead || 0,
        taxa_financiamento: state.taxa_financiamento || 0,
        valor_eti: state.valor_eti || 0,
        financiamentoId: state.financiamentoId || null,
        financiamento: null,
        workpackages: workpackages,
        progresso: 0,
      };

      return (
        <Cronograma
          projeto={projetoData}
          workpackages={workpackages}
          startDate={startDate}
          endDate={endDate}
          onSelectTarefa={(_tarefaId) => {}}
          onUpdateWorkPackage={async () => {}}
          onUpdateTarefa={async () => {}}
          options={{ disableInteractions: true }}
          projetoId="temp"
        />
      );
    } catch (error) {
      console.error("Erro ao renderizar cronograma:", error);
      return (
        <div className="flex h-full flex-col items-center justify-center p-5 text-azul/70">
          <h3 className="mb-2 text-lg font-medium">Não foi possível carregar o cronograma</h3>
          <p className="max-w-sm text-center text-sm">
            Ocorreu um erro ao tentar exibir o cronograma. Tente novamente mais tarde.
          </p>
        </div>
      );
    }
  };

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-2xl bg-white"
      style={{
        maxWidth: "100%",
        height: height,
      }}
    >
      <div className="flex-shrink-0 border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-azul" />
          <h2 className="text-base font-medium text-gray-900">Cronograma</h2>
        </div>
      </div>

      <div className="flex-grow overflow-hidden p-2">
        {/* Adding a fixed-width wrapper to constrain the timeline content */}
        <div className="relative h-full w-full max-w-[50vw] overflow-auto">
          {renderCronograma()}
        </div>
      </div>
    </div>
  );
}
