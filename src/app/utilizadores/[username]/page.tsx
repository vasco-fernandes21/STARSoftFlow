"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  User, 
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
import { Permissao, Regime } from "@prisma/client";

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

// Definição do tipo StatItem
interface StatItem {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description: string;
  trend: { direction: "up" | "down"; value: string } | null;
}

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

// Componente para gráfico de alocações mensais
const AlocacoesChart = ({ alocacoes }: { alocacoes: any[] }) => {
  // Organizar alocações por ano e mês
  const alocacoesPorAnoMes: Record<string, Record<number, number>> = {};
  
  alocacoes?.forEach(alocacao => {
    const { ano, mes, ocupacao } = alocacao;
    if (!alocacoesPorAnoMes[ano]) {
      alocacoesPorAnoMes[ano] = {};
    }
    alocacoesPorAnoMes[ano][mes] = Number(ocupacao) * 100;
  });

  // Obter cores baseadas na ocupação
  const getProgressColor = (ocupacao: number): string => {
    if (ocupacao >= 90) return "bg-red-500";
    if (ocupacao >= 70) return "bg-yellow-500";
    if (ocupacao >= 40) return "bg-blue-500";
    return "bg-green-500";
  };

  // Formatação de data
  const formatarMes = (mes: number): string => {
    const data = new Date(2023, mes - 1, 1);
    return format(data, 'MMM', { locale: pt });
  };

  return (
    <div className="space-y-6">
      {Object.keys(alocacoesPorAnoMes).sort().map(ano => (
        <Card key={ano} className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">{ano}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
              const ocupacao = alocacoesPorAnoMes[ano]?.[mes] || 0;
              return (
                <div key={`${ano}-${mes}`} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{formatarMes(mes)}</span>
                    <span className="text-sm text-gray-500">{ocupacao.toFixed(0)}%</span>
                  </div>
                  <Progress 
                    value={ocupacao} 
                    max={100} 
                    className={`h-2 ${getProgressColor(ocupacao)}`} 
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

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
          <div className="relative h-[200px] mb-8">
            <div className="absolute inset-0 rounded-2xl overflow-hidden bg-blue-100 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card className="border-none shadow-md">
                <CardContent className="p-6 space-y-6">
                  <div className="flex flex-col items-center">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-6 w-40 mt-4" />
                    <Skeleton className="h-4 w-32 mt-2" />
                  </div>
                  <Separator />
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
          <User className="h-20 w-20 mx-auto mb-6 text-blue-200" />
          <h2 className="text-3xl font-bold text-blue-900 mb-3">Utilizador não encontrado</h2>
          <p className="text-blue-600 text-lg">O utilizador que procura não existe ou foi removido.</p>
        </div>
      </PageLayout>
    );
  }

  // Estatísticas para mostrar
  const stats: StatItem[] = [
    {
      title: "Anos na Equipa",
      value: calcularAnosExperiencia(utilizador?.contratacao) || 0,
      icon: <Calendar className="h-5 w-5 text-blue-500" />,
      description: `Desde ${formatarData(utilizador?.contratacao)}`,
      trend: null
    },
    {
      title: "Ocupação Atual",
      value: Math.round((resumoOcupacao?.ocupacaoMesAtual || 0) * 100),
      icon: <BarChart2 className="h-5 w-5 text-blue-500" />,
      description: resumoOcupacao?.ocupacaoMesAtual && resumoOcupacao.ocupacaoMesAtual > 0.7 
        ? "Alta ocupação" 
        : "Ocupação normal",
      trend: resumoOcupacao?.ocupacaoMesAtual && resumoOcupacao.ocupacaoMesAtual > 0.7 
        ? { direction: "up", value: "Alta" } 
        : null
    },
    {
      title: "Projetos Ativos",
      value: resumoOcupacao?.projetosAtivos || 0,
      icon: <Briefcase className="h-5 w-5 text-blue-500" />,
      description: `Com ${resumoOcupacao?.workpackagesAtivos || 0} pacotes de trabalho`,
      trend: null
    },
    {
      title: "Regime",
      value: utilizador?.regime ? getRegimeText(utilizador.regime as Regime) : "-",
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      description: "Tipo de contratação",
      trend: null
    }
  ];

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header com banner de fundo */}
        <div className="relative h-[220px] mb-8">
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500">
              <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 p-8 text-white">
            <h1 className="text-3xl font-bold">Perfil do Utilizador</h1>
            <p className="text-blue-100 mt-1">Informação detalhada e resumo de alocações</p>
          </div>
        </div>

        {/* Conteúdo principal em grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna da esquerda - Perfil */}
          <div className="lg:col-span-1">
            <Card className="border-none shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6 space-y-6">
                {/* Avatar e nome */}
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                    {utilizador.foto ? (
                      <AvatarImage src={utilizador.foto} alt={utilizador.name || ""} />
                    ) : (
                      <AvatarFallback className="bg-blue-100 text-blue-800 text-xl">
                        {utilizador.name?.slice(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <h2 className="text-xl font-bold mt-4">{utilizador.name}</h2>
                  <p className="text-gray-500">{utilizador.atividade || "Sem atividade definida"}</p>
                  <Badge className="mt-2" variant="outline">
                    {getPermissaoText(utilizador.permissao as Permissao)}
                  </Badge>
                </div>

                <Separator />

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
                </div>

                <Separator />

                {/* Ações */}
                <div className="flex justify-center">
                  <Button variant="outline" className="w-full" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Relatório
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Estatísticas do Utilizador */}
            <div className="grid grid-cols-1 gap-4 mt-6">
              {stats.map((stat, index) => (
                <StatCard
                  key={index}
                  icon={stat.icon}
                  label={stat.title}
                  value={stat.value}
                  trend={stat.trend?.value}
                  trendUp={stat.trend?.direction === "up"}
                />
              ))}
            </div>
          </div>

          {/* Coluna da direita - Tabs de Informação */}
          <div className="lg:col-span-2 space-y-6">
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
                      {utilizador.informacoes ? (
                        <div className="text-gray-700 whitespace-pre-wrap">
                          {utilizador.informacoes}
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
                    <CardTitle>Alocações Mensais</CardTitle>
                    <CardDescription>
                      Visão geral da ocupação ao longo do tempo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingOcupacao ? (
                      <div className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : resumoOcupacao?.ocupacaoMesAtual !== undefined ? (
                      <div className="text-center py-12">
                        <Calendar className="h-12 w-12 mx-auto text-blue-300" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">
                          Ocupação atual: {(resumoOcupacao.ocupacaoMesAtual * 100).toFixed(0)}%
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">
                          Ocupação média anual: {(resumoOcupacao.ocupacaoMediaAnual * 100).toFixed(0)}%
                        </p>
                      </div>
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