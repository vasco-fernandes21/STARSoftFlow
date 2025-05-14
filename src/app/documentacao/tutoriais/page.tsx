"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ChevronRight, 
  Search,
  ArrowLeft,
  FileText,
  HelpCircle,
  Play,
  BookOpen,
  Video,
  CheckCircle2,
  Clock,
  Monitor,
  Layers,
  Pencil,
  Users,
  BarChart3,
  PlayCircle,
  ListChecks,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

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
  duration?: string;
  videoUrl?: string;
  tabs?: TabItem[];
}

export default function TutoriaisDocumentacao() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  
  const tutorialTopics: TopicItem[] = [
    {
      id: "introducao",
      title: "Introdução à Plataforma",
      description: "Série de tutoriais em vídeo para novos utilizadores se familiarizarem com a interface e funcionalidades básicas do StarSoftFlow.",
      icon: <BookOpen className="h-8 w-8 text-azul" />,
      features: [
        "Visão geral da plataforma e navegação básica",
        "Como criar e configurar sua conta",
        "Dashboard e painéis personalizados",
        "Notificações e preferências de utilizador"
      ],
      duration: "15 minutos",
      image: "/docs/tutorial-intro.jpg",
      link: { label: "Ver Tutorial", href: "/tutoriais#intro" }
    },
    {
      id: "projetos",
      title: "Gestão de Projetos",
      description: "Tutoriais avançados sobre como criar, organizar e gerir projetos de forma eficiente na plataforma StarSoftFlow.",
      icon: <BarChart3 className="h-8 w-8 text-azul" />,
      steps: [
        "Como criar um novo projeto com todas as configurações necessárias",
        "Organização de workpackages e definição da estrutura do projeto",
        "Gestão de cronogramas e acompanhamento do progresso",
        "Uso de relatórios e visualizações para monitorar o desempenho",
        "Gestão de recursos e orçamentos"
      ],
      duration: "30 minutos",
      image: "/docs/tutorial-projects.jpg",
      link: { label: "Ver Tutorial", href: "/tutoriais#novo-projeto" }
    },
    {
      id: "equipa",
      title: "Gestão de Equipas",
      description: "Aprenda a gerir equipes, atribuir tarefas e colaborar eficientemente com os membros do projeto.",
      icon: <Users className="h-8 w-8 text-azul" />,
      features: [
        "Adição e remoção de membros de equipa",
        "Atribuição de funções e responsabilidades",
        "Sistemas de notificação e comunicação entre membros",
        "Acompanhamento de desempenho e carga de trabalho"
      ],
      duration: "20 minutos",
      image: "/docs/tutorial-teams.jpg",
      link: { label: "Ver Tutorial", href: "/tutoriais#membros" }
    },
    {
      id: "avancado",
      title: "Recursos Avançados",
      description: "Tutoriais sobre funcionalidades avançadas que permitem otimizar fluxos de trabalho e extrair o máximo da plataforma.",
      icon: <Layers className="h-8 w-8 text-azul" />,
      tabs: [
        { label: "Relatórios e Análises", description: "Como gerar e interpretar relatórios detalhados" },
        { label: "Importação/Exportação", description: "Técnicas para migrar dados de/para a plataforma" },
        { label: "Acompanhamento Financeiro", description: "Gestão avançada de orçamentos e despesas" },
        { label: "Integrações", description: "Conexão com ferramentas externas" }
      ],
      duration: "45 minutos",
      image: "/docs/tutorial-advanced.jpg",
      link: { label: "Ver Tutoriais Avançados", href: "/tutoriais#avancado" }
    },
    {
      id: "interativo",
      title: "Tutoriais Interativos",
      description: "Experiências práticas guiadas que permitem aprender utilizando a plataforma em tempo real, com orientações passo a passo.",
      icon: <Monitor className="h-8 w-8 text-azul" />,
      features: [
        "Ambiente seguro para praticar sem afetar dados reais",
        "Feedback em tempo real sobre suas ações",
        "Progresso salvo automaticamente entre sessões",
        "Conquistas e certificados de conclusão"
      ],
      duration: "Variável por módulo",
      image: "/docs/tutorial-interactive.jpg",
      link: { label: "Iniciar Tutorial Interativo", href: "/tutoriais#interativo" }
    }
  ];

  const filteredTopics = searchQuery.trim()
    ? tutorialTopics.filter(topic => 
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tutorialTopics;

  const tutorialCategories = [
    {
      title: "Tutoriais para Iniciantes",
      icon: <PlayCircle className="h-6 w-6 text-azul" />,
      videos: [
        { title: "Visão Geral da Interface", duration: "5:30", href: "#" },
        { title: "Configurar o Seu Perfil", duration: "3:15", href: "#" },
        { title: "Primeiros Passos com Projetos", duration: "7:40", href: "#" }
      ]
    },
    {
      title: "Tutoriais de Projetos",
      icon: <ListChecks className="h-6 w-6 text-azul" />,
      videos: [
        { title: "Criar um Novo Projeto Detalhado", duration: "12:10", href: "#" },
        { title: "Gerir Workpackages e Tarefas", duration: "9:05", href: "#" },
        { title: "Acompanhar o Progresso Financeiro", duration: "6:50", href: "#" }
      ]
    },
    {
      title: "Tutoriais de Equipa",
      icon: <Users className="h-6 w-6 text-azul" />,
      videos: [
        { title: "Adicionar Membros à Equipa", duration: "4:20", href: "#" },
        { title: "Atribuir Tarefas e Responsabilidades", duration: "5:55", href: "#" },
        { title: "Comunicar Eficazmente na Plataforma", duration: "3:45", href: "#" }
      ]
    },
    {
      title: "Tutoriais Avançados",
      icon: <Settings className="h-6 w-6 text-azul" />,
      videos: [
        { title: "Importar Projetos de Excel", duration: "8:00", href: "#" },
        { title: "Gerar Relatórios Personalizados", duration: "7:15", href: "#" },
        { title: "Integrar com Ferramentas Externas (API)", duration: "10:30", href: "#" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-bgApp">
      {/* Header */}
      <header className="bg-azul text-white py-6">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.push("/documentacao")}
                className="rounded-full hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Image
                  src="/star-logo-branco.png"
                  alt="STAR Institute"
                  width={120}
                  height={40}
                  className="h-8 w-auto"
                />
                <span className="text-xl font-bold">Documentação de Tutoriais</span>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              <Button 
                variant="ghost" 
                className="hover:bg-white/10"
                onClick={() => router.push("/feedback")}
              >
                Suporte
              </Button>
              <Button 
                variant="outline" 
                className="border-white border-2 text-white bg-transparent hover:bg-white/10 rounded-full"
                onClick={() => router.push("/login")}
              >
                Aceder à Plataforma
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Hero */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 md:px-6 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            >
              Tutoriais STAR SoftFlow
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-lg text-gray-600 mb-8"
            >
              Encontre tutoriais passo a passo para dominar o STAR SoftFlow. Pesquise por tutoriais específicos ou navegue pelas categorias abaixo.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative max-w-xl mx-auto"
            >
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Pesquisar nesta documentação..."
                className="pl-10 h-12 rounded-lg border-gray-300 shadow-sm focus:border-azul focus:ring-azul"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Topics Overview */}
      <section className="py-12">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Tutoriais - Visão Geral</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="h-full hover:shadow-md transition-all duration-200 bg-white border-azul/10 rounded-xl group hover:translate-y-[-5px]">
                <CardContent className="p-6">
                  <div className="rounded-full bg-azul/10 p-3 w-fit mb-4 group-hover:bg-azul/20 transition-all duration-300">
                    <Video className="h-8 w-8 text-azul" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Tutoriais em Vídeo</h3>
                  <p className="text-gray-600 mb-4">
                    Aprenda visualmente com tutoriais em vídeo passo a passo, organizados por nível de dificuldade
                  </p>
                  <Link href="#introducao" className="flex items-center text-azul font-medium">
                    <span>Ver tópicos</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Card className="h-full hover:shadow-md transition-all duration-200 bg-white border-azul/10 rounded-xl group hover:translate-y-[-5px]">
                <CardContent className="p-6">
                  <div className="rounded-full bg-azul/10 p-3 w-fit mb-4 group-hover:bg-azul/20 transition-all duration-300">
                    <Play className="h-8 w-8 text-azul" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Tutoriais Interativos</h3>
                  <p className="text-gray-600 mb-4">
                    Aprenda fazendo com tutoriais interativos que guiam você pela plataforma em tempo real
                  </p>
                  <Link href="#interativo" className="flex items-center text-azul font-medium">
                    <span>Ver tópicos</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Card className="h-full hover:shadow-md transition-all duration-200 bg-white border-azul/10 rounded-xl group hover:translate-y-[-5px]">
                <CardContent className="p-6">
                  <div className="rounded-full bg-azul/10 p-3 w-fit mb-4 group-hover:bg-azul/20 transition-all duration-300">
                    <Pencil className="h-8 w-8 text-azul" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Guias Práticos</h3>
                  <p className="text-gray-600 mb-4">
                    Guias detalhados para tarefas específicas com dicas e melhores práticas
                  </p>
                  <Link href="#projetos" className="flex items-center text-azul font-medium">
                    <span>Ver tópicos</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Detailed Topics */}
      {filteredTopics.map((topic, topicIndex) => (
        <section 
          id={topic.id} 
          key={topicIndex}
          className={`py-12 ${topicIndex % 2 === 0 ? 'bg-white' : 'bg-bgApp'}`}
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col md:flex-row gap-8 items-start"
              >
                <div className="md:w-1/2 order-2 md:order-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-azul/10 p-2 rounded-lg">
                      {topic.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{topic.title}</h2>
                  </div>
                  
                  <p className="text-gray-600 mb-6">{topic.description}</p>
                  
                  {topic.duration && (
                    <div className="mb-4 flex items-center text-gray-700">
                      <Clock className="h-5 w-5 text-azul mr-2" />
                      <span>Duração total: {topic.duration}</span>
                    </div>
                  )}
                  
                  {topic.features && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">O que vai aprender:</h3>
                      <ul className="space-y-2">
                        {topic.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {topic.steps && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Conteúdo do tutorial:</h3>
                      <ol className="space-y-2 list-decimal ml-5">
                        {topic.steps.map((step, idx) => (
                          <li key={idx} className="text-gray-700 pl-1">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  
                  {topic.tabs && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        Módulos incluídos:
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {topic.tabs.map((tab, idx) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                            <h4 className="font-medium text-azul">{tab.label}</h4>
                            <p className="text-sm text-gray-600">{tab.description}</p>
                            {tab.access && (
                              <p className="text-xs text-gray-500 mt-1">Acesso: {tab.access}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {topic.link && (
                    <Button 
                      onClick={() => router.push(topic.link.href)}
                      className="bg-azul text-white hover:bg-azul-dark rounded-full"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {topic.link.label}
                    </Button>
                  )}
                </div>
                
                <div className="md:w-1/2 order-1 md:order-2">
                  <div className="rounded-lg overflow-hidden shadow-md bg-white border border-gray-200">
                    <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-azul/10 rounded-full p-4 hover:bg-azul/20 transition-all duration-300 cursor-pointer">
                          <Play className="h-8 w-8 text-azul fill-azul/50" />
                        </div>
                      </div>
                      {topic.duration && (
                        <div className="absolute bottom-3 right-3 bg-gray-900/80 text-white text-xs px-2 py-1 rounded-md flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {topic.duration}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      ))}
      
      {/* Need Help Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Não encontrou o que procurava?</h2>
            <p className="text-gray-600 mb-8">
              A nossa equipa de suporte está pronta para o ajudar com qualquer questão.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="outline"
                onClick={() => router.push("/feedback")}
                className="border-azul text-azul hover:bg-azul/5 rounded-full"
              >
                <HelpCircle className="mr-2 h-5 w-5" />
                Contactar Suporte
              </Button>
              <Button 
                onClick={() => router.push("/documentacao")}
                className="bg-azul text-white hover:bg-azul-dark rounded-full"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                Ver Documentação Completa
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-900 py-8">
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
    </div>
  );
} 