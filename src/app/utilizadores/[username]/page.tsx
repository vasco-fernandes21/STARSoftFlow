"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Mail,
  Calendar,
  Briefcase,
  Shield,
  Clock,
  ArrowLeft,
  FileText,
  BarChart2,
  Edit,
  Building2,
  ChevronRight,
  Grid3X3,
  Plus,
  PieChart,
  Zap,
  Activity,
  Send,
  MapPin,
  Share2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import type { Permissao, Regime, ProjetoEstado } from "@prisma/client";
import { cn } from "@/lib/utils";
import { AlocacoesDetalhadas } from "./AlocacoesDetalhadas";
import { TabelaAlocacoes } from "./TabelaAlocacoes";
import { z } from "zod";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import type { ViewMode } from "@/types/projeto";

// Interfaces e mapeamentos
interface UserWithDetails {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  foto: string | null;
  atividade: string;
  contratacao: Date | null;
  username: string | null;
  permissao: Permissao;
  regime: Regime;
  informacoes: string | null;
}

// Interface para os dados recebidos da API
interface AlocacaoAPI {
  workpackageId: string;
  workpackageNome: string;
  projetoId: string;
  projetoNome: string;
  projetoEstado?: ProjetoEstado;
  mes: number;
  ano: number;
  ocupacao: number;
}

// Interface para alocação detalhada
interface AlocacaoDetalhada {
  ano: number;
  mes: number;
  ocupacao: number;
  workpackage: {
    id: string;
    nome: string;
  };
  projeto: {
    id: string;
    nome: string;
    estado?: ProjetoEstado;
  };
}

// Interface para próximo workpackage
interface ProximoWorkpackage {
  id: string;
  nome: string;
  dataInicio: Date;
  projeto: {
    id: string;
    nome: string;
  };
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

// Função para calcular anos de experiência
const calcularAnosExperiencia = (dataContratacao: Date | null | undefined) => {
  if (!dataContratacao) return 0;
  const hoje = new Date();
  const contratacao = new Date(dataContratacao);
  return Math.floor((hoje.getTime() - contratacao.getTime()) / (1000 * 60 * 60 * 24 * 365));
};

// Schema para validação do utilizador
const utilizadorSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  emailVerified: z
    .union([z.string().nullable(), z.date().nullable(), z.null()])
    .transform((val) => (val ? new Date(val) : null)),
  foto: z.string().nullable(),
  atividade: z.string().nullable().default(""),
  contratacao: z
    .union([z.string(), z.date()])
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
  username: z.string().nullable(),
  permissao: z.enum(["ADMIN", "GESTOR", "COMUM"]),
  regime: z.enum(["PARCIAL", "INTEGRAL"]),
  informacoes: z.string().nullable().optional(),
});

export default function PerfilUtilizador() {
  const router = useRouter();
  const params = useParams<{ username: string }>();
  const username = params?.username || "";

  // Estados
  const [activeTab, setActiveTab] = useState<string>("perfil");
  const [viewMode, setViewMode] = useState<ViewMode>('real');
  const currentYear = new Date().getFullYear();

  // Query única para dados do utilizador
  const { 
    data: utilizador,
    isLoading: isLoadingUtilizador,
    error: utilizadorError,
  } = api.utilizador.getByUsername.useQuery(username, {
    enabled: !!username,
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

  // Transformar dados para o formato da tabela
  const alocacoesTabela = useMemo(() => {
    if (!alocacoes) return {
      real: [],
      submetido: [],
      anos: [currentYear]
    };
    
    const transformarAlocacoes = (dados: AlocacaoAPI[]) => dados.map((alocacao) => ({
      workpackage: {
        id: alocacao.workpackageId,
        nome: alocacao.workpackageNome,
      },
      projeto: {
        id: alocacao.projetoId,
        nome: alocacao.projetoNome,
        estado: alocacao.projetoEstado || "RASCUNHO",
      },
      mes: alocacao.mes,
      ano: alocacao.ano,
      ocupacao: alocacao.ocupacao,
    }));

    return {
      real: transformarAlocacoes(alocacoes.real),
      submetido: transformarAlocacoes(alocacoes.submetido),
      anos: alocacoes.anos ?? [currentYear]
    };
  }, [alocacoes, currentYear]);

  // Preparar dados para os componentes
  const alocacoesDetalhadas = useMemo<AlocacaoDetalhada[]>(
    () =>
      alocacoes?.real?.map((alocacao) => ({
        ano: alocacao.ano,
        mes: alocacao.mes,
        ocupacao: alocacao.ocupacao,
        workpackage: {
          id: alocacao.workpackageId,
          nome: alocacao.workpackageNome,
        },
        projeto: {
          id: alocacao.projetoId,
          nome: alocacao.projetoNome,
          estado: alocacao.projetoEstado,
        },
      })) ?? [],
    [alocacoes?.real]
  );

  // Handler para mudança de modo de visualização
  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === 'submetido' && !projetoAprovado) {
      toast.warning("Não existem dados submetidos para visualizar.");
      return;
    }
    setViewMode(mode);
  };

  // Estado de carregamento geral
  const isLoading = isLoadingUtilizador || isLoadingAlocacoes;

  // Encontrar o próximo workpackage
  const proximoWorkpackage = useMemo<ProximoWorkpackage | null>(() => {
    if (!alocacoes?.real || alocacoes.real.length === 0) return null;

    const agora = new Date();
    const projetosUnicos = new Map<string, { nome: string; workpackages: AlocacaoAPI[] }>();
    
    alocacoes.real.forEach((alocacao) => {
      if (!projetosUnicos.has(alocacao.projetoId)) {
        projetosUnicos.set(alocacao.projetoId, {
          nome: alocacao.projetoNome,
          workpackages: [],
        });
      }
      projetosUnicos.get(alocacao.projetoId)?.workpackages.push(alocacao);
    });

    let candidato: ProximoWorkpackage | null = null;
    let menorDiferenca = Infinity;

    projetosUnicos.forEach((projeto, projetoId) => {
      const workpackagesUnicos = new Map<string, AlocacaoAPI>();
      projeto.workpackages.forEach((wp) => {
        if (!workpackagesUnicos.has(wp.workpackageId)) {
          workpackagesUnicos.set(wp.workpackageId, wp);
        }
      });

      workpackagesUnicos.forEach((wp) => {
        const dataInicio = new Date(wp.ano, wp.mes - 1);

        if (dataInicio > agora) {
          const diferenca = dataInicio.getTime() - agora.getTime();
          if (diferenca < menorDiferenca) {
            menorDiferenca = diferenca;
            candidato = {
              id: wp.workpackageId,
              nome: wp.workpackageNome,
              dataInicio,
              projeto: {
                id: projetoId,
                nome: projeto.nome,
              },
            };
          }
        }
      });
    });

    return candidato;
  }, [alocacoes?.real]);

  // Encontrar o projeto aprovado e seus dados
  const projetoAprovado = useMemo(() => {
    const aprovados = alocacoes?.real?.filter(p => p.projetoEstado === "APROVADO") ?? [];
    return aprovados.length > 0;
  }, [alocacoes?.real]);

  // Resetar para modo real quando não houver dados submetidos
  useEffect(() => {
    if (viewMode === 'submetido' && !alocacoes?.submetido) {
      setViewMode('real');
      toast.warning("Voltando para dados reais pois não existem dados submetidos.");
    }
  }, [viewMode, alocacoes?.submetido]);

  // Early return if no username is found
  if (!params?.username) {
    return (
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
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500"></div>
        <span className="ml-3">A carregar...</span>
      </div>
    );
  }

  // Early return for error state
  if (utilizadorError || !utilizador) {
    return (
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

  try {
    const validatedUser = utilizadorSchema.parse(utilizador);
    const anosExperiencia = calcularAnosExperiencia(validatedUser.contratacao);

    // Garantir que todos os campos necessários estão presentes
    const utilizadorComDetalhes: UserWithDetails = {
      ...validatedUser,
      id: validatedUser.id,
      name: validatedUser.name ?? "Nome não disponível",
      email: validatedUser.email ?? "Email não disponível",
      emailVerified: validatedUser.emailVerified,
      foto: validatedUser.foto,
      atividade: validatedUser.atividade ?? "",
      contratacao: validatedUser.contratacao,
      username: validatedUser.username ?? "Username não disponível",
      permissao: validatedUser.permissao,
      regime: validatedUser.regime,
      informacoes: validatedUser.informacoes ?? null,
    };

    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 p-6">
        <div className="container max-w-8xl mx-auto  px-4 pb-20 sm:px-6">
          {/* Breadcrumb Navigation */}
          <div className="-ml-2 mb-8 flex w-full items-center justify-between">
            <div className="flex items-center text-sm font-medium">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/utilizadores")}
                className="flex h-7 items-center gap-1 px-2 py-0 text-gray-500 hover:text-azul"
                aria-label="Voltar para utilizadores"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Utilizadores</span>
              </Button>
              <span className="mx-1 text-gray-400">/</span>
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  utilizadorComDetalhes.regime === "INTEGRAL" 
                    ? "bg-emerald-500" 
                    : "bg-amber-500"
                )}></div>
                <span className="max-w-[300px] truncate text-gray-700 sm:max-w-[400px]" title={utilizadorComDetalhes.name ?? ""}>
                  {utilizadorComDetalhes.name ?? "Nome não disponível"}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="relative mb-10">
            <div className="absolute inset-0 -z-10 h-48 rounded-3xl bg-gradient-to-r from-azul/5 to-indigo-50/30"></div>

            <div className="relative px-6 pb-8 pt-12 sm:px-8 md:px-10">
              <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
                <div className="group relative">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-azul to-indigo-400 opacity-30 blur transition-all duration-500 group-hover:opacity-60"></div>
                  <Avatar className="relative h-32 w-32 border-4 border-white shadow-xl">
                    {utilizador?.foto ? (
                      <AvatarImage src={utilizador.foto} alt={utilizador.name || ""} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-azul to-indigo-500 text-4xl font-semibold text-white">
                        {utilizador?.name?.slice(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-white shadow-md transition-all duration-300 hover:scale-110 hover:bg-azul/5"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-center sm:text-left">
                  <h1 className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl">
                    {utilizador?.name ?? "Nome não disponível"}
                  </h1>

                  <p className="mb-4 max-w-xl text-lg text-gray-600">
                    {utilizador?.atividade ?? "Sem atividade definida"}
                  </p>

                  <div className="mb-6 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <Badge className="rounded-full bg-azul/10 px-3 py-1.5 text-sm text-azul transition-colors duration-200 hover:bg-azul/20">
                      <Shield className="mr-1.5 h-3.5 w-3.5" />
                      {getPermissaoText(utilizadorComDetalhes.permissao)}
                    </Badge>

                    <Badge className="rounded-full bg-azul/10 px-3 py-1.5 text-sm text-azul transition-colors duration-200 hover:bg-azul/20">
                      <Clock className="mr-1.5 h-3.5 w-3.5" />
                      {getRegimeText(utilizadorComDetalhes.regime)}
                    </Badge>

                    {utilizador?.contratacao && (
                      <Badge className="rounded-full bg-azul/10 px-3 py-1.5 text-sm text-azul transition-colors duration-200 hover:bg-azul/20">
                        <Briefcase className="mr-1.5 h-3.5 w-3.5" />
                        {anosExperiencia} {anosExperiencia === 1 ? "ano" : "anos"} de experiência
                      </Badge>
                    )}
                  </div>

                  <div className="flex justify-center gap-3 sm:justify-start">
                    <Button className="bg-azul text-white hover:bg-azul/90">
                      <Send className="mr-2 h-4 w-4" /> Contactar
                    </Button>
                    <Button variant="outline" className="border-gray-200">
                      <FileText className="mr-2 h-4 w-4" /> Ver CV
                    </Button>
                  </div>
                </div>

                <div className="ml-auto hidden flex-col items-end gap-4 md:flex">
                  <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-4 shadow-md transition-all hover:scale-105 hover:shadow-lg">
                    <div className="mb-2 rounded-full bg-azul/10 p-2 text-azul">
                      <Activity className="h-6 w-6" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">
                      {alocacoesDetalhadas.length > 0
                        ? Math.round(
                            alocacoesDetalhadas.reduce((sum, a) => sum + a.ocupacao, 0) * 100
                          ) / 100
                        : 0}
                    </span>
                    <span className="text-xs text-gray-500">Ocupação Total</span>
                  </div>

                  <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-4 shadow-md transition-all hover:scale-105 hover:shadow-lg">
                    <div className="mb-2 rounded-full bg-indigo-100 p-2 text-indigo-600">
                      <Grid3X3 className="h-6 w-6" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">
                      {new Set(alocacoesDetalhadas.map((a) => a.projeto.id)).size || 0}
                    </span>
                    <span className="text-xs text-gray-500">Projetos Ativos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs de navegação */}
          <Tabs
            defaultValue="perfil"
            value={activeTab}
            onValueChange={setActiveTab}
            className="mb-8"
          >
            <TabsList className="grid grid-cols-3 gap-2 rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
              <TabsTrigger
                value="perfil"
                className={cn(
                  "rounded-lg transition-all data-[state=active]:text-azul data-[state=active]:shadow-sm",
                  "data-[state=active]:bg-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-500",
                  "data-[state=inactive]:hover:bg-gray-50 data-[state=inactive]:hover:text-gray-700"
                )}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                Perfil Profissional
              </TabsTrigger>
              <TabsTrigger
                value="alocacoes"
                className={cn(
                  "rounded-lg transition-all data-[state=active]:text-azul data-[state=active]:shadow-sm",
                  "data-[state=active]:bg-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-500",
                  "data-[state=inactive]:hover:bg-gray-50 data-[state=inactive]:hover:text-gray-700"
                )}
              >
                <BarChart2 className="mr-2 h-4 w-4" />
                Alocações
              </TabsTrigger>
              <TabsTrigger
                value="estatisticas"
                className={cn(
                  "rounded-lg transition-all data-[state=active]:text-azul data-[state=active]:shadow-sm",
                  "data-[state=active]:bg-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-500",
                  "data-[state=inactive]:hover:bg-gray-50 data-[state=inactive]:hover:text-gray-700"
                )}
              >
                <PieChart className="mr-2 h-4 w-4" />
                Estatísticas
              </TabsTrigger>
            </TabsList>

            {/* Conteúdo: Perfil Profissional */}
            <TabsContent value="perfil" className="pt-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="space-y-6 lg:col-span-8">
                  {/* Sobre */}
                  <Card className="overflow-hidden rounded-2xl border-0 shadow-md transition-all duration-300 hover:shadow-lg">
                    <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-white to-azul/5 pb-4">
                      <CardTitle className="flex items-center text-xl text-gray-800">
                        <FileText className="mr-2 h-5 w-5 text-azul" />
                        Sobre
                      </CardTitle>
                      <CardDescription className="text-gray-500">
                        Perfil e resumo profissional
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6">
                      {utilizadorComDetalhes?.informacoes ? (
                        <div className="whitespace-pre-wrap leading-relaxed text-gray-700">
                          {utilizadorComDetalhes.informacoes}
                        </div>
                      ) : (
                        <div className="py-10 text-center">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 p-4">
                            <FileText className="h-8 w-8 text-gray-300" />
                          </div>
                          <p className="mb-4 text-gray-500">
                            Este utilizador ainda não tem um currículo resumido definido.
                          </p>
                          <Button
                            variant="outline"
                            className="border-gray-200 transition-all duration-200 hover:border-azul/30 hover:bg-azul/5"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Adicionar Informações
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Projetos */}
                  <Card className="overflow-hidden rounded-2xl border-0 shadow-md transition-all duration-300 hover:shadow-lg">
                    <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-white to-azul/5 pb-4">
                      <CardTitle className="flex items-center text-xl text-gray-800">
                        <Building2 className="mr-2 h-5 w-5 text-azul" />
                        Projetos Atuais
                      </CardTitle>
                      <CardDescription className="text-gray-500">
                        Projetos em que o utilizador está alocado
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6">
                      {alocacoes?.real && alocacoes.real.length > 0 ? (
                        <div className="space-y-4">
                          {Array.from(new Set(alocacoes.real.map(a => a.projetoId))).map((projetoId) => {
                            const projeto = alocacoes.real.find(a => a.projetoId === projetoId);
                            if (!projeto) return null;
                            
                            return (
                              <div
                                key={projetoId}
                                className="group rounded-xl border border-gray-100 bg-white p-4 transition-all duration-200 hover:border-azul/20 hover:bg-azul/5"
                              >
                                <div className="mb-2 flex items-start justify-between">
                                  <h3 className="font-medium text-gray-900 transition-colors group-hover:text-azul">
                                    {projeto.projetoNome}
                                  </h3>
                                  <Badge className="bg-emerald-50 text-xs text-emerald-600">
                                    {projeto.projetoEstado === "EM_DESENVOLVIMENTO" ? "Ativo" : "Inativo"}
                                  </Badge>
                                </div>
                                <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                                  {projeto.projetoNome}
                                </p>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <div className="flex items-center">
                                    <Calendar className="mr-1 h-3.5 w-3.5" />
                                    <span>
                                      {projeto.mes}/{projeto.ano}
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="-mr-2 h-7 px-2 text-xs text-azul hover:bg-azul/10"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-10 text-center">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 p-4">
                            <Building2 className="h-8 w-8 text-gray-300" />
                          </div>
                          <p className="mb-4 text-gray-500">
                            Este utilizador não está alocado em nenhum projeto.
                          </p>
                          <Button
                            variant="outline"
                            className="border-gray-200 transition-all duration-200 hover:border-azul/30 hover:bg-azul/5"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar a um Projeto
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6 lg:col-span-4">
                  {/* Informação de Contacto */}
                  <Card className="overflow-hidden rounded-2xl border-0 shadow-md transition-all duration-300 hover:shadow-lg">
                    <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-white to-azul/5 pb-4">
                      <CardTitle className="flex items-center text-xl text-gray-800">
                        <Mail className="mr-2 h-5 w-5 text-azul" />
                        Contacto
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-6">
                      <div className="group flex items-center gap-3 rounded-xl p-3 text-gray-600 transition-all duration-200 hover:bg-gray-50">
                        <div className="rounded-full bg-azul/10 p-2 text-azul transition-all group-hover:scale-105">
                          <Mail className="h-5 w-5" />
                        </div>
                        <span className="transition-colors duration-200 group-hover:text-azul">
                          {utilizador?.email}
                        </span>
                      </div>
                      <div className="group flex items-center gap-3 rounded-xl p-3 text-gray-600 transition-all duration-200 hover:bg-gray-50">
                        <div className="rounded-full bg-azul/10 p-2 text-azul transition-all group-hover:scale-105">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <span className="transition-colors duration-200 group-hover:text-azul">
                          Portugal
                        </span>
                      </div>
                      <div className="group flex items-center gap-3 rounded-xl p-3 text-gray-600 transition-all duration-200 hover:bg-gray-50">
                        <div className="rounded-full bg-azul/10 p-2 text-azul transition-all group-hover:scale-105">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <span className="transition-colors duration-200 group-hover:text-azul">
                          {utilizador?.contratacao
                            ? `Membro desde ${format(new Date(utilizador?.contratacao), "MMMM yyyy", { locale: pt })}`
                            : "Data não definida"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Estatísticas Rápidas - Modificada */}
                  <Card className="overflow-hidden rounded-2xl border-0 shadow-md transition-all duration-300 hover:shadow-lg">
                    <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-white to-azul/5 pb-4">
                      <CardTitle className="flex items-center text-xl text-gray-800">
                        <Zap className="mr-2 h-5 w-5 text-azul" />
                        Estatísticas Rápidas
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 gap-4">
                        {/* Projetos alocados */}
                        <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4 transition-all duration-200 hover:bg-azul/5 hover:shadow-sm">
                          <div className="rounded-xl bg-azul/10 p-3 text-azul">
                            <Building2 className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-azul">
                              {new Set(alocacoesDetalhadas.map((a) => a.projeto.id)).size || 0}
                            </p>
                            <p className="text-xs text-gray-500">Projetos alocados</p>
                          </div>
                        </div>

                        {/* Workpackages */}
                        <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4 transition-all duration-200 hover:bg-azul/5 hover:shadow-sm">
                          <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600">
                            <Grid3X3 className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-indigo-600">
                              {new Set(alocacoesDetalhadas.map((a) => a.workpackage.id)).size || 0}
                            </p>
                            <p className="text-xs text-gray-500">Workpackages ativos</p>
                          </div>
                        </div>

                        {/* Próximo workpackage */}
                        <div className="rounded-xl bg-gray-50 p-4 transition-all duration-200 hover:bg-azul/5 hover:shadow-sm">
                          <div className="mb-2 flex items-center gap-3">
                            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                              <Calendar className="h-5 w-5" />
                            </div>
                            <p className="font-medium text-gray-700">Próximo workpackage</p>
                          </div>

                          {proximoWorkpackage ? (
                            <div className="pl-2">
                              <p className="mb-1 truncate font-medium text-azul">
                                {proximoWorkpackage.nome}
                              </p>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">
                                  Projeto:{" "}
                                  <span className="text-gray-700">
                                    {proximoWorkpackage.projeto.nome}
                                  </span>
                                </span>
                                <span className="font-medium text-emerald-600">
                                  {format(proximoWorkpackage.dataInicio, "dd MMM yyyy", {
                                    locale: pt,
                                  })}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="pl-2 text-sm text-gray-500">Sem workpackages futuros</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Conteúdo: Alocações */}
            <TabsContent value="alocacoes" className="pt-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Visão Detalhada */}
                <Card className="overflow-hidden rounded-2xl border-0 shadow-md transition-all duration-300 hover:shadow-lg">
                  <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-white to-azul/5 pb-4">
                    <CardTitle className="flex items-center text-xl text-gray-800">
                      <Calendar className="mr-2 h-5 w-5 text-azul" />
                      Alocações Detalhadas
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                      Visão detalhada por projeto e workpackage
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="scrollbar-thin scrollbar-thumb-azul/20 scrollbar-track-gray-100 max-h-[500px] overflow-y-auto pt-6">
                    <AlocacoesDetalhadas alocacoes={alocacoesDetalhadas} />
                  </CardContent>
                </Card>

                {/* Tabela de Alocações */}
                <div className="overflow-hidden rounded-2xl border-0 bg-white shadow-md">
                  <div className="border-b border-gray-100 bg-gradient-to-r from-white to-azul/5 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="mb-1 flex items-center text-xl text-gray-800">
                          <BarChart2 className="mr-2 h-5 w-5 text-azul" />
                          Relatório de Alocações
                        </h3>
                        <p className="text-gray-500">
                          Tabela detalhada de alocações por projeto e workpackage
                        </p>
                      </div>
                      {projetoAprovado && alocacoes?.submetido ? (
                        <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange} className="bg-gray-50 p-1 rounded-lg">
                          <ToggleGroupItem 
                            value="real" 
                            className={cn(
                              "px-3 py-1.5 text-sm font-medium transition-all",
                              "data-[state=on]:bg-blue-500 data-[state=on]:text-white",
                              "data-[state=off]:text-gray-600 data-[state=off]:hover:bg-gray-100",
                              "rounded-md"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            Dados Reais
                          </ToggleGroupItem>
                          <ToggleGroupItem 
                            value="submetido" 
                            className={cn(
                              "px-3 py-1.5 text-sm font-medium transition-all",
                              "data-[state=on]:bg-amber-500 data-[state=on]:text-white",
                              "data-[state=off]:text-gray-600 data-[state=off]:hover:bg-gray-100",
                              "rounded-md"
                            )}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Dados Submetidos
                          </ToggleGroupItem>
                        </ToggleGroup>
                      ) : (
                        <Badge variant="outline" className="border-gray-200 text-gray-500">
                          <FileText className="mr-2 h-4 w-4" />
                          Sem dados submetidos
                        </Badge>
                      )}
                    </div>
                  </div>

                  <TabelaAlocacoes 
                    alocacoes={alocacoesTabela}
                    viewMode={viewMode}
                    ano={currentYear}
                    onSave={() => {
                      // This is a placeholder function since we don't need to save in this view
                      console.log("Save triggered");
                    }}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Conteúdo: Estatísticas */}
            <TabsContent value="estatisticas" className="pt-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="overflow-hidden rounded-2xl border-0 shadow-md transition-all duration-300 hover:shadow-lg">
                  <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-white to-azul/5 pb-4">
                    <CardTitle className="flex items-center text-xl text-gray-800">
                      <PieChart className="mr-2 h-5 w-5 text-azul" />
                      Distribuição de Ocupação
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex h-60 items-center justify-center pt-6">
                    <div className="text-center text-gray-500">
                      <PieChart className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                      <p>Dados de gráfico não disponíveis.</p>
                      <p className="text-sm">
                        Adicione mais informações para visualizar estatísticas.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-2xl border-0 shadow-md transition-all duration-300 hover:shadow-lg">
                  <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-white to-azul/5 pb-4">
                    <CardTitle className="flex items-center text-xl text-gray-800">
                      <Activity className="mr-2 h-5 w-5 text-azul" />
                      Tendência de Alocação
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex h-60 items-center justify-center pt-6">
                    <div className="text-center text-gray-500">
                      <Activity className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                      <p>Dados de gráfico não disponíveis.</p>
                      <p className="text-sm">
                        Adicione mais informações para visualizar estatísticas.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-2xl border-0 shadow-md transition-all duration-300 hover:shadow-lg lg:col-span-2">
                  <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-white to-azul/5 pb-4">
                    <CardTitle className="flex items-center text-xl text-gray-800">
                      <Building2 className="mr-2 h-5 w-5 text-azul" />
                      Distribuição por Projeto
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex h-60 items-center justify-center pt-6">
                    <div className="text-center text-gray-500">
                      <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                      <p>Dados de gráfico não disponíveis.</p>
                      <p className="text-sm">
                        Adicione mais informações para visualizar estatísticas.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
    return (
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
