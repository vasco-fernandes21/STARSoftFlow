import React from "react";
import { Badge } from "@/components/ui/badge";
import { Users, Package, Euro } from "lucide-react";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ProgressoWorkpackageProps {
  projetoId: string;
  workpackageId: string;
}

// Helper function to format currency
const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

export function ProgressoWorkpackage({ projetoId, workpackageId }: ProgressoWorkpackageProps) {

  const { data: comparacaoData, isLoading, error } = api.financas.getComparacaoGastos.useQuery(
    { projetoId },
    // We fetch data for the whole project, then filter for the specific workpackage
    {
        enabled: !!projetoId, // Only run the query if projetoId is truthy
    }
  );

  // Find the specific workpackage data
  const workpackageData = comparacaoData?.workpackages.find(wp => wp.id === workpackageId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-full" />
        </div>
         <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-full" />
        </div>
      </div>
    );
  }

  if (error || !comparacaoData || !workpackageData) {
    return (
       <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>
          Não foi possível carregar o progresso financeiro. {error?.message}
        </AlertDescription>
      </Alert>
    );
  }

  const isETIBased = comparacaoData.estimativaBaseadaEmETI;


  // --- Calculations ---
  let rhOrcamento = 0;
  let rhGasto = 0;
  let matOrcamento = 0;
  let matGasto = 0;
  let etiOrcamento = 0;
  let etiGasto = 0;

  if (isETIBased) {
    etiOrcamento = workpackageData.recursos.estimado; // ETI budget is stored in 'estimado' for resources
    etiGasto = workpackageData.recursos.real + workpackageData.materiais.totalReal; // Actual spent is sum of real resources and materials
  } else {
    rhOrcamento = workpackageData.recursos.estimado;
    rhGasto = workpackageData.recursos.real;
    matOrcamento = workpackageData.materiais.totalEstimado;
    matGasto = workpackageData.materiais.totalReal;
  }

  const rhPercent = rhOrcamento > 0 ? Math.min((rhGasto / rhOrcamento) * 100, 100) : 0;
  const matPercent = matOrcamento > 0 ? Math.min((matGasto / matOrcamento) * 100, 100) : 0;
  const etiPercent = etiOrcamento > 0 ? Math.min((etiGasto / etiOrcamento) * 100, 100) : 0;


  return (
    <>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Progresso Financeiro</h2>
        <p className="text-sm text-gray-500">
            {isETIBased ? "Comparação entre orçamento (base ETI) e gastos reais." : "Comparação entre orçamento estimado e gastos reais."}
        </p>
      </div>

      {isETIBased ? (
        // --- ETI BASED VIEW ---
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Euro className="h-4 w-4 text-purple-700" />
            <span className="font-medium text-purple-900 text-sm">Orçamento (Base ETI)</span>
            <span className="ml-2 text-xs text-purple-800">
              {formatCurrency(etiGasto)} / {formatCurrency(etiOrcamento)}
            </span>
            <Badge className="ml-auto bg-purple-600 text-white rounded-full px-2 py-0.5 text-xs font-semibold shadow">
              {etiPercent.toFixed(0)}%
            </Badge>
          </div>
          <div className="relative h-3 rounded-full bg-purple-100 overflow-hidden shadow-inner">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-700"
              style={{ width: `${etiPercent}%` }}
            />
          </div>
        </div>
      ) : (
        // --- DETAILED VIEW ---
        <>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-azul/70" />
              <span className="font-medium text-azul text-sm">Recursos Humanos</span>
              <span className="ml-2 text-xs text-azul/80">
                {formatCurrency(rhGasto)} / {formatCurrency(rhOrcamento)}
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
                {formatCurrency(matGasto)} / {formatCurrency(matOrcamento)}
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
      )}
    </>
  );
}

export default ProgressoWorkpackage;
