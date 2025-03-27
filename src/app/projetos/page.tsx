"use client";

import { useState, useMemo, useCallback } from "react";
import { MoreHorizontal, BarChart, Briefcase, Clock, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const handleReportClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    router.push(`/projetos/${id}/report`);
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
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-green-600 hover:bg-white/60 rounded-full transition-all duration-300 ease-in-out shadow-sm hover:shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              handleReportClick(e, row.original.id);
            }}
            title="Ver relatório"
          >
            <BarChart className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-azul hover:bg-white/60 rounded-full transition-all duration-300 ease-in-out shadow-sm hover:shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              // Menu de opções adicionais
            }}
            title="Mais opções"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [handleReportClick]);

  const filterOptions = useMemo<FilterOption[]>(() => [
    { id: "todos", label: "Todos os estados", value: "todos" },
    ...uniqueEstados.map((estado) => ({
      id: estado,
      label: ESTADO_LABELS[estado] || "",
      value: estado,
    })),
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
  ], [estadoFilter, filterOptions]);

  const filteredProjects = useMemo(() => {
    if (!projetos.length) return [];

    let result = [...projetos];
    
    if (estadoFilter !== "todos") {
      result = result.filter((project: Projeto) => 
        project.estado === estadoFilter
      );
    }

    return result;
  }, [projetos, estadoFilter]);

  const paginatedProjects = useMemo(() => {
    const start = 0;
    const end = itemsPerPage;
    return filteredProjects.slice(start, end);
  }, [filteredProjects]);

  return (
    <div className="min-h-screen bg-[#F6F8FA] p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-medium text-slate-800 tracking-tight">Projetos</h1>
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