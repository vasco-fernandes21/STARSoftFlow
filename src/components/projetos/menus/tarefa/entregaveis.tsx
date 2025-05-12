import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  Plus, 
  FileText, 
  CheckCircle2,
  Upload, 
  Calendar, 
  Package, 
  CircleSlash,
  ClockIcon,
  FileArchive,
  FileText as FileTextIcon,
  Download,
  File,
  Link as LinkIcon,
  Trash2
} from "lucide-react";
import { EntregavelSubmit } from "@/components/projetos/menus/tarefa/submit";
import { EntregavelForm } from "@/components/projetos/criar/novo/workpackages/entregavel/form";
import { format } from "date-fns";
import { cn, formatBytes } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AnexoFile {
  url: string;
  fileName: string;
  fileType: string;
  fileExtension: string;
  uploadedAt: Date | string;
  size: number;
}

interface TarefaEntregaveisProps {
  tarefa: any;
  tarefaId: string;
  addingEntregavel: boolean;
  setAddingEntregavel: (value: boolean) => void;
  onUpdate: (data: any) => Promise<void>;
  onCreateEntregavel: (data: any) => Promise<void>;
  onUpdateEntregavel: (id: string, data: any) => Promise<void>;
}

export function TarefaEntregaveis({
  tarefa,
  tarefaId,
  addingEntregavel,
  setAddingEntregavel,
  onUpdate: _onUpdate,
  onCreateEntregavel,
  onUpdateEntregavel,
}: TarefaEntregaveisProps) {
  const [submittingEntregavel, setSubmittingEntregavel] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendentes" | "concluidos">("todos");
  const [searchText, setSearchText] = useState("");
  const [viewTab] = useState<"lista" | "quadro">("lista");
  const [viewingAllAnexos, setViewingAllAnexos] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingAnexo, setIsDeletingAnexo] = useState(false);
  const [anexoToDelete, setAnexoToDelete] = useState<{url: string, entregavelId: string} | null>(null);
  const { isGestor } = usePermissions();

  // Buscar entregáveis da tarefa
  const { data: entregaveis = [] } = api.tarefa.getEntregaveisByTarefa.useQuery(tarefaId, {
    enabled: !!tarefaId,
  });
  
  // Buscar todos os anexos de um entregável específico
  const { data: anexos = [], isLoading: isLoadingAnexos, refetch: refetchAnexos } = api.entregavel.getAnexos.useQuery(
    viewingAllAnexos || "", 
    { 
      enabled: !!viewingAllAnexos,
      refetchOnWindowFocus: false
    }
  );

  // Mutation para upload de arquivos
  const uploadFile = api.entregavel.uploadFileBase64.useMutation({
    onSuccess: () => {
      setIsUploading(false);
      if (viewingAllAnexos) {
        refetchAnexos();
      }
      setSubmittingEntregavel(null);
    },
    onError: (error) => {
      toast.error(`Erro ao enviar ficheiro: ${error.message}`);
      setIsUploading(false);
    }
  });

  // Mutation para deletar arquivos
  const deleteFile = api.entregavel.deleteFile.useMutation({
    onSuccess: () => {
      toast.success("Anexo removido com sucesso");
      refetchAnexos();
      setIsDeletingAnexo(false);
    },
    onError: (error) => {
      toast.error(`Erro ao remover anexo: ${error.message}`);
      setIsDeletingAnexo(false);
    }
  });

  // Filtrar entregáveis com base nos critérios
  const entregaveisFiltrados = entregaveis.filter(entregavel => {
    // Filtro por texto
    const matchText = searchText === "" || 
      entregavel.nome.toLowerCase().includes(searchText.toLowerCase()) ||
      (entregavel.descricao && entregavel.descricao.toLowerCase().includes(searchText.toLowerCase()));
    
    // Filtro por estado
    const matchEstado = 
      filtroEstado === "todos" ||
      (filtroEstado === "pendentes" && !entregavel.estado) ||
      (filtroEstado === "concluidos" && entregavel.estado);
    
    return matchText && matchEstado;
  });

  // Calcular estatísticas
  const totalEntregaveis = entregaveis.length;
  const entregaveisConcluidos = entregaveis.filter(e => e.estado).length;
  const entregaveisPendentes = totalEntregaveis - entregaveisConcluidos;

  // Handlers
  const handleToggleEstado = async (entregavelId: string, novoEstado: boolean) => {
    await onUpdateEntregavel(entregavelId, { estado: novoEstado });
  };

  const handleSubmit = async (tarefaId: string, data: any) => {
    try {
      await onCreateEntregavel(data);
      setAddingEntregavel(false);
      toast.success("Entregável criado com sucesso");
    } catch (error) {
      console.error("Erro ao criar entregável:", error);
      toast.error("Erro ao criar entregável");
    }
  };

  const handleFileUpload = async (entregavelId: string, file: File) => {
    try {
      setIsUploading(true);
      
      // Verificar tamanho do arquivo (limite de 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB em bytes
      if (file.size > maxSize) {
        throw new Error("O arquivo é muito grande. O tamanho máximo é 5MB.");
      }
      
      // Converter o arquivo para base64
      const base64Data = await fileToBase64(file);
      
      // Usar a mutation do tRPC para enviar o arquivo
      await uploadFile.mutateAsync({
        id: entregavelId,
        fileName: file.name,
        fileType: file.type,
        base64Data,
      });
    } catch (error) {
      console.error("Erro ao submeter ficheiro:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao submeter ficheiro");
      setIsUploading(false);
    }
  };
  
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (event) => {
        reject(new Error(`Erro ao ler o arquivo: ${event?.target?.error?.message || "Erro desconhecido"}`));
      };
    });
  };
  
  const handleViewAnexo = (url: string) => {
    if (!url) {
      toast.error("URL do anexo é inválida");
      return;
    }
    
    window.open(url, '_blank');
  };
  
  const handleDownloadAnexo = (url: string, fileName: string) => {
    if (!url) {
      toast.error("URL do anexo é inválida");
      return;
    }

    // Use fetch method directly for more reliable download behavior
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro na rede: ${response.statusText}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Create URL from blob
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName; // Set the desired file name
        
        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        window.URL.revokeObjectURL(blobUrl);
        
      })
      .catch(fetchError => {
        console.error("Erro ao iniciar download:", fetchError);
        toast.error(`Não foi possível descarregar: ${fileName}. ${fetchError.message}`);
      });
  };
  
  // Determinar o ícone do arquivo com base no tipo/extensão
  const getFileIcon = (fileName: string) => {
    if (!fileName) return <File />;
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch(extension) {
      case 'pdf':
        return <FileText className="text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileText className="text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <FileText className="text-orange-500" />;
      case 'zip':
        return <FileArchive className="text-purple-500" />;
      default:
        return <File className="text-gray-500" />;
    }
  };

  const handleViewAllAnexos = (entregavelId: string) => {
    const entregavel = entregaveis.find(e => e.id === entregavelId);
    if (entregavel) {
      setViewingAllAnexos(entregavelId);
    } else {
      toast.error("Entregável não encontrado");
    }
  };
  
  // Formatar data
  const formatarData = (data: Date | null | string) => {
    if (!data) return "Sem data";

    try {
      const dataObj = data instanceof Date ? data : new Date(data);
      return format(dataObj, "dd/MM/yyyy");
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "Data inválida";
    }
  };

  const handleDeleteAnexo = (url: string | null, entregavelId: string) => {
    if (isDeletingAnexo || !url) return;
    setAnexoToDelete({ url, entregavelId });
  };
  
  const confirmDeleteAnexo = () => {
    if (!anexoToDelete || isDeletingAnexo) return;
    
    setIsDeletingAnexo(true);
    deleteFile.mutate({
      url: anexoToDelete.url,
      entregavelId: anexoToDelete.entregavelId
    });
    setAnexoToDelete(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-100 p-2">
            <Package className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h2 className="text-base font-medium text-slate-800">Entregáveis</h2>
            <p className="text-sm text-slate-500">Gerir os itens a entregar nesta tarefa</p>
          </div>
        </div>

        {!addingEntregavel && (
          <Button
            onClick={() => setAddingEntregavel(true)}
            className="h-9 bg-azul text-white hover:bg-azul/80 shadow-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            <span className="font-medium">Novo Entregável</span>
          </Button>
        )}
      </div>

      {/* Dashboard de Estatísticas */}
      <div className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total</p>
                <p className="text-xl font-semibold text-slate-800 mt-1">{totalEntregaveis}</p>
              </div>
              <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                <Package className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-emerald-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Concluídos</p>
                <p className="text-xl font-semibold text-emerald-700 mt-1">{entregaveisConcluidos}</p>
              </div>
              <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-amber-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Pendentes</p>
                <p className="text-xl font-semibold text-amber-700 mt-1">{entregaveisPendentes}</p>
              </div>
              <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                <ClockIcon className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Área Principal: Formulário OU Submissão OU Lista/Quadro/Vazio */}
      <div className="mt-4">
        {/* Formulário para adicionar novo entregável */}
        {addingEntregavel ? (
          <EntregavelForm
            tarefaId={tarefaId}
            tarefaDates={{
              inicio: tarefa.inicio,
              fim: tarefa.fim,
            }}
            onCancel={() => setAddingEntregavel(false)}
            onSubmit={handleSubmit}
          />
        ) : (
          /* Formulário de submissão de entregável */
          submittingEntregavel ? (
            <EntregavelSubmit
              entregavelId={submittingEntregavel}
              nome={entregaveis.find(e => e.id === submittingEntregavel)?.nome || ""}
              descricao={entregaveis.find(e => e.id === submittingEntregavel)?.descricao}
              data={entregaveis.find(e => e.id === submittingEntregavel)?.data}
              onCancel={() => setSubmittingEntregavel(null)}
              onSubmit={handleFileUpload}
            />
          ) : (
            /* Conteúdo principal: Lista/Quadro/Vazio */
            <> 
              {/* Mensagem de vazio */}
              {entregaveis.length === 0 && (
                <div className="flex flex-col items-center justify-center pt-5 pb-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <Package className="h-7 w-7 text-slate-400" />
                  </div>
                  <h3 className="mt-4 text-base font-medium text-slate-700">Nenhum entregável</h3>
                  <p className="mt-1 text-center text-sm text-slate-500 max-w-sm">
                    Esta tarefa ainda não tem entregáveis associados. Adicione entregáveis para acompanhar o progresso da tarefa.
                  </p>
                </div>
              )}

              {/* Lista de entregáveis - Vista de Lista */}
              {entregaveis.length > 0 && viewTab === "lista" && (
                <div className="space-y-3">
                  {entregaveisFiltrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50">
                      <CircleSlash className="h-10 w-10 text-slate-300" />
                      <p className="mt-2 text-sm text-slate-500">Nenhum entregável corresponde aos filtros aplicados</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setFiltroEstado("todos");
                          setSearchText("");
                        }}
                        className="mt-3"
                      >
                        Limpar Filtros
                      </Button>
                    </div>
                  ) : (
                    entregaveisFiltrados.map((entregavel) => (
                      <Card
                        key={entregavel.id}
                        className={cn(
                          "overflow-hidden border transition-all duration-200",
                          entregavel.estado
                            ? "border-emerald-200 bg-emerald-50/40"
                            : "border-slate-200 hover:shadow-md"
                        )}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full",
                                  entregavel.estado
                                    ? "bg-emerald-100"
                                    : "bg-slate-100"
                                )}
                              >
                                {entregavel.estado ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <FileTextIcon className="h-5 w-5 text-slate-500" />
                                )}
                              </div>
                              
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h3 className="font-medium text-sm text-slate-800">
                                    {entregavel.nome}
                                  </h3>
                                </div>
                                {entregavel.data && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Calendar className="h-3 w-3 text-slate-400" />
                                    <span className="text-xs text-slate-500">
                                      {format(new Date(entregavel.data), "dd/MM/yyyy")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSubmittingEntregavel(entregavel.id)}
                                      className="h-7 w-7 rounded-full p-0 text-slate-500 hover:bg-slate-100"
                                    >
                                      <Upload className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Submeter ficheiro</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewAllAnexos(entregavel.id)}
                                className="h-7 rounded-md px-2 flex items-center text-azul hover:bg-azul/10"
                              >
                                <FileArchive className="h-3.5 w-3.5 mr-1" />
                                <span className="text-xs">Ver Anexos</span>
                              </Button>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggleEstado(entregavel.id, !entregavel.estado)}
                                      className={cn(
                                        "h-7 w-7 rounded-full p-0",
                                        entregavel.estado
                                          ? "text-emerald-600 hover:bg-emerald-50"
                                          : "text-slate-500 hover:bg-slate-100"
                                      )}
                                    >
                                      {entregavel.estado ? (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      ) : (
                                        <ClockIcon className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      {entregavel.estado
                                        ? "Marcar como pendente"
                                        : "Marcar como concluído"}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {/* Lista de entregáveis - Vista de Quadro */}
              {entregaveis.length > 0 && viewTab === "quadro" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {entregaveisFiltrados.map((entregavel) => (
                    <Card
                      key={entregavel.id}
                      className={cn(
                        "overflow-hidden border transition-all duration-200",
                        entregavel.estado
                          ? "border-emerald-200 bg-emerald-50/40"
                          : "border-slate-200 hover:shadow-md"
                      )}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full",
                              entregavel.estado
                                ? "bg-emerald-100"
                                : "bg-slate-100"
                            )}
                          >
                            {entregavel.estado ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <FileTextIcon className="h-5 w-5 text-slate-500" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-medium text-sm text-slate-800">
                                  {entregavel.nome}
                                </h3>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleEstado(entregavel.id, !entregavel.estado)}
                                        className={cn(
                                          "h-6 w-6 rounded-full p-0",
                                          entregavel.estado
                                            ? "text-emerald-600 hover:bg-emerald-50"
                                            : "text-slate-500 hover:bg-slate-100"
                                        )}
                                      >
                                        {entregavel.estado ? (
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                        ) : (
                                          <ClockIcon className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">
                                        {entregavel.estado
                                          ? "Marcar como pendente"
                                          : "Marcar como concluído"}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                            
                            {entregavel.descricao && (
                              <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                                {entregavel.descricao}
                              </p>
                            )}
                            
                            <div className="mt-2 flex items-center justify-between">
                              {entregavel.data ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-slate-400" />
                                  <span className="text-xs text-slate-500">
                                    {format(new Date(entregavel.data), "dd/MM/yyyy")}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-slate-400" />
                                  <span className="text-xs text-slate-500">Sem data</span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSubmittingEntregavel(entregavel.id)}
                                        className="h-6 w-6 rounded-full p-0 text-slate-500 hover:bg-slate-100"
                                      >
                                        <Upload className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Submeter ficheiro</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewAllAnexos(entregavel.id)}
                                  className="h-6 rounded-md px-2 text-xs text-azul hover:bg-azul/10 flex items-center"
                                >
                                  <FileArchive className="h-3 w-3 mr-1" />
                                  Ver Anexos
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )
        )}
      </div>

      {/* Diálogo para visualizar todos os anexos */}
      <Dialog 
        open={!!viewingAllAnexos} 
        onOpenChange={(open) => !open && setViewingAllAnexos(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Todos os Anexos
              {viewingAllAnexos && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {entregaveis.find(e => e.id === viewingAllAnexos)?.nome}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {isLoadingAnexos ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-azul border-opacity-50 border-t-transparent rounded-full" />
            </div>
          ) : anexos.length === 0 ? (
            <div className="text-center py-10">
              <div className="flex justify-center">
                <div className="h-16 w-16 flex items-center justify-center rounded-full bg-slate-100">
                  <FileArchive className="h-8 w-8 text-slate-400" />
                </div>
              </div>
              <h3 className="mt-4 text-sm font-medium text-slate-900">Nenhum anexo encontrado</h3>
              <p className="mt-1 text-sm text-slate-500">
                Este entregável ainda não possui anexos.
              </p>
              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => setViewingAllAnexos(null)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-y-auto max-h-[400px] pr-1">
                <ScrollArea className="h-full w-full rounded-md">
                  <div className="space-y-2">
                    {anexos.map((anexo: AnexoFile, index) => (
                      <div 
                        key={anexo.url || index} 
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex items-center justify-center rounded-md bg-white border border-slate-200">
                            {getFileIcon(anexo.fileName)}
                          </div>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">{anexo.fileName}</p>
                            <p className="text-xs text-slate-500">
                              {anexo.fileType} • {formatBytes(anexo.size)} • {formatarData(anexo.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewAnexo(anexo.url)}
                                  className="h-8 w-8 rounded-full p-0 text-slate-500 hover:bg-slate-200"
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadAnexo(anexo.url, anexo.fileName)}
                                  className="h-8 w-8 rounded-full p-0 text-slate-500 hover:bg-slate-200"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                            </Tooltip>
                          </TooltipProvider>
                          
                          {isGestor && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteAnexo(anexo.url, viewingAllAnexos!)}
                                    className="h-8 w-8 rounded-full p-0 text-red-500 hover:bg-red-50"
                                    disabled={isDeletingAnexo}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Remover</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              
              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setViewingAllAnexos(null)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog 
        open={!!anexoToDelete} 
        onOpenChange={(open) => !open && setAnexoToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este anexo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAnexo} disabled={isDeletingAnexo} className="bg-azul text-white hover:bg-azul/90">
              {isDeletingAnexo ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
