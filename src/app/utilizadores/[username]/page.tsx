"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  User as UserIcon, 
  Mail, 
  Calendar, 
  Briefcase, 
  Shield, 
  Clock, 
  Download,
  FileText,
  Layers,
  BarChart2,
  ArrowLeft,
  Edit,
  MapPin,
  Hash,
  Plus,
  Users,
  LineChart,
  CalendarClock,
  DollarSign,
  Settings,
  Activity,
  ChevronRight,
  Filter,
  Building2,
  GraduationCap,
  Award,
  Globe,
  Phone,
  Linkedin,
  Camera,
  ExternalLink,
  Send,
  Share2,
  PieChart,
  Grid3X3,
  Zap
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import { Permissao, Regime, User as PrismaUser } from "@prisma/client";
import { cn } from "@/lib/utils";
import { AlocacoesDetalhadas } from "./AlocacoesDetalhadas";
import { TabelaAlocacoes } from "./TabelaAlocacoes";

// Interfaces e mapeamentos
interface UserWithDetails {
  id: string;
  name?: string | null;
  email?: string | null;
  username?: string | null;
  permissao: Permissao;
  regime: Regime;
  atividade?: string | null;
  foto?: string | null;
  contratacao?: Date | null;
  emailVerified?: Date | null;
  informacoes?: string | null;
}

// Interface para os dados recebidos da API
interface AlocacaoAPI {
  mes: number;
  ano: number;
  ocupacao: number;
}

interface Workpackage {
  id: string;
  nome: string;
  descricao: string;
  inicio: Date;
  fim: Date;
  estado: string;
  alocacoes: AlocacaoAPI[];
}

interface Projeto {
  id: string;
  nome: string;
  descricao: string;
  inicio: Date;
  fim: Date;
  workpackages: Workpackage[];
}

// Interface para o componente AlocacoesDetalhadas
interface AlocacaoDetalhada {
  ano: number | string;
  mes: number;
  ocupacao: number;
  workpackage: {
    id: string;
    nome: string;
  };
  projeto: {
    id: string;
    nome: string;
  };
}

// Interface para o componente TabelaAlocacoes
interface AlocacaoOriginal {
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
  };
}

// Interface para o próximo workpackage
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
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  COMUM: 'Comum'
};

const REGIME_LABELS: Record<string, string> = {
  PARCIAL: 'Parcial',
  INTEGRAL: 'Integral'
};

// Componente de informação com ícone
const InfoItem = ({
  icon,
  label,
  value,
  badge = false
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: boolean;
}) => {
  return (
    <div className="flex items-center gap-3 py-3 group hover:bg-azul/5 px-3 rounded-xl transition-all duration-200">
      <div className="bg-azul/10 text-azul rounded-xl p-2.5 flex-shrink-0 group-hover:bg-azul/20 group-hover:scale-105 transition-all duration-300">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-500">{label}</p>
        {badge ? (
          <Badge variant="outline" className="mt-1.5 font-medium border-azul/20 text-azul bg-azul/5 px-2.5 py-1">
            {value}
          </Badge>
        ) : (
          <p className="text-sm font-medium truncate text-gray-700 group-hover:translate-x-1 transition-transform duration-300">{value}</p>
        )}
      </div>
    </div>
  );
};

export default function PerfilUtilizador() {
  const router = useRouter();
  const { username } = useParams<{ username: string }>();
  const [activeTab, setActiveTab] = useState<string>("perfil");
  
  // Dados do utilizador
  const { 
    data: utilizador, 
    isLoading 
  } = api.utilizador.getByUsername.useQuery(username as string, {
    enabled: !!username,
    refetchOnWindowFocus: false
  });

  // Dados das alocações
  const { data: projetos } = api.utilizador.getProjetosWithUser.useQuery(
    utilizador?.id ?? "",
    {
      enabled: !!utilizador?.id,
      refetchOnWindowFocus: false
    }
  );

  // Preparar dados para os componentes
  const alocacoesDetalhadas: AlocacaoDetalhada[] = projetos?.flatMap((projeto: Projeto) => 
    projeto.workpackages.flatMap((wp: Workpackage) => 
      wp.alocacoes.map((alocacao) => ({
        ...alocacao,
        ocupacao: Number(alocacao.ocupacao),
        projeto: {
          id: projeto.id,
          nome: projeto.nome
        },
        workpackage: {
          id: wp.id,
          nome: wp.nome
        }
      }))
    )
  ) ?? [];

  const alocacoesTabela: AlocacaoOriginal[] = projetos?.flatMap((projeto: Projeto) => 
    projeto.workpackages.flatMap((wp: Workpackage) => 
      wp.alocacoes.map((alocacao) => ({
        ...alocacao,
        ocupacao: Number(alocacao.ocupacao),
        projeto: {
          id: projeto.id,
          nome: projeto.nome
        },
        workpackage: {
          id: wp.id,
          nome: wp.nome
        }
      }))
    )
  ) ?? [];

  // Funções auxiliares
  const getPermissaoText = (permissao: Permissao) => {
    return PERMISSAO_LABELS[permissao] || 'Desconhecido';
  };

  const getRegimeText = (regime: Regime) => {
    return REGIME_LABELS[regime] || 'Desconhecido';
  };

  const formatarData = (data: Date | null | undefined) => {
    if (!data) return "Não definido";
    return format(new Date(data), "dd MMM yyyy", { locale: pt });
  };

  const calcularAnosExperiencia = (dataContratacao: Date | null | undefined) => {
    if (!dataContratacao) return 0;
    const hoje = new Date();
    return Math.floor((hoje.getTime() - new Date(dataContratacao).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  // Encontrar o próximo workpackage (com data de início mais próxima)
  const proximoWorkpackage = useMemo<ProximoWorkpackage | null>(() => {
    if (!projetos || projetos.length === 0) return null;
    
    const agora = new Date();
    let candidato: ProximoWorkpackage | null = null;
    let menorDiferenca = Infinity;
    
    projetos.forEach((projeto: Projeto) => {
      projeto.workpackages.forEach((wp: Workpackage) => {
        const dataInicio = new Date(wp.inicio);
        
        // Considerar apenas workpackages futuros
        if (dataInicio > agora) {
          const diferenca = dataInicio.getTime() - agora.getTime();
          
          if (diferenca < menorDiferenca) {
            menorDiferenca = diferenca;
            candidato = {
              id: wp.id,
              nome: wp.nome,
              dataInicio: dataInicio,
              projeto: {
                id: projeto.id,
                nome: projeto.nome
              }
            };
          }
        }
      });
    });
    
    return candidato;
  }, [projetos]);

  // Estado de carregamento
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 relative animate-spin">
          <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-azul/30"></div>
          <div className="absolute inset-0 rounded-full border-t-2 border-azul animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Estado sem utilizador
  if (!utilizador) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
          <div className="bg-gray-50 p-8 flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Briefcase className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Utilizador não encontrado</h2>
            <p className="text-gray-500 text-center mb-6">
              Não conseguimos encontrar o perfil que procura. O utilizador pode ter sido removido ou o URL está incorreto.
            </p>
          </div>
          <div className="p-6 bg-white">
            <Button 
              onClick={() => router.push('/utilizadores')}
              className="w-full bg-azul hover:bg-azul/90 text-white group"
            >
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Voltar para a lista de utilizadores
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Preparar dados para o perfil
  const utilizadorFormatado = {
    ...utilizador,
    permissao: getPermissaoText(utilizador.permissao as Permissao),
    regime: getRegimeText(utilizador.regime as Regime)
  };

  const anosExperiencia = calcularAnosExperiencia(utilizador.contratacao);

  // Tratar o utilizador como UserWithDetails para acessar informacoes
  const utilizadorComDetalhes = utilizador as UserWithDetails;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white antialiased">
      {/* Navegação superior com botão voltar */}
      <div className="sticky top-0 z-40 backdrop-blur-sm bg-white/80 border-b border-gray-100 shadow-sm">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/utilizadores')}
            className="text-gray-600 hover:text-azul group flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span>Voltar</span>
          </Button>
          
          <div className="text-sm text-gray-500">
            <span className="font-medium">Perfil de {utilizador.name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-gray-200 text-gray-600 hover:text-azul">
              <Share2 className="h-4 w-4 mr-1" />
              Partilhar
            </Button>
          </div>
        </div>
      </div>
      
      <main className="container mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-20">
        {/* Cabeçalho do perfil */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-azul/5 to-indigo-50/30 h-48 -z-10 rounded-3xl"></div>
          
          <div className="relative pt-12 pb-8 px-6 sm:px-8 md:px-10">
            <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-azul to-indigo-400 rounded-full blur opacity-30 group-hover:opacity-60 transition-all duration-500"></div>
                <Avatar className="h-32 w-32 border-4 border-white shadow-xl relative">
                  {utilizador.foto ? (
                    <AvatarImage src={utilizador.foto} alt={utilizador.name || ""} />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-azul to-indigo-500 text-white text-4xl font-semibold">
                      {utilizador.name?.slice(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="absolute bottom-1 right-1 rounded-full bg-white shadow-md hover:bg-azul/5 hover:scale-110 transition-all duration-300 w-8 h-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                  {utilizador.name}
                </h1>
                
                <p className="text-lg text-gray-600 mb-4 max-w-xl">
                  {utilizador.atividade || "Sem atividade definida"}
                </p>
                
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-6">
                  <Badge className="bg-azul/10 hover:bg-azul/20 text-azul py-1.5 px-3 rounded-full text-sm transition-colors duration-200">
                    <Shield className="h-3.5 w-3.5 mr-1.5" /> 
                    {utilizadorFormatado.permissao}
                  </Badge>
                  
                  <Badge className="bg-azul/10 hover:bg-azul/20 text-azul py-1.5 px-3 rounded-full text-sm transition-colors duration-200">
                    <Clock className="h-3.5 w-3.5 mr-1.5" /> 
                    {utilizadorFormatado.regime}
                  </Badge>
                  
                  {utilizador.contratacao && (
                    <Badge className="bg-azul/10 hover:bg-azul/20 text-azul py-1.5 px-3 rounded-full text-sm transition-colors duration-200">
                      <Briefcase className="h-3.5 w-3.5 mr-1.5" /> 
                      {anosExperiencia} {anosExperiencia === 1 ? 'ano' : 'anos'} de experiência
                    </Badge>
                  )}
                </div>
                
                <div className="flex gap-3 justify-center sm:justify-start">
                  <Button className="bg-azul hover:bg-azul/90 text-white">
                    <Send className="h-4 w-4 mr-2" /> Contactar
                  </Button>
                  <Button variant="outline" className="border-gray-200">
                    <FileText className="h-4 w-4 mr-2" /> Ver CV
                  </Button>
                </div>
              </div>
              
              <div className="hidden md:flex flex-col gap-4 items-end ml-auto">
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex flex-col items-center transition-all hover:shadow-lg hover:scale-105">
                  <div className="bg-azul/10 text-azul rounded-full p-2 mb-2">
                    <Activity className="h-6 w-6" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    {alocacoesDetalhadas.length > 0 ? Math.round(alocacoesDetalhadas.reduce((sum, a) => sum + a.ocupacao, 0) * 100) / 100 : 0}
                  </span>
                  <span className="text-xs text-gray-500">Ocupação Total</span>
                </div>
                
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex flex-col items-center transition-all hover:shadow-lg hover:scale-105">
                  <div className="bg-indigo-100 text-indigo-600 rounded-full p-2 mb-2">
                    <Grid3X3 className="h-6 w-6" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    {new Set(alocacoesDetalhadas.map(a => a.projeto.id)).size || 0}
                  </span>
                  <span className="text-xs text-gray-500">Projetos Ativos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs de navegação */}
        <Tabs defaultValue="perfil" value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid grid-cols-3 gap-2 bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
            <TabsTrigger 
              value="perfil" 
              className={cn(
                "rounded-lg transition-all data-[state=active]:text-azul data-[state=active]:shadow-sm",
                "data-[state=active]:bg-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-500",
                "data-[state=inactive]:hover:bg-gray-50 data-[state=inactive]:hover:text-gray-700"
              )}
            >
              <Briefcase className="h-4 w-4 mr-2" />
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
              <BarChart2 className="h-4 w-4 mr-2" />
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
              <PieChart className="h-4 w-4 mr-2" />
              Estatísticas
            </TabsTrigger>
          </TabsList>
          
          {/* Conteúdo: Perfil Profissional */}
          <TabsContent value="perfil" className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                {/* Sobre */}
                <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-white to-azul/5 border-b border-gray-100 pb-4">
                    <CardTitle className="text-xl text-gray-800 flex items-center">
                      <FileText className="h-5 w-5 text-azul mr-2" />
                      Sobre
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                      Perfil e resumo profissional
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-6">
                    {utilizadorComDetalhes?.informacoes ? (
                      <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {utilizadorComDetalhes.informacoes}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <div className="bg-gray-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <FileText className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 mb-4">Este utilizador ainda não tem um currículo resumido definido.</p>
                        <Button variant="outline" className="border-gray-200 hover:border-azul/30 hover:bg-azul/5 transition-all duration-200">
                          <Edit className="h-4 w-4 mr-2" />
                          Adicionar Informações
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Projetos */}
                <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-white to-azul/5 border-b border-gray-100 pb-4">
                    <CardTitle className="text-xl text-gray-800 flex items-center">
                      <Building2 className="h-5 w-5 text-azul mr-2" />
                      Projetos Atuais
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                      Projetos em que o utilizador está alocado
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-6">
                    {projetos && projetos.length > 0 ? (
                      <div className="space-y-4">
                        {projetos.map((projeto: Projeto) => (
                          <div key={projeto.id} className="group p-4 rounded-xl border border-gray-100 hover:border-azul/20 bg-white hover:bg-azul/5 transition-all duration-200">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-medium text-gray-900 group-hover:text-azul transition-colors">{projeto.nome}</h3>
                              <Badge className="bg-emerald-50 text-emerald-600 text-xs">
                                {new Date(projeto.inicio) <= new Date() && new Date(projeto.fim) >= new Date() ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{projeto.descricao}</p>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="h-3.5 w-3.5 mr-1" />
                                <span>
                                  {formatarData(projeto.inicio)} - {formatarData(projeto.fim)}
                                </span>
                              </div>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-azul hover:bg-azul/10 px-2 -mr-2">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <div className="bg-gray-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Building2 className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 mb-4">Este utilizador não está alocado em nenhum projeto.</p>
                        <Button variant="outline" className="border-gray-200 hover:border-azul/30 hover:bg-azul/5 transition-all duration-200">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar a um Projeto
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Sidebar */}
              <div className="lg:col-span-4 space-y-6">
                {/* Informação de Contacto */}
                <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-white to-azul/5 border-b border-gray-100 pb-4">
                    <CardTitle className="text-xl text-gray-800 flex items-center">
                      <Mail className="h-5 w-5 text-azul mr-2" />
                      Contacto
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="pt-6 space-y-4">
                    <div className="p-3 hover:bg-gray-50 rounded-xl transition-all duration-200 flex items-center gap-3 text-gray-600 group">
                      <div className="bg-azul/10 text-azul p-2 rounded-full group-hover:scale-105 transition-all">
                        <Mail className="h-5 w-5" />
                      </div>
                      <span className="group-hover:text-azul transition-colors duration-200">{utilizador.email}</span>
                    </div>
                    <div className="p-3 hover:bg-gray-50 rounded-xl transition-all duration-200 flex items-center gap-3 text-gray-600 group">
                      <div className="bg-azul/10 text-azul p-2 rounded-full group-hover:scale-105 transition-all">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <span className="group-hover:text-azul transition-colors duration-200">Portugal</span>
                    </div>
                    <div className="p-3 hover:bg-gray-50 rounded-xl transition-all duration-200 flex items-center gap-3 text-gray-600 group">
                      <div className="bg-azul/10 text-azul p-2 rounded-full group-hover:scale-105 transition-all">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <span className="group-hover:text-azul transition-colors duration-200">
                        {utilizador.contratacao 
                          ? `Membro desde ${format(new Date(utilizador.contratacao), "MMMM yyyy", { locale: pt })}` 
                          : "Data não definida"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Estatísticas Rápidas - Modificada */}
                <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-white to-azul/5 border-b border-gray-100 pb-4">
                    <CardTitle className="text-xl text-gray-800 flex items-center">
                      <Zap className="h-5 w-5 text-azul mr-2" />
                      Estatísticas Rápidas
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 gap-4">
                      {/* Projetos alocados */}
                      <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4 hover:bg-azul/5 hover:shadow-sm transition-all duration-200">
                        <div className="bg-azul/10 text-azul p-3 rounded-xl">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-azul">
                            {new Set(alocacoesDetalhadas.map(a => a.projeto.id)).size || 0}
                          </p>
                          <p className="text-xs text-gray-500">Projetos alocados</p>
                        </div>
                      </div>
                      
                      {/* Workpackages */}
                      <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4 hover:bg-azul/5 hover:shadow-sm transition-all duration-200">
                        <div className="bg-indigo-100 text-indigo-600 p-3 rounded-xl">
                          <Grid3X3 className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-indigo-600">
                            {new Set(alocacoesDetalhadas.map(a => a.workpackage.id)).size || 0}
                          </p>
                          <p className="text-xs text-gray-500">Workpackages ativos</p>
                        </div>
                      </div>
                      
                      {/* Próximo workpackage */}
                      <div className="bg-gray-50 rounded-xl p-4 hover:bg-azul/5 hover:shadow-sm transition-all duration-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <p className="font-medium text-gray-700">Próximo workpackage</p>
                        </div>
                        
                        {proximoWorkpackage ? (
                          <div className="pl-2">
                            <p className="font-medium text-azul truncate mb-1">{proximoWorkpackage.nome}</p>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">
                                Projeto: <span className="text-gray-700">{proximoWorkpackage.projeto.nome}</span>
                              </span>
                              <span className="text-emerald-600 font-medium">
                                {format(proximoWorkpackage.dataInicio, "dd MMM yyyy", { locale: pt })}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 pl-2">Sem workpackages futuros</p>
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
              <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-white to-azul/5 border-b border-gray-100 pb-4">
                  <CardTitle className="text-xl text-gray-800 flex items-center">
                    <Calendar className="h-5 w-5 text-azul mr-2" />
                    Alocações Detalhadas
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    Visão detalhada por projeto e workpackage
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-6 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-azul/20 scrollbar-track-gray-100">
                  <AlocacoesDetalhadas alocacoes={alocacoesDetalhadas} />
                </CardContent>
              </Card>
              
              {/* Tabela de Alocações */}
              <div className="bg-white rounded-2xl shadow-md border-0 overflow-hidden">
                <div className="bg-gradient-to-r from-white to-azul/5 border-b border-gray-100 p-6">
                  <h3 className="text-xl text-gray-800 flex items-center mb-1">
                    <BarChart2 className="h-5 w-5 text-azul mr-2" />
                    Relatório de Alocações
                  </h3>
                  <p className="text-gray-500">
                    Tabela detalhada de alocações por projeto e workpackage
                  </p>
                </div>
                
                <TabelaAlocacoes alocacoes={alocacoesTabela} />
              </div>
            </div>
          </TabsContent>
          
          {/* Conteúdo: Estatísticas */}
          <TabsContent value="estatisticas" className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-white to-azul/5 border-b border-gray-100 pb-4">
                  <CardTitle className="text-xl text-gray-800 flex items-center">
                    <PieChart className="h-5 w-5 text-azul mr-2" />
                    Distribuição de Ocupação
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="pt-6 h-60 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <PieChart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Dados de gráfico não disponíveis.</p>
                    <p className="text-sm">Adicione mais informações para visualizar estatísticas.</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-white to-azul/5 border-b border-gray-100 pb-4">
                  <CardTitle className="text-xl text-gray-800 flex items-center">
                    <Activity className="h-5 w-5 text-azul mr-2" />
                    Tendência de Alocação
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="pt-6 h-60 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Dados de gráfico não disponíveis.</p>
                    <p className="text-sm">Adicione mais informações para visualizar estatísticas.</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden lg:col-span-2">
                <CardHeader className="bg-gradient-to-r from-white to-azul/5 border-b border-gray-100 pb-4">
                  <CardTitle className="text-xl text-gray-800 flex items-center">
                    <Building2 className="h-5 w-5 text-azul mr-2" />
                    Distribuição por Projeto
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="pt-6 h-60 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Dados de gráfico não disponíveis.</p>
                    <p className="text-sm">Adicione mais informações para visualizar estatísticas.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
} 