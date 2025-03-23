import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Briefcase, Edit, Trash, ChevronDown, ChevronUp, ListTodo, Package, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { WorkpackageWithRelations } from "../../../../types";
import { WorkpackageDetails } from "./details";
import { WorkpackageHandlers } from "@/app/projetos/criar/page";

interface WorkpackageItemProps {
  workpackage: WorkpackageWithRelations;
  onEdit: (wp: WorkpackageWithRelations) => void;
  onDelete: (id: string) => void;
  handlers: WorkpackageHandlers;
  projetoInicio: Date;
  projetoFim: Date;
}

export function WorkpackageItem({ workpackage, onEdit, onDelete, handlers }: WorkpackageItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <div 
        className="p-3 border border-azul/10 rounded-xl bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-azul/10 flex items-center justify-center">
              <Briefcase className="h-4.5 w-4.5 text-azul" />
            </div>
            <div>
              <h3 className="text-base font-medium text-azul">{workpackage.nome}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {/* Badge para Tarefas */}
                <Badge 
                  variant="outline" 
                  className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 border-blue-200"
                >
                  <ListTodo className="h-3 w-3 mr-1" />
                  {workpackage.tarefas?.length || 0}
                </Badge>
                
                {/* Badge para Materiais */}
                <Badge 
                  variant="outline" 
                  className="px-1.5 py-0.5 text-xs bg-amber-50 text-amber-600 border-amber-200"
                >
                  <Package className="h-3 w-3 mr-1" />
                  {workpackage.materiais?.length || 0}
                </Badge>
                
                {workpackage.inicio && workpackage.fim && (
                  <span className="flex items-center text-xs text-azul/70">
                    <Calendar className="h-3 w-3 mr-1 text-azul/60" />
                    {format(new Date(workpackage.inicio), "dd MMM yyyy", { locale: ptBR })} - {" "}
                    {format(new Date(workpackage.fim), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(workpackage);
              }}
              className="h-7 w-7 p-0 rounded-lg hover:bg-azul/10 text-azul"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(workpackage.id);
              }}
              className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 text-red-500"
            >
              <Trash className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-lg hover:bg-azul/10 text-azul"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
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
