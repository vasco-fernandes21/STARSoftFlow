"use client";

import { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Package, 
  Search, 
  ArrowUpDown, 
  X, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Mapeamento de rubricas para exibição amigável
const RUBRICA_LABELS: Record<string, string> = {
  MATERIAIS: "Materiais",
  SERVICOS_TERCEIROS: "Serviços Terceiros",
  OUTROS_SERVICOS: "Outros Serviços",
  DESLOCACAO_ESTADAS: "Deslocação e Estadas",
  OUTROS_CUSTOS: "Outros Custos",
  CUSTOS_ESTRUTURA: "Custos de Estrutura",
  INSTRUMENTOS_E_EQUIPAMENTOS: "Instrumentos e Equipamentos",
  SUBCONTRATOS: "Subcontratos",
};

// Cores para as rubricas
const RUBRICA_COLORS: Record<string, { bg: string; text: string; border: string; light: string }> = {
  MATERIAIS: { 
    bg: "bg-blue-50", 
    text: "text-blue-700", 
    border: "border-blue-200",
    light: "bg-blue-100/30" 
  },
  SERVICOS_TERCEIROS: { 
    bg: "bg-purple-50", 
    text: "text-purple-700", 
    border: "border-purple-200",
    light: "bg-purple-100/30" 
  },
  OUTROS_SERVICOS: { 
    bg: "bg-indigo-50", 
    text: "text-indigo-700", 
    border: "border-indigo-200",
    light: "bg-indigo-100/30" 
  },
  DESLOCACAO_ESTADAS: { 
    bg: "bg-amber-50", 
    text: "text-amber-700", 
    border: "border-amber-200",
    light: "bg-amber-100/30" 
  },
  OUTROS_CUSTOS: { 
    bg: "bg-emerald-50", 
    text: "text-emerald-700", 
    border: "border-emerald-200",
    light: "bg-emerald-100/30" 
  },
  CUSTOS_ESTRUTURA: { 
    bg: "bg-red-50", 
    text: "text-red-700", 
    border: "border-red-200",
    light: "bg-red-100/30" 
  },
  INSTRUMENTOS_E_EQUIPAMENTOS: { 
    bg: "bg-sky-50", 
    text: "text-sky-700", 
    border: "border-sky-200",
    light: "bg-sky-100/30" 
  },
  SUBCONTRATOS: { 
    bg: "bg-orange-50", 
    text: "text-orange-700", 
    border: "border-orange-200",
    light: "bg-orange-100/30" 
  },
};

export default function ProximosMateriais() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("mes");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({
    rubrica: "",
  });

  // Buscar dados de próximos materiais usando tRPC
  const { data: proximosMateriais, isLoading } = api.gestor.getProximosMateriais.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Filtrar e ordenar os dados
  const filteredAndSortedData = useMemo(() => {
    if (!proximosMateriais) return [];

    let data = [...proximosMateriais];

    // Aplicar filtros
    if (filters.rubrica) {
      data = data.filter(item => item.rubrica === filters.rubrica);
    }

    // Aplicar filtro de pesquisa
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      data = data.filter(
        (item) =>
          item.nome.toLowerCase().includes(searchTermLower) ||
          item.workpackage?.nome?.toLowerCase().includes(searchTermLower) ||
          item.workpackage?.projeto?.nome?.toLowerCase().includes(searchTermLower)
      );
    }

    // Ordenar dados
    data.sort((a, b) => {
      let aValue, bValue;

      switch (sortColumn) {
        case "nome":
          aValue = a.nome;
          bValue = b.nome;
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        case "projeto":
          aValue = a.workpackage?.projeto?.nome || "";
          bValue = b.workpackage?.projeto?.nome || "";
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        case "workpackage":
          aValue = a.workpackage?.nome || "";
          bValue = b.workpackage?.nome || "";
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        case "mes":
          // Ordenar primeiro por ano e depois por mês
          if (a.anoUtilizacao !== b.anoUtilizacao) {
            return sortDirection === "asc"
              ? a.anoUtilizacao - b.anoUtilizacao
              : b.anoUtilizacao - a.anoUtilizacao;
          }
          // Corrigindo o erro de TypeScript com valores possivelmente nulos
          const aMes = a.mes ?? 1;
          const bMes = b.mes ?? 1;
          return sortDirection === "asc"
            ? aMes - bMes
            : bMes - aMes;
        default:
          return 0;
      }
    });

    return data;
  }, [proximosMateriais, searchTerm, sortColumn, sortDirection, filters]);

  // Estatísticas para o cabeçalho
  const stats = useMemo(() => {
    if (!proximosMateriais) return { total: 0, pendentes: 0, adquiridos: 0 };
    
    const pendentes = proximosMateriais.filter(m => !m.estado).length;
    const adquiridos = proximosMateriais.filter(m => m.estado).length;
    
    return {
      total: proximosMateriais.length,
      pendentes,
      adquiridos
    };
  }, [proximosMateriais]);

  // Função para alternar ordenação
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Função para limpar filtros
  const clearFilters = () => {
    setSearchTerm("");
    setFilters({ rubrica: "" });
  };

  // Obter rubricas únicas para o filtro
  const uniqueRubricas = useMemo(() => {
    if (!proximosMateriais) return [];
    return Array.from(new Set(proximosMateriais.map(item => item.rubrica)));
  }, [proximosMateriais]);

  // Função para formatar mês/ano
  const formatarMesAno = (mes: number | null | undefined, ano: number) => {
    const meses = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];
    // Valor padrão para mês é 1 (Janeiro)
    return `${meses[(mes ?? 1) - 1]}/${ano}`;
  };

  // Função para renderizar o indicador de estado
  const getStatusIndicator = (estado: boolean) => {
    return (
      <div className="flex justify-center items-center">
        {estado ? (
          <div className="bg-emerald-100 rounded-full p-1.5 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        ) : (
          <div className="bg-slate-100 rounded-full p-1.5 text-slate-400">
            <Clock className="h-4 w-4" />
          </div>
        )}
      </div>
    );
  };

  // Função para obter badge de rubrica
  const getRubricaBadge = (rubrica: string) => {
    const label = RUBRICA_LABELS[rubrica] || rubrica;
    const colorClasses = RUBRICA_COLORS[rubrica] || {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
      light: "bg-gray-100/30"
    };

    return (
      <Badge
        variant="outline"
        className={cn(
          "border px-2 py-0.5 text-xs font-normal",
          colorClasses.bg,
          colorClasses.text,
          colorClasses.border
        )}
      >
        {label}
      </Badge>
    );
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden border-gray-100 bg-white shadow-md transition-all hover:shadow-lg">
      <CardHeader className="border-b border-slate-100 bg-white px-4 pb-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-md">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base font-medium text-slate-700">
                Próximos Materiais
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {stats.total} materiais • {stats.pendentes} pendentes • {stats.adquiridos} adquiridos
              </p>
            </div>
          </div>
          
          {/* Filtro de rubrica */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                <Filter className="h-3 w-3" />
                Filtrar por Rubrica
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filtrar por Rubrica</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setFilters(prev => ({ ...prev, rubrica: "" }))}
                className="text-xs"
              >
                Todas as Rubricas
              </DropdownMenuItem>
              {uniqueRubricas.map(rubrica => (
                <DropdownMenuItem 
                  key={rubrica} 
                  onClick={() => setFilters(prev => ({ ...prev, rubrica }))}
                  className="text-xs flex items-center gap-2"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    RUBRICA_COLORS[rubrica]?.bg || "bg-gray-100",
                    RUBRICA_COLORS[rubrica]?.border || "border-gray-200"
                  )} />
                  {RUBRICA_LABELS[rubrica] || rubrica}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Barra de pesquisa */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Procurar material, projeto ou workpackage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 rounded-md bg-white pl-8 text-xs shadow-sm"
            />
          </div>
          {(searchTerm || filters.rubrica) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
              <X className="mr-1 h-3 w-3" /> Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-slate-500">A carregar materiais...</p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <Table className="w-full">
              <TableHeader className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-sm">
                <TableRow className="border-slate-100">
                  <TableHead className="w-[5%] px-2 py-2 text-xs font-medium uppercase text-slate-500">
                    Estado
                  </TableHead>
                  <TableHead
                    className="cursor-pointer w-[30%] px-4 py-2 text-xs font-medium uppercase text-slate-500 transition-colors hover:text-slate-700"
                    onClick={() => handleSort("nome")}
                  >
                    <div className="flex items-center gap-1">
                      Material
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
                    className="cursor-pointer w-[35%] px-4 py-2 text-xs font-medium uppercase text-slate-500 transition-colors hover:text-slate-700"
                    onClick={() => handleSort("projeto")}
                  >
                    <div className="flex items-center gap-1">
                      Projeto / Workpackage
                      {sortColumn === "projeto" && (
                        <ArrowUpDown
                          className={cn(
                            "h-3 w-3 text-slate-400",
                            sortDirection === "desc" && "rotate-180"
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-[15%] px-4 py-2 text-xs font-medium uppercase text-slate-500">
                    Rubrica
                  </TableHead>
                  <TableHead
                    className="cursor-pointer w-[15%] px-4 py-2 text-xs font-medium uppercase text-slate-500 transition-colors hover:text-slate-700"
                    onClick={() => handleSort("mes")}
                  >
                    <div className="flex items-center gap-1">
                      Data
                      {sortColumn === "mes" && (
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
                    <TableRow key={item.id} className="border-slate-100/70 hover:bg-slate-50/50">
                      <TableCell className="px-2 py-2.5 text-center">
                        {getStatusIndicator(item.estado)}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-sm font-medium text-slate-700 truncate">
                        {item.nome}
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        <div className="text-xs text-slate-600">
                          <div className="font-medium text-slate-700 truncate">
                            {item.workpackage?.projeto?.nome || "N/A"}
                          </div>
                          <div className="text-slate-500 truncate">
                            {item.workpackage?.nome || "N/A"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        {getRubricaBadge(item.rubrica)}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-sm text-slate-600">
                        {formatarMesAno(item.mes, item.anoUtilizacao)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-sm text-slate-500">
                      {searchTerm || filters.rubrica
                        ? "Nenhum material encontrado para os filtros selecionados."
                        : "Nenhum material próximo encontrado."}
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