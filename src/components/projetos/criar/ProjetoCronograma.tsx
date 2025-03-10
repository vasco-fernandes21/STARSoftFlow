import { Calendar } from "lucide-react";
import { Cronograma } from "@/components/projetos/Cronograma";

interface ProjetoCronogramaProps {
  state: any;
  handleUpdateWorkPackage: (workpackage: any) => void;
  handleUpdateTarefa: (tarefa: any) => void;
}

export function ProjetoCronograma({
  state,
  handleUpdateWorkPackage,
  handleUpdateTarefa
}: ProjetoCronogramaProps) {
  const renderCronograma = () => {
    try {
      // Se não tiver dados suficientes, mostrar mensagem
      if (!state.inicio || !state.fim || !state.workpackages || state.workpackages.length === 0) {
        return (
          <div className="h-full flex flex-col items-center justify-center p-5 text-azul/70">
            <Calendar className="h-16 w-16 mb-4 text-azul/30" />
            <h3 className="text-lg font-medium mb-2">Ainda não há dados suficientes</h3>
            <p className="text-sm text-center max-w-sm">
              Para visualizar o cronograma, preencha as datas de início e fim do projeto e adicione pelo menos um workpackage com tarefas.
            </p>
          </div>
        );
      }
      
      // Converter para tipos compatíveis
      const startDate = state.inicio ? new Date(state.inicio) : new Date();
      const endDate = state.fim ? new Date(state.fim) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      
      // Mapear workpackages para o formato esperado pelo Cronograma
      const workpackages = state.workpackages.map(wp => {
        const formattedWp = {
          id: wp.id,
          nome: wp.nome || "",
          descricao: wp.descricao || null,
          inicio: wp.inicio ? new Date(wp.inicio) : null,
          fim: wp.fim ? new Date(wp.fim) : null,
          estado: typeof wp.estado === 'boolean' ? wp.estado : false,
          projetoId: "temp-id", // ID temporário
          tarefas: []
        };
        
        // Adicionar tarefas se existirem
        if (wp.tarefas && Array.isArray(wp.tarefas)) {
          formattedWp.tarefas = wp.tarefas.map(t => ({
            id: t.id,
            nome: t.nome || "",
            descricao: t.descricao || null,
            inicio: t.inicio ? new Date(t.inicio) : null,
            fim: t.fim ? new Date(t.fim) : null,
            estado: typeof t.estado === 'boolean' ? t.estado : false,
            workpackageId: wp.id
          }));
        }
        
        return formattedWp;
      });
      
      return (
        <Cronograma 
          workpackages={workpackages}
          startDate={startDate}
          endDate={endDate}
          onUpdateWorkPackage={handleUpdateWorkPackage}
          onUpdateTarefa={handleUpdateTarefa}
        />
      );
    } catch (error) {
      console.error("Erro ao renderizar cronograma:", error);
      return (
        <div className="h-full flex flex-col items-center justify-center p-5 text-azul/70">
          <h3 className="text-lg font-medium mb-2">Não foi possível carregar o cronograma</h3>
          <p className="text-sm text-center max-w-sm">
            Ocorreu um erro ao tentar exibir o cronograma. Tente novamente mais tarde.
          </p>
        </div>
      );
    }
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden h-full">
      <div className="px-8 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-azul" />
          <h2 className="text-lg font-medium text-gray-900">Cronograma</h2>
        </div>
      </div>
      
      <div className="p-4 h-[calc(100vh-16rem)]">
        {renderCronograma()}
      </div>
    </div>
  );
}
