import React from "react";
import { Progress } from "@/components/ui/progress";
import type { WorkpackageCompleto } from "@/components/projetos/types";

interface WorkpackageProgressoFinanceiroProps {
  workpackage?: WorkpackageCompleto;
}

export function WorkpackageProgressoFinanceiro({ workpackage }: WorkpackageProgressoFinanceiroProps) {
  // Simulação dos valores de progresso. Substitua pelos reais conforme necessário.
  // Exemplo: workpackage?.progressoFinanceiro?.recursosHumanos ou similar
  const progressoRH = workpackage?.progressoFinanceiro?.recursosHumanos ?? 0; // 0 a 100
  const progressoMateriais = workpackage?.progressoFinanceiro?.materiaisEquipamentos ?? 0; // 0 a 100

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-800">Progresso Financeiro</h2>
      <div className="mb-6">
        <div className="mb-1 flex justify-between">
          <span className="text-sm font-medium text-gray-700">Recursos Humanos</span>
          <span className="text-xs text-gray-500">{progressoRH}%</span>
        </div>
        <Progress value={progressoRH} className="h-3 bg-gray-200" />
      </div>
      <div>
        <div className="mb-1 flex justify-between">
          <span className="text-sm font-medium text-gray-700">Materiais e Equipamentos</span>
          <span className="text-xs text-gray-500">{progressoMateriais}%</span>
        </div>
        <Progress value={progressoMateriais} className="h-3 bg-gray-200" />
      </div>
    </div>
  );
}
