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
import type { ColumnDef, SortingState, ColumnFiltersState, PaginationState } from "@tanstack/react-table";
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
}: TabelaDadosProps<TData>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [dynamicItemsPerPage, setDynamicItemsPerPage] = useState(itemsPerPage);
  
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: dynamicItemsPerPage,
  });

  const calculateItemsPerPage = useCallback(() => {
    if (!tableContainerRef.current) return itemsPerPage;

    const ROW_HEIGHT = 44;
    const HEADER_FOOTER_HEIGHT = 70;
    const MIN_ROWS = 5;
    const MAX_ROWS = 25;

    const availableHeight = tableContainerRef.current.clientHeight - HEADER_FOOTER_HEIGHT;
    const calculatedItems = Math.max(1, Math.floor((availableHeight + 5) / ROW_HEIGHT));
    
    return Math.max(MIN_ROWS, Math.min(calculatedItems, MAX_ROWS));
  }, [itemsPerPage]);

  useEffect(() => {
    const updateItemsPerPage = () => {
      const calculated = calculateItemsPerPage();
      
      if (tableContainerRef.current) {
        console.log(`Altura do container: ${tableContainerRef.current.clientHeight}px`);
        console.log(`Altura disponível calculada: ${tableContainerRef.current.clientHeight - 70}px`);
        console.log(`Linhas calculadas (antes): ${Math.floor((tableContainerRef.current.clientHeight - 80) / 44)}`);
        console.log(`Linhas calculadas (após ajuste): ${Math.floor((tableContainerRef.current.clientHeight - 70 + 5) / 44)}`);
        console.log(`Itens por página definido: ${calculated}`);
      }
      
      setDynamicItemsPerPage(prev => prev !== calculated ? calculated : prev);
    };

    updateItemsPerPage();

    const observer = new ResizeObserver(updateItemsPerPage);
    const containerElement = tableContainerRef.current;
    if (containerElement) {
      observer.observe(containerElement);
    }

    return () => {
      if (containerElement) {
        observer.unobserve(containerElement);
      }
      observer.disconnect();
    };
  }, [calculateItemsPerPage]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      pageSize: dynamicItemsPerPage
    }));
  }, [dynamicItemsPerPage]);

  const table = useReactTable({
    data,
    columns,
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
    autoResetPageIndex: false,
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
    filterConfigs.forEach((config) => config.onChange("todos"));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
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
            pageNumbers.push('...');
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        if (endPage < totalPages - 2) {
            pageNumbers.push('...');
        }

        pageNumbers.push(totalPages - 1);
    }

    return pageNumbers;
  }, [table.getPageCount(), table.getState().pagination.pageIndex]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md transition-all hover:shadow-lg">
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-9 w-full rounded-full border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-slate-700 shadow-inner transition-all duration-200 ease-in-out focus:border-azul/30 focus:bg-white focus:ring-1 focus:ring-azul/20"
            />
          </div>

          <div className="flex items-center gap-3">
            {filterConfigs.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 rounded-full border-slate-200 bg-white text-xs font-medium text-slate-600 shadow-sm transition-all duration-200 ease-in-out hover:border-azul/30 hover:bg-azul/5 hover:text-azul hover:shadow-md"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    <span>Filtros</span>
                    {activeFiltersCount > 0 && (
                      <Badge className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-azul p-0 text-[10px] font-semibold text-white">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-72 rounded-xl border border-slate-100/80 bg-white/95 p-3 shadow-lg backdrop-blur-sm"
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
                        className="h-7 rounded-full px-2 text-xs text-slate-500 hover:bg-slate-100 hover:text-azul"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Limpar
                      </Button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="-mx-3 my-1 bg-slate-100" />

                  <div className="space-y-3 p-1.5">
                    {filterConfigs.map((config) => (
                      <div key={config.id}>
                        <p className="mb-2 px-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
                          {config.label}
                        </p>
                        <div className="grid grid-cols-1 gap-1">
                          {config.options.map((option) => (
                            <DropdownMenuItem
                              key={option.id}
                              className={cn(
                                "mb-0.5 flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm font-normal transition-colors duration-150 ease-in-out",
                                config.value === option.value
                                  ? "bg-azul/10 font-medium text-azul"
                                  : "text-slate-700 hover:bg-slate-100"
                              )}
                              onSelect={(e) => {
                                e.preventDefault();
                                config.onChange(option.value);
                                setPagination(prev => ({ ...prev, pageIndex: 0 }));
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {option.badge ? (
                                  <BadgeEstado
                                    status={option.badge.status}
                                    label=""
                                    variant={option.badge.variant as any}
                                    customClassName="w-2 h-2 p-0 rounded-full min-w-0"
                                  />
                                ) : (
                                  option.value !== 'todos' && option.value !== 'all' && <div className="h-2 w-2 rounded-full bg-slate-300" />
                                )}
                                <span>{option.label}</span>
                              </div>
                              {config.value === option.value && (
                                <Check className="h-4 w-4 text-azul" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {activeFiltersCount > 0 && (
              <div className="hidden flex-wrap items-center gap-2 md:flex">
                {filterConfigs
                  .filter((config) => config.value !== "todos" && config.value !== "all")
                  .map((config) => {
                    const selectedOption = config.options.find((opt) => opt.value === config.value);
                    return (
                      <Badge
                        key={config.id}
                        variant="outline"
                        className="flex h-7 items-center gap-1.5 rounded-full border-blue-200 bg-blue-50/80 px-2.5 py-0.5 text-xs font-medium text-blue-700 shadow-sm"
                      >
                        {selectedOption?.badge && (
                          <BadgeEstado
                            status={selectedOption.badge.status}
                            label=""
                            variant={selectedOption.badge.variant as any}
                            customClassName="w-1.5 h-1.5 p-0 rounded-full min-w-0"
                          />
                        )}
                        <span>
                          {config.label}: {selectedOption?.label}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            config.onChange("todos");
                            setPagination(prev => ({ ...prev, pageIndex: 0 }));
                          }}
                          className="ml-1 h-4 w-4 rounded-full p-0 text-blue-500 hover:bg-blue-100 hover:text-blue-700"
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </Badge>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={tableContainerRef} className="flex-1 overflow-auto min-h-[400px]">
        <div className="h-full min-w-full">
          {isLoading ? (
            <LoadingTable columns={columns} itemsPerPage={dynamicItemsPerPage} />
          ) : table.getFilteredRowModel().rows.length === 0 ? (
            <EmptyState message={emptyStateMessage} onClearFilters={clearAllFilters} />
          ) : (
            <div className="h-full">
              <Table className="border-separate border-spacing-y-0.5 px-6 h-full">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      key={headerGroup.id}
                      className="border-b-0"
                    >
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={cn(
                            "h-10 px-3 py-2 align-middle text-xs font-semibold uppercase tracking-wider text-slate-500 sticky top-0 bg-white/95 backdrop-blur-sm z-10",
                            (header.column.columnDef.meta as any)?.align === 'right' ? 'text-right' : 'text-left'
                          )}
                          style={{ top: '-1px' }}
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
                                    "h-5 w-5 rounded-full p-0 text-slate-400 transition-all duration-150 hover:bg-slate-100 hover:text-azul",
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
                        "group transition-all duration-150 ease-in-out",
                        onRowClick ? "cursor-pointer hover:bg-slate-50/70 hover:shadow-sm" : "",
                        row.getIsSelected() && "bg-azul/5 hover:bg-azul/10",
                        "border-b-0"
                      )}
                      onClick={() => onRowClick?.(row.original)}
                      style={{ borderRadius: '8px' }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "h-[44px] px-3 py-2.5 align-middle text-sm font-normal text-slate-700 transition-colors duration-150",
                            "group-hover:text-slate-800 first:rounded-l-lg last:rounded-r-lg",
                            row.getIsSelected() && "text-azul/90 font-medium"
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
                  de <span className="font-medium text-slate-700">{table.getFilteredRowModel().rows.length}</span> itens
                </p>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!table.getCanPreviousPage()}
                    onClick={() => table.previousPage()}
                    aria-label="Página anterior"
                    className="h-7 w-7 rounded-full border-slate-200 bg-white p-0 text-slate-500 shadow-sm transition-all duration-150 hover:border-azul/30 hover:bg-slate-50 hover:text-azul hover:shadow disabled:opacity-50 disabled:hover:shadow-sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {paginationNumbers.map((page, index) =>
                    typeof page === 'number' ? (
                      <Button
                        key={page}
                        onClick={() => {
                          setPagination(prev => ({ ...prev, pageIndex: page }));
                        }}
                        aria-label={`Ir para página ${page + 1}`}
                        className={cn(
                          "h-7 w-7 rounded-full p-0 text-xs shadow-sm transition-all duration-150 hover:shadow",
                           pagination.pageIndex === page
                            ? "bg-azul font-medium text-white hover:bg-azul/90"
                            : "border border-slate-200 bg-white font-normal text-slate-600 hover:border-azul/30 hover:bg-slate-50 hover:text-azul"
                        )}
                      >
                        {page + 1}
                      </Button>
                    ) : (
                      <span key={`ellipsis-${index}`} className="flex h-7 w-7 items-center justify-center p-0 text-xs text-slate-400">...</span>
                    )
                  )}

                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!table.getCanNextPage()}
                    onClick={() => table.nextPage()}
                    aria-label="Próxima página"
                    className="h-7 w-7 rounded-full border-slate-200 bg-white p-0 text-slate-500 shadow-sm transition-all duration-150 hover:border-azul/30 hover:bg-slate-50 hover:text-azul hover:shadow disabled:opacity-50 disabled:hover:shadow-sm"
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
              className="h-10 px-3 py-2 text-left align-middle text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
               <div className="h-4 w-20 animate-pulse rounded bg-slate-200/80"></div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(itemsPerPage)].map((_, i) => (
          <TableRow key={i} className="border-b-0 hover:bg-transparent">
            {columns.map((_, idx) => (
              <TableCell key={idx} className="h-[44px] px-3 py-2.5 align-middle">
                <div className="h-4 w-full animate-pulse rounded bg-slate-100/80 shadow-sm" />
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
