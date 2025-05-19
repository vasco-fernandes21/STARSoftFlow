"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ChevronRight, 
  Search,
  BookOpen,
  Code,
  ArrowLeft,
  FileText,
  HelpCircle,
  Users,
  BarChart3,
  GitBranch,
  BookMarked,
  ListChecks,
  Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function DocumentacaoPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const docsCategories = [
    {
      title: "Introdução",
      icon: <BookOpen className="h-6 w-6 text-azul" />,
      links: [
        { title: "Visão Geral", href: "/documentacao/guia-rapido#navegacao" },
        { title: "Primeiros Passos", href: "/documentacao/guia-rapido#login" },
        { title: "Requisitos do Sistema", href: "/documentacao/guia-rapido" }
      ]
    },
    {
      title: "Projetos",
      icon: <BarChart3 className="h-6 w-6 text-azul" />,
      links: [
        { title: "Documentação de Projetos", href: "/documentacao/projetos" },
        { title: "Criar Novo Projeto", href: "/documentacao/projetos#criacao" },
        { title: "Gestão de WorkPackages", href: "/documentacao/projetos#detalhes" },
        { title: "Acompanhamento de Tarefas", href: "/documentacao/projetos#detalhes" }
      ]
    },
    {
      title: "Utilizadores",
      icon: <Users className="h-6 w-6 text-azul" />,
      links: [
        { title: "Documentação de Utilizadores", href: "/documentacao/utilizadores" },
        { title: "Perfis de Utilizador", href: "/documentacao/utilizadores#perfis" },
        { title: "Criação de Utilizadores", href: "/documentacao/utilizadores#criacao" }
      ]
    },
    {
      title: "Recursos Avançados",
      icon: <GitBranch className="h-6 w-6 text-azul" />,
      links: [
        { title: "Documentação de Tutoriais", href: "/documentacao/tutoriais" },
        { title: "Ecossistema de Inovação", href: "/documentacao/guia-rapido#navegacao" },
        { title: "Análise de Dados", href: "/documentacao/projetos#detalhes" },
        { title: "Relatórios", href: "/documentacao/projetos#detalhes" }
      ]
    }
  ];

  const featuredDocs = [
    {
      title: "Guia de Início Rápido",
      description: "Aprenda como começar a usar o STARSoftFlow em poucos minutos.",
      icon: <BookMarked className="h-8 w-8 text-azul" />,
      href: "/documentacao/guia-rapido"
    },
    {
      title: "Gestão de Projetos",
      description: "Descubra como criar e gerir projetos eficientemente.",
      icon: <ListChecks className="h-8 w-8 text-azul" />,
      href: "/documentacao/projetos"
    },
    {
      title: "Gestão de Utilizadores",
      description: "Aprenda a gerir utilizadores, perfis e permissões no sistema.",
      icon: <Users className="h-8 w-8 text-azul" />,
      href: "/documentacao/utilizadores"
    },
    {
      title: "Tutoriais em Vídeo",
      description: "Aceda a tutoriais em vídeo e interativos para aprender de forma visual.",
      icon: <Video className="h-8 w-8 text-azul" />,
      href: "/documentacao/tutoriais"
    }
  ];

  const filteredCategories = searchQuery.trim()
    ? docsCategories.map(category => ({
        ...category,
        links: category.links.filter(link => 
          link.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(category => category.links.length > 0)
    : docsCategories;

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
                onClick={() => router.push("/")}
                className="rounded-full hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Link href="/" className="flex items-center gap-3">
                <Image
                  src="/star-logo-branco.png"
                  alt="STAR Institute"
                  width={120}
                  height={40}
                  className="h-8 w-auto"
                />
                <span className="text-xl font-bold">Documentação</span>
              </Link>
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
              Documentação do STARSoftFlow
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-lg text-gray-600 mb-8"
            >
              Aprenda como utilizar todas as funcionalidades do ecossistema de inovação.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative max-w-xl mx-auto"
            >
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Pesquisar na documentação..."
                className="pl-10 h-12 rounded-lg border-gray-300 shadow-sm focus:border-azul focus:ring-azul"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Featured Documentation */}
      <section className="py-12">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Documentação em Destaque</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {featuredDocs.map((doc, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Link href={doc.href}>
                  <Card className="h-full hover:shadow-md transition-all duration-200 bg-white border-azul/10 rounded-xl group hover:translate-y-[-5px]">
                    <CardContent className="p-6">
                      <div className="rounded-full bg-azul/10 p-3 w-fit mb-4 group-hover:bg-azul/20 transition-all duration-300">
                        {doc.icon}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{doc.title}</h3>
                      <p className="text-gray-600 mb-4">{doc.description}</p>
                      <div className="flex items-center text-azul font-medium">
                        <span>Ler documentação</span>
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Documentation Categories */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Explorar por Categoria</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredCategories.map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className="h-full border-none bg-gray-50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      {category.icon}
                      <h3 className="text-lg font-bold text-gray-900">{category.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {category.links.map((link, linkIndex) => (
                        <li key={linkIndex}>
                          <Link 
                            href={link.href}
                            className="flex items-center gap-2 text-gray-700 hover:text-azul transition-colors py-1"
                          >
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                            <span>{link.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* API Documentation */}
      <section className="py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-8 md:p-12">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="md:w-2/3">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                      Documentação da API
                    </h2>
                    <p className="text-gray-300 mb-6">
                      Explore a API do STARSoftFlow para integrar as funcionalidades da plataforma aos seus sistemas existentes.
                    </p>
                    <Button 
                      disabled
                      className="bg-gray-200 text-gray-500 rounded-full cursor-not-allowed"
                    >
                      <Code className="mr-2 h-5 w-5" />
                      Em desenvolvimento
                    </Button>
                  </motion.div>
                </div>
                <div className="md:w-1/3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="rounded-lg overflow-hidden bg-gray-800 p-4 text-gray-300 font-mono text-sm shadow-inner border border-gray-700"
                  >
                    <pre>{`// Exemplo de requisição
api.utilizador.findByUsername.useQuery(username, {
  enabled: !!username,
  refetchOnWindowFocus: false
})
  .then(response => {
    console.log(response.data);
  });`}</pre>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
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