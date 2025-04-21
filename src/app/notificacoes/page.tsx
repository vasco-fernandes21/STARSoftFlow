"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Bell,
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
import { format, addDays, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type ColumnDef, type RowSelectionState } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { BadgeEstado } from "@/components/common/BadgeEstado";
import { StatsGrid } from "@/components/common/StatsGrid";
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import type { StatItem } from '@/components/common/StatsGrid';
import { TabelaDados } from '@/components/common/TabelaDados';
import type { FilterOption } from '@/components/common/TabelaDados';



// Tipos de Notificação
type TipoNotificacao = "ENTREGAVEL" | "PROJETO" | "WORKPACKAGE" | "ALOCACAO" | "TAREFA";

// Níveis de Urgência
type NivelUrgencia = "ALTA" | "MEDIA" | "BAIXA";

// Estados de Notificação
type EstadoNotificacao = "PENDENTE" | "VISUALIZADA";

// Labels para os tipos de notificação
const TIPO_LABELS: Record<TipoNotificacao, string> = {
  ENTREGAVEL: "Entregável",
  PROJETO: "Projeto",
  WORKPACKAGE: "Workpackage",
  ALOCACAO: "Alocação",
  TAREFA: "Tarefa",
};

// Labels para os níveis de urgência
const URGENCIA_LABELS: Record<NivelUrgencia, string> = {
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

// Interface para notificações
interface Notificacao {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TipoNotificacao;
  urgencia: NivelUrgencia;
  estado: EstadoNotificacao;
  data: Date;
  prazo?: Date | null;
  entidadeId: string;
  entidadeTipo: string;
  criador?: string;
}

// Mock Data para notificações
const hoje = new Date();

const mockNotificacoesData: Notificacao[] = [
  {
    id: "not_1",
    titulo: "Entregável E1 do Projeto CRM está quase no prazo", 
    descricao: "O entregável 'Documento de Requisitos' está a 2 dias do prazo de entrega",
    tipo: "ENTREGAVEL",
    urgencia: "ALTA",
    estado: "PENDENTE",
    data: addHours(hoje, -5),
    prazo: addDays(hoje, 2),
    entidadeId: "ent_1",
    entidadeTipo: "entregavel",
    criador: "Sistema",
  },
  {
    id: "not_2",
    titulo: "Projeto Mobile App a aguardar aprovação",
    descricao: "O projeto foi submetido e está a aguardar aprovação do administrador",
    tipo: "PROJETO",
    urgencia: "MEDIA",
    estado: "PENDENTE",
    data: addDays(hoje, -1),
    prazo: addDays(hoje, 5),
    entidadeId: "proj_1",
    entidadeTipo: "projeto",
    criador: "Manuel Silva",
  },
  {
    id: "not_3",
    titulo: "Workpackage 'Desenvolvimento Frontend' com baixa alocação",
    descricao: "O workpackage tem menos de 50% de recursos alocados para o próximo mês",
    tipo: "WORKPACKAGE",
    urgencia: "MEDIA",
    estado: "VISUALIZADA",
    data: addDays(hoje, -3),
    prazo: addDays(hoje, 10),
    entidadeId: "wp_1",
    entidadeTipo: "workpackage",
    criador: "Sistema",
  },
  {
    id: "not_4",
    titulo: "Alocação conflitante para João Costa",
    descricao: "O recurso está alocado acima de 100% para o mês de Agosto",
    tipo: "ALOCACAO",
    urgencia: "ALTA",
    estado: "PENDENTE",
    data: addHours(hoje, -12),
    prazo: addDays(hoje, 1),
    entidadeId: "user_1",
    entidadeTipo: "utilizador",
    criador: "Sistema",
  },
  {
    id: "not_5",
    titulo: "Tarefa 'Implementação da API' atrasada",
    descricao: "A tarefa deveria ter sido concluída há 2 dias",
    tipo: "TAREFA",
    urgencia: "ALTA",
    estado: "PENDENTE",
    data: addDays(hoje, -2),
    prazo: addDays(hoje, -2),
    entidadeId: "task_1",
    entidadeTipo: "tarefa",
    criador: "Pedro Alves",
  },
  {
    id: "not_7",
    titulo: "Entregável 'Plano de Testes' próximo do prazo",
    descricao: "O entregável está a 3 dias do prazo de entrega e ainda não foi iniciado",
    tipo: "ENTREGAVEL",
    urgencia: "ALTA",
    estado: "PENDENTE",
    data: addDays(hoje, -1),
    prazo: addDays(hoje, 3),
    entidadeId: "ent_2",
    entidadeTipo: "entregavel",
    criador: "Sistema",
  },
  {
    id: "not_8",
    titulo: "Workpackage 'Infraestrutura Cloud' finalizado",
    descricao: "Todas as tarefas foram concluídas e entregáveis validados",
    tipo: "WORKPACKAGE",
    urgencia: "BAIXA",
    estado: "VISUALIZADA",
    data: addDays(hoje, -2),
    prazo: null,
    entidadeId: "wp_2",
    entidadeTipo: "workpackage",
    criador: "Ricardo Ferreira",
  },
  {
    id: "not_9",
    titulo: "Novo projeto criado: Sistema CRM",
    descricao: "Um novo projeto foi criado e aguarda aprovação",
    tipo: "PROJETO",
    urgencia: "MEDIA",
    estado: "VISUALIZADA",
    data: addDays(hoje, -1),
    prazo: addDays(hoje, 5),
    entidadeId: "proj_3",
    entidadeTipo: "projeto",
    criador: "Carlos Mendes",
  },
  {
    id: "not_10",
    titulo: "Tarefa 'Migração de Base de Dados' concluída",
    descricao: "A tarefa foi marcada como concluída e aguarda validação",
    tipo: "TAREFA",
    urgencia: "BAIXA",
    estado: "VISUALIZADA",
    data: addHours(hoje, -36),
    prazo: null,
    entidadeId: "task_2",
    entidadeTipo: "tarefa",
    criador: "Maria Costa",
  },
];

// Funções Auxiliares (fora do componente para clareza)
function isNotificacaoLida(estado: EstadoNotificacao): boolean {
  return estado === "VISUALIZADA";
}

function getTipoBadgeStatus(tipo: TipoNotificacao): string {
  return tipo; // Usar o próprio tipo como status para BadgeEstado
}

function getUrgenciaBadgeStatus(urgencia: NivelUrgencia): string {
  switch (urgencia) {
    case "ALTA":
      return "URGENTE";
    case "MEDIA":
      return "IMPORTANTE";
    case "BAIXA":
      return "NORMAL"; // Usar um status genérico
    default:
      return "NORMAL";
  }
}

function getIconByType(tipo: TipoNotificacao) {
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
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function getIconBgColor(urgencia: NivelUrgencia): string {
  switch (urgencia) {
    case "ALTA":
      return "bg-red-100 text-red-600";
    case "MEDIA":
      return "bg-amber-100 text-amber-600";
    case "BAIXA":
      return "bg-gray-100 text-gray-600"; // Cor neutra
    default:
      return "bg-slate-100 text-slate-600";
  }
}

// Página principal de notificações
export default function Notificacoes() {
  const router = useRouter();
  const [tipoFilter, setTipoFilter] = useState<"todos" | TipoNotificacao>("todos");
  const [urgenciaFilter, setUrgenciaFilter] = useState<"todos" | NivelUrgencia>("todos");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>(mockNotificacoesData);

  // Filtrar as notificações com base nos filtros selecionados
  const filteredNotificacoes = useMemo(() => {
    return notificacoes.filter((notificacao) => {
      const tipoMatch = tipoFilter === "todos" || notificacao.tipo === tipoFilter;
      const urgenciaMatch = urgenciaFilter === "todos" || notificacao.urgencia === urgenciaFilter;
      return tipoMatch && urgenciaMatch;
    });
  }, [notificacoes, tipoFilter, urgenciaFilter]);

  // Manipulador para clique em uma notificação (navegação)
  const handleRowClick = useCallback((notificacao: Notificacao) => {
    // Marcar como lida ao clicar (simulação)
    setNotificacoes((prev) =>
      prev.map((n) =>
        n.id === notificacao.id && n.estado === "PENDENTE" ? { ...n, estado: "VISUALIZADA" } : n
      )
    );

    // Redirecionar para a entidade relacionada
    const { entidadeTipo, entidadeId } = notificacao;
    let url = "/";
    switch (entidadeTipo) {
      case "projeto":
        url = `/projetos/${entidadeId}`;
        break;
      case "workpackage":
        url = `/projetos/${entidadeId}/workpackages`;
        break; // Ajustar URL
      case "utilizador":
        url = `/utilizadores/${entidadeId}`;
        break;
      case "tarefa":
        url = `/projetos/tarefas/${entidadeId}`;
        break; // Ajustar URL
      case "entregavel":
        url = `/projetos/entregaveis/${entidadeId}`;
        break; // Ajustar URL
      default:
        url = "/dashboard";
    }
    router.push(url);
  }, [router]);

  // Ação: Marcar selecionadas como lidas
  const handleMarcarComoLida = () => {
    const indicesSelecionados = Object.keys(rowSelection).map(Number);
    const notificacoesSelecionadasIds = filteredNotificacoes
      .filter((_, index) => indicesSelecionados.includes(index))
      .map((n) => n.id);

    setNotificacoes((prev) =>
      prev.map((n) =>
        notificacoesSelecionadasIds.includes(n.id) ? { ...n, estado: "VISUALIZADA" } : n
      )
    );
    setRowSelection({}); // Limpar seleção
  };

  // Ação: Apagar selecionadas
  const handleApagarSelecionadas = () => {
    const indicesSelecionados = Object.keys(rowSelection).map(Number);
    const notificacoesSelecionadasIds = filteredNotificacoes
      .filter((_, index) => indicesSelecionados.includes(index))
      .map((n) => n.id);

    setNotificacoes((prev) => prev.filter((n) => !notificacoesSelecionadasIds.includes(n.id)));
    setRowSelection({}); // Limpar seleção
  };

  // Definição das colunas da tabela
  const columns = useMemo<ColumnDef<Notificacao>[]>(
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
              onClick={(e) => e.stopPropagation()} // Evitar que o clique na checkbox acione o onRowClick
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
          const icone = getIconByType(notificacao.tipo);
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
                    !lida ? "font-bold" : "font-medium", // Negrito para não lidas
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
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => {
          const tipo = row.original.tipo;
          return (
            <BadgeEstado
              status={getTipoBadgeStatus(tipo)} // Usar o tipo como status
              label={TIPO_LABELS[tipo]}
              variant="notificacao" // Usar a variante de notificação
              customClassName={cn(
                tipo === "ENTREGAVEL" && "border-blue-200 bg-blue-50/70 text-blue-600",
                tipo === "PROJETO" && "border-purple-200 bg-purple-50/70 text-purple-600",
                tipo === "WORKPACKAGE" && "border-green-200 bg-green-50/70 text-green-600",
                tipo === "ALOCACAO" && "border-amber-200 bg-amber-50/70 text-amber-600",
                tipo === "TAREFA" && "border-cyan-200 bg-cyan-50/70 text-cyan-600"
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
              status={getUrgenciaBadgeStatus(urgencia)} // Mapear urgência para status de badge
              label={URGENCIA_LABELS[urgencia]}
              variant="notificacao" // Usar a variante de notificação
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
        accessorKey: "data",
        header: "Data",
        cell: ({ getValue }) => {
          const date = getValue<Date>();
          return (
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>{format(date, "dd MMM yyyy, HH:mm", { locale: ptBR })}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "prazo",
        header: "Prazo",
        cell: ({ getValue }) => {
          const date = getValue<Date | null>();
          if (!date) return <span className="text-slate-500">N/A</span>;

          const hoje = new Date();
          const diasRestantes = Math.ceil(
            (date.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
          );

          let statusClass = "text-slate-600";
          if (diasRestantes < 0) statusClass = "text-red-600 font-medium";
          else if (diasRestantes <= 2) statusClass = "text-amber-600 font-medium";

          return (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className={statusClass}>
                {diasRestantes < 0
                  ? `Atrasado há ${Math.abs(diasRestantes)} dias`
                  : diasRestantes === 0
                    ? "Hoje"
                    : `${diasRestantes} dias restantes`}
              </span>
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
                e.stopPropagation(); // Evitar acionar onRowClick da linha
                handleRowClick(row.original); // Navegar ao clicar no botão
              }}
              title="Ver detalhes"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          );
        },
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    [handleRowClick]
  ); // Remover rowSelection da dependência pois não é necessário

  // Estatísticas das notificações
  const getNaoLidasCount = useCallback(() => {
    return notificacoes.filter((n) => n.estado === "PENDENTE").length;
  }, [notificacoes]);

  const stats = useMemo<StatItem[]>(() => {
    const totalNotificacoes = notificacoes.length;
    const notificacoesAlta = notificacoes.filter((n) => n.urgencia === "ALTA").length;
    const notificacoesHoje = notificacoes.filter((n) => {
      const dataNotificacao = new Date(n.data);
      const hoje = new Date();
      return (
        dataNotificacao.getDate() === hoje.getDate() &&
        dataNotificacao.getMonth() === hoje.getMonth() &&
        dataNotificacao.getFullYear() === hoje.getFullYear()
      );
    }).length;

    return [
      {
        icon: Bell,
        label: "Total de Notificações",
        value: totalNotificacoes,
        iconClassName: "text\-blue-600",
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
        value: notificacoes.filter((n) => !isNotificacaoLida(n.estado)).length,
        iconClassName: "text-amber-600",
        iconContainerClassName: "bg-amber-50/80",
        badgeText: `${Math.round((getNaoLidasCount() / (notificacoes.length || 1)) * 100)}% não lidas`,
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
  }, [notificacoes, getNaoLidasCount]);

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
      onChange: (value: string) => setTipoFilter(value as "todos" | TipoNotificacao),
      options: tipoOptions,
    },
    {
      id: "urgencia",
      label: "Urgência",
      value: urgenciaFilter,
      onChange: (value: string) => setUrgenciaFilter(value as "todos" | NivelUrgencia),
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

        <div className="rounded-xl border border-gray-100 bg-white shadow-md transition-all duration-200 hover:shadow-lg">
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
              onClick={handleMarcarComoLida}
              disabled={numSelected === 0}
              className="border-azul/30 bg-white text-azul hover:bg-azul/10 hover:text-azul/90"
            >
              <Check className="mr-2 h-4 w-4" />
              Marcar como lida
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleApagarSelecionadas}
              disabled={numSelected === 0}
              className="border-red-300 bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Apagar
            </Button>
          </div>

          <TabelaDados<Notificacao>
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
            getRowId={(row: Notificacao) => row.id}
          />
        </div>
      </div>
    </div>
  );
}
