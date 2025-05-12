"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  MessageSquare, 
  Send,
  Loader2,
  Image as ImageIcon,
  X,
  CheckCircle,
  Clock,
  Search,
  AlertCircle,
  User,
  ClipboardCheck,
  Eye,
  EyeOff,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/trpc/react";
import { PageLayout } from "@/components/common/PageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { usePermissions } from "@/hooks/usePermissions";
import { TRPCClientError } from "@trpc/client";

// Definição de tipos
type StatusFilter = "todos" | "PENDENTE" | "RESOLVIDO";

// Define Feedback type based on expected data from API (adjust if needed)
type Feedback = {
  id: string;
  descricao: string;
  imagemUrl?: string | null; // Make imagemUrl optional
  createdAt: string | Date; // API might return string, Date object used internally
  estado: "PENDENTE" | "RESOLVIDO";
  user: {
    name: string | null;
    foto?: string | null; // Make foto optional if not always present
  };
  resposta?: string | null; // Add resposta field
};

export default function FeedbackPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<StatusFilter>("todos");
  const [searchQuery, setSearchQuery] = useState("");

  // Consulta de feedbacks com configuração de cache
  const { data: allFeedbacks, isLoading } = api.feedback.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
  });

  // Filtrar feedbacks com base no tab ativo e consulta de pesquisa
  const filteredFeedbacks = allFeedbacks?.filter(feedback => {
    const matchesStatus = activeTab === "todos" || feedback.estado === activeTab;
    const matchesSearch = !searchQuery || 
      feedback.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (feedback.user.name?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Contagem de itens por estado
  const pendingCount = allFeedbacks?.filter(f => f.estado === "PENDENTE").length || 0;
  const resolvedCount = allFeedbacks?.filter(f => f.estado === "RESOLVIDO").length || 0;
  const totalCount = allFeedbacks?.length || 0;

  // Redirecionar se não autenticado
  if (!session) {
    redirect("/login");
  }

  return (
    <PageLayout>
      <div className="container mx-auto max-w-full space-y-8 px-0">
        {/* Cabeçalho e estatísticas */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Feedback & Suporte</h1>
          <p className="text-slate-500">
            Partilhe as suas ideias, sugestões ou reporte problemas da plataforma.
          </p>
        </div>

        {/* Dashboard de estatísticas */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard 
            title="Total" 
            value={totalCount} 
            icon={ClipboardCheck} 
            description="Total de feedbacks"
            color="azul"
          />
          <StatsCard 
            title="Pendentes" 
            value={pendingCount} 
            icon={Clock} 
            description="Aguardam resposta"
            color="amber"
          />
          <StatsCard 
            title="Resolvidos" 
            value={resolvedCount} 
            icon={CheckCircle} 
            description="Já respondidos"
            color="green"
          />
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Formulário de feedback - Sempre visível */}
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="sticky top-24 space-y-6">
              <FeedbackForm 
                onSuccess={() => {
                  console.log("Feedback enviado com sucesso!");
                }}
              />
            </div>
          </div>

          {/* Lista de feedbacks com tabs e pesquisa */}
          <div className="flex-1 space-y-6">
            <Card>
              <CardHeader className="px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <Tabs 
                    defaultValue="todos" 
                    value={activeTab} 
                    onValueChange={(v) => setActiveTab(v as StatusFilter)}
                    className="w-full sm:w-auto"
                  >
                    <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                      <TabsTrigger value="todos" className="px-4">
                        <span className="mr-2">Todos</span>
                        <Badge variant="secondary" className="ml-auto">
                          {totalCount}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="PENDENTE" className="px-4">
                        <span className="mr-2">Pendentes</span>
                        <Badge variant="outline" className="ml-auto bg-amber-100/80 text-amber-700 hover:bg-amber-100">
                          {pendingCount}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="RESOLVIDO" className="px-4">
                        <span className="mr-2">Resolvidos</span>
                        <Badge variant="outline" className="ml-auto bg-green-100/80 text-green-700 hover:bg-green-100">
                          {resolvedCount}
                        </Badge>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="relative w-full sm:w-64 md:w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Pesquisar feedbacks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>

              <Separator />

              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-32">
                    <Loader2 className="h-12 w-12 animate-spin text-azul/30" />
                  </div>
                ) : !filteredFeedbacks?.length ? (
                  <EmptyFeedbackState query={searchQuery} activeTab={activeTab} />
                ) : (
                  <FeedbackList feedbacks={filteredFeedbacks} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

// Componente para o formulário de feedback
function FeedbackForm({ onSuccess }: { onSuccess: () => void }) {
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get tRPC context at the top level
  const utils = api.useContext();

  // Destructure mutateAsync, keep hook result object
  const createFeedback = api.feedback.create.useMutation({
    onSuccess: () => {
      toast.success("Feedback enviado com sucesso!");
      // Invalidate using the pre-fetched context
      utils.feedback.list.invalidate(); 
      // Call the prop onSuccess if it does other things (like clearing form)
      onSuccess(); // Keep this if it resets state
      // setDescription(""); // Moved these to onSuccess prop if preferred
      // setImage(null);
      // setPreviewUrl(null);
      // if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (error) => {
      toast.error(`Erro ao enviar feedback: ${error.message}`);
    },
  });
  const createFeedbackMutate = createFeedback.mutateAsync;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem não pode exceder 5MB");
        return;
      }
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Por favor, descreva o seu feedback");
      return;
    }

    try {
      if (image) {
        const reader = new FileReader();
        reader.readAsDataURL(image);
        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string)?.split(',')[1];
            if (!base64Data) {
              throw new Error("Failed to read image data.");
            }
            await createFeedbackMutate({
              descricao: description,
              image: {
                name: image.name,
                type: image.type,
                data: base64Data,
              },
            });
          } catch (error: any) {
            console.error("Error during feedback submission (with image):", error);
            toast.error(`Ocorreu um erro no envio: ${error.message || "Tente novamente"}`);
          }
        };
        reader.onerror = (error) => {
          console.error("Error reading file:", error);
          toast.error("Erro ao ler o ficheiro de imagem.");
        };
      } else {
        try {
          await createFeedbackMutate({
            descricao: description,
          });
        } catch (error: any) {
          console.error("Error during feedback submission (no image):", error);
          toast.error(`Ocorreu um erro no envio: ${error.message || "Tente novamente"}`);
        }
      }
    } catch (error: any) {
      console.error("Unexpected error in handleSubmit:", error);
      toast.error(`Ocorreu um erro inesperado: ${error.message || "Tente novamente"}`);
    }
  };

  return (
    <Card className="border-azul/20 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="bg-azul/5 pb-3">
        <CardTitle className="flex items-center text-xl font-semibold text-azul">
          <MessageSquare className="mr-2 h-5 w-5" />
          Novo Feedback
        </CardTitle>
        <CardDescription>
          Partilhe a sua experiência, sugestão ou reporte um problema
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Descreva aqui o seu feedback ou sugestão..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[120px] resize-y focus-visible:ring-azul"
            required
          />
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-600">
                Anexar Imagem (Opcional)
              </label>
              {previewUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeImage}
                  className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                  <span className="ml-1">Remover</span>
                </Button>
              )}
            </div>
            
            <AnimatePresence mode="wait">
              {previewUrl ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="relative rounded-lg overflow-hidden border border-slate-200 h-[180px]"
                >
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    style={{ objectFit: "cover" }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="w-full"
                >
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 transition-colors hover:border-azul/30 hover:bg-azul/5 cursor-pointer"
                  >
                    <div className="rounded-full bg-slate-100 p-2 group-hover:bg-azul/10">
                      <ImageIcon className="h-6 w-6 text-slate-400 group-hover:text-azul" />
                    </div>
                    <p className="text-sm font-medium text-slate-600 group-hover:text-azul">
                      Clique para adicionar uma imagem
                    </p>
                    <p className="text-xs text-slate-400">
                      PNG, JPG ou GIF (máx. 5MB)
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/gif"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <Button 
            type="submit"
            disabled={createFeedback.status === 'pending' || !description.trim()}
            className="w-full bg-azul hover:bg-azul/90"
          >
            {createFeedback.status === 'pending' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A enviar...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Feedback
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Componente para a lista de feedbacks
function FeedbackList({ feedbacks }: { feedbacks: Feedback[] }) {
  const [visibleImages, setVisibleImages] = useState<Record<string, boolean>>({});
  const toggleImageVisibility = (id: string) => {
    setVisibleImages(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const { isGestor } = usePermissions();
  const utils = api.useContext();

  // Mutation hook for marking as resolved
  const markAsResolvedMutation = api.feedback.markAsResolved.useMutation({
    onSuccess: (data) => {
      toast.success(`Feedback #${data.id.substring(0, 6)} marcado como resolvido.`);
      utils.feedback.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao marcar como resolvido: ${error.message}`);
    },
  });

  return (
    <div>
      {feedbacks.map((feedback, index) => (
        <motion.div
          key={feedback.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <div className="border-b border-slate-100 p-6 last:border-0">
            <div className="flex gap-4">
              <Avatar className="h-10 w-10 flex-shrink-0 rounded-full border border-slate-200">
                <AvatarImage src={feedback.user.foto || undefined} alt={feedback.user.name || "Utilizador"} />
                <AvatarFallback className="bg-azul/10 text-azul">
                  {feedback.user.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                {/* Header: User Name, Date, Status Badge */}
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-medium text-slate-900">
                      {feedback.user.name || "Utilizador"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(feedback.createdAt), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                      {" • "}
                      {format(new Date(feedback.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  
                  <Badge
                    variant={feedback.estado === "RESOLVIDO" ? "default" : "outline"}
                    className={cn(
                      "flex items-center gap-1 rounded-full",
                      feedback.estado === "RESOLVIDO" 
                        ? "bg-green-100/80 text-green-700 hover:bg-green-100"
                        : "bg-amber-100/80 text-amber-700 hover:bg-amber-100"
                    )}
                  >
                    {feedback.estado === "RESOLVIDO" ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Resolvido</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5" />
                        <span>Pendente</span>
                      </>
                    )}
                  </Badge>
                </div>
                
                {/* Image Toggle Button and Image - Moved here, below the header */}
                {feedback.imagemUrl && (
                  <div className="my-3 space-y-2"> {/* Adjusted margin and spacing */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2 text-slate-600 hover:bg-slate-50"
                      onClick={() => toggleImageVisibility(feedback.id)}
                    >
                      {visibleImages[feedback.id] ? (
                        <>
                          <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                          Ocultar Imagem
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Ver Imagem
                        </>
                      )}
                    </Button>

                    <AnimatePresence>
                      {visibleImages[feedback.id] && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }} // Changed animation
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }} // Changed animation
                          transition={{ duration: 0.2, ease: "easeOut" }} // Adjusted transition
                          className="overflow-hidden" // Added to help with layout during animation
                        >
                          <a
                            href={feedback.imagemUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block group"
                          >
                            <div className="relative overflow-hidden rounded-lg border border-slate-200 w-full max-h-[300px] aspect-video">
                              <Image
                                src={feedback.imagemUrl} 
                                alt="Anexo"
                                fill
                                style={{ objectFit: "cover" }}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                          </a>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Description and Response */}
                <div className="space-y-4">
                  <p className="text-slate-700 whitespace-pre-line">
                    {feedback.descricao}
                  </p>
                  
                  {feedback.resposta && (
                    <div className="mt-4 rounded-lg bg-azul/5 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <User className="h-4 w-4 text-azul" />
                        <span className="text-sm font-medium text-azul">Resposta da equipa</span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{feedback.resposta}</p> {/* Added whitespace-pre-line for response too */} 
                    </div>
                  )}

                  {isGestor && feedback.estado === 'PENDENTE' && (
                    <div className="mt-2 pt-4 border-t border-slate-100 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300"
                        onClick={() => markAsResolvedMutation.mutate({ feedbackId: feedback.id })}
                        disabled={markAsResolvedMutation.status === 'pending'}
                      >
                        {markAsResolvedMutation.status === 'pending' ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-1.5 h-4 w-4" />
                        )}
                        Marcar como Resolvido
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Componente para o estado vazio
function EmptyFeedbackState({ query, activeTab }: { query: string; activeTab: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 rounded-full bg-azul/10 p-4">
        <AlertCircle className="h-8 w-8 text-azul" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 mb-1">
        Nenhum feedback encontrado
      </h3>
      <p className="max-w-md text-sm text-slate-500">
        {query 
          ? "Tente ajustar a sua pesquisa ou filtros para encontrar o que procura." 
          : activeTab !== "todos"
            ? `Não existem feedbacks ${activeTab === "PENDENTE" ? "pendentes" : "resolvidos"} de momento.`
            : "Seja o primeiro a dar feedback sobre a sua experiência com a plataforma."
        }
      </p>
    </div>
  );
}

// Componente para os cards de estatísticas
function StatsCard({ 
  title,
  value,
  icon: Icon,
  description,
  color
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  description: string;
  color: "azul" | "amber" | "green" | "red" | "purple";
}) {
  const colorMap = {
    azul: {
      bg: "bg-azul/5",
      text: "text-azul",
      icon: "bg-azul/10 text-azul",
      border: "border-azul/20",
      hover: "hover:bg-azul/10 hover:border-azul/30"
    },
    amber: {
      bg: "bg-amber-50/50",
      text: "text-amber-600",
      icon: "bg-amber-100/60 text-amber-600",
      border: "border-amber-100",
      hover: "hover:bg-amber-50/80 hover:border-amber-200"
    },
    green: {
      bg: "bg-green-50/50",
      text: "text-green-600",
      icon: "bg-green-100/60 text-green-600",
      border: "border-green-100",
      hover: "hover:bg-green-50/80 hover:border-green-200"
    },
    red: {
      bg: "bg-red-50/50",
      text: "text-red-600",
      icon: "bg-red-100/60 text-red-600",
      border: "border-red-100",
      hover: "hover:bg-red-50/80 hover:border-red-200"
    },
    purple: {
      bg: "bg-purple-50/50",
      text: "text-purple-600",
      icon: "bg-purple-100/60 text-purple-600",
      border: "border-purple-100",
      hover: "hover:bg-purple-50/80 hover:border-purple-200"
    }
  };

  return (
    <Card className={cn(
      "border transition-colors", 
      colorMap[color].bg, 
      colorMap[color].border,
      colorMap[color].hover
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className={cn("text-3xl font-bold mt-1", colorMap[color].text)}>
              {value}
            </h3>
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </div>
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-full", colorMap[color].icon)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}