import { useState } from "react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { CalendarIcon, FileIcon, UploadIcon, XIcon, ClockIcon, CheckIcon, PencilIcon, TrashIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import type { Entregavel } from "@prisma/client";

interface MenuTarefaProps {
  tarefaId: string;
  open: boolean;
  onClose: () => void;
}

export function MenuTarefa({ tarefaId, open, onClose }: MenuTarefaProps) {
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [addingEntregavel, setAddingEntregavel] = useState(false);
  const [newEntregavel, setNewEntregavel] = useState({
    nome: "",
    descricao: "",
    data: undefined as Date | undefined,
  });


  const { data: tarefa, refetch: refetchTarefa } = api.tarefa.getById.useQuery(tarefaId, {
    enabled: !!tarefaId && open,
  });

  const { data: entregaveis = [], refetch: refetchEntregaveis } = api.tarefa.getEntregaveisByTarefa.useQuery(tarefaId, {
    enabled: !!tarefaId && open,
  });

  const updateTarefaMutation = api.tarefa.update.useMutation({
    onSuccess: () => {
      refetchTarefa();
      toast.success("Tarefa atualizada");
    },
  });

  const createEntregavelMutation = api.tarefa.createEntregavel.useMutation({
    onSuccess: () => {
      refetchEntregaveis();
      setAddingEntregavel(false);
      setNewEntregavel({ nome: "", descricao: "", data: undefined });
      toast.success("Entregável adicionado");
    },
  });

  const updateEntregavelMutation = api.tarefa.updateEntregavel.useMutation({
    onSuccess: () => {
      refetchEntregaveis();
      toast.success("Entregável atualizado");
    },
  });

  const deleteEntregavelMutation = api.tarefa.deleteEntregavel.useMutation({
    onSuccess: () => {
      refetchEntregaveis();
      toast.success("Entregável removido");
    },
  });

  if (!tarefa) {
    return (
      <Sheet open={open} onOpenChange={onClose} modal={false}>
        <SheetContent 
          className="p-0 w-[450px] border-none bg-white/95 backdrop-blur-xl shadow-xl rounded-l-2xl border-l border-white/30"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-customBlue/70 animate-pulse"></div>
              <div className="h-2 w-2 rounded-full bg-customBlue/70 animate-pulse delay-75"></div>
              <div className="h-2 w-2 rounded-full bg-customBlue/70 animate-pulse delay-150"></div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const handleEstadoChange = async () => {
    await updateTarefaMutation.mutate({
      id: tarefaId,
      data: { estado: !tarefa.estado },
    });
  };

  const handleNameSave = async () => {
    if (newName.trim() === "") return;
    await updateTarefaMutation.mutate({
      id: tarefaId,
      data: { nome: newName },
    });
    setEditingName(false);
  };

  const handleDescriptionSave = async () => {
    await updateTarefaMutation.mutate({
      id: tarefaId,
      data: { descricao: newDescription },
    });
    setEditingDescription(false);
  };

  const handleDateChange = async (field: 'inicio' | 'fim', date: Date | undefined) => {
    await updateTarefaMutation.mutate({
      id: tarefaId,
      data: { [field]: date },
    });
  };

  const handleAddEntregavel = async () => {
    if (newEntregavel.nome.trim() === "") return;
    await createEntregavelMutation.mutate({
      tarefaId,
      nome: newEntregavel.nome,
      descricao: newEntregavel.descricao || undefined,
      data: newEntregavel.data,
    });
  };

  const handleFileUpload = async (entregavelId: string, file: File) => {
    setUploading(true);
    try {
      // Implementação do upload de ficheiro aqui
      toast.success("Ficheiro carregado com sucesso");
      refetchEntregaveis(); // Atualiza a lista após o upload
    } catch (error) {
      toast.error("Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose} modal={false}>
      <SheetContent 
        className="w-full lg:w-[600px] p-0 overflow-y-auto sm:max-w-none bg-gradient-to-b from-gray-50 to-gray-100 shadow-2xl border-l border-white/20 rounded-l-2xl fixed right-0 top-0 bottom-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="border-b border-white/20 p-6 bg-white/70 backdrop-blur-sm">
            <SheetHeader className="space-y-4">
              <div className="flex flex-col items-start gap-2">
                <div className="flex items-center justify-between w-full">
                  {editingName ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1"
                        placeholder="Nome da tarefa"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNameSave}
                        className="shrink-0"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingName(false)}
                        className="shrink-0"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-gray-900">{tarefa.nome}</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNewName(tarefa.nome);
                          setEditingName(true);
                        }}
                        className="h-6 w-6 rounded-full hover:bg-gray-50"
                      >
                        <PencilIcon className="h-3 w-3 text-gray-500" />
                      </Button>
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose}
                    className="rounded-full h-8 w-8 hover:bg-gray-50"
                  >
                    <XIcon className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
                
                <Badge
                  className={cn(
                    "rounded-full px-3 font-normal",
                    tarefa.estado
                      ? "bg-emerald-50/70 text-emerald-600 border-emerald-200"
                      : "bg-blue-50/70 text-customBlue border-blue-200"
                  )}
                >
                  {tarefa.estado ? "Concluída" : "Em progresso"}
                </Badge>
              </div>
            </SheetHeader>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-8">
              {/* Período */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-50/70 flex items-center justify-center shadow-sm">
                    <CalendarIcon className="h-4 w-4 text-customBlue" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">Período</h3>
                </div>
                <Card className="glass-card border-white/20 shadow-xl rounded-2xl p-4 bg-white/70">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-600">Início</Label>
                      <DatePicker
                        value={tarefa.inicio ? new Date(tarefa.inicio) : undefined}
                        onChange={(date) => handleDateChange('inicio', date)}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-600">Fim</Label>
                      <DatePicker
                        value={tarefa.fim ? new Date(tarefa.fim) : undefined}
                        onChange={(date) => handleDateChange('fim', date)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Descrição */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-50/70 flex items-center justify-center shadow-sm">
                    <FileIcon className="h-4 w-4 text-customBlue" />
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
                <Card className="glass-card border-white/20 shadow-xl rounded-2xl p-4 bg-white/70">
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

              {/* Entregáveis */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-50/70 flex items-center justify-center shadow-sm">
                      <ClockIcon className="h-4 w-4 text-customBlue" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">Entregáveis</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingEntregavel(true)}
                    className="bg-blue-50/70 hover:bg-blue-100/70 text-customBlue border-blue-200/30"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>

                <div className="space-y-3">
                  {addingEntregavel && (
                    <Card className="glass-card border-white/20 shadow-xl rounded-2xl p-4 bg-white/70">
                      <div className="space-y-4">
                        <div>
                          <Label>Nome</Label>
                          <Input
                            value={newEntregavel.nome}
                            onChange={(e) => setNewEntregavel({ ...newEntregavel, nome: e.target.value })}
                            placeholder="Nome do entregável"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Descrição</Label>
                          <Textarea
                            value={newEntregavel.descricao}
                            onChange={(e) => setNewEntregavel({ ...newEntregavel, descricao: e.target.value })}
                            placeholder="Descrição do entregável"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Data</Label>
                          <DatePicker
                            value={newEntregavel.data}
                            onChange={(date) => setNewEntregavel({ ...newEntregavel, data: date })}
                            className="w-full mt-1"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAddingEntregavel(false);
                              setNewEntregavel({ nome: "", descricao: "", data: undefined });
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleAddEntregavel}
                            disabled={!newEntregavel.nome.trim()}
                          >
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  {entregaveis.map((entregavel: Entregavel) => (
                    <Card 
                      key={entregavel.id} 
                      className="glass-card border-white/20 shadow-xl rounded-2xl p-4 bg-white/70 hover:shadow-2xl transition-all duration-300"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">{entregavel.nome}</h4>
                            {entregavel.descricao && (
                              <p className="text-sm text-gray-600">{entregavel.descricao}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const confirmed = window.confirm("Tem certeza que deseja remover este entregável?");
                                if (confirmed) {
                                  deleteEntregavelMutation.mutate(entregavel.id);
                                }
                              }}
                              className="h-7 w-7 rounded-full hover:bg-red-50 hover:text-red-600"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {entregavel.data && (
                          <div className="flex items-center gap-1.5">
                            <CalendarIcon className="h-3 w-3 text-customBlue" />
                            <span className="text-xs text-gray-500">
                              {format(new Date(entregavel.data), "dd MMM yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Input
                              type="file"
                              className="text-xs file:mr-2 file:px-2 file:py-1 file:rounded-md file:border-0 file:bg-blue-50/70 file:text-customBlue file:text-xs hover:file:bg-blue-100/70 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(entregavel.id, file);
                              }}
                              disabled={uploading}
                            />
                            {uploading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-md">
                                <div className="h-4 w-4 border-2 border-customBlue/30 border-t-customBlue rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>

                          {entregavel.anexo && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0 h-8 bg-blue-50/70 hover:bg-blue-100/70 text-customBlue border-blue-200/30"
                              onClick={() => entregavel.anexo && window.open(entregavel.anexo, "_blank")}
                            >
                              <UploadIcon className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}

                  {entregaveis.length === 0 && !addingEntregavel && (
                    <div className="flex flex-col items-center justify-center py-8 px-4 bg-gray-50/70 rounded-xl border border-white/30 text-center">
                      <p className="text-sm text-gray-500">Nenhum entregável disponível</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="sticky bottom-0 border-t border-white/30 p-5 bg-white/70 backdrop-blur-sm">
            <Button
              onClick={handleEstadoChange}
              className={cn(
                "w-full rounded-lg justify-center transition-all font-medium shadow-sm",
                tarefa.estado 
                  ? "bg-white text-customBlue border border-blue-200/50 hover:bg-blue-50/70"
                  : "bg-customBlue text-white hover:bg-customBlue/90"
              )}
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              {tarefa.estado ? "Marcar como Pendente" : "Marcar como Concluída"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}