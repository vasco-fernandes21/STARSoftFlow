import { useState, useEffect } from "react";
import { User, Edit, Trash2, ChevronDown, ChevronUp, Calendar, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";

interface ItemProps {
  userId: string;
  recurso: {
    userId: string;
    alocacoes: Array<{
      mes: number;
      ano: number;
      ocupacao: any;
    }>;
  };
  membroEquipa: {
    id: string;
    name?: string | null;
    email?: string | null;
    regime?: string;
    [key: string]: any;
  } | undefined;
  isExpanded: boolean;
  workpackageId: string;
  onToggleExpand: () => void;
  onEdit: () => void;
  onRemove: () => void;
  formatarDataSegura: (ano: string | number, mes: string | number, formatString: string) => string;
  alocacoesPorAnoMes: Record<string, Record<number, number>>;
}

// Função para obter cor subtil baseada na ocupação
const getSubtleColor = (ocupacao: number): string => {
  if (ocupacao > 100) return "from-red-50 to-red-100 text-red-700";
  if (ocupacao >= 80) return "from-green-50 to-green-100 text-green-700";
  if (ocupacao >= 50) return "from-blue-50 to-blue-100 text-blue-700";
  if (ocupacao >= 30) return "from-amber-50 to-amber-100 text-amber-700";
  return "from-slate-50 to-slate-100 text-slate-700";
};

export function Item({
  userId,
  recurso,
  membroEquipa,
  isExpanded,
  workpackageId,
  onToggleExpand,
  onEdit,
  onRemove,
  formatarDataSegura,
  alocacoesPorAnoMes
}: ItemProps) {
  const [anoAtivo, setAnoAtivo] = useState<string | null>(null);
  
  // Definir ano ativo inicial (mais recente) usando useEffect para evitar erros
  useEffect(() => {
    if (!anoAtivo && Object.keys(alocacoesPorAnoMes).length > 0) {
      const anos = Object.keys(alocacoesPorAnoMes).sort();
      if (anos.length > 0) {
        // Garantir que o valor nunca seja undefined
        const anoMaisRecente = anos[anos.length - 1] || "";
        if (anoMaisRecente) {
          setAnoAtivo(anoMaisRecente);
        }
      }
    }
  }, [anoAtivo, alocacoesPorAnoMes]);

  // Calcular estatísticas simples
  const totalAlocacoes = recurso.alocacoes.length;
  const mesesAlocados = Object.values(alocacoesPorAnoMes)
    .flatMap(mes => Object.values(mes))
    .filter(v => v > 0).length;

  return (
    <Card className="border-azul/10 hover:border-azul/20 transition-all overflow-hidden">
      {/* Cabeçalho do Recurso (parecido com o TarefaItem) */}
      <div 
        className="p-3 flex justify-between items-start cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-start gap-2">
          <div className="h-7 w-7 rounded-lg bg-azul/10 flex items-center justify-center mt-0.5">
            <User className="h-3.5 w-3.5 text-azul" />
          </div>
          <div>
            <h5 className="text-sm font-medium text-azul">{membroEquipa?.name || "Utilizador não encontrado"}</h5>
            <div className="text-xs text-azul/70 mt-0.5">
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] h-4 bg-azul/5 text-azul/80 border-azul/20">
                {membroEquipa?.regime || "N/A"}
              </Badge>
              {mesesAlocados > 0 && (
                <span className="ml-2 text-azul/60">{mesesAlocados} meses alocados</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Botões de ação (mesmo estilo do TarefaItem) */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="h-7 w-7 p-0 rounded-lg hover:bg-azul/10 text-azul/70"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-lg hover:bg-azul/10"
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-azul/70" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-azul/70" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Área expandida - Visualização moderna por anos/meses */}
      {isExpanded && (
        <div className="border-t border-azul/10 bg-azul/5 p-5">
          {/* Seletor de anos - somente se houver mais de 1 ano */}
          {Object.keys(alocacoesPorAnoMes).length > 1 && (
            <div className="flex justify-center mb-6">
              <div className="inline-flex bg-white rounded-full p-1 shadow-sm">
                {Object.keys(alocacoesPorAnoMes).sort().map(ano => (
                  <button
                    key={ano}
                    onClick={() => setAnoAtivo(ano)}
                    className={`
                      px-4 py-1.5 text-xs font-medium rounded-full transition-all
                      ${anoAtivo === ano 
                        ? 'bg-azul/10 text-azul shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'}
                    `}
                  >
                    {ano}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Mostrar apenas o ano ativo */}
          {anoAtivo && alocacoesPorAnoMes[anoAtivo] && (
            <div className="space-y-6">
              <div className="flex items-center mb-3">
                <div className="w-7 h-7 rounded-lg bg-azul/10 flex items-center justify-center mr-2">
                  <Calendar className="h-3.5 w-3.5 text-azul" />
                </div>
                <h4 className="text-sm font-medium text-azul">{anoAtivo}</h4>
              </div>
              
              {/* Grid de meses com design semelhante ao TarefaItem */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
                  const ocupacao = alocacoesPorAnoMes[anoAtivo]?.[mes] || 0;
                  let bgColor = "bg-gray-50";
                  let textColor = "text-gray-600";
                  let borderColor = "border-gray-200";
                  let progressClass = "bg-gray-200";
                  
                  if (ocupacao >= 80) {
                    bgColor = "bg-green-50";
                    textColor = "text-green-600";
                    borderColor = "border-green-100";
                    progressClass = "bg-green-400";
                  } else if (ocupacao >= 50) {
                    bgColor = "bg-blue-50";
                    textColor = "text-blue-600";
                    borderColor = "border-blue-100";
                    progressClass = "bg-blue-400";
                  } else if (ocupacao >= 30) {
                    bgColor = "bg-amber-50";
                    textColor = "text-amber-600";
                    borderColor = "border-amber-100";
                    progressClass = "bg-amber-400";
                  }
                  
                  return (
                    <div 
                      key={mes} 
                      className={`${bgColor} ${borderColor} border rounded-md p-2 ${ocupacao === 0 ? 'opacity-50' : ''}`}
                    >
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className={textColor}>
                          {formatarDataSegura(anoAtivo, mes, 'MMM')}
                        </span>
                        <span className={`font-medium ${textColor}`}>{ocupacao.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${progressClass} rounded-full transition-all duration-300`}
                          style={{ width: `${ocupacao}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Estatísticas de ocupação - similar ao formato do TarefaItem */}
              <div className="mt-4 bg-white/70 rounded-lg p-3 border border-azul/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-5 w-5 rounded-md bg-azul/10 flex items-center justify-center">
                    <Briefcase className="h-3 w-3 text-azul" />
                  </div>
                  <h6 className="text-xs font-medium text-azul/80">Estatísticas de Ocupação</h6>
                </div>
                
                <div className="space-y-3 mt-3">
                  <div className="group">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-azul/70">Meses alocados</span>
                      <span className="text-azul font-medium">
                        {Object.values(alocacoesPorAnoMes[anoAtivo] || {}).filter(v => v > 0).length}/12
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-azul/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-azul/50 rounded-full transition-all duration-500"
                        style={{ width: `${(Object.values(alocacoesPorAnoMes[anoAtivo] || {}).filter(v => v > 0).length / 12) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="group">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-azul/70">Ocupação média</span>
                      <span className="text-azul font-medium">
                        {(Object.values(alocacoesPorAnoMes[anoAtivo] || {}).reduce((a, b) => a + b, 0) / 
                         Math.max(1, Object.values(alocacoesPorAnoMes[anoAtivo] || {}).filter(v => v > 0).length)).toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-azul/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-azul/50 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Object.values(alocacoesPorAnoMes[anoAtivo] || {}).reduce((a, b) => a + b, 0) / 
                         Math.max(1, Object.values(alocacoesPorAnoMes[anoAtivo] || {}).filter(v => v > 0).length))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
} 