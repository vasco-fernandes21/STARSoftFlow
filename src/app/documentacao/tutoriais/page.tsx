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
  Video,
  Play,
  Clock,
  Users,
  BarChart3,
  BookOpen,
  Target,
  Zap,
  Star,
  Filter,
  Grid3X3,
  List,
  Eye,
  Calendar,
  User,
  X,
  Volume2,
  Maximize,
  SkipBack,
  SkipForward,
  Pause
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

// Define interfaces for type safety
interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'Básico' | 'Intermediário' | 'Avançado';
  category: string;
  thumbnail: string;
  videoUrl: string;
  instructor: string;
  views: number;
  publishedAt: string;
  tags: string[];
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  count: number;
}

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoTutorial | null;
}

// Função para converter link do OneDrive em link direto
const convertOneDriveUrl = (url: string): string => {
  // Se já for um link direto, retorna como está
  if (url.includes('download?') || url.includes('embed?')) {
    return url;
  }
  
  // Converter link de partilha do OneDrive para link direto
  if (url.includes('sharepoint.com') && url.includes('personal/')) {
    // Extrair parâmetros do URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Encontrar o índice onde está o ID do ficheiro
    const personalIndex = pathParts.findIndex(part => part === 'personal');
    if (personalIndex > -1 && pathParts[personalIndex + 2]) {
      const userId = pathParts[personalIndex + 1];
      // Construir URL embed do OneDrive
      const baseUrl = `${urlObj.origin}/personal/${userId}/_layouts/15/embed.aspx`;
      const params = new URLSearchParams(urlObj.search);
      return `${baseUrl}?${params.toString()}`;
    }
  }
  
  return url;
};

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, video }) => {
  if (!isOpen || !video) return null;

  const videoUrl = convertOneDriveUrl(video.videoUrl);
  const isOneDriveEmbed = videoUrl.includes('embed.aspx') || videoUrl.includes('sharepoint.com');

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-6xl w-full bg-black rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 text-white hover:bg-white/20 rounded-full"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>
        
        <div className="relative aspect-video bg-black">
          {isOneDriveEmbed ? (
            // Player para OneDrive usando iframe
            <iframe
              src={videoUrl}
              className="w-full h-full"
              frameBorder="0"
              scrolling="no"
              allowFullScreen
              title={video.title}
            />
          ) : (
            // Player HTML5 padrão para outros vídeos
            <video 
              controls 
              className="w-full h-full"
              poster={video.thumbnail}
              preload="metadata"
            >
              <source src={videoUrl} type="video/mp4" />
              <p className="text-white p-4">
                O seu navegador não suporta o elemento de vídeo.
                <a href={videoUrl} className="text-blue-400 underline ml-2">
                  Clique aqui para ver o vídeo
                </a>
              </p>
            </video>
          )}
        </div>
        
        <div className="p-6 bg-white">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{video.title}</h2>
              <p className="text-gray-600 leading-relaxed">{video.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-500 border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{video.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{video.instructor}</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span>{video.views.toLocaleString()} visualizações</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{video.publishedAt}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function TutoriaisDocumentacao() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);

  const categories: Category[] = [
    {
      id: "todos",
      name: "Todos os Tutoriais",
      description: "Veja todos os tutoriais disponíveis",
      icon: <Grid3X3 className="h-5 w-5" />,
      color: "bg-gray-100 text-gray-700 border-gray-200",
      count: 12
    },
    {
      id: "primeiros-passos",
      name: "Primeiros Passos",
      description: "Introdução à plataforma",
      icon: <BookOpen className="h-5 w-5" />,
      color: "bg-blue-100 text-blue-700 border-blue-200",
      count: 4
    },
    {
      id: "projetos",
      name: "Gestão de Projetos",
      description: "Criação e gestão de projetos",
      icon: <BarChart3 className="h-5 w-5" />,
      color: "bg-green-100 text-green-700 border-green-200",
      count: 5
    },
    {
      id: "utilizadores",
      name: "Gestão de Utilizadores",
      description: "Administração de utilizadores",
      icon: <Users className="h-5 w-5" />,
      color: "bg-purple-100 text-purple-700 border-purple-200",
      count: 3
    }
  ];

  const videoTutorials: VideoTutorial[] = [
    {
      id: "1",
      title: "Introdução ao STARSoftFlow",
      description: "Conheça a plataforma e suas principais funcionalidades. Este tutorial aborda a navegação básica, o painel inicial e como começar a usar o sistema.",
      duration: "8:30",
      difficulty: "Básico",
      category: "primeiros-passos",
      thumbnail: "/thumbnails/intro-starsoftflow.jpg",
      videoUrl: "https://estgv-my.sharepoint.com/:v:/g/personal/pv25177_alunos_estgv_ipv_pt/EVCezuvHmNNIs6r9WegUtHsB906L-k89Rj2Knl-VLeCnUw?e=6MCphP",
      instructor: "Ana Silva",
      views: 1250,
      publishedAt: "15 Nov 2024",
      tags: ["introdução", "navegação", "básico"]
    },
    {
      id: "2",
      title: "Como Criar o Seu Primeiro Projeto",
      description: "Aprenda a criar um projeto do zero, configurar as informações básicas, definir workpackages e estruturar a equipa do projeto.",
      duration: "15:20",
      difficulty: "Básico",
      category: "projetos",
      thumbnail: "/thumbnails/criar-projeto.jpg",
      videoUrl: "https://example.com/video2.mp4",
      instructor: "João Santos",
      views: 890,
      publishedAt: "12 Nov 2024",
      tags: ["projeto", "criação", "workpackages"]
    },
    {
      id: "3",
      title: "Gestão Avançada de Workpackages",
      description: "Explore funcionalidades avançadas para organizar workpackages, definir dependências, gerir recursos e acompanhar o progresso.",
      duration: "22:45",
      difficulty: "Avançado",
      category: "projetos",
      thumbnail: "/thumbnails/workpackages-avancado.jpg",
      videoUrl: "https://example.com/video3.mp4",
      instructor: "Maria Costa",
      views: 650,
      publishedAt: "10 Nov 2024",
      tags: ["workpackages", "gestão", "avançado"]
    },
    {
      id: "4",
      title: "Configuração de Perfis de Utilizador",
      description: "Saiba como criar e configurar diferentes perfis de utilizador, definir permissões e gerir acessos na plataforma.",
      duration: "12:15",
      difficulty: "Intermediário",
      category: "utilizadores",
      thumbnail: "/thumbnails/perfis-utilizador.jpg",
      videoUrl: "https://example.com/video4.mp4",
      instructor: "Pedro Oliveira",
      views: 720,
      publishedAt: "8 Nov 2024",
      tags: ["utilizadores", "perfis", "permissões"]
    },
    {
      id: "5",
      title: "Dashboard e Relatórios",
      description: "Aprenda a interpretar o dashboard, criar relatórios personalizados e extrair insights dos seus projetos.",
      duration: "18:10",
      difficulty: "Intermediário",
      category: "projetos",
      thumbnail: "/thumbnails/dashboard-relatorios.jpg",
      videoUrl: "https://example.com/video5.mp4",
      instructor: "Sofia Rodrigues",
      views: 980,
      publishedAt: "5 Nov 2024",
      tags: ["dashboard", "relatórios", "análise"]
    },
    {
      id: "6",
      title: "Primeiros Passos - Navegação",
      description: "Tour guiado pela interface da plataforma, conhecendo o menu principal, atalhos e funcionalidades básicas de navegação.",
      duration: "6:45",
      difficulty: "Básico",
      category: "primeiros-passos",
      thumbnail: "/thumbnails/navegacao-basica.jpg",
      videoUrl: "https://example.com/video6.mp4",
      instructor: "Ana Silva",
      views: 1450,
      publishedAt: "3 Nov 2024",
      tags: ["navegação", "interface", "básico"]
    }
  ];

  const filteredVideos = videoTutorials.filter(video => {
    const matchesCategory = selectedCategory === "todos" || video.category === selectedCategory;
    const matchesSearch = searchQuery.trim() === "" || 
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Básico':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Intermediário':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Avançado':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
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
                  <span className="text-xl font-bold">Tutoriais em Vídeo</span>
                </div>
              </Link>
            </div>
            <Button 
              variant="outline" 
              className="border-white border-2 text-white bg-white/10 backdrop-blur-sm hover:bg-white hover:text-azul transition-all duration-300 rounded-full shadow-lg hover:shadow-xl hover:scale-105"
              onClick={() => router.push("/login")}
            >
              <Video className="mr-2 h-4 w-4" />
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
              Tutoriais em Vídeo
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed"
            >
              Aprenda através de tutoriais práticos e interativos organizados por categoria e nível de dificuldade
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative max-w-2xl mx-auto"
            >
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Pesquisar tutoriais..."
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
        {/* Categories Filter */}
        <section className="mb-12">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Explorar por Categoria</h2>
              <p className="text-gray-600">Escolha uma categoria para ver tutoriais específicos</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-full"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Grade
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-full"
              >
                <List className="h-4 w-4 mr-2" />
                Lista
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <Button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                variant={selectedCategory === category.id ? "default" : "outline"}
                className={`rounded-full px-6 py-3 transition-all duration-300 ${
                  selectedCategory === category.id
                    ? "bg-azul hover:bg-azul/90 text-white shadow-lg scale-105"
                    : "border-gray-200 hover:border-azul/50 hover:bg-azul/5 text-gray-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  {category.icon}
                  <span className="font-medium">{category.name}</span>
                  <Badge variant="secondary" className="ml-2 bg-white/20 text-xs">
                    {category.count}
                  </Badge>
                </div>
              </Button>
            ))}
          </div>
        </section>

        {/* Videos Gallery */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {filteredVideos.length} {filteredVideos.length === 1 ? 'tutorial encontrado' : 'tutoriais encontrados'}
              </h3>
              <p className="text-gray-600">
                {selectedCategory === "todos" 
                  ? "Todos os tutoriais disponíveis" 
                  : categories.find(c => c.id === selectedCategory)?.description
                }
              </p>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredVideos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group"
                >
                  <Card className="h-full overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/90 backdrop-blur-sm cursor-pointer"
                       onClick={() => setSelectedVideo(video)}>
                    <CardContent className="p-0">
                      {/* Video Thumbnail */}
                      <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20">
                          <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <Play className="h-8 w-8 text-azul" />
                          </div>
                        </div>
                        <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-lg text-sm font-medium">
                          {video.duration}
                        </div>
                        <div className="absolute bottom-3 left-3">
                          <Badge className={`${getDifficultyColor(video.difficulty)} border font-medium`}>
                            {video.difficulty}
                          </Badge>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h4 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-azul transition-colors duration-300">
                          {video.title}
                        </h4>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {video.description}
                        </p>

                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{video.instructor}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              <span>{video.views}</span>
                            </div>
                          </div>
                          <span>{video.publishedAt}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVideos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm cursor-pointer group"
                       onClick={() => setSelectedVideo(video)}>
                    <CardContent className="p-0">
                      <div className="flex items-center gap-6 p-6">
                        {/* Thumbnail */}
                        <div className="relative w-48 aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20">
                            <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 group-hover:scale-110 transition-transform duration-300">
                              <Play className="h-6 w-6 text-azul" />
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                            {video.duration}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-bold text-xl text-gray-900 group-hover:text-azul transition-colors duration-300">
                              {video.title}
                            </h4>
                            <Badge className={`${getDifficultyColor(video.difficulty)} border font-medium ml-4`}>
                              {video.difficulty}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-600 mb-4 line-clamp-2">
                            {video.description}
                          </p>

                          <div className="flex items-center gap-6 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{video.instructor}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              <span>{video.views} visualizações</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{video.publishedAt}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {filteredVideos.length === 0 && (
            <div className="text-center py-16">
              <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhum tutorial encontrado</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Tente ajustar os filtros ou termos de pesquisa para encontrar o conteúdo que procura.
              </p>
            </div>
          )}
        </section>

        {/* Need Help Section */}
        <section className="py-16 bg-white/60 backdrop-blur-sm border border-gray-100 rounded-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Precisa de ajuda adicional?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Se não encontrou o tutorial que procura, contacte a nossa equipa de suporte ou explore outros recursos disponíveis.
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
              <span className="text-white font-medium">Tutoriais</span>
            </div>
            <div className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} STAR Institute. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      <VideoModal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        video={selectedVideo}
      />
    </div>
  );
}