"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Briefcase, Clock, CheckCircle2, AlertCircle, TrendingUp, Calendar } from "lucide-react";
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
import { usePermissions } from "@/hooks/usePermissions";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

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
  const { data: session } = useSession();
  // These variables are kept for future enhancements
  // const { isComum } = usePermissions();
  // const userId = (session?.user as any)?.id;
  const [estadoFilter, setEstadoFilter] = useState<"todos" | (typeof uniqueEstados)[number]>(
    "todos"
  );
  const [prazoFilter, setPrazoFilter] = useState<PrazoFilter>("todos");
  const queryClient = useQueryClient();

  // Parâmetros para consulta de projetos
  const queryParams = useMemo(
    () => ({
      page: 1,
      limit: 100,
    }),
    []
  );

  // Consulta projetos (que já incluem os rascunhos na resposta)
  const { data: projetosData, isLoading } = api.projeto.findAll.useQuery(queryParams, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Função para invalidar as queries
  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getQueryKey(api.projeto.findAll, queryParams, "query") });
  }, [queryClient, queryParams]);

  // Efeito para invalidar as queries quando a página monta
  useEffect(() => {
    invalidateQueries();
  }, [invalidateQueries]);

  // Extrair todos os itens dos dados (projetos e rascunhos)
  const allItems = useMemo(() => {
    if (!projetosData?.data?.items) return [];
    
    const items = projetosData.data.items || [];
    
    console.log("--- Dados recebidos ---");
    console.log("Total de itens:", items.length);
    console.log("Projetos e rascunhos recebidos:", items);
    
    // Os itens já vêm ordenados por nome do backend, mas podemos garantir isso aqui
    return items;
  }, [projetosData]);

  const stats = useMemo<StatItem[]>(() => {
    const totalProjetos = allItems.length;
    const projetosAtivos = allItems.filter(
      (p: Projeto) => p.estado === "EM_DESENVOLVIMENTO"
    ).length;
    const projetosConcluidos = allItems.filter((p: Projeto) => p.estado === "CONCLUIDO").length;
    const projetosAtrasados = allItems.filter((p: Projeto) => {
      if (!p.fim) return false;
      return new Date(p.fim) < new Date() && p.estado !== "CONCLUIDO";
    }).length;

    return [
      {
        icon: Briefcase,
        label: "Total de Projetos",
        value: totalProjetos,
        iconClassName: "text-blue-600",
        iconContainerClassName: "bg-blue-50/80",
        badgeText: "3 novos projetos este mês",
        badgeIcon: TrendingUp,
        badgeClassName: "text-blue-600 bg-blue-50/80 hover:bg-blue-100/80 border-blue-100",
      },
      {
        icon: CheckCircle2,
        label: "Concluídos",
        value: projetosConcluidos,
        iconClassName: "text-green-600",
        iconContainerClassName: "bg-green-50/80",
        badgeText: `${Math.round((projetosConcluidos / Math.max(totalProjetos, 1)) * 100)}% do total`,
        badgeClassName: "text-green-600 bg-green-50/80 hover:bg-green-100/80 border-green-100",
      },
      {
        icon: Clock,
        label: "Em Desenvolvimento",
        value: projetosAtivos,
        iconClassName: "text-amber-600",
        iconContainerClassName: "bg-amber-50/80",
        badgeText: `${Math.round((projetosAtivos / Math.max(totalProjetos, 1)) * 100)}% ativos`,
        badgeClassName: "text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 border-amber-100",
      },
      {
        icon: AlertCircle,
        label: "Atrasados",
        value: projetosAtrasados,
        iconClassName: "text-red-600",
        iconContainerClassName: "bg-red-50/80",
        badgeText: "Requer atenção imediata",
        badgeClassName: "text-red-600 bg-red-50/80 hover:bg-red-100/80 border-red-100",
      },
    ];
  }, [allItems]);

  const handleRowClick = useCallback(
    (projeto: Projeto) => {
      // Se for um rascunho, redirecionar para a página de edição de rascunho
      if (projeto.isRascunho) {
        router.push(`/projetos/criar?rascunhoId=${projeto.id}`);
        return;
      }
      
      // Se for um projeto normal, redirecionar para a página de detalhes
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
            label={row.original.isRascunho ? "Rascunho" : ESTADO_LABELS[getValue<ProjetoEstado>()] || ""}
            variant="projeto"
          />
        ),
      },
      {
        accessorKey: "progresso",
        header: "Progresso Temporal",
        cell: ({ row, getValue }) => (
          <div className="w-full max-w-[200px]">
            <BarraProgresso value={row.original.isRascunho ? 0 : Math.round((getValue<number>() || 0) * 100)} />
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
    ],
    []
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
    console.log("--- Filtragem iniciada ---");
    console.log("Itens antes de filtrar:", result.length);

    // Filtro por estado
    if (estadoFilter !== "todos") {
      result = result.filter((project: Projeto) => {
        if (project.isRascunho) return estadoFilter === "RASCUNHO";
        return project.estado === estadoFilter;
      });
      console.log(`Itens após filtro ESTADO (${estadoFilter}):`, result.length);
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
      console.log(`Itens após filtro PRAZO (${prazoFilter}):`, result.length);
    }
    console.log("Itens finais (filteredProjects):", result.length);

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

        <div className="rounded-xl border border-gray-100 bg-white shadow-md transition-all duration-200 hover:shadow-lg">
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
          />
        </div>
      </div>
    </div>
  );
}
