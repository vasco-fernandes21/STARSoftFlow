import { User, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { gerarMesesEntreDatas } from "@/server/api/utils";
import { Decimal } from "decimal.js";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface ItemProps {
  workpackageId: string;
  recurso: {
    userId: string;
    alocacoes: Array<{
      mes: number;
      ano: number;
      ocupacao: Decimal;
    }>;
  };
  inicio: Date;
  fim: Date;
  utilizador: {
    id: string;
    name: string;
    email: string;
    regime: string;
  } | undefined;
  onRemoveAlocacao: (workpackageId: string, userId: string, mes: number, ano: number) => void;
}

export function Item({ 
  workpackageId, 
  recurso, 
  inicio, 
  fim, 
  utilizador,
  onRemoveAlocacao 
}: ItemProps) {
  const { userId, alocacoes } = recurso;
  const mesesEntreDatas = gerarMesesEntreDatas(inicio, fim);
  
  // Converter alocações para um objeto indexado por chave de mês para facilitar acesso
  const alocacoesPorMes = alocacoes.reduce((acc, alocacao) => {
    const chave = `${alocacao.mes}-${alocacao.ano}`;
    acc[chave] = Number(alocacao.ocupacao);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="py-5 space-y-3 hover:bg-azul/5 transition-colors px-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-azul/10 flex items-center justify-center border border-azul/20">
            <User className="h-5 w-5 text-azul" />
          </div>
          <div>
            <span className="font-medium text-azul block">
              {utilizador?.name || "Utilizador não encontrado"}
            </span>
            <span className="text-xs text-azul/60">
              {Object.keys(alocacoesPorMes).length} meses alocados
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const confirmed = window.confirm("Tem a certeza que deseja remover todas as alocações deste recurso?");
            if (confirmed) {
              Object.entries(alocacoesPorMes).forEach(([mesAno, _]) => {
                const [mes, ano] = mesAno.split("-").map(Number);
                onRemoveAlocacao(
                  workpackageId, 
                  userId, 
                  mes || 1, 
                  ano || new Date().getFullYear()
                );
              });
              toast.success("Alocações removidas com sucesso");
            }
          }}
          className="h-8 w-8 p-0 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Resumo de alocação */}
      <div className="flex flex-wrap gap-2 pl-13">
        {mesesEntreDatas
          .filter(mes => Number(alocacoesPorMes[mes.chave] ?? 0) > 0)
          .map((mes, idx) => {
            const valor = Number(alocacoesPorMes[mes.chave] ?? 0);
            // Determinar a cor do badge com base no valor de alocação
            let bgColor = "bg-azul/10";
            let textColor = "text-azul";
            let borderColor = "border-azul/20";
            
            if (valor >= 0.8) {
              bgColor = "bg-green-50";
              textColor = "text-green-600";
              borderColor = "border-green-200";
            } else if (valor >= 0.5) {
              bgColor = "bg-blue-50";
              textColor = "text-blue-600";
              borderColor = "border-blue-200";
            } else if (valor >= 0.3) {
              bgColor = "bg-amber-50";
              textColor = "text-amber-600";
              borderColor = "border-amber-200";
            } else {
              bgColor = "bg-gray-50";
              textColor = "text-gray-600";
              borderColor = "border-gray-200";
            }
            
            // Converter explicitamente para números
            const ano = Number(mes.ano);
            const mesNum = Number(mes.mes);
            
            // Criar data corretamente (mês - 1 porque meses em JS são 0-indexed)
            const data = new Date(ano, mesNum - 1);
            const mesFormatado = format(data, 'MMM', { locale: pt });
            
            return (
              <Badge 
                key={idx}
                className={`rounded-full px-2.5 py-1 text-xs ${bgColor} ${textColor} ${borderColor}`}
              >
                {mesFormatado}: {valor.toFixed(1).replace('.', ',')}
              </Badge>
            );
          })
        }
      </div>
    </div>
  );
} 