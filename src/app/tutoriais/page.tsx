"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  BookOpen, 
  Play, 
  Clock, 
  ChevronRight,
  Search,
  BarChart3,
  Users,
  ListChecks,
  Layers,
  FileText,
  ArrowRight,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TutoriaisPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const tutorialCategories = [
    {
      name: "Iniciante",
      icon: <BookOpen className="h-6 w-6 text-azul" />,
      tutorials: [
        {
          title: "Introdução ao STARSoftFlow",
          duration: "5 min",
          description: "Conheça as funcionalidades básicas da plataforma",
          image: "/tutorials/intro.jpg",
          href: "#intro"
        },
        {
          title: "Como criar sua conta",
          duration: "3 min",
          description: "Passo a passo para criar e configurar sua conta",
          image: "/tutorials/conta.jpg",
          href: "#conta"
        },
        {
          title: "Navegação pela interface",
          duration: "4 min",
          description: "Aprenda a navegar eficientemente pela plataforma",
          image: "/tutorials/interface.jpg",
          href: "#interface"
        }
      ]
    },
    {
      name: "Projetos",
      icon: <BarChart3 className="h-6 w-6 text-azul" />,
      tutorials: [
        {
          title: "Criar um novo projeto",
          duration: "6 min",
          description: "Aprenda a criar e configurar um projeto do zero",
          image: "/tutorials/novo-projeto.jpg",
          href: "#novo-projeto"
        },
        {
          title: "Gestão de workpackages",
          duration: "8 min",
          description: "Como organizar e acompanhar workpackages",
          image: "/tutorials/workpackages.jpg",
          href: "#workpackages"
        },
        {
          title: "Cronograma de projeto",
          duration: "5 min",
          description: "Visualização e edição de cronogramas",
          image: "/tutorials/cronograma.jpg",
          href: "#cronograma"
        }
      ]
    },
    {
      name: "Equipa",
      icon: <Users className="h-6 w-6 text-azul" />,
      tutorials: [
        {
          title: "Adicionar membros à equipa",
          duration: "4 min",
          description: "Como convidar e gerenciar membros da equipa",
          image: "/tutorials/membros.jpg",
          href: "#membros"
        },
        {
          title: "Atribuição de tarefas",
          duration: "5 min",
          description: "Distribuir e acompanhar tarefas entre a equipa",
          image: "/tutorials/tarefas.jpg",
          href: "#tarefas"
        }
      ]
    },
    {
      name: "Avançado",
      icon: <Layers className="h-6 w-6 text-azul" />,
      tutorials: [
        {
          title: "Relatórios e análises",
          duration: "7 min",
          description: "Extraia insights com relatórios detalhados",
          image: "/tutorials/relatorios.jpg",
          href: "#relatorios"
        },
        {
          title: "Integração com outras ferramentas",
          duration: "6 min",
          description: "Conecte o SoftFlow com suas ferramentas existentes",
          image: "/tutorials/integracoes.jpg",
          href: "#integracoes"
        }
      ]
    }
  ];

  const featuredTutorials = [
    {
      title: "Como começar um projeto eficiente",
      duration: "10 min",
      description: "Aprenda as melhores práticas para iniciar seu projeto com o pé direito",
      image: "/tutorials/featured-1.jpg",
      href: "#featured-1"
    },
    {
      title: "Guia completo de gestão de workpackages",
      duration: "15 min",
      description: "Domine a organização e acompanhamento de workpackages para maximizar a produtividade",
      image: "/tutorials/featured-2.jpg",
      href: "#featured-2"
    },
    {
      title: "Simplificando relatórios e apresentações",
      duration: "12 min",
      description: "Aprenda a gerar relatórios profissionais e apresentações de impacto",
      image: "/tutorials/featured-3.jpg",
      href: "#featured-3"
    }
  ];

  // Filtrar tutoriais com base na pesquisa
  const filteredCategories = searchQuery.trim()
    ? tutorialCategories.map(category => ({
        ...category,
        tutorials: category.tutorials.filter(tutorial => 
          tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tutorial.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(category => category.tutorials.length > 0)
    : tutorialCategories;

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
                <span className="text-xl font-bold">Tutoriais</span>
              </Link>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              <Button 
                variant="ghost" 
                className="hover:bg-white/10"
                onClick={() => router.push("/documentacao")}
              >
                Documentação
              </Button>
              <Button 
                variant="ghost" 
                className="hover:bg-white/10"
                onClick={() => router.push("/documentacao/tutoriais")}
              >
                Guia de Tutoriais
              </Button>
              <Button 
                variant="outline" 
                className="border-white border-2 text-white hover:bg-white/10 rounded-full"
                onClick={() => router.push("/login")}
              >
                Aceder à Plataforma
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Hero Search */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 md:px-6 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            >
              Tutoriais do STARSoftFlow
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-lg text-gray-600 mb-8"
            >
              Aprenda a utilizar todas as funcionalidades através dos nossos vídeos e guias
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative max-w-xl mx-auto"
            >
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Pesquisar tutoriais..."
                className="pl-10 h-12 rounded-lg border-gray-300 shadow-sm focus:border-azul focus:ring-azul"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Featured Tutorials */}
      <section className="py-12">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Tutoriais em Destaque</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {featuredTutorials.map((tutorial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Link href={tutorial.href}>
                  <Card className="h-full overflow-hidden hover:shadow-md transition-all duration-200 group rounded-xl hover:translate-y-[-5px]">
                    <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
                      <div className="flex items-center justify-center h-full">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-azul/10 rounded-full p-4 group-hover:bg-azul/20 transition-all duration-300">
                            <Play className="h-8 w-8 text-azul fill-azul/50" />
                          </div>
                        </div>
                        <div className="absolute bottom-3 right-3 bg-gray-900/80 text-white text-xs px-2 py-1 rounded-md flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {tutorial.duration}
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-azul transition-colors">
                        {tutorial.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        {tutorial.description}
                      </p>
                      <div className="flex items-center text-azul text-sm font-medium">
                        <span>Assistir tutorial</span>
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
      
      {/* Tutorial Categories */}
      {filteredCategories.map((category, categoryIndex) => (
        <section 
          key={categoryIndex} 
          className={`py-12 ${categoryIndex % 2 === 0 ? 'bg-white' : 'bg-bgApp'}`}
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-center gap-3 mb-8">
              {category.icon}
              <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.tutorials.map((tutorial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  <Link href={tutorial.href}>
                    <Card className="h-full overflow-hidden hover:shadow-md transition-all duration-200 group">
                      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                        <div className="flex items-center justify-center h-full">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-azul/10 rounded-full p-3 group-hover:bg-azul/20 transition-all duration-300">
                              <Play className="h-6 w-6 text-azul fill-azul/50" />
                            </div>
                          </div>
                          <div className="absolute bottom-2 right-2 bg-gray-900/80 text-white text-xs px-2 py-1 rounded-md flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {tutorial.duration}
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-azul transition-colors">
                          {tutorial.title}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {tutorial.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
            
            {categoryIndex === tutorialCategories.length - 1 && (
              <div className="mt-10 text-center">
                <Button
                  variant="outline"
                  onClick={() => router.push("/documentacao")}
                  className="border-azul text-azul hover:bg-azul/5 rounded-full"
                >
                  <FileText className="mr-2 h-5 w-5" />
                  Ver documentação completa
                </Button>
              </div>
            )}
          </div>
        </section>
      ))}
      
      {/* CTA */}
      <section className="bg-gradient-to-r from-azul to-azul-dark py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern-grid.svg')] bg-center opacity-10"></div>
        <div className="absolute right-0 bottom-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Pronto para começar?
            </h2>
            <p className="text-white/90 text-lg mb-8">
              Aplique o que aprendeu e comece a aproveitar todo o potencial do STARSoftFlow.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-5">
              <Button
                size="lg"
                onClick={() => router.push("/login")}
                className="bg-white text-azul hover:bg-white/90 font-medium rounded-full px-8 shadow-md hover:shadow-lg transition-all duration-300"
              >
                Aceder à Plataforma
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/documentacao")}
                className="border-white border-2 text-white hover:bg-white/10 rounded-full px-8"
              >
                Ver Documentação
                <ArrowRight className="ml-2 h-5 w-5" />
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
              <span className="text-white font-medium">Tutoriais</span>
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