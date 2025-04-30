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
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
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
import { useState, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [sortColumn, setSortColumn] = useState<keyof (typeof mockResourceOccupation)[0]>("resource");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("Todos");

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(mockResourceOccupation.map((r) => r.year)));
    return years.sort((a, b) => b - a);
  }, []);

  const availableMonths = useMemo(() => {
    const months = Array.from(
      new Set(mockResourceOccupation.filter((r) => r.year === selectedYear).map((r) => r.month))
    );
    // Simplified sorting for Portuguese month names (alphabetical might suffice)
    return ["Todos", ...months.sort()];
  }, [selectedYear]);

  const filteredAndSortedData = useMemo(() => {
    let data = mockResourceOccupation.filter((r) => r.year === selectedYear);

    if (monthFilter !== "Todos") {
      data = data.filter((r) => r.month === monthFilter);
    }

    if (searchTerm) {
      data = data.filter((r) => r.resource.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    data.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      let comparison = 0;
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else if (typeof aValue === "string") {
        comparison = 1; // strings after numbers/other types
      } else {
        comparison = -1; // numbers/other types before strings
      }

      return sortDirection === "asc" ? comparison : comparison * -1;
    });

    return data;
  }, [selectedYear, monthFilter, searchTerm, sortColumn, sortDirection]);

  const handleSort = (column: keyof (typeof mockResourceOccupation)[0]) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setMonthFilter("Todos");
  };

  const getOccupationColor = (occupation: number) => {
    if (occupation > 95) return "text-red-600 font-semibold";
    if (occupation >= 85) return "text-emerald-600 font-medium";
    if (occupation >= 70) return "text-blue-600";
    return "text-slate-600";
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden border-gray-100 bg-white shadow-md transition-all hover:shadow-lg">
      <CardHeader className="border-b border-slate-100 bg-white px-4 pb-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-base font-medium text-slate-700">
              Ocupação de Recursos
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="h-8 w-[100px] rounded-md border-slate-200 bg-white text-xs shadow-sm">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()} className="text-xs">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="h-8 w-[100px] rounded-md border-slate-200 bg-white text-xs shadow-sm">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                {availableMonths.map((month) => (
                  <SelectItem key={month} value={month} className="text-xs">
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Search and Clear Filters */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Procurar recurso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 rounded-md bg-white pl-8 text-xs shadow-sm"
            />
          </div>
          {(searchTerm || monthFilter !== "Todos") && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 px-2 text-xs">
              <X className="mr-1 h-3 w-3" /> Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <div ref={tableContainerRef} className="h-full overflow-y-auto">
          <Table className="w-full table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-sm">
              <TableRow className="border-slate-100">
                {[
                  { key: "resource", label: "Recurso" },
                  { key: "month", label: "Mês" },
                  { key: "occupation", label: "Ocupação" },
                ].map((col) => (
                  <TableHead
                    key={col.key}
                    className="cursor-pointer px-4 py-2 text-xs font-medium uppercase text-slate-500 transition-colors hover:text-slate-700"
                    onClick={() => handleSort(col.key as keyof (typeof mockResourceOccupation)[0])}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortColumn === col.key && (
                        <ArrowUpDown
                          className={cn(
                            "h-3 w-3 text-slate-400",
                            sortDirection === "desc" && "rotate-180"
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.length > 0 ? (
                filteredAndSortedData.map((item) => (
                  <TableRow key={item.id} className="border-slate-100/70 hover:bg-slate-50/50">
                    <TableCell className="px-4 py-2.5 text-sm font-normal text-slate-700">
                      {item.resource}
                    </TableCell>
                    <TableCell className="px-4 py-2.5 text-sm text-slate-600">{item.month}</TableCell>
                    <TableCell className={cn("px-4 py-2.5 text-sm", getOccupationColor(item.occupation))}>
                      {item.occupation}%
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 p-6 text-center text-sm text-slate-500">
                    Nenhum recurso encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function MaterialsListCard() {
  const [sortColumn, setSortColumn] = useState<keyof ProcessedMaterial>("material");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<{ [key: string]: string }>({});
  const [globalSearch, setGlobalSearch] = useState("");

  // Replace with actual API call for materials
  const processedData = useMemo(() => {
    // Adapt this processing based on the actual API response structure
    return (
      mockMilestones?.map((item: any) => ({
        id: item.id,
        material: item.nome,
        project: item.workpackage?.projeto?.nome || "N/A",
        workpackage: item.workpackage?.nome || "N/A",
        quantity: item.quantidade,
        unit: "Un", // Assuming unit is always 'Un' for simplicity
        status: item.estado ? "Adquirido" : "Pendente",
        price: Number(item.preco ?? 0),
        total: Number((item.preco ?? 0) * (item.quantidade ?? 0)),
        rubrica: item.rubrica,
        year: item.ano_utilizacao,
      })) || []
    );
  }, []);

  const filteredAndSortedData = useMemo(() => {
    let data = processedData;

    // Global search
    if (globalSearch) {
      const searchTermLower = globalSearch.toLowerCase();
      data = data.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchTermLower)
        )
      );
    }

    // Sorting
    data.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      let comparison = 0;
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else if (typeof aValue === "string") {
        comparison = 1;
      } else {
        comparison = -1;
      }
      return sortDirection === "asc" ? comparison : comparison * -1;
    });

    return data;
  }, [processedData, globalSearch, sortColumn, sortDirection]);

  const handleSort = (column: keyof ProcessedMaterial) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleFilterChange = (column: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [column]: value === "Todos" ? "" : value, // Send empty string to clear filter
    }));
  };

  const clearAllFilters = () => {
    setFilters({});
    setGlobalSearch("");
  };

  const getStatusBadge = (status: string) => {
    const colorClasses = status === "Adquirido"
      ? STATUS_COLORS["Aprovado"]
      : STATUS_COLORS["Em Desenvolvimento"];
    return (
      <Badge
        className={cn(
          "border px-2 py-0.5 text-xs font-normal",
          colorClasses?.bg,
          colorClasses?.text,
          colorClasses?.border
        )}
      >
        {status}
      </Badge>
    );
  };

  const getRubricaBadge = (rubrica: string) => {
    const label = RUBRICA_LABELS[rubrica] || rubrica;
    const colorClasses = RUBRICA_COLORS[rubrica];
    return (
      <Badge
        variant="outline"
        className={cn(
          "border px-2 py-0.5 text-xs font-normal",
          colorClasses?.bg,
          colorClasses?.text,
          colorClasses?.border
        )}
      >
        {label}
      </Badge>
    );
  };

  // Columns definition for the table header and sorting
  const columns: { key: keyof ProcessedMaterial; label: string; width?: string }[] = [
    { key: "material", label: "Material", width: "20%" },
    { key: "project", label: "Projeto", width: "15%" },
    { key: "workpackage", label: "Workpackage", width: "15%" },
    { key: "rubrica", label: "Rubrica", width: "10%" },
    { key: "quantity", label: "Qtd.", width: "5%" },
    { key: "price", label: "Preço Unit.", width: "10%" },
    { key: "total", label: "Total", width: "10%" },
    { key: "status", label: "Estado", width: "10%" },
  ];

  // Function to create filter options for a column
  const getFilterOptions = (columnKey: keyof ProcessedMaterial) => {
    const uniqueValues = Array.from(new Set(processedData.map((item) => item[columnKey])));
    return [
      { value: "Todos", label: "Todos" },
      ...uniqueValues.map((value) => ({
        value: String(value),
        label: String(value),
      })),
    ];
  };

  const renderFilter = (columnKey: keyof ProcessedMaterial, label: string) => {
    const options = getFilterOptions(columnKey);
    if (options.length <= 2) return null; // Don't show filter if only 'Todos' and one other option

    return (
      <DropdownMenu key={columnKey}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
            {filters[columnKey] || label}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => handleFilterChange(columnKey, option.value)}
              className="text-xs"
            >
              {option.label}
              {filters[columnKey] === option.value && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden border-gray-100 bg-white shadow-md transition-all hover:shadow-lg">
      <CardHeader className="border-b border-slate-100 bg-white px-4 pb-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-base font-medium text-slate-700">
              Lista de Materiais
            </CardTitle>
          </div>
          {/* Filters Area */}
          <div className="flex flex-wrap items-center gap-1">
            <Filter className="mr-1 h-4 w-4 text-slate-400" />
            {renderFilter("project", "Projeto")}
            {renderFilter("workpackage", "Workpackage")}
            {renderFilter("rubrica", "Rubrica")}
            {renderFilter("status", "Estado")}
            {renderFilter("year", "Ano")}
          </div>
        </div>
        {/* Search and Clear Filters */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Procurar em todos os campos..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="h-8 rounded-md bg-white pl-8 text-xs shadow-sm"
            />
          </div>
          {(globalSearch || Object.values(filters).some((v) => v)) && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 px-2 text-xs">
              <X className="mr-1 h-3 w-3" /> Limpar Tudo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <div className="h-full overflow-auto">
          <Table className="w-full min-w-[800px] table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-sm">
              <TableRow className="border-slate-100">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className="cursor-pointer px-3 py-2 text-xs font-medium uppercase text-slate-500 transition-colors hover:text-slate-700"
                    style={{ width: col.width }}
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortColumn === col.key && (
                        <ArrowUpDown
                          className={cn(
                            "h-3 w-3 text-slate-400",
                            sortDirection === "desc" && "rotate-180"
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100/70">
              {filteredAndSortedData.length > 0 ? (
                filteredAndSortedData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50">
                    <TableCell className="truncate px-3 py-2.5 text-sm font-normal text-slate-700">
                      {item.material}
                    </TableCell>
                    <TableCell className="truncate px-3 py-2.5 text-sm text-slate-600">
                      {item.project}
                    </TableCell>
                    <TableCell className="truncate px-3 py-2.5 text-sm text-slate-600">
                      {item.workpackage}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      {getRubricaBadge(item.rubrica)}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-sm text-slate-600">
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-sm text-slate-600">
                      {item.price.toFixed(2)} €
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-sm font-medium text-slate-700">
                      {item.total.toFixed(2)} €
                    </TableCell>
                    <TableCell className="px-3 py-2.5">{getStatusBadge(item.status)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 p-6 text-center text-sm text-slate-500"
                  >
                    Nenhum material encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function MilestoneTrackerCard() {
  const [sortColumn, setSortColumn] = useState<keyof (typeof mockMilestones)[0]>("dueDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  const availableStatuses = useMemo(() => {
    const statuses = Array.from(new Set(mockMilestones.map((m) => m.status)));
    return ["Todos", ...statuses];
  }, []);

  const formatDate = (date: Date): string => {
    try {
      return new Date(date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
    } catch (e) {
      return "Inválida";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente":
        return "bg-blue-100 text-blue-700";
      case "atrasado":
        return "bg-red-100 text-red-700";
      case "concluido":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getDaysUntil = (date: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    return Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const filteredAndSortedMilestones = useMemo(() => {
    let data = mockMilestones;

    if (statusFilter !== "Todos") {
      data = data.filter((m) => m.status === statusFilter);
    }

    if (searchTerm) {
      data = data.filter(
        (m) =>
          m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.responsible.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    data.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      let comparison = 0;
      if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      }

      return sortDirection === "asc" ? comparison : comparison * -1;
    });

    return data;
  }, [statusFilter, searchTerm, sortColumn, sortDirection]);

  const handleSort = (column: keyof (typeof mockMilestones)[0]) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("Todos");
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden border-gray-100 bg-white shadow-md transition-all hover:shadow-lg">
      <CardHeader className="border-b border-slate-100 bg-white px-4 pb-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-base font-medium text-slate-700">
              Marcos do Projeto (Próximos)
            </CardTitle>
          </div>
          {/* Filter by status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[120px] rounded-md border-slate-200 bg-white text-xs shadow-sm">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              {availableStatuses.map((status) => (
                <SelectItem key={status} value={status} className="text-xs capitalize">
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Search and Clear Filters */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Procurar título, projeto ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 rounded-md bg-white pl-8 text-xs shadow-sm"
            />
          </div>
          {(searchTerm || statusFilter !== "Todos") && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 px-2 text-xs">
              <X className="mr-1 h-3 w-3" /> Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <div className="h-full overflow-y-auto">
          <Table className="w-full table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-sm">
              <TableRow className="border-slate-100">
                {[
                  { key: "title", label: "Marco" },
                  { key: "project", label: "Projeto" },
                  { key: "dueDate", label: "Prazo" },
                  { key: "responsible", label: "Responsável" },
                  { key: "status", label: "Estado" },
                ].map((col) => (
                  <TableHead
                    key={col.key}
                    className="cursor-pointer px-3 py-2 text-xs font-medium uppercase text-slate-500 transition-colors hover:text-slate-700"
                    onClick={() => handleSort(col.key as keyof (typeof mockMilestones)[0])}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortColumn === col.key && (
                        <ArrowUpDown
                          className={cn(
                            "h-3 w-3 text-slate-400",
                            sortDirection === "desc" && "rotate-180"
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedMilestones.length > 0 ? (
                filteredAndSortedMilestones.map((milestone) => {
                  const daysLeft = getDaysUntil(milestone.dueDate);
                  let prazoText = `Em ${daysLeft} dias`;
                  let prazoColor = "text-slate-600";
                  if (daysLeft < 0) {
                    prazoText = `Atrasado ${Math.abs(daysLeft)} dias`;
                    prazoColor = "text-red-600 font-medium";
                  } else if (daysLeft <= 3) {
                    prazoColor = "text-amber-600 font-medium";
                  }

                  return (
                    <TableRow key={milestone.id} className="border-slate-100/70 hover:bg-slate-50/50">
                      <TableCell className="truncate px-3 py-2.5 text-sm font-normal text-slate-700">
                        {milestone.title}
                      </TableCell>
                      <TableCell className="truncate px-3 py-2.5 text-sm text-slate-600">
                        {milestone.project}
                      </TableCell>
                      <TableCell className={cn("px-3 py-2.5 text-sm", prazoColor)}>
                        {formatDate(milestone.dueDate)} ({prazoText})
                      </TableCell>
                      <TableCell className="truncate px-3 py-2.5 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            {/* Add AvatarImage src if available */}
                            <AvatarFallback className="text-[10px]">
                              {milestone.responsible.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {milestone.responsible}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <Badge
                          className={cn(
                            "border px-2 py-0.5 text-xs font-normal capitalize",
                            getStatusColor(milestone.status)
                          )}
                        >
                          {milestone.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 p-6 text-center text-sm text-slate-500"
                  >
                    Nenhum marco encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function FutureAllocationCard() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(mockFutureAllocation.map((a) => a.year)));
    return years.sort((a, b) => a - b);
  }, []);

  const allocationsForYear = useMemo(() => {
    return mockFutureAllocation.filter((a) => a.year === selectedYear);
  }, [selectedYear]);

  const getOccupationColor = (occupation: number) => {
    if (occupation > 95) return "bg-red-100 text-red-700";
    if (occupation >= 85) return "bg-emerald-100 text-emerald-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden border-gray-100 bg-white shadow-md transition-all hover:shadow-lg">
      <CardHeader className="border-b border-slate-100 bg-white px-4 pb-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-base font-medium text-slate-700">
              Alocações Futuras (Próximos 3 Meses)
            </CardTitle>
          </div>
          {/* Year Selector */}
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="h-8 w-[100px] rounded-md border-slate-200 bg-white text-xs shadow-sm">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()} className="text-xs">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <div className="grid h-full grid-cols-1 divide-x divide-slate-100/80 md:grid-cols-3">
          {allocationsForYear.map((allocation) => (
            <div key={`${allocation.month}-${allocation.year}`} className="flex flex-col">
              <div className="border-b border-slate-100 bg-slate-50/60 px-3 py-2 text-center text-sm font-medium text-slate-600">
                {allocation.month} {allocation.year}
              </div>
              <div className="flex-grow space-y-2 overflow-y-auto p-3">
                {allocation.resources.map((res) => (
                  <div
                    key={res.name}
                    className="flex items-center justify-between rounded-md bg-white p-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {/* Add AvatarImage src if available */}
                        <AvatarFallback className="text-[10px]">{res.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-normal text-slate-700">{res.name}</span>
                    </div>
                    <Badge
                      className={cn(
                        "min-w-[45px] justify-center rounded-full border px-2 py-0.5 text-xs font-medium",
                        getOccupationColor(res.allocation)
                      )}
                    >
                      {res.allocation}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Dashboard Component ---

export default function GestorDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Painel de Gestor</h1>
            <p className="text-sm text-slate-500">
              Monitorize projetos, recursos e finanças da sua equipa.
            </p>
          </div>
          {/* Add actions relevant for Gestor here if needed */}
        </div>

        {/* Stats Cards */}
        <StatsGrid stats={mockGestorStats} className="lg:grid-cols-4" />

        {/* Main Content Area - Divided Layout */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Left Column (Wider) */}
          <div className="space-y-6 xl:col-span-2">
            <MaterialsListCard />
            <MilestoneTrackerCard />
          </div>

          {/* Right Column (Narrower) */}
          <div className="space-y-6">
            <ResourceOccupationCard />
          </div>
        </div>

        {/* Full Width Card */}
        <div className="grid grid-cols-1 gap-6">
          <FutureAllocationCard />
        </div>
      </div>
    </div>
  );
}