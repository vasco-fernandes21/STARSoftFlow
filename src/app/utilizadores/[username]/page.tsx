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
  ArrowLeft,
  FileText,
  UserCog,
  Send,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import type { Permissao, Regime, ProjetoEstado } from "@prisma/client";
import { TabelaAlocacoes } from "./components/TabelaAlocacoes";
import { z } from "zod";
import { toast } from "sonner";

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
});

export default function PerfilUtilizador() {
  const router = useRouter();
  const params = useParams<{ username: string }>();
  const username = params?.username || "";

  // Estados
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

  // Estado de carregamento geral
  const isLoading = isLoadingUtilizador || isLoadingAlocacoes;

  // Resetar para modo real quando não houver dados submetidos
  useEffect(() => {
    if (viewMode === 'submetido' && !alocacoes?.submetido) {
      setViewMode('real');
      toast("Voltando para dados reais pois não existem dados submetidos.");
    }
  }, [viewMode, alocacoes?.submetido]);

  // Mutation para convidar utilizador
  const convidarUtilizadorMutation = api.utilizador.convidarUtilizador.useMutation({
    onSuccess: () => {
      toast("O utilizador receberá um email para definir a sua password.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Função para enviar convite
  const handleEnviarConvite = async () => {
    if (!utilizador?.email) return;
    
    try {
      await convidarUtilizadorMutation.mutate({ email: utilizador.email });
    } catch (error) {
      console.error("Erro ao enviar convite:", error);
    }
  };

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
    };

    return (
      <div className="h-auto bg-[#F7F9FC] p-8">
        <div className="max-w-8xl mx-auto space-y-8">
          {/* Breadcrumb/Navegação */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
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

          {/* Header com informações essenciais - Estilo Framer-like */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pt-4 pb-8 border-b border-slate-200/80">
            {/* Lado Esquerdo: Avatar e Info */}
            <div className="flex items-center gap-5">
              <Avatar className="h-24 w-24 flex-shrink-0 shadow-lg border-4 border-white">
                <AvatarImage 
                  src={`${process.env.NEXT_PUBLIC_BLOB_URL}/fotos-perfil/${utilizadorComDetalhes.id}/foto.jpg`} 
                  alt={utilizadorComDetalhes.name || ""}
                  onError={(e) => {
                    e.currentTarget.src = "/images/default-avatar.png";
                  }}
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-4xl font-semibold text-white">
                  {utilizadorComDetalhes.name?.slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1.5">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{utilizadorComDetalhes.name}</h1>
                <p className="text-base text-slate-600">{utilizadorComDetalhes.atividade}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-slate-400" />{utilizadorComDetalhes.email}</span>
                  <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-slate-400" />{getPermissaoText(utilizadorComDetalhes.permissao)}</span>
                  <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-slate-400" />{getRegimeText(utilizadorComDetalhes.regime)}</span>
                  {utilizadorComDetalhes.contratacao && (
                    <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-slate-400" />Membro desde {format(new Date(utilizadorComDetalhes.contratacao), "MMM yyyy", { locale: pt })}</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Adicionar botão de Novo Convite */}
            <div className="flex-shrink-0">
              <Button
                onClick={handleEnviarConvite}
                disabled={convidarUtilizadorMutation.status === "pending"}
                className="bg-azul text-white hover:bg-azul/90 transition-colors"
              >
                {convidarUtilizadorMutation.status === "pending" ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white mr-2" />
                    A enviar...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Novo Convite
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Conteúdo Principal - CV e Tabela */}
          <div className="space-y-8">
            {/* Card Short CV */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-slate-500" />
                  <h3 className="text-base font-medium text-slate-700">Short CV</h3>
                </div>
                {/* Adicionar botão de edição aqui se necessário */}
                {/* <Button variant="ghost" size="icon" className="ml-auto h-7 w-7 p-0"><Pencil className="h-4 w-4" /></Button> */}
              </div>
              <div className="text-slate-700 text-sm whitespace-pre-line">
                {utilizadorComDetalhes.informacoes || <span className="italic text-slate-400">Sem informações de CV disponíveis.</span>}
              </div>
            </div>

            {/* Tabela de Alocações - Full Width */}
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
