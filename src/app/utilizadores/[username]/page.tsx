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
  Pencil,
  Download,
  Link2,
  ExternalLink,
  ChevronDown,
  MessageSquare,
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
  projetoEstado: ProjetoEstado;
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
        estado: alocacao.projetoEstado,
      },
      mes: alocacao.mes,
      ano: alocacao.ano,
      ocupacao: alocacao.ocupacao,
    }));

    return {
      real: transformarAlocacoes(alocacoes.real),
      submetido: transformarAlocacoes(alocacoes.submetido),
      anos: alocacoes.anos,
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
      <div className="min-h-screen bg-gray-100">
        {/* Header com navegação */}
        <div className="bg-white shadow">
          <div className="container mx-auto px-4">
            <div className="flex h-14 items-center justify-between">
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/utilizadores")}
                  className="text-gray-600 hover:text-azul"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  <span className="text-sm">Utilizadores</span>
                </Button>
                <span className="text-gray-400">/</span>
                <span className="text-sm font-medium text-azul">{utilizadorComDetalhes.name}</span>
              </div>
              <div>
                <Button variant="outline" size="sm" className="text-sm">
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Exportar Perfil
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-5">
          {/* Banner e foto de perfil */}
          <div className="mb-6 overflow-hidden rounded-lg bg-white shadow">
            {/* Banner */}
            <div className="h-48 bg-gradient-to-r from-azul/80 to-blue-500/90 relative">
              <Button 
                variant="ghost" 
                size="icon"
                className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/20 text-white hover:bg-white/30"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Perfil & Ações */}
            <div className="relative px-8 pb-5">
              {/* Avatar */}
              <div className="absolute -top-16 left-8">
                <div className="relative group">
                  <Avatar className="h-32 w-32 border-4 border-white bg-white shadow-xl">
                    {utilizador?.foto ? (
                      <AvatarImage src={utilizador.foto} alt={utilizador.name || ""} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-azul to-blue-500 text-4xl font-semibold text-white">
                        {utilizador?.name?.slice(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-white shadow-md transition-all duration-300 hover:scale-110 hover:bg-azul/5 opacity-0 group-hover:opacity-100"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Informação do perfil */}
              <div className="mt-16 flex flex-col md:flex-row md:items-start md:justify-between">
                <div className="mb-4 md:mb-0">
                  <div className="flex items-center">
                    <h1 className="text-2xl font-bold text-gray-900">{utilizador?.name ?? "Nome não disponível"}</h1>
                    <div className={cn(
                      "ml-2 h-3 w-3 rounded-full",
                      utilizadorComDetalhes.regime === "INTEGRAL" ? "bg-emerald-500" : "bg-amber-500"
                    )}></div>
                  </div>
                  <p className="text-md text-gray-600">{utilizador?.atividade ?? "Sem atividade definida"}</p>
                  <p className="mt-1 flex items-center text-sm text-gray-500">
                    <MapPin className="mr-1 h-3.5 w-3.5" />
                    <span>Portugal</span>
                    <span className="mx-1.5">•</span>
                    <span>{getPermissaoText(utilizadorComDetalhes.permissao)}</span>
                    <span className="mx-1.5">•</span>
                    {new Set(alocacoesDetalhadas.map((a) => a.projeto.id)).size || 0} projetos ativos
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="h-9 rounded-full bg-azul text-white hover:bg-azul/90">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Mensagem
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 rounded-full border-gray-300 hover:bg-gray-50">
                    <span>Mais</span>
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Conteúdo principal */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Coluna da esquerda */}
            <div className="lg:col-span-8 space-y-5">
              {/* Cartão de Resumo */}
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Resumo</h2>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                
                {utilizadorComDetalhes?.informacoes ? (
                  <div className="text-gray-700 leading-relaxed">
                    {utilizadorComDetalhes.informacoes}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">
                    Sem informações adicionais disponíveis.
                  </div>
                )}
              </div>
              
              {/* Cartão de Experiência */}
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Projetos Ativos</h2>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {alocacoes?.real && alocacoes.real.length > 0 ? (
                  <div className="space-y-5">
                    {Array.from(new Set(alocacoes.real.map(a => a.projetoId))).map((projetoId) => {
                      const projeto = alocacoes.real.find(a => a.projetoId === projetoId);
                      if (!projeto) return null;
                      
                      return (
                        <div key={projetoId} className="group">
                          <div className="flex gap-4">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white">
                              <Building2 className="h-6 w-6 text-azul" />
                            </div>
                            <div className="flex-grow">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium text-gray-900">{projeto.projetoNome}</h3>
                                <Badge className={cn(
                                  "rounded-full px-2 py-0.5 text-xs",
                                  projeto.projetoEstado === "EM_DESENVOLVIMENTO" 
                                    ? "bg-emerald-100 text-emerald-700" 
                                    : "bg-amber-100 text-amber-700"
                                )}>
                                  {projeto.projetoEstado === "EM_DESENVOLVIMENTO" ? "Ativo" : "Inativo"}
                                </Badge>
                              </div>
                              <div className="mt-1 flex items-center text-sm text-gray-500">
                                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                                {projeto.mes}/{projeto.ano}
                              </div>
                              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                                Alocação mensal em workpackages deste projeto.
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 h-px w-full bg-gray-100"></div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-gray-500">Sem projetos ativos</p>
                    <Button variant="outline" className="mt-3 text-sm">
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Adicionar Projeto
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Gráfico de Alocações */}
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Alocações</h2>
                  <Badge className="bg-azul/10 text-azul">
                    {currentYear}
                  </Badge>
                </div>
                
                <div className="overflow-hidden rounded-lg border border-gray-100">
                  <TabelaAlocacoes 
                    alocacoes={alocacoesTabela}
                    viewMode={viewMode}
                    ano={currentYear}
                    onSave={() => {
                      console.log("Save triggered");
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Coluna da direita */}
            <div className="lg:col-span-4 space-y-5">
              {/* Cartão de Contacto */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Detalhes de Contacto</h2>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-azul/10 text-azul">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-sm font-medium text-azul">{utilizador?.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-azul/10 text-azul">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Membro desde</p>
                      <p className="text-sm font-medium">
                        {utilizador?.contratacao
                          ? format(new Date(utilizador?.contratacao), "MMMM yyyy", { locale: pt })
                          : "Data não definida"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-azul/10 text-azul">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tipo de Regime</p>
                      <p className="text-sm font-medium">
                        {getRegimeText(utilizadorComDetalhes.regime)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Cartão de Estatísticas */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Estatísticas</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-azul/10 text-azul">
                      <Activity className="h-5 w-5" />
                    </div>
                    <p className="text-xl font-bold text-azul">
                      {alocacoesDetalhadas.length > 0
                        ? Math.round(
                            alocacoesDetalhadas.reduce((sum, a) => sum + a.ocupacao, 0) * 100
                          ) / 100
                        : 0}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Ocupação Total</p>
                  </div>
                  
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-azul/10 text-azul">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <p className="text-xl font-bold text-azul">
                      {new Set(alocacoesDetalhadas.map((a) => a.projeto.id)).size || 0}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Projetos Ativos</p>
                  </div>
                  
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-azul/10 text-azul">
                      <Grid3X3 className="h-5 w-5" />
                    </div>
                    <p className="text-xl font-bold text-azul">
                      {new Set(alocacoesDetalhadas.map((a) => a.workpackage.id)).size || 0}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Workpackages</p>
                  </div>
                  
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-azul/10 text-azul">
                      <Shield className="h-5 w-5" />
                    </div>
                    <p className="text-xl font-bold text-azul">
                      {utilizador?.contratacao ? anosExperiencia : 0}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Anos na empresa</p>
                  </div>
                </div>
              </div>
              
              {/* Cartão de Próximo Workpackage */}
              {proximoWorkpackage && (
                <div className="rounded-lg bg-white p-6 shadow">
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">Próximo Workpackage</h2>
                  
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-medium text-gray-900">{proximoWorkpackage.nome}</h3>
                        <p className="text-sm text-gray-500">{proximoWorkpackage.projeto.nome}</p>
                      </div>
                    </div>
                    <div className="mt-3 text-sm font-medium text-emerald-600">
                      Inicia em {format(proximoWorkpackage.dataInicio, "dd MMM yyyy", {
                        locale: pt,
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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
