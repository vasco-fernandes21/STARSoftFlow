"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
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
  BarChart2
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLayout } from "@/components/common/PageLayout";
import { api } from "@/trpc/react";
import { Permissao, Regime, User as PrismaUser, Projeto, Workpackage, AlocacaoRecurso } from "@prisma/client";
import { AlocacoesDetalhadas } from "@/app/utilizadores/[username]/AlocacoesDetalhadas";

// Definir interfaces estendidas para os tipos do Prisma
interface UserWithDetails extends Omit<PrismaUser, 'informacoes'> {
  informacoes?: string | null;
}

interface WorkpackageWithAlocacoes extends Workpackage {
  alocacoes: AlocacaoRecurso[];
}

interface ProjetoWithWorkpackages extends Projeto {
  workpackages: WorkpackageWithAlocacoes[];
}

// Mapeamento de Permissões
const PERMISSAO_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  COMUM: 'Comum'
};

// Mapeamento de Regimes
const REGIME_LABELS: Record<string, string> = {
  PARCIAL: 'Parcial',
  INTEGRAL: 'Integral'
};

// Componente de visualização de estatísticas
const StatCard = ({
  icon,
  label,
  value,
  trend,
  trendUp
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
}) => (
  <Card className="border-none shadow-md hover:shadow-lg transition-shadow duration-300">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="bg-blue-50 rounded-full p-3">
          {icon}
        </div>
        {trend && (
          <Badge variant={trendUp ? "default" : "destructive"} className="ml-auto">
            {trend}
          </Badge>
        )}
      </div>
      <div className="mt-3">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
    </CardContent>
  </Card>
);

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
}) => (
  <div className="flex items-center gap-3 py-3">
    <div className="bg-blue-50 rounded-full p-2 flex-shrink-0">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm text-gray-500">{label}</p>
      {badge ? (
        <Badge variant="outline" className="mt-1 font-medium">
          {value}
        </Badge>
      ) : (
        <p className="text-sm font-medium truncate">{value}</p>
      )}
    </div>
  </div>
);

// Função para obter a cor baseada na ocupação
function getOcupacaoColor(ocupacao: number): string {
  if (ocupacao >= 80) return "bg-green-400";
  if (ocupacao >= 50) return "bg-blue-400";
  if (ocupacao >= 30) return "bg-amber-400";
  return "bg-slate-200";
}

// Função para obter a classe de badge baseada na ocupação
function getOcupacaoBadgeClass(ocupacao: number): string {
  if (ocupacao >= 80) return "bg-green-50 text-green-600 border-green-100";
  if (ocupacao >= 50) return "bg-blue-50 text-blue-600 border-blue-100";
  if (ocupacao >= 30) return "bg-amber-50 text-amber-600 border-amber-100";
  return "bg-slate-50 text-slate-400 border-slate-200";
}

// Função auxiliar para formatar datas
const formatarDataSegura = (ano: string | number, mes: string | number, formatString: string): string => {
  try {
    const data = new Date(Number(ano), Number(mes) - 1, 1);
    return format(data, formatString, { locale: pt });
  } catch (error) {
    return `${mes}/${ano}`;
  }
};

// Componentes de conteúdo
const ProfileHeader = ({ utilizador }: { utilizador: any }) => (
  <div className="relative h-[240px] mb-10 rounded-2xl overflow-hidden shadow-xl">
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
      </div>
    </div>
    
    {/* Informações do utilizador no header */}
    <div className="absolute bottom-0 left-0 p-8 text-white w-full">
      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24 border-4 border-white/30 shadow-lg">
          {utilizador.foto ? (
            <AvatarImage src={utilizador.foto} alt={utilizador.name || ""} />
          ) : (
            <AvatarFallback className="bg-gradient-to-br from-blue-300 to-blue-500 text-white text-2xl font-semibold">
              {utilizador.name?.slice(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          )}
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">{utilizador.name}</h1>
            <Badge className="bg-white/20 text-white hover:bg-white/30 border-none">
              {utilizador.permissao}
            </Badge>
          </div>
          <p className="text-blue-50 mt-2 flex items-center">
            <Briefcase className="h-4 w-4 mr-2" />
            {utilizador.atividade || "Sem atividade definida"}
          </p>
        </div>
        
        <Button variant="outline" size="sm" className="bg-white/20 text-white border-white/40 hover:bg-white/30">
          <Download className="mr-2 h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>
    </div>
  </div>
);

export default function PerfilUtilizador() {
  const { username } = useParams<{ username: string }>();
  const [activeTab, setActiveTab] = useState<string>("info");
  
  // Dados do utilizador
  const { 
    data: utilizador, 
    isLoading 
  } = api.utilizador.getByUsername.useQuery(username as string, {
    enabled: !!username,
    refetchOnWindowFocus: false
  });

  // Buscar dados de ocupação/alocação
  const { 
    data: resumoOcupacao, 
    isLoading: isLoadingOcupacao 
  } = api.utilizador.getResumoOcupacao.useQuery(
    { userId: utilizador?.id as string },
    { enabled: !!utilizador?.id }
  );

  // Buscar dados de projetos para obter informações detalhadas (inclui alocações)
  const {
    data: projetosData,
    isLoading: isLoadingProjetos
  } = api.utilizador.getProjetosWithUser.useQuery(
    utilizador?.id as string,
    { enabled: !!utilizador?.id && activeTab === "alocacoes" }
  );

  // Processar os dados para o formato esperado pelo componente
  const alocacoesDetalhadas = useMemo(() => {
    if (!projetosData) return null;
    
    const alocacoes: Array<{
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
    }> = [];
    
    // Extrair alocações de todos os projetos e workpackages
    projetosData.forEach((projeto) => {
      projeto.workpackages.forEach((wp: { id: string; nome: string; alocacoes: any[] }) => {
        wp.alocacoes.forEach((alocacao: { ano: number; mes: number; ocupacao: any }) => {
          alocacoes.push({
            ano: alocacao.ano,
            mes: alocacao.mes,
            ocupacao: Number(alocacao.ocupacao),
            workpackage: {
              id: wp.id,
              nome: wp.nome
            },
            projeto: {
              id: projeto.id,
              nome: projeto.nome
            }
          });
        });
      });
    });
    
    return alocacoes;
  }, [projetosData]);

  // Obter texto de permissão formatado
  const getPermissaoText = (permissao: Permissao) => {
    return PERMISSAO_LABELS[permissao] || 'Desconhecido';
  };

  // Obter texto de regime formatado
  const getRegimeText = (regime: Regime) => {
    return REGIME_LABELS[regime] || 'Desconhecido';
  };

  // Formatação de data
  const formatarData = (data: Date | null | undefined) => {
    if (!data) return "Não definido";
    return format(new Date(data), "dd MMM yyyy", { locale: pt });
  };

  // Calcular anos de experiência
  const calcularAnosExperiencia = (dataContratacao: Date | null | undefined) => {
    if (!dataContratacao) return 0;
    const hoje = new Date();
    return Math.floor((hoje.getTime() - new Date(dataContratacao).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto">
          <div className="relative h-[240px] mb-8">
            <div className="absolute inset-0 rounded-2xl overflow-hidden bg-blue-100 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card className="border-none shadow-md">
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2 space-y-8">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!utilizador) {
    return (
      <PageLayout>
        <div className="container mx-auto py-16 text-center">
          <UserIcon className="h-20 w-20 mx-auto mb-6 text-blue-200" />
          <h2 className="text-3xl font-bold text-blue-900 mb-3">Utilizador não encontrado</h2>
          <p className="text-blue-600 text-lg">O utilizador que procura não existe ou foi removido.</p>
        </div>
      </PageLayout>
    );
  }

  // Preparar dados para o header
  const utilizadorHeader = {
    ...utilizador,
    permissao: getPermissaoText(utilizador.permissao as Permissao),
    regime: getRegimeText(utilizador.regime as Regime)
  };

  return (
    <PageLayout>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <ProfileHeader utilizador={utilizadorHeader} />

        {/* Layout de 2 colunas para melhor aproveitamento do espaço */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Coluna da esquerda - Detalhes do Utilizador */}
          <div className="xl:col-span-3">
            <div className="space-y-6">
              <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-blue-700 flex items-center">
                    <UserIcon className="h-5 w-5 mr-2 text-blue-500" />
                    Detalhes do Utilizador
                  </CardTitle>
                  <CardDescription>Informações pessoais e profissionais</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Informações de contacto */}
                  <div className="space-y-1">
                    <InfoItem 
                      icon={<Mail className="h-4 w-4 text-blue-500" />} 
                      label="Email" 
                      value={utilizador.email || ""}
                    />
                    <InfoItem 
                      icon={<Calendar className="h-4 w-4 text-blue-500" />} 
                      label="Data de Contratação" 
                      value={formatarData(utilizador.contratacao)}
                    />
                    <InfoItem 
                      icon={<Shield className="h-4 w-4 text-blue-500" />} 
                      label="Permissão" 
                      value={getPermissaoText(utilizador.permissao as Permissao)}
                      badge
                    />
                    <InfoItem 
                      icon={<Clock className="h-4 w-4 text-blue-500" />} 
                      label="Regime" 
                      value={getRegimeText(utilizador.regime as Regime)}
                      badge
                    />
                    <InfoItem 
                      icon={<Calendar className="h-4 w-4 text-blue-500" />} 
                      label="Anos na Equipa" 
                      value={`${calcularAnosExperiencia(utilizador?.contratacao) || 0} anos`}
                    />
                    {resumoOcupacao?.ocupacaoMesAtual !== undefined && (
                      <InfoItem 
                        icon={<BarChart2 className="h-4 w-4 text-blue-500" />} 
                        label="Ocupação Atual" 
                        value={`${Math.round((resumoOcupacao.ocupacaoMesAtual || 0) * 100)}%`}
                      />
                    )}
                    {resumoOcupacao?.projetosAtivos !== undefined && (
                      <InfoItem 
                        icon={<Briefcase className="h-4 w-4 text-blue-500" />} 
                        label="Projetos Ativos" 
                        value={`${resumoOcupacao.projetosAtivos || 0}`}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Coluna da direita - Tabs de Informação */}
          <div className="xl:col-span-9 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">
                  <FileText className="h-4 w-4 mr-2" />
                  Currículo
                </TabsTrigger>
                <TabsTrigger value="alocacoes">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  Alocações
                </TabsTrigger>
                <TabsTrigger value="projetos">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Projetos
                </TabsTrigger>
              </TabsList>

              {/* Tab de Informações/CV */}
              <TabsContent value="info" className="mt-6">
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle>Currículo Resumido</CardTitle>
                    <CardDescription>
                      Informações profissionais e experiência
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      {(utilizador as UserWithDetails).informacoes ? (
                        <div className="text-gray-700 whitespace-pre-wrap">
                          {(utilizador as UserWithDetails).informacoes}
                        </div>
                      ) : (
                        <div className="text-gray-500 italic">
                          Este utilizador ainda não tem um currículo resumido definido.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab de Alocações */}
              <TabsContent value="alocacoes" className="mt-6">
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart2 className="h-5 w-5 text-blue-500" />
                      Alocações Mensais
                    </CardTitle>
                    <CardDescription>
                      Visão geral da ocupação ao longo do tempo. Clique em um mês para ver detalhes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingProjetos ? (
                      <div className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : alocacoesDetalhadas ? (
                      <AlocacoesDetalhadas alocacoes={alocacoesDetalhadas} />
                    ) : (
                      <div className="text-center py-12">
                        <Calendar className="h-12 w-12 mx-auto text-gray-300" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">
                          Sem alocações registadas
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">
                          Este utilizador não tem alocações definidas no sistema.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab de Projetos */}
              <TabsContent value="projetos" className="mt-6">
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle>Projetos Ativos</CardTitle>
                    <CardDescription>
                      Pacotes de trabalho ativos para este utilizador
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingOcupacao ? (
                      <div className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : resumoOcupacao?.workpackagesAtivos ? (
                      <div className="text-center py-8">
                        <div className="flex justify-center mb-4">
                          <div className="px-6 py-3 bg-blue-100 rounded-full">
                            <Briefcase className="h-6 w-6 text-blue-500" />
                          </div>
                        </div>
                        <h3 className="text-lg font-medium">
                          {resumoOcupacao?.projetosAtivos || 0} Projetos Ativos
                        </h3>
                        <p className="text-gray-500 mt-1">
                          Com {resumoOcupacao?.workpackagesAtivos || 0} pacotes de trabalho
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Briefcase className="h-12 w-12 mx-auto text-gray-300" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">
                          Sem projetos ativos
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">
                          Este utilizador não está alocado a nenhum projeto.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 