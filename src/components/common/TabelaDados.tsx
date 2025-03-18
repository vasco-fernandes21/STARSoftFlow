import { useState, useMemo } from "react";
import { Search, Filter, X, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
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

export type SortConfig = {
  field: string | null;
  direction: 'asc' | 'desc';
  onChange: (field: string) => void;
};

export type ColumnConfig = {
  id: string;
  label: string;
  sortable?: boolean;
  sortField?: string;
  renderHeader?: () => React.ReactNode;
  renderCell: (item: any) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
};

type TabelaDadosProps = {
  title: string;
  subtitle: string;
  actionButton?: React.ReactNode;
  data: any[];
  isLoading: boolean;
  columns: ColumnConfig[];
  searchConfig: {
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
  };
  filterConfigs: FilterConfig[];
  sortConfig: SortConfig;
  itemsPerPage: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalItems?: number;
  totalPages?: number;
  emptyStateMessage?: {
    title: string;
    description: string;
  };
  onRowClick?: (item: any) => void;
  clearAllFilters: () => void;
};

export const TabelaDados = ({
  title,
  subtitle,
  actionButton,
  data,
  isLoading,
  columns,
  searchConfig,
  filterConfigs,
  sortConfig,
  itemsPerPage,
  currentPage,
  setCurrentPage,
  totalItems,
  totalPages,
  emptyStateMessage = {
    title: "Nenhum item encontrado",
    description: "Experimente ajustar os filtros de pesquisa ou remover o termo de pesquisa."
  },
  onRowClick,
  clearAllFilters,
}: TabelaDadosProps) => {
  // Número de filtros ativos
  const activeFiltersCount = filterConfigs
    .filter(config => config.value !== "todos" && config.value !== "all")
    .length;

  // Calcular o número total de páginas
  const calculatedTotalPages = useMemo(() => {
    // Usar totalPages da prop, se disponível
    if (totalPages !== undefined) return totalPages;
    
    return Math.max(1, Math.ceil(data.length / itemsPerPage));
  }, [data.length, itemsPerPage, totalPages]);

  // Paginação
  const paginatedData = useMemo(() => {
    // Se estamos a usar paginação do servidor (se totalPages está definido),
    // então não precisamos de fatiar os dados localmente, pois já são apenas os dados da página atual
    if (totalPages !== undefined) return data;
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = currentPage * itemsPerPage;
    return data.slice(start, end);
  }, [data, currentPage, itemsPerPage, totalPages]);

  return (
    <div className="h-fit bg-gradient-to-b from-gray-50 to-gray-100 custom-blue-blur">
      <div className="max-w-8xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
          {actionButton}
        </div>

        <div className="border bg-card text-card-foreground border-none shadow-xl rounded-2xl glass-card border-white/20 hover:shadow-2xl transition-all duration-300 ease-in-out overflow-hidden mt-0 margin-top-0" style={{ marginTop: 0 }}>
          <div className="border-b border-white/20 p-6 flex flex-wrap items-center gap-4 bg-white/20 backdrop-blur-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={searchConfig.placeholder}
                value={searchConfig.value}
                onChange={(e) => searchConfig.onChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full border-gray-200 bg-white/70 shadow-md backdrop-blur-sm focus:ring-2 focus:ring-azul/20 text-gray-700 hover:shadow-lg transition-all duration-300 ease-in-out"
              />
            </div>

            {filterConfigs.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={cn(
                      "rounded-full border-gray-200 bg-white/70 backdrop-blur-sm text-gray-700 focus:ring-2 focus:ring-azul/20 shadow-md hover:shadow-lg transition-all duration-300 ease-in-out",
                      activeFiltersCount > 0 && "bg-azul/10 border-azul/30 text-azul"
                    )}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                    {activeFiltersCount > 0 && (
                      <Badge 
                        className="ml-2 bg-azul text-white border-none h-5 min-w-5 flex items-center justify-center rounded-full"
                      >
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-4 w-80 bg-white/90 backdrop-blur-md shadow-lg rounded-xl border-gray-200">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-gray-700">Filtros</h4>
                      {activeFiltersCount > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearAllFilters}
                          className="h-8 px-2 text-xs text-gray-500 hover:text-azul hover:bg-white/80"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Limpar ({activeFiltersCount})
                        </Button>
                      )}
                    </div>

                    {filterConfigs.map((filterConfig) => (
                      <div key={filterConfig.id} className="space-y-2">
                        <label className="text-xs font-medium text-gray-500">{filterConfig.label}</label>
                        <Select value={filterConfig.value} onValueChange={filterConfig.onChange}>
                          <SelectTrigger className="w-full rounded-lg border-gray-200 bg-white/70 text-sm">
                            <SelectValue placeholder={`Todos os ${filterConfig.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {filterConfig.options.map(option => (
                              <SelectItem key={option.value} value={option.value}>
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
                  className="h-9 rounded-full bg-white/40 hover:bg-white/60 text-xs text-gray-600 hover:text-azul gap-1"
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

          <div className="p-6 pt-0 pb-1">
            <div className="relative w-full overflow-auto">
              {isLoading ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/20 hover:bg-transparent">
                      {columns.map((column) => (
                        <TableHead key={column.id} className="h-12 px-4 text-left align-middle text-sm font-medium text-gray-700">
                          <div className="flex items-center gap-1">
                            {column.label}
                            <div className="h-5 w-5 rounded-full bg-gray-100 animate-[pulse_1s_ease-in-out_infinite]" />
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(itemsPerPage)].map((_, i) => (
                      <TableRow key={i} className="border-b border-white/10">
                        {columns.map((column) => (
                          <TableCell key={column.id} className="h-[52px] px-4 align-middle">
                            <div className="h-4 w-32 bg-gray-100 rounded animate-[pulse_1s_ease-in-out_infinite]" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : data.length === 0 ? (
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
                    <TableRow className="border-b border-gray-100 hover:bg-transparent">
                      {columns.map((column) => (
                        <TableHead 
                          key={column.id} 
                          className="text-sm font-medium text-gray-700 py-4"
                          style={{ 
                            width: column.width || 'auto',
                            textAlign: column.align || 'left'
                          }}
                        >
                          <div 
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              justifyContent: column.align === 'center' ? 'center' : 
                                             column.align === 'right' ? 'flex-end' : 'flex-start'
                            }}
                          >
                            {column.label}
                            {column.sortable && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => sortConfig.onChange(column.sortField || column.id)}
                                className={cn(
                                  "h-6 w-6 rounded-full text-gray-400 hover:text-azul",
                                  sortConfig.field === (column.sortField || column.id) && "text-azul"
                                )}
                              >
                                <ArrowUpDown className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((item) => (
                      <TableRow 
                        key={item.id} 
                        className="group border-b border-white/10 hover:bg-azul/5 transition-all duration-300 ease-in-out cursor-pointer"
                        onClick={() => onRowClick && onRowClick(item)}
                      >
                        {columns.map((column) => (
                          <TableCell 
                            key={column.id} 
                            className="py-4 text-gray-700 group-hover:text-azul transition-colors duration-300"
                            style={{ 
                              width: column.width || 'auto',
                              textAlign: column.align || 'left'
                            }}
                          >
                            {column.id === 'progresso' ? (
                              <div className="w-full max-w-[200px] mx-auto">
                                {column.renderCell(item)}
                              </div>
                            ) : (
                              column.renderCell(item)
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {calculatedTotalPages > 1 && (
            <div className="flex items-center justify-between py-4 px-6 border-t border-white/20 bg-white/10 backdrop-blur-sm">
              <p className="text-sm text-gray-500">
                A mostrar <span className="font-medium">{paginatedData.length}</span> de{" "}
                <span className="font-medium">{totalItems || data.length}</span> itens
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="rounded-full h-8 w-8 p-0 border-white/40 bg-white/60 hover:bg-white/80 text-gray-700 hover:text-azul transition-all duration-300 ease-in-out shadow-sm hover:shadow-md disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {(() => {
                  // Renderização condicional para limitar o número de botões de página
                  const totalButtons = calculatedTotalPages;
                  const maxVisible = 5; // Máximo de botões visíveis
                  
                  let visiblePages: (number | string)[] = [];
                  
                  if (totalButtons <= maxVisible) {
                    // Se houver poucas páginas, mostra todas
                    visiblePages = Array.from({ length: totalButtons }, (_, i) => i + 1);
                  } else {
                    // Caso contrário, mostra um subconjunto
                    if (currentPage <= 3) {
                      // Perto do início: 1, 2, 3, 4, último
                      visiblePages = [1, 2, 3, 4, totalButtons];
                      if (totalButtons > 5) visiblePages[3] = "...";
                    } else if (currentPage >= totalButtons - 2) {
                      // Perto do fim: 1, ..., antepenúltimo, penúltimo, último
                      visiblePages = [1, "...", totalButtons - 2, totalButtons - 1, totalButtons];
                    } else {
                      // No meio: 1, ..., atual-1, atual, atual+1, ..., último
                      visiblePages = [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalButtons];
                    }
                  }
                  
                  return visiblePages.map((page, index) => 
                    typeof page === "number" ? (
                      <Button
                        key={index}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "rounded-full h-8 w-8 p-0 transition-all duration-300 ease-in-out shadow-sm hover:shadow-md",
                          currentPage === page
                            ? "bg-azul text-white hover:bg-azul/90 border-azul"
                            : "bg-white/60 text-gray-700 hover:bg-white/80 hover:text-azul border-white/40"
                        )}
                      >
                        {page}
                      </Button>
                    ) : (
                      <span key={index} className="text-gray-500 px-1">...</span>
                    )
                  );
                })()}
                
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage === calculatedTotalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="rounded-full h-8 w-8 p-0 border-white/40 bg-white/60 hover:bg-white/80 text-gray-700 hover:text-azul transition-all duration-300 ease-in-out shadow-sm hover:shadow-md disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 