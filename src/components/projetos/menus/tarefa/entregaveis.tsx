import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { 
  Plus, 
  FileText, 
  CheckCircle2,
  Upload, 
  Trash, 
  Calendar, 
  Package, 
  ListChecks,
  AlertCircle,
  Filter,
  ChevronDown,
  Search,
  CircleSlash,
  LayoutGrid,
  List,
  ClockIcon,
  X,
  FileArchive,
  FileText as FileTextIcon
} from "lucide-react";
import { EntregavelSubmit } from "@/components/projetos/menus/tarefa/submit";
import { EntregavelForm } from "@/components/projetos/criar/novo/workpackages/entregavel/form";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger, 
  DropdownMenuRadioGroup, 
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TarefaEntregaveisProps {
  tarefa: any;
  tarefaId: string;
  addingEntregavel: boolean;
  setAddingEntregavel: (value: boolean) => void;
  onUpdate: (data: any) => Promise<void>;
  onCreateEntregavel: (data: any) => Promise<void>;
  onUpdateEntregavel: (id: string, data: any) => Promise<void>;
  onDeleteEntregavel: (id: string) => Promise<void>;
}

export function TarefaEntregaveis({
  tarefa,
  tarefaId,
  addingEntregavel,
  setAddingEntregavel,
  onUpdate,
  onCreateEntregavel,
  onUpdateEntregavel,
  onDeleteEntregavel,
}: TarefaEntregaveisProps) {
  const [submittingEntregavel, setSubmittingEntregavel] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendentes" | "concluidos">("todos");
  const [searchText, setSearchText] = useState("");
  const [viewTab, setViewTab] = useState<"lista" | "quadro">("lista");

  // Buscar entregáveis da tarefa
  const { data: entregaveis = [] } = api.tarefa.getEntregaveisByTarefa.useQuery(tarefaId, {
    enabled: !!tarefaId,
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

  const handleRemoveEntregavel = async (entregavelId: string) => {
    if (confirm("Tem a certeza que deseja remover este entregável?")) {
      await onDeleteEntregavel(entregavelId);
    }
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
      // Aqui você pode implementar a lógica de upload do arquivo
      console.log("Upload do arquivo:", file);
      toast.success("Ficheiro submetido com sucesso");
      setSubmittingEntregavel(null);
    } catch (error) {
      console.error("Erro ao submeter ficheiro:", error);
      toast.error("Erro ao submeter ficheiro");
    }
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

      {/* Formulário para adicionar novo entregável */}
      {addingEntregavel && (
        <EntregavelForm
          tarefaId={tarefaId}
          tarefaDates={{
            inicio: tarefa.inicio,
            fim: tarefa.fim,
          }}
          onCancel={() => setAddingEntregavel(false)}
          onSubmit={handleSubmit}
        />
      )}

      {/* Dashboard de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-slate-50 border-slate-200 shadow-sm p-3 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-slate-200 p-1.5">
              <ListChecks className="h-4 w-4 text-slate-700" />
            </div>
            <div>
              <p className="text-sm text-slate-600 font-medium">Total</p>
              <p className="text-lg font-semibold text-slate-800">{totalEntregaveis}</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-emerald-50 border-emerald-200 shadow-sm p-3 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-emerald-100 p-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-emerald-700 font-medium">Concluídos</p>
              <p className="text-lg font-semibold text-emerald-800">{entregaveisConcluidos}</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-amber-50 border-amber-200 shadow-sm p-3 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-amber-100 p-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-700 font-medium">Pendentes</p>
              <p className="text-lg font-semibold text-amber-800">{entregaveisPendentes}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Barra de ferramentas */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Pesquisar entregáveis..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Filter className="h-4 w-4" />
                <span className="text-xs">Estado</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuRadioGroup value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as any)}>
                <DropdownMenuRadioItem value="todos" className="text-xs cursor-pointer">
                  <ListChecks className="h-3.5 w-3.5 mr-2 text-slate-500" />
                  Todos
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="pendentes" className="text-xs cursor-pointer">
                  <AlertCircle className="h-3.5 w-3.5 mr-2 text-amber-500" />
                  Pendentes
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="concluidos" className="text-xs cursor-pointer">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                  Concluídos
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as "lista" | "quadro")}>
            <TabsList className="h-9 bg-slate-100 p-1">
              <TabsTrigger 
                value="lista" 
                className={cn(
                  "flex items-center gap-1 h-7 px-2.5 data-[state=active]:bg-white",
                  "data-[state=active]:text-slate-800 rounded-md"
                )}
              >
                <List className="h-3.5 w-3.5" />
                <span className="text-xs">Lista</span>
              </TabsTrigger>
              <TabsTrigger 
                value="quadro" 
                className={cn(
                  "flex items-center gap-1 h-7 px-2.5 data-[state=active]:bg-white",
                  "data-[state=active]:text-slate-800 rounded-md"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="text-xs">Quadro</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Mensagem de vazio */}
      {entregaveis.length === 0 && !addingEntregavel && (
        <div className="flex flex-col items-center justify-center pt-5 pb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Package className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="mt-4 text-base font-medium text-slate-700">Nenhum entregável</h3>
          <p className="mt-1 text-center text-sm text-slate-500 max-w-sm">
            Esta tarefa ainda não tem entregáveis associados. Adicione entregáveis para acompanhar o progresso da tarefa.
          </p>
          <Button
            onClick={() => setAddingEntregavel(true)}
            className="mt-5 h-9 bg-slate-800 text-white hover:bg-slate-700"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            <span>Adicionar Entregável</span>
          </Button>
        </div>
      )}

      {/* Formulário de submissão de entregável */}
      {submittingEntregavel && (
        <div className="py-3">
          <EntregavelSubmit
            entregavelId={submittingEntregavel}
            nome={entregaveis.find(e => e.id === submittingEntregavel)?.nome || ""}
            descricao={entregaveis.find(e => e.id === submittingEntregavel)?.descricao}
            data={entregaveis.find(e => e.id === submittingEntregavel)?.data}
            onCancel={() => setSubmittingEntregavel(null)}
            onSubmit={handleFileUpload}
          />
        </div>
      )}

      {/* Lista de entregáveis - Vista de Lista */}
      {entregaveis.length > 0 && viewTab === "lista" && !submittingEntregavel && (
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
                        <h3 className="font-medium text-sm text-slate-800">
                          {entregavel.nome}
                        </h3>
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
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveEntregavel(entregavel.id)}
                              className="h-7 w-7 rounded-full p-0 text-red-500 hover:bg-red-50"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Remover entregável</p>
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
      {entregaveis.length > 0 && viewTab === "quadro" && !submittingEntregavel && (
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
                      <h3 className="font-medium text-sm text-slate-800">
                        {entregavel.nome}
                      </h3>
                      
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
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveEntregavel(entregavel.id)}
                                className="h-6 w-6 rounded-full p-0 text-red-500 hover:bg-red-50"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Remover entregável</p>
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
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
