import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
    description: "Experimente ajustar os filtros de pesquisa ou remover o termo de pesquisa.",
  },
  onRowClick,
}: TabelaDadosProps<TData>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [dynamicItemsPerPage, setDynamicItemsPerPage] = useState(itemsPerPage);

  // Função para calcular quantos itens cabem na viewport
  const calculateItemsPerPage = useCallback(() => {
    if (!tableContainerRef.current) return itemsPerPage;

    const ROW_HEIGHT = 44; // altura da linha
    const availableHeight = tableContainerRef.current.clientHeight;

    // Calcula número de itens que cabem no espaço disponível
    const calculatedItems = Math.floor(availableHeight / ROW_HEIGHT);

    // Garante um mínimo de 5 itens e um máximo de 20
    return Math.max(5, Math.min(calculatedItems, 20));
  }, [itemsPerPage]);

  useEffect(() => {
    const updateItemsPerPage = () => {
      const calculated = calculateItemsPerPage();
      setDynamicItemsPerPage(calculated);
    };

    // Atualiza no mount e em cada resize
    updateItemsPerPage();

    const observer = new ResizeObserver(updateItemsPerPage);
    if (tableContainerRef.current) {
      observer.observe(tableContainerRef.current);
    }

    return () => {
      if (tableContainerRef.current) {
        observer.unobserve(tableContainerRef.current);
      }
      observer.disconnect();
    };
  }, [calculateItemsPerPage]);

  // Estado da tabela
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Configuração da tabela
  const table = useReactTable({
    data,
    columns: columns.filter((col) => col.id !== "actions"),
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
  const activeFiltersCount = useMemo(
    () =>
      filterConfigs.filter((config) => config.value !== "todos" && config.value !== "all").length,
    [filterConfigs]
  );

  // Limpar todos os filtros
  const clearAllFilters = () => {
    table.resetGlobalFilter();
    table.resetColumnFilters();
    filterConfigs.forEach((config) => config.onChange("todos"));
  };

  return (
    <div className="flex h-full w-full flex-col">
      {(title || subtitle || actionButton) && (
        <div className="mb-4 flex-none">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500">{subtitle}</p>
            </div>
            {actionButton}
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col rounded-xl bg-white shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex-none border-b border-slate-100 px-6 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full rounded-full border-slate-200 bg-white py-2 pl-10 pr-4 text-gray-700 shadow-sm transition-all duration-300 ease-in-out hover:border-azul/30 focus:ring-2 focus:ring-azul/20"
              />
            </div>

            {filterConfigs.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 rounded-full border-slate-200 bg-white text-xs text-gray-600 shadow-sm transition-all duration-300 ease-in-out hover:border-azul/30 hover:bg-slate-50 hover:text-azul hover:shadow-md"
                  >
                    <Filter className="h-3 w-3" />
                    <span>Filtros</span>
                    {activeFiltersCount > 0 ? (
                      <div className="flex items-center gap-1">
                        {filterConfigs
                          .filter((config) => config.value !== "todos" && config.value !== "all")
                          .map((config) => {
                            const selectedOption = config.options.find(
                              (opt) => opt.value === config.value
                            );
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
                <DropdownMenuContent
                  align="start"
                  className="w-[480px] rounded-xl border border-slate-100/80 bg-white/95 p-4 shadow-lg backdrop-blur-sm"
                >
                  <DropdownMenuLabel className="mb-2 flex items-center justify-between px-2 py-1">
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
                        className="h-7 rounded-full px-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-azul"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Limpar todos
                      </Button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1" />

                  {/* Agrupar filtros por categorias */}
                  <div className="grid grid-cols-2 gap-3 p-1.5">
                    {filterConfigs.map((config) => (
                      <DropdownMenuGroup key={config.id} className="rounded-lg bg-slate-50/50 p-3">
                        <DropdownMenuLabel className="mb-2 px-1 text-xs font-medium text-slate-700">
                          {config.label}
                        </DropdownMenuLabel>
                        <div className="grid grid-cols-1 gap-1">
                          {config.options.map((option) => (
                            <DropdownMenuItem
                              key={option.id}
                              className={cn(
                                "mb-0.5 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-all duration-200 ease-in-out",
                                config.value === option.value
                                  ? "bg-white font-medium text-azul shadow-sm"
                                  : option.badge?.status === "ESTE_MES"
                                    ? "text-slate-700 hover:bg-green-50/80 hover:text-green-600"
                                    : option.badge?.status === "PROXIMO_MES"
                                      ? "text-slate-700 hover:bg-blue-50/80 hover:text-blue-600"
                                      : option.badge?.status === "ESTE_ANO"
                                        ? "text-slate-700 hover:bg-purple-50/80 hover:text-purple-600"
                                        : option.badge?.status === "ATRASADO"
                                          ? "text-slate-700 hover:bg-red-50/80 hover:text-red-600"
                                          : option.badge?.status === "APROVADO"
                                            ? "text-slate-700 hover:bg-emerald-50/80 hover:text-emerald-600"
                                            : option.badge?.status === "PENDENTE"
                                              ? "text-slate-700 hover:bg-amber-50/80 hover:text-amber-600"
                                              : option.badge?.status === "RASCUNHO"
                                                ? "text-slate-700 hover:bg-gray-50/80 hover:text-gray-600"
                                                : option.badge?.status === "EM_DESENVOLVIMENTO"
                                                  ? "text-slate-700 hover:bg-blue-50/80 hover:text-blue-600"
                                                  : option.badge?.status === "CONCLUIDO"
                                                    ? "text-slate-700 hover:bg-azul/5 hover:text-azul"
                                                    : "text-slate-700 hover:bg-white/90 hover:text-azul"
                              )}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                config.onChange(option.value);
                              }}
                            >
                              <div className="flex flex-1 items-center gap-2">
                                {option.badge ? (
                                  <BadgeEstado
                                    status={option.badge.status}
                                    label=""
                                    variant={option.badge.variant as any}
                                    customClassName="w-2.5 h-2.5 p-0 rounded-full min-w-0"
                                  />
                                ) : (
                                  <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
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
              <div className="flex flex-wrap gap-2 duration-300 ease-in-out animate-in fade-in slide-in-from-top-4">
                {filterConfigs
                  .filter((config) => config.value !== "todos" && config.value !== "all")
                  .map((config) => {
                    const selectedOption = config.options.find((opt) => opt.value === config.value);
                    return (
                      <Badge
                        key={config.id}
                        className={cn(
                          "flex h-9 items-center gap-2 rounded-full px-3 transition-all duration-300 ease-in-out",
                          selectedOption?.badge?.status === "ESTE_MES" &&
                            "border border-green-200 bg-green-50 text-green-600 hover:border-green-300 hover:bg-green-100",
                          selectedOption?.badge?.status === "PROXIMO_MES" &&
                            "border border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:bg-blue-100",
                          selectedOption?.badge?.status === "ESTE_ANO" &&
                            "border border-purple-200 bg-purple-50 text-purple-600 hover:border-purple-300 hover:bg-purple-100",
                          selectedOption?.badge?.status === "ATRASADO" &&
                            "border border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100",
                          selectedOption?.badge?.status === "APROVADO" &&
                            "border border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-100",
                          selectedOption?.badge?.status === "PENDENTE" &&
                            "border border-amber-200 bg-amber-50 text-amber-600 hover:border-amber-300 hover:bg-amber-100",
                          selectedOption?.badge?.status === "RASCUNHO" &&
                            "border border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100",
                          selectedOption?.badge?.status === "EM_DESENVOLVIMENTO" &&
                            "border border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:bg-blue-100",
                          selectedOption?.badge?.status === "CONCLUIDO" &&
                            "border border-azul/20 bg-azul/10 text-azul hover:border-azul/30 hover:bg-azul/20",
                          !selectedOption?.badge &&
                            "border border-azul/20 bg-azul/10 text-azul hover:border-azul/30 hover:bg-azul/20"
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
                        <span>
                          {config.label}: {selectedOption?.label}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => config.onChange("todos")}
                          className={cn(
                            "ml-1 h-5 w-5 rounded-full p-0 transition-colors duration-200 ease-in-out",
                            selectedOption?.badge?.status === "ESTE_MES" &&
                              "hover:bg-green-100/70 hover:text-green-700",
                            selectedOption?.badge?.status === "PROXIMO_MES" &&
                              "hover:bg-blue-100/70 hover:text-blue-700",
                            selectedOption?.badge?.status === "ESTE_ANO" &&
                              "hover:bg-purple-100/70 hover:text-purple-700",
                            selectedOption?.badge?.status === "ATRASADO" &&
                              "hover:bg-red-100/70 hover:text-red-700",
                            selectedOption?.badge?.status === "APROVADO" &&
                              "hover:bg-emerald-100/70 hover:text-emerald-700",
                            selectedOption?.badge?.status === "PENDENTE" &&
                              "hover:bg-amber-100/70 hover:text-amber-700",
                            selectedOption?.badge?.status === "RASCUNHO" &&
                              "hover:bg-gray-100/70 hover:text-gray-700",
                            selectedOption?.badge?.status === "EM_DESENVOLVIMENTO" &&
                              "hover:bg-blue-100/70 hover:text-blue-700",
                            selectedOption?.badge?.status === "CONCLUIDO" &&
                              "hover:bg-azul/20 hover:text-azul",
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
        </div>

        <div className="flex-1 overflow-auto">
          <div ref={tableContainerRef} className="min-w-full">
            {isLoading ? (
              <LoadingTable columns={columns} itemsPerPage={dynamicItemsPerPage} />
            ) : table.getRowModel().rows.length === 0 ? (
              <EmptyState message={emptyStateMessage} onClearFilters={clearAllFilters} />
            ) : (
              <div className="px-6">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow
                        key={headerGroup.id}
                        className="border-b border-slate-100 hover:bg-transparent"
                      >
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className="py-3 text-sm font-medium text-slate-700"
                          >
                            {header.isPlaceholder ? null : (
                              <div
                                className={cn(
                                  "flex items-center gap-1",
                                  header.column.getCanSort() &&
                                    "cursor-pointer select-none transition-colors duration-200 hover:text-azul"
                                )}
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {header.column.getCanSort() && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                      "h-6 w-6 rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-50 hover:text-azul",
                                      header.column.getIsSorted() ? "bg-azul/10 text-azul" : ""
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
                          "group cursor-pointer border-b border-slate-100 transition-colors duration-300 ease-in-out",
                          "hover:bg-slate-50/50"
                        )}
                        onClick={() => onRowClick?.(row.original)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="px-2 py-3 text-sm text-slate-700 transition-colors duration-300 group-hover:text-azul"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {table.getPageCount() > 1 && (
          <div className="flex-none border-t border-slate-100 px-6 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                A mostrar{" "}
                <span className="font-medium text-slate-700">
                  {table.getRowModel().rows.length}
                </span>{" "}
                de <span className="font-medium text-slate-700">{data.length}</span> itens
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                  className="h-7 w-7 rounded-full border-slate-200 bg-white p-0 text-slate-700 shadow-sm transition-all duration-300 ease-in-out hover:border-azul/30 hover:bg-slate-50 hover:text-azul hover:shadow-md disabled:opacity-50"
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
                        "h-7 w-7 rounded-full p-0 text-sm shadow-sm transition-all duration-300 ease-in-out hover:shadow-md",
                        table.getState().pagination.pageIndex === pageToShow
                          ? "bg-azul text-white hover:bg-azul/90"
                          : "border-slate-200 bg-white text-slate-700 hover:border-azul/30 hover:bg-slate-50 hover:text-azul"
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
                  className="h-7 w-7 rounded-full border-slate-200 bg-white p-0 text-slate-700 shadow-sm transition-all duration-300 ease-in-out hover:border-azul/30 hover:bg-slate-50 hover:text-azul hover:shadow-md disabled:opacity-50"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente de loading
const LoadingTable = ({
  columns,
  itemsPerPage,
}: {
  columns: ColumnDef<any>[];
  itemsPerPage: number;
}) => (
  <Table>
    <TableHeader>
      <TableRow className="border-b border-slate-100/50 hover:bg-transparent">
        {columns.map((column, idx) => (
          <TableHead
            key={idx}
            className="h-10 px-4 text-left align-middle text-sm font-medium text-slate-700"
          >
            <div className="flex items-center gap-1">
              {typeof column.header === "string" ? column.header : ""}
              <div className="h-4 w-4 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-slate-100/80 backdrop-blur-sm" />
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
              <div className="h-3 w-32 animate-[pulse_1.2s_ease-in-out_infinite] rounded bg-slate-100/80 shadow-sm backdrop-blur-sm" />
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
  onClearFilters,
}: {
  message: { title: string; description: string };
  onClearFilters: () => void;
}) => (
  <div className="py-12 text-center">
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-slate-50/80 shadow-sm backdrop-blur-sm">
        <Search className="h-6 w-6 text-slate-400" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-slate-700">{message.title}</p>
        <p className="text-sm text-slate-500">{message.description}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full border-slate-200 bg-white/90 text-slate-700 shadow-sm transition-all duration-300 ease-in-out hover:border-azul/20 hover:bg-white/50 hover:text-azul hover:shadow-md"
        onClick={onClearFilters}
      >
        Limpar filtros
      </Button>
    </div>
  </div>
);
