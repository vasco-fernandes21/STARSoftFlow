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
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
} from "@tanstack/react-table";
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BadgeEstado } from "@/components/common/BadgeEstado";
import { usePermissions } from "@/hooks/usePermissions";

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
  title?: string;
  subtitle?: string;
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
  rowSelection?: Record<string, boolean>;
  setRowSelection?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  getRowId?: (row: TData) => string;
  hideActionForPermissions?: boolean;
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
    description: "Experimente ajustar os filtros de pesquisa ou remover o texto na pesquisa.",
  },
  onRowClick,
  rowSelection,
  setRowSelection,
  getRowId,
  hideActionForPermissions = false,
}: TabelaDadosProps<TData>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: itemsPerPage,
  });
  const { isGestor } = usePermissions();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Filtrar colunas de ação quando o utilizador não tem permissão
  const filteredColumns = useMemo(() => {
    if (!hideActionForPermissions || isGestor) {
      return columns;
    }
    
    // Filtrar colunas que são de ações (geralmente última coluna ou colunas com meta.isAction)
    return columns.filter(col => !(col.meta as any)?.isAction);
  }, [columns, hideActionForPermissions, isGestor]);

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageSize: itemsPerPage,
    }));
  }, [itemsPerPage]);

  const table = useReactTable({
    data,
    columns: filteredColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      pagination,
      ...(rowSelection && { rowSelection }),
    },
    ...(getRowId && { getRowId }),
    ...(setRowSelection && { onRowSelectionChange: setRowSelection }),
    manualPagination: false,
    autoResetPageIndex: true,
    enableRowSelection: !!rowSelection,
  });

  const activeFiltersCount = useMemo(
    () =>
      filterConfigs.filter((config) => config.value !== "todos" && config.value !== "all").length,
    [filterConfigs]
  );

  const clearAllFilters = () => {
    table.resetGlobalFilter();
    table.resetColumnFilters();
    filterConfigs.forEach((config) => {
      config.onChange("all");
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setGlobalFilter("");
  };

  const paginationNumbers = useMemo(() => {
    const totalPages = table.getPageCount();
    const currentPage = table.getState().pagination.pageIndex;
    const pageNumbers: (number | string)[] = [];
    const MAX_VISIBLE_PAGES_AROUND_CURRENT = 1;
    const MAX_TOTAL_VISIBLE_BUTTONS = 5;

    if (totalPages <= MAX_TOTAL_VISIBLE_BUTTONS + 2) {
      for (let i = 0; i < totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(0);

      const startPage = Math.max(1, currentPage - MAX_VISIBLE_PAGES_AROUND_CURRENT);
      const endPage = Math.min(totalPages - 2, currentPage + MAX_VISIBLE_PAGES_AROUND_CURRENT);

      if (startPage > 1) {
        pageNumbers.push("...");
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (endPage < totalPages - 2) {
        pageNumbers.push("...");
      }

      pageNumbers.push(totalPages - 1);
    }

    return pageNumbers;
  }, [table]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
      {(title || subtitle || actionButton) && (
        <div className="mb-4 flex-none px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500">{subtitle}</p>
            </div>
            {actionButton}
          </div>
        </div>
      )}

      <div className="flex-none border-b border-slate-100 px-6 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={globalFilter ?? ""}
                onChange={(e) => {
                  setGlobalFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                className="h-9 w-full rounded-full border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-slate-700 shadow-inner transition-all duration-200 ease-in-out focus:border-azul/30 focus:bg-white focus:ring-1 focus:ring-azul/20"
              />
              {globalFilter && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setGlobalFilter("");
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                  className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {filterConfigs.length > 0 && (
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      clearAllFilters();
                    }}
                    className="h-9 rounded-full px-3 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Limpar filtros
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={activeFiltersCount > 0 ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-9 gap-2 rounded-full text-xs font-medium shadow-sm transition-all duration-200 ease-in-out",
                        activeFiltersCount > 0 
                          ? "bg-azul text-white hover:bg-azul/90" 
                          : "border-slate-200 bg-white text-slate-600 hover:border-azul/30 hover:bg-azul/5 hover:text-azul hover:shadow-none"
                      )}
                    >
                      <Filter className="h-3.5 w-3.5" />
                      <span>Filtros</span>
                      {activeFiltersCount > 0 && (
                        <Badge className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white p-0 text-[10px] font-semibold text-azul">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-80 rounded-xl border border-slate-100/80 bg-white/95 p-4 shadow-lg backdrop-blur-sm"
                  >
                    <DropdownMenuLabel className="mb-3 flex items-center justify-between px-1">
                      <span className="text-sm font-semibold text-slate-800">Filtros avançados</span>
                      {activeFiltersCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            clearAllFilters();
                          }}
                          className="h-7 rounded-full px-2 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="mr-1 h-3 w-3" />
                          Limpar todos
                        </Button>
                      )}
                    </DropdownMenuLabel>

                    <div className="space-y-4">
                      {filterConfigs.map((config) => (
                        <div key={config.id} className="border-b border-slate-100 pb-3 last:border-0">
                          <p className="mb-2 px-1 text-xs font-semibold text-slate-700">
                            {config.label}
                          </p>
                          <div className="flex flex-wrap gap-1.5 px-1">
                            {config.options.map((option) => {
                              const isSelected = config.value === option.value;
                              return (
                                <button
                                  key={option.id}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                                    isSelected
                                      ? "border-azul/30 bg-azul/10 text-azul shadow-sm"
                                      : "border-slate-200 bg-white text-slate-700 hover:border-azul/20 hover:bg-slate-50"
                                  )}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    config.onChange(option.value);
                                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                                  }}
                                >
                                  {option.badge ? (
                                    <BadgeEstado
                                      status={option.badge.status}
                                      label=""
                                      variant={option.badge.variant as any}
                                      customClassName="w-2 h-2 p-0 rounded-full min-w-0"
                                    />
                                  ) : (
                                    option.value !== "all" && option.value !== "todos" && (
                                      <div className="h-2 w-2 rounded-full bg-slate-300" />
                                    )
                                  )}
                                  <span>{option.label}</span>
                                  {isSelected && (
                                    <Check className="ml-1 h-3 w-3 text-azul" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {filterConfigs
                .filter((config) => config.value !== "todos" && config.value !== "all")
                .map((config) => {
                  const selectedOption = config.options.find((opt) => opt.value === config.value);
                  return (
                    <Badge
                      key={config.id}
                      variant="outline"
                      className="flex h-8 items-center gap-1.5 rounded-lg border border-azul/20 bg-azul/5 px-3 py-0.5 text-xs font-medium text-azul shadow-sm"
                    >
                      {selectedOption?.badge && (
                        <BadgeEstado
                          status={selectedOption.badge.status}
                          label=""
                          variant={selectedOption.badge.variant as any}
                          customClassName="w-2 h-2 p-0 rounded-full min-w-0"
                        />
                      )}
                      <span className="text-slate-700 font-semibold">
                        {config.label}:
                      </span>
                      <span className="text-azul">
                        {selectedOption?.label}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          config.onChange("all");
                          table.resetColumnFilters();
                          setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                        }}
                        className="ml-1 h-5 w-5 rounded-full p-0 text-azul hover:bg-red-50 hover:text-red-600"
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

      <div ref={tableContainerRef} className="min-h-[400px] flex-1 overflow-auto">
        <div className="h-full min-w-full">
          {isLoading ? (
            <LoadingTable columns={columns} itemsPerPage={itemsPerPage} />
          ) : table.getFilteredRowModel().rows.length === 0 ? (
            <EmptyState message={emptyStateMessage} onClearFilters={clearAllFilters} />
          ) : (
            <div className="h-full">
              <Table className="h-full border-separate border-spacing-y-1 px-6">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="border-b-0">
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={cn(
                            "sticky top-0 z-10 h-10 bg-white/95 px-3 py-2 align-middle text-xs font-medium uppercase tracking-wider text-slate-500 backdrop-blur-sm",
                            (header.column.columnDef.meta as any)?.align === "right"
                              ? "text-right"
                              : "text-left"
                          )}
                          style={{ top: "-1px" }}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={cn(
                                "flex items-center gap-1.5",
                                header.column.getCanSort() &&
                                  "cursor-pointer select-none transition-colors duration-150 hover:text-azul"
                              )}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-5 w-5 rounded-md p-0 text-slate-400 transition-all duration-150 hover:bg-slate-100 hover:text-azul",
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
                <TableBody className="flex-1">
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "group transition-colors duration-150 ease-in-out",
                        onRowClick ? "cursor-pointer hover:bg-blue-50/40" : "",
                        row.getIsSelected() && "bg-blue-50/70 hover:bg-blue-50/90",
                        "border-b-0"
                      )}
                      onClick={() => onRowClick?.(row.original)}
                      style={{ borderRadius: "8px" }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "h-[46px] px-3 py-3 align-middle text-sm font-normal text-slate-700 transition-colors duration-150",
                            "first:rounded-l-lg last:rounded-r-lg",
                            onRowClick && "group-hover:text-slate-900",
                            row.getIsSelected() && "font-medium text-azul",
                            (cell.column.columnDef.meta as any)?.align === "right" && "text-right",
                            (cell.column.columnDef.meta as any)?.align === "center" && "text-center",
                            !((cell.column.columnDef.meta as any)?.align) && "text-left"
                          )}
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

      {table.getPageCount() > 1 && !isLoading && table.getFilteredRowModel().rows.length > 0 && (
        <div className="flex-none border-t border-slate-100 px-6 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              A mostrar{" "}
              <span className="font-medium text-slate-700">
                {pagination.pageIndex * pagination.pageSize + 1}-
                {Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}
              </span>{" "}
              de{" "}
              <span className="font-medium text-slate-700">
                {table.getFilteredRowModel().rows.length}
              </span>{" "}
              itens
            </p>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                aria-label="Página anterior"
                className="h-7 w-7 rounded-md border-slate-200 bg-white p-0 text-slate-500 shadow-sm transition-all duration-150 hover:border-azul/30 hover:bg-slate-50 hover:text-azul hover:shadow-none disabled:opacity-50 disabled:hover:shadow-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {paginationNumbers.map((page, index) =>
                typeof page === "number" ? (
                  <Button
                    key={page}
                    onClick={() => {
                      setPagination((prev) => ({ ...prev, pageIndex: page }));
                    }}
                    aria-label={`Ir para página ${page + 1}`}
                    className={cn(
                      "h-7 w-7 rounded-md p-0 text-xs shadow-sm transition-all duration-150 hover:shadow-none",
                      pagination.pageIndex === page
                        ? "bg-azul font-medium text-white hover:bg-azul/90"
                        : "border border-slate-200 bg-white font-normal text-slate-600 hover:border-azul/30 hover:bg-slate-50 hover:text-azul"
                    )}
                  >
                    {page + 1}
                  </Button>
                ) : (
                  <span
                    key={`ellipsis-${index}`}
                    className="flex h-7 w-4 items-center justify-center p-0 text-xs text-slate-400"
                  >
                    ...
                  </span>
                )
              )}

              <Button
                variant="outline"
                size="icon"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                aria-label="Próxima página"
                className="h-7 w-7 rounded-md border-slate-200 bg-white p-0 text-slate-500 shadow-sm transition-all duration-150 hover:border-azul/30 hover:bg-slate-50 hover:text-azul hover:shadow-none disabled:opacity-50 disabled:hover:shadow-none"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const LoadingTable = ({
  columns,
  itemsPerPage,
}: {
  columns: ColumnDef<any>[];
  itemsPerPage: number;
}) => (
  <div className="px-6 pb-6">
    <Table>
      <TableHeader>
        <TableRow className="border-b border-slate-100/50 hover:bg-transparent">
          {columns.map((column, idx) => (
            <TableHead
              key={idx}
              className="h-10 px-3 py-2 text-left align-middle text-xs font-medium uppercase tracking-wider text-slate-500"
            >
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200/80"></div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(itemsPerPage)].map((_, i) => (
          <TableRow key={i} className="border-b-0 hover:bg-transparent">
            {columns.map((_, idx) => (
              <TableCell key={idx} className="h-[46px] px-3 py-3 align-middle">
                <div className={cn(
                  "h-4 w-full animate-pulse rounded bg-slate-100/80",
                  idx === 0 ? "w-full max-w-[180px]" : "w-full"
                )} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const EmptyState = ({
  message,
  onClearFilters,
}: {
  message: { title: string; description: string };
  onClearFilters: () => void;
}) => (
  <div className="flex h-full items-center justify-center py-12 text-center">
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 shadow-sm">
        <Search className="h-6 w-6 text-slate-400" />
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-medium text-slate-700">{message.title}</p>
        <p className="text-sm text-slate-500">{message.description}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-2 rounded-full border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition-all duration-200 ease-in-out hover:border-azul/30 hover:bg-azul/5 hover:text-azul hover:shadow-none"
        onClick={onClearFilters}
      >
        <X className="mr-1.5 h-3.5 w-3.5" />
        Limpar filtros
      </Button>
    </div>
  </div>
);
