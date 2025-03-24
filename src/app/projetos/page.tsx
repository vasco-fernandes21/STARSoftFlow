"use client";

import { useState, useMemo, useEffect } from "react";
import { MoreHorizontal, BarChart, Briefcase, Clock, CheckCircle2, AlertCircle, TrendingUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/trpc/react";
import { NovoProjeto } from "@/components/projetos/NovoProjeto";
import { PageLayout } from "@/components/common/PageLayout";
import { PaginaHeader } from "@/components/common/PaginaHeader";
import { BadgeEstado } from "@/components/common/BadgeEstado";
import { BarraProgresso } from "@/components/common/BarraProgresso";
import { StatsGrid, StatItem } from "@/components/common/StatsGrid";
import { AnimatePresence } from "framer-motion";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";

// Interface genérica para tipos de resposta paginada
interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    pages: number;
    page: number;
    limit: number;
  };
}

// Interface para tipo de projeto
interface Projeto {
  id: string;
  nome: string;
  estado: string;
  progresso: number;
  fim?: string | Date | null;
  descricao?: string | null;
  inicio?: string | Date | null;
  [key: string]: any; // Para quaisquer outras propriedades
}

// Tipo específico para a resposta da API
type ProjetosResponse = Projeto[] | PaginatedResponse<Projeto> | null;

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

// Função para extrair projetos da resposta da API
const extrairProjetos = (apiResponse: ProjetosResponse): Projeto[] => {
  if (!apiResponse) return [];
  
  // Se tiver propriedade items (formato de resposta paginada)
  if ('items' in apiResponse && Array.isArray(apiResponse.items)) {
    return apiResponse.items;
  }
  
  // Se for um array direto
  if (Array.isArray(apiResponse)) {
    return apiResponse;
  }
  
  return [];
};

export default function Projetos() {
  const router = useRouter();
  const [estadoFilter, setEstadoFilter] =
    useState<"todos" | "APROVADO" | "PENDENTE" | "RASCUNHO" | "EM_DESENVOLVIMENTO" | "CONCLUIDO">("todos");

  // Consulta para obter todos os projetos de uma vez
  const { 
    data: projetosResponse, 
    isLoading 
  } = api.projeto.findAll.useQuery(
    {}, // Não precisamos de filtros aqui, vamos fazer a filtragem client-side
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    }
  );

  // Extrair todos os projetos da resposta da API
  const projetos = useMemo(() => {
    return extrairProjetos(projetosResponse as ProjetosResponse);
  }, [projetosResponse]);

  // Aplicar filtro de estado se necessário (apenas para manter compatibilidade com o selector de estado)
  const projetosFiltrados = useMemo(() => {
    if (estadoFilter === "todos") return projetos;
    return projetos.filter(projeto => projeto.estado === estadoFilter);
  }, [projetos, estadoFilter]);
  
  // Estatísticas baseadas em todos os projetos
  const totalProjetos = projetos.length;
  const projetosAtivos = projetos.filter(
    projeto => projeto.estado === "EM_DESENVOLVIMENTO"
  ).length;
  const projetosConcluidos = projetos.filter(
    projeto => projeto.estado === "CONCLUIDO"
  ).length;
  const projetosAtrasados = projetos.filter(projeto => {
    if (!projeto.fim) return false;
    const dataFim = new Date(projeto.fim);
    return dataFim < new Date() && projeto.estado !== "CONCLUIDO";
  }).length;
  
  const mediaProgresso = projetos.length > 0
    ? Math.round(
        (projetos.reduce(
          (acc, projeto) => acc + (projeto.progresso || 0), 
          0
        ) / projetos.length) * 100
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

  const clearAllFilters = () => {
    setEstadoFilter("todos");
  };

  const handleRowClick = (projeto: Projeto) => {
    router.push(`/projetos/${projeto.id}`);
  };

  const handleReportClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    router.push(`/projetos/${id}/report`);
  };

  // Definição das colunas do TanStack Table
  const columns: ColumnDef<Projeto>[] = [
    {
      accessorKey: "nome",
      header: ({ column }) => (
        <div className="flex items-center">
          <span>Projeto</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="ml-1 h-6 w-6 rounded-full"
          >
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">
          {String(row.getValue("nome"))}
        </span>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const estado = String(row.getValue("estado"));
        // Verifica se o estado é uma das chaves válidas
        const isValidKey = Object.keys(ESTADO_LABELS).includes(estado);
        const label = isValidKey ? ESTADO_LABELS[estado as keyof typeof ESTADO_LABELS] : estado;
        
        return (
          <BadgeEstado
            status={estado}
            label={label || ""}
            variant="projeto"
          />
        );
      },
    },
    {
      accessorKey: "progresso",
      header: ({ column }) => (
        <div className="flex items-center">
          <span>Progresso</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="ml-1 h-6 w-6 rounded-full"
          >
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const value = row.getValue("progresso");
        const progressoValue = typeof value === 'number' ? value : 0;
        const percentValue = Math.round(progressoValue * 100);
        
        return (
          <div className="w-full flex justify-center">
            <div className="w-full max-w-[180px]">
              <BarraProgresso value={percentValue} />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "fim",
      header: ({ column }) => (
        <div className="flex items-center justify-end">
          <span>Prazo</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="ml-1 h-6 w-6 rounded-full"
          >
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const fim = row.getValue("fim");
        return (
          <div className="text-right">
            {fim
              ? format(new Date(fim as string | Date), "dd MMM yyyy", { locale: ptBR })
              : "N/A"}
          </div>
        );
      },
    },
  ];

  // Configuração dos filtros
  const estadoOptions = [
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
        setEstadoFilter(value as "todos" | "APROVADO" | "PENDENTE" | "RASCUNHO" | "EM_DESENVOLVIMENTO" | "CONCLUIDO"),
      options: estadoOptions,
    },
  ];

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
                <DataTable
                  columns={columns}
                  data={estadoFilter === "todos" ? projetos : projetosFiltrados}
                  isLoading={isLoading}
                  searchPlaceholder="Pesquisar projetos..."
                  filterConfigs={filterConfigs}
                  initialPageSize={itemsPerPage}
                  onRowClick={handleRowClick}
                  onClearFilters={clearAllFilters}
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
