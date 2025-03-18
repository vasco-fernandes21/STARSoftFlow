"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Users as UsersIcon,
  UserCheck,
  UserCog,
  Clock,
  MoreHorizontal,
  BarChart,
  FileText,
  Eye,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { NovoUtilizadorModal } from "@/app/utilizadores/criar/page";
import { PageLayout } from "@/components/common/PageLayout";
import { PaginaHeader } from "@/components/common/PaginaHeader";
import { TabelaDados, FilterOption } from "@/components/common/TabelaDados";
import { BadgeEstado } from "@/components/common/BadgeEstado";
import { StatsGrid, StatItem } from "@/components/common/StatsGrid";
import { Badge } from "@/components/ui/badge";
import { Permissao, Regime } from "@prisma/client";

const PERMISSAO_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  GESTOR: 'Gestor',
  COMUM: 'Comum'
} as const;

const REGIME_LABELS: Record<string, string> = {
  PARCIAL: 'Parcial',
  INTEGRAL: 'Integral'
} as const;

const uniquePermissoes = ["ADMIN", "GESTOR", "COMUM"] as const;
const uniqueRegimes = ["INTEGRAL", "PARCIAL"] as const;

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
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-24"></div>
            </div>
          </div>
          <div className="flex-grow"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="flex space-x-2">
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Função auxiliar para extrair utilizadores da resposta da API
const extrairUtilizadores = (apiResponse: any) => {
  if (!apiResponse) return [];
  
  // Verificar o novo formato aninhado específico da resposta
  if (apiResponse[0]?.result?.data?.json?.items) {
    return apiResponse[0].result.data.json.items;
  }
  
  // Se temos uma resposta paginada direta da API
  if (apiResponse.items && Array.isArray(apiResponse.items)) {
    return apiResponse.items;
  }
  
  // Compatibilidade com o formato json aninhado
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

// Extrair informações de paginação
const extrairPaginacao = (apiResponse: any) => {
  if (!apiResponse) return { total: 0, pages: 1, page: 1, limit: itemsPerPage };
  
  // Novo formato aninhado
  if (apiResponse[0]?.result?.data?.json?.pagination) {
    return apiResponse[0].result.data.json.pagination;
  }
  
  // Formato direto
  if (apiResponse.pagination) {
    return apiResponse.pagination;
  }
  
  // Formato json aninhado
  if (apiResponse.json?.pagination) {
    return apiResponse.json.pagination;
  }
  
  return { total: 0, pages: 1, page: 1, limit: itemsPerPage };
};

// Componente Avatar simplificado sem animações
const SimpleAvatar = ({ utilizador }: { utilizador: any }) => {
  return (
    <Avatar className="h-10 w-10 ring-2 ring-white/30 shadow-md">
      <AvatarImage src={utilizador?.foto || undefined} />
      <AvatarFallback className="bg-blue-100 text-azul font-medium">
        {utilizador?.name?.split(' ').map((n: string) => n[0]).join('')}
      </AvatarFallback>
    </Avatar>
  );
};

// Componente personalizado para botão de ação com animação
const AnimatedActionButton = ({ 
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
    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
      <Button
        variant="ghost"
        size="icon"
        className={`text-gray-500 hover:${hoverColor} hover:bg-white/60 rounded-full transition-all duration-300 ease-in-out shadow-sm hover:shadow-md`}
        onClick={onClick}
        title={title}
      >
        <Icon className="h-4 w-4" />
      </Button>
    </motion.div>
  );
};

const Users = () => {
  const [search, setSearch] = useState("");
  const [permissaoFilter, setPermissaoFilter] = useState("all");
  const [regimeFilter, setRegimeFilter] = useState("all");
  const [sortField, setSortField] = useState<'name' | 'contratacao' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  
  const router = useRouter();

  // Usando a mesma configuração de cache e refetch que os projetos
  const queryResult = api.utilizador.getAll.useQuery(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: search || undefined,
      permissao: permissaoFilter !== "all" ? permissaoFilter as any : undefined,
      regime: regimeFilter !== "all" ? regimeFilter as any : undefined
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    }
  );

  // Extrair utilizadores usando a função utilitária
  const utilizadores = useMemo(() => extrairUtilizadores(queryResult.data), [queryResult.data]);
  const paginacao = useMemo(() => extrairPaginacao(queryResult.data), [queryResult.data]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as 'name' | 'contratacao');
      setSortDirection('asc');
    }
  };

  const filteredUsers = useMemo(() => {
    if (!utilizadores || !Array.isArray(utilizadores) || utilizadores.length === 0) 
      return [];
    
    // Se estamos a usar paginação do servidor, não precisamos de filtrar novamente
    // os utilizadores porque a API já retorna os dados filtrados
    if (paginacao.pages) {
      return utilizadores;
    }
    
    let filtered = [...utilizadores];
    
    // Filtrar por busca e filtros
    filtered = filtered.filter((utilizador) => {
      const searchMatch =
        utilizador?.name?.toLowerCase().includes(search.toLowerCase()) ||
        utilizador?.email?.toLowerCase().includes(search.toLowerCase()) ||
        utilizador?.permissao?.toLowerCase().includes(search.toLowerCase()) ||
        utilizador?.atividade?.toLowerCase().includes(search.toLowerCase());
      
      const permissaoMatch = permissaoFilter === "all" ? true : utilizador.permissao.toLowerCase() === permissaoFilter.toLowerCase();
      const regimeMatch = regimeFilter === "all" ? true : utilizador.regime.toLowerCase() === regimeFilter.toLowerCase();
      
      return searchMatch && permissaoMatch && regimeMatch;
    });

    // Aplicar ordenação
    if (sortField) {
      filtered.sort((a, b) => {
        if (sortField === 'name') {
          const nameA = a.name?.toLowerCase() || '';
          const nameB = b.name?.toLowerCase() || '';
          const modifier = sortDirection === 'asc' ? 1 : -1;
          
          if (nameA < nameB) return -1 * modifier;
          if (nameA > nameB) return 1 * modifier;
          return 0;
        }
        
        if (sortField === 'contratacao') {
          const dateA = a.contratacao ? new Date(a.contratacao).getTime() : 0;
          const dateB = b.contratacao ? new Date(b.contratacao).getTime() : 0;
          const modifier = sortDirection === 'asc' ? 1 : -1;
          
          if (dateA < dateB) return -1 * modifier;
          if (dateA > dateB) return 1 * modifier;
          return 0;
        }
        
        return 0;
      });
    }

    return filtered;
  }, [search, permissaoFilter, regimeFilter, utilizadores, sortField, sortDirection, paginacao.pages]);

  const clearAllFilters = () => {
    setSearch("");
    setPermissaoFilter("all");
    setRegimeFilter("all");
  };

  const handleRowClick = (utilizador: any) => {
    router.push(`/utilizadores/${utilizador.username}`);
  };

  const handleReportClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    router.push(`/users/${id}/report`);
  };

  const handleGenerateReportClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    router.push(`/users/${id}/generate-report`);
  };

  // Função para traduzir permissão para texto
  const getPermissaoText = (permissao: Permissao) => {
    switch (permissao) {
      case Permissao.ADMIN: return "Administrador";
      case Permissao.GESTOR: return "Gestor";
      case Permissao.COMUM: return "Utilizador";
      default: return "Desconhecido";
    }
  };

  // Função para traduzir regime para texto
  const getRegimeText = (regime: Regime) => {
    switch (regime) {
      case Regime.INTEGRAL: return "Tempo Integral";
      case Regime.PARCIAL: return "Tempo Parcial";
      default: return "Desconhecido";
    }
  };

  // Configuração dos filtros
  const permissaoOptions: FilterOption[] = [
    { id: 'all', label: 'Todas as permissões', value: 'all' },
    ...uniquePermissoes.map(permissao => ({
      id: permissao,
      label: PERMISSAO_LABELS[permissao] || '',
      value: permissao
    }))
  ];

  const regimeOptions: FilterOption[] = [
    { id: 'all', label: 'Todos os regimes', value: 'all' },
    ...uniqueRegimes.map(regime => ({
      id: regime,
      label: REGIME_LABELS[regime] || '',
      value: regime
    }))
  ];

  const filterConfigs = [
    {
      id: 'permissao',
      label: 'Permissão',
      value: permissaoFilter,
      onChange: setPermissaoFilter,
      options: permissaoOptions
    },
    {
      id: 'regime',
      label: 'Regime',
      value: regimeFilter,
      onChange: setRegimeFilter,
      options: regimeOptions
    }
  ];

  // Cálculos estatísticos baseados no array atual
  const utilizadoresArray = Array.isArray(utilizadores) ? utilizadores : [];
  const totalUsers = utilizadoresArray.length || 0;
  const regimenIntegral = utilizadoresArray.filter(utilizador => utilizador.regime?.toLowerCase() === "integral").length || 0;
  const regimenParcial = utilizadoresArray.filter(utilizador => utilizador.regime?.toLowerCase() === "parcial").length || 0;
  const totalAdmins = utilizadoresArray.filter(utilizador => utilizador.permissao?.toLowerCase() === "admin").length || 0;

  // Configuração das estatísticas
  const stats: StatItem[] = [
    {
      icon: UsersIcon,
      label: "Total Utilizadores",
      value: totalUsers,
      iconClassName: "text-azul",
      iconContainerClassName: "bg-blue-50/70 hover:bg-blue-100/80"
    },
    {
      icon: UserCheck,
      label: "Regime Integral",
      value: regimenIntegral,
      iconClassName: "text-green-600",
      iconContainerClassName: "bg-green-50/70 hover:bg-green-100/80"
    },
    {
      icon: Clock,
      label: "Regime Parcial",
      value: regimenParcial,
      iconClassName: "text-orange-600",
      iconContainerClassName: "bg-orange-50/70 hover:bg-orange-100/80"
    },
    {
      icon: UserCog,
      label: "Administradores",
      value: totalAdmins,
      iconClassName: "text-purple-600",
      iconContainerClassName: "bg-purple-50/70 hover:bg-purple-100/80"
    }
  ];

  // Usar useEffect para reagir às mudanças de dados
  useEffect(() => {
    if (queryResult.data) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Resposta da API de utilizadores:', queryResult.data);
      }
    }
  }, [queryResult.data]);

  return (
    <PageLayout className="h-screen overflow-hidden">
      <div className="space-y-6">
        <PaginaHeader
          title="Utilizadores"
          subtitle="Consulte os utilizadores do sistema"
          action={<NovoUtilizadorModal />}
        />

        <StatsGrid stats={stats} className="my-4" />

        <div className="flex-1 overflow-visible">
          {queryResult.isLoading ? (
            <TableSkeleton />
          ) : (
            <div className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg hover:translate-y-[-1px] rounded-2xl overflow-hidden">
              <TabelaDados
                title=""
                subtitle=""
                data={filteredUsers}
                isLoading={queryResult.isLoading}
                columns={[
                  {
                    id: 'utilizador',
                    label: 'Utilizador',
                    sortable: true,
                    sortField: 'name',
                    width: "30%",
                    align: "left" as const,
                    renderCell: (utilizador: any) => (
                      <div className="flex items-center gap-3">
                        <SimpleAvatar utilizador={utilizador} />
                        <div>
                          <p className="font-medium text-gray-900">
                            {utilizador?.name || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500">{utilizador?.atividade || 'N/A'}</p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: 'email',
                    label: 'Email',
                    width: "25%",
                    align: "left" as const,
                    renderCell: (utilizador: any) => (
                      <span className="text-gray-600">
                        {utilizador?.email || 'N/A'}
                      </span>
                    ),
                  },
                  {
                    id: 'permissao',
                    label: 'Permissão',
                    width: "15%",
                    align: "center" as const,
                    renderCell: (utilizador: any) => (
                      <BadgeEstado 
                        status={utilizador.permissao} 
                        label={getPermissaoText(utilizador.permissao)} 
                        variant="permissao" 
                      />
                    ),
                  },
                  {
                    id: 'regime',
                    label: 'Regime',
                    width: "15%",
                    align: "center" as const,
                    renderCell: (utilizador: any) => (
                      <BadgeEstado 
                        status={utilizador.regime} 
                        label={getRegimeText(utilizador.regime)} 
                        variant="regime" 
                      />
                    ),
                  },
                  {
                    id: 'contratacao',
                    label: 'Data de Contratação',
                    sortable: true,
                    sortField: 'contratacao',
                    width: "15%",
                    align: "right" as const,
                    renderCell: (utilizador: any) => (
                      <div className="flex items-center gap-2 justify-end">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {utilizador?.contratacao ? new Date(utilizador.contratacao).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    ),
                  }
                ]}
                searchConfig={{
                  placeholder: "Procurar utilizadores...",
                  value: search,
                  onChange: setSearch
                }}
                filterConfigs={filterConfigs}
                sortConfig={{
                  field: sortField,
                  direction: sortDirection,
                  onChange: handleSort
                }}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalItems={paginacao.total || filteredUsers.length}
                totalPages={paginacao.pages || Math.ceil(filteredUsers.length / itemsPerPage)}
                onRowClick={handleRowClick}
                clearAllFilters={clearAllFilters}
                emptyStateMessage={{
                  title: "Nenhum utilizador encontrado",
                  description: "Experimente ajustar os filtros de pesquisa ou remover o termo de pesquisa para ver todos os utilizadores."
                }}
              />
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default Users;