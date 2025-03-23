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
import { AnimatePresence } from "framer-motion";

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

// Skeleton para estado de carregamento
const TableSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow p-4 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/6"></div>
      </div>
      
      {[...Array(5)].map((_, index) => (
        <div key={index} className="flex items-center space-x-4 py-3 border-b last:border-0 border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-40 mb-2"></div>
          <div className="flex-grow"></div>
          <div className="h-6 bg-gray-200 rounded w-24"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="flex space-x-2">
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Substituir AnimatedActionButton com versão CSS
const CSSActionButton = ({ 
  icon: Icon, 
  onClick, 
  title, 
  hoverColor = "text-azul" 
}: { 
  icon: React.ComponentType<any>; 
  onClick: (e: React.MouseEvent) => void; 
  title: string; 
  hoverColor?: string;
}) => {
  return (
    <div className="transition-all hover:scale-110 active:scale-95 duration-200">
      <Button
        variant="ghost"
        size="icon"
        className={`text-gray-500 hover:${hoverColor} hover:bg-white/60 rounded-full transition-all duration-300 ease-in-out shadow-sm hover:shadow-md z-10`}
        onClick={onClick}
        title={title}
      >
        <Icon className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Substituir AnimatedBarraProgresso com versão CSS
const CSSBarraProgresso = ({ value }: { value: number }) => {
  return (
    <div className="transition-all hover:scale-[1.03] duration-200">
      <BarraProgresso value={value} />
    </div>
  );
};

const extrairProjetos = (apiResponse: any) => {
  if (!apiResponse) return [];
  
  // Se tiver items (formato de resposta paginada do servidor)
  if (apiResponse.items && Array.isArray(apiResponse.items)) {
    return apiResponse.items;
  }
  
  // Se for um array direto, usar como está
  if (Array.isArray(apiResponse)) {
    return apiResponse;
  }
  
  return [];
};

const extrairPaginacao = (apiResponse: any) => {
  if (!apiResponse) return { total: 0, pages: 1, page: 1, limit: itemsPerPage };
  
  // Usar paginação retornada direto do servidor
  if (apiResponse.total !== undefined) {
    return {
      total: apiResponse.total,
      pages: apiResponse.totalPages || Math.ceil(apiResponse.total / itemsPerPage),
      page: apiResponse.page || 1,
      limit: apiResponse.limit || itemsPerPage
    };
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
    data: projetosResponse, 
    isLoading, 
    error 
  } = api.projeto.findAll.useQuery(
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
    if (projetosResponse) {
      console.log("Resposta da API:", projetosResponse);
    }
  }, [projetosResponse]);

  // Extrair projetos da resposta da API
  const projetos = useMemo(() => {
    if (!projetosResponse) return [];
    
    // Se for um array direto, usar como está
    if (Array.isArray(projetosResponse)) {
      return projetosResponse;
    }
    
    // Se tiver uma propriedade items, usar essa
    if (projetosResponse.items && Array.isArray(projetosResponse.items)) {
      return projetosResponse.items;
    }
  
    
    // Último recurso: tentar converter para array se for objeto
    if (typeof projetosResponse === 'object' && projetosResponse !== null) {
      return [projetosResponse];
    }
    
    return [];
  }, [projetosResponse]);

  // Extrair informações de paginação
  const paginacao = useMemo(() => {
    if (!projetosResponse) return { total: 0, pages: 1, page: 1, limit: itemsPerPage };
    
    if (projetosResponse.pagination) {
      return projetosResponse.pagination;
    }
    
    // Se não houver paginação, calcular com base no array
    const total = Array.isArray(projetos) ? projetos.length : 0;
    return {
      total,
      pages: Math.ceil(total / itemsPerPage),
      page: currentPage,
      limit: itemsPerPage
    };
  }, [projetosResponse, projetos, currentPage]);

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

  // Configuração das colunas da tabela
  const columns = [
    {
      id: "nome",
      label: "Projeto",
      sortable: true,
      sortField: "nome",
      width: "25%",
      align: "left" as const,
      renderCell: (projeto: any) => (
        <span className="font-medium text-gray-900">
          {projeto.nome}
        </span>
      ),
    },
    {
      id: "estado",
      label: "Estado",
      width: "15%",
      align: "center" as const,
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
      width: "5%",
      align: "left" as const,
      renderCell: (projeto: any) => (
        <div className="w-full flex justify-center">
          <div className="w-full max-w-[180px]">
            <BarraProgresso value={Math.round((projeto.progresso || 0) * 100)} />
          </div>
        </div>
      ),
    },
    {
      id: "fim",
      label: "Prazo",
      sortable: true,
      sortField: "fim",
      width: "15%",
      align: "right" as const,
      renderCell: (projeto: any) => (
        <span className="text-gray-600">
          {projeto.fim
            ? format(new Date(projeto.fim), "dd MMM yyyy", { locale: ptBR })
            : "N/A"}
        </span>
      ),
    }
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
    <PageLayout className="h-screen relative">
      <div className="h-full flex flex-col space-y-6">
        <PaginaHeader
          title="Projetos"
          subtitle="Consulte os seus projetos e acompanhe o progresso"
          action={<NovoProjeto />}
        />

        <StatsGrid stats={stats} className="my-4" />

        <div className="flex-1 overflow-visible">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <div className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg hover:translate-y-[-1px] rounded-2xl overflow-hidden">
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
                  totalItems={paginacao.total || filteredProjects.length}
                  totalPages={paginacao.pages || Math.ceil(filteredProjects.length / itemsPerPage)}
                  onRowClick={handleRowClick}
                  clearAllFilters={clearAllFilters}
                  emptyStateMessage={{
                    title: "Nenhum projeto encontrado",
                    description:
                      "Experimente ajustar os filtros de pesquisa ou remover o termo de pesquisa.",
                  }}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageLayout>
  );
}
