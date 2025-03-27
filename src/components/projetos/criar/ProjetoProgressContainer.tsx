import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import type { FaseType } from "../types";
import { fases } from "../types";

interface ProjetoProgressContainerProps {
  fasesOrdem: readonly FaseType[];
  faseAtual: FaseType;
  fasesConcluidas: Record<FaseType, boolean>;
  progressoAtual: number;
  progressoTotal: number;
  percentualProgresso: number;
  mostrarCronograma: boolean;
  navegarParaFase: (fase: FaseType) => void;
  toggleCronograma: () => void;
}

export function ProjetoProgressContainer({
  fasesOrdem,
  faseAtual,
  fasesConcluidas,
  progressoAtual,
  progressoTotal,
  percentualProgresso,
  mostrarCronograma,
  navegarParaFase,
  toggleCronograma
}: ProjetoProgressContainerProps) {
  return (
    <div className="bg-white rounded-2xl p-8">
      {/* Cabeçalho com progresso e botão de cronograma */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h3 className="text-lg font-medium text-gray-900">Progresso</h3>
          <p className="text-sm text-gray-500">Etapa {progressoAtual} de {progressoTotal}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-azul hover:bg-azul/5"
          onClick={toggleCronograma}
        >
          {mostrarCronograma ? (
            <span className="flex items-center gap-2">
              <EyeOff className="h-4 w-4" />
              Ocultar cronograma
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Ver cronograma
            </span>
          )}
        </Button>
      </div>

      {/* Barra de progresso */}
      <div className="flex items-center gap-4">
        <Progress 
          value={percentualProgresso} 
          className="h-2"
          // Movido o estilo do indicador para dentro do componente Progress
        />
        <span className="text-sm font-medium text-azul/80">
          {Math.round(percentualProgresso)}%
        </span>
      </div>
      
      {/* Navegação por fases */}
      <div className="mt-8 grid" style={{ gridTemplateColumns: `repeat(${fasesOrdem.length}, 1fr)` }}>
        {fasesOrdem.map((fase) => {
          const IconComponent = fases[fase].icon;
          const isFaseAtual = fase === faseAtual;
          const isFaseConcluida = fasesConcluidas[fase];
          
          return (
            <button
              key={fase}
              onClick={() => navegarParaFase(fase)}
              className={`
                group flex flex-col items-center space-y-3 transition-all duration-300
                ${isFaseAtual ? "opacity-100" : "opacity-60 hover:opacity-100"}
              `}
            >
              <div className={`
                relative h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300
                ${isFaseAtual 
                  ? "bg-azul text-white shadow-lg" 
                  : isFaseConcluida
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-50 text-gray-400 group-hover:bg-gray-100"
                }
              `}>
                <IconComponent className="h-4 w-4" />
                {isFaseConcluida && !isFaseAtual && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                )}
              </div>
              <span className={`
                text-xs font-medium transition-all duration-300 text-center px-1
                ${isFaseAtual ? "text-azul" : "text-gray-500 group-hover:text-gray-900"}
              `}>
                {fases[fase].titulo}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
