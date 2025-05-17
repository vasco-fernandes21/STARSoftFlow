"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Bell,
  BellRing,
  AlertTriangle,
  CheckCircle2,
  Clock,
  File,
  Users,
  ExternalLink,
  Briefcase,
  ListChecks,
  MessageCircle,
  Search,
  Archive,
  MailOpen,
  X,
  Trash,
  Info,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { BadgeEstado } from "@/components/common/BadgeEstado";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import {

} from "@/components/ui/dropdown-menu";
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
// import { useNotificacoes } from "@/components/providers/NotificacoesProvider"; // REMOVER
import type { EntidadeNotificacao, UrgenciaNotificacao, EstadoNotificacao as PrismaEstadoNotificacao, Notificacao as PrismaNotificacao } from "@prisma/client"; // Adicionar PrismaEstadoNotificacao

import { StatsGrid } from "@/components/common/StatsGrid";
import type { StatItem } from "@/components/common/StatsGrid";
import { api } from "@/trpc/react";


// Definir o tipo Notificacao diretamente aqui ou importar do Prisma
export type Notificacao = PrismaNotificacao;
export type EstadoNotificacao = PrismaEstadoNotificacao; // Exportar para uso interno

// Labels e utilidades
const TIPO_LABELS: Record<EntidadeNotificacao, string> = {
  ENTREGAVEL: "Entregável",
  PROJETO: "Projeto",
  WORKPACKAGE: "Workpackage",
  ALOCACAO: "Alocação",
  TAREFA: "Tarefa",
  SISTEMA: "Sistema",
  COMENTARIO: "Comentário",
  GERAL: "Geral",
  FEEDBACK: "Feedback",
};


function getRelativeTime(date: Date): string {
  return formatDistanceToNow(new Date(date), { 
    addSuffix: true, 
    locale: ptBR 
  });
}

function getIconByType(tipo: EntidadeNotificacao) {
  switch (tipo) {
    case "ENTREGAVEL":
      return <File className="h-5 w-5" />;
    case "PROJETO":
      return <Briefcase className="h-5 w-5" />;
    case "WORKPACKAGE":
      return <ListChecks className="h-5 w-5" />;
    case "ALOCACAO":
      return <Users className="h-5 w-5" />;
    case "TAREFA":
      return <CheckCircle2 className="h-5 w-5" />;
    case "SISTEMA":
      return <MessageCircle className="h-5 w-5" />;
    case "COMENTARIO":
      return <MessageCircle className="h-5 w-5" />; // Placeholder, consider a more specific icon
    case "GERAL":
      return <Info className="h-5 w-5" />; // Placeholder, import Info from lucide-react
    case "FEEDBACK":
      return <Star className="h-5 w-5" />; // Placeholder, import Star from lucide-react
  }
}

function getIconBgColor(urgencia: UrgenciaNotificacao, isCard = false): string {
  if (isCard) {
    switch (urgencia) {
      case "ALTA":
        return "bg-red-100 text-red-700";
      case "MEDIA":
        return "bg-amber-100 text-amber-700";
      case "BAIXA":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }
  
  switch (urgencia) {
    case "ALTA":
      return "bg-red-50/70 text-red-600";
    case "MEDIA":
      return "bg-amber-50/70 text-amber-600";
    case "BAIXA":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getCardBorderColor(urgencia: UrgenciaNotificacao, isRead: boolean): string {
  if (isRead) {
    switch (urgencia) {
      case "ALTA":
        return "border-red-100";
      case "MEDIA":
        return "border-amber-100";
      case "BAIXA":
        return "border-slate-100";
      default:
        return "border-slate-100";
    }
  }
  
  switch (urgencia) {
    case "ALTA":
      return "border-red-300";
    case "MEDIA":
      return "border-amber-300";
    case "BAIXA":
      return "border-slate-200";
    default:
      return "border-slate-200";
  }
}

// Componente principal
export default function Notificacoes() {
  const router = useRouter();
  const utils = api.useUtils();
  
  const [activeTab, setActiveTab] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Estados para o AlertDialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [notificacaoToDelete, setNotificacaoToDelete] = useState<string | null>(null);
  const [deleteMultiple, setDeleteMultiple] = useState(false);

  // tRPC Query para listar notificações
  const { data: notificacoesData, isLoading, refetch: refetchNotificacoes } = api.notificacao.listar.useQuery(
    undefined, // Sem filtros iniciais, ou podemos adicionar filtros baseados na aba ativa
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: true,
    }
  );
  const notificacoes = useMemo(() => notificacoesData ?? [], [notificacoesData]);


  // tRPC Mutations
  const marcarComoLidaMutation = api.notificacao.marcarComoLida.useMutation({
    onSuccess: () => {
      utils.notificacao.listar.invalidate();
      utils.notificacao.contarNaoLidas.invalidate();
    },
  });

  const arquivarNotificacaoMutation = api.notificacao.arquivar.useMutation({
    onSuccess: () => {
      utils.notificacao.listar.invalidate();
      utils.notificacao.contarNaoLidas.invalidate();
    },
  });
  
  const apagarNotificacaoMutation = api.notificacao.apagar.useMutation({
    onSuccess: () => {
      utils.notificacao.listar.invalidate();
      utils.notificacao.contarNaoLidas.invalidate();
    },
  });
  
  const apagarMuitasNotificacoesMutation = api.notificacao.apagarMuitas.useMutation({
    onSuccess: () => {
      utils.notificacao.listar.invalidate();
      utils.notificacao.contarNaoLidas.invalidate();
      setSelectedIds(new Set());
    },
  });
  
  // Funções de ação adaptadas
  const marcarComoLida = useCallback(async (id: string) => {
    await marcarComoLidaMutation.mutateAsync(id);
  }, [marcarComoLidaMutation]);

  const arquivar = useCallback(async (id: string) => {
    await arquivarNotificacaoMutation.mutateAsync(id);
  }, [arquivarNotificacaoMutation]);
  
  // Função para confirmar exclusão
  const handleOpenDeleteDialog = useCallback((id?: string) => {
    if (id) {
      // Exclusão de uma única notificação
      setNotificacaoToDelete(id);
      setDeleteMultiple(false);
    } else {
      // Exclusão múltipla
      setDeleteMultiple(true);
    }
    setIsDeleteDialogOpen(true);
  }, []);
  
  // Função para executar a exclusão após confirmação
  const handleConfirmDelete = useCallback(async () => {
    try {
      if (deleteMultiple) {
        // Apagar múltiplas notificações
        const idsToDelete = Array.from(selectedIds);
        if (idsToDelete.length > 0) {
          await apagarMuitasNotificacoesMutation.mutateAsync({ ids: idsToDelete });
        }
        //setSelectedIds(new Set()); // Movido para onSuccess da mutation apagarMuitas
      } else if (notificacaoToDelete) {
        // Apagar uma única notificação
        await apagarNotificacaoMutation.mutateAsync(notificacaoToDelete);
      }
    } catch (error) {
      console.error("Erro ao apagar notificações:", error);
    } finally {
      setIsDeleteDialogOpen(false);
      setNotificacaoToDelete(null);
      // Se não for deleteMultiple, selectedIds não precisa ser limpo aqui,
      // pois a notificação individual não depende de selectedIds.
      // Se for deleteMultiple, já é tratado no onSuccess da apagarMuitasNotificacoesMutation
    }
  }, [deleteMultiple, selectedIds, notificacaoToDelete, apagarNotificacaoMutation, apagarMuitasNotificacoesMutation, utils]); // Adicionado apagarMuitasNotificacoesMutation e utils às dependências
  
  // Função para apagar notificações selecionadas
  const handleApagarSelecionadas = useCallback(() => {
    if (selectedIds.size === 0) return;
    handleOpenDeleteDialog();
  }, [selectedIds, handleOpenDeleteDialog]);

  // Filtrar notificações baseado no separador e termo de pesquisa
  const filteredNotificacoes = useMemo(() => {
    let filtered = notificacoes;
    
    // Filtrar por estado/tab
    if (activeTab === "nao_lidas") {
      filtered = filtered.filter((n: Notificacao) => n.estado === "NAO_LIDA");
    } else if (activeTab === "lidas") {
      filtered = filtered.filter((n: Notificacao) => n.estado === "LIDA");
    } else if (activeTab === "arquivadas") {
      filtered = filtered.filter((n: Notificacao) => n.estado === "ARQUIVADA");
    }
    
    // Filtrar por termo de pesquisa
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (n: Notificacao) => 
          n.titulo.toLowerCase().includes(term) || 
          (n.descricao || "").toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [notificacoes, activeTab, searchTerm]);

  // Limpar seleção ao mudar de aba
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    setSelectedIds(new Set());
  }, []);

  // Navegar para o item relacionado
  const handleNavigate = useCallback(async (notificacao: Notificacao) => {
    if (notificacao.estado === "NAO_LIDA") {
      await marcarComoLida(notificacao.id);
    }

    switch (notificacao.entidade) {
      case "PROJETO":
        router.push(`/projetos/${notificacao.entidadeId}`);
        break;
      case "WORKPACKAGE":
        router.push(`/projetos/${notificacao.entidadeId}/workpackages`);
        break;
      case "ENTREGAVEL":
        router.push(`/projetos/entregaveis/${notificacao.entidadeId}`);
        break;
      case "TAREFA":
        router.push(`/projetos/tarefas/${notificacao.entidadeId}`);
        break;
      case "ALOCACAO":
        router.push(`/utilizadores/${notificacao.entidadeId}`);
        break;
      default:
        router.push("/notificacoes");
    }
  }, [router, marcarComoLida]);

  // Gerenciar seleção de notificações
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredNotificacoes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotificacoes.map(n => n.id)));
    }
  }, [selectedIds, filteredNotificacoes]);

  // Ações em massa
  const handleMarcarSelecionadasComoLidas = async () => {
    for (const id of selectedIds) {
      await marcarComoLida(id);
    }
    setSelectedIds(new Set());
  };

  const handleArquivarSelecionadas = async () => {
    for (const id of selectedIds) {
      await arquivar(id);
    }
    setSelectedIds(new Set());
  };

  // Estatísticas
  const stats = useMemo<StatItem[]>(() => {
    const total = notificacoes.length;
    const naoLidas = notificacoes.filter((n: Notificacao) => n.estado === "NAO_LIDA").length;
    const alta = notificacoes.filter((n: Notificacao) => n.urgencia === "ALTA").length;
    
    const hoje = new Date();
    const notificacoesHoje = notificacoes.filter((n: Notificacao) => {
      const data = new Date(n.createdAt);
      return (
        data.getDate() === hoje.getDate() &&
        data.getMonth() === hoje.getMonth() &&
        data.getFullYear() === hoje.getFullYear()
      );
    }).length;

    return [
      {
        icon: Bell,
        label: "Total",
        value: total,
        iconClassName: "text-blue-600",
        iconContainerClassName: "bg-blue-50/80",
        badgeText: "Notificações no sistema",
        badgeClassName: "text-slate-500 bg-slate-50",
      },
      {
        icon: BellRing,
        label: "Não lidas",
        value: naoLidas,
        iconClassName: "text-amber-600",
        iconContainerClassName: "bg-amber-50/80",
        badgeText: `${total ? Math.round((naoLidas / total) * 100) : 0}% não lidas`,
        badgeClassName: "text-amber-600 bg-amber-50/80 border-amber-100",
      },
      {
        icon: AlertTriangle,
        label: "Urgentes",
        value: alta,
        iconClassName: "text-red-600",
        iconContainerClassName: "bg-red-50/80",
        badgeText: "Requerem atenção imediata",
        badgeClassName: "text-red-600 bg-red-50/80 border-red-100",
      },
      {
        icon: Clock,
        label: "Hoje",
        value: notificacoesHoje,
        iconClassName: "text-green-600",
        iconContainerClassName: "bg-green-50/80",
        badgeText: "Novidades nas últimas 24h",
        badgeClassName: "text-slate-500 bg-slate-50",
      },
    ];
  }, [notificacoes]);

  return (
    <div className="min-h-fit flex flex-col overflow-hidden bg-[#F7F9FC] p-4 md:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-8xl flex-1 flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">
              Notificações
            </h1>
            <p className="text-sm text-slate-500">
              Consulte as mensagens, alertas e novidades do sistema
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">            
            <Button 
              variant="default" 
              size="sm" 
              disabled={selectedIds.size === 0} 
              onClick={handleMarcarSelecionadasComoLidas}
              className="h-9 rounded-full text-xs font-medium shadow-sm"
            >
              <MailOpen className="mr-2 h-4 w-4" />
              Marcar como lida
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-full border-red-200 text-xs font-medium text-red-600 shadow-sm transition-all hover:bg-red-50 hover:text-red-700 hover:shadow-none"
              disabled={selectedIds.size === 0}
              onClick={handleArquivarSelecionadas}
            >
              <Archive className="mr-2 h-4 w-4" />
              Arquivar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-full border-red-200 text-xs font-medium text-red-600 shadow-sm transition-all hover:bg-red-50 hover:text-red-700 hover:shadow-none"
              disabled={selectedIds.size === 0}
              onClick={handleApagarSelecionadas}
            >
              <Trash className="mr-2 h-4 w-4" />
              Apagar
            </Button>
          </div>
        </div>
        
        {/* Cards de estatísticas */}
        <div className="mb-4 flex-shrink-0">
          <StatsGrid stats={stats} />
        </div>
        
        {/* Interface principal */}
        <div className="flex-1 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow">
          <Tabs defaultValue="todas" value={activeTab} onValueChange={handleTabChange} className="flex h-full flex-col">
            <div className="flex flex-col items-start gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="h-10 rounded-lg bg-slate-50 p-1">
                <TabsTrigger 
                  value="todas" 
                  className="rounded-md text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Todas
                </TabsTrigger>
                <TabsTrigger 
                  value="nao_lidas" 
                  className="rounded-md text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Não lidas
                  {notificacoes.filter((n: Notificacao) => n.estado === "NAO_LIDA").length > 0 && (
                    <Badge className="ml-2 h-5 rounded-full bg-azul px-2 text-xs text-white hover:bg-azul/80">
                      {notificacoes.filter((n: Notificacao) => n.estado === "NAO_LIDA").length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="lidas" 
                  className="rounded-md text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Lidas
                </TabsTrigger>
                <TabsTrigger 
                  value="arquivadas" 
                  className="rounded-md text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Arquivadas
                </TabsTrigger>
              </TabsList>
              
              <div className="relative w-full sm:w-64 md:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Pesquisar notificações..."
                  className="h-9 w-full rounded-full border-slate-200 bg-slate-50/50 pl-9 pr-4 text-slate-700 shadow-inner transition-all duration-200 ease-in-out focus:border-azul/30 focus:bg-white focus:ring-1 focus:ring-azul/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="todas" className="h-full p-0 data-[state=active]:flex data-[state=active]:flex-col focus-visible:outline-none focus-visible:ring-0">
                <NotificacoesLista 
                  notificacoes={filteredNotificacoes} 
                  selectedIds={selectedIds}
                  toggleSelect={toggleSelect}
                  toggleSelectAll={toggleSelectAll}
                  onNavigate={handleNavigate}
                  isLoading={isLoading}
                  isEmpty={filteredNotificacoes.length === 0}
                  showCheckboxes={true}
                  searchTerm={searchTerm}
                />
              </TabsContent>
              
              <TabsContent value="nao_lidas" className="h-full p-0 data-[state=active]:flex data-[state=active]:flex-col focus-visible:outline-none focus-visible:ring-0">
                <NotificacoesLista 
                  notificacoes={filteredNotificacoes} 
                  selectedIds={selectedIds}
                  toggleSelect={toggleSelect}
                  toggleSelectAll={toggleSelectAll}
                  onNavigate={handleNavigate}
                  isLoading={isLoading}
                  isEmpty={filteredNotificacoes.length === 0}
                  showCheckboxes={true}
                  searchTerm={searchTerm}
                />
              </TabsContent>
              
              <TabsContent value="lidas" className="h-full p-0 data-[state=active]:flex data-[state=active]:flex-col focus-visible:outline-none focus-visible:ring-0">
                <NotificacoesLista 
                  notificacoes={filteredNotificacoes} 
                  selectedIds={selectedIds}
                  toggleSelect={toggleSelect}
                  toggleSelectAll={toggleSelectAll}
                  onNavigate={handleNavigate}
                  isLoading={isLoading}
                  isEmpty={filteredNotificacoes.length === 0}
                  showCheckboxes={true}
                  searchTerm={searchTerm}
                />
              </TabsContent>
              
              <TabsContent value="arquivadas" className="h-full p-0 data-[state=active]:flex data-[state=active]:flex-col focus-visible:outline-none focus-visible:ring-0">
                <NotificacoesLista 
                  notificacoes={filteredNotificacoes} 
                  selectedIds={selectedIds}
                  toggleSelect={toggleSelect}
                  toggleSelectAll={toggleSelectAll}
                  onNavigate={handleNavigate}
                  isLoading={isLoading}
                  isEmpty={filteredNotificacoes.length === 0}
                  showCheckboxes={true}
                  searchTerm={searchTerm}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
      
      {/* AlertDialog para confirmar exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent tipo="erro">
          <AlertDialogHeader>
            <AlertDialogTitle tipo="erro">
              {deleteMultiple 
                ? `Apagar ${selectedIds.size} notificação${selectedIds.size > 1 ? 'ções' : ''}?`
                : "Apagar notificação?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMultiple 
                ? `Tem a certeza que deseja apagar ${selectedIds.size} ${selectedIds.size > 1 ? 'notificações' : 'notificação'}?`
                : "Tem a certeza que deseja apagar esta notificação?"}
              <span className="mt-2 block font-medium text-red-600">Esta ação não pode ser revertida.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              destrutivo 
              tipo="erro"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Componente de listagem de notificações
function NotificacoesLista({
  notificacoes,
  selectedIds,
  toggleSelect,
  toggleSelectAll,
  onNavigate,
  isLoading,
  isEmpty,
  showCheckboxes,
  searchTerm
}: {
  notificacoes: Notificacao[];
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  onNavigate: (notificacao: Notificacao) => void;
  isLoading: boolean;
  isEmpty: boolean;
  showCheckboxes: boolean;
  searchTerm: string;
}) {
  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Clock className="mx-auto h-10 w-10 animate-pulse text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">A carregar notificações...</p>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 shadow-sm">
          <Bell className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="mt-4 text-base font-medium text-slate-700">Nenhuma notificação encontrada</h3>
        <p className="mt-1.5 text-sm text-slate-500">
          {searchTerm 
            ? "Tente ajustar a sua pesquisa para encontrar o que procura."
            : "Não existem notificações nesta categoria."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {showCheckboxes && (
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-2 text-sm font-medium text-slate-500">
          <Checkbox
            id="select-all"
            checked={
              selectedIds.size > 0 && selectedIds.size === notificacoes.length
                ? true
                : selectedIds.size > 0
                ? "indeterminate"
                : false
            }
            onCheckedChange={toggleSelectAll}
            className="border-slate-300 data-[state=checked]:border-azul data-[state=checked]:bg-azul"
          />
          <label htmlFor="select-all" className="cursor-pointer">
            {selectedIds.size === 0
              ? "Selecionar tudo"
              : `${selectedIds.size} ${selectedIds.size === 1 ? "selecionada" : "selecionadas"}`}
          </label>
        </div>
      )}

      <div className="flex-1 min-h-[400px] overflow-y-auto">
        <div className="divide-y divide-slate-100">
          {notificacoes.map((notificacao) => (
            <NotificacaoItem
              key={notificacao.id}
              notificacao={notificacao}
              isSelected={selectedIds.has(notificacao.id)}
              onSelect={() => toggleSelect(notificacao.id)}
              onNavigate={() => onNavigate(notificacao)}
              showCheckbox={showCheckboxes}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Item individual de notificação
function NotificacaoItem({
  notificacao,
  isSelected,
  onSelect,
  onNavigate,
  showCheckbox,
}: {
  notificacao: Notificacao;
  isSelected: boolean;
  onSelect: () => void;
  onNavigate: () => void;
  showCheckbox: boolean;
}) {
  const isRead = notificacao.estado !== "NAO_LIDA";
  const utils = api.useUtils();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Mutation para apagar notificação
  const apagarNotificacaoMutation = api.notificacao.apagar.useMutation({
    onSuccess: () => {
      utils.notificacao.listar.invalidate();
      utils.notificacao.contarNaoLidas.invalidate();
    },
  });
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  }, []);
  
  const handleConfirmDelete = useCallback(() => {
    apagarNotificacaoMutation.mutate(notificacao.id);
    setIsDeleteDialogOpen(false);
  }, [notificacao.id, apagarNotificacaoMutation]);
  
  return (
    <>
      <div
        className={cn(
          "group flex cursor-pointer gap-3 border-l-4 bg-white p-4 transition-colors hover:bg-slate-50/70",
          isSelected ? "border-l-azul bg-azul/5" : getCardBorderColor(notificacao.urgencia || 'BAIXA', isRead),
          isRead ? "bg-white" : "bg-slate-50/50"
        )}
        onClick={onNavigate}
      >
        {showCheckbox && (
          <div className="mt-1 flex-none" onClick={(e) => { e.stopPropagation(); onSelect(); }}>
            <Checkbox
              checked={isSelected}
              className="h-4 w-4 border-slate-300 data-[state=checked]:border-azul data-[state=checked]:bg-azul"
            />
          </div>
        )}
        
        <div className={cn(
          "flex h-9 w-9 flex-none items-center justify-center rounded-full",
          getIconBgColor(notificacao.urgencia || 'BAIXA', true)
        )}>
          {getIconByType(notificacao.entidade)}
        </div>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className={cn(
              "text-base",
              isRead ? "font-medium text-slate-700" : "font-semibold text-slate-800"
            )}>
              {notificacao.titulo}
            </h4>
            
            <div className="flex items-center gap-2">
              <BadgeEstado
                status={notificacao.entidade}
                label={TIPO_LABELS[notificacao.entidade]}
                variant="notificacao"
                customClassName={cn(
                  notificacao.entidade === "ENTREGAVEL" && "border-blue-200 bg-blue-50/70 text-blue-600",
                  notificacao.entidade === "PROJETO" && "border-purple-200 bg-purple-50/70 text-purple-600",
                  notificacao.entidade === "WORKPACKAGE" && "border-green-200 bg-green-50/70 text-green-600",
                  notificacao.entidade === "ALOCACAO" && "border-amber-200 bg-amber-50/70 text-amber-600",
                  notificacao.entidade === "TAREFA" && "border-cyan-200 bg-cyan-50/70 text-cyan-600",
                  notificacao.entidade === "SISTEMA" && "border-slate-200 bg-slate-50/70 text-slate-600",
                  notificacao.entidade === "COMENTARIO" && "border-indigo-200 bg-indigo-50/70 text-indigo-600",
                  notificacao.entidade === "GERAL" && "border-gray-200 bg-gray-50/70 text-gray-600",
                  notificacao.entidade === "FEEDBACK" && "border-pink-200 bg-pink-50/70 text-pink-600",
                  "text-xs"
                )}
              />
              
              {notificacao.urgencia === "ALTA" && (
                <Badge className="border-0 bg-red-100 px-2 text-xs font-medium text-red-600">
                  Urgente
                </Badge>
              )}
            </div>
          </div>
          
          <p className="text-sm text-slate-600">
            {notificacao.descricao}
          </p>
          
          <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {getRelativeTime(notificacao.createdAt)}
            </span>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="invisible h-8 w-8 rounded-full p-0 text-slate-400 transition-colors group-hover:visible hover:bg-slate-100 hover:text-azul"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate();
                }}
              >
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Ver detalhes</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="invisible h-8 w-8 rounded-full p-0 text-slate-400 transition-colors group-hover:visible hover:bg-red-50 hover:text-red-600"
                onClick={handleDelete}
              >
                <Trash className="h-4 w-4" />
                <span className="sr-only">Apagar notificação</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* AlertDialog para confirmar exclusão individual */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent tipo="erro">
          <AlertDialogHeader>
            <AlertDialogTitle tipo="erro">
              Apagar notificação?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja apagar esta notificação?
              <span className="mt-2 block font-medium text-red-600">Esta ação não pode ser revertida.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              destrutivo 
              tipo="erro"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


