"use client";

import { useState } from "react";
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
  Camera
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
interface UserWithDetails extends Omit<PrismaUser, 'informacoes'> {
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
  const [activeTab, setActiveTab] = useState<string>("info");
  
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

  // Estado de carregamento
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-gray-200 animate-pulse"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded animate-pulse w-48"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Estado sem utilizador
  if (!utilizador) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="bg-white p-12 rounded-xl shadow-md max-w-2xl mx-auto border">
            <div className="bg-gray-50 rounded-full p-6 w-28 h-28 mx-auto mb-6">
              <UserIcon className="h-full w-full text-gray-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Utilizador não encontrado</h2>
            <p className="text-gray-600 text-lg mb-8">O utilizador que procura não existe ou foi removido do sistema.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="bg-azul text-white hover:bg-azul/90" onClick={() => router.push('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar à página inicial
              </Button>
              <Button variant="outline">
                Pesquisar utilizadores
              </Button>
            </div>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-azul/5">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Cabeçalho inspirado no ProjetoHeader */}
        <div className="flex items-center gap-6 mb-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full glass-bg hover:bg-white/70 transition-all duration-300 ease-in-out shadow-md hover:shadow-lg hover:scale-105"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 hover:text-azul transition-colors duration-300 ease-in-out" />
          </Button>
          
          {/* Avatar com efeito de destaque */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-azul to-azul/50 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
            <Avatar className="h-20 w-20 border-3 border-white shadow-lg relative">
              {utilizador.foto ? (
                <AvatarImage src={utilizador.foto} alt={utilizador.name || ""} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-azul to-azul/80 text-white text-3xl font-semibold">
                  {utilizador.name?.slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              )}
            </Avatar>
            <Button 
              variant="outline" 
              size="icon"
              className="absolute bottom-0 right-0 rounded-full bg-white shadow-sm hover:bg-azul/5 hover:scale-110 transition-all duration-300 w-5 h-5 p-0"
            >
              <Camera className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Informações do Utilizador */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {utilizador.name}
            </h1>
            <p className="text-gray-600 text-sm">
              {utilizador.atividade || "Sem atividade definida"}
            </p>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <Badge variant="outline" className="bg-white/90 border-azul/20 text-azul hover:bg-azul/5 transition-all duration-200 px-2 py-0.5 rounded-full text-xs">
                <Shield className="h-3 w-3 mr-1" /> {utilizadorFormatado.permissao}
              </Badge>
              <Badge variant="outline" className="bg-white/90 border-azul/20 text-azul hover:bg-azul/5 transition-all duration-200 px-2 py-0.5 rounded-full text-xs">
                <Clock className="h-3 w-3 mr-1" /> {utilizadorFormatado.regime}
              </Badge>
              {utilizador.contratacao && (
                <Badge variant="outline" className="bg-white/90 border-azul/20 text-azul hover:bg-azul/5 transition-all duration-200 px-2 py-0.5 rounded-full text-xs">
                  <Briefcase className="h-3 w-3 mr-1" /> {anosExperiencia} {anosExperiencia === 1 ? 'ano' : 'anos'} na empresa
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Grid de Informações - layout aprimorado e mais amplo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna Principal - 8 colunas em telas grandes */}
          <div className="lg:col-span-8 space-y-8">
            {/* Sobre - com transições e efeitos */}
            <Card className="border-azul/10 hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden">
              <CardHeader className="border-b border-azul/5 bg-gradient-to-r from-white to-azul/5">
                <CardTitle className="text-xl text-azul flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Sobre
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Informações profissionais e experiência
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {(utilizador as UserWithDetails).informacoes ? (
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {(utilizador as UserWithDetails).informacoes}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="bg-azul/5 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-azul/40" />
                    </div>
                    <p className="text-gray-500 mb-4">Este utilizador ainda não tem um currículo resumido definido.</p>
                    <Button variant="outline" className="border-azul/20 hover:bg-azul/5 hover:scale-105 transition-all duration-300">
                      <Edit className="h-4 w-4 mr-2" />
                      Adicionar Informações
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alocações - com scrollbar personalizada */}
            <Card className="border-azul/10 hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden">
              <CardHeader className="border-b border-azul/5 bg-gradient-to-r from-white to-azul/5">
                <CardTitle className="text-xl text-azul flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Alocações
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Visão geral da ocupação ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-azul/20 scrollbar-track-gray-100">
                <AlocacoesDetalhadas alocacoes={alocacoesDetalhadas} />
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral - 4 colunas em telas grandes */}
          <div className="lg:col-span-4 space-y-8">
            {/* Informações de Contacto - com ícones interativos */}
            <Card className="border-azul/10 hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden">
              <CardHeader className="border-b border-azul/5 bg-gradient-to-r from-white to-azul/5">
                <CardTitle className="text-xl text-azul flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Informações de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="p-2 hover:bg-azul/5 rounded-xl transition-all duration-200 flex items-center gap-3 text-gray-600 group">
                  <div className="bg-azul/10 text-azul p-2 rounded-full group-hover:scale-105 transition-all">
                    <Mail className="h-5 w-5" />
                  </div>
                  <span className="group-hover:text-azul transition-colors duration-200">{utilizador.email}</span>
                </div>
                <div className="p-2 hover:bg-azul/5 rounded-xl transition-all duration-200 flex items-center gap-3 text-gray-600 group">
                  <div className="bg-azul/10 text-azul p-2 rounded-full group-hover:scale-105 transition-all">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span className="group-hover:text-azul transition-colors duration-200">Portugal</span>
                </div>
                <div className="p-2 hover:bg-azul/5 rounded-xl transition-all duration-200 flex items-center gap-3 text-gray-600 group">
                  <div className="bg-azul/10 text-azul p-2 rounded-full group-hover:scale-105 transition-all">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <span className="group-hover:text-azul transition-colors duration-200">
                    Membro desde {utilizador.contratacao ? format(new Date(utilizador.contratacao), "MMMM yyyy", { locale: pt }) : "Data não definida"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Finanças - com animação de hover */}
            <Card className="border-azul/10 hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden">
              <CardHeader className="border-b border-azul/5 bg-gradient-to-r from-white to-azul/5">
                <CardTitle className="text-xl text-azul flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Finanças
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center py-10">
                  <div className="bg-azul/5 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <DollarSign className="h-8 w-8 text-azul/40" />
                  </div>
                  <p className="text-gray-500 mb-4">Sem dados financeiros disponíveis</p>
                  <Button variant="outline" className="border-azul/20 hover:bg-azul/5 hover:scale-105 transition-all duration-300">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Dados
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Relatório de Alocações - Largura Total com efeito de destaque */}
      <div className="bg-gradient-to-b from-azul/5 to-white py-12 mt-8">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-azul flex items-center gap-2 justify-center mb-3">
              <BarChart2 className="h-6 w-6" />
              Relatório de Alocações
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Tabela detalhada de alocações por projeto e workpackage, mostrando toda a distribuição do tempo ao longo dos meses
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-azul/10 overflow-hidden">
            <TabelaAlocacoes alocacoes={alocacoesTabela} />
          </div>
        </div>
      </div>
    </div>
  );
} 