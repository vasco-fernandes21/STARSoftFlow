"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ChevronRight, 
  Search,
  ArrowLeft,
  FileText,
  HelpCircle,
  Video,
  Play,
  Users,
  BarChart3,
  BookOpen,
  Target,
  Zap,
  Star,
  Filter,
  Grid3X3,
  List,
  Calendar,
  X,
  Volume2,
  Maximize,
  SkipBack,
  SkipForward,
  Pause,
  Copy,
  ExternalLink
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
  difficulty: 'Básico' | 'Intermediário' | 'Avançado';
  category: string;
  thumbnail: string;
  videoUrl: string;
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

// Função utilitária para extrair o ID do vídeo do YouTube
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  // Padrões de URL do YouTube suportados
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

// Função para gerar URL de thumbnail do YouTube
const getYouTubeThumbnail = (url: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'high'): string | null => {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  
  // Diferentes qualidades disponíveis:
  // - default.jpg (120x90)
  // - mqdefault.jpg (320x180) 
  // - hqdefault.jpg (480x360) - mais confiável
  // - sddefault.jpg (640x480)
  // - maxresdefault.jpg (1280x720) - nem sempre disponível
  const qualityMap = {
    'default': 'default',
    'medium': 'mqdefault', 
    'high': 'hqdefault',
    'standard': 'sddefault',
    'maxres': 'maxresdefault'
  };
  
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
};

// Função para gerar URLs de fallback em caso de erro
const getYouTubeThumbnailFallbacks = (url: string): string[] => {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return [];
  
  // Lista de fallbacks em ordem de preferência
  // Evitamos maxresdefault.jpg pois muitas vezes não existe para vídeos com thumbnails autogenerated
  return [
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/default.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
  ];
};

// Componente para thumbnail do YouTube com fallbacks automáticos
const YouTubeThumbnail: React.FC<{
  videoUrl: string;
  alt: string;
  className?: string;
  sizes?: string;
  fill?: boolean;
}> = ({ videoUrl, alt, className, sizes, fill }) => {
  const [currentSrcIndex, setCurrentSrcIndex] = useState(0);
  const fallbackUrls = getYouTubeThumbnailFallbacks(videoUrl);
  
  const handleError = () => {
    if (currentSrcIndex < fallbackUrls.length - 1) {
      setCurrentSrcIndex(currentSrcIndex + 1);
    }
  };

  // Reset do índice quando a URL do vídeo muda
  useEffect(() => {
    setCurrentSrcIndex(0);
  }, [videoUrl]);

  if (fallbackUrls.length === 0 || !fallbackUrls[currentSrcIndex]) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-azul/10 to-blue-500/10">
        <Video className="h-12 w-12 text-azul/50" />
      </div>
    );
  }

  return (
    <Image
      src={fallbackUrls[currentSrcIndex]!}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      onError={handleError}
    />
  );
};
const getYouTubeEmbedUrl = (url: string): string => {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return url; // Retorna a URL original se não for YouTube
  
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0`;
};

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, video }) => {
  if (!isOpen || !video) return null;

  const isYouTubeLink = getYouTubeVideoId(video.videoUrl) !== null;

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
          {isYouTubeLink ? (
            // Player do YouTube com configurações otimizadas
            <iframe
              src={getYouTubeEmbedUrl(video.videoUrl)}
              className="w-full h-full"
              frameBorder="0"
              allowFullScreen
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              loading="lazy"
            />
          ) : (
            // Player HTML5 para MP4 e outros formatos
            <video 
              controls 
              className="w-full h-full"
              poster={video.thumbnail}
              preload="metadata"
            >
              <source src={video.videoUrl} type="video/mp4" />
              <source src={video.videoUrl} type="video/webm" />
              <p className="text-white p-4">
                O seu navegador não suporta o elemento de vídeo.
                <a href={video.videoUrl} className="text-blue-400 underline ml-2" target="_blank" rel="noopener noreferrer">
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
      count: 6
    },
    {
      id: "primeiros-passos",
      name: "Primeiros Passos",
      description: "Introdução à plataforma",
      icon: <BookOpen className="h-5 w-5" />,
      color: "bg-blue-100 text-blue-700 border-blue-200",
      count: 1
    },
    {
      id: "projetos",
      name: "Gestão de Projetos",
      description: "Criação e gestão de projetos",
      icon: <BarChart3 className="h-5 w-5" />,
      color: "bg-green-100 text-green-700 border-green-200",
      count: 3
    },
    {
      id: "utilizadores",
      name: "Gestão de Utilizadores",
      description: "Administração de utilizadores",
      icon: <Users className="h-5 w-5" />,
      color: "bg-purple-100 text-purple-700 border-purple-200",
      count: 1
    }
  ];

  const videoTutorials: VideoTutorial[] = [
    {
      id: "2",
      title: "Como Criar o Seu Primeiro Projeto",
      description: "Aprenda a criar um projeto do zero, configurar as informações básicas, definir workpackages e estruturar a equipa do projeto.",
      difficulty: "Básico",
      category: "projetos",
      thumbnail: getYouTubeThumbnail("https://www.youtube.com/watch?v=Lblm2FV217I", 'high') || "",
      videoUrl: "https://www.youtube.com/watch?v=Lblm2FV217I",
      publishedAt: "3 Jun 2025",
      tags: ["projeto", "criação", "workpackages"]
    },
    {
      id: "3",
      title: "Gestão Avançada de Workpackages",
      description: "Explore funcionalidades avançadas para organizar workpackages, definir tarefas, gerir recursos e acompanhar o progresso.",
      difficulty: "Avançado",
      category: "projetos",
      thumbnail: getYouTubeThumbnail("https://www.youtube.com/watch?v=188yPT1gnSA", 'high') || "",
      videoUrl: "https://youtu.be/188yPT1gnSA",
      publishedAt: "10 Jun 2025",
      tags: ["workpackages", "gestão", "avançado"]
    },
    {
      id: "4",
      title: "Configuração de Perfis de Utilizador",
      description: "Saiba como criar e configurar diferentes perfis de utilizador, definir permissões e gerir acessos na plataforma.",
      difficulty: "Intermediário",
      category: "utilizadores",
      thumbnail: getYouTubeThumbnail("https://www.youtube.com/watch?v=IgetV4_wgFE", 'high') || "",
      videoUrl: "https://youtu.be/IgetV4_wgFE", //TODO: Adicionar vídeo
      publishedAt: "8 Jun 2024",
      tags: ["utilizadores", "perfis", "permissões"]
    },
    {
      id: "5",
      title: "Consulta de Alocações e Relatórios",
      description: "Aprenda a interpretar a tabela de alocações, criar relatórios personalizados e reduzir o tempo necessário para a gestão de RH.",
      difficulty: "Intermediário",
      category: "projetos",
      thumbnail: getYouTubeThumbnail("https://www.youtube.com/watch?v=cob8TSjkD34", 'high') || "",
      videoUrl: "https://youtu.be/cob8TSjkD34",
      publishedAt: "5 Jun 2025",
      tags: ["dashboard", "relatórios", "análise"]
    },
    {
      id: "6",
      title: "Primeiros Passos - Navegação",
      description: "Tour guiado pela interface da plataforma, conhecendo o menu principal, atalhos e funcionalidades básicas de navegação.",
      difficulty: "Básico",
      category: "primeiros-passos",
      thumbnail: "",
      videoUrl: "https://www.youtube.com/embed/Yr-qauCR_bY",
      publishedAt: "3 Jun 2025",
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
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-azul transition-colors duration-300" />
                <Input
                  placeholder="Pesquisar tutoriais..."
                  className="pl-12 pr-16 py-4 text-lg text-gray-900 placeholder:text-gray-500 rounded-2xl border-0 bg-white/95 backdrop-blur-sm shadow-xl focus:shadow-2xl transition-all duration-300 focus:ring-2 focus:ring-white/50 hover:bg-white group-hover:shadow-2xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <kbd className="hidden sm:inline-block px-2 py-1 bg-white/20 border border-white/30 rounded text-xs text-white/80 font-mono backdrop-blur-sm">
                    ⌘K
                  </kbd>
                </div>
              </div>
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
                        {(() => {
                          // Lógica inteligente de thumbnail
                          const youtubeId = getYouTubeVideoId(video.videoUrl);
                          const isYoutube = youtubeId !== null;

                          if (isYoutube) {
                            return (
                              <YouTubeThumbnail
                                videoUrl={video.videoUrl}
                                alt={`Thumbnail: ${video.title}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              />
                            );
                          } else if (video.thumbnail) {
                            return (
                              <Image
                                src={video.thumbnail}
                                alt={`Thumbnail: ${video.title}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              />
                            );
                          } else {
                            return (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-azul/10 to-blue-500/10">
                                <Video className="h-12 w-12 text-azul/50" />
                              </div>
                            );
                          }
                        })()}
                        
                        {/* Overlay com botão play */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors duration-300">
                          <div className="bg-white/90 backdrop-blur-sm rounded-full p-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <Play className="h-8 w-8 text-azul" />
                          </div>
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

                        <div className="flex justify-end text-sm text-gray-500">
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
                    <CardContent className="p-6">
                      <div className="flex items-center gap-6">
                        {/* Thumbnail */}
                        <div className="relative w-48 aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                          {(() => {
                            // Lógica inteligente de thumbnail
                            const youtubeId = getYouTubeVideoId(video.videoUrl);
                            const isYoutube = youtubeId !== null;

                            if (isYoutube) {
                              return (
                                <YouTubeThumbnail
                                  videoUrl={video.videoUrl}
                                  alt={`Thumbnail: ${video.title}`}
                                  fill
                                  className="object-cover rounded-xl"
                                  sizes="200px"
                                />
                              );
                            } else if (video.thumbnail) {
                              return (
                                <Image
                                  src={video.thumbnail}
                                  alt={`Thumbnail: ${video.title}`}
                                  fill
                                  className="object-cover rounded-xl"
                                  sizes="200px"
                                />
                              );
                            } else {
                              return (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-azul/10 to-blue-500/10 rounded-xl">
                                  <Video className="h-8 w-8 text-azul/50" />
                                </div>
                              );
                            }
                          })()}
                          
                          {/* Overlay com botão play */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors duration-300 rounded-xl">
                            <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 group-hover:scale-110 transition-transform duration-300">
                              <Play className="h-6 w-6 text-azul" />
                            </div>
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