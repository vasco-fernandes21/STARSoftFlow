"use client";

import { useState, useMemo, useCallback } from "react";
import { MoreHorizontal, BarChart, Briefcase, Clock, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/trpc/react";
import { NovoProjeto } from "@/components/projetos/NovoProjeto";
import { PageLayout } from "@/components/common/PageLayout";
import { PaginaHeader } from "@/components/common/PaginaHeader";
import { TabelaDados, FilterOption } from "@/components/common/TabelaDados";
import { BadgeEstado } from "@/components/common/BadgeEstado";
import { BarraProgresso } from "@/components/common/BarraProgresso";
import { StatsGrid, StatItem } from "@/components/common/StatsGrid";
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

const extrairPaginacao = (apiResponse: any) => {
  if (!apiResponse) return { total: 0, pages: 1, page: 1, limit: itemsPerPage };
  
  if (apiResponse[0]?.result?.data?.json?.pagination) {
    return apiResponse[0].result.data.json.pagination;
  }
  
  if (apiResponse.pagination) {
    return apiResponse.pagination;
  }
  
  if (apiResponse.json?.pagination) {
    return apiResponse.json.pagination;
  }
  
  return { total: 0, pages: 1, page: 1, limit: itemsPerPage };
};

export default function Projetos() {
  const router = useRouter();
  const { data: session } = useSession();
  const { userPermission, isComum } = usePermissions();
  const userId = (session?.user as any)?.id;
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [estadoFilter, setEstadoFilter] =
    useState<"todos" | typeof uniqueEstados[number]>("todos");
  const [sortField, setSortField] =
    useState<"nome" | "fim" | "progresso" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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
        iconClassName: "text-azul",
        iconContainerClassName: "bg-azul/10 hover:bg-azul/20"
      },
      {
        icon: Clock,
        label: "Em Desenvolvimento",
        value: projetosAtivos,
        iconClassName: "text-azul",
        iconContainerClassName: "bg-azul/10 hover:bg-azul/20"
      },
      {
        icon: CheckCircle2,
        label: "Concluídos",
        value: projetosConcluidos,
        iconClassName: "text-emerald-600",
        iconContainerClassName: "bg-emerald-50/70 hover:bg-emerald-100/80"
      },
      {
        icon: AlertCircle,
        label: "Atrasados",
        value: projetosAtrasados,
        iconClassName: "text-amber-600",
        iconContainerClassName: "bg-amber-50/70 hover:bg-amber-100/80"
      }
    ];
  }, [projetos]);

  const handleSort = useCallback((field: string) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDirection(d => d === "asc" ? "desc" : "asc");
        return prev;
      }
      setSortDirection("asc");
      return field as "nome" | "fim" | "progresso";
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setEstadoFilter("todos");
  }, []);

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
        <span className="font-medium text-gray-900 group-hover:text-azul transition-colors duration-300 ease-in-out">
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
          <span className="text-gray-600">
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
            className="text-gray-500 hover:text-green-600 hover:bg-white/60 rounded-full transition-all duration-300 ease-in-out shadow-sm hover:shadow-md"
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
            className="text-gray-500 hover:text-azul hover:bg-white/60 rounded-full transition-all duration-300 ease-in-out shadow-sm hover:shadow-md"
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
    
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter((project: Projeto) => 
        project.nome.toLowerCase().includes(searchLower) ||
        project.descricao?.toLowerCase().includes(searchLower)
      );
    }

    if (estadoFilter !== "todos") {
      result = result.filter((project: Projeto) => 
        project.estado === estadoFilter
      );
    }

    if (sortField) {
      result = result.sort((a: Projeto, b: Projeto) => {
        const aValue = a[sortField] ?? '';
        const bValue = b[sortField] ?? '';
        const modifier = sortDirection === "asc" ? 1 : -1;
        
        if (aValue < bValue) return -1 * modifier;
        if (aValue > bValue) return 1 * modifier;
        return 0;
      });
    }

    return result;
  }, [projetos, searchQuery, estadoFilter, sortField, sortDirection]);

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredProjects.slice(start, end);
  }, [filteredProjects, currentPage]);

  const paginationData = useMemo(() => {
    return {
      totalItems: filteredProjects.length,
      totalPages: Math.max(1, Math.ceil(filteredProjects.length / itemsPerPage))
    };
  }, [filteredProjects]);

  return (
    <PageLayout>
      <PaginaHeader
        title="Projetos"
        subtitle="Consulte os seus projetos e acompanhe o progresso"
        action={<NovoProjeto />}
      />

      <StatsGrid stats={stats} className="my-4" />

      {/* Seção de rascunhos para utilizadores COMUM */}
      {isComum && data?.rascunhos && data.rascunhos.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Seus Rascunhos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.rascunhos.map(rascunho => (
              <div 
                key={rascunho.id}
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/projetos/rascunho/${rascunho.id}`)}
              >
                <h3 className="font-medium text-gray-900">{rascunho.titulo}</h3>
                <p className="text-sm text-gray-500">
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
    </PageLayout>
  );
}