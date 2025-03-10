import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Briefcase, Edit, Trash, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { WorkpackageWithRelations } from "../../../types";
import { WorkpackageDetails } from "./details";
import { WorkpackageHandlers } from "@/app/projetos/criar/page";

interface WorkpackageItemProps {
  workpackage: WorkpackageWithRelations;
  onEdit: (wp: WorkpackageWithRelations) => void;
  onDelete: (id: string) => void;
  handlers: WorkpackageHandlers;
}

export function WorkpackageItem({ workpackage, onEdit, onDelete, handlers }: WorkpackageItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <div 
        className="p-4 border border-azul/10 rounded-xl bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-azul/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-azul" />
            </div>
            <div>
              <h3 className="text-base font-medium text-azul">{workpackage.nome}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="outline" 
                  className={`px-2 py-0.5 text-xs ${workpackage.estado ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}
                >
                  {workpackage.estado ? "Concluído" : "Em progresso"}
                </Badge>
                <span className="text-xs text-azul/70">
                  {workpackage.inicio && workpackage.fim && (
                    <>
                      {format(new Date(workpackage.inicio), "dd MMM", { locale: ptBR })} - {" "}
                      {format(new Date(workpackage.fim), "dd MMM yyyy", { locale: ptBR })}
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(workpackage);
              }}
              className="h-8 w-8 p-0 rounded-lg hover:bg-azul/10 text-azul"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(workpackage.id);
              }}
              className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 text-red-500"
            >
              <Trash className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg hover:bg-azul/10 text-azul"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {expanded && (
        <WorkpackageDetails 
          workpackage={workpackage} 
          handlers={handlers} 
        />
      )}
    </div>
  );
}
