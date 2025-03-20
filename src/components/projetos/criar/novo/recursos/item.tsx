import { User, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <Card className="border-azul/10 hover:border-azul/20 transition-all overflow-hidden">
      {/* Cabeçalho do Recurso */}
      <div 
        className="p-3 flex justify-between items-center cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-azul/10 flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-azul" />
          </div>
          <div>
            <h5 className="text-sm font-medium text-azul">{membroEquipa?.name || "Utilizador não encontrado"}</h5>
            <div className="text-xs text-azul/70 flex items-center gap-1 mt-0.5">
              <Badge variant="outline" className="px-1 py-0 text-[10px] h-4">
                {membroEquipa?.regime || "N/A"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="h-7 w-7 p-0 rounded-lg hover:bg-azul/10 text-azul"
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
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
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
      
      {/* Seção de Alocações */}
      {isExpanded && (
        <div className="border-t border-azul/10 bg-azul/5">
          <div className="p-3">
            <div className="space-y-4">
              {Object.entries(alocacoesPorAnoMes).sort().map(([ano, meses]) => (
                <div key={ano} className="space-y-2">
                  <h6 className="text-xs font-medium text-azul/80 mb-2">{ano}</h6>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
                      const ocupacao = meses[mes] || 0;
                      let badgeClass = "bg-gray-50 text-gray-600 border-gray-200";
                      let progressClass = "bg-gray-200";
                      
                      if (ocupacao >= 80) {
                        badgeClass = "bg-emerald-50 text-emerald-600 border-emerald-200";
                        progressClass = "bg-emerald-400";
                      } else if (ocupacao >= 50) {
                        badgeClass = "bg-blue-50 text-blue-600 border-blue-100";
                        progressClass = "bg-blue-400";
                      } else if (ocupacao >= 30) {
                        badgeClass = "bg-amber-50 text-amber-600 border-amber-100";
                        progressClass = "bg-amber-400";
                      }
                      
                      return (
                        <div 
                          key={`${ano}-${mes}`} 
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
        </div>
      )}
    </Card>
  );
} 