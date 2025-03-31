import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Filter, X, ArrowUpDown, ChevronLeft, ChevronRight, Check } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState, ColumnFiltersState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BadgeEstado } from "@/components/common/BadgeEstado";

export type FilterOption = {
  id: string;
  label: string;
  value: string;
  badge?: {
    status: string;
    variant: string;
  };
};

export type FilterConfig = {
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
};

type TabelaDadosProps<TData> = {
  title: string;
  subtitle: string;
  actionButton?: React.ReactNode;
  data: TData[];
  isLoading: boolean;
  columns: ColumnDef<TData>[];
  searchPlaceholder?: string;
  filterConfigs?: FilterConfig[];
  itemsPerPage?: number;
  emptyStateMessage?: {
    title: string;
    description: string;
  };
  onRowClick?: (item: TData) => void;
};

export function TabelaDados<TData>({
  title,
  subtitle,
  actionButton,
  data,
  isLoading,
  columns,
  searchPlaceholder = "Pesquisar...",
  filterConfigs = [],
  itemsPerPage = 10,
  emptyStateMessage = {
    title: "Nenhum item encontrado",
    description: "Experimente ajustar os filtros de pesquisa ou remover o termo de pesquisa."
  },
  onRowClick,
}: TabelaDadosProps<TData>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [dynamicItemsPerPage, setDynamicItemsPerPage] = useState(itemsPerPage);

  // Função para calcular quantos itens cabem na viewport
  const calculateItemsPerPage = () => {
    if (!tableContainerRef.current) return;
    
    const ROW_HEIGHT = 44; // Nova altura reduzida da linha (era 52)
    const containerHeight = tableContainerRef.current.clientHeight;
    const headerHeight = 44; // Altura do header (também reduzida)
    const availableHeight = containerHeight - headerHeight;
    
    const calculatedItems = Math.floor(availableHeight / ROW_HEIGHT);
    return Math.max(calculatedItems, 1); // Garante pelo menos 1 item
  };

  // Atualiza items por página quando o tamanho da janela muda
  useEffect(() => {
    const updateItemsPerPage = () => {
      const calculated = calculateItemsPerPage();
      if (calculated) setDynamicItemsPerPage(calculated);
    };

    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  // Estado da tabela
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  
  // Configuração da tabela
  const table = useReactTable({
    data,
    columns: columns.filter(col => col.id !== 'actions'),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      globalFilter,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: dynamicItemsPerPage,
      },
    },
  });

  // Número de filtros ativos
  const activeFiltersCount = useMemo(() => 
    filterConfigs
      .filter(config => config.value !== "todos" && config.value !== "all")
      .length
  , [filterConfigs]);

  // Limpar todos os filtros
  const clearAllFilters = () => {
    table.resetGlobalFilter();
    table.resetColumnFilters();
    filterConfigs.forEach(config => config.onChange("todos"));
  };

  return (
    <div className="w-full">
      {(title || subtitle || actionButton) && (
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
          {actionButton}
        </div>
      )}

      <div className="bg-white border-none shadow-sm hover:shadow-md transition-all duration-300 ease-in-out rounded-xl overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-3 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-azul/20 text-gray-700 hover:border-azul/30 transition-all duration-300 ease-in-out"
            />
          </div>

          {filterConfigs.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full bg-white hover:bg-slate-50 text-xs text-gray-600 hover:text-azul gap-2 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out border-slate-200 hover:border-azul/30"
                >
                  <Filter className="h-3 w-3" />
                  <span>Filtros</span>
                  {activeFiltersCount > 0 ? (
                    <div className="flex items-center gap-1">
                      {filterConfigs
                        .filter(config => config.value !== "todos" && config.value !== "all")
                        .map(config => {
                          const selectedOption = config.options.find(opt => opt.value === config.value);
                          if (selectedOption?.badge) {
                            return (
                              <BadgeEstado
                                key={config.id}
                                status={selectedOption.badge.status}
                                label=""
                                variant={selectedOption.badge.variant as any}
                                customClassName="w-2 h-2 p-0 rounded-full min-w-0"
                              />
                            );
                          }
                          return null;
                        })}
                      <Badge className="ml-1 h-5 w-5 rounded-full bg-azul text-[10px] text-white">
                        {activeFiltersCount}
                      </Badge>
                    </div>
                  ) : (
                    <Badge className="ml-1 hidden h-5 w-5 rounded-full bg-azul text-[10px] text-white">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[480px] p-4 shadow-lg rounded-xl border border-slate-100/80 bg-white/95 backdrop-blur-sm">
                <DropdownMenuLabel className="flex justify-between items-center px-2 py-1 mb-2">
                  <span className="text-sm font-medium text-slate-700">Filtrar por</span>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        clearAllFilters();
                      }}
                      className="text-xs text-slate-500 hover:text-azul h-7 px-2 rounded-full hover:bg-slate-50"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpar todos
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />
                
                {/* Agrupar filtros por categorias */}
                <div className="p-1.5 grid grid-cols-2 gap-3">
                  {filterConfigs.map((config) => (
                    <DropdownMenuGroup key={config.id} className="bg-slate-50/50 rounded-lg p-3">
                      <DropdownMenuLabel className="text-xs font-medium text-slate-700 mb-2 px-1">
                        {config.label}
                      </DropdownMenuLabel>
                      <div className="grid grid-cols-1 gap-1">
                        {config.options.map((option) => (
                          <DropdownMenuItem
                            key={option.id}
                            className={cn(
                              "flex items-center gap-2 rounded-md cursor-pointer px-2 py-1.5 mb-0.5 text-sm transition-all duration-200 ease-in-out",
                              config.value === option.value
                                ? "bg-white text-azul font-medium shadow-sm"
                                : option.badge?.status === "ESTE_MES" 
                                  ? "text-slate-700 hover:text-green-600 hover:bg-green-50/80"
                                  : option.badge?.status === "PROXIMO_MES" 
                                    ? "text-slate-700 hover:text-blue-600 hover:bg-blue-50/80"
                                    : option.badge?.status === "ESTE_ANO" 
                                      ? "text-slate-700 hover:text-purple-600 hover:bg-purple-50/80"
                                      : option.badge?.status === "ATRASADO" 
                                        ? "text-slate-700 hover:text-red-600 hover:bg-red-50/80"
                                        : option.badge?.status === "APROVADO" 
                                          ? "text-slate-700 hover:text-emerald-600 hover:bg-emerald-50/80"
                                          : option.badge?.status === "PENDENTE" 
                                            ? "text-slate-700 hover:text-amber-600 hover:bg-amber-50/80"
                                            : option.badge?.status === "RASCUNHO" 
                                              ? "text-slate-700 hover:text-gray-600 hover:bg-gray-50/80"
                                              : option.badge?.status === "EM_DESENVOLVIMENTO" 
                                                ? "text-slate-700 hover:text-blue-600 hover:bg-blue-50/80"
                                                : option.badge?.status === "CONCLUIDO" 
                                                  ? "text-slate-700 hover:text-azul hover:bg-azul/5"
                                                  : "text-slate-700 hover:text-azul hover:bg-white/90"
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              config.onChange(option.value);
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {option.badge ? (
                                <BadgeEstado
                                  status={option.badge.status}
                                  label=""
                                  variant={option.badge.variant as any}
                                  customClassName="w-2.5 h-2.5 p-0 rounded-full min-w-0"
                                />
                              ) : (
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                              )}
                              <span>{option.label}</span>
                            </div>
                            {config.value === option.value && (
                              <Check className="h-3.5 w-3.5 text-azul" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </DropdownMenuGroup>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Exibe badges para filtros ativos */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-4 duration-300 ease-in-out">
              {filterConfigs
                .filter(config => config.value !== "todos" && config.value !== "all")
                .map(config => {
                  const selectedOption = config.options.find(opt => opt.value === config.value);
                  return (
                    <Badge 
                      key={config.id}
                      className={cn(
                        "h-9 px-3 rounded-full flex items-center gap-2 transition-all duration-300 ease-in-out",
                        selectedOption?.badge?.status === "ESTE_MES" && "bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 hover:border-green-300",
                        selectedOption?.badge?.status === "PROXIMO_MES" && "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300",
                        selectedOption?.badge?.status === "ESTE_ANO" && "bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100 hover:border-purple-300",
                        selectedOption?.badge?.status === "ATRASADO" && "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300",
                        selectedOption?.badge?.status === "APROVADO" && "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300",
                        selectedOption?.badge?.status === "PENDENTE" && "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 hover:border-amber-300",
                        selectedOption?.badge?.status === "RASCUNHO" && "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:border-gray-300",
                        selectedOption?.badge?.status === "EM_DESENVOLVIMENTO" && "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300",
                        selectedOption?.badge?.status === "CONCLUIDO" && "bg-azul/10 text-azul border border-azul/20 hover:bg-azul/20 hover:border-azul/30",
                        !selectedOption?.badge && "bg-azul/10 text-azul border border-azul/20 hover:bg-azul/20 hover:border-azul/30"
                      )}
                    >
                      {selectedOption?.badge && (
                        <BadgeEstado
                          status={selectedOption.badge.status}
                          label=""
                          variant={selectedOption.badge.variant as any}
                          customClassName="w-2 h-2 p-0 rounded-full min-w-0"
                        />
                      )}
                      <span>{config.label}: {selectedOption?.label}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => config.onChange("todos")}
                        className={cn(
                          "h-5 w-5 ml-1 p-0 rounded-full transition-colors duration-200 ease-in-out",
                          selectedOption?.badge?.status === "ESTE_MES" && "hover:bg-green-100/70 hover:text-green-700",
                          selectedOption?.badge?.status === "PROXIMO_MES" && "hover:bg-blue-100/70 hover:text-blue-700",
                          selectedOption?.badge?.status === "ESTE_ANO" && "hover:bg-purple-100/70 hover:text-purple-700",
                          selectedOption?.badge?.status === "ATRASADO" && "hover:bg-red-100/70 hover:text-red-700",
                          selectedOption?.badge?.status === "APROVADO" && "hover:bg-emerald-100/70 hover:text-emerald-700",
                          selectedOption?.badge?.status === "PENDENTE" && "hover:bg-amber-100/70 hover:text-amber-700",
                          selectedOption?.badge?.status === "RASCUNHO" && "hover:bg-gray-100/70 hover:text-gray-700",
                          selectedOption?.badge?.status === "EM_DESENVOLVIMENTO" && "hover:bg-blue-100/70 hover:text-blue-700",
                          selectedOption?.badge?.status === "CONCLUIDO" && "hover:bg-azul/20 hover:text-azul",
                          !selectedOption?.badge && "hover:bg-azul/20 hover:text-azul"
                        )}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
            </div>
          )}
        </div>

        <div ref={tableContainerRef} className="relative w-full overflow-hidden">
          {isLoading ? (
            <LoadingTable columns={columns} itemsPerPage={dynamicItemsPerPage} />
          ) : table.getRowModel().rows.length === 0 ? (
            <EmptyState
              message={emptyStateMessage}
              onClearFilters={clearAllFilters}
            />
          ) : (
            <div className="px-6">
              <Table className="w-full border-collapse">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="border-b border-slate-100 hover:bg-transparent">
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="text-sm font-medium text-slate-700 py-3"
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={cn(
                                "flex items-center gap-1",
                                header.column.getCanSort() && "cursor-pointer select-none hover:text-azul transition-colors duration-200"
                              )}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {header.column.getCanSort() && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-6 w-6 rounded-full text-slate-400 hover:text-azul hover:bg-slate-50 transition-all duration-200",
                                    header.column.getIsSorted() ? "text-azul bg-azul/10" : ""
                                  )}
                                >
                                  <ArrowUpDown className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "group relative border-b border-slate-100 transition-colors duration-300 ease-in-out cursor-pointer",
                        "hover:bg-slate-50/50"
                      )}
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="py-3 px-2 text-slate-700 text-sm group-hover:text-azul transition-colors duration-300"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between py-3 px-6 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              A mostrar{" "}
              <span className="font-medium text-slate-700">
                {table.getRowModel().rows.length}
              </span>{" "}
              de{" "}
              <span className="font-medium text-slate-700">{data.length}</span> itens
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                className="rounded-full h-7 w-7 p-0 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-azul transition-all duration-300 ease-in-out shadow-sm hover:shadow-md disabled:opacity-50 hover:border-azul/30"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              
              {Array.from({ length: Math.min(5, table.getPageCount()) }, (_, i) => {
                const currentPage = table.getState().pagination.pageIndex;
                let pageToShow = i;
                
                if (currentPage > 2) {
                  pageToShow = currentPage - 2 + i;
                }
                
                if (pageToShow >= table.getPageCount()) return null;
                
                return (
                  <Button
                    key={pageToShow}
                    onClick={() => table.setPageIndex(pageToShow)}
                    className={cn(
                      "rounded-full h-7 w-7 p-0 transition-all duration-300 ease-in-out shadow-sm hover:shadow-md text-sm",
                      table.getState().pagination.pageIndex === pageToShow
                        ? "bg-azul text-white hover:bg-azul/90"
                        : "bg-white text-slate-700 hover:bg-slate-50 hover:text-azul border-slate-200 hover:border-azul/30"
                    )}
                  >
                    {pageToShow + 1}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                size="icon"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                className="rounded-full h-7 w-7 p-0 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-azul transition-all duration-300 ease-in-out shadow-sm hover:shadow-md disabled:opacity-50 hover:border-azul/30"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente de loading
const LoadingTable = ({ columns, itemsPerPage }: { columns: ColumnDef<any>[], itemsPerPage: number }) => (
  <Table>
    <TableHeader>
      <TableRow className="border-b border-slate-100/50 hover:bg-transparent">
        {columns.map((column, idx) => (
          <TableHead key={idx} className="h-10 px-4 text-left align-middle text-sm font-medium text-slate-700">
            <div className="flex items-center gap-1">
              {typeof column.header === "string" ? column.header : ""}
              <div className="h-4 w-4 rounded-full bg-slate-100/80 backdrop-blur-sm animate-[pulse_1s_ease-in-out_infinite]" />
            </div>
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {[...Array(itemsPerPage)].map((_, i) => (
        <TableRow key={i} className="border-b border-slate-100/50">
          {columns.map((_, idx) => (
            <TableCell key={idx} className="h-11 px-4 align-middle">
              <div className="h-3 w-32 bg-slate-100/80 backdrop-blur-sm rounded animate-[pulse_1.2s_ease-in-out_infinite] shadow-sm" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// Componente de estado vazio
const EmptyState = ({ 
  message, 
  onClearFilters 
}: { 
  message: { title: string; description: string }, 
  onClearFilters: () => void 
}) => (
  <div className="py-12 text-center">
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="h-12 w-12 rounded-full bg-slate-50/80 backdrop-blur-sm flex items-center justify-center shadow-sm border border-white/50">
        <Search className="h-6 w-6 text-slate-400" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-slate-700">{message.title}</p>
        <p className="text-sm text-slate-500">{message.description}</p>
      </div>
      <Button 
        variant="outline" 
        size="sm"
        className="rounded-full border-slate-200 bg-white/90 text-slate-700 hover:text-azul hover:bg-white/50 hover:border-azul/20 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out"
        onClick={onClearFilters}
      >
        Limpar filtros
      </Button>
    </div>
  </div>
); 