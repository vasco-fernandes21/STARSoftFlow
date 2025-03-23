import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { CalendarIcon, FileTextIcon, CheckIcon, PencilIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TarefaInformacoesProps {
  tarefa: any;
  tarefaId: string;
  onUpdate?: () => Promise<void>;
}

export function TarefaInformacoes({ 
  tarefa, 
  tarefaId,
  onUpdate 
}: TarefaInformacoesProps) {
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [newName, setNewName] = useState(tarefa.nome || "");
  const [newDescription, setNewDescription] = useState(tarefa.descricao || "");

  // mutação para atualizar tarefa
  const updateTarefaMutation = api.tarefa.update.useMutation({
    onSuccess: async () => {
      if (onUpdate) await onUpdate();
      toast.success("Tarefa atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  const handleEstadoChange = async () => {
    await updateTarefaMutation.mutate({
      id: tarefaId,
      data: { estado: !tarefa.estado }
    });
  };

  const handleNameSave = async () => {
    if (newName.trim() === "") {
      toast.error("O nome não pode ficar vazio");
      return;
    }
    
    await updateTarefaMutation.mutate({
      id: tarefaId,
      data: { nome: newName }
    });
    setEditingName(false);
  };

  const handleDescriptionSave = async () => {
    await updateTarefaMutation.mutate({
      id: tarefaId,
      data: { descricao: newDescription }
    });
    setEditingDescription(false);
  };

  const handleDateChange = async (field: 'dataInicio' | 'dataFim', date: Date | undefined) => {
    await updateTarefaMutation.mutate({
      id: tarefaId,
      data: { [field]: date }
    });
  };

  return (
    <div className="space-y-8">
      {/* Período */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-azul/10 flex items-center justify-center">
            <CalendarIcon className="h-4 w-4 text-azul" />
          </div>
          <h3 className="text-sm font-medium text-gray-900">Período</h3>
        </div>
        <Card className="border border-azul/10 shadow-sm p-4 bg-white">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Início</Label>
              <DatePicker
                value={tarefa.dataInicio ? new Date(tarefa.dataInicio) : undefined}
                onChange={(date) => handleDateChange('dataInicio', date)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Fim</Label>
              <DatePicker
                value={tarefa.dataFim ? new Date(tarefa.dataFim) : undefined}
                onChange={(date) => handleDateChange('dataFim', date)}
                className="w-full"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Descrição */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-azul/10 flex items-center justify-center">
            <FileTextIcon className="h-4 w-4 text-azul" />
          </div>
          <h3 className="text-sm font-medium text-gray-900">Descrição</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setNewDescription(tarefa.descricao || "");
              setEditingDescription(true);
            }}
            className="h-6 w-6 rounded-full hover:bg-gray-50"
          >
            <PencilIcon className="h-3 w-3 text-gray-500" />
          </Button>
        </div>
        <Card className="border border-azul/10 shadow-sm p-4 bg-white">
          {editingDescription ? (
            <div className="space-y-3">
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="min-h-[100px]"
                placeholder="Descrição da tarefa"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingDescription(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleDescriptionSave}
                  className="bg-azul hover:bg-azul/90 text-white"
                >
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed">
              {tarefa.descricao || "Sem descrição"}
            </p>
          )}
        </Card>
      </div>
      
      {/* Footer */}
      <div className="flex justify-center pt-6">
        <Button
          onClick={handleEstadoChange}
          className={cn(
            "w-full max-w-md rounded-xl justify-center transition-all font-medium",
            tarefa.estado 
              ? "bg-white text-azul border border-azul/20 hover:bg-azul/5"
              : "bg-azul text-white hover:bg-azul/90"
          )}
        >
          <CheckIcon className="h-4 w-4 mr-2" />
          {tarefa.estado ? "Marcar como Pendente" : "Marcar como Concluída"}
        </Button>
      </div>
    </div>
  );
}