"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Briefcase, Clock, CheckCircle2, AlertCircle, TrendingUp, Calendar, Trash2} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/trpc/react";
import { NovoProjeto } from "@/components/projetos/NovoProjeto";
import { TabelaDados } from "@/components/common/TabelaDados";
import type { FilterOption } from "@/components/common/TabelaDados";
import { BadgeEstado } from "@/components/common/BadgeEstado";
import { BarraProgresso } from "@/components/common/BarraProgresso";
import { StatsGrid } from "@/components/common/StatsGrid";
import type { StatItem } from "@/components/common/StatsGrid";
import { type ProjetoEstado } from "@prisma/client";
import { type ColumnDef } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Interface básica para o projeto
interface Projeto {
  id: string;
  nome: string;
  descricao?: string | null;
  inicio?: string | Date | null;
  fim?: string | Date | null;
  estado: ProjetoEstado;
  progresso: number;
  workpackages?: Array<any>;
  isRascunho?: boolean;
  updatedAt?: Date;
}

const ESTADO_LABELS: Record<string, string> = {
  APROVADO: "Aprovado",
  PENDENTE: "Pendente",
  RASCUNHO: "Rascunho",
  EM_DESENVOLVIMENTO: "Em Desenvolvimento",
  CONCLUIDO: "Concluído",
} as const;

const uniqueEstados = [
  "APROVADO",
  "PENDENTE",
  "RASCUNHO",
  "EM_DESENVOLVIMENTO",
  "CONCLUIDO",
] as const;

type PrazoFilter = "todos" | "este_mes" | "proximo_mes" | "este_ano" | "atrasados";

export default function Projetos() {
  const router = useRouter();
  const utils = api.useUtils();
  const {
    /* data: session */
  } = useSession();
  const [estadoFilter, setEstadoFilter] = useState<"todos" | (typeof uniqueEstados)[number]>(
    "todos"
  );
  const [prazoFilter, setPrazoFilter] = useState<PrazoFilter>("todos");

  // Parâmetros para consulta de projetos
  const queryParams = useMemo(
    () => ({
      page: 1,
      limit: 100,
    }),
    []
  );

  // Prefetch na montagem do componente
  useEffect(() => {
    void utils.projeto.findAll.prefetch(queryParams);
  }, [utils, queryParams]);

  // Consulta projetos (que já incluem os rascunhos na resposta)
  const { data: projetosData, isLoading } = api.projeto.core.findAll.useQuery(queryParams, {
    refetchOnWindowFocus: true,
    staleTime: 60 * 1000, // 60 segundos
  });

  // Buscar estatísticas dos projetos
  const { data: statsData } = api.projeto.estatisticas.getProjetosStats.useQuery(undefined, {
    refetchOnWindowFocus: true,
    staleTime: 60 * 1000, // 60 segundos
  });

  // Efeito para invalidar as queries quando a página monta
  useEffect(() => {
    void utils.projeto.findAll.invalidate();
    void utils.projeto.getProjetosStats.invalidate();
  }, [utils]);

  // Mutation para apagar projeto
  const deleteProjetoMutation = api.projeto.core.delete.useMutation({
    onSuccess: () => {
      toast.success("Projeto apagado com sucesso");
      void utils.projeto.findAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao apagar projeto: ${error.message}`);
    },
  });

  const deleteProjeto = useCallback((id: string) => {
    deleteProjetoMutation.mutate(id);
  }, [deleteProjetoMutation]);

  // Extrair todos os itens dos dados (projetos e rascunhos)
  const allItems = useMemo(() => {
    if (!projetosData?.data?.items) return [];

    const items = projetosData.data.items || [];

    // Os itens já vêm ordenados por nome do backend, mas podemos garantir isso aqui
    return items;
  }, [projetosData]);

  const stats = useMemo<StatItem[]>(() => {
    return [
      {
        icon: Briefcase,
        label: "Total de Projetos",
        value: statsData?.total ?? 0,
        iconClassName: "text-blue-600",
        iconContainerClassName: "bg-blue-50/80",
        badgeText: "Projetos ativos",
        badgeIcon: TrendingUp,
        badgeClassName: "text-blue-600 bg-blue-50/80 hover:bg-blue-100/80 border-blue-100",
      },
      {
        icon: CheckCircle2,
        label: "Concluídos",
        value: statsData?.concluidos ?? 0,
        iconClassName: "text-green-600",
        iconContainerClassName: "bg-green-50/80",
        badgeText: `${Math.round(((statsData?.concluidos ?? 0) / Math.max(statsData?.total ?? 1, 1)) * 100)}% do total`,
        badgeClassName: "text-green-600 bg-green-50/80 hover:bg-green-100/80 border-green-100",
      },
      {
        icon: Clock,
        label: "Em Desenvolvimento",
        value: statsData?.emDesenvolvimento ?? 0,
        iconClassName: "text-amber-600",
        iconContainerClassName: "bg-amber-50/80",
        badgeText: `${Math.round(((statsData?.emDesenvolvimento ?? 0) / Math.max(statsData?.total ?? 1, 1)) * 100)}% ativos`,
        badgeClassName: "text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 border-amber-100",
      },
      {
        icon: AlertCircle,
        label: "Atrasados",
        value: statsData?.atrasados ?? 0,
        iconClassName: "text-red-600",
        iconContainerClassName: "bg-red-50/80",
        badgeText: "Requer atenção imediata",
        badgeClassName: "text-red-600 bg-red-50/80 hover:bg-red-100/80 border-red-100",
      },
    ];
  }, [statsData]);

  const handleRowClick = useCallback(
    (projeto: Projeto) => {
      // Se for um rascunho, envia para a página de edição de rascunho
      if (projeto.isRascunho) {
        router.push(`/projetos/criar?rascunhoId=${projeto.id}`);
        return;
      }

      // Se for um projeto normal, envia para a página de detalhes
      router.push(`/projetos/${projeto.id}`);
    },
    [router]
  );

  // Definição das colunas usando TanStack Table
  const columns = useMemo<ColumnDef<Projeto>[]>(
    () => [
      {
        accessorKey: "nome",
        header: "Projeto",
        cell: ({ row, getValue }) => (
          <span className="font-normal text-slate-800 transition-colors duration-300 ease-in-out group-hover:text-azul">
            {getValue<string>()}
            {row.original.isRascunho && (
              <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-800">
                Rascunho
              </span>
            )}
          </span>
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row, getValue }) => (
          <BadgeEstado
            status={row.original.isRascunho ? "RASCUNHO" : getValue<ProjetoEstado>()}
            label={
              row.original.isRascunho ? "Rascunho" : ESTADO_LABELS[getValue<ProjetoEstado>()] || ""
            }
            variant="projeto"
          />
        ),
      },
      {
        accessorKey: "progresso",
        header: "Progresso de execução",
        cell: ({ row, getValue }) => (
          <div className="w-full max-w-[200px]">
            <BarraProgresso
              value={row.original.isRascunho ? 0 : Math.round((getValue<number>() || 0) * 100)}
            />
          </div>
        ),
      },
      {
        accessorKey: "fim",
        header: "Prazo",
        cell: ({ row, getValue }) => {
          if (row.original.isRascunho) {
            return (
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>Indefinido</span>
              </div>
            );
          }

          const date = getValue<string | Date | null>();
          return (
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>{date ? format(new Date(date), "dd MMM yyyy", { locale: ptBR }) : "N/A"}</span>
            </div>
          );
        },
      },
      {
        id: "actions",
        meta: { align: "center", isAction: true },
        header: () => (
          <div className="flex items-center justify-center w-full h-full">
            AÇÕES
          </div>
        ),
        cell: ({ row }) => {
          const projeto = row.original;
          
          const getMensagemConfirmacao = (estado: string) => {
            switch (estado) {
              case "APROVADO":
                return "Este projeto está aprovado. Apagar este projeto pode ter consequências graves.";
              case "EM_DESENVOLVIMENTO":
                return "Este projeto está em desenvolvimento. Apagar este projeto pode ter consequências graves.";
              case "CONCLUIDO":
                return "Este projeto está concluído. Tem a certeza que pretende apagá-lo?";
              default:
                return "Tem a certeza que pretende apagar este projeto?";
            }
          };

          return (
            <div className="flex items-center justify-center w-full h-full" onClick={(e) => e.stopPropagation()}>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-600 flex items-center justify-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apagar Projeto</AlertDialogTitle>
                    <AlertDialogDescription>
                      {getMensagemConfirmacao(projeto.estado)}
                      <br />
                      <span className="mt-2 block font-medium">Esta ação não pode ser revertida.</span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => projeto.id && deleteProjeto(projeto.id)}
                    >
                      Apagar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        },
      },
    ],
    [deleteProjeto]
  );

  const filterOptions = useMemo<FilterOption[]>(
    () => [
      { id: "todos", label: "Todos os estados", value: "todos" },
      ...uniqueEstados.map((estado) => ({
        id: estado,
        label: ESTADO_LABELS[estado] || "",
        value: estado,
        badge: {
          status: estado,
          variant: "projeto",
        },
      })),
    ],
    []
  );

  const prazoOptions = useMemo<FilterOption[]>(
    () => [
      { id: "todos", label: "Todos os prazos", value: "todos" },
      {
        id: "este_mes",
        label: "Este mês",
        value: "este_mes",
        badge: {
          status: "ESTE_MES",
          variant: "prazo",
        },
      },
      {
        id: "proximo_mes",
        label: "Próximo mês",
        value: "proximo_mes",
        badge: {
          status: "PROXIMO_MES",
          variant: "prazo",
        },
      },
      {
        id: "este_ano",
        label: "Este ano",
        value: "este_ano",
        badge: {
          status: "ESTE_ANO",
          variant: "prazo",
        },
      },
      {
        id: "atrasados",
        label: "Atrasados",
        value: "atrasados",
        badge: {
          status: "ATRASADO",
          variant: "prazo",
        },
      },
    ],
    []
  );

  const filterConfigs = useMemo(
    () => [
      {
        id: "estado",
        label: "Estado",
        value: estadoFilter,
        onChange: (value: string) =>
          setEstadoFilter(value as "todos" | (typeof uniqueEstados)[number]),
        options: filterOptions,
      },
      {
        id: "prazo",
        label: "Prazo",
        value: prazoFilter,
        onChange: (value: string) => setPrazoFilter(value as PrazoFilter),
        options: prazoOptions,
      },
    ],
    [estadoFilter, prazoFilter, filterOptions, prazoOptions]
  );

  const filteredProjects = useMemo(() => {
    if (!allItems.length) return [];

    let result = [...allItems];

    // Filtro por estado
    if (estadoFilter !== "todos") {
      result = result.filter((project: Projeto) => {
        if (project.isRascunho) return estadoFilter === "RASCUNHO";
        return project.estado === estadoFilter;
      });
    
    }

    // Filtro por prazo - sempre incluir rascunhos
    if (prazoFilter !== "todos") {
      result = result.filter((project: Projeto) => {
        if (project.isRascunho) return true;
        if (!project.fim) return false;

        const dataFim = new Date(project.fim);
        const hoje = new Date();
        const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        const ultimoDiaProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);
        const ultimoDiaAno = new Date(hoje.getFullYear(), 11, 31);

        switch (prazoFilter) {
          case "este_mes":
            return dataFim <= ultimoDiaMes && dataFim >= hoje;
          case "proximo_mes":
            return dataFim > ultimoDiaMes && dataFim <= ultimoDiaProximoMes;
          case "este_ano":
            return dataFim <= ultimoDiaAno && dataFim >= hoje;
          case "atrasados":
            return dataFim < hoje && project.estado !== "CONCLUIDO";
          default:
            return true;
        }
      });
 
    }


    return result;
  }, [allItems, estadoFilter, prazoFilter]);

  return (
    <div className="h-auto bg-[#F7F9FC] p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Projetos</h1>
            <p className="text-sm text-slate-500">
              Consulte os seus projetos e acompanhe o progresso
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <NovoProjeto />
          </div>
        </div>

        <StatsGrid stats={stats} />

        <div className="rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow">
          <TabelaDados<Projeto>
            title=""
            subtitle=""
            data={filteredProjects}
            isLoading={isLoading}
            columns={columns}
            searchPlaceholder="Pesquisar projetos..."
            filterConfigs={filterConfigs}
            onRowClick={handleRowClick}
            emptyStateMessage={{
              title: "Nenhum projeto encontrado",
              description:
                "Experimente ajustar os filtros de pesquisa ou remover o texto na pesquisa.",
            }}
            hideActionForPermissions
          />
        </div>
      </div>
    </div>
  );
}
