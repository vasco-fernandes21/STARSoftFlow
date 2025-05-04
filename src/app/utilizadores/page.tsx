"use client";

import { useState, useMemo, useEffect } from "react";
import { Users as UsersIcon, UserCheck, UserCog, Clock, Trash2, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { NovoUtilizadorModal } from "@/app/utilizadores/components/NovoUtilizadorModal";
import { TabelaDados } from "@/components/common/TabelaDados";
import { BadgeEstado } from "@/components/common/BadgeEstado";
import { StatsGrid } from "@/components/common/StatsGrid";
import { Permissao, Regime } from "@prisma/client";
import { type ColumnDef } from "@tanstack/react-table";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Skeleton para estado de carregamento
const TableSkeleton = () => (
  <div className="rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow">
    <div className="flex-none border-b border-slate-100 px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="h-9 w-64 animate-pulse rounded-full bg-slate-100" />
        <div className="h-9 w-32 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
    <div className="p-6">
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
              <div className="space-y-2">
                <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
            <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100" />
            <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100" />
            <div className="h-8 w-32 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

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

// Componente Avatar simplificado sem animações
const SimpleAvatar = ({ utilizador }: { utilizador: any }) => {
  return (
    <Avatar className="h-10 w-10 shadow-md ring-2 ring-white/30">
      <AvatarImage src={utilizador?.foto || undefined} />
      <AvatarFallback className="bg-blue-100 font-medium text-azul">
        {utilizador?.name
          ?.split(" ")
          .map((n: string) => n[0])
          .join("")}
      </AvatarFallback>
    </Avatar>
  );
};

// Função para traduzir permissão para texto
function getPermissaoText(permissao: Permissao): string {
  switch (permissao) {
    case Permissao.ADMIN:
      return "Administrador";
    case Permissao.GESTOR:
      return "Gestor";
    case Permissao.COMUM:
      return "Utilizador";
    default:
      return "Desconhecido";
  }
}

// Função para traduzir regime para texto
function getRegimeText(regime: Regime): string {
  switch (regime) {
    case Regime.INTEGRAL:
      return "Tempo Integral";
    case Regime.PARCIAL:
      return "Tempo Parcial";
    default:
      return "Desconhecido";
  }
}

type Utilizador = {
  permissao: Permissao;
  regime: Regime;
  username: string;
  name: string;
  email: string;
  foto?: string;
  atividade?: string;
  contratacao?: string;
};

// Componente para o diálogo de confirmação de eliminação
const DeleteUserDialog = ({ utilizador, onDelete }: { utilizador: any; onDelete: () => void }) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar Utilizador</AlertDialogTitle>
          <AlertDialogDescription>
            Tem a certeza que pretende apagar o utilizador {utilizador.name}? Esta ação não pode ser
            revertida.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            onClick={onDelete}
          >
            Apagar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const Users = () => {
  const router = useRouter();
  const utils = api.useUtils();
  const [estadoFilter, setEstadoFilter] = useState<"all" | Permissao>("all");
  const [regimeFilter, setRegimeFilter] = useState<"all" | Regime>("all");

  // Prefetch na montagem do componente
  useEffect(() => {
    void utils.utilizador.findAll.prefetch();
  }, [utils]);

  // Fetch all data at once since we're using client-side pagination
  const { data, isLoading } = api.utilizador.findAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutos de staleTime
    refetchOnWindowFocus: true,
  });

  // Extrair utilizadores usando a função utilitária
  const utilizadores = useMemo(() => extrairUtilizadores(data), [data]);

  // Aplicar filtros aos utilizadores
  const utilizadoresFiltrados = useMemo(() => {
    if (!utilizadores) return [];
    
    return utilizadores.filter((utilizador: Utilizador) => {
      const passouFiltroPermissao = estadoFilter === "all" || utilizador.permissao === estadoFilter;
      const passouFiltroRegime = regimeFilter === "all" || utilizador.regime === regimeFilter;
      
      return passouFiltroPermissao && passouFiltroRegime;
    });
  }, [utilizadores, estadoFilter, regimeFilter]);

  const handleRowClick = (utilizador: any) => {
    router.push(`/utilizadores/${utilizador.username}`);
  };

  // Configuração dos filtros
  const permissaoOptions = [
    { 
      id: "all", 
      label: "Todas as permissões", 
      value: "all",
    },
    {
      id: "ADMIN",
      label: "Administrador",
      value: "ADMIN",
      badge: {
        status: "ADMIN",
        variant: "permissao",
      },
    },
    {
      id: "GESTOR",
      label: "Gestor",
      value: "GESTOR",
      badge: {
        status: "GESTOR",
        variant: "permissao",
      },
    },
    {
      id: "COMUM",
      label: "Utilizador",
      value: "COMUM",
      badge: {
        status: "COMUM",
        variant: "permissao",
      },
    },
  ];

  const regimeOptions = [
    { 
      id: "all", 
      label: "Todos os regimes", 
      value: "all",
    },
    {
      id: "INTEGRAL",
      label: "Tempo Integral",
      value: "INTEGRAL",
      badge: {
        status: "INTEGRAL",
        variant: "regime",
      },
    },
    {
      id: "PARCIAL",
      label: "Tempo Parcial",
      value: "PARCIAL",
      badge: {
        status: "PARCIAL",
        variant: "regime",
      },
    },
  ];

  const filterConfigs = [
    {
      id: "permissao",
      label: "Permissão",
      value: estadoFilter,
      onChange: (value: string) => setEstadoFilter(value as "all" | Permissao),
      options: permissaoOptions,
    },
    {
      id: "regime",
      label: "Regime",
      value: regimeFilter,
      onChange: (value: string) => setRegimeFilter(value as "all" | Regime),
      options: regimeOptions,
    },
  ];

  // Mutation para apagar utilizador
  const { mutate: deleteUser } = api.utilizador.delete.useMutation({
    onSuccess: () => {
      toast.success("Utilizador apagado com sucesso");
      utils.utilizador.findAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao apagar utilizador: ${error.message}`);
    },
  });

  // Definição das colunas usando TanStack Table
  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Utilizador",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <SimpleAvatar utilizador={row.original} />
            <div>
              <p className="font-medium text-gray-900">{row.original?.name || "N/A"}</p>
              <p className="text-sm text-gray-500">{row.original?.atividade || "N/A"}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ getValue }) => (
          <span className="text-gray-600">{getValue<string>() || "N/A"}</span>
        ),
      },
      {
        accessorKey: "permissao",
        header: "Permissão",
        cell: ({ getValue }) => {
          const permissao = getValue<Permissao>();
          return (
            <BadgeEstado
              status={permissao}
              label={getPermissaoText(permissao)}
              variant="permissao"
            />
          );
        },
      },
      {
        accessorKey: "regime",
        header: "Regime",
        cell: ({ getValue }) => {
          const regime = getValue<Regime>();
          return <BadgeEstado status={regime} label={getRegimeText(regime)} variant="regime" />;
        },
      },
      {
        accessorKey: "contratacao",
        header: "Data de Contratação",
        cell: ({ getValue }) => {
          const date = getValue<string | null>();
          return (
            <div className="inline-flex items-center gap-2 text-slate-600">
              <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span>{date ? new Date(date).toLocaleDateString("pt-PT") : "N/A"}</span>
            </div>
          );
        },
      },
      {
        id: "actions",
        meta: { align: "center", isAction: true },
        header: () => (
          <div className="flex items-center justify-center w-full h-full">
            Ações
          </div>
        ),
        cell: ({ row }) => {
          const utilizador = row.original;
          // Não mostrar opção de apagar para admins
          if (utilizador.permissao === Permissao.ADMIN) return null;
          
          return (
            <div className="flex items-center justify-center w-full" onClick={(e) => e.stopPropagation()}>
              <DeleteUserDialog
                utilizador={utilizador}
                onDelete={() => deleteUser({ id: utilizador.id })}
              />
            </div>
          );
        },
      },
    ],
    [deleteUser]
  );

  // Cálculos estatísticos baseados no array total de utilizadores (não filtrado)
  const utilizadoresArray = Array.isArray(utilizadores) ? utilizadores : [];
  const totalUsers = utilizadoresArray.length || 0;
  const regimenIntegral =
    utilizadoresArray.filter((utilizador) => utilizador.regime === Regime.INTEGRAL).length || 0;
  const regimenParcial =
    utilizadoresArray.filter((utilizador) => utilizador.regime === Regime.PARCIAL).length || 0;
  const totalAdmins =
    utilizadoresArray.filter((utilizador) => utilizador.permissao === Permissao.ADMIN).length || 0;

  // Configuração das estatísticas
  const stats = [
    {
      icon: UsersIcon,
      label: "Total Utilizadores",
      value: totalUsers,
      iconClassName: "text-azul",
      iconContainerClassName: "bg-blue-50/70 hover:bg-blue-100/80",
    },
    {
      icon: UserCheck,
      label: "Regime Integral",
      value: regimenIntegral,
      iconClassName: "text-green-600",
      iconContainerClassName: "bg-green-50/70 hover:bg-green-100/80",
    },
    {
      icon: Clock,
      label: "Regime Parcial",
      value: regimenParcial,
      iconClassName: "text-orange-600",
      iconContainerClassName: "bg-orange-50/70 hover:bg-orange-100/80",
    },
    {
      icon: UserCog,
      label: "Administradores",
      value: totalAdmins,
      iconClassName: "text-purple-600",
      iconContainerClassName: "bg-purple-50/70 hover:bg-purple-100/80",
    },
  ];

  return (
    <ProtectedRoute blockPermission={"COMUM" as Permissao}>
      <div className="h-auto bg-[#F7F9FC] p-8">
        <div className="max-w-8xl mx-auto space-y-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">Utilizadores</h1>
              <p className="text-sm text-slate-500">Consulte os utilizadores do sistema</p>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <NovoUtilizadorModal />
            </div>
          </div>

          <StatsGrid stats={stats} />

          {isLoading ? (
            <TableSkeleton />
          ) : (
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow">
              <TabelaDados<any>
                data={utilizadoresFiltrados}
                isLoading={isLoading}
                columns={columns}
                itemsPerPage={8}
                searchPlaceholder="Procurar utilizadores..."
                filterConfigs={filterConfigs}
                onRowClick={handleRowClick}
                emptyStateMessage={{
                  title: "Nenhum utilizador encontrado",
                  description:
                    "Experimente ajustar os filtros de pesquisa ou remover o texto na pesquisa para ver todos os utilizadores.",
                }}
                hideActionForPermissions
              />
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Users;
