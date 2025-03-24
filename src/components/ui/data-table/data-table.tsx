"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  FilterFn,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "./pagination";
import { DataTableToolbar } from "./toolbar";
import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

// Função de filtro global personalizada para pesquisar em todas as propriedades
const globalFilterFn: FilterFn<any> = (row, columnId, value) => {
  const searchTerm = String(value).toLowerCase();
  if (!searchTerm) return true;

  // Obtém todos os valores da linha atual (todas as propriedades do objeto)
  const allValues = Object.values(row.original);
  
  // Verifica se algum valor inclui o termo de pesquisa
  return allValues.some(val => {
    if (val == null) return false;
    return String(val).toLowerCase().includes(searchTerm);
  });
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  title?: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
  isLoading?: boolean;
  searchPlaceholder?: string;
  filterConfigs?: any[];
  initialSorting?: SortingState;
  initialPageSize?: number;
  serverSidePagination?: {
    totalItems: number;
    pageCount: number;
    pageIndex: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
  emptyStateMessage?: {
    title: string;
    description: string;
  };
  onRowClick?: (item: TData) => void;
  onClearFilters?: () => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  title,
  subtitle,
  actionButton,
  isLoading = false,
  searchPlaceholder = "Pesquisar...",
  filterConfigs = [],
  initialSorting = [],
  initialPageSize = 10,
  serverSidePagination,
  emptyStateMessage = {
    title: "Nenhum item encontrado",
    description: "Experimente ajustar os filtros de pesquisa ou remover o termo de pesquisa."
  },
  onRowClick,
  onClearFilters,
}: DataTableProps<TData, TValue>) {
  // Estado para pesquisa global com debounce
  const [searchInput, setSearchInput] = useState("");
  const [globalFilter, setGlobalFilter] = useState("");
  
  // Debounce para o filtro global
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setGlobalFilter(searchInput);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchInput]);
  
  // Estado para ordenação
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  
  // Estado para filtros de coluna
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Configuração da tabela do TanStack
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn, // Usar o filtro personalizado
    state: {
      sorting,
      globalFilter,
      columnFilters,
      ...(serverSidePagination ? {
        pagination: {
          pageIndex: serverSidePagination.pageIndex - 1, // TanStack usa base 0
          pageSize: serverSidePagination.pageSize,
        }
      } : {}),
    },
    ...(serverSidePagination ? {
      manualPagination: true,
      pageCount: serverSidePagination.pageCount,
    } : {
      getPaginationRowModel: getPaginationRowModel(),
    }),
  });

  // Configurar o tamanho da página inicial
  useEffect(() => {
    if (!serverSidePagination) {
      table.setPageSize(initialPageSize);
    }
  }, [initialPageSize, serverSidePagination, table]);

  // Manipulador para mudança de página no modo de paginação do servidor
  const handlePageChange = (page: number) => {
    if (serverSidePagination) {
      serverSidePagination.onPageChange(page);
    } else {
      table.setPageIndex(page - 1); // TanStack usa base 0
    }
  };

  // Limpar todos os filtros
  const clearAllFilters = () => {
    setSearchInput("");
    setGlobalFilter("");
    setColumnFilters([]);
    if (onClearFilters) {
      onClearFilters();
    }
  };

  // Reconfigurar página ao filtrar
  useEffect(() => {
    if (!serverSidePagination) {
      table.setPageIndex(0);
    }
  }, [globalFilter, columnFilters, table, serverSidePagination]);

  return (
    <div className="h-fit bg-gradient-to-b from-gray-50 to-gray-100 custom-blue-blur">
      <div className="max-w-8xl mx-auto space-y-8">
        {(title || subtitle || actionButton) && (
          <div className="flex items-center justify-between">
            {(title || subtitle) && (
              <div className="space-y-1">
                {title && <h1 className="text-3xl font-bold text-gray-900">{title}</h1>}
                {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
              </div>
            )}
            {actionButton}
          </div>
        )}

        <div className="border bg-card text-card-foreground border-none shadow-xl rounded-2xl glass-card border-white/20 hover:shadow-2xl transition-all duration-300 ease-in-out overflow-hidden mt-0">
          <DataTableToolbar 
            table={table} 
            searchPlaceholder={searchPlaceholder}
            filterConfigs={filterConfigs}
            clearAllFilters={clearAllFilters}
            globalFilter={searchInput}
            setGlobalFilter={setSearchInput}
          />

          <div className="p-6 pt-0 pb-1">
            <div className="relative w-full overflow-auto">
              {isLoading ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/20 hover:bg-transparent">
                      {columns.map((column, index) => (
                        <TableHead key={index} className="h-12 px-4 text-left align-middle text-sm font-medium text-gray-700">
                          <div className="flex items-center gap-1">
                            {column.header ? typeof column.header === 'function' 
                              ? (column.header as any)({})
                              : column.header 
                              : column.id}
                            <div className="h-5 w-5 rounded-full bg-gray-100 animate-[pulse_1s_ease-in-out_infinite]" />
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(initialPageSize)].map((_, i) => (
                      <TableRow key={i} className="border-b border-white/10">
                        {columns.map((column, j) => (
                          <TableCell key={j} className="h-[52px] px-4 align-middle">
                            <div className="h-4 w-32 bg-gray-100 rounded animate-[pulse_1s_ease-in-out_infinite]" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : table.getRowModel().rows.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-medium text-gray-700">{emptyStateMessage.title}</p>
                      <p className="text-sm text-gray-500">
                        {emptyStateMessage.description}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="rounded-full border-gray-200 bg-white text-gray-700 hover:text-azul hover:bg-white"
                      onClick={clearAllFilters}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="border-b border-gray-100 hover:bg-transparent">
                        {headerGroup.headers.map((header) => (
                          <TableHead 
                            key={header.id} 
                            className="text-sm font-medium text-gray-700 py-4"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
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
                        data-state={row.getIsSelected() && "selected"}
                        className="group border-b border-white/10 hover:bg-azul/5 transition-all duration-300 ease-in-out cursor-pointer"
                        onClick={() => onRowClick && onRowClick(row.original)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell 
                            key={cell.id} 
                            className="py-4 text-gray-700 group-hover:text-azul transition-colors duration-300"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {(serverSidePagination?.pageCount || table.getPageCount()) > 1 && (
            <DataTablePagination 
              table={table} 
              currentPage={serverSidePagination?.pageIndex || table.getState().pagination.pageIndex + 1}
              totalPages={serverSidePagination?.pageCount || table.getPageCount()}
              onPageChange={handlePageChange}
              totalItems={serverSidePagination?.totalItems || table.getFilteredRowModel().rows.length}
            />
          )}
        </div>
      </div>
    </div>
  );
} 