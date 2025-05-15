"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Calendar, Package, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { api } from "@/trpc/react";

export default function ProximosEventos() {
  const { data: session } = useSession();
  const router = useRouter();

  // Consultar eventos próximos do utilizador
  const { data: proximosEventosData, isLoading } = api.dashboard.proximosEventos.useQuery(
    { 
      userId: session?.user?.id || "", 
      limit: 10 
    },
    { 
      enabled: !!session?.user?.id,
      staleTime: 1000 * 60 * 5 // 5 minutos
    }
  );

  // Processar dados dos próximos itens
  const proximosItens = useMemo(() => {
    if (!proximosEventosData?.eventos?.length) return [];
    
    return proximosEventosData.eventos.map((evento: any) => ({
      id: evento.id,
      tipo: evento.tipo,
      nome: evento.nome,
      dataLimite: evento.dataLimite,
      diasRestantes: evento.diasRestantes,
      projetoNome: evento.projeto.nome,
      projetoId: evento.projeto.id,
      workpackageNome: evento.workpackage.nome,
      workpackageId: evento.workpackage.id,
    }));
  }, [proximosEventosData]);

  return (
    <Card className="flex h-full flex-col overflow-hidden border-gray-100 bg-white shadow-md transition-all hover:shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-slate-700">
            Próximos Eventos
          </CardTitle>
        </div>
        <CardDescription className="text-xs text-slate-500">
          Tarefas e entregáveis ordenados por prazo
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50 scrollbar-thumb-rounded-full">
          {isLoading ? (
            <div className="space-y-4 pt-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg p-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-3/4 rounded bg-slate-100 animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : proximosItens.length === 0 ? (
            <div className="flex h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <Calendar className="mb-3 h-12 w-12 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">Nenhum evento próximo</p>
              <p className="mt-1 text-xs text-slate-400">Tarefas e entregáveis aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {proximosItens.map((item) => {
                const diasRestantes = item.diasRestantes ?? null;
                const atrasado = typeof diasRestantes === 'number' && diasRestantes < 0;
                
                let dataExibicao = "";
                if (item.dataLimite) {
                  const data = new Date(item.dataLimite);
                  dataExibicao = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short' }).format(data);
                }
                
                const prazoTexto = 
                  diasRestantes === null || diasRestantes === undefined ? "Sem prazo" :
                  atrasado ? `${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) !== 1 ? "s" : ""} atraso` :
                  diasRestantes === 0 ? "Hoje" :
                  diasRestantes === 1 ? "Amanhã" :
                  `Faltam ${diasRestantes} dias`;
                  
                return (
                  <div 
                    key={`${item.tipo}-${item.id}`} 
                    className="group flex cursor-pointer items-center gap-3 rounded-lg border border-transparent p-3 transition-colors duration-150 hover:border-slate-100 hover:bg-slate-50/80"
                    onClick={() => item.tipo === 'tarefa' 
                      ? router.push(`/projetos/${item.projetoId}?tab=tarefas`) 
                      : router.push(`/projetos/${item.projetoId}?tab=entregaveis`)}
                  >
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full 
                        ${item.tipo === "entregavel"
                          ? atrasado ? "bg-red-100 text-red-700" : diasRestantes !== null && diasRestantes <= 3 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                        }`}
                    >
                      {item.tipo === "entregavel" ? (
                        <Package className="h-4 w-4" />
                      ) : (
                        <Calendar className="h-4 w-4" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium text-slate-800 group-hover:text-blue-700">
                          {item.nome}
                        </p>
                        {dataExibicao && (
                          <span className="ml-2 flex-shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 group-hover:bg-slate-200">
                            {dataExibicao}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-0.5 flex flex-col xs:flex-row xs:items-center text-xs">
                        <span className="truncate text-slate-500">
                          {item.projetoNome}
                        </span>
                        
                        <div className="hidden xs:flex xs:items-center">
                          <span className="mx-1.5 h-0.5 w-0.5 rounded-full bg-slate-300"></span>
                          
                          <span className={`font-medium 
                            ${atrasado ? "text-red-600" : typeof diasRestantes === 'number' && diasRestantes <= 3 ? "text-amber-600" : "text-slate-500"}
                          `}>
                            {prazoTexto}
                          </span>
                        </div>
                        
                        <span className={`xs:hidden font-medium 
                          ${atrasado ? "text-red-600" : typeof diasRestantes === 'number' && diasRestantes <= 3 ? "text-amber-600" : "text-slate-500"}
                        `}>
                          {prazoTexto}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 