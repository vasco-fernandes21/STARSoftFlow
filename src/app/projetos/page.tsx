"use client";

import { useState, useMemo, useEffect } from "react";
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

const extrairProjetos = (apiResponse: any) => {
  if (!apiResponse) return [];
  
  if (apiResponse[0]?.result?.data?.json?.items) {
    return apiResponse[0].result.data.json.items;
  }
  
  if (apiResponse.items && Array.isArray(apiResponse.items)) {
    return apiResponse.items;
  }
  
  if (apiResponse.json?.items && Array.isArray(apiResponse.json.items)) {
    return apiResponse.json.items;
  }
  
  if (apiResponse.json && Array.isArray(apiResponse.json)) {
    return apiResponse.json;
  }
  
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
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [estadoFilter, setEstadoFilter] =
    useState<"todos" | typeof uniqueEstados[number]>("todos");
  const [sortField, setSortField] =
    useState<"nome" | "fim" | "progresso" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const { 
    data: projetos, 
    isLoading, 
    error 
  } = api.projeto.getAll.useQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: searchQuery || undefined,
      estado: estadoFilter !== "todos" ? estadoFilter as any : undefined
    }, 
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    }
  );

  useEffect(() => {
    if (projetos) {
      console.log("Projetos carregados:", projetos);
    }
  }, [projetos]);

  const projetosArray = Array.isArray(projetos) ? projetos : [];
  
  const totalProjetos = projetosArray.length;
  const projetosAtivos = projetosArray.filter(
    projeto => projeto.estado === "EM_DESENVOLVIMENTO"
  ).length;
  const projetosConcluidos = projetosArray.filter(
    projeto => projeto.estado === "CONCLUIDO"
  ).length;
  const projetosAtrasados = projetosArray.filter(projeto => {
    if (!projeto.fim) return false;
    const dataFim = new Date(projeto.fim);
    return dataFim < new Date() && projeto.estado !== "CONCLUIDO";
  }).length;
  
  const mediaProgresso = projetosArray.length > 0
    ? Math.round(
        (projetosArray.reduce(
          (acc, projeto) => acc + (projeto.progresso || 0), 
          0
        ) / projetosArray.length) * 100
      )
    : 0;

  const stats: StatItem[] = [
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field as "nome" | "fim" | "progresso");
      setSortDirection("asc");
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setEstadoFilter("todos");
  };

  const handleRowClick = (projeto: any) => {
    router.push(`/projetos/${projeto.id}`);
  };

  const handleReportClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    router.push(`/projetos/${id}/report`);
  };

  const columns = [
    {
      id: "nome",
      label: "Projeto",
      sortable: true,
      sortField: "nome",
      renderCell: (projeto: any) => (
        <span className="font-medium text-gray-900 group-hover:text-azul transition-colors duration-300 ease-in-out">
          {projeto.nome}
        </span>
      ),
    },
    {
      id: "estado",
      label: "Estado",
      renderCell: (projeto: any) => (
        <BadgeEstado
          status={projeto.estado}
          label={ESTADO_LABELS[projeto.estado] || ""}
          variant="projeto"
        />
      ),
    },
    {
      id: "progresso",
      label: "Progresso",
      sortable: true,
      sortField: "progresso",
      renderCell: (projeto: any) => (
        <BarraProgresso value={Math.round((projeto.progresso || 0) * 100)} />
      ),
    },
    {
      id: "fim",
      label: "Prazo",
      sortable: true,
      sortField: "fim",
      renderCell: (projeto: any) => (
        <span className="text-gray-600">
          {projeto.fim
            ? format(new Date(projeto.fim), "dd MMM yyyy", { locale: ptBR })
            : "N/A"}
        </span>
      ),
    },
    {
      id: "acoes",
      label: "Ações",
      renderCell: (projeto: any) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-green-600 hover:bg-white/60 rounded-full transition-all duration-300 ease-in-out shadow-sm hover:shadow-md"
            onClick={(e) => handleReportClick(e, projeto.id)}
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
  ];

  const filterOptions: FilterOption[] = [
    { id: "todos", label: "Todos os estados", value: "todos" },
    ...uniqueEstados.map((estado) => ({
      id: estado,
      label: ESTADO_LABELS[estado] || "",
      value: estado,
    })),
  ];

  const filterConfigs = [
    {
      id: "estado",
      label: "Estado",
      value: estadoFilter,
      onChange: (value: string) =>
        setEstadoFilter(value as "todos" | typeof uniqueEstados[number]),
      options: filterOptions,
    },
  ];

  const filteredProjects = useMemo(() => {
    if (!projetos || !Array.isArray(projetos) || projetos.length === 0)
      return [];

    let sortedProjects = [...projetos];
    
    if (sortField) {
      sortedProjects.sort((a, b) => {
        const aValue = a[sortField] ?? '';
        const bValue = b[sortField] ?? '';
        const modifier = sortDirection === "asc" ? 1 : -1;
        
        if (aValue < bValue) return -1 * modifier;
        if (aValue > bValue) return 1 * modifier;
        return 0;
      });
    }

    return sortedProjects.filter((project) => {
      const searchMatch = project.nome
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const statusMatch =
        estadoFilter === "todos" ? true : project.estado === estadoFilter;
      return searchMatch && statusMatch;
    });
  }, [projetos, searchQuery, estadoFilter, sortField, sortDirection]);

  return (
    <PageLayout>
      <PaginaHeader
        title="Projetos"
        subtitle="Consulte os seus projetos e acompanhe o progresso"
        action={<NovoProjeto />}
      />

      <StatsGrid stats={stats} className="my-4" />

      <TabelaDados
        title=""
        subtitle=""
        data={filteredProjects}
        isLoading={isLoading}
        columns={columns}
        searchConfig={{
          placeholder: "Pesquisar projetos...",
          value: searchQuery,
          onChange: setSearchQuery,
        }}
        filterConfigs={filterConfigs}
        sortConfig={{
          field: sortField,
          direction: sortDirection,
          onChange: handleSort,
        }}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalItems={projetos?.pagination?.total || filteredProjects.length}
        totalPages={projetos?.pagination?.pages || Math.ceil(filteredProjects.length / itemsPerPage)}
        onRowClick={handleRowClick}
        clearAllFilters={clearAllFilters}
        emptyStateMessage={{
          title: "Nenhum projeto encontrado",
          description:
            "Experimente ajustar os filtros de pesquisa ou remover o termo de pesquisa.",
        }}
      />
    </PageLayout>
  );
}
