"use client";

import { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import { Users, Calendar, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

// --- Type Definitions ---
interface ProjetoRecursosProps {
  projetoId: string;
  ocupacaoMensal?: Array<{
    userId: string;
    mes: number;
    ocupacaoAprovada: number;
    ocupacaoPendente: number;
  }>;
}

// --- Formatter Functions ---
const formatEti = (value: number): string => {
  return value.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const ProjetoRecursos = ({ projetoId, ocupacaoMensal = [] }: ProjetoRecursosProps) => {
  // Estados
  const [selectedYear, setSelectedYear] = useState<string>("todos");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedResource, setSelectedResource] = useState<string | null>(null);

  // Buscar dados do projeto
  const { data: projeto, isLoading } = api.projeto.findById.useQuery(projetoId, {
    enabled: !!projetoId,
  });

  // Processar alocações por recurso
  const recursosProcessados = useMemo(() => {
    if (!projeto?.workpackages) return [];

    const recursosMap = new Map();

    projeto.workpackages.forEach((wp) => {
      const recursos = selectedYear === "todos" 
          ? wp.recursos
        : wp.recursos.filter(r => r.ano === parseInt(selectedYear, 10));

      recursos.forEach((recurso) => {
        if (!recursosMap.has(recurso.userId)) {
          recursosMap.set(recurso.userId, {
            id: recurso.userId,
            nome: recurso.user.name || "Utilizador Desconhecido",
            iniciais: (recurso.user.name?.charAt(0) || "U").toUpperCase(),
            totalEtis: 0,
            periodos: 0,
          });
        }

        const dados = recursosMap.get(recurso.userId);
        dados.totalEtis += Number(recurso.ocupacao);
        dados.periodos += 1;
      });
    });

    // Manter o total absoluto em vez de calcular média
    return Array.from(recursosMap.values())
      .map(r => ({
        ...r,
        mediaEtis: r.totalEtis // Agora guardamos o total em vez da média
      }))
      .sort((a, b) => sortOrder === "desc" 
        ? b.mediaEtis - a.mediaEtis 
        : a.mediaEtis - b.mediaEtis);
  }, [projeto, selectedYear, sortOrder]);

  // Anos disponíveis
  const anosDisponiveis = useMemo(() => {
    if (!projeto?.workpackages) return [];
    const anos = new Set<number>();
    projeto.workpackages.forEach(wp => {
      wp.recursos.forEach(r => anos.add(r.ano));
    });
    return Array.from(anos).sort((a, b) => b - a);
  }, [projeto]);

  // Processar alocações por workpackage do recurso selecionado
  const workpackageAlocacoes = useMemo(() => {
    if (!projeto?.workpackages || !selectedResource) return [];

    return projeto.workpackages
      .map(wp => {
        const recursos = selectedYear === "todos" 
          ? wp.recursos 
          : wp.recursos.filter(r => r.ano === parseInt(selectedYear, 10));

        const recursoAlocacoes = recursos
          .filter(r => r.userId === selectedResource)
          .reduce((total, r) => total + Number(r.ocupacao), 0);

        return {
          id: wp.id,
          nome: wp.nome,
          eti: recursoAlocacoes,
        };
      })
      .filter(wp => wp.eti > 0)
      .sort((a, b) => b.eti - a.eti);
  }, [projeto, selectedResource, selectedYear]);

  // Encontrar nome do recurso selecionado
  const selectedResourceName = useMemo(() => {
    if (!selectedResource) return "";
    const recurso = recursosProcessados.find(r => r.id === selectedResource);
    return recurso?.nome || "";
  }, [selectedResource, recursosProcessados]);

  // Loading state
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

    return (
    <div className="animate-fade-in space-y-8">
      {/* Header com Filtros */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Recursos Humanos
          </h1>
          <p className="text-sm text-gray-500">
            {recursosProcessados.length} recursos alocados ao projeto
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-9 w-[160px] rounded-full border-slate-200 bg-white/50 text-sm shadow-sm backdrop-blur-sm">
              <Calendar className="mr-2 h-4 w-4 text-slate-400" />
              <SelectValue placeholder="Filtrar por ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Anos</SelectItem>
              {anosDisponiveis.map(ano => (
                <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
            ))}
          </SelectContent>
        </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            className="h-9 rounded-full border-slate-200 bg-white/50 text-sm shadow-sm backdrop-blur-sm"
          >
            <ArrowUpDown className="mr-2 h-4 w-4 text-slate-400" />
            {sortOrder === "desc" ? "Maior ETI" : "Menor ETI"}
          </Button>
                  </div>
                  </div>

      {/* Grid de Recursos */}
      {recursosProcessados.length > 0 ? (
        <div className="grid gap-4">
          {recursosProcessados.map((recurso) => (
            <div key={recurso.id} className="group space-y-2">
              <Card 
                className="group relative cursor-pointer overflow-hidden transition-all hover:shadow-md"
                onClick={() => setSelectedResource(selectedResource === recurso.id ? null : recurso.id)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-white/90 backdrop-blur-[2px]" />
                <div className="relative flex items-center gap-4 p-4">
                  <Avatar className="h-12 w-12 rounded-xl border-2 border-white bg-gradient-to-br from-slate-100 to-slate-50 shadow-sm">
                    <AvatarFallback className="rounded-xl text-sm font-medium text-slate-600">
                      {recurso.iniciais}
                                  </AvatarFallback>
                                </Avatar>
                  <div className="flex flex-1 items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-slate-700 group-hover:text-slate-900">
                        {recurso.nome}
                      </p>
                      <Badge 
                        variant="outline" 
                        className="border-emerald-200 bg-emerald-50 px-2.5 text-emerald-700"
                      >
                        {formatEti(recurso.mediaEtis)} ETI
                      </Badge>
                  </div>
                    {selectedResource === recurso.id ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>
            </Card>

              {selectedResource === recurso.id && (
                <div 
                  className="animate-in slide-in-from-top-1 duration-200 rounded-xl border border-slate-100 bg-slate-50/50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-medium text-slate-900">
                      Alocações por Work Package
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {workpackageAlocacoes.length} WPs
                          </Badge>
                    </div>

                  <div className="space-y-2">
                    {workpackageAlocacoes
                      .filter(wp => wp.eti > 0)
                      .map((wp) => (
                        <div 
                          key={wp.id}
                          className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {wp.nome}
                            </p>
                                </div>
                                <Badge
                            variant="outline" 
                            className="ml-4 border-emerald-200 bg-emerald-50 px-2.5 text-emerald-700"
                          >
                            {formatEti(wp.eti)} ETI
                                </Badge>
                        </div>
                    ))}

                    {workpackageAlocacoes.length === 0 && (
                      <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-4">
                        <p className="text-sm text-slate-500">
                          Nenhuma alocação encontrada
                          {selectedYear !== "todos" && " para o ano selecionado"}
                        </p>
                                    </div>
                                  )}
                                </div>
                </div>
                                  )}
                                </div>
          ))}
                  </div>
                ) : (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <div className="text-center">
            <Users className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-600">
              Nenhum recurso alocado
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {selectedYear !== "todos" 
                ? "Tente selecionar um ano diferente" 
                : "Adicione recursos ao projeto para começar"}
                            </p>
                          </div>
                          </div>
      )}

      {/* Gráfico de ETIs */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <h2 className="font-semibold text-slate-700">
            Distribuição de ETIs por Recurso
          </h2>
                          </div>
        <div className="h-[300px] p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
              data={recursosProcessados}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={(value) => formatEti(value)} />
              <YAxis 
                dataKey="nome" 
                type="category" 
                width={150}
                tick={{ fontSize: 12 }}
              />
                        <RechartsTooltip
                formatter={(value: number) => [formatEti(value), "ETI"]}
                        />
                        <Bar
                dataKey="mediaEtis"
                fill="#10b981"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
              </Card>
            </div>
  );
};

export default ProjetoRecursos;
