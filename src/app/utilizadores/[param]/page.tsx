"use client";

import React, { useState, useMemo, useEffect, lazy } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Mail,
  Calendar,
  Briefcase,
  Shield,
  ArrowLeft,
  FileText,
  UserCog,
  Send,
  Edit,
  Clock,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import type { Permissao, Regime, ProjetoEstado } from "@prisma/client";
import { z } from "zod";
import { toast } from "sonner";
import {
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Lazy load components
const TabelaAlocacoes = lazy(() => import("./components/TabelaAlocacoes").then(module => ({ default: module.TabelaAlocacoes })));
const EditarUtilizadorForm = lazy(() => import("./components/EditarUtilizadorForm").then(module => ({ default: module.EditarUtilizadorForm })));
const ConfiguracaoMensalUtilizador = lazy(() => import("./components/ConfiguracaoMensalUtilizador").then(module => ({ default: module.ConfiguracaoMensalUtilizador })));

// Interfaces e mapeamentos
interface UserWithDetails {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  atividade: string;
  contratacao: Date | null;
  username: string | null;
  permissao: Permissao;
  regime: Regime;
  informacoes: string | null;
  salario: number | null;
}

export type ViewMode = 'real' | 'submetido';

// Interface para os dados recebidos da API
interface AlocacaoAPI {
  workpackageId: string;
  workpackageNome: string;
  projetoId: string;
  projetoNome: string;
  projetoEstado: ProjetoEstado;
  mes: number;
  ano: number;
  ocupacao: number;
}

interface AlocacaoOriginal {
  ano: number;
  mes: number;
  ocupacao: number;
  workpackage: { id: string; nome: string };
  projeto: { id: string; nome: string; estado?: ProjetoEstado };
}

interface AlocacoesData {
  real: AlocacaoOriginal[];
  submetido: AlocacaoOriginal[];
  anos: number[];
}

const PERMISSAO_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  COMUM: "Comum",
};

const REGIME_LABELS: Record<string, string> = {
  PARCIAL: "Parcial",
  INTEGRAL: "Integral",
};

// Funções auxiliares
const getPermissaoText = (permissao: Permissao) => {
  return PERMISSAO_LABELS[permissao] || permissao;
};

const getRegimeText = (regime: Regime) => {
  return REGIME_LABELS[regime] || regime;
};

// Schema para validação do utilizador
const utilizadorSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  emailVerified: z
    .union([z.string().nullable(), z.date().nullable(), z.null()])
    .transform((val) => (val ? new Date(val) : null)),
  atividade: z.string().nullable().default(""),
  contratacao: z
    .union([z.string(), z.date()])
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
  username: z.string().nullable(),
  permissao: z.enum(["ADMIN", "GESTOR", "COMUM"]),
  regime: z.enum(["PARCIAL", "INTEGRAL"]),
  informacoes: z.string().nullable().optional(),
  salario: z.union([z.string(), z.number()]).transform((val) => 
    val === null || val === "" ? null : Number(val)
  ).nullable(),
});

export default function PerfilUtilizador() {
  const router = useRouter();
  const params = useParams<{ param: string }>();
  const paramValue = params?.param;

  // Estados
  const [viewMode, setViewMode] = useState<ViewMode>('real');
  const currentYear = new Date().getFullYear();
  const [showUserEdit, setShowUserEdit] = useState(false);
  const [showMonthlyConfig, setShowMonthlyConfig] = useState(false);

  // Verificar se o parâmetro é um UUID (ID)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramValue || "") || 
                 /^c[a-z0-9]{20,}$/i.test(paramValue || ""); // Formato Cuid

  // Usar a query apropriada baseado no tipo do parâmetro
  const { 
    data: utilizador,
    isLoading: isLoadingUtilizador,
    error: utilizadorError,
  } = isUUID 
    ? api.utilizador.findById.useQuery(paramValue || "", {
        enabled: !!paramValue,
        refetchOnWindowFocus: false,
      })
    : api.utilizador.getByUsername.useQuery(paramValue || "", {
        enabled: !!paramValue,
        refetchOnWindowFocus: false,
      });
  
  const { 
    data: userDetails,
    isLoading: isLoadingDetails
  } = api.utilizador.findById.useQuery(utilizador?.id || "", {
    enabled: !!utilizador?.id,
    refetchOnWindowFocus: false,
  });

  const { 
    data: alocacoes, 
    isLoading: isLoadingAlocacoes 
  } = api.utilizador.getAlocacoes.useQuery({
    userId: utilizador?.id || "",
    ano: currentYear,
  }, {
    enabled: !!utilizador?.id,
    refetchOnWindowFocus: false,
  });

  // Mutation para convidar utilizador
  const convidarUtilizadorMutation = api.utilizador.convidarUtilizador.useMutation({
    onSuccess: () => {
      toast.success("O utilizador receberá um email para definir a sua password.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Transformar dados para o formato da tabela
  const alocacoesTabela = useMemo(() => {
    if (!alocacoes?.real || !alocacoes?.pendente) return {
      real: [],
      submetido: [],
      total: 0,
      anos: []
    };

    // Converter para o formato AlocacaoOriginal
    const real = alocacoes.real.map((item): AlocacaoOriginal => ({
      ano: item.ano,
      mes: item.mes,
      ocupacao: item.ocupacao,
      workpackage: {
        id: item.workpackageId,
        nome: item.workpackageNome
      },
      projeto: {
        id: item.projetoId,
        nome: item.projetoNome,
        estado: item.projetoEstado
      }
    }));

    const submetido = alocacoes.pendente.map((item): AlocacaoOriginal => ({
      ano: item.ano,
      mes: item.mes,
      ocupacao: item.ocupacao,
      workpackage: {
        id: item.workpackageId,
        nome: item.workpackageNome
      },
      projeto: {
        id: item.projetoId,
        nome: item.projetoNome,
        estado: item.projetoEstado
      }
    }));

    return {
      real,
      submetido,
      total: real.length + submetido.length,
      anos: alocacoes.anos
    };
  }, [alocacoes]);

  // Estado de carregamento geral
  const isLoading = isLoadingUtilizador || isLoadingAlocacoes || isLoadingDetails;

  // Resetar para modo real quando não houver dados submetidos
  useEffect(() => {
    if (viewMode === 'submetido' && !alocacoes?.pendente) {
      setViewMode('real');
      toast("Voltando para dados reais pois não existem dados submetidos.");
    }
  }, [viewMode, alocacoes?.pendente]);

  // Função para enviar convite
  const handleEnviarConvite = async () => {
    if (!utilizador?.email) return;
    
    try {
      await convidarUtilizadorMutation.mutate({ email: utilizador.email });
    } catch (error) {
      console.error("Erro ao enviar convite:", error);
    }
  };

  // Handler para atualização do utilizador
  const handleUserUpdate = () => {
    toast.success("Informações do utilizador atualizadas com sucesso.");
    setShowUserEdit(false);
    // Aqui adicionaríamos lógica para atualizar o cache ou refetch
  };

  // Handler para atualização da configuração mensal
  const handleMonthlyConfigUpdate = () => {
    setShowMonthlyConfig(false);
    // Aqui adicionaríamos lógica para atualizar o cache ou refetch
  };
  
  // Renderização do componente
  let content;

  // Early return if no param is found
  if (!paramValue) {
    content = (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-800">Utilizador não encontrado</h1>
          <p className="mt-2 text-slate-500">
            O utilizador que procura não existe ou foi removido.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/utilizadores")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar à lista
          </Button>
        </div>
      </div>
    );
  }
  // Early return for loading state
  else if (isLoading) {
    content = (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500"></div>
        <span className="ml-3">A carregar...</span>
      </div>
    );
  }
  // Early return for error state
  else if (utilizadorError || !utilizador) {
    content = (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50 p-6">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 p-4">
            <FileText className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mb-2 text-2xl font-semibold text-gray-900">Erro ao carregar dados</h2>
          <p className="mb-6 text-gray-600">
            {utilizadorError?.message ||
              "Não foi possível carregar os dados do utilizador. Por favor, tente novamente mais tarde."}
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/utilizadores")}
            className="border-gray-200 transition-all duration-200 hover:border-azul/30 hover:bg-azul/5"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a lista
          </Button>
        </div>
      </div>
    );
  }
  // Normal render with data
  else {
    try {
      const validatedUser = utilizadorSchema.parse(utilizador);

      // Garantir que todos os campos necessários estão presentes
      const utilizadorComDetalhes: UserWithDetails = {
        ...validatedUser,
        id: validatedUser.id,
        name: validatedUser.name ?? "Nome não disponível",
        email: validatedUser.email ?? "Email não disponível",
        emailVerified: validatedUser.emailVerified,
        atividade: validatedUser.atividade ?? "",
        contratacao: validatedUser.contratacao,
        username: validatedUser.username ?? "Username não disponível",
        permissao: validatedUser.permissao,
        regime: validatedUser.regime,
        informacoes: validatedUser.informacoes ?? null,
        salario: validatedUser.salario,
      };
      // Monthly configuration modal/sheet
      const monthlyConfigSheet = (
        <React.Suspense fallback={<div>A carregar configuração...</div>}>
          <ConfiguracaoMensalUtilizador
            open={showMonthlyConfig}
            onOpenChange={setShowMonthlyConfig}
            onSave={handleMonthlyConfigUpdate}
            userId={utilizadorComDetalhes.regime === "PARCIAL" ? utilizadorComDetalhes.id : undefined}
          />
        </React.Suspense>
      );

      // Botões de ação do perfil
      const actionButtons = (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 lg:mt-0">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 whitespace-nowrap"
            onClick={() => setShowUserEdit(true)}
          >
            <Edit className="h-4 w-4" />
            <span>Editar Informações</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 whitespace-nowrap"
            onClick={() => setShowMonthlyConfig(true)}
          >
            <Clock className="h-4 w-4" />
            <span>Configuração Mensal</span>
          </Button>
          <Button
            size="sm"
            className="flex items-center gap-2 bg-azul hover:bg-azul/90 whitespace-nowrap"
            onClick={handleEnviarConvite}
          >
            <Send className="h-4 w-4" />
            <span>Enviar Convite</span>
          </Button>
        </div>
      );

      content = (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
          {monthlyConfigSheet}
          <Dialog open={showUserEdit} onOpenChange={setShowUserEdit}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Informações do Utilizador</DialogTitle>
              </DialogHeader>
              <React.Suspense fallback={<div>A carregar formulário...</div>}>
                <EditarUtilizadorForm
                  user={{
                    id: utilizadorComDetalhes.id,
                    name: utilizadorComDetalhes.name,
                    email: utilizadorComDetalhes.email,
                    atividade: utilizadorComDetalhes.atividade,
                    permissao: utilizadorComDetalhes.permissao,
                    regime: utilizadorComDetalhes.regime,
                    informacoes: utilizadorComDetalhes.informacoes,
                    salario: utilizadorComDetalhes.salario,
                  }}
                  onSave={handleUserUpdate}
                  onCancel={() => setShowUserEdit(false)}
                />
              </React.Suspense>
            </DialogContent>
          </Dialog>
          <div className="max-w-8xl mx-auto p-6 lg:p-8">
            {/* Breadcrumb/Navegação */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 text-slate-500 hover:text-azul"
                onClick={() => router.push("/utilizadores")}
                aria-label="Voltar aos utilizadores"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="font-medium cursor-pointer hover:text-azul" onClick={() => router.push("/utilizadores")}>Utilizadores</span>
              <span className="mx-1">/</span>
              <span className="text-slate-700 font-semibold">{utilizadorComDetalhes.name}</span>
            </div>

            {/* Header com informações essenciais - Cartão com design moderno */}
            <Card className="mb-8 overflow-hidden border-0 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="relative h-32 bg-gradient-to-r from-azul to-blue-500">
                <div className="absolute -bottom-16 left-8">
                  <Avatar className="h-32 w-32 flex-shrink-0 shadow-lg border-4 border-white bg-white">
                    <AvatarImage 
                      src={userDetails?.profilePhotoUrl || "/images/default-avatar.png"} 
                      alt={utilizadorComDetalhes.name || ""}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-4xl font-semibold text-white">
                      {utilizadorComDetalhes.name?.slice(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              
              <CardContent className="pt-20 px-8 pb-8">
                <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{utilizadorComDetalhes.name}</h1>
                      <p className="text-lg text-slate-600">{utilizadorComDetalhes.atividade}</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-3 text-sm text-slate-500">
                      <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full">
                        <Mail className="h-4 w-4 text-blue-500" />
                        {utilizadorComDetalhes.email}
                      </span>
                      <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full">
                        <Shield className="h-4 w-4 text-indigo-500" />
                        {getPermissaoText(utilizadorComDetalhes.permissao)}
                      </span>
                      <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full">
                        <Briefcase className="h-4 w-4 text-purple-500" />
                        {getRegimeText(utilizadorComDetalhes.regime)}
                      </span>
                      {utilizadorComDetalhes.contratacao && (
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full">
                          <Calendar className="h-4 w-4 text-green-500" />
                          Membro desde {format(new Date(utilizadorComDetalhes.contratacao), "MMM yyyy", { locale: pt })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
                    {actionButtons}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs de Conteúdo */}
            <Tabs defaultValue="allocations" className="mb-8">
              <TabsList className="bg-slate-100 p-1 rounded-full mb-6">
                <TabsTrigger 
                  value="allocations" 
                  className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-azul"
                >
                  Alocações
                </TabsTrigger>
                <TabsTrigger 
                  value="cv" 
                  className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-azul"
                >
                  Currículo
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="allocations" className="mt-0">
                {/* Tabela de Alocações - Full Width */}
                <React.Suspense fallback={<div>A carregar alocações...</div>}>
                  <TabelaAlocacoes 
                    alocacoes={alocacoesTabela}
                    viewMode={viewMode}
                    ano={currentYear}
                    onSave={() => {
                      console.log("Save triggered");
                    }}
                  />
                </React.Suspense>
              </TabsContent>
              
              <TabsContent value="cv" className="mt-0">
                <Card className="rounded-xl border border-gray-100 bg-white shadow-md overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-azul" />
                        <CardTitle className="text-lg font-semibold text-slate-800">Informações Curriculares</CardTitle>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full h-8 px-3 text-xs border-slate-200 hover:border-blue-200 hover:bg-blue-50"
                        onClick={() => setShowUserEdit(true)}
                      >
                        <Edit className="h-3.5 w-3.5 text-blue-500 mr-1.5" />
                        Editar
                      </Button>
                    </div>
                    <CardDescription className="text-sm text-slate-500 mt-1">
                      Resumo das informações profissionais e experiência do utilizador
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 py-5">
                    <div className="text-slate-700 whitespace-pre-line min-h-[150px]">
                      {userDetails?.informacoes || utilizadorComDetalhes.informacoes || (
                        <div className="flex flex-col items-center justify-center h-[150px] gap-3 text-center">
                          <div className="bg-slate-100 p-4 rounded-full">
                            <FileText className="h-8 w-8 text-slate-400" />
                          </div>
                          <span className="text-slate-400">Sem informações de CV disponíveis.</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 rounded-full text-xs"
                            onClick={() => setShowUserEdit(true)}
                          >
                            <Edit className="h-3 w-3 mr-1.5" />
                            Adicionar Informações
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      );
    } catch (error) {
      console.error("Erro ao validar dados do utilizador:", error);
      if (error instanceof z.ZodError) {
        console.error("Detalhes da validação:", JSON.stringify(error.errors, null, 2));
        console.error("Dados recebidos:", JSON.stringify(utilizador, null, 2));
      }
      content = (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50 p-6">
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 p-4">
              <FileText className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-gray-900">Erro ao processar dados</h2>
            <p className="mb-6 text-gray-600">
              Ocorreu um erro ao processar os dados do utilizador. Por favor, tente novamente mais
              tarde.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push("/utilizadores")}
              className="border-gray-200 transition-all duration-200 hover:border-azul/30 hover:bg-azul/5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para a lista
            </Button>
          </div>
        </div>
      );
    }
  }

  // Retorno final
  return content;
} 