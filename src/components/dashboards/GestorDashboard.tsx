"use client";

import {
  Briefcase,
  TrendingUp,
  DollarSign,
  Users,
  ListChecks,
  ArrowUpDown,
  Package,
  Search,
  Filter,
  X,
  ChevronDown,
  Check,
  Flag,
  AlertTriangle,
  Calendar,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsGrid } from "@/components/common/StatsGrid";
import type { StatItem } from "@/components/common/StatsGrid";
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/trpc/react";

// --- Mock Data ---

const mockGestorStats: StatItem[] = [
  {
    icon: Briefcase,
    label: "Projetos Geridos",
    value: 8, // Example value
    iconClassName: "text-blue-600",
    iconContainerClassName: "bg-blue-50/80",
    badgeText: "2 em risco", // Example badge
    badgeIcon: TrendingUp,
    badgeClassName: "text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 border-amber-100",
    secondaryText: "de 15 no total",
  },
  {
    icon: DollarSign,
    label: "Orçamento Controlado",
    value: 550000, // Example value
    suffix: "€",
    iconClassName: "text-emerald-600",
    iconContainerClassName: "bg-emerald-50/80",
    badgeText: "75% executado", // Example badge
    badgeClassName: "text-emerald-600 bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-100",
  },
  {
    icon: Users,
    label: "Ocupação Equipa",
    value: 78, // Example value
    suffix: "%",
    iconClassName: "text-purple-600",
    iconContainerClassName: "bg-purple-50/80",
    badgeText: "média mensal",
    badgeClassName: "text-purple-600 bg-purple-50/80 hover:bg-purple-100/80 border-purple-100",
  },
  {
    icon: ListChecks,
    label: "Tarefas Pendentes",
    value: 12, // Example value
    iconClassName: "text-red-600",
    iconContainerClassName: "bg-red-50/80",
    badgeText: "3 urgentes", // Example badge
    badgeClassName: "text-red-600 bg-red-50/80 hover:bg-red-100/80 border-red-100",
  },
];

// Mock data for resource occupation
const mockResourceOccupation = [
  { id: "res1", resource: "Ana Silva", month: "Jan", occupation: 90, year: 2024 },
  { id: "res2", resource: "Carlos Pereira", month: "Jan", occupation: 75, year: 2024 },
  { id: "res3", resource: "Beatriz Costa", month: "Jan", occupation: 85, year: 2024 },
  { id: "res4", resource: "Diogo Martins", month: "Jan", occupation: 95, year: 2024 },
  { id: "res5", resource: "Ana Silva", month: "Fev", occupation: 80, year: 2024 },
  { id: "res6", resource: "Carlos Pereira", month: "Fev", occupation: 85, year: 2024 },
  { id: "res7", resource: "Ana Silva", month: "Jan", occupation: 88, year: 2023 },
  { id: "res8", resource: "Carlos Pereira", month: "Jan", occupation: 72, year: 2023 },
  { id: "res9", resource: "Beatriz Costa", month: "Fev", occupation: 91, year: 2023 },
  { id: "res10", resource: "Diogo Martins", month: "Fev", occupation: 83, year: 2023 },
];

// Mock data for milestone tracker
const mockMilestones = [
  {
    id: "ms1",
    title: "Relatório Técnico Final",
    project: "Edifício Central",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "pendente",
    responsible: "Carlos Pereira",
    progress: 75,
  },
  {
    id: "ms2",
    title: "Protótipo v1",
    project: "Ponte Norte",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: "pendente",
    responsible: "Ana Silva",
    progress: 60,
  },
  {
    id: "ms3",
    title: "Testes de Integração",
    project: "Edifício Central",
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: "atrasado",
    responsible: "Beatriz Costa",
    progress: 45,
  },
  {
    id: "ms4",
    title: "Aprovação de Certificação",
    project: "Complexo Residencial",
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    status: "pendente",
    responsible: "Diogo Martins",
    progress: 30,
  },
  {
    id: "ms5",
    title: "Entrega Final de Documentação",
    project: "Ponte Norte",
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    status: "pendente",
    responsible: "Carlos Pereira",
    progress: 90,
  },
];

// Mock data for future allocation
const mockFutureAllocation = [
  {
    month: "Junho",
    year: 2024,
    resources: [
      { name: "Ana Silva", allocation: 85, projects: ["Edifício Central", "Ponte Norte"] },
      {
        name: "Carlos Pereira",
        allocation: 100,
        projects: ["Edifício Central", "Complexo Residencial"],
      },
      { name: "Beatriz Costa", allocation: 75, projects: ["Ponte Norte"] },
      { name: "Diogo Martins", allocation: 90, projects: ["Complexo Residencial"] },
    ],
  },
  {
    month: "Julho",
    year: 2024,
    resources: [
      { name: "Ana Silva", allocation: 100, projects: ["Edifício Central", "Ponte Norte"] },
      { name: "Carlos Pereira", allocation: 80, projects: ["Edifício Central"] },
      { name: "Beatriz Costa", allocation: 90, projects: ["Ponte Norte", "Novo Projeto A"] },
      { name: "Diogo Martins", allocation: 60, projects: ["Complexo Residencial"] },
    ],
  },
  {
    month: "Agosto",
    year: 2024,
    resources: [
      { name: "Ana Silva", allocation: 50, projects: ["Ponte Norte"] },
      { name: "Carlos Pereira", allocation: 75, projects: ["Novo Projeto B"] },
      { name: "Beatriz Costa", allocation: 100, projects: ["Novo Projeto A"] },
      {
        name: "Diogo Martins",
        allocation: 70,
        projects: ["Complexo Residencial", "Novo Projeto B"],
      },
    ],
  },
];

// Mapeamento de rubricas para exibição amigável
const RUBRICA_LABELS: Record<string, string> = {
  MATERIAIS: "Materiais",
  SERVICOS_TERCEIROS: "Serviços Terceiros",
  OUTROS_SERVICOS: "Outros Serviços",
  DESLOCACAO_ESTADAS: "Deslocação e Estadas",
  OUTROS_CUSTOS: "Outros Custos",
  CUSTOS_ESTRUTURA: "Custos de Estrutura",
};

// Cores para as rubricas
const RUBRICA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  MATERIAIS: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  SERVICOS_TERCEIROS: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  OUTROS_SERVICOS: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  DESLOCACAO_ESTADAS: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  OUTROS_CUSTOS: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  CUSTOS_ESTRUTURA: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

// Status colors for materials
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Aprovado: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "Em Desenvolvimento": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

// Interface for processed material data
interface ProcessedMaterial {
  id: number;
  material: string;
  project: string;
  workpackage: string;
  quantity: number;
  unit: string;
  status: string;
  price: number;
  total: number;
  rubrica: string;
  year: number;
}

// --- Helper Components ---

function ResourceOccupationCard() {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("todos");

  const months = [
    { value: "Jan", label: "Janeiro" },
    { value: "Fev", label: "Fevereiro" },
    { value: "Mar", label: "Março" },
    { value: "Abr", label: "Abril" },
    { value: "Mai", label: "Maio" },
    { value: "Jun", label: "Junho" },
    { value: "Jul", label: "Julho" },
    { value: "Ago", label: "Agosto" },
    { value: "Set", label: "Setembro" },
    { value: "Out", label: "Outubro" },
    { value: "Nov", label: "Novembro" },
    { value: "Dez", label: "Dezembro" },
  ];

  const filteredData = useMemo(() => {
    let filtered = mockResourceOccupation.filter((item) => item.year === parseInt(selectedYear));

    if (selectedMonth !== "todos") {
      filtered = filtered.filter((item) => item.month === selectedMonth);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((item) => item.resource.toLowerCase().includes(searchLower));
    }

    return filtered;
  }, [selectedYear, selectedMonth, searchTerm]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedMonth !== "todos") count++;
    if (searchTerm) count++;
    return count;
  }, [selectedMonth, searchTerm]);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedMonth("todos");
  };

  return (
    <Card className="flex h-full flex-col rounded-xl border-slate-200/50 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
      <CardHeader className="border-b border-slate-100 px-6 pb-3 pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-500" />
            <div>
              <CardTitle className="text-base font-medium text-slate-700">
                Ocupação de Recursos
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Visualize a ocupação da sua equipa por mês
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 w-[90px] rounded-full bg-white/80 text-xs text-gray-600 shadow-sm transition-all duration-300 ease-in-out hover:border-emerald-200 hover:bg-slate-50/80 hover:text-emerald-500 hover:shadow">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-100/80 bg-white/95 shadow-lg backdrop-blur-sm">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()} className="text-xs">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <div className="border-b border-slate-100 px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Pesquisar recurso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-700 shadow-sm transition-all duration-300 ease-in-out hover:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 rounded-full border-slate-200 bg-white text-xs text-gray-600 shadow-sm transition-all duration-300 ease-in-out hover:border-emerald-300 hover:bg-slate-50 hover:text-emerald-500 hover:shadow-md"
              >
                <Filter className="h-3 w-3" />
                <span>Filtros</span>
                {activeFiltersCount > 0 && (
                  <Badge className="ml-1 h-5 w-5 rounded-full bg-emerald-500 text-[10px] text-white">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[320px] rounded-xl border border-slate-100/80 bg-white/95 p-4 shadow-lg backdrop-blur-sm"
            >
              <DropdownMenuLabel className="mb-2 flex items-center justify-between px-2 py-1">
                <span className="text-sm font-medium text-slate-700">Filtrar por</span>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-7 rounded-full px-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-emerald-500"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Limpar todos
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />

              <div className="rounded-lg bg-slate-50/50 p-3">
                <DropdownMenuLabel className="mb-2 px-1 text-xs font-medium text-slate-700">
                  Mês
                </DropdownMenuLabel>
                <div className="grid grid-cols-2 gap-1">
                  <DropdownMenuItem
                    className={cn(
                      "cursor-pointer rounded-md px-2 py-1.5 text-sm transition-all duration-200 ease-in-out",
                      selectedMonth === "todos"
                        ? "bg-white font-medium text-emerald-600 shadow-sm"
                        : "text-slate-700 hover:bg-white/90 hover:text-emerald-600"
                    )}
                    onClick={() => setSelectedMonth("todos")}
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                      <span>Todos</span>
                    </div>
                    {selectedMonth === "todos" && (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                  </DropdownMenuItem>

                  {months.map((month) => (
                    <DropdownMenuItem
                      key={month.value}
                      className={cn(
                        "cursor-pointer rounded-md px-2 py-1.5 text-sm transition-all duration-200 ease-in-out",
                        selectedMonth === month.value
                          ? "bg-white font-medium text-emerald-600 shadow-sm"
                          : "text-slate-700 hover:bg-white/90 hover:text-emerald-600"
                      )}
                      onClick={() => setSelectedMonth(month.value)}
                    >
                      <div className="flex flex-1 items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                        <span>{month.label}</span>
                      </div>
                      {selectedMonth === month.value && (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {activeFiltersCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/60 pt-3 duration-300 ease-in-out animate-in fade-in slide-in-from-top-2">
            <span className="mr-2 text-xs text-gray-500">Filtros ativos:</span>

            {selectedMonth !== "todos" && (
              <Badge
                variant="outline"
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-full border-emerald-200 bg-emerald-50 px-2.5 text-xs text-emerald-600 transition-all duration-300 ease-in-out hover:border-emerald-300 hover:bg-emerald-100"
                )}
              >
                <span>Mês: {months.find((m) => m.value === selectedMonth)?.label}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedMonth("todos")}
                  className="h-4 w-4 rounded-full p-0 transition-colors duration-200 ease-in-out hover:bg-emerald-100/70 hover:text-emerald-700"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}

            {searchTerm && (
              <Badge
                variant="outline"
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-full border-emerald-200 bg-emerald-50 px-2.5 text-xs text-emerald-600 transition-all duration-300 ease-in-out hover:border-emerald-300 hover:bg-emerald-100"
                )}
              >
                <span>Pesquisa: {searchTerm}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchTerm("")}
                  className="h-4 w-4 rounded-full p-0 transition-colors duration-200 ease-in-out hover:bg-emerald-100/70 hover:text-emerald-700"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto" ref={tableContainerRef}>
        {filteredData.length === 0 ? (
          <div className="py-12 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-slate-50/80 shadow-sm backdrop-blur-sm">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-slate-700">Nenhum recurso encontrado</p>
                <p className="text-sm text-slate-500">
                  Experimente ajustar os filtros de pesquisa.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-slate-200 bg-white/90 text-slate-700 shadow-sm transition-all duration-300 ease-in-out hover:border-emerald-200 hover:bg-white/50 hover:text-emerald-500 hover:shadow-md"
                onClick={clearAllFilters}
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-6">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="py-3 text-sm font-medium text-slate-700">
                    <div className="flex cursor-pointer select-none items-center gap-1 transition-colors duration-200 hover:text-emerald-500">
                      Recurso
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-50 hover:text-emerald-500"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableHead>
                  <TableHead className="py-3 text-sm font-medium text-slate-700">
                    <div className="flex cursor-pointer select-none items-center gap-1 transition-colors duration-200 hover:text-emerald-500">
                      Mês
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-50 hover:text-emerald-500"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableHead>
                  <TableHead className="py-3 text-right text-sm font-medium text-slate-700">
                    <div className="flex cursor-pointer select-none items-center justify-end gap-1 transition-colors duration-200 hover:text-emerald-500">
                      Ocupação
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-50 hover:text-emerald-500"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item: any) => (
                  <TableRow
                    key={item.id}
                    className="group cursor-pointer border-b border-slate-100 transition-colors duration-300 ease-in-out hover:bg-emerald-50/50"
                  >
                    <TableCell className="px-2 py-3 text-sm text-slate-700 transition-colors duration-300 group-hover:text-emerald-600">
                      {item.resource}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-sm text-slate-700 transition-colors duration-300 group-hover:text-emerald-600">
                      {item.month}
                    </TableCell>
                    <TableCell className="px-2 py-3 text-right text-sm text-slate-700 transition-colors duration-300 group-hover:text-emerald-600">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200",
                          item.occupation > 90
                            ? "border-red-200 bg-red-50 text-red-600"
                            : item.occupation > 75
                              ? "border-amber-200 bg-amber-50 text-amber-600"
                              : "border-emerald-200 bg-emerald-50 text-emerald-600"
                        )}
                      >
                        {item.occupation}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Card>
  );
}

function MaterialsListCard() {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedProjetoId, setSelectedProjetoId] = useState<string | undefined>(undefined);

  // Fetch projects for the dropdown
  const { data: projetos } = api.projeto.findAll.useQuery(
    {},
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch materials with filters
  const { data: materiais, isLoading } = api.material.findAll.useQuery(
    {
      ano: parseInt(selectedYear, 10),
      projetoId: selectedProjetoId,
      estado: statusFilter === "todos" ? undefined : statusFilter === "concluidos",
      searchTerm: searchTerm || undefined,
    },
    {
      staleTime: 30 * 1000, // 30 seconds
    }
  );

  // Process data with applied filters
  const filteredData = useMemo(() => {
    if (!materiais) return [];

    return materiais.map((material) => {
      // Ensure workpackage is not null before accessing its properties
      const workpackage = material.workpackage || { nome: "N/A", projeto: { nome: "N/A", id: "" } };

      return {
        id: material.id,
        material: material.nome,
        project: workpackage.projeto.nome,
        workpackage: workpackage.nome,
        quantity: material.quantidade,
        unit: "unid.", // Unidade padrão, poderia ser adicionada ao modelo
        // Mapear o estado para os valores esperados pelo UI
        status: material.estado ? "Aprovado" : "Em Desenvolvimento",
        price: Number(material.preco),
        total: Number(material.preco) * material.quantidade,
        rubrica: material.rubrica,
        year: material.ano_utilizacao,
      };
    });
  }, [materiais]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "todos") count++;
    if (searchTerm) count++;
    if (selectedProjetoId) count++;
    return count;
  }, [statusFilter, searchTerm, selectedProjetoId]);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("todos");
    setSelectedProjetoId(undefined);
  };

  return (
    <Card className="flex h-full flex-col rounded-xl border-slate-200/50 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
      <CardHeader className="border-b border-slate-100 px-6 pb-3 pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-500" />
            <div>
              <CardTitle className="text-base font-medium text-slate-700">
                Lista de Materiais
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {filteredData.length} {filteredData.length === 1 ? "item" : "itens"} encontrados
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 w-[90px] rounded-full bg-white/80 text-xs text-gray-600 shadow-sm transition-all duration-300 ease-in-out hover:border-emerald-200 hover:bg-slate-50/80 hover:text-emerald-500 hover:shadow">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-100/80 bg-white/95 shadow-lg backdrop-blur-sm">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()} className="text-xs">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <div className="border-b border-slate-100 px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Pesquisar material ou projeto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-700 shadow-sm transition-all duration-300 ease-in-out hover:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 rounded-full border-slate-200 bg-white text-xs text-gray-600 shadow-sm transition-all duration-300 ease-in-out hover:border-emerald-300 hover:bg-slate-50 hover:text-emerald-500 hover:shadow-md"
              >
                <Filter className="h-3 w-3" />
                <span>Filtros</span>
                {activeFiltersCount > 0 && (
                  <Badge className="ml-1 h-5 w-5 rounded-full bg-emerald-500 text-[10px] text-white">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[320px] rounded-xl border border-slate-100/80 bg-white/95 p-4 shadow-lg backdrop-blur-sm"
            >
              <DropdownMenuLabel className="mb-2 flex items-center justify-between px-2 py-1">
                <span className="text-sm font-medium text-slate-700">Filtrar por</span>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-7 rounded-full px-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-emerald-500"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Limpar todos
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />

              {/* Estado */}
              <div className="mb-3 rounded-lg bg-slate-50/50 p-3">
                <DropdownMenuLabel className="mb-2 px-1 text-xs font-medium text-slate-700">
                  Estado
                </DropdownMenuLabel>
                <div className="grid grid-cols-1 gap-1">
                  <DropdownMenuItem
                    className={cn(
                      "cursor-pointer rounded-md px-2 py-1.5 text-sm transition-all duration-200 ease-in-out",
                      statusFilter === "todos"
                        ? "bg-white font-medium text-emerald-600 shadow-sm"
                        : "text-slate-700 hover:bg-white/90 hover:text-emerald-600"
                    )}
                    onClick={() => setStatusFilter("todos")}
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                      <span>Todos</span>
                    </div>
                    {statusFilter === "todos" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className={cn(
                      "cursor-pointer rounded-md px-2 py-1.5 text-sm transition-all duration-200 ease-in-out",
                      statusFilter === "concluidos"
                        ? "bg-white font-medium text-emerald-600 shadow-sm"
                        : "text-slate-700 hover:bg-white/90 hover:text-emerald-600"
                    )}
                    onClick={() => setStatusFilter("concluidos")}
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      <span>Concluídos</span>
                    </div>
                    {statusFilter === "concluidos" && (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className={cn(
                      "cursor-pointer rounded-md px-2 py-1.5 text-sm transition-all duration-200 ease-in-out",
                      statusFilter === "pendentes"
                        ? "bg-white font-medium text-emerald-600 shadow-sm"
                        : "text-slate-700 hover:bg-white/90 hover:text-emerald-600"
                    )}
                    onClick={() => setStatusFilter("pendentes")}
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                      <span>Pendentes</span>
                    </div>
                    {statusFilter === "pendentes" && (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                  </DropdownMenuItem>
                </div>
              </div>

              {/* Projetos */}
              {projetos?.data?.items && projetos.data.items.length > 0 && (
                <div className="rounded-lg bg-slate-50/50 p-3">
                  <DropdownMenuLabel className="mb-2 px-1 text-xs font-medium text-slate-700">
                    Projeto
                  </DropdownMenuLabel>
                  <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto">
                    <DropdownMenuItem
                      className={cn(
                        "cursor-pointer rounded-md px-2 py-1.5 text-sm transition-all duration-200 ease-in-out",
                        !selectedProjetoId
                          ? "bg-white font-medium text-emerald-600 shadow-sm"
                          : "text-slate-700 hover:bg-white/90 hover:text-emerald-600"
                      )}
                      onClick={() => setSelectedProjetoId(undefined)}
                    >
                      <div className="flex flex-1 items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                        <span>Todos os Projetos</span>
                      </div>
                      {!selectedProjetoId && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                    </DropdownMenuItem>

                    {projetos.data.items.map((projeto: { id: string; nome: string }) => (
                      <DropdownMenuItem
                        key={projeto.id}
                        className={cn(
                          "cursor-pointer rounded-md px-2 py-1.5 text-sm transition-all duration-200 ease-in-out",
                          selectedProjetoId === projeto.id
                            ? "bg-white font-medium text-emerald-600 shadow-sm"
                            : "text-slate-700 hover:bg-white/90 hover:text-emerald-600"
                        )}
                        onClick={() => setSelectedProjetoId(projeto.id)}
                      >
                        <div className="flex flex-1 items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full bg-purple-400" />
                          <span className="truncate">{projeto.nome}</span>
                        </div>
                        {selectedProjetoId === projeto.id && (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {activeFiltersCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/60 pt-3 duration-300 ease-in-out animate-in fade-in slide-in-from-top-2">
            <span className="mr-2 text-xs text-gray-500">Filtros ativos:</span>

            {statusFilter !== "todos" && (
              <Badge
                variant="outline"
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs transition-all duration-300 ease-in-out",
                  statusFilter === "concluidos"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-100"
                    : "border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:bg-blue-100"
                )}
              >
                <span>Estado: {statusFilter === "concluidos" ? "Concluídos" : "Pendentes"}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStatusFilter("todos")}
                  className={cn(
                    "h-4 w-4 rounded-full p-0 transition-colors duration-200 ease-in-out",
                    statusFilter === "concluidos"
                      ? "hover:bg-emerald-100/70 hover:text-emerald-700"
                      : "hover:bg-blue-100/70 hover:text-blue-700"
                  )}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}

            {selectedProjetoId && projetos && (
              <Badge
                variant="outline"
                className="flex h-7 items-center gap-1.5 rounded-full border-purple-200 bg-purple-50 px-2.5 text-xs text-purple-600 transition-all duration-300 ease-in-out hover:border-purple-300 hover:bg-purple-100"
              >
                <span>
                  Projeto:{" "}
                  {
                    projetos.data.items.find((p: { id: string }) => p.id === selectedProjetoId)
                      ?.nome
                  }
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedProjetoId(undefined)}
                  className="h-4 w-4 rounded-full p-0 transition-colors duration-200 ease-in-out hover:bg-purple-100/70 hover:text-purple-700"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}

            {searchTerm && (
              <Badge
                variant="outline"
                className="flex h-7 items-center gap-1.5 rounded-full border-emerald-200 bg-emerald-50 px-2.5 text-xs text-emerald-600 transition-all duration-300 ease-in-out hover:border-emerald-300 hover:bg-emerald-100"
              >
                <span>Pesquisa: {searchTerm}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchTerm("")}
                  className="h-4 w-4 rounded-full p-0 transition-colors duration-200 ease-in-out hover:bg-emerald-100/70 hover:text-emerald-700"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto" ref={tableContainerRef}>
        {isLoading ? (
          <div className="flex flex-col space-y-3 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-12 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-slate-50/80 shadow-sm backdrop-blur-sm">
                <Package className="h-6 w-6 text-slate-400" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-slate-700">Nenhum material encontrado</p>
                <p className="text-sm text-slate-500">
                  Experimente ajustar os filtros de pesquisa.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-slate-200 bg-white/90 text-slate-700 shadow-sm transition-all duration-300 ease-in-out hover:border-emerald-200 hover:bg-white/50 hover:text-emerald-500 hover:shadow-md"
                onClick={clearAllFilters}
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-6">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="py-3 text-sm font-medium text-slate-700">
                    <div className="flex cursor-pointer select-none items-center gap-1 transition-colors duration-200 hover:text-emerald-500">
                      Material
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-50 hover:text-emerald-500"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableHead>
                  <TableHead className="py-3 text-sm font-medium text-slate-700">
                    <div className="flex cursor-pointer select-none items-center gap-1 transition-colors duration-200 hover:text-emerald-500">
                      Projeto/WP
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-50 hover:text-emerald-500"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableHead>
                  <TableHead className="py-3 text-sm font-medium text-slate-700">
                    <div className="flex cursor-pointer select-none items-center gap-1 transition-colors duration-200 hover:text-emerald-500">
                      Rubrica
                    </div>
                  </TableHead>
                  <TableHead className="py-3 text-right text-sm font-medium text-slate-700">
                    <div className="flex cursor-pointer select-none items-center justify-end gap-1 transition-colors duration-200 hover:text-emerald-500">
                      Qtd.
                    </div>
                  </TableHead>
                  <TableHead className="py-3 text-right text-sm font-medium text-slate-700">
                    <div className="flex cursor-pointer select-none items-center justify-end gap-1 transition-colors duration-200 hover:text-emerald-500">
                      Valor
                    </div>
                  </TableHead>
                  <TableHead className="py-3 text-center text-sm font-medium text-slate-700">
                    <div className="flex cursor-pointer select-none items-center justify-center gap-1 transition-colors duration-200 hover:text-emerald-500">
                      Estado
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item: ProcessedMaterial) => {
                  const rubricaColor = RUBRICA_COLORS[item.rubrica] || {
                    bg: "bg-slate-50",
                    text: "text-slate-700",
                    border: "border-slate-200",
                  };
                  const statusColor = STATUS_COLORS[item.status] || {
                    bg: "bg-slate-50",
                    text: "text-slate-700",
                    border: "border-slate-200",
                  };

                  return (
                    <TableRow
                      key={item.id}
                      className="group cursor-pointer border-b border-slate-100 transition-colors duration-300 ease-in-out hover:bg-emerald-50/50"
                    >
                      <TableCell className="px-2 py-3 text-sm font-medium text-slate-700 transition-colors duration-300 group-hover:text-emerald-600">
                        {item.material}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-sm text-slate-700 transition-colors duration-300 group-hover:text-emerald-600">
                        <div>
                          {item.project}
                          <p className="text-xs text-slate-500">{item.workpackage}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-3 text-sm">
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium transition-colors duration-200",
                            rubricaColor.bg,
                            rubricaColor.text,
                            rubricaColor.border
                          )}
                        >
                          {RUBRICA_LABELS[item.rubrica]}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 py-3 text-right text-sm text-slate-700 transition-colors duration-300 group-hover:text-emerald-600">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-right text-sm text-slate-700 transition-colors duration-300 group-hover:text-emerald-600">
                        {new Intl.NumberFormat("pt-PT", {
                          style: "currency",
                          currency: "EUR",
                        }).format(item.total)}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center text-sm">
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200",
                            statusColor.bg,
                            statusColor.text,
                            statusColor.border,
                            "group-hover:border-emerald-200 group-hover:bg-emerald-50/80 group-hover:text-emerald-700"
                          )}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Card>
  );
}

function MilestoneTrackerCard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const filteredMilestones = useMemo(() => {
    let filtered = [...mockMilestones];

    if (statusFilter !== "todos") {
      filtered = filtered.filter((ms) => ms.status === statusFilter);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (ms) =>
          ms.title.toLowerCase().includes(searchLower) ||
          ms.project.toLowerCase().includes(searchLower) ||
          ms.responsible.toLowerCase().includes(searchLower)
      );
    }

    // Sort by due date (most urgent first)
    return filtered.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [searchTerm, statusFilter]);

  // Format date for display
  const formatDate = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) return "Hoje";
    if (isTomorrow) return "Amanhã";

    return date.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  // Calculate days difference
  const getDaysUntil = (date: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  return (
    <Card className="flex h-full flex-col rounded-xl border-slate-200/50 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
      <CardHeader className="border-b border-slate-100 px-6 pb-3 pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-slate-500" />
            <div>
              <CardTitle className="text-base font-medium text-slate-700">
                Milestone Tracker
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Próximos entregáveis e marcos importantes
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 rounded-full border-slate-200 bg-white text-xs text-gray-600 shadow-sm transition-all duration-300 ease-in-out hover:border-emerald-300 hover:bg-slate-50 hover:text-emerald-500 hover:shadow-md"
                >
                  <Filter className="h-3 w-3" />
                  <span>Filtrar</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 rounded-xl border-slate-100/80 bg-white/95 shadow-lg backdrop-blur-sm"
              >
                <DropdownMenuLabel className="text-xs font-medium text-slate-700">
                  Status
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className={cn(
                    "cursor-pointer text-xs transition-colors hover:bg-slate-50",
                    statusFilter === "todos" && "font-medium text-emerald-600"
                  )}
                  onClick={() => setStatusFilter("todos")}
                >
                  <div className="mr-2 h-2 w-2 rounded-full bg-slate-300"></div>
                  Todos os status
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn(
                    "cursor-pointer text-xs transition-colors hover:bg-slate-50",
                    statusFilter === "pendente" && "font-medium text-emerald-600"
                  )}
                  onClick={() => setStatusFilter("pendente")}
                >
                  <div className="mr-2 h-2 w-2 rounded-full bg-amber-400"></div>
                  Pendentes
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn(
                    "cursor-pointer text-xs transition-colors hover:bg-slate-50",
                    statusFilter === "atrasado" && "font-medium text-emerald-600"
                  )}
                  onClick={() => setStatusFilter("atrasado")}
                >
                  <div className="mr-2 h-2 w-2 rounded-full bg-red-500"></div>
                  Atrasados
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-[140px] rounded-full border-slate-200 bg-white py-2 pl-3 pr-3 text-xs shadow-sm transition-all duration-300 ease-in-out hover:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>
      </CardHeader>

      <div className="flex-1 overflow-auto p-4">
        {filteredMilestones.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-6 text-center">
            <Flag className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Nenhum milestone encontrado</p>
            <p className="text-xs text-slate-400">Ajuste os filtros para ver mais resultados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMilestones.map((milestone) => {
              const daysUntil = getDaysUntil(milestone.dueDate);
              const isLate = daysUntil < 0;
              const isUrgent = daysUntil >= 0 && daysUntil <= 2;

              return (
                <div
                  key={milestone.id}
                  className="group relative rounded-lg border border-slate-100 bg-white p-3 shadow-sm transition-all duration-200 hover:border-emerald-100 hover:shadow"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {milestone.status === "atrasado" ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : isUrgent ? (
                        <Clock className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Calendar className="h-4 w-4 text-emerald-500" />
                      )}
                      <h3 className="font-medium text-slate-800 group-hover:text-emerald-600">
                        {milestone.title}
                      </h3>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px]",
                        isLate
                          ? "border-red-200 bg-red-50 text-red-600"
                          : isUrgent
                            ? "border-amber-200 bg-amber-50 text-amber-600"
                            : "border-emerald-200 bg-emerald-50 text-emerald-600"
                      )}
                    >
                      {formatDate(milestone.dueDate)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{milestone.project}</span>
                    <span>{milestone.responsible}</span>
                  </div>

                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Progresso: {milestone.progress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          isLate ? "bg-red-500" : isUrgent ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${milestone.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

function FutureAllocationCard() {
  const [selectedMonth, setSelectedMonth] = useState(0);

  // Garantindo que sempre temos pelo menos um mês de dados
  const safeData = useMemo(() => {
    return mockFutureAllocation.length > 0
      ? mockFutureAllocation
      : [
          {
            month: "N/A",
            year: new Date().getFullYear(),
            resources: [],
          },
        ];
  }, []);

  const months = useMemo(() => {
    return safeData.map((item, index) => ({
      index,
      label: `${item.month} ${item.year}`,
    }));
  }, [safeData]);

  // Garantindo que selectedMonth está dentro dos limites
  const safeSelectedMonth = Math.min(selectedMonth, safeData.length - 1);
  const currentMonthData = safeData[safeSelectedMonth];

  // Garantindo que resources existe e memoizando esse valor
  const resources = useMemo(() => {
    return currentMonthData?.resources || [];
  }, [currentMonthData]);

  // Sort resources by allocation (descending)
  const sortedResources = useMemo(() => {
    return [...resources].sort((a, b) => b.allocation - a.allocation);
  }, [resources]);

  return (
    <Card className="flex h-full flex-col rounded-xl border-slate-200/50 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
      <CardHeader className="border-b border-slate-100 px-6 pb-3 pt-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-500" />
            <div>
              <CardTitle className="text-base font-medium text-slate-700">
                Previsão de Alocação Futura
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Ocupação prevista da equipa nos próximos meses
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="h-8 w-[120px] rounded-full bg-white/80 text-xs text-gray-600 shadow-sm transition-all duration-300 ease-in-out hover:border-emerald-200 hover:bg-slate-50/80 hover:text-emerald-500 hover:shadow">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-100/80 bg-white/95 shadow-lg backdrop-blur-sm">
                {months.map((month) => (
                  <SelectItem key={month.index} value={month.index.toString()} className="text-xs">
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {sortedResources.map((resource, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-slate-100 text-xs text-slate-500">
                      {resource.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-slate-700">{resource.name}</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    resource.allocation > 95
                      ? "border-red-200 bg-red-50 text-red-600"
                      : resource.allocation > 80
                        ? "border-amber-200 bg-amber-50 text-amber-600"
                        : "border-emerald-200 bg-emerald-50 text-emerald-600"
                  )}
                >
                  {resource.allocation}%
                </Badge>
              </div>

              <div className="ml-8 space-y-1">
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      resource.allocation > 95
                        ? "bg-red-500"
                        : resource.allocation > 80
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    )}
                    style={{ width: `${resource.allocation}%` }}
                  ></div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {resource.projects.map((project, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-normal text-slate-600"
                    >
                      {project}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// --- Dashboard Principal ---

export default function GestorDashboard() {
  // Num cenário real, buscar dados usando tRPC, potencialmente filtrando com base no escopo do gestor
  // const { data, isLoading } = api.gestor.getDashboardData.useQuery();

  // Usando dados mock por enquanto
  const isLoading = false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="overflow-hidden border-none bg-white shadow-sm">
                <CardContent className="p-0">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="overflow-hidden border-none bg-white shadow-sm">
                <CardContent className="p-0">
                  <Skeleton className="h-80 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Painel do Gestor</h1>
            <p className="text-sm text-slate-500">Visão geral dos seus projetos e equipa.</p>
          </div>
        </div>

        {/* Cards KPI */}
        <StatsGrid stats={mockGestorStats} />

        {/* 3-column layout para conteúdo principal */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Ocupação de Recursos - ocupa 6 colunas */}
          <div className="lg:col-span-6">
            <ResourceOccupationCard />
          </div>

          {/* Lista de Materiais - ocupa 6 colunas */}
          <div className="lg:col-span-6">
            <MaterialsListCard />
          </div>

          {/* Milestone Tracker - ocupa 6 colunas */}
          <div className="lg:col-span-6">
            <MilestoneTrackerCard />
          </div>

          {/* Previsão de Alocação Futura - ocupa 6 colunas */}
          <div className="lg:col-span-6">
            <FutureAllocationCard />
          </div>
        </div>
      </div>
    </div>
  );
}
