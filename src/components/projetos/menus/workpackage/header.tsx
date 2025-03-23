import { SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CheckIcon, XIcon, PencilIcon } from "lucide-react";
import { type Prisma } from "@prisma/client";

// tipo para o workpackage no cabeçalho
type WorkpackageHeaderProps = {
  workpackage: Prisma.WorkpackageGetPayload<any>;
  editingName: boolean;
  setEditingName: (value: boolean) => void;
  newName: string;
  setNewName: (value: string) => void;
  onNameSave: () => Promise<void>;
  onClose: () => void;
  onEstadoChange: () => Promise<void>;
};

export function WorkpackageHeader({ 
  workpackage, 
  editingName, 
  setEditingName, 
  newName, 
  setNewName, 
  onNameSave, 
  onClose,
  onEstadoChange
}: WorkpackageHeaderProps) {
  // renderiza o cabeçalho
  return (
    <div className="border-b border-gray-100 bg-gradient-to-b from-white via-white to-gray-50/50 p-8 sticky top-0 z-10">
      <SheetHeader className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            {editingName ? (
              <div className="flex items-center gap-3 w-full">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 bg-white border-gray-200 focus:border-gray-300 focus:ring-gray-200/20 text-lg font-medium rounded-xl"
                  placeholder="Nome do workpackage"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={onNameSave}
                    className="h-10 w-10 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-700"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setEditingName(false)}
                    className="h-10 w-10 rounded-xl hover:bg-red-50 text-red-500"
                  >
                    <XIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-gray-800 tracking-tight">
                  {workpackage.nome}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setNewName(workpackage.nome);
                    setEditingName(true);
                  }}
                  className="h-9 w-9 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-700"
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Button 
              variant="ghost"
              onClick={onClose}
              className="h-10 w-10 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-700"
            >
              <XIcon className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              className={cn(
                "rounded-xl px-4 py-1.5 font-medium cursor-pointer transition-all duration-200",
                workpackage.estado
                  ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
              onClick={onEstadoChange}
            >
              {workpackage.estado ? "Concluído" : "Em progresso"}
            </Badge>
            <span className="text-sm text-gray-500">
              {workpackage.inicio && workpackage.fim && (
                <>
                  {format(new Date(workpackage.inicio), "dd MMM", { locale: ptBR })} - {" "}
                  {format(new Date(workpackage.fim), "dd MMM yyyy", { locale: ptBR })}
                </>
              )}
            </span>
          </div>
        </div>
      </SheetHeader>
    </div>
  );
}
