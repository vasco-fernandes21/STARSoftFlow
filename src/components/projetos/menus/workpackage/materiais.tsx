import { Button } from "@/components/ui/button";
import { PlusIcon, TrashIcon } from "lucide-react";
import { MaterialForm } from "@/components/projetos/criar/novo/workpackages/material/form";
import { type Prisma } from "@prisma/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { type UseMutationResult } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { WorkpackageCompleto, MaterialWithRelations } from "@/components/projetos/types";

type WorkpackageMateriaisProps = {
  workpackage: WorkpackageCompleto;
  workpackageId: string;
  addingMaterial: boolean;
  setAddingMaterial: (value: boolean) => void;
  deleteMaterialMutation: UseMutationResult<any, unknown, any, unknown>;
};

export function WorkpackageMateriais({
  workpackage,
  workpackageId,
  addingMaterial,
  setAddingMaterial,
  deleteMaterialMutation
}: WorkpackageMateriaisProps) {

  const queryClient = useQueryClient();
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Materiais</span>
        {!addingMaterial && (
          <Button
            variant="ghost"
            onClick={() => setAddingMaterial(true)}
            className="h-7 w-7 rounded-md bg-gray-50"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {addingMaterial && (
          <div className="bg-gray-50/50 rounded-md p-3">
            <MaterialForm
              workpackageId={workpackageId}
              onCancel={() => setAddingMaterial(false)}
              onSubmit={() => {
                setAddingMaterial(false);
                queryClient.invalidateQueries({ queryKey: ["workpackage.getById", { id: workpackageId }] });
              }}
            />
          </div>
        )}

        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="text-xs">Nome</TableHead>
              <TableHead className="text-xs">Rubrica</TableHead>
              <TableHead className="text-xs text-right">Qtd.</TableHead>
              <TableHead className="text-xs text-right">Preço</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workpackage.materiais.map((material: MaterialWithRelations) => (
              <TableRow key={material.id}>
                <TableCell className="text-xs">{material.nome}</TableCell>
                <TableCell className="text-xs">{material.rubrica}</TableCell>
                <TableCell className="text-xs text-right">{material.quantidade}</TableCell>
                <TableCell className="text-xs text-right">
                  {Number(material.preco).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                </TableCell>
                <TableCell className="text-xs text-right font-medium">
                  {(material.quantidade * Number(material.preco)).toLocaleString('pt-PT', {
                        style: 'currency', 
                        currency: 'EUR' 
                      })}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMaterialMutation.mutate({
                          workpackageId,
                      materialId: material.id
                    })}
                    className="h-6 w-6 p-0 rounded-md hover:bg-red-50 hover:text-red-500"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
