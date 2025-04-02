"use client";

import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

// Currently not used but kept for reference and type documentation
// type EntregavelApiResponse = {
//   id: string;
//   nome: string;
//   descricao: string | null;
//   data: Date | null;
//   estado: boolean;
//   diasRestantes: number | null;
//   tarefa: {
//     id: string;
//     nome: string;
//     workpackage: {
//       id: string;
//       nome: string;
//       projeto: {
//         id: string;
//         nome: string;
//         responsavel: {
//           id: string;
//           name: string | null;
//         } | null;
//       };
//     };
//   };
// };

export function ProximosEntregaveis({ title = true }: { title?: boolean }) {
  const router = useRouter();
  const {} = usePermissions(); // Keep the hook but don't destructure unused variables

  // Default do limite de entregáveis para mostrar
  const limit = 4;

  // Buscar entregáveis próximos/atrasados considerando permissões do utilizador
  const { data: entregaveisProximos, isLoading } = api.entregavel.findProximos.useQuery({
    limit,
  });

  // Navegar para o projeto do entregável
  const handleEntregavelClick = (projetoId: string) => {
    router.push(`/projetos/${projetoId}`);
  };

  if (isLoading) {
    return <EntregaveisCarregando />;
  }

  return (
    <div className="space-y-3">
      {title && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-slate-700">Próximos Entregáveis</h3>
          <p className="text-xs text-slate-500">Entregáveis próximos ou atrasados</p>
        </div>
      )}

      {entregaveisProximos && entregaveisProximos.length > 0 ? (
        <>
          {entregaveisProximos.slice(0, 5).map((entregavel) => {
            const isPastDue = entregavel.diasRestantes !== null && entregavel.diasRestantes < 0;
            const isCloseToDeadline =
              entregavel.diasRestantes !== null &&
              entregavel.diasRestantes >= 0 &&
              entregavel.diasRestantes <= 3;
            const diasRestantes = entregavel.diasRestantes;

            return (
              <div
                key={entregavel.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50/50"
                onClick={() => handleEntregavelClick(entregavel.tarefa.workpackage.projeto.id)}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    isPastDue ? "bg-red-100" : isCloseToDeadline ? "bg-amber-100" : "bg-emerald-100"
                  )}
                >
                  <Circle
                    className={cn(
                      "h-5 w-5",
                      isPastDue
                        ? "text-red-600"
                        : isCloseToDeadline
                          ? "text-amber-600"
                          : "text-emerald-600"
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{entregavel.nome}</p>
                  <p className="text-xs text-slate-500">
                    Projeto: {entregavel.tarefa?.workpackage?.projeto?.nome || "N/A"} •
                    {isPastDue
                      ? ` Atrasado ${Math.abs(diasRestantes || 0)} ${Math.abs(diasRestantes || 0) === 1 ? "dia" : "dias"}`
                      : diasRestantes === 0
                        ? " Hoje"
                        : diasRestantes !== null
                          ? ` ${diasRestantes} dias`
                          : " Data indefinida"}
                  </p>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <EntregaveisVazios />
      )}
    </div>
  );
}

// Componente auxiliar para quando não há entregáveis
function EntregaveisVazios() {
  return (
    <div className="flex h-60 items-center justify-center">
      <p className="text-sm text-slate-500">Não há entregáveis próximos.</p>
    </div>
  );
}

// Componente de carregamento
function EntregaveisCarregando() {
  return (
    <div className="mt-2 space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
