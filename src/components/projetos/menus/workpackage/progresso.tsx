import React from "react";
import { Badge } from "@/components/ui/badge";
import { Users, Package } from "lucide-react";

// Mock data (igual para todos os workpackages)
const MOCK_ORCAMENTO = {
  rh: {
    orcamento: 10000, // orçamento submetido RH
    gasto: 6500,      // gasto atual RH
  },
  materiais: {
    orcamento: 4000,  // orçamento submetido Materiais
    gasto: 1200,      // gasto atual Materiais
  },
};

export function ProgressoWorkpackage() {
  // Cálculo dos percentuais
  const rhPercent = Math.min((MOCK_ORCAMENTO.rh.gasto / MOCK_ORCAMENTO.rh.orcamento) * 100, 100);
  const matPercent = Math.min((MOCK_ORCAMENTO.materiais.gasto / MOCK_ORCAMENTO.materiais.orcamento) * 100, 100);

  return (
    <>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Progresso</h2>
        <p className="text-sm text-gray-500">Acompanhar o progresso financeiro</p>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-azul/70" />
          <span className="font-medium text-azul text-sm">Recursos Humanos</span>
          <span className="ml-2 text-xs text-azul/80">
            {MOCK_ORCAMENTO.rh.gasto.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })} / {MOCK_ORCAMENTO.rh.orcamento.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
          </span>
          <Badge className="ml-auto bg-azul/90 text-white rounded-full px-2 py-0.5 text-xs font-semibold shadow">
            {rhPercent.toFixed(0)}%
          </Badge>
        </div>
        <div className="relative h-3 rounded-full bg-azul/10 overflow-hidden shadow-inner">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-azul to-azul/70 transition-all duration-700"
            style={{ width: `${rhPercent}%` }}
          />
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-4 w-4 text-green-700" />
          <span className="font-medium text-green-900 text-sm">Materiais e Equipamentos</span>
          <span className="ml-2 text-xs text-green-800">
            {MOCK_ORCAMENTO.materiais.gasto.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })} / {MOCK_ORCAMENTO.materiais.orcamento.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
          </span>
          <Badge className="ml-auto bg-green-600 text-white rounded-full px-2 py-0.5 text-xs font-semibold shadow">
            {matPercent.toFixed(0)}%
          </Badge>
        </div>
        <div className="relative h-3 rounded-full bg-green-100 overflow-hidden shadow-inner">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-700"
            style={{ width: `${matPercent}%` }}
          />
        </div>
      </div>
    </>
  );
}

export default ProgressoWorkpackage;
