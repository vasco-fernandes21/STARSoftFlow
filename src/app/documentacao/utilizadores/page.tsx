"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { 
  ChevronRight, 
  Search,
  ArrowLeft,
  FileText,
  HelpCircle,
  Users,
  ShieldCheck,
  UserCog,
  UserPlus,
  CheckCircle2,
  Settings,
  Lock,
  BookOpen,
  Clock,
  Target,
  Activity,
  Zap,
  ArrowUpRight,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { StatsGrid } from "@/components/common/StatsGrid";

// Define interfaces for type safety
interface TabItem {
  label: string;
  description: string;
  access?: string;
}

interface TopicItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
  link: { label: string; href: string };
  features?: string[];
  steps?: string[];
  tabs?: TabItem[];
  category?: string;
  difficulty?: string;
  duration?: string;
  badge?: string;
  gradient?: string;
}

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageAlt: string;
}

type StatItem = {
  icon: LucideIcon;
  label: string;
  value: number;
  iconClassName: string;
  iconContainerClassName: string;
  suffix?: string;
  badgeText?: string;
  badgeIcon?: LucideIcon;
  badgeClassName?: string;
  secondaryText?: string;
  trend?: number;
  statusCount?: {
    completed: number;
    pending: number;
    completedLabel?: string;
    pendingLabel?: string;
  };
  href?: string;
};

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageUrl, imageAlt }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-7xl w-full bg-white rounded-lg overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 bg-white/10 hover:bg-white/20 rounded-full"
          onClick={onClose}
        >
          <X className="h-6 w-6 text-white" />
        </Button>
        <div className="relative w-full aspect-video">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className="object-contain"
            sizes="(max-width: 1280px) 100vw, 1280px"
            priority
          />
        </div>
      </div>
    </div>
  );
};

export default function UtilizadoresDocumentacao() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);

  const baseURL = process.env.NEXT_PUBLIC_BLOB_URL;

  const quickStats: StatItem[] = [
    { 
      icon: BookOpen, 
      label: "Guias Disponíveis", 
      value: 4, 
      iconClassName: "h-5 w-5 text-blue-600", 
      iconContainerClassName: "bg-blue-100"
    },
    { 
      icon: Clock, 
      label: "Tempo Médio", 
      value: 20, 
      suffix: " min",
      iconClassName: "h-5 w-5 text-green-600", 
      iconContainerClassName: "bg-green-100"
    },
    { 
      icon: Target, 
      label: "Nível", 
      value: 0,
      secondaryText: "Básico", 
      iconClassName: "h-5 w-5 text-orange-600", 
      iconContainerClassName: "bg-orange-100"
    },
    { 
      icon: Activity, 
      label: "Última Atualização", 
      value: 0,
      secondaryText: "Há 1 dia", 
      iconClassName: "h-5 w-5 text-purple-600", 
      iconContainerClassName: "bg-purple-100"
    }
  ];
  
  const utilizadorTopics: TopicItem[] = [
    {
      id: "perfis",
      title: "Como Compreender os Perfis de Utilizador",
      description: "Antes de criar ou gerir utilizadores, é importante compreender os diferentes perfis disponíveis e seus respetivos níveis de acesso. Cada perfil tem permissões específicas na plataforma.",
      icon: <Users className="h-8 w-8 text-azul" />,
      category: "gestao",
      difficulty: "Básico",
      duration: "8 min",
      badge: "Essencial",
      gradient: "from-gray-50/80 to-slate-100/80",
      features: [
        "🔑 Administrador: Para aceder a todas as funcionalidades, atribua este perfil apenas a utilizadores com elevadas permissões",
        "👥 Gestor: Ideal para líderes de equipa, permite gerir projetos e utilizadores",
        "🎯 Responsável: Adequado para coordenadores de projeto, que só podem gerir os seus próprios projetos",
        "👤 Utilizador Comum: Para membros regulares da equipa, com acesso limitado a projetos específicos (perfil padrão na criação)"
      ],
      image: "/docs/utilizadores/consulta.png",
      link: { label: "Ver Lista de Utilizadores", href: "/utilizadores" }
    },
    {
      id: "gestao",
      title: "Como Gerir Utilizadores Existentes",
      description: "Para aceder ao painel de gestão de utilizadores, clique em 'Utilizadores' no menu lateral. Aqui pode visualizar, filtrar, editar e desativar contas de utilizadores da plataforma.",
      icon: <UserCog className="h-8 w-8 text-azul" />,
      category: "gestao",
      difficulty: "Intermediário",
      duration: "12 min",
      badge: "Popular",
      gradient: "from-slate-50/80 to-gray-100/80",
      tabs: [
        { 
          label: "🔍 Pesquisa e Filtros", 
          description: "Digite o nome na barra de pesquisa ou utilize os filtros (Ativo, Inativo, Perfil) para encontrar utilizadores",
          access: "Gestores e Admins"
        },
        { 
          label: "👁️ Visualizar Detalhes", 
          description: "Clique no nome do utilizador para ver o seu perfil completo, histórico e projetos associados",
          access: "Todos os utilizadores"
        },
        { 
          label: "✏️ Editar Utilizador", 
          description: "Clique no ícone de lápis à direita para modificar os dados, o perfil ou as permissões do utilizador",
          access: "Admins apenas"
        },
        { 
          label: "🔄 Ativar/Desativar", 
          description: "Utilize o botão de alternância (toggle) na coluna 'Estado' para alterar o estado do utilizador sem o remover do sistema",
          access: "Gestores e Admins"
        }
      ],
      image: "/docs/utilizadores/detalhes.png",
      link: { label: "Ir para Gestão de Utilizadores", href: "/utilizadores" }
    },
    {
      id: "criacao",
      title: "Como Criar Novos Utilizadores",
      description: "Para adicionar um novo utilizador à plataforma, aceda à página de utilizadores e clique no botão '+ Novo Utilizador' no canto superior direito. Siga o processo guiado de registo.",
      icon: <UserPlus className="h-8 w-8 text-azul" />,
      category: "criacao",
      difficulty: "Básico",
      duration: "10 min",
      badge: "Útil",
      gradient: "from-gray-50/80 to-slate-100/80",
      steps: [
        "🆕 Clique em '+ Novo Utilizador' na página de listagem de utilizadores",
        "📝 Preencha o formulário com o nome completo, o email profissional e o cargo na organização",
        "🏷️ Selecione o perfil apropriado no menu suspenso (Administrador, Gestor, Responsável ou Utilizador)",
        "📦 Na secção 'Projetos', marque as caixas dos projetos a que o utilizador deve ter acesso",
        "✅ Verifique todas as informações e clique em 'Criar Utilizador' para enviar o convite por email"
      ],
      image: "/docs/utilizadores/criar.png",
      link: { label: "Criar Novo Utilizador", href: "/utilizadores" }
    },
    {
      id: "perfil",
      title: "Como Gerir o Seu Perfil Pessoal",
      description: "Cada utilizador pode personalizar o seu próprio perfil e preferências na plataforma. Para aceder às suas configurações pessoais, clique no seu nome no canto superior direito e selecione 'Perfil'.",
      icon: <Settings className="h-8 w-8 text-azul" />,
      category: "gestao",
      difficulty: "Básico",
      duration: "8 min",
      badge: "Pessoal",
      gradient: "from-slate-50/80 to-gray-100/80",
      features: [
        "📝 Atualizar Dados Pessoais: Clique em 'Editar Perfil' para modificar o seu nome, fotografia, contacto e informações profissionais",
        "🔔 Configurar Notificações: No separador 'Notificações', ative ou desative alertas por email ou no sistema para diferentes eventos",
        "🔒 Alterar Palavra-passe: Aceda a 'Segurança', introduza a sua palavra-passe atual e depois a nova palavra-passe",
      ],
      image: "/docs/utilizadores/perfil.png",
      link: { label: "Aceder ao Seu Perfil", href: "/perfil" }
    }
  ];

  const filteredTopics = searchQuery.trim()
    ? utilizadorTopics.filter(topic => 
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : utilizadorTopics;

  return (
    <div className="min-h-screen bg-gradient-to-br from-bgApp via-white to-azul/5">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-10 w-72 h-72 bg-azul/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-azul/3 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative bg-gradient-to-r from-azul via-azul-light to-azul-dark text-white py-12 overflow-hidden">
        <div className="absolute inset-0 bg-dot-pattern opacity-10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-24 -translate-x-24"></div>
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.push("/documentacao")}
                className="rounded-full hover:bg-white/20 transition-all duration-300 hover:scale-110"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Link href="/documentacao" className="flex items-center gap-3 group">
                <div className="relative">
                  <Image
                    src="/star-logo-branco.png"
                    alt="STAR Institute"
                    width={120}
                    height={40}
                    className="h-8 w-auto transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-white/20 rounded blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">Documentação de Utilizadores</span>
                </div>
              </Link>
            </div>
            <Button 
              variant="outline" 
              className="border-white border-2 text-white bg-white/10 backdrop-blur-sm hover:bg-white hover:text-azul transition-all duration-300 rounded-full shadow-lg hover:shadow-xl hover:scale-105"
              onClick={() => router.push("/login")}
            >
              <Users className="mr-2 h-4 w-4" />
              Aceder à Plataforma
            </Button>
          </div>

          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent"
            >
              Documentação de Utilizadores
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed"
            >
              Guia completo sobre gestão de utilizadores e permissões na plataforma STARSoftFlow
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative max-w-2xl mx-auto"
            >
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Pesquisar nesta documentação..."
                className="pl-12 pr-4 py-4 text-lg rounded-2xl border-0 bg-white/95 backdrop-blur-sm shadow-xl focus:shadow-2xl transition-all duration-300 focus:ring-2 focus:ring-white/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </motion.div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-12 relative z-10">
        {/* Topics Overview */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Gestão de Utilizadores - Guia Prático
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Explore os principais aspectos da gestão de utilizadores através deste guia estruturado
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="group"
            >
              <Card className="h-full overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/90 backdrop-blur-sm border border-gray-100/50">
                <CardContent className="p-0">
                  <div className="p-6 bg-gradient-to-r from-gray-50/80 to-slate-100/80 border-b border-gray-200/60">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                          <Users className="h-6 w-6 text-azul" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Criação e Gestão</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-3 py-1 text-xs font-semibold rounded-full border bg-azul/10 text-azul border-azul/20">
                              Essencial
                            </span>
                            <div className="flex items-center gap-1 text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs font-medium">15 min</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">Aprenda como adicionar, modificar e gerir contas de utilizadores de forma eficiente</p>
                  </div>
                  <div className="p-6 bg-white/50">
                    <Link href="#criacao" className="flex items-center text-azul font-medium">
                      <span>Ver instruções</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="group"
            >
              <Card className="h-full overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/90 backdrop-blur-sm border border-gray-100/50">
                <CardContent className="p-0">
                  <div className="p-6 bg-gradient-to-r from-slate-50/80 to-gray-100/80 border-b border-gray-200/60">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                          <ShieldCheck className="h-6 w-6 text-azul" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Permissões e Segurança</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-3 py-1 text-xs font-semibold rounded-full border bg-gray-100 text-gray-700 border-gray-200">
                              Avançado
                            </span>
                            <div className="flex items-center gap-1 text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs font-medium">20 min</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">Descubra como configurar níveis de acesso e garantir a segurança dos dados</p>
                  </div>
                  <div className="p-6 bg-white/50">
                    <Link href="#perfis" className="flex items-center text-azul font-medium">
                      <span>Ver instruções</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="group"
            >
              <Card className="h-full overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/90 backdrop-blur-sm border border-gray-100/50">
                <CardContent className="p-0">
                  <div className="p-6 bg-gradient-to-r from-gray-50/80 to-slate-100/80 border-b border-gray-200/60">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                          <UserPlus className="h-6 w-6 text-azul" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Perfil e Preferências</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-3 py-1 text-xs font-semibold rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                              Pessoal
                            </span>
                            <div className="flex items-center gap-1 text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs font-medium">8 min</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">Saiba como personalizar as suas configurações e gerir os seus dados pessoais</p>
                  </div>
                  <div className="p-6 bg-white/50">
                    <Link href="#perfil" className="flex items-center text-azul font-medium">
                      <span>Ver instruções</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
        
        {/* Detailed Topics */}
        {filteredTopics.map((topic, topicIndex) => (
          <section 
            id={topic.id} 
            key={topicIndex}
            className={`py-16 mb-8 rounded-3xl ${
              topicIndex % 2 === 0 
                ? 'bg-white/60 backdrop-blur-sm border border-gray-100' 
                : 'bg-gradient-to-r from-gray-50/80 to-blue-50/80 backdrop-blur-sm border border-gray-100'
            }`}
          >
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-7xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="flex flex-col lg:flex-row gap-12 items-stretch"
                >
                  {/* Content */}
                  <div className={`lg:w-1/2 ${topicIndex % 2 === 0 ? 'order-1' : 'order-1 lg:order-2'} flex flex-col`}>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
                        {topic.icon}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Tópico {topicIndex + 1}
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{topic.title}</h2>
                      </div>
                    </div>
                    
                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">{topic.description}</p>
                    
                    {topic.features && (
                      <div className="mb-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          Instruções detalhadas
                        </h3>
                        <div className="space-y-3">
                          {topic.features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
                              <div className="bg-emerald-100 p-1 rounded-full mt-0.5">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              </div>
                              <span className="text-gray-700 leading-relaxed">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {topic.steps && (
                      <div className="mb-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <UserPlus className="h-5 w-5 text-blue-500" />
                          Passo a passo
                        </h3>
                        <div className="space-y-3">
                          {topic.steps.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
                              <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center shrink-0 text-sm font-bold">
                                {idx + 1}
                              </div>
                              <span className="text-gray-700 leading-relaxed pt-1">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {topic.tabs && (
                      <div className="mb-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <UserCog className="h-5 w-5 text-purple-500" />
                          Ações disponíveis
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {topic.tabs.map((tab, idx) => (
                            <div key={idx} className="p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
                              <h4 className="font-medium text-azul mb-2">{tab.label}</h4>
                              <p className="text-sm text-gray-600 mb-2">{tab.description}</p>
                              {tab.access && (
                                <p className="text-xs text-gray-500">Quem pode aceder: {tab.access}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-auto">
                      {topic.link && (
                        <Button 
                          onClick={() => router.push(topic.link.href)}
                          className="bg-azul hover:bg-azul-dark text-white rounded-2xl px-8 py-3 h-auto font-semibold shadow-lg"
                        >
                          {topic.link.label}
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Image */}
                  <div className={`lg:w-1/2 ${topicIndex % 2 === 0 ? 'order-2' : 'order-2 lg:order-1'} flex items-center`}>
                    <div className="w-full">
                      {topic.image ? (
                        <div 
                          className="relative rounded-3xl overflow-hidden shadow-2xl bg-white border border-gray-200 cursor-pointer group hover:scale-[1.02] transition-transform duration-300"
                          onClick={() => setSelectedImage({ 
                            url: topic.image, 
                            alt: `Ilustração: ${topic.title}` 
                          })}
                        >
                          <div className="relative aspect-video">
                            <Image
                              src={topic.image}
                              alt={`Ilustração: ${topic.title}`}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              sizes="(max-width: 768px) 100vw, 50vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20 shadow-lg">
                                <span className="text-gray-900 font-medium">Expandir imagem</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center border border-gray-200">
                          <div className="text-center">
                            <div className="bg-gray-300 p-4 rounded-full mb-4 mx-auto w-fit">
                              <FileText className="h-8 w-8 text-gray-500" />
                            </div>
                            <p className="text-gray-500 font-medium">Imagem ilustrativa: {topic.title}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        ))}
        
        {/* Need Help Section */}
        <section className="py-16 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Precisa de ajuda adicional?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Se não encontrou o que procura, entre em contacto com a nossa equipa de suporte ou explore outros recursos disponíveis.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="outline"
              onClick={() => router.push("/feedback")}
              className="border-azul/20 text-azul hover:bg-azul/5 rounded-2xl px-8 py-3 h-auto font-semibold"
            >
              <HelpCircle className="mr-2 h-5 w-5" />
              Contactar Suporte
            </Button>
            <Button 
              onClick={() => router.push("/documentacao")}
              className="bg-azul hover:bg-azul-dark text-white rounded-2xl px-8 py-3 h-auto font-semibold shadow-lg"
            >
              <FileText className="mr-2 h-5 w-5" />
              Voltar à Documentação
            </Button>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-900 py-8 relative z-10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Image
                src="/star-logo-branco.png"
                alt="STAR Institute"
                width={100}
                height={30}
                className="h-6 w-auto"
              />
              <span className="text-white font-medium">Documentação</span>
            </div>
            <div className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} STAR Institute. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>

      {/* Image Modal */}
      <ImageModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage?.url || ''}
        imageAlt={selectedImage?.alt || ''}
      />
    </div>
  );
}