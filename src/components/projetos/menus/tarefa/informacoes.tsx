import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  FileText, 
  Pencil,
  Save,
  XCircle,
  Info
} from "lucide-react";

interface TarefaInformacoesProps {
  tarefa: any;
  onUpdate: (data: any) => Promise<void>;
  onToggleEstado: () => Promise<void>;
}

export function TarefaInformacoes({
  tarefa,
  onUpdate,
}: TarefaInformacoesProps) {
  const [editingDescription, setEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState(tarefa.descricao || "");

  const handleDescriptionSave = async () => {
    try {
      await onUpdate({ descricao: newDescription });
      setEditingDescription(false);
      toast.success("Descrição atualizada com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar descrição:", error);
      toast.error("Erro ao atualizar descrição");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Secção Informações */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-full bg-slate-100 p-1.5">
            <Info className="h-4 w-4 text-slate-700" />
          </div>
          <h2 className="text-base font-medium text-slate-800">Detalhes da Tarefa</h2>
        </div>
        
        <div className="space-y-4">
          {/* Descrição */}
          <Card className="overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-medium text-slate-700">Descrição</h3>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNewDescription(tarefa.descricao || "");
                    setEditingDescription(true);
                  }}
                  className="h-7 w-7 rounded-full p-0 hover:bg-slate-100"
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-500" />
                </Button>
              </div>
            </div>
            
            <div className="p-4">
              {editingDescription ? (
                <div className="space-y-3">
                  <Textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Descrição da tarefa"
                    className="border-slate-200 min-h-[100px]"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setEditingDescription(false)}
                      className="h-8 gap-1 text-xs"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Cancelar</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleDescriptionSave}
                      className="h-8 gap-1 text-xs bg-slate-800 text-white hover:bg-slate-700"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Guardar</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {tarefa.descricao || "Sem descrição definida"}
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
