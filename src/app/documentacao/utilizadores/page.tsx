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
  Users,
  ShieldCheck,
  UserCog,
  UserPlus,
  CheckCircle2,
  Settings,
  Lock
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
  tabs?: TabItem[];
}

export default function UtilizadoresDocumentacao() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  
  const utilizadorTopics: TopicItem[] = [
    {
      id: "perfis",
      title: "Como Compreender os Perfis de Utilizador",
      description: "Antes de criar ou gerir utilizadores, é importante compreender os diferentes perfis disponíveis e seus respetivos níveis de acesso. Cada perfil tem permissões específicas na plataforma.",
      icon: <Users className="h-8 w-8 text-azul" />,
      features: [
        "Administrador: Para aceder a todas as funcionalidades, atribua este perfil apenas a utilizadores com elevadas permissões",
        "Gestor: Ideal para líderes de equipa, permite gerir projetos e utilizadores",
        "Responsável: Adequado para coordenadores de projeto, que só podem gerir os seus próprios projetos",
        "Utilizador Comum: Para membros regulares da equipa, com acesso limitado a projetos específicos (perfil padrão na criação)"
      ],
      image: "/docs/user-profiles.jpg",
      link: { label: "Ver Lista de Utilizadores", href: "/utilizadores" }
    },
    {
      id: "gestao",
      title: "Como Gerir Utilizadores Existentes",
      description: "Para aceder ao painel de gestão de utilizadores, clique em 'Utilizadores' no menu lateral. Aqui pode visualizar, filtrar, editar e desativar contas de utilizadores da plataforma.",
      icon: <UserCog className="h-8 w-8 text-azul" />,
      tabs: [
        { label: "Pesquisa e Filtros", description: "Digite o nome na barra de pesquisa ou utilize os filtros (Ativo, Inativo, Perfil) para encontrar utilizadores" },
        { label: "Visualizar Detalhes", description: "Clique no nome do utilizador para ver o seu perfil completo, histórico e projetos associados" },
        { label: "Editar Utilizador", description: "Clique no ícone de lápis à direita para modificar os dados, o perfil ou as permissões do utilizador" },
        { label: "Ativar/Desativar", description: "Utilize o botão de alternância (toggle) na coluna 'Estado' para alterar o estado do utilizador sem o remover do sistema" }
      ],
      image: "/docs/user-management.jpg",
      link: { label: "Ir para Gestão de Utilizadores", href: "/utilizadores" }
    },
    {
      id: "criacao",
      title: "Como Criar Novos Utilizadores",
      description: "Para adicionar um novo utilizador à plataforma, aceda à página de utilizadores e clique no botão '+ Novo Utilizador' no canto superior direito. Siga o processo guiado de registo.",
      icon: <UserPlus className="h-8 w-8 text-azul" />,
      steps: [
        "Clique em '+ Novo Utilizador' na página de listagem de utilizadores",
        "Preencha o formulário com o nome completo, o email profissional e o cargo na organização",
        "Selecione o perfil apropriado no menu suspenso (Administrador, Gestor, Responsável ou Utilizador)",
        "Na secção 'Projetos', marque as caixas dos projetos a que o utilizador deve ter acesso",
        "Verifique todas as informações e clique em 'Criar Utilizador' para enviar o convite por email"
      ],
      image: "/docs/create-user.jpg",
      link: { label: "Criar Novo Utilizador", href: "/utilizadores/criar" }
    },
    {
      id: "perfil",
      title: "Como Gerir o Seu Perfil Pessoal",
      description: "Cada utilizador pode personalizar o seu próprio perfil e preferências na plataforma. Para aceder às suas configurações pessoais, clique no seu nome no canto superior direito e selecione 'Perfil'.",
      icon: <Settings className="h-8 w-8 text-azul" />,
      features: [
        "Atualizar Dados Pessoais: Clique em 'Editar Perfil' para modificar o seu nome, fotografia, contacto e informações profissionais",
        "Configurar Notificações: No separador 'Notificações', ative ou desative alertas por email ou no sistema para diferentes eventos",
        "Alterar Palavra-passe: Aceda a 'Segurança', introduza a sua palavra-passe atual e depois a nova palavra-passe",
      ],
      image: "/docs/user-profile.jpg",
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
                <span className="text-xl font-bold">Documentação de Utilizadores</span>
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
              Documentação de Utilizadores
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-lg text-gray-600 mb-8"
            >
              Guia completo sobre gestão de utilizadores e permissões na plataforma STARSoftFlow
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
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Gestão de Utilizadores - Guia Prático</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="h-full hover:shadow-md transition-all duration-200 bg-white border-azul/10 rounded-xl group hover:translate-y-[-5px]">
                <CardContent className="p-6">
                  <div className="rounded-full bg-azul/10 p-3 w-fit mb-4 group-hover:bg-azul/20 transition-all duration-300">
                    <Users className="h-8 w-8 text-azul" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Criação e Gestão</h3>
                  <p className="text-gray-600 mb-4">
                    Aprenda como adicionar, modificar e gerir contas de utilizadores de forma eficiente
                  </p>
                  <Link href="#criacao" className="flex items-center text-azul font-medium">
                    <span>Ver instruções</span>
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
                    <ShieldCheck className="h-8 w-8 text-azul" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Permissões e Segurança</h3>
                  <p className="text-gray-600 mb-4">
                    Descubra como configurar níveis de acesso e garantir a segurança dos dados
                  </p>
                  <Link href="#permissoes" className="flex items-center text-azul font-medium">
                    <span>Ver instruções</span>
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
                    <UserPlus className="h-8 w-8 text-azul" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Perfil e Preferências</h3>
                  <p className="text-gray-600 mb-4">
                    Saiba como personalizar as suas configurações e gerir os seus dados pessoais
                  </p>
                  <Link href="#perfil" className="flex items-center text-azul font-medium">
                    <span>Ver instruções</span>
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
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Instruções detalhadas:</h3>
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
                  
                  {topic.tabs && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        {topic.id === 'gestao' ? 'Ações disponíveis:' : 'Funcionalidades:'}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {topic.tabs.map((tab, idx) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                            <h4 className="font-medium text-azul">{tab.label}</h4>
                            <p className="text-sm text-gray-600">{tab.description}</p>
                            {tab.access && (
                              <p className="text-xs text-gray-500 mt-1">Quem pode aceder: {tab.access}</p>
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
                        className="bg-azul text-white hover:bg-azul-dark rounded-full"
                      >
                        {topic.link.label}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="md:w-1/2 order-1 md:order-2 flex items-center">
                  <div className="rounded-lg overflow-hidden shadow-md bg-white border border-gray-200 w-full">
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <p className="text-gray-500">Imagem ilustrativa: {topic.title}</p>
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
    </div>
  );
} 