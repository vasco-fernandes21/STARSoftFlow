"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

// Tipagem para o entregável retornado pela API
type EntregavelAlerta = {
  id: string;
  nome: string;
  descricao: string | null;
  data: Date | null;
  estado: boolean;
  diasRestantes: number | null;
  tarefa: {
    id: string;
    nome: string;
    workpackage: {
      id: string;
      nome: string;
      projeto: {
        id: string;
        nome: string;
        responsavel: {
          id: string;
          name: string | null;
        } | null;
      }
    }
  };
};

export function EntregaveisEmAlerta({ title = true }: { title?: boolean }) {
  const router = useRouter();
  const { } = usePermissions();

  // Default do limite de entregáveis para mostrar
  const limit = 4;

  // Buscar entregáveis próximos/atrasados considerando permissões do utilizador
  const { data: entregaveisProximos, isLoading } = api.entregavel.findProximos.useQuery({
    limit
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
          <h3 className="text-sm font-medium text-slate-700">Entregáveis em Alerta</h3>
          <p className="text-xs text-slate-500">Entregáveis próximos ou atrasados</p>
        </div>
      )}
      
      {entregaveisProximos && entregaveisProximos.length > 0 ? (
        <>
          {entregaveisProximos.slice(0, 5).map((alerta) => (
            <div 
              key={alerta.id} 
              className="p-3 hover:bg-slate-50/50 transition-colors rounded-lg cursor-pointer"
              onClick={() => handleEntregavelClick(alerta.tarefa.workpackage.projeto.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    alerta.diasRestantes && alerta.diasRestantes < 0 ? "bg-red-100" :
                    alerta.diasRestantes && alerta.diasRestantes < 3 ? "bg-amber-100" : "bg-emerald-100"
                  )}>
                    <AlertTriangle className={cn(
                      "h-4 w-4",
                      alerta.diasRestantes && alerta.diasRestantes < 0 ? "text-red-600" :
                      alerta.diasRestantes && alerta.diasRestantes < 3 ? "text-amber-600" : "text-emerald-600"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{alerta.nome}</p>
                    <p className="text-xs text-slate-500">
                      {alerta.tarefa?.workpackage?.projeto?.nome || "Projeto não definido"}
                    </p>
                  </div>
                </div>
                <Badge 
                  variant={alerta.diasRestantes && alerta.diasRestantes < 0 ? "destructive" : "outline"} 
                  className="text-xs"
                >
                  {alerta.diasRestantes && alerta.diasRestantes < 0 
                    ? `${Math.abs(alerta.diasRestantes)} dias atrasado` 
                    : alerta.diasRestantes ? `${alerta.diasRestantes} dias restantes` : "Data indefinida"}
                </Badge>
              </div>
            </div>
          ))}
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
    <div className="flex items-center justify-center h-60">
      <p className="text-slate-500 text-sm">Não existem entregáveis em alerta</p>
    </div>
  );
}

// Componente de carregamento
function EntregaveisCarregando() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 