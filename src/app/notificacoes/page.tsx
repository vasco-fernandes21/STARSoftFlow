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
  Trash2,
  Check,
  MessageCircle,
  CircleAlert,
  Filter,
  Search,
  XCircle,
  Archive,
  MailOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { BadgeEstado } from "@/components/common/BadgeEstado";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useNotificacoes } from "@/components/providers/NotificacoesProvider";
import type { EntidadeNotificacao, UrgenciaNotificacao, EstadoNotificacao } from "@prisma/client";
import type { Notificacao } from "@/components/providers/NotificacoesProvider";

// Labels e utilidades
const TIPO_LABELS: Record<EntidadeNotificacao, string> = {
  ENTREGAVEL: "Entregável",
  PROJETO: "Projeto",
  WORKPACKAGE: "Workpackage",
  ALOCACAO: "Alocação",
  TAREFA: "Tarefa",
  SISTEMA: "Sistema",
};

const URGENCIA_LABELS: Record<UrgenciaNotificacao, string> = {
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
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
  const { notificacoes, marcarComoLida, arquivar, naoLidas, filtrarPorEstado, isLoading } = useNotificacoes();
  const [activeTab, setActiveTab] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Filtrar notificações baseado na aba e termo de pesquisa
  const filteredNotificacoes = useMemo(() => {
    let filtered = notificacoes;
    
    // Filtrar por estado/tab
    if (activeTab === "nao_lidas") {
      filtered = filtrarPorEstado("NAO_LIDA");
    } else if (activeTab === "lidas") {
      filtered = filtrarPorEstado("LIDA");
    } else if (activeTab === "arquivadas") {
      filtered = filtrarPorEstado("ARQUIVADA");
    }
    
    // Filtrar por termo de pesquisa
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        n => 
          n.titulo.toLowerCase().includes(term) || 
          n.descricao.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [notificacoes, activeTab, searchTerm, filtrarPorEstado]);

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
  const stats = useMemo(() => {
    const total = notificacoes.length;
    const naoLidas = filtrarPorEstado("NAO_LIDA").length;
    const alta = notificacoes.filter(n => n.urgencia === "ALTA").length;
    
      const hoje = new Date();
    const notificacoesHoje = notificacoes.filter(n => {
      const data = new Date(n.dataEmissao);
      return (
        data.getDate() === hoje.getDate() &&
        data.getMonth() === hoje.getMonth() &&
        data.getFullYear() === hoje.getFullYear()
      );
    }).length;

    return { total, naoLidas, alta, notificacoesHoje };
  }, [notificacoes, filtrarPorEstado]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7F9FC] to-white p-6 pb-12 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Cabeçalho */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">
              Centro de Notificações
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie mensagens, alertas e novidades do sistema
            </p>
        </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchTerm("")}
              disabled={!searchTerm}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Limpar filtros
            </Button>
            
            <Button variant="default" size="sm" disabled={selectedIds.size === 0} onClick={handleMarcarSelecionadasComoLidas}>
              <MailOpen className="mr-2 h-4 w-4" />
              Marcar como lida
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={selectedIds.size === 0}
              onClick={handleArquivarSelecionadas}
            >
              <Archive className="mr-2 h-4 w-4" />
              Arquivar
            </Button>
          </div>
        </div>
        
        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div 
            className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Total</p>
              <div className="rounded-full bg-blue-50 p-2 text-blue-600">
                <Bell className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{stats.total}</p>
            <p className="mt-1 text-xs text-slate-500">Notificações no sistema</p>
          </motion.div>
          
          <motion.div 
            className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Não lidas</p>
              <div className="rounded-full bg-amber-50 p-2 text-amber-600">
                <BellRing className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{stats.naoLidas}</p>
            <div className="mt-1 flex items-center gap-1">
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                {stats.total ? Math.round((stats.naoLidas / stats.total) * 100) : 0}% não lidas
              </Badge>
            </div>
          </motion.div>
          
          <motion.div 
            className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Urgentes</p>
              <div className="rounded-full bg-red-50 p-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{stats.alta}</p>
            <div className="mt-1 flex items-center gap-1">
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                Requerem atenção imediata
              </Badge>
            </div>
          </motion.div>
          
          <motion.div 
            className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Hoje</p>
              <div className="rounded-full bg-green-50 p-2 text-green-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{stats.notificacoesHoje}</p>
            <p className="mt-1 text-xs text-slate-500">Novidades nas últimas 24h</p>
          </motion.div>
        </div>
        
        {/* Interface principal */}
        <div className="mt-6 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-100">
          <Tabs defaultValue="todas" value={activeTab} onValueChange={handleTabChange}>
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
                  {stats.naoLidas > 0 && (
                    <Badge className="ml-2 bg-amber-500">{stats.naoLidas}</Badge>
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
                  className="w-full border-slate-200 pl-9 shadow-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <TabsContent value="todas" className="p-0 pt-1 focus-visible:outline-none focus-visible:ring-0">
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
            
            <TabsContent value="nao_lidas" className="p-0 pt-1 focus-visible:outline-none focus-visible:ring-0">
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
            
            <TabsContent value="lidas" className="p-0 pt-1 focus-visible:outline-none focus-visible:ring-0">
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
            
            <TabsContent value="arquivadas" className="p-0 pt-1 focus-visible:outline-none focus-visible:ring-0">
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
          </Tabs>
        </div>
      </div>
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
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Clock className="mx-auto h-10 w-10 animate-pulse text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">A carregar notificações...</p>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <div className="text-center">
          <Bell className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-xl font-semibold text-slate-700">Nenhuma notificação encontrada</h3>
          <p className="mt-2 text-sm text-slate-500">
            {searchTerm 
              ? "Tente ajustar a sua pesquisa para encontrar o que procura."
              : "Não existem notificações nesta categoria."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
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

      <ScrollArea className="max-h-[70vh]">
        <AnimatePresence>
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
        </AnimatePresence>
      </ScrollArea>
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
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group flex cursor-pointer gap-3 border-l-4 bg-white p-4 hover:bg-slate-50",
        isSelected ? "border-l-azul/80 bg-azul/5" : getCardBorderColor(notificacao.urgencia, isRead),
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
        "flex h-10 w-10 flex-none items-center justify-center rounded-full",
        getIconBgColor(notificacao.urgencia, true)
      )}>
        {getIconByType(notificacao.entidade)}
      </div>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <h4 className={cn(
            "text-base",
            isRead ? "font-medium text-slate-700" : "font-semibold text-slate-900"
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
            {getRelativeTime(notificacao.dataEmissao)}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            className="invisible h-8 w-8 p-0 group-hover:visible"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate();
            }}
          >
            <ExternalLink className="h-4 w-4" />
            <span className="sr-only">Ver detalhes</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
