import { User, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  return (
    <div 
      className={`
        border border-azul/10 rounded-lg bg-white overflow-hidden
        ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'}
        transition-shadow
      `}
    >
      {/* Linha principal */}
      <div 
        className="px-4 py-3 flex items-center cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Coluna do recurso */}
        <div className="flex-1 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-azul/10 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-azul" />
          </div>
          <div>
            <h3 className="font-medium text-azul">{membroEquipa?.name || "Utilizador não encontrado"}</h3>
            <div className="text-xs text-azul/60 flex items-center gap-1">
              <Badge variant="outline" className="px-1 py-0 text-[10px] h-4">
                {membroEquipa?.regime || "N/A"}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Coluna de alocações */}
        <div className="flex-[2] hidden md:flex">
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(alocacoesPorAnoMes).slice(0, 2).flatMap(([ano, meses]) => 
              Object.entries(meses).slice(0, 6).map(([mes, ocupacao]) => {
                let badgeClass = "bg-slate-50 text-slate-600 border-slate-200";
                
                if (ocupacao >= 80) {
                  badgeClass = "bg-green-50 text-green-600 border-green-200";
                } else if (ocupacao >= 50) {
                  badgeClass = "bg-blue-50 text-blue-600 border-blue-200";
                } else if (ocupacao >= 30) {
                  badgeClass = "bg-amber-50 text-amber-600 border-amber-200";
                }
                
                return (
                  <Badge 
                    key={`${mes}-${ano}`}
                    variant="outline"
                    className={`${badgeClass} text-xs whitespace-nowrap`}
                  >
                    {formatarDataSegura(ano, mes, 'MMM/yyyy')}:
                    {' '}
                    {Math.round(ocupacao)}%
                  </Badge>
                );
              })
            )}
            
            {recurso.alocacoes.length > 6 && !isExpanded && (
              <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-300 text-xs py-0.5">
                +{recurso.alocacoes.length - 6} mais
              </Badge>
            )}
          </div>
        </div>
        
        {/* Coluna de ações */}
        <div className="flex-none w-24 flex items-center justify-end gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="h-8 w-8 p-0 rounded-full text-azul hover:bg-azul/10"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Editar alocações</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="h-8 w-8 p-0 rounded-full hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Remover recurso</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full text-azul/60 hover:bg-azul/10 hover:text-azul"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Área expandida - Visualização por anos/meses */}
      {isExpanded && (
        <div className="bg-azul/5 p-4 border-t border-azul/10">
          <div className="space-y-4">
            {Object.entries(alocacoesPorAnoMes).sort().map(([ano, meses]) => (
              <div key={ano} className="space-y-1">
                <h4 className="text-sm font-medium text-azul mb-2">{ano}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
                    const ocupacao = meses[mes] || 0;
                    let badgeClass = "bg-slate-50 text-slate-400 border-slate-200";
                    let progressClass = "bg-slate-200";
                    
                    if (ocupacao >= 80) {
                      badgeClass = "bg-green-50 text-green-600 border-green-100";
                      progressClass = "bg-green-400";
                    } else if (ocupacao >= 50) {
                      badgeClass = "bg-blue-50 text-blue-600 border-blue-100";
                      progressClass = "bg-blue-400";
                    } else if (ocupacao >= 30) {
                      badgeClass = "bg-amber-50 text-amber-600 border-amber-100";
                      progressClass = "bg-amber-400";
                    }
                    
                    return (
                      <div 
                        key={mes} 
                        className={`
                          ${badgeClass} border rounded-md p-2
                          ${ocupacao === 0 ? 'opacity-50' : ''}
                        `}
                      >
                        <div className="flex justify-between text-xs mb-1.5">
                          <span>
                            {formatarDataSegura(ano, mes, 'MMMM')}
                          </span>
                          <span className="font-medium">{ocupacao}%</span>
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 