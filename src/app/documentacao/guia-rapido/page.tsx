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
  Compass,
  Users,
  Key,
  BarChart3,
  CheckCircle2,
  Layers,
  Settings,
  Lock,
  Unlock,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

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
      icon: <Compass className="h-8 w-8 text-azul" />,
      features: [
        "Início: Painel com resumo das suas atividades e notificações recentes",
        "Projetos: Lista completa de projetos com detalhes e filtros",
        "Perfil: Acesso às suas informações pessoais e preferências",
        "Utilizadores: Lista de utilizadores (visível apenas para Administradores e Gestores)",
        "Documentação: Guias e tutoriais para utilizar a plataforma",
        "Feedback: Envie sugestões ou comunique problemas à equipa"
      ],
      accessLevel: "Acesso comum a todos os utilizadores",
      image: `https://${baseURL}/docs/guia/navegacao.png`
    },
    {
      id: "niveis-acesso",
      title: "Níveis de Acesso e Permissões",
      description: "O STAR SoftFlow possui diferentes níveis de acesso que definem o que cada utilizador pode ver e fazer na plataforma:",
      icon: <Key className="h-8 w-8 text-azul" />,
      features: [
        "Administrador: Acesso total, incluindo a criação de utilizadores e projetos, aprovações e configurações globais",
        "Gestor: Pode criar e aprovar projetos, gerir utilizadores e visualizar relatórios",
        "Utilizador: Acesso limitado a projetos específicos designados pelo administrador ou gestor",
        "Visitante: Visualização apenas dos projetos públicos e da documentação (sem autenticação necessária)"
      ],
      accessLevel: "Informação disponível para todos os níveis de acesso",
      image: `https://${baseURL}/docs/guia/niveis.png`
    },
    {
      id: "areas-restritas",
      title: "Áreas de Acesso Restrito",
      description: "Algumas áreas da plataforma são de acesso restrito e só estão disponíveis para perfis específicos:",
      icon: <Lock className="h-8 w-8 text-azul" />,
      features: [
        "Gestão de Utilizadores: Criar, editar e gerir permissões (ADMIN, GESTOR)",
        "Aprovação de Projetos: Rever e aprovar projetos pendentes (ADMIN, GESTOR)",
        "Relatórios Financeiros: Análises detalhadas de orçamentos e custos (ADMIN, GESTOR)",
        "Configurações do Sistema: Ajustes técnicos e personalizações (ADMIN)",
        "Gestão de Equipas: Adicionar ou remover membros de projetos (ADMIN, GESTOR, responsável do projeto)"
      ],
      accessLevel: "Visível para todos, mas funcionalidades acessíveis apenas por perfis específicos",
      image: `https://${baseURL}/docs/guia/acessorestrito.png`
    },
    {
      id: "areas-comuns",
      title: "Áreas de Acesso Comum",
      description: "Estas páginas estão disponíveis para todos os utilizadores autenticados na plataforma:",
      icon: <Unlock className="h-8 w-8 text-azul" />,
      features: [
        "Painel Inicial: Resumo das suas atividades e notificações recentes",
        "Perfil: Configurações pessoais e preferências",
        "Visualização de Projetos: Ver projetos a que tem acesso",
        "Documentação: Ajuda e guias de utilização",
        "Feedback: Sistema para envio de sugestões e comunicação de problemas",
        "Tarefas Atribuídas: Lista de tarefas designadas a si"
      ],
      accessLevel: "Acessível a todos os utilizadores autenticados",
      image: `https://${baseURL}/docs/guia/acessocomum.png`
    },
    {
      id: "login",
      title: "Como Aceder à Plataforma",
      description: "Para começar a utilizar o STAR SoftFlow, siga estas etapas:",
      icon: <Users className="h-8 w-8 text-azul" />,
      steps: [
        "Aceda à página de login em /login",
        "Introduza o seu email e palavra-passe",
        "Clique no botão 'Entrar'",
        "Se for o seu primeiro acesso, defina uma nova palavra-passe segura",
        "Para recuperar a palavra-passe, clique em 'Esqueceu-se?' na página de login"
      ],
      accessLevel: "Procedimento válido para todos os utilizadores",
      image: `https://${baseURL}/docs/guia/comoaceder.png`
    },
    {
      id: "fluxo-trabalho",
      title: "Fluxo de Trabalho Típico",
      description: "Um fluxo de trabalho normal na plataforma segue geralmente estas etapas:",
      icon: <Layers className="h-8 w-8 text-azul" />,
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
      image: `https://${baseURL}/docs/guia/fluxotipico.png`
    }
  ];

  const filteredTopics = searchQuery.trim()
    ? guiaTopics.filter(topic => 
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : guiaTopics;

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
                <span className="text-xl font-bold">Guia de Início Rápido</span>
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
              Guia de Início Rápido - STAR SoftFlow
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-lg text-gray-600 mb-8"
            >
              Uma visão global da plataforma, navegação e diferentes níveis de acesso
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative max-w-xl mx-auto"
            >
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Pesquisar neste guia..."
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
          <h2 className="text-2xl font-bold text-gray-900 mb-8">O que é o STAR SoftFlow?</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="h-full hover:shadow-md transition-all duration-200 bg-white border-azul/10 rounded-xl group hover:translate-y-[-5px]">
                <CardContent className="p-6">
                  <div className="rounded-full bg-azul/10 p-3 w-fit mb-4 group-hover:bg-azul/20 transition-all duration-300">
                    <BarChart3 className="h-8 w-8 text-azul" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Plataforma de Gestão</h3>
                  <p className="text-gray-600 mb-4">
                    O STAR SoftFlow é uma plataforma completa para gestão de projetos, equipas e recursos no contexto de inovação e investigação
                  </p>
                  <Link href="#navegacao" className="flex items-center text-azul font-medium">
                    <span>Como navegar</span>
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
                    <Users className="h-8 w-8 text-azul" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Perfis de Acesso</h3>
                  <p className="text-gray-600 mb-4">
                    A plataforma oferece diferentes níveis de acesso para garantir o fluxo adequado de informações e controlo de operações
                  </p>
                  <Link href="#niveis-acesso" className="flex items-center text-azul font-medium">
                    <span>Compreender as permissões</span>
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
                    <Settings className="h-8 w-8 text-azul" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Começar a Utilizar</h3>
                  <p className="text-gray-600 mb-4">
                    Descubra como começar a utilizar a plataforma, aceder às suas funcionalidades e familiarizar-se com o fluxo de trabalho
                  </p>
                  <Link href="#login" className="flex items-center text-azul font-medium">
                    <span>Primeiros passos</span>
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
                className="flex flex-col md:flex-row gap-8 items-stretch"
              >
                <div className="md:w-1/2 order-2 md:order-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-azul/10 p-2 rounded-lg">
                      {topic.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{topic.title}</h2>
                  </div>
                  
                  <p className="text-gray-600 mb-6">{topic.description}</p>
                  
                  {topic.features && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Funcionalidades disponíveis:</h3>
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
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Passo a passo:</h3>
                      <ol className="space-y-2 list-decimal ml-5">
                        {topic.steps.map((step, idx) => (
                          <li key={idx} className="text-gray-700 pl-1">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  
                  {topic.actions && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Sequência de ações:</h3>
                      <ul className="space-y-2">
                        {topic.actions.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="bg-azul text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-sm font-medium">{idx+1}</span>
                            <span className="text-gray-700">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-auto">
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium text-azul">Nível de acesso:</span> {topic.accessLevel}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="md:w-1/2 order-1 md:order-2 flex items-center">
                  <div className="rounded-lg overflow-hidden shadow-md bg-white border border-gray-200 w-full">
                    {topic.image ? (
                      <div 
                        className="relative aspect-video cursor-pointer group"
                        onClick={() => setSelectedImage({ 
                          url: topic.image, 
                          alt: `Ilustração: ${topic.title}` 
                        })}
                      >
                        <Image
                          src={topic.image}
                          alt={`Ilustração: ${topic.title}`}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="bg-white/80 px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            Expandir imagem
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-100 flex items-center justify-center">
                        <p className="text-gray-500">Imagem ilustrativa: {topic.title}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      ))}
      
      {/* Documentation Links */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Documentação Detalhada</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Link href="/documentacao/projetos">
                <Card className="h-full hover:shadow-md transition-all duration-200 bg-white border-azul/10 rounded-xl group hover:translate-y-[-5px]">
                  <CardContent className="p-6">
                    <div className="rounded-full bg-azul/10 p-3 w-fit mb-4 group-hover:bg-azul/20 transition-all duration-300">
                      <BarChart3 className="h-6 w-6 text-azul" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Projetos</h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      Guia detalhado sobre a criação e gestão de projetos
                    </p>
                    <div className="flex items-center text-azul font-medium">
                      <span>Ver documentação</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/documentacao/utilizadores">
                <Card className="h-full hover:shadow-md transition-all duration-200 bg-white border-azul/10 rounded-xl group hover:translate-y-[-5px]">
                  <CardContent className="p-6">
                    <div className="rounded-full bg-azul/10 p-3 w-fit mb-4 group-hover:bg-azul/20 transition-all duration-300">
                      <Users className="h-6 w-6 text-azul" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Utilizadores</h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      Manual completo sobre gestão de utilizadores e permissões
                    </p>
                    <div className="flex items-center text-azul font-medium">
                      <span>Ver documentação</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/documentacao/tutoriais">
                <Card className="h-full hover:shadow-md transition-all duration-200 bg-white border-azul/10 rounded-xl group hover:translate-y-[-5px]">
                  <CardContent className="p-6">
                    <div className="rounded-full bg-azul/10 p-3 w-fit mb-4 group-hover:bg-azul/20 transition-all duration-300">
                      <FileText className="h-6 w-6 text-azul" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Tutoriais</h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      Tutoriais passo a passo para tarefas específicas na plataforma
                    </p>
                    <div className="flex items-center text-azul font-medium">
                      <span>Ver tutoriais</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Need Help Section */}
      <section className="py-12 bg-bgApp">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Precisa de ajuda adicional?</h2>
            <p className="text-gray-600 mb-8">
              Se não encontrou o que procura, entre em contacto com a nossa equipa de suporte.
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
                onClick={() => router.push("/tutoriais")}
                className="bg-azul text-white hover:bg-azul-dark rounded-full"
              >
                <FileText className="mr-2 h-5 w-5" />
                Ver Tutoriais
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