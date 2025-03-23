import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileIcon, PencilIcon } from "lucide-react";
import { type Prisma } from "@prisma/client";

type WorkpackageDescricaoProps = {
  workpackage: Prisma.WorkpackageGetPayload<any>;
  editingDescription: boolean;
  setEditingDescription: (value: boolean) => void;
  newDescription: string;
  setNewDescription: (value: string) => void;
  onDescriptionSave: () => Promise<void>;
};

export function WorkpackageDescricao({
  workpackage,
  editingDescription,
  setEditingDescription,
  newDescription,
  setNewDescription,
  onDescriptionSave
}: WorkpackageDescricaoProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gray-100/80 flex items-center justify-center">
            <FileIcon className="h-5 w-5 text-gray-700" />
          </div>
          <h3 className="text-base font-medium text-gray-700">Descrição</h3>
        </div>
        {!editingDescription && (
          <Button
            variant="ghost"
            onClick={() => {
              setNewDescription(workpackage.descricao || "");
              setEditingDescription(true);
            }}
            className="h-8 w-8 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 text-gray-700"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <Card className="border border-gray-100 shadow-lg bg-white/90 backdrop-blur-sm p-6 rounded-xl">
        {editingDescription ? (
          <div className="space-y-4">
            <Textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="min-h-[120px] border-gray-200 focus:border-gray-300 focus:ring-gray-200/20 rounded-xl"
              placeholder="Descrição do workpackage"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setEditingDescription(false)}
                className="text-gray-500 hover:text-gray-700 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={onDescriptionSave}
                className="bg-gray-900 text-white hover:bg-gray-800 rounded-xl"
              >
                Guardar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600 leading-relaxed">
            {workpackage.descricao || "Sem descrição"}
          </p>
        )}
      </Card>
    </div>
  );
}
