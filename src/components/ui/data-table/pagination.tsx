"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
}

export function DataTablePagination<TData>({
  table,
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
}: DataTablePaginationProps<TData>) {
  // Renderização condicional para limitar o número de botões de página
  const getVisiblePages = () => {
    const maxVisible = 5; // Máximo de botões visíveis
    
    let visiblePages: (number | string)[] = [];
    
    if (totalPages <= maxVisible) {
      // Se houver poucas páginas, mostra todas
      visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // Caso contrário, mostra um subconjunto
      if (currentPage <= 3) {
        // Perto do início: 1, 2, 3, 4, último
        visiblePages = [1, 2, 3, 4, totalPages];
        if (totalPages > 5) visiblePages[3] = "...";
      } else if (currentPage >= totalPages - 2) {
        // Perto do fim: 1, ..., antepenúltimo, penúltimo, último
        visiblePages = [1, "...", totalPages - 2, totalPages - 1, totalPages];
      } else {
        // No meio: 1, ..., atual-1, atual, atual+1, ..., último
        visiblePages = [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
      }
    }
    
    return visiblePages;
  };

  return (
    <div className="flex items-center justify-between py-4 px-6 border-t border-white/20 bg-white/10 backdrop-blur-sm">
      <p className="text-sm text-gray-500">
        A mostrar <span className="font-medium">{Math.min(table.getRowModel().rows.length, table.getState().pagination.pageSize)}</span> de{" "}
        <span className="font-medium">{totalItems}</span> itens
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-full h-8 w-8 p-0 border-white/40 bg-white/60 hover:bg-white/80 text-gray-700 hover:text-azul transition-all duration-300 ease-in-out shadow-sm hover:shadow-md disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {getVisiblePages().map((page, index) => 
          typeof page === "number" ? (
            <Button
              key={index}
              onClick={() => onPageChange(page)}
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
        )}
        
        <Button
          variant="outline"
          size="icon"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-full h-8 w-8 p-0 border-white/40 bg-white/60 hover:bg-white/80 text-gray-700 hover:text-azul transition-all duration-300 ease-in-out shadow-sm hover:shadow-md disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 