import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { Calendar, FileText, Check, Pencil, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TarefaInformacoesProps {
  tarefa: any;
  // tarefaId is required in props for future implementations but not used currently
  // tarefaId: string;
  onUpdate: (data: any) => Promise<void>;
  onToggleEstado: () => Promise<void>;
}

export function TarefaInformacoes({
  tarefa,
  // tarefaId is required in props for future implementations but not used currently
  // tarefaId,
  onUpdate,
  onToggleEstado,
}: TarefaInformacoesProps) {
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [newName, setNewName] = useState(tarefa.nome || "");
  const [newDescription, setNewDescription] = useState(tarefa.descricao || "");

  const handleToggleEstado = async () => {
    await onToggleEstado();
  };

  const handleNameSave = async () => {
    if (newName.trim() === "") {
      toast.error("O nome não pode ficar vazio");
      return;
    }

    try {
      await onUpdate({ nome: newName });
      setEditingName(false);
      toast.success("Nome atualizado com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar nome:", error);
      toast.error("Erro ao atualizar nome");
    }
  };

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

  const handleDateChange = async (field: "inicio" | "fim", date: Date | undefined) => {
    try {
      await onUpdate({ [field]: date });
      toast.success("Data atualizada com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar data:", error);
      toast.error("Erro ao atualizar data");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Informações</h2>
        <p className="text-sm text-gray-500">Detalhes da tarefa</p>
      </div>

      {/* Estado */}
      <div className="flex justify-center">
        <Button
          onClick={handleToggleEstado}
          variant="outline"
          size="lg"
          className={cn(
            "w-full max-w-md justify-center gap-2 rounded-xl font-medium transition-all",
            tarefa.estado
              ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
              : "border-blue-200 bg-blue-50 text-azul hover:bg-blue-100"
          )}
        >
          {tarefa.estado ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          {tarefa.estado ? "Concluída" : "Em Progresso"}
        </Button>
      </div>

      {/* Nome */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-gray-700">Nome</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setNewName(tarefa.nome || "");
              setEditingName(true);
            }}
            className="h-6 w-6 rounded-full hover:bg-gray-50"
          >
            <Pencil className="h-3 w-3 text-gray-500" />
          </Button>
        </div>
        <Card className="border border-azul/10 bg-white p-4 shadow-sm">
          {editingName ? (
            <div className="space-y-3">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da tarefa"
                className="border-gray-200"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingName(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleNameSave}
                  className="bg-azul text-white hover:bg-azul/90"
                >
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700">{tarefa.nome}</p>
          )}
        </Card>
      </div>

      {/* Período */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-azul/10">
            <Calendar className="h-4 w-4 text-azul" />
          </div>
          <h3 className="text-sm font-medium text-gray-900">Período</h3>
        </div>
        <Card className="border border-azul/10 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Início</Label>
              <DatePicker
                value={tarefa.inicio ? new Date(tarefa.inicio) : undefined}
                onChange={(date) => handleDateChange("inicio", date)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Fim</Label>
              <DatePicker
                value={tarefa.fim ? new Date(tarefa.fim) : undefined}
                onChange={(date) => handleDateChange("fim", date)}
                className="w-full"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Descrição */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-azul/10">
              <FileText className="h-4 w-4 text-azul" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Descrição</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setNewDescription(tarefa.descricao || "");
              setEditingDescription(true);
            }}
            className="h-6 w-6 rounded-full hover:bg-gray-50"
          >
            <Pencil className="h-3 w-3 text-gray-500" />
          </Button>
        </div>
        <Card className="border border-azul/10 bg-white p-4 shadow-sm">
          {editingDescription ? (
            <div className="space-y-3">
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="min-h-[100px] border-gray-200"
                placeholder="Descrição da tarefa"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingDescription(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleDescriptionSave}
                  className="bg-azul text-white hover:bg-azul/90"
                >
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-gray-700">
              {tarefa.descricao || "Sem descrição"}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
