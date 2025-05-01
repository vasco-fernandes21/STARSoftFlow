"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { PageLayout } from "@/components/common/PageLayout";
import { PaginaHeader } from "@/components/common/PaginaHeader";
import { 
  MessageSquare, 
  Send,
  Loader2,
  Paperclip,
  Inbox,
  CheckCircle2,
  Clock,
  Search
} from "lucide-react";
import { api } from "@/trpc/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StatusFilter = "todos" | "PENDENTE" | "RESOLVIDO";

export default function FeedbackPage() {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [imagem, setImagem] = useState<File | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: allFeedbacks, refetch: refetchFeedbacks, isLoading: isLoadingFeedbacks } = api.feedback.list.useQuery();
  
  // Filtrar feedbacks baseado no status e termo de busca
  const feedbacks = allFeedbacks?.filter(feedback => {
    const matchesStatus = statusFilter === "todos" || feedback.estado === statusFilter;
    const matchesSearch = searchTerm === "" || 
      feedback.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const createFeedback = api.feedback.create.useMutation({
    onSuccess: () => {
      toast.success("Feedback enviado com sucesso!");
      setDescricao("");
      setImagem(null);
      const fileInput = document.getElementById('feedback-image-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      refetchFeedbacks();
    },
    onError: (error) => {
      toast.error("Erro ao enviar feedback: " + error.message);
    }
  });

  if (!session) {
    redirect("/login");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) {
      toast.error("Por favor, descreva seu feedback");
      return;
    }
    if (imagem && imagem.size > 5 * 1024 * 1024) {
      toast.error("A imagem não pode exceder 5MB.");
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = undefined;
      if (imagem) {
        const formData = new FormData();
        formData.append("file", imagem);
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (response.ok) {
          const data = await response.json();
          imageUrl = data.url;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha no upload da imagem');
        }
      }

      await createFeedback.mutateAsync({
        descricao,
        imagemUrl: imageUrl
      });
    } catch (error: any) {
      console.error("Erro ao enviar feedback:", error);
      toast.error(`Ocorreu um erro: ${error.message || 'Tente novamente.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <div className="container mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-6 lg:px-8">
        <PaginaHeader
          title="Feedback & Suporte"
          subtitle="Partilhe as suas ideias, sugestões ou reporte problemas que encontrar."
        />

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Seção de Novo Feedback */}
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="sticky top-24 space-y-6">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
                  <MessageSquare className="h-5 w-5 text-azul" />
                  Enviar Novo Feedback
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Textarea
                    placeholder="Descreva aqui..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="min-h-[140px] resize-y rounded-lg bg-white px-4 py-3 text-base text-gray-800 border border-border focus-visible:ring-2 focus-visible:ring-azul/10"
                    required
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Anexar Imagem (Opcional)
                    </label>
                    <Input
                      id="feedback-image-input"
                      type="file"
                      accept="image/png, image/jpeg, image/gif"
                      onChange={(e) => setImagem(e.target.files?.[0] || null)}
                      className="block w-full cursor-pointer rounded-lg bg-muted/60 text-sm text-gray-700 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-azul/10 file:px-4 file:py-2 file:text-azul hover:file:bg-azul/20"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Tipos suportados: PNG, JPG, GIF. Tamanho máximo: 5MB.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !descricao.trim()}
                    className="w-full rounded-lg bg-azul px-6 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-azul/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        A Enviar...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5" />
                        Enviar Feedback
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>

          {/* Lista de Feedbacks */}
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-4 sticky top-24 bg-background z-10 py-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Pesquisar feedbacks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="PENDENTE">Pendentes</SelectItem>
                  <SelectItem value="RESOLVIDO">Resolvidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoadingFeedbacks ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : !feedbacks?.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-full bg-azul/10 p-5">
                  <Inbox className="h-12 w-12 text-azul" />
                </div>
                <p className="text-lg font-semibold text-gray-800">Nenhum feedback encontrado</p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {searchTerm || statusFilter !== "todos" 
                    ? "Tente ajustar os filtros de pesquisa."
                    : "Quando houver feedbacks, eles aparecerão aqui."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {feedbacks.map((feedback) => (
                  <div key={feedback.id} className="py-6 first:pt-0">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10 flex-shrink-0 border border-gray-200">
                        <AvatarImage src={feedback.user.foto || undefined} alt={feedback.user.name || 'User'} />
                        <AvatarFallback className="bg-muted text-sm font-semibold text-gray-600">
                          {feedback.user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {feedback.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(feedback.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <Badge
                            variant={feedback.estado === "RESOLVIDO" ? "secondary" : "warning"}
                            className="flex items-center gap-1"
                          >
                            {feedback.estado === "RESOLVIDO" ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Resolvido
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3" />
                                Pendente
                              </>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">
                          {feedback.descricao}
                        </p>
                        {feedback.imagemUrl && (
                          <div className="mt-3">
                            <a
                              href={feedback.imagemUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-azul/10 px-3 py-1.5 text-xs font-medium text-azul hover:bg-azul/20"
                            >
                              <Paperclip className="h-4 w-4" />
                              Ver Anexo
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}