import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Filter, X, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type FilterOption = {
  id: string;
  label: string;
  value: string;
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
    columns,
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

      <div className="border bg-white shadow-xl rounded-2xl overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-3 flex flex-wrap items-center gap-4 bg-white">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-azul/20 text-gray-700 hover:shadow-md transition-all duration-300 ease-in-out"
            />
          </div>

          {filterConfigs.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full bg-white hover:bg-gray-50/80 text-xs text-gray-600 hover:text-azul gap-1"
                >
                  <Filter className="h-3 w-3" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-1 h-5 w-5 rounded-full bg-azul text-[10px] text-white">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <div className="space-y-4">
                  {filterConfigs.map((config) => (
                    <div key={config.id} className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        {config.label}
                      </label>
                      <Select
                        value={config.value}
                        onValueChange={config.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {config.options.map((option) => (
                            <SelectItem key={option.id} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-9 rounded-full hover:bg-gray-50/80 text-xs text-gray-600 hover:text-azul gap-1"
              >
                <X className="h-3 w-3" />
                Limpar filtros
              </Button>
              {filterConfigs
                .filter(config => config.value !== "todos" && config.value !== "all")
                .map(config => {
                  const selectedOption = config.options.find(opt => opt.value === config.value);
                  return (
                    <Badge 
                      key={config.id}
                      className="h-9 px-3 rounded-full flex items-center gap-1 bg-azul/10 text-azul border-azul/20"
                    >
                      <span>{config.label}: {selectedOption?.label}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => config.onChange("todos")}
                        className="h-5 w-5 ml-1 p-0 rounded-full hover:bg-white/20"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
            </div>
          )}
        </div>

        <div ref={tableContainerRef} className="relative w-full overflow-hidden px-6">
          {isLoading ? (
            <LoadingTable columns={columns} itemsPerPage={dynamicItemsPerPage} />
          ) : table.getRowModel().rows.length === 0 ? (
            <EmptyState
              message={emptyStateMessage}
              onClearFilters={clearAllFilters}
            />
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b border-gray-100 hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-sm font-medium text-gray-700 py-3 first:pl-0 last:pr-0"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={cn(
                              "flex items-center gap-1",
                              header.column.getCanSort() && "cursor-pointer select-none"
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
                                  "h-6 w-6 rounded-full text-gray-400 hover:text-azul",
                                  header.column.getIsSorted() && "text-azul"
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
                    className="group border-b border-gray-50 hover:bg-azul/5 transition-all duration-300 ease-in-out cursor-pointer"
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="py-3 text-gray-700 text-sm group-hover:text-azul transition-colors duration-300 first:pl-0 last:pr-0"
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
          )}
        </div>

        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between py-3 px-6 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              A mostrar{" "}
              <span className="font-medium">
                {table.getRowModel().rows.length}
              </span>{" "}
              de{" "}
              <span className="font-medium">{data.length}</span> itens
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                className="rounded-full h-7 w-7 p-0 border-gray-200 bg-white hover:bg-gray-50/80 text-gray-700 hover:text-azul transition-all duration-300 ease-in-out shadow-sm hover:shadow-md disabled:opacity-50"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              
              {/* Mostra apenas 5 páginas de cada vez */}
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
                        : "bg-white text-gray-700 hover:bg-gray-50/80 hover:text-azul border-gray-200"
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
                className="rounded-full h-7 w-7 p-0 border-gray-200 bg-white hover:bg-gray-50/80 text-gray-700 hover:text-azul transition-all duration-300 ease-in-out shadow-sm hover:shadow-md disabled:opacity-50"
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
      <TableRow className="border-b border-white/20 hover:bg-transparent">
        {columns.map((column, idx) => (
          <TableHead key={idx} className="h-10 px-4 text-left align-middle text-sm font-medium text-gray-700">
            <div className="flex items-center gap-1">
              {typeof column.header === "string" ? column.header : ""}
              <div className="h-4 w-4 rounded-full bg-gray-100 animate-[pulse_1s_ease-in-out_infinite]" />
            </div>
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {[...Array(itemsPerPage)].map((_, i) => (
        <TableRow key={i} className="border-b border-white/10">
          {columns.map((_, idx) => (
            <TableCell key={idx} className="h-11 px-4 align-middle">
              <div className="h-3 w-32 bg-gray-100 rounded animate-[pulse_1s_ease-in-out_infinite]" />
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
      <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
        <Search className="h-6 w-6 text-gray-400" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-gray-700">{message.title}</p>
        <p className="text-sm text-gray-500">{message.description}</p>
      </div>
      <Button 
        variant="outline" 
        size="sm"
        className="rounded-full border-gray-200 bg-white text-gray-700 hover:text-azul hover:bg-white"
        onClick={onClearFilters}
      >
        Limpar filtros
      </Button>
    </div>
  </div>
); 