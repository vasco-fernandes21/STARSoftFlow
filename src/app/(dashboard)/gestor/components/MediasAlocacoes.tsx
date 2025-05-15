"use client";

import { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Search, ArrowUpDown, X, UserCircle2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

export default function MediasAlocacoes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<"nome" | "ocupacaoMedia">("ocupacaoMedia");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Buscar dados de alocações médias usando tRPC
  const { data: mediasAlocacoes, isLoading } = api.gestor.getMediasAlocacoes.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Filtrar e ordenar os dados
  const filteredAndSortedData = useMemo(() => {
    if (!mediasAlocacoes) return [];

    let data = [...mediasAlocacoes];

    // Aplicar filtro de pesquisa
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      data = data.filter(
        (item) =>
          item.nome?.toLowerCase().includes(searchTermLower) ||
          item.email?.toLowerCase().includes(searchTermLower)
      );
    }

    // Ordenar dados
    data.sort((a, b) => {
      if (sortColumn === "nome") {
        const aName = a.nome || "";
        const bName = b.nome || "";
        return sortDirection === "asc"
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName);
      } else {
        return sortDirection === "asc"
          ? a.ocupacaoMedia - b.ocupacaoMedia
          : b.ocupacaoMedia - a.ocupacaoMedia;
      }
    });

    return data;
  }, [mediasAlocacoes, searchTerm, sortColumn, sortDirection]);

  // Estatísticas de ocupação
  const stats = useMemo(() => {
    if (!mediasAlocacoes || mediasAlocacoes.length === 0) {
      return { total: 0, sobreAlocados: 0, otimizados: 0, subAlocados: 0 };
    }

    const total = mediasAlocacoes.length;
    const sobreAlocados = mediasAlocacoes.filter(item => item.ocupacaoMedia > 1).length;
    const otimizados = mediasAlocacoes.filter(item => item.ocupacaoMedia >= 0.85 && item.ocupacaoMedia <= 1).length;
    const subAlocados = mediasAlocacoes.filter(item => item.ocupacaoMedia < 0.7).length;

    return { total, sobreAlocados, otimizados, subAlocados };
  }, [mediasAlocacoes]);

  // Função para alternar ordenação
  const handleSort = (column: "nome" | "ocupacaoMedia") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Função para limpar filtro de pesquisa
  const clearSearch = () => {
    setSearchTerm("");
  };

  // Função para determinar a cor da barra de progresso com gradiente
  const getProgressColor = (occupation: number) => {
    const percentage = occupation * 100;
    if (percentage <= 50) return "bg-gradient-to-r from-red-600 to-red-500";
    if (percentage <= 70) return "bg-gradient-to-r from-amber-600 to-amber-500";
    if (percentage <= 85) return "bg-gradient-to-r from-blue-600 to-blue-500";
    return "bg-gradient-to-r from-emerald-600 to-emerald-500";
  };

  // Função para formatar o valor de ocupação como percentagem
  const formatOccupation = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  // Função para obter as iniciais do nome
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Determinar o mês e ano atual
  const hoje = new Date();
  const mesAtual = hoje.toLocaleDateString("pt-PT", { month: "long" });
  const anoAtual = hoje.getFullYear();

  return (
    <Card className="flex h-full flex-col overflow-hidden border-gray-100 bg-white shadow-md transition-all hover:shadow-lg">
      <CardHeader className="border-b border-slate-100 bg-white px-4 pb-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-md">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-base font-medium text-slate-700">
                Ocupação de Recursos
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {mesAtual} {anoAtual} • {stats.total} recursos humanos
              </p>
            </div>
          </div>
          
          {stats.total > 0 && (
            <div className="flex gap-2 text-xs">
              {stats.sobreAlocados > 0 && (
                <div className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-md">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{stats.sobreAlocados} sobre-alocados</span>
                </div>
              )}
              {stats.otimizados > 0 && (
                <div className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">
                  {stats.otimizados} otimizados
                </div>
              )}
              {stats.subAlocados > 0 && (
                <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                  {stats.subAlocados} sub-alocados
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Barra de pesquisa */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Procurar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 rounded-md bg-white pl-8 text-xs shadow-sm"
            />
          </div>
          {searchTerm && (
            <Button variant="ghost" size="sm" onClick={clearSearch} className="h-8 px-2 text-xs">
              <X className="mr-1 h-3 w-3" /> Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500"></div>
              <p className="text-sm">A carregar dados...</p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <Table className="w-full">
              <TableHeader className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-sm">
                <TableRow className="border-slate-100">
                  <TableHead
                    className="w-2/3 cursor-pointer px-4 py-3 text-xs font-medium uppercase text-slate-500 transition-colors hover:text-slate-700"
                    onClick={() => handleSort("nome")}
                  >
                    <div className="flex items-center gap-1">
                      Recurso
                      {sortColumn === "nome" && (
                        <ArrowUpDown
                          className={cn(
                            "h-3 w-3 text-slate-400",
                            sortDirection === "desc" && "rotate-180"
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="w-1/3 cursor-pointer px-4 py-3 text-xs font-medium uppercase text-slate-500 transition-colors hover:text-slate-700"
                    onClick={() => handleSort("ocupacaoMedia")}
                  >
                    <div className="flex items-center gap-1">
                      Ocupação
                      {sortColumn === "ocupacaoMedia" && (
                        <ArrowUpDown
                          className={cn(
                            "h-3 w-3 text-slate-400",
                            sortDirection === "desc" && "rotate-180"
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedData.length > 0 ? (
                  filteredAndSortedData.map((item) => (
                    <TableRow key={item.userId} className="border-slate-100/70 hover:bg-slate-50/50">
                      <TableCell className="px-4 py-3 text-sm font-normal text-slate-700">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border border-slate-200">
                            <AvatarFallback className="bg-slate-50 text-sm font-medium text-slate-600">
                              {getInitials(item.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.nome || "Sem nome"}</span>
                            <span className="text-xs text-slate-500">{item.email || "Sem email"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-900">
                              {formatOccupation(item.ocupacaoMedia)}
                            </span>
                            {item.ocupacaoMedia > 1 && (
                              <span className="text-xs text-red-600 font-medium">Sobre-alocado</span>
                            )}
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                getProgressColor(item.ocupacaoMedia)
                              )}
                              style={{
                                width: `${Math.min(item.ocupacaoMedia * 100, 110)}%`
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                        <UserCircle2 className="h-12 w-12 text-slate-300" />
                        <p className="text-sm font-medium">
                          {searchTerm
                            ? "Nenhum recurso encontrado para a pesquisa."
                            : "Nenhum recurso com alocação neste mês."}
                        </p>
                        {searchTerm && (
                          <Button variant="outline" size="sm" onClick={clearSearch} className="mt-2">
                            Limpar pesquisa
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 