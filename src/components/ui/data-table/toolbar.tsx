"use client";

import { X, Search, Filter } from "lucide-react";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchPlaceholder: string;
  filterConfigs: Array<{
    id: string;
    label: string;
    options: Array<{
      id: string;
      label: string;
      value: string;
    }>;
    value: string;
    onChange: (value: string) => void;
  }>;
  clearAllFilters: () => void;
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder,
  filterConfigs,
  clearAllFilters,
  globalFilter,
  setGlobalFilter,
}: DataTableToolbarProps<TData>) {
  // Número de filtros ativos
  const activeFiltersCount = filterConfigs
    .filter(config => config.value !== "todos" && config.value !== "all")
    .length;

  return (
    <div className="border-b border-white/20 p-6 flex flex-wrap items-center gap-4 bg-white/20 backdrop-blur-sm">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
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
  );
} 