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
  Users,
  BarChart3,
  Rocket,
  Video,
  Sparkles,
  Zap,
  ArrowUpRight,
  Clock,
  Terminal,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function DocumentacaoPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCommand, setCopiedCommand] = useState("");

  const docsCategories = [
    {
      title: "Guia de Início Rápido",
      icon: <Rocket className="h-6 w-6 text-azul" />,
      description: "Aprenda como começar a usar o STARSoftFlow",
      color: "from-gray-50/80 to-slate-100/80",
      href: "/documentacao/guia-rapido",
      badge: "Essencial",
      badgeColor: "bg-azul/10 text-azul border-azul/20",
      time: "15 min",
      links: [
        { title: "Visão Geral da Plataforma", href: "/documentacao/guia-rapido#navegacao", time: "5 min" },
        { title: "Primeiros Passos", href: "/documentacao/guia-rapido#login", time: "10 min" },
        { title: "Áreas de Acesso", href: "/documentacao/guia-rapido#areas-comuns", time: "8 min" }
      ]
    },
    {
      title: "Gestão de Projetos",
      icon: <BarChart3 className="h-6 w-6 text-azul" />,
      description: "Domine a criação e gestão completa de projetos",
      color: "from-slate-50/80 to-gray-100/80",
      href: "/documentacao/projetos",
      badge: "Popular",
      badgeColor: "bg-gray-100 text-gray-700 border-gray-200",
      time: "25 min",
      links: [
        { title: "Criar Novo Projeto", href: "/documentacao/projetos#criacao", time: "8 min" },
        { title: "Gestão de WorkPackages", href: "/documentacao/projetos#detalhes", time: "12 min" },
        { title: "Importação via Excel", href: "/documentacao/projetos#importacao", time: "10 min" },
        { title: "Painel de Controlo", href: "/documentacao/projetos#dashboard", time: "15 min" }
      ]
    },
    {
      title: "Gestão de Utilizadores",
      icon: <Users className="h-6 w-6 text-azul" />,
      description: "Aprenda a gerir utilizadores, perfis e permissões",
      color: "from-gray-50/80 to-slate-100/80",
      href: "/documentacao/utilizadores",
      badge: "Avançado",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
      time: "20 min",
      links: [
        { title: "Perfis de Utilizador", href: "/documentacao/utilizadores#perfis", time: "8 min" },
        { title: "Criação de Utilizadores", href: "/documentacao/utilizadores#criacao", time: "6 min" },
        { title: "Gestão de Permissões", href: "/documentacao/utilizadores#gestao", time: "10 min" }
      ]
    },
    {
      title: "Tutoriais em Vídeo",
      icon: <Video className="h-6 w-6 text-azul" />,
      description: "Aprenda através de tutoriais práticos e interativos",
      color: "from-slate-50/80 to-gray-100/80",
      href: "/documentacao/tutoriais",
      badge: "Novo",
      badgeColor: "bg-azul/15 text-azul-dark border-azul/25",
      time: "Variável",
      links: [
        { title: "Introdução à Plataforma", href: "/documentacao/tutoriais#introducao", time: "15 min" },
        { title: "Projetos Avançados", href: "/documentacao/tutoriais#projetos", time: "30 min" },
        { title: "Tutoriais Interativos", href: "/documentacao/tutoriais#interativo", time: "Variável" }
      ]
    }
  ];

  const filteredCategories = searchQuery.trim()
    ? docsCategories.filter(category => 
        category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.links.some(link => 
          link.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : docsCategories;

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(""), 2000);
  };

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
                onClick={() => router.push("/")}
                className="rounded-full hover:bg-white/20 transition-all duration-300 hover:scale-110"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Link href="/" className="flex items-center gap-3 group">
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
                  <span className="text-xl font-bold">Documentação</span>
                </div>
              </Link>
            </div>
            <Button 
              variant="outline" 
              className="border-white border-2 text-white bg-white/10 backdrop-blur-sm hover:bg-white hover:text-azul transition-all duration-300 rounded-full shadow-lg hover:shadow-xl hover:scale-105"
              onClick={() => router.push("/login")}
            >
              <Zap className="mr-2 h-4 w-4" />
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
              Centro de Documentação
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
              Tudo o que precisa para dominar o STARSoftFlow
            </p>
            
            {/* Search Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative max-w-2xl mx-auto"
            >
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Pesquisar na documentação..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-4 text-lg rounded-2xl border-0 bg-white/95 backdrop-blur-sm shadow-xl focus:shadow-2xl transition-all duration-300 focus:ring-2 focus:ring-white/50"
              />
            </motion.div>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-12 relative z-10">
        
        {/* Unified Documentation Section */}
        <section className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Explore a Documentação
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Documentação completa, organizada por tópicos para facilitar a sua aprendizagem
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredCategories.map((category, index) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                className="group"
              >
                <Card className="h-full overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/90 backdrop-blur-sm border border-gray-100/50">
                  <CardContent className="p-0">
                    {/* Card Header */}
                    <div className={`p-6 bg-gradient-to-r ${category.color} border-b border-gray-200/60`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                            {category.icon}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{category.title}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${category.badgeColor}`}>
                                {category.badge}
                              </span>
                              <div className="flex items-center gap-1 text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span className="text-xs font-medium">{category.time}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Link href={category.href}>
                          <Button 
                            size="sm" 
                            className="bg-azul hover:bg-azul-dark text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 shadow-lg"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{category.description}</p>
                    </div>

                    {/* Quick Links */}
                    <div className="p-6 bg-white/50">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-azul" />
                        Links Rápidos
                      </h4>
                      <div className="space-y-2">
                        {category.links.map((link, linkIndex) => (
                          <Link 
                            key={linkIndex}
                            href={link.href}
                            className="group-link flex items-center justify-between p-3 rounded-xl bg-white hover:bg-gray-50 transition-all duration-300 border border-gray-100 hover:border-azul/30 hover:shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-gray-300 group-link-hover:bg-azul transition-colors duration-300"></div>
                              <span className="font-medium text-gray-700 group-link-hover:text-azul transition-colors duration-300">
                                {link.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs font-medium">{link.time}</span>
                              <ChevronRight className="h-4 w-4 transform group-link-hover:translate-x-1 transition-transform duration-300" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* API Documentation Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-16"
        >
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 md:p-12 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-dot-pattern opacity-10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-azul/20 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-azul rounded-xl">
                  <Code className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-2">API & Integrações</h2>
                  <p className="text-gray-300 text-lg">Integre o STARSoftFlow com outras ferramentas e sistemas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div>
                  <h3 className="text-2xl font-bold mb-4 text-blue-300">Começar Agora</h3>
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    Acesse nossa API RESTful para integrar funcionalidades do STARSoftFlow 
                    diretamente nas suas aplicações.
                  </p>
                  
                  <div className="space-y-4">
                    <Link 
                      href="/documentacao/api" 
                      className="group flex items-center gap-3 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/10 hover:border-white/30"
                    >
                      <Terminal className="h-5 w-5 text-blue-300" />
                      <div>
                        <span className="font-semibold">Referência da API</span>
                        <p className="text-sm text-gray-400">Documentação completa dos endpoints</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Link>

                    <Link 
                      href="/documentacao/webhooks" 
                      className="group flex items-center gap-3 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/10 hover:border-white/30"
                    >
                      <Zap className="h-5 w-5 text-yellow-300" />
                      <div>
                        <span className="font-semibold">Webhooks</span>
                        <p className="text-sm text-gray-400">Receba notificações em tempo real</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Link>
                  </div>
                </div>

                <div className="bg-black/40 rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-green-400 font-mono text-sm">$ api-example</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyCommand('curl -X GET "https://api.starsoftflow.com/v1/projects" -H "Authorization: Bearer YOUR_API_KEY"')}
                      className="hover:bg-white/10 text-gray-400 hover:text-white transition-colors duration-300"
                    >
                      {copiedCommand === 'curl -X GET "https://api.starsoftflow.com/v1/projects" -H "Authorization: Bearer YOUR_API_KEY"' ? 
                        <Check className="h-4 w-4" /> : 
                        <Copy className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                  <div className="font-mono text-sm space-y-2">
                    <div className="text-blue-300">curl -X GET \</div>
                    <div className="text-yellow-300 pl-4">"https://api.starsoftflow.com/v1/projects" \</div>
                    <div className="text-green-300 pl-4">-H "Authorization: Bearer YOUR_API_KEY"</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <Image
                src="/star-logo-branco.png"
                alt="STAR Institute"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
              <span className="text-lg font-semibold">STARSoftFlow</span>
            </div>
            <div className="flex items-center gap-6 text-gray-400">
              <Link href="/sobre" className="hover:text-white transition-colors duration-300">
                Sobre
              </Link>
              <Link href="/contactos" className="hover:text-white transition-colors duration-300">
                Contactos
              </Link>
              <Link href="/termos" className="hover:text-white transition-colors duration-300">
                Termos
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 STAR Institute. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}