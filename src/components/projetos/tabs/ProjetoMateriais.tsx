"use client";

import { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import { Check, Filter, Package, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Rubrica } from "@prisma/client";
import { useMutations } from "@/hooks/useMutations";
import { cn } from "@/lib/utils";

interface ProjetoMateriaisProps {
  projetoId: string;
}

// Mapeamento de rubricas para exibição amigável
const RUBRICA_LABELS: Record<Rubrica, string> = {
  MATERIAIS: "Materiais",
  SERVICOS_TERCEIROS: "Serviços Terceiros",
  OUTROS_SERVICOS: "Outros Serviços",
  DESLOCACAO_ESTADIAS: "Deslocação e Estadias",
  OUTROS_CUSTOS: "Outros Custos",
  CUSTOS_ESTRUTURA: "Custos de Estrutura",
};

// Cores para as rubricas
const RUBRICA_COLORS: Record<Rubrica, { bg: string; text: string; border: string }> = {
  MATERIAIS: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  SERVICOS_TERCEIROS: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  OUTROS_SERVICOS: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  DESLOCACAO_ESTADIAS: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  OUTROS_CUSTOS: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  CUSTOS_ESTRUTURA: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

// Formatar valor monetário
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
};

export default function ProjetoMateriais({ projetoId }: ProjetoMateriaisProps) {
  // Estados
  const [searchTerm, setSearchTerm] = useState("");
  const [rubricaFilter, setRubricaFilter] = useState<string>("todas");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [anoFilter, setAnoFilter] = useState<string>("todos");

  // Obter mutations do hook
  const { material: materialMutations } = useMutations(projetoId);

  // Query principal para buscar o projeto
  const {
    data: projeto,
    isLoading,
    error,
  } = api.projeto.findById.useQuery(projetoId, {
    enabled: !!projetoId,
  });

  // Função para alternar o estado de um material
  const toggleEstadoMaterial = (materialId: number, estadoAtual: boolean) => {
    // Obter o workpackageId do material correspondente
    const material = materiaisFiltrados.find((m) => m.id === materialId);
    if (!material) {
      toast.error("Material não encontrado");
      return;
    }
    materialMutations.handleToggleEstado(
      materialId,
      !estadoAtual,
      material.workpackageId,
      materialMutations
    );
  };

  // Dados processados
  const materiaisFiltrados = useMemo(() => {
    if (!projeto?.workpackages) return [];

    // Coletar todos os materiais de todos os workpackages
    let materiais = projeto.workpackages.flatMap((wp) => {
      return wp.materiais.map((material) => ({
        ...material,
        workpackageName: wp.nome,
        workpackageId: wp.id,
      }));
    });

    // Aplicar filtros
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      materiais = materiais.filter(
        (material) =>
          material.nome.toLowerCase().includes(searchLower) ||
          material.descricao?.toLowerCase().includes(searchLower) ||
          material.workpackageName.toLowerCase().includes(searchLower)
      );
    }

    if (rubricaFilter !== "todas") {
      materiais = materiais.filter((material) => material.rubrica === rubricaFilter);
    }

    if (estadoFilter !== "todos") {
      const estado = estadoFilter === "concluidos";
      materiais = materiais.filter((material) => material.estado === estado);
    }

    if (anoFilter !== "todos") {
      const ano = parseInt(anoFilter, 10);
      materiais = materiais.filter((material) => material.ano_utilizacao === ano);
    }

    return materiais;
  }, [projeto, searchTerm, rubricaFilter, estadoFilter, anoFilter]);

  // Estatísticas
  const estatisticas = useMemo(() => {
    if (!projeto?.workpackages)
      return {
        total: 0,
        concluidos: 0,
        pendentes: 0,
        valorTotal: 0,
        valorConcluido: 0,
        anosDisponiveis: [],
      };

    const materiais = projeto.workpackages.flatMap((wp) => wp.materiais);
    const concluidos = materiais.filter((m) => m.estado).length;
    const valorTotal = materiais.reduce((sum, m) => sum + Number(m.preco) * m.quantidade, 0);
    const valorConcluido = materiais
      .filter((m) => m.estado)
      .reduce((sum, m) => sum + Number(m.preco) * m.quantidade, 0);

    // Anos disponíveis
    const anosSet = new Set<number>();
    materiais.forEach((m) => anosSet.add(m.ano_utilizacao));
    const anosDisponiveis = Array.from(anosSet).sort((a, b) => a - b);

    return {
      total: materiais.length,
      concluidos,
      pendentes: materiais.length - concluidos,
      valorTotal,
      valorConcluido,
      anosDisponiveis,
    };
  }, [projeto]);

  // Estados de loading e erro
  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        {/* Skeleton para cabeçalho */}
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-10 w-1/3" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
        {/* Skeleton para estatísticas */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        {/* Skeleton para filtros */}
        <Skeleton className="mb-6 h-16 w-full rounded-xl" />
        {/* Skeleton para tabela */}
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !projeto) {
    return (
      <div className="rounded-lg bg-red-50 p-8 text-center text-red-500">
        Erro ao carregar dados dos materiais: {error?.message || "Projeto não encontrado"}
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 p-1">
      {/* Cabeçalho */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Materiais e Serviços
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestão de materiais, serviços e outros custos do projeto.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center space-x-2">
          <Badge
            variant="outline"
            className="rounded-full border-blue-200 bg-blue-50/80 px-3 py-1.5 text-sm font-medium text-blue-800 shadow-sm"
          >
            {estatisticas.total} {estatisticas.total !== 1 ? "Itens" : "Item"}
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-sm font-medium text-emerald-800 shadow-sm"
          >
            {formatCurrency(estatisticas.valorTotal)}
          </Badge>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-100/50 bg-white/70 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
          <div className="flex-shrink-0 rounded-full border border-blue-100 bg-blue-50 p-3 shadow-inner">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total de Itens</p>
            <div className="mt-1 text-xl font-semibold text-slate-700">{estatisticas.total}</div>
          </div>
        </div>
        {/* Concluídos */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-100/50 bg-white/70 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
          <div className="flex-shrink-0 rounded-full border border-emerald-100 bg-emerald-50 p-3 shadow-inner">
            <Check className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Concluídos</p>
            <div className="mt-1 text-xl font-semibold text-emerald-600">
              {estatisticas.concluidos}
            </div>
            <p className="text-xs text-gray-500">
              {Math.round((estatisticas.concluidos / estatisticas.total) * 100) || 0}% do total
            </p>
          </div>
        </div>
        {/* Pendentes */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-100/50 bg-white/70 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
          <div className="flex-shrink-0 rounded-full border border-amber-100 bg-amber-50 p-3 shadow-inner">
            <X className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Pendentes</p>
            <div className="mt-1 text-xl font-semibold text-amber-600">
              {estatisticas.pendentes}
            </div>
            <p className="text-xs text-gray-500">
              {Math.round((estatisticas.pendentes / estatisticas.total) * 100) || 0}% do total
            </p>
          </div>
        </div>
        {/* Valor Total */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-100/50 bg-white/70 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
          <div className="flex-shrink-0 rounded-full border border-purple-100 bg-purple-50 p-3 shadow-inner">
            <svg
              className="h-5 w-5 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Valor Total</p>
            <div className="mt-1 text-xl font-semibold text-purple-600">
              {formatCurrency(estatisticas.valorTotal)}
            </div>
            <p className="text-xs text-gray-500">
              {formatCurrency(estatisticas.valorConcluido)} concluído
            </p>
          </div>
        </div>
      </div>

      {/* Filtros e Pesquisa */}
      <div className="mb-6 rounded-xl border border-slate-200/50 bg-gradient-to-r from-white/60 to-slate-50/60 p-4 shadow-sm backdrop-blur-md">
        <div className="flex flex-col items-center gap-4 md:flex-row">
          {/* Pesquisa */}
          <div className="relative w-full flex-1 md:w-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Pesquisar por nome, descrição, workpackage..."
              className="w-full rounded-full border-gray-200 bg-white/80 py-2 pl-10 pr-4 text-sm text-gray-700 shadow-sm transition-all duration-300 ease-in-out hover:shadow focus:ring-2 focus:ring-emerald-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtros Dropdown */}
          <div className="flex w-full flex-shrink-0 flex-wrap justify-start gap-3 md:w-auto md:justify-end">
            <Select value={rubricaFilter} onValueChange={setRubricaFilter}>
              <SelectTrigger className="w-full rounded-full bg-white/80 text-xs text-gray-600 shadow-sm transition-all duration-300 ease-in-out hover:bg-gray-50/80 hover:text-emerald-500 hover:shadow sm:w-[170px]">
                <Filter className="mr-2 h-3.5 w-3.5 text-gray-400" />
                <SelectValue placeholder="Rubrica" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-100/80 bg-white/95 shadow-lg backdrop-blur-sm">
                <SelectItem value="todas">Todas as Rubricas</SelectItem>
                {Object.entries(RUBRICA_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-full rounded-full bg-white/80 text-xs text-gray-600 shadow-sm transition-all duration-300 ease-in-out hover:bg-gray-50/80 hover:text-emerald-500 hover:shadow sm:w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-100/80 bg-white/95 shadow-lg backdrop-blur-sm">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendentes">Pendentes</SelectItem>
                <SelectItem value="concluidos">Concluídos</SelectItem>
              </SelectContent>
            </Select>

            {estatisticas.anosDisponiveis.length > 0 && (
              <Select value={anoFilter} onValueChange={setAnoFilter}>
                <SelectTrigger className="w-full rounded-full bg-white/80 text-xs text-gray-600 shadow-sm transition-all duration-300 ease-in-out hover:bg-gray-50/80 hover:text-emerald-500 hover:shadow sm:w-[130px]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-slate-100/80 bg-white/95 shadow-lg backdrop-blur-sm">
                  <SelectItem value="todos">Todos os Anos</SelectItem>
                  {estatisticas.anosDisponiveis.map((ano) => (
                    <SelectItem key={ano} value={ano.toString()}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Filtros Ativos e Botão Limpar */}
        {(rubricaFilter !== "todas" || estadoFilter !== "todos" || anoFilter !== "todos") && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/60 pt-3 duration-300 ease-in-out animate-in fade-in slide-in-from-top-2">
            <span className="mr-2 text-xs text-gray-500">Filtros ativos:</span>
            {rubricaFilter !== "todas" && (
              <Badge
                variant="outline"
                className="flex h-7 items-center gap-1.5 rounded-full border-blue-200 bg-blue-50 px-2.5 text-xs text-blue-600 transition-all duration-300 ease-in-out hover:border-blue-300 hover:bg-blue-100"
              >
                <span>{RUBRICA_LABELS[rubricaFilter as Rubrica]}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRubricaFilter("todas")}
                  className="h-4 w-4 rounded-full p-0 transition-colors duration-200 ease-in-out hover:bg-blue-100/70 hover:text-blue-700"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}
            {estadoFilter !== "todos" && (
              <Badge
                variant="outline"
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs transition-all duration-300 ease-in-out",
                  estadoFilter === "concluidos"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-100"
                    : "border-amber-200 bg-amber-50 text-amber-600 hover:border-amber-300 hover:bg-amber-100"
                )}
              >
                <span>{estadoFilter === "concluidos" ? "Concluídos" : "Pendentes"}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEstadoFilter("todos")}
                  className={cn(
                    "h-4 w-4 rounded-full p-0 transition-colors duration-200 ease-in-out",
                    estadoFilter === "concluidos"
                      ? "hover:bg-emerald-100/70 hover:text-emerald-700"
                      : "hover:bg-amber-100/70 hover:text-amber-700"
                  )}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}
            {anoFilter !== "todos" && (
              <Badge
                variant="outline"
                className="flex h-7 items-center gap-1.5 rounded-full border-purple-200 bg-purple-50 px-2.5 text-xs text-purple-600 transition-all duration-300 ease-in-out hover:border-purple-300 hover:bg-purple-100"
              >
                <span>Ano: {anoFilter}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAnoFilter("todos")}
                  className="h-4 w-4 rounded-full p-0 transition-colors duration-200 ease-in-out hover:bg-purple-100/70 hover:text-purple-700"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRubricaFilter("todas");
                setEstadoFilter("todos");
                setAnoFilter("todos");
                setSearchTerm(""); // Limpar também a pesquisa
              }}
              className="ml-auto h-7 rounded-full px-2.5 text-xs text-slate-500 transition-all duration-300 ease-in-out hover:bg-slate-100/70 hover:text-emerald-500"
            >
              <X className="mr-1 h-2.5 w-2.5" />
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      {/* Tabela de Materiais */}
      <div className="overflow-hidden rounded-xl border border-slate-200/50 bg-white/70 shadow-sm backdrop-blur-sm">
        {materiaisFiltrados.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader className="sticky top-0 z-[1] bg-slate-50/80 backdrop-blur-sm">
                {" "}
                {/* Cabeçalho fixo */}
                <TableRow className="border-b border-slate-200/60 hover:bg-transparent">
                  <TableHead className="w-[50px] px-3 py-2.5 font-semibold text-slate-600">
                    Estado
                  </TableHead>
                  <TableHead className="min-w-[150px] px-3 py-2.5 font-semibold text-slate-600">
                    Nome
                  </TableHead>
                  <TableHead className="min-w-[200px] px-3 py-2.5 font-semibold text-slate-600">
                    Descrição
                  </TableHead>
                  <TableHead className="min-w-[150px] px-3 py-2.5 font-semibold text-slate-600">
                    Workpackage
                  </TableHead>
                  <TableHead className="w-[160px] px-3 py-2.5 font-semibold text-slate-600">
                    Rubrica
                  </TableHead>
                  <TableHead className="w-[100px] px-3 py-2.5 text-right font-semibold text-slate-600">
                    Preço
                  </TableHead>
                  <TableHead className="w-[60px] px-3 py-2.5 text-right font-semibold text-slate-600">
                    Qtd.
                  </TableHead>
                  <TableHead className="w-[100px] px-3 py-2.5 text-right font-semibold text-slate-600">
                    Total
                  </TableHead>
                  <TableHead className="w-[70px] px-3 py-2.5 text-center font-semibold text-slate-600">
                    Ano
                  </TableHead>
                  <TableHead className="w-[50px] px-3 py-2.5 text-center font-semibold text-slate-600">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materiaisFiltrados.map((material, index) => {
                  const total = Number(material.preco) * material.quantidade;
                  const { bg, text, border } = RUBRICA_COLORS[material.rubrica];
                  const isEvenRow = index % 2 === 0;

                  return (
                    <TableRow
                      key={material.id}
                      className={cn(
                        "group relative border-b border-slate-100/80 transition-colors duration-150 ease-in-out",
                        isEvenRow ? "bg-white/60" : "bg-slate-50/50", // Zebra striping
                        "hover:bg-emerald-50/50", // Hover effect
                        material.estado && "opacity-70 hover:opacity-100" // Slightly dim completed items
                      )}
                    >
                      <TableCell className="px-3 py-2">
                        <Button
                          variant="ghost" // Changed to ghost for a lighter look
                          size="icon"
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-all duration-300 ease-in-out",
                            material.estado
                              ? "border-emerald-200 bg-emerald-100/70 text-emerald-600 hover:bg-emerald-200/70"
                              : "border-slate-200 bg-white text-slate-400 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-500"
                          )}
                          onClick={() => toggleEstadoMaterial(material.id, material.estado)}
                          disabled={materialMutations.update.isPending}
                          aria-label={
                            material.estado ? "Marcar como pendente" : "Marcar como concluído"
                          }
                        >
                          <Check
                            className={cn(
                              "h-4 w-4 transition-opacity",
                              material.estado ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}
                          />
                          {!material.estado && (
                            <div className="h-2 w-2 rounded-full bg-slate-300 transition-colors group-hover:bg-emerald-400"></div>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="px-3 py-2 font-medium text-slate-700 transition-colors duration-150 group-hover:text-emerald-700">
                        {material.nome}
                      </TableCell>
                      <TableCell
                        className="max-w-[250px] truncate px-3 py-2 text-slate-500 transition-colors duration-150 group-hover:text-slate-700"
                        title={material.descricao ?? undefined}
                      >
                        {material.descricao || (
                          <span className="italic text-slate-400">Sem descrição</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-slate-600 transition-colors duration-150 group-hover:text-emerald-700">
                        {material.workpackageName}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={`${bg} ${text} ${border} rounded px-2 py-0.5 text-xs shadow-sm`}
                        >
                          {RUBRICA_LABELS[material.rubrica]}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right text-slate-600 transition-colors duration-150 group-hover:text-emerald-700">
                        {formatCurrency(Number(material.preco))}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right text-slate-600 transition-colors duration-150 group-hover:text-emerald-700">
                        {material.quantidade}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right font-medium text-slate-700 transition-colors duration-150 group-hover:text-emerald-700">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-center text-slate-600 transition-colors duration-150 group-hover:text-emerald-700">
                        {material.ano_utilizacao}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full text-slate-400 transition-all duration-150 ease-in-out hover:bg-slate-100/80 hover:text-emerald-500"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                />
                              </svg>
                              <span className="sr-only">Opções</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-xl border border-slate-100/80 bg-white/95 text-sm shadow-lg backdrop-blur-sm"
                          >
                            <DropdownMenuItem
                              onClick={() => toggleEstadoMaterial(material.id, material.estado)}
                              className="cursor-pointer transition-colors duration-150 hover:text-emerald-500"
                            >
                              {material.estado ? "Marcar como pendente" : "Marcar como concluído"}
                            </DropdownMenuItem>
                            {/* Adicionar mais opções aqui se necessário (Editar, Remover, etc.) */}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200/50 bg-gradient-to-br from-slate-50 to-slate-100 shadow-md">
                <Package className="h-8 w-8 text-slate-400" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-slate-700">
                  Nenhum material ou serviço encontrado
                </p>
                <p className="mx-auto max-w-md text-sm text-slate-500">
                  {searchTerm ||
                  rubricaFilter !== "todas" ||
                  estadoFilter !== "todos" ||
                  anoFilter !== "todos"
                    ? "Nenhum item corresponde aos critérios de pesquisa/filtro. Tente ajustar ou limpar os filtros."
                    : "Ainda não existem materiais ou serviços registados neste projeto ou associados aos workpackages."}
                </p>
              </div>
              {(searchTerm ||
                rubricaFilter !== "todas" ||
                estadoFilter !== "todos" ||
                anoFilter !== "todos") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-full border-slate-200 bg-white/90 text-slate-700 shadow-sm transition-all duration-300 ease-in-out hover:border-emerald-200 hover:bg-white/50 hover:text-emerald-500 hover:shadow-md"
                  onClick={() => {
                    setSearchTerm("");
                    setRubricaFilter("todas");
                    setEstadoFilter("todos");
                    setAnoFilter("todos");
                  }}
                >
                  <X className="mr-1.5 h-3 w-3" />
                  Limpar pesquisa e filtros
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
