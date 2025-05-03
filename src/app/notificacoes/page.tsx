"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Calendar,
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type ColumnDef, type RowSelectionState } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { BadgeEstado } from "@/components/common/BadgeEstado";
import { StatsGrid } from "@/components/common/StatsGrid";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { StatItem } from "@/components/common/StatsGrid";
import { TabelaDados } from "@/components/common/TabelaDados";
import type { FilterOption } from "@/components/common/TabelaDados";
import { useNotificacoes } from "@/components/providers/NotificacoesProvider";
import type { EntidadeNotificacao, UrgenciaNotificacao, EstadoNotificacao } from "@prisma/client";

// Labels para os tipos de notificação
const TIPO_LABELS: Record<EntidadeNotificacao, string> = {
  ENTREGAVEL: "Entregável",
  PROJETO: "Projeto",
  WORKPACKAGE: "Workpackage",
  ALOCACAO: "Alocação",
  TAREFA: "Tarefa",
  SISTEMA: "Sistema",
};

// Labels para os níveis de urgência
const URGENCIA_LABELS: Record<UrgenciaNotificacao, string> = {
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

// Funções Auxiliares
function isNotificacaoLida(estado: EstadoNotificacao): boolean {
  return estado === "LIDA" || estado === "ARQUIVADA";
}

function getTipoBadgeStatus(tipo: EntidadeNotificacao): string {
  return tipo;
}

function getUrgenciaBadgeStatus(urgencia: UrgenciaNotificacao): string {
  switch (urgencia) {
    case "ALTA":
      return "URGENTE";
    case "MEDIA":
      return "IMPORTANTE";
    case "BAIXA":
      return "NORMAL";
    default:
      return "NORMAL";
  }
}

function getIconByType(tipo: EntidadeNotificacao) {
  switch (tipo) {
    case "ENTREGAVEL":
      return <File className="h-4 w-4" />;
    case "PROJETO":
      return <Briefcase className="h-4 w-4" />;
    case "WORKPACKAGE":
      return <ListChecks className="h-4 w-4" />;
    case "ALOCACAO":
      return <Users className="h-4 w-4" />;
    case "TAREFA":
      return <CheckCircle2 className="h-4 w-4" />;
    case "SISTEMA":
      return <CheckCircle2 className="h-4 w-4" />;
  }
}

function getIconBgColor(urgencia: UrgenciaNotificacao): string {
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

type TipoFilter = "todos" | "PROJETO" | "WORKPACKAGE" | "ENTREGAVEL" | "TAREFA" | "ALOCACAO" | "SISTEMA";
type UrgenciaFilter = "todos" | "ALTA" | "MEDIA" | "BAIXA";

// Página principal de notificações
export default function Notificacoes() {
  const router = useRouter();
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [urgenciaFilter, setUrgenciaFilter] = useState("todos");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const { notificacoes, marcarComoLida, arquivar, naoLidas } = useNotificacoes();

  // Filtrar as notificações com base nos filtros selecionados
  const filteredNotificacoes = useMemo(() => {
    return notificacoes.filter((notificacao) => {
      const tipoMatch = tipoFilter === "todos" || notificacao.entidade === tipoFilter;
      const urgenciaMatch = urgenciaFilter === "todos" || notificacao.urgencia === urgenciaFilter;
      return tipoMatch && urgenciaMatch;
    });
  }, [notificacoes, tipoFilter, urgenciaFilter]);

  // Manipulador para clique em uma notificação (navegação)
  const handleRowClick = useCallback(async (notificacao: typeof notificacoes[number]) => {
    if (notificacao.estado === "NAO_LIDA") {
      await marcarComoLida(notificacao.id);
    }

    // Redirecionar para a entidade relacionada
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

  // Ação: Marcar selecionadas como lidas
  const handleMarcarComoLida = async () => {
    const indicesSelecionados = Object.keys(rowSelection).map(Number);
    const notificacoesSelecionadasIds = filteredNotificacoes
      .filter((_, index) => indicesSelecionados.includes(index))
      .map((n) => n.id);

    for (const id of notificacoesSelecionadasIds) {
      await marcarComoLida(id);
    }

    setRowSelection({});
  };

  // Ação: Arquivar selecionadas
  const handleArquivarSelecionadas = async () => {
    const indicesSelecionados = Object.keys(rowSelection).map(Number);
    const notificacoesSelecionadasIds = filteredNotificacoes
      .filter((_, index) => indicesSelecionados.includes(index))
      .map((n) => n.id);

    for (const id of notificacoesSelecionadasIds) {
      await arquivar(id);
    }

    setRowSelection({});
  };

  // Definição das colunas da tabela
  const columns = useMemo<ColumnDef<typeof notificacoes[number]>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
              className="translate-y-[2px] border-slate-300 data-[state=checked]:border-azul data-[state=checked]:bg-azul"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
              className="translate-y-[2px] border-slate-300 data-[state=checked]:border-azul data-[state=checked]:bg-azul"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "titulo",
        header: "Notificação",
        cell: ({ row }) => {
          const notificacao = row.original;
          const icone = getIconByType(notificacao.entidade);
          const lida = isNotificacaoLida(notificacao.estado);

          return (
            <div className="flex items-start gap-3">
              <div
                className={cn(`mt-0.5 rounded-full p-1.5`, getIconBgColor(notificacao.urgencia))}
              >
                {icone}
              </div>
              <div>
                <p
                  className={cn(
                    "text-gray-900",
                    !lida ? "font-bold" : "font-medium",
                    row.getIsSelected() && "text-azul"
                  )}
                >
                  {notificacao.titulo}
                </p>
                <p className="text-sm text-gray-500">{notificacao.descricao}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "entidade",
        header: "Tipo",
        cell: ({ row }) => {
          const tipo = row.original.entidade;
          return (
            <BadgeEstado
              status={getTipoBadgeStatus(tipo)}
              label={TIPO_LABELS[tipo]}
              variant="notificacao"
              customClassName={cn(
                tipo === "ENTREGAVEL" && "border-blue-200 bg-blue-50/70 text-blue-600",
                tipo === "PROJETO" && "border-purple-200 bg-purple-50/70 text-purple-600",
                tipo === "WORKPACKAGE" && "border-green-200 bg-green-50/70 text-green-600",
                tipo === "ALOCACAO" && "border-amber-200 bg-amber-50/70 text-amber-600",
                tipo === "TAREFA" && "border-cyan-200 bg-cyan-50/70 text-cyan-600",
                tipo === "SISTEMA" && "border-slate-200 bg-slate-50/70 text-slate-600"
              )}
            />
          );
        },
      },
      {
        accessorKey: "urgencia",
        header: "Urgência",
        cell: ({ row }) => {
          const urgencia = row.original.urgencia;
          return (
            <BadgeEstado
              status={getUrgenciaBadgeStatus(urgencia)}
              label={URGENCIA_LABELS[urgencia]}
              variant="notificacao"
              customClassName={cn(
                urgencia === "ALTA" && "border-red-200 bg-red-50/70 text-red-600 font-semibold",
                urgencia === "MEDIA" && "border-amber-200 bg-amber-50/70 text-amber-600",
                urgencia === "BAIXA" && "border-gray-200 bg-gray-50/70 text-gray-600"
              )}
            />
          );
        },
      },
      {
        accessorKey: "dataEmissao",
        header: "Data",
        cell: ({ getValue }) => {
          const date = getValue<Date>();
          return (
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>{format(new Date(date), "dd MMM yyyy, HH:mm", { locale: ptBR })}</span>
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          return (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                void handleRowClick(row.original);
              }}
              title="Ver detalhes"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          );
        },
      },
    ],
    [handleRowClick]
  );

  // Estatísticas das notificações
  const stats = useMemo<StatItem[]>(() => {
    const totalNotificacoes = notificacoes.length;
    const notificacoesAlta = notificacoes.filter((n) => n.urgencia === "ALTA").length;
    const notificacoesHoje = notificacoes.filter((n) => {
      const dataNotificacao = new Date(n.dataEmissao);
      const hoje = new Date();
      return (
        dataNotificacao.getDate() === hoje.getDate() &&
        dataNotificacao.getMonth() === hoje.getMonth() &&
        dataNotificacao.getFullYear() === hoje.getFullYear()
      );
    }).length;

    return [
      {
        icon: Clock,
        label: "Total de Notificações",
        value: totalNotificacoes,
        iconClassName: "text-blue-600",
        iconContainerClassName: "bg-blue-50/80",
      },
      {
        icon: AlertTriangle,
        label: "Alta Urgência",
        value: notificacoesAlta,
        iconClassName: "text-red-600",
        iconContainerClassName: "bg-red-50/80",
        badgeText: "Requerem atenção imediata",
        badgeClassName: "text-red-600 bg-red-50/80 hover:bg-red-100/80 border-red-100",
      },
      {
        icon: Clock,
        label: "Notificações Não Lidas",
        value: naoLidas,
        iconClassName: "text-amber-600",
        iconContainerClassName: "bg-amber-50/80",
        badgeText: `${Math.round((naoLidas / (totalNotificacoes || 1)) * 100)}% não lidas`,
        badgeClassName: "text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 border-amber-100",
      },
      {
        icon: Calendar,
        label: "Notificações de Hoje",
        value: notificacoesHoje,
        iconClassName: "text-green-600",
        iconContainerClassName: "bg-green-50/80",
        badgeText: "Novas hoje",
        badgeClassName: "text-green-600 bg-green-50/80 hover:bg-green-100/80 border-green-100",
      },
    ];
  }, [notificacoes, naoLidas]);

  // Opções para filtro de tipo
  const tipoOptions: FilterOption[] = [
    { id: "todos", label: "Todos os tipos", value: "todos" },
    ...Object.entries(TIPO_LABELS).map(([value, label]) => ({ id: value, label, value })),
  ];

  // Opções para filtro de urgência
  const urgenciaOptions: FilterOption[] = [
    { id: "todos", label: "Todas as urgências", value: "todos" },
    ...Object.entries(URGENCIA_LABELS).map(([value, label]) => ({ id: value, label, value })),
  ];

  // Configuração dos filtros
  const filterConfig = [
    {
      id: "tipo",
      label: "Tipo",
      value: tipoFilter,
      onChange: (value: string) => setTipoFilter(value),
      options: tipoOptions,
    },
    {
      id: "urgencia",
      label: "Urgência",
      value: urgenciaFilter,
      onChange: (value: string) => setUrgenciaFilter(value),
      options: urgenciaOptions,
    },
  ];

  const numSelected = Object.keys(rowSelection).length;

  return (
    <div className="h-auto bg-[#F7F9FC] p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Notificações</h1>
            <p className="text-sm text-slate-500">Acompanhe alertas, prazos e tarefas pendentes</p>
          </div>
        </div>

        <StatsGrid stats={stats} />

        <div className="rounded-2xl border border-white/20 bg-white/80 shadow-xl backdrop-blur-sm transition-all duration-200">
          {/* Barra de Ações Condicional */}
          <div
            className={cn(
              "flex items-center gap-4 border-b border-slate-100 p-3 transition-all duration-300",
              numSelected > 0 ? "bg-slate-50/80" : "hidden"
            )}
          >
            <span className="flex-grow text-sm font-medium text-slate-600">
              {numSelected} notificação {numSelected > 1 ? "selecionadas" : "selecionada"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleMarcarComoLida()}
              disabled={numSelected === 0}
              className="border-azul/30 bg-white text-azul hover:bg-azul/10 hover:text-azul/90"
            >
              <Check className="mr-2 h-4 w-4" />
              Marcar como lida
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleArquivarSelecionadas()}
              disabled={numSelected === 0}
              className="border-red-300 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Arquivar
            </Button>
          </div>

          <TabelaDados<typeof notificacoes[number]>
            data={filteredNotificacoes}
            columns={columns}
            isLoading={false}
            searchPlaceholder="Procurar nas notificações..."
            filterConfigs={filterConfig}
            onRowClick={handleRowClick}
            emptyStateMessage={{
              title: "Nenhuma notificação encontrada",
              description: "Experimente ajustar os filtros ou remover o texto na pesquisa.",
            }}
            rowSelection={rowSelection}
            setRowSelection={setRowSelection}
            getRowId={(row) => row.id}
          />
        </div>
      </div>
    </div>
  );
}
