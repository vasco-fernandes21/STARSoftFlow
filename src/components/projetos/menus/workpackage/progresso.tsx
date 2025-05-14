import React from "react";
import { Badge } from "@/components/ui/badge";
import { Users, Package, Euro } from "lucide-react";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ProgressoWorkpackageProps {
  projetoId: string;
  workpackageId: string; 
}

export function ProgressoWorkpackage({ projetoId, workpackageId }: ProgressoWorkpackageProps) {

  const { data: painelProjetoData, isLoading, error } = api.financas.getPainelFinanceiroProjeto.useQuery(
    { projetoId },
    {
        enabled: !!projetoId, 
    }
  );

  // Encontrar os dados específicos do workpackage
  const workpackageData = painelProjetoData?.detalhesPorWorkpackage?.find(wp => wp.workpackageId === workpackageId);

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

  if (error || !painelProjetoData) {
    return (
       <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro nos Dados do Projeto</AlertTitle>
        <AlertDescription>
          Não foi possível carregar o progresso financeiro do projeto. {error?.message}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!workpackageData) {
     return (
       <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Dados do Workpackage Não Encontrados</AlertTitle>
        <AlertDescription>
          Não foram encontrados dados financeiros específicos para este workpackage.
        </AlertDescription>
      </Alert>
    );
  }

  const isETIBased = painelProjetoData.tipoCalculoPrevisto === 'ETI_DB';
  const realizadoRecursosWP = workpackageData.realizadoRecursos ?? 0;
  const realizadoMateriaisWP = workpackageData.realizadoMateriais ?? 0;

  // --- Calculations ---
  let totalOrcamento = 0;
  let totalGasto = 0;

  let rhOrcamento = 0;
  let rhGasto = 0;
  let matOrcamento = 0;
  let matGasto = 0;

  if (isETIBased) {
    totalOrcamento = workpackageData.orcamentoPrevistoComETI ?? 0;
    totalGasto = realizadoRecursosWP + realizadoMateriaisWP; // Para ETI, o gasto é a soma do real de recursos e materiais do WP
  } else {
    rhOrcamento = workpackageData.previstoRecursosSnapshot ?? 0;
    rhGasto = realizadoRecursosWP;
    matOrcamento = workpackageData.previstoMateriaisSnapshot ?? 0;
    matGasto = realizadoMateriaisWP;
  }

  const totalPercent = totalOrcamento > 0 ? Math.min((totalGasto / totalOrcamento) * 100, 100) : 0;
  const rhPercent = rhOrcamento > 0 ? Math.min((rhGasto / rhOrcamento) * 100, 100) : 0;
  const matPercent = matOrcamento > 0 ? Math.min((matGasto / matOrcamento) * 100, 100) : 0;

  return (
    <>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Progresso Financeiro do Workpackage</h2>
        <p className="text-sm text-gray-500">
            {isETIBased 
                ? `Comparação entre orçamento (base ETI) e gastos reais.` 
                : `Comparação entre orçamento estimado e gastos reais.`}
        </p>
      </div>

      {isETIBased ? (
        // --- ETI BASED VIEW (SINGLE BAR) ---
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Euro className="h-4 w-4 text-azul/70" />
            <span className="font-medium text-azul text-sm">Custos Totais (Workpackage)</span>
            <span className="ml-2 text-xs text-azul/80">
              {formatCurrency(totalGasto)} / {formatCurrency(totalOrcamento)}
            </span>
            <Badge className="ml-auto bg-azul/90 text-white rounded-full px-2 py-0.5 text-xs font-semibold shadow">
              {totalPercent.toFixed(0)}%
            </Badge>
          </div>
          <div className="relative h-3 rounded-full bg-azul/10 overflow-hidden shadow-inner">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-azul to-azul/70 transition-all duration-700"
              style={{ width: `${totalPercent}%` }}
            />
          </div>
        </div>
      ) : (
        // --- DETAILED VIEW (TWO BARS) ---
        <>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-azul/70" />
              <span className="font-medium text-azul text-sm">Recursos Humanos (Workpackage)</span>
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
              <span className="font-medium text-green-900 text-sm">Materiais e Equip. (Workpackage)</span>
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
