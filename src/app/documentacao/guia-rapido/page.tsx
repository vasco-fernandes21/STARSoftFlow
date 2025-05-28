"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { 
  ChevronRight, 
  BookOpen,
  ArrowLeft,
  FileText,
  Compass,
  Users,
  Key,
  BarChart3,
  Layers,
  Settings,
  Lock,
  Unlock,
  X,
  HelpCircle,
  Search,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { StatsGrid } from "@/components/common/StatsGrid";

// Define interfaces for type safety
interface SectionItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
  accessLevel: string;
  steps?: string[];
  features?: string[];
  actions?: string[];
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

export default function GuiaRapidoDocumentacao() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);

  const baseURL = process.env.NEXT_PUBLIC_BLOB_URL;
  
  const guiaTopics: SectionItem[] = [
    {
      id: "navegacao",
      title: "Navegação na Plataforma",
      description: "A plataforma STAR SoftFlow possui uma interface intuitiva com menu lateral para acesso a todas as áreas principais. Aqui estão as principais páginas e como acessá-las:",
      icon: <Compass className="h-8 w-8 text-emerald-500" />,
      features: [
        "Início: Painel com resumo das suas atividades e notificações recentes",
        "Projetos: Lista completa de projetos com detalhes e filtros",
        "Perfil: Acesso às suas informações pessoais e preferências",
        "Utilizadores: Lista de utilizadores (visível apenas para Administradores e Gestores)",
        "Documentação: Guias e tutoriais para utilizar a plataforma",
        "Feedback: Envie sugestões ou comunique problemas à equipa"
      ],
      accessLevel: "Acesso comum a todos os utilizadores",
      image: `/docs/guia/navegacao.png`
    },
    {
      id: "niveis-acesso",
      title: "Níveis de Acesso e Permissões",
      description: "O STAR SoftFlow possui diferentes níveis de acesso que definem o que cada utilizador pode ver e fazer na plataforma:",
      icon: <Key className="h-8 w-8 text-blue-500" />,
      features: [
        "Administrador: Acesso total, incluindo a criação de utilizadores e projetos, aprovações e configurações globais",
        "Gestor: Pode criar e aprovar projetos, gerir utilizadores e visualizar relatórios",
        "Utilizador: Acesso limitado a projetos específicos designados pelo administrador ou gestor",
        "Visitante: Visualização apenas dos projetos públicos e da documentação (sem autenticação necessária)"
      ],
      accessLevel: "Informação disponível para todos os níveis de acesso",
      image: `/docs/guia/niveis.png`
    },
    {
      id: "areas-restritas",
      title: "Áreas de Acesso Restrito",
      description: "Algumas áreas da plataforma são de acesso restrito e só estão disponíveis para perfis específicos:",
      icon: <Lock className="h-8 w-8 text-red-500" />,
      features: [
        "Gestão de Utilizadores: Criar, editar e gerir permissões (ADMIN, GESTOR)",
        "Aprovação de Projetos: Rever e aprovar projetos pendentes (ADMIN, GESTOR)",
        "Relatórios Financeiros: Análises detalhadas de orçamentos e custos (ADMIN, GESTOR)",
        "Configurações do Sistema: Ajustes técnicos e personalizações (ADMIN)",
        "Gestão de Equipas: Adicionar ou remover membros de projetos (ADMIN, GESTOR, responsável do projeto)"
      ],
      accessLevel: "Visível para todos, mas funcionalidades acessíveis apenas por perfis específicos",
      image: `/docs/guia/acessorestrito.png`
    },
    {
      id: "areas-comuns",
      title: "Áreas de Acesso Comum",
      description: "Estas páginas estão disponíveis para todos os utilizadores autenticados na plataforma:",
      icon: <Unlock className="h-8 w-8 text-green-500" />,
      features: [
        "Painel Inicial: Resumo das suas atividades e notificações recentes",
        "Perfil: Configurações pessoais e preferências",
        "Visualização de Projetos: Ver projetos a que tem acesso",
        "Documentação: Ajuda e guias de utilização",
        "Feedback: Sistema para envio de sugestões e comunicação de problemas",
        "Tarefas Atribuídas: Lista de tarefas designadas a si"
      ],
      accessLevel: "Acessível a todos os utilizadores autenticados",
      image: `/docs/guia/acessocomum.png`
    },
    {
      id: "login",
      title: "Como Aceder à Plataforma",
      description: "Para começar a utilizar o STAR SoftFlow, siga estas etapas:",
      icon: <Users className="h-8 w-8 text-purple-500" />,
      steps: [
        "Aceda à página de login em /login",
        "Introduza o seu email e palavra-passe",
        "Clique no botão 'Entrar'",
        "Se for o seu primeiro acesso, defina uma nova palavra-passe segura",
        "Para recuperar a palavra-passe, clique em 'Esqueceu-se?' na página de login"
      ],
      accessLevel: "Procedimento válido para todos os utilizadores",
      image: `/docs/guia/comoaceder.png`
    },
    {
      id: "fluxo-trabalho",
      title: "Fluxo de Trabalho Típico",
      description: "Um fluxo de trabalho normal na plataforma segue geralmente estas etapas:",
      icon: <Layers className="h-8 w-8 text-orange-500" />,
      actions: [
        "1. Criar um novo projeto (botão '+ Novo Projeto' na página de Projetos)",
        "2. Definir workpackages, tarefas e entregáveis durante a criação",
        "3. Submeter o projeto para aprovação (botão 'Criar Projeto' no final do processo)",
        "4. Acompanhar o progresso no cronograma (separador 'Cronograma' na página do projeto)",
        "5. Atualizar o estado das tarefas à medida que avançam (clique na tarefa e altere o estado)",
        "6. Anexar documentos e entregáveis (botão 'Carregar Ficheiro' nas tarefas/entregáveis)",
        "7. Gerar relatórios quando necessário (botão 'Exportar' ou 'Relatório' nas páginas relevantes)"
      ],
      accessLevel: "Procedimento para Administradores, Gestores e responsáveis de projeto",
      image: `/docs/guia/fluxotipico.png`
    }
  ];

  // Define os dados estatísticos para o StatsGrid
  const statsItems: StatItem[] = [
    {
      icon: Compass,
      label: "Navegação Intuitiva",
      value: 1,
      iconClassName: "text-emerald-500",
      iconContainerClassName: "bg-emerald-50",
      secondaryText: "Descubra como se movimentar pela plataforma, aceder às diferentes secções e encontrar a informação que precisa de forma rápida e fácil.",
      badgeText: "Explorar a plataforma",
      badgeClassName: "text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border-emerald-200",
      href: "#navegacao"
    },
    {
      icon: Key,
      label: "Perfis e Permissões",
      value: 2,
      iconClassName: "text-blue-500",
      iconContainerClassName: "bg-blue-50",
      secondaryText: "Entenda os diferentes níveis de acesso (Administrador, Gestor, Utilizador) e o que cada perfil pode visualizar e gerir no STAR SoftFlow.",
      badgeText: "Conhecer os acessos",
      badgeClassName: "text-blue-700 bg-blue-100 hover:bg-blue-200 border-blue-200",
      href: "#niveis-acesso"
    },
    {
      icon: Layers,
      label: "Funcionalidades Essenciais",
      value: 3,
      iconClassName: "text-purple-500",
      iconContainerClassName: "bg-purple-50",
      secondaryText: "Conheça as áreas comuns da plataforma e as funcionalidades restritas, garantindo que tira o máximo partido das ferramentas disponíveis.",
      badgeText: "Ver funcionalidades",
      badgeClassName: "text-purple-700 bg-purple-100 hover:bg-purple-200 border-purple-200",
      href: "#areas-comuns"
    },
    {
      icon: Users,
      label: "Primeiros Passos",
      value: 4,
      iconClassName: "text-orange-500",
      iconContainerClassName: "bg-orange-50",
      secondaryText: "Saiba como aceder à plataforma pela primeira vez, configurar a sua conta e começar a explorar as suas capacidades.",
      badgeText: "Como aceder",
      badgeClassName: "text-orange-700 bg-orange-100 hover:bg-orange-200 border-orange-200",
      href: "#login"
    },
    {
      icon: BarChart3,
      label: "Fluxo de Trabalho Principal",
      value: 5,
      iconClassName: "text-indigo-500",
      iconContainerClassName: "bg-indigo-50",
      secondaryText: "Compreenda o ciclo de vida típico de um projeto dentro do STAR SoftFlow, desde a criação e submissão até ao acompanhamento e gestão.",
      badgeText: "Entender o processo",
      badgeClassName: "text-indigo-700 bg-indigo-100 hover:bg-indigo-200 border-indigo-200",
      href: "#fluxo-trabalho"
    }
  ];

  const filteredTopics = searchQuery.trim()
    ? guiaTopics.filter(topic => 
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : guiaTopics;

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
                  <span className="text-xl font-bold">Guia de Início Rápido</span>
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
              Guia de Início Rápido
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
              Descubra como navegar na plataforma STAR SoftFlow, compreenda os níveis de acesso e aprenda os fundamentos para começar a trabalhar com eficiência
            </p>
            
            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="relative max-w-2xl mx-auto"
            >
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-azul transition-colors duration-300" />
                <Input
                  type="text"
                  placeholder="Pesquisar neste guia..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-16 py-4 text-lg text-gray-900 placeholder:text-gray-500 rounded-2xl border-0 bg-white/95 backdrop-blur-sm shadow-xl focus:shadow-2xl transition-all duration-300 focus:ring-2 focus:ring-white/50 hover:bg-white group-hover:shadow-2xl"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <kbd className="hidden sm:inline-block px-2 py-1 bg-white/20 border border-white/30 rounded text-xs text-white/80 font-mono backdrop-blur-sm">
                    ⌘K
                  </kbd>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-12 relative z-10">
        {/* Overview Section */}
        <section className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comece a sua jornada no STAR SoftFlow
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Explore os principais aspectos da plataforma através deste guia estruturado, desde a navegação básica até aos fluxos de trabalho avançados
            </p>
          </motion.div>
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
                <div className="flex flex-col lg:flex-row gap-12 items-stretch">
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
                          Funcionalidades disponíveis
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
                          <Layers className="h-5 w-5 text-blue-500" />
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
                    
                    {topic.actions && (
                      <div className="mb-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Settings className="h-5 w-5 text-purple-500" />
                          Sequência de ações
                        </h3>
                        <div className="space-y-3">
                          {topic.actions.map((action, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
                              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center shrink-0 text-sm font-bold">
                                {idx + 1}
                              </div>
                              <span className="text-gray-700 leading-relaxed pt-1">{action.replace(/^\d+\.\s*/, '')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-auto">
                      <div className="bg-gradient-to-r from-white/90 to-gray-50/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-azul/10 p-2 rounded-lg">
                            <Key className="h-4 w-4 text-azul" />
                          </div>
                          <span className="font-semibold text-azul">Nível de acesso</span>
                        </div>
                        <p className="text-gray-700">{topic.accessLevel}</p>
                      </div>
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
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* Related Documentation */}
        <section className="py-16 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Continue a explorar a documentação
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Aprofunde os seus conhecimentos com documentação especializada para cada área da plataforma
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group">
              <Link href="/documentacao/projetos" className="block">
                <Card className="h-full overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-0">
                    <div className="p-6 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <BarChart3 className="h-6 w-6 text-azul" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">Gestão de Projetos</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                Popular
                              </span>
                              <div className="flex items-center gap-1 text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span className="text-xs">25 min</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">Domine a criação e gestão completa de projetos</p>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center text-azul font-medium">
                        <span>Explorar guia</span>
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
            
            <div className="group">
              <Link href="/documentacao/utilizadores" className="block">
                <Card className="h-full overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-0">
                    <div className="p-6 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Users className="h-6 w-6 text-azul" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">Gestão de Utilizadores</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                                Avançado
                              </span>
                              <div className="flex items-center gap-1 text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span className="text-xs">20 min</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">Aprenda a gerir utilizadores, perfis e permissões</p>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center text-azul font-medium">
                        <span>Ver manual</span>
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
            
            <div className="group">
              <Link href="/documentacao/tutoriais" className="block">
                <Card className="h-full overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-0">
                    <div className="p-6 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <FileText className="h-6 w-6 text-azul" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">Tutoriais em Vídeo</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                                Novo
                              </span>
                              <div className="flex items-center gap-1 text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span className="text-xs">Variável</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">Aprenda através de tutoriais práticos e interativos</p>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center text-azul font-medium">
                        <span>Consultar tutoriais</span>
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
          
          {/* Quick access buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
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