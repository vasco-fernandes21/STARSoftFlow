import { User as UserIcon, Edit, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface User {
  id: string;
  name: string;
  email: string;
  regime: string;
}

interface ItemProps {
  user: User;
  alocacoesPorAnoMes: Record<string, Record<number, number>>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onRemove: () => void;
  inicio: Date;
  fim: Date;
}

export function Item({
  user,
  alocacoesPorAnoMes,
  isExpanded,
  onToggleExpand,
  onEdit,
  onRemove,
  inicio,
  fim,
}: ItemProps) {
  return (
    <Card className="overflow-hidden border-azul/10 transition-all hover:border-azul/20">
      <div
        className="flex cursor-pointer items-center justify-between p-3"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-azul/10">
            <UserIcon className="h-3.5 w-3.5 text-azul" />
          </div>
          <div>
            <h5 className="text-sm font-medium text-azul">{user.name}</h5>
            <Badge variant="outline" className="h-4 px-1 py-0 text-[10px]">
              {user.regime}
            </Badge>
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
            className="h-7 w-7 rounded-lg p-0 text-azul hover:bg-azul/10"
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
            className="h-7 w-7 rounded-lg p-0 text-red-500 hover:bg-red-50"
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
            className="h-7 w-7 rounded-lg p-0 hover:bg-azul/10"
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-azul/70" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-azul/70" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <AlocacoesGrid alocacoesPorAnoMes={alocacoesPorAnoMes} inicio={inicio} fim={fim} />
      )}
    </Card>
  );
}

function AlocacoesGrid({
  alocacoesPorAnoMes,
  inicio,
  fim,
}: {
  alocacoesPorAnoMes: Record<string, Record<number, number>>;
  inicio: Date;
  fim: Date;
}) {
  // Gerar array de anos entre início e fim
  const anos = Array.from(
    { length: fim.getFullYear() - inicio.getFullYear() + 1 },
    (_, i) => inicio.getFullYear() + i
  );

  return (
    <div className="border-t border-azul/10 bg-azul/5">
      <div className="p-3">
        <div className="space-y-4">
          {anos.map((ano) => {
            const meses = alocacoesPorAnoMes[ano] || {};

            return (
              <div key={ano} className="space-y-2">
                <h6 className="mb-2 text-xs font-medium text-azul/80">{ano}</h6>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => {
                    // Verificar se o mês está dentro do período do workpackage
                    const dataAtual = new Date(ano, mes - 1);
                    const isMesValido = dataAtual >= inicio && dataAtual <= fim;

                    if (!isMesValido) return null;

                    const ocupacao = meses[mes] || 0;
                    const { badgeClass, progressClass } = getOcupacaoStyles(ocupacao);

                    return (
                      <div
                        key={`${ano}-${mes}`}
                        className={`${badgeClass} rounded-md border p-2 ${ocupacao === 0 ? "opacity-50" : ""}`}
                      >
                        <div className="mb-1.5 flex justify-between text-xs">
                          <span>{format(new Date(ano, mes - 1), "MMMM", { locale: pt })}</span>
                          <span className="font-medium">{ocupacao}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/50">
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
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getOcupacaoStyles(ocupacao: number) {
  if (ocupacao > 100) {
    return {
      badgeClass: "bg-red-50 text-red-600 border-red-200",
      progressClass: "bg-red-400",
    };
  } else if (ocupacao >= 80) {
    return {
      badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-200",
      progressClass: "bg-emerald-400",
    };
  } else if (ocupacao >= 50) {
    return {
      badgeClass: "bg-blue-50 text-blue-600 border-blue-100",
      progressClass: "bg-blue-400",
    };
  } else if (ocupacao >= 1) {
    return {
      badgeClass: "bg-amber-50 text-amber-600 border-amber-100",
      progressClass: "bg-amber-400",
    };
  }
  return {
    badgeClass: "bg-gray-50 text-gray-600 border-gray-200",
    progressClass: "bg-gray-200",
  };
}
