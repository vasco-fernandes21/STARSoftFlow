"use client";

import { useState, useMemo, useCallback } from "react";
import { Briefcase, Clock, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
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

const itemsPerPage = 6;

// Função melhorada para extrair projetos da resposta da API
const extrairProjetos = (apiResponse: any): Projeto[] => {
  if (!apiResponse) return [];
  
  // Caso 1: resposta direto do TanStack Query/tRPC
  if (apiResponse[0]?.result?.data?.json?.items) {
    return apiResponse[0].result.data.json.items;
  }
  
  // Caso 2: estrutura de objetos com items
  if (apiResponse.items && Array.isArray(apiResponse.items)) {
    return apiResponse.items;
  }
  
  // Caso 3: estrutura aninhada com json.items
  if (apiResponse.json?.items && Array.isArray(apiResponse.json.items)) {
    return apiResponse.json.items;
  }
  
  // Caso 4: resposta em json array
  if (apiResponse.json && Array.isArray(apiResponse.json)) {
    return apiResponse.json;
  }
  
  // Caso 5: resposta já é um array
  if (Array.isArray(apiResponse)) {
    return apiResponse;
  }
  
  console.log("Estrutura da resposta:", JSON.stringify(apiResponse, null, 2));
  return [];
};

export default function Projetos() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isComum } = usePermissions();
  const userId = (session?.user as any)?.id;
  const [estadoFilter, setEstadoFilter] =
    useState<"todos" | typeof uniqueEstados[number]>("todos");
  const [prazoFilter, setPrazoFilter] =
    useState<PrazoFilter>("todos");

  // Determina os parâmetros de consulta com base na permissão
  const queryParams = useMemo(() => ({
    page: 1,
    limit: 100,
    // Se for utilizador comum, filtra apenas pelos projetos dele
    userId: isComum ? userId : undefined,
    // Parâmetro que indica se deve filtrar por projetos alocados
    apenasAlocados: isComum
  }), [isComum, userId]);

  // Consulta com parâmetros baseados em permissão
  const { 
    data, 
    isLoading 
  } = api.projeto.findAll.useQuery(queryParams, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Usando a função de extração para obter projetos
  const projetos = useMemo(() => {
    return extrairProjetos(data);
  }, [data]);

  const stats = useMemo<StatItem[]>(() => {
    const totalProjetos = projetos.length;
    const projetosAtivos = projetos.filter((p: Projeto) => p.estado === "EM_DESENVOLVIMENTO").length;
    const projetosConcluidos = projetos.filter((p: Projeto) => p.estado === "CONCLUIDO").length;
    const projetosAtrasados = projetos.filter((p: Projeto) => {
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
        badgeText: "3 novos",
        badgeIcon: TrendingUp,
        badgeClassName: "text-blue-600 bg-blue-50/80 hover:bg-blue-100/80 border-blue-100",
        secondaryText: "de 15"
      },
      {
        icon: Clock,
        label: "Em Desenvolvimento",
        value: projetosAtivos,
        iconClassName: "text-emerald-600",
        iconContainerClassName: "bg-emerald-50/80",
        badgeText: `${Math.round(projetosAtivos / Math.max(totalProjetos, 1) * 100)}% ativos`,
        badgeClassName: "text-emerald-600 bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-100"
      },
      {
        icon: CheckCircle2,
        label: "Concluídos",
        value: projetosConcluidos,
        iconClassName: "text-emerald-600",
        iconContainerClassName: "bg-emerald-50/80",
        badgeText: `25%`,
        badgeClassName: "text-emerald-600 bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-100"
      },
      {
        icon: AlertCircle,
        label: "Atrasados",
        value: projetosAtrasados,
        iconClassName: "text-amber-600",
        iconContainerClassName: "bg-amber-50/80",
        badgeText: "Urgentes: 1",
        badgeClassName: "text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 border-amber-100"
      }
    ];
  }, [projetos]);

  const handleRowClick = useCallback((projeto: Projeto) => {
    router.push(`/projetos/${projeto.id}`);
  }, [router]);

  // Definição das colunas usando TanStack Table
  const columns = useMemo<ColumnDef<Projeto>[]>(() => [
    {
      accessorKey: "nome",
      header: "Projeto",
      cell: ({ getValue }) => (
        <span className="font-normal text-slate-800 group-hover:text-azul transition-colors duration-300 ease-in-out">
          {getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ getValue }) => (
        <BadgeEstado
          status={getValue<ProjetoEstado>()}
          label={ESTADO_LABELS[getValue<ProjetoEstado>()] || ""}
          variant="projeto"
        />
      ),
    },
    {
      accessorKey: "progresso",
      header: "Progresso",
      cell: ({ getValue }) => (
        <BarraProgresso value={Math.round((getValue<number>() || 0) * 100)} />
      ),
    },
    {
      accessorKey: "fim",
      header: "Prazo",
      cell: ({ getValue }) => {
        const date = getValue<string | Date | null>();
        return (
          <span className="text-slate-500">
            {date
              ? format(new Date(date), "dd MMM yyyy", { locale: ptBR })
              : "N/A"}
          </span>
        );
      },
    },
  ], []);

  const filterOptions = useMemo<FilterOption[]>(() => [
    { id: "todos", label: "Todos os estados", value: "todos" },
    ...uniqueEstados.map((estado) => ({
      id: estado,
      label: ESTADO_LABELS[estado] || "",
      value: estado,
      badge: {
        status: estado,
        variant: 'projeto'
      }
    })),
  ], []);

  const prazoOptions = useMemo<FilterOption[]>(() => [
    { id: "todos", label: "Todos os prazos", value: "todos" },
    { 
      id: "este_mes", 
      label: "Este mês", 
      value: "este_mes",
      badge: {
        status: "ESTE_MES",
        variant: 'prazo'
      }
    },
    { 
      id: "proximo_mes", 
      label: "Próximo mês", 
      value: "proximo_mes",
      badge: {
        status: "PROXIMO_MES",
        variant: 'prazo'
      }
    },
    { 
      id: "este_ano", 
      label: "Este ano", 
      value: "este_ano",
      badge: {
        status: "ESTE_ANO",
        variant: 'prazo'
      }
    },
    { 
      id: "atrasados", 
      label: "Atrasados", 
      value: "atrasados",
      badge: {
        status: "ATRASADO",
        variant: 'prazo'
      }
    },
  ], []);

  const filterConfigs = useMemo(() => [
    {
      id: "estado",
      label: "Estado",
      value: estadoFilter,
      onChange: (value: string) =>
        setEstadoFilter(value as "todos" | typeof uniqueEstados[number]),
      options: filterOptions,
    },
    {
      id: "prazo",
      label: "Prazo",
      value: prazoFilter,
      onChange: (value: string) =>
        setPrazoFilter(value as PrazoFilter),
      options: prazoOptions,
    }
  ], [estadoFilter, prazoFilter, filterOptions, prazoOptions]);

  const filteredProjects = useMemo(() => {
    if (!projetos.length) return [];

    let result = [...projetos];
    
    // Filtro por estado
    if (estadoFilter !== "todos") {
      result = result.filter((project: Projeto) => 
        project.estado === estadoFilter
      );
    }

    // Filtro por prazo
    if (prazoFilter !== "todos") {
      const hoje = new Date();
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      const ultimoDiaProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);
      const ultimoDiaAno = new Date(hoje.getFullYear(), 11, 31);

      result = result.filter((project: Projeto) => {
        if (!project.fim) return false;
        const dataFim = new Date(project.fim);
        
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
  }, [projetos, estadoFilter, prazoFilter]);

  const paginatedProjects = useMemo(() => {
    return filteredProjects.slice(0, itemsPerPage);
  }, [filteredProjects]);

  return (
    <div className="min-h-screen bg-[#F6F8FA] p-8"> 
      <div className="max-w-8xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Projetos</h1>
            <p className="text-slate-500 text-sm">Consulte os seus projetos e acompanhe o progresso</p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <NovoProjeto />
          </div>
        </div>

        <StatsGrid stats={stats} />

        {/* Seção de rascunhos para utilizadores COMUM */}
        {isComum && data?.rascunhos && data.rascunhos.length > 0 && (
          <div className="mb-0">
            <h2 className="text-lg font-medium mb-3 text-slate-800">Seus Rascunhos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.rascunhos.map(rascunho => (
                <div 
                  key={rascunho.id}
                  className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/projetos/rascunho/${rascunho.id}`)}
                >
                  <h3 className="font-normal text-slate-800">{rascunho.titulo}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Última atualização: {format(new Date(rascunho.updatedAt), "dd MMM yyyy", { locale: ptBR })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <TabelaDados<Projeto>
          title=""
          subtitle=""
          data={paginatedProjects}
          isLoading={isLoading}
          columns={columns}
          searchPlaceholder="Pesquisar projetos..."
          filterConfigs={filterConfigs}
          onRowClick={handleRowClick}
          emptyStateMessage={{
            title: "Nenhum projeto encontrado",
            description:
              "Experimente ajustar os filtros de pesquisa ou remover o termo de pesquisa.",
          }}
        />
      </div>
    </div>
  );
}