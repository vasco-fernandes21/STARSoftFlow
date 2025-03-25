"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { CalendarClock, Users, LineChart, DollarSign, ArrowLeft, FileText, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjetoEstado } from "@prisma/client";
import { Cronograma } from "@/components/projetos/Cronograma";
import { ProjetoFinancas } from "@/components/projetos/tabs/ProjetoFinancas";
import { useQueryClient } from "@tanstack/react-query";

export default function DetalheProjeto() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [separadorAtivo, setSeparadorAtivo] = useState("cronograma");
  const queryClient = useQueryClient();

  // Query principal do projeto
  const { data: projeto, isLoading, error } = api.projeto.findById.useQuery(id, {
    enabled: !!id,
    staleTime: 30 * 1000, // 30 segundos
  });

  // Funções para atualizar dados após alterações
  const handleUpdateWorkPackage = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: ['projeto.findById', id]
    });
  }, [queryClient, id]);

  const handleUpdateTarefa = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: ['projeto.findById', id]
    });
  }, [queryClient, id]);

  // Loading e error states
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-azul/20 border-t-azul rounded-full animate-spin"></div>
        <span className="ml-3">A carregar...</span>
      </div>
    );
  }

  if (error || !projeto) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Erro ao carregar o projeto ou projeto não encontrado.
      </div>
    );
  }

  // Cálculos e mapeamentos
  const totalTarefas = projeto.workpackages.reduce((acc: number, wp) => acc + wp.tarefas.length, 0);
  const tarefasConcluidas = projeto.workpackages.reduce(
    (acc: number, wp) => acc + wp.tarefas.filter((tarefa) => tarefa.estado).length,
    0
  );
  const tarefasPendentes = totalTarefas - tarefasConcluidas;

  const dataInicio = projeto.inicio ? new Date(projeto.inicio) : null;
  const dataFim = projeto.fim ? new Date(projeto.fim) : null;
  const duracaoMeses = dataInicio && dataFim
    ? (dataFim.getFullYear() - dataInicio.getFullYear()) * 12 +
      (dataFim.getMonth() - dataInicio.getMonth())
    : 0;

  const estadoMap: Record<ProjetoEstado, string> = {
    RASCUNHO: "Rascunho",
    PENDENTE: "Pendente",
    APROVADO: "Aprovado",
    EM_DESENVOLVIMENTO: "Em Desenvolvimento",
    CONCLUIDO: "Concluído",
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100 custom-blue-blur">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-8xl mx-auto space-y-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/projetos')}
              className="h-9 flex items-center gap-2 text-gray-600 hover:text-customBlue transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Projetos</span>
            </Button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 font-medium truncate max-w-[300px]">{projeto.nome}</span>
          </nav>

          {/* Cabeçalho */}
          <div className="flex flex-col md:flex-row gap-6 justify-between">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-gray-900">{projeto.nome}</h1>
                    <Badge
                      variant="outline"
                      className={cn(
                        projeto.estado === "CONCLUIDO"
                          ? "bg-emerald-50/70 text-emerald-600 border-emerald-200"
                          : projeto.estado === "PENDENTE"
                          ? "bg-amber-50/70 text-amber-600 border-amber-200"
                          : "bg-blue-50/70 text-customBlue border-blue-200"
                      )}
                    >
                      {estadoMap[projeto.estado]}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 max-w-full">{projeto.descricao || "Sem descrição"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Estatísticas do Projeto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card border-white/20 shadow-xl rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-blue-50/70 flex items-center justify-center shadow-md">
                  <FileText className="h-5 w-5 text-customBlue" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Work Packages</p>
                  <p className="text-2xl font-semibold">{projeto.workpackages.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card border-white/20 shadow-xl rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-purple-50/70 flex items-center justify-center shadow-md">
                  <CalendarClock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tarefas</p>
                  <p className="text-2xl font-semibold">{totalTarefas}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1"></span>
                      {tarefasConcluidas} Concluídas
                    </span>
                    <span className="flex items-center">
                      <span className="h-2 w-2 rounded-full bg-amber-500 mr-1"></span>
                      {tarefasPendentes} Pendentes
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card border-white/20 shadow-xl rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-amber-50/70 flex items-center justify-center shadow-md">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Período</p>
                  <p className="text-base font-semibold">
                    {dataInicio?.toLocaleDateString("pt")} - {dataFim?.toLocaleDateString("pt")}
                  </p>
                  <p className="text-xs text-gray-500">{duracaoMeses} meses</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card border-white/20 shadow-xl rounded-2xl">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-50/70 flex items-center justify-center shadow-md">
                  <LineChart className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="w-full">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-gray-500">Progresso</p>
                    <p className="font-semibold">{Math.round(projeto.progresso * 100)}%</p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000 ease-in-out",
                        projeto.progresso === 1
                          ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                          : projeto.progresso >= 0.75
                          ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                          : projeto.progresso >= 0.5
                          ? "bg-gradient-to-r from-blue-400 to-blue-500"
                          : projeto.progresso >= 0.25
                          ? "bg-gradient-to-r from-amber-400 to-amber-500"
                          : "bg-gradient-to-r from-rose-400 to-rose-500"
                      )}
                      style={{ width: `${projeto.progresso * 100}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Separadores */}
          <Tabs value={separadorAtivo} onValueChange={setSeparadorAtivo} className="flex-1 flex flex-col">
            <div className="w-full">
              <TabsList className="glass-bg p-1 h-auto border border-white/30 rounded-xl shadow-md inline-flex">
                <TabsTrigger value="cronograma" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg", separadorAtivo === "cronograma" ? "text-customBlue" : "text-gray-600")}>
                  <CalendarClock className="h-4 w-4" />
                  <span>Cronograma</span>
                </TabsTrigger>
                <TabsTrigger value="overview" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg", separadorAtivo === "overview" ? "text-customBlue" : "text-gray-600")}>
                  <FileText className="h-4 w-4" />
                  <span>Visão Geral</span>
                </TabsTrigger>
                <TabsTrigger value="resources" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg", separadorAtivo === "resources" ? "text-customBlue" : "text-gray-600")}>
                  <Users className="h-4 w-4" />
                  <span>Recursos</span>
                </TabsTrigger>
                <TabsTrigger value="finances" className={cn("flex items-center gap-2 px-4 py-2 rounded-lg", separadorAtivo === "finances" ? "text-customBlue" : "text-gray-600")}>
                  <DollarSign className="h-4 w-4" />
                  <span>Finanças</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="cronograma" className="mt-6">
                <Card className="glass-card border-white/20 shadow-xl overflow-hidden rounded-2xl">
                  <div className="h-[calc(100vh-420px)]">
                    {dataInicio && dataFim && (
                      <Cronograma
                        projeto={projeto}
                        workpackages={projeto.workpackages}
                        startDate={dataInicio}
                        endDate={dataFim}
                        onUpdateWorkPackage={handleUpdateWorkPackage}
                        onUpdateTarefa={handleUpdateTarefa}
                        projetoId={id}
                        options={{
                          leftColumnWidth: 300,
                          disableInteractions: false,
                          compactMode: false,
                        }}
                      />
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="overview" className="mt-4">
                <Card className="glass-card border-white/20 shadow-xl rounded-2xl">
                  <CardHeader className="border-b border-white/10 px-6 py-4 bg-white/70 backdrop-blur-sm">
                    <CardTitle className="text-lg font-semibold text-gray-900">Detalhes do Projeto</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-medium text-gray-700">Informações Gerais</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Data de Início</p>
                            <p className="font-medium">{dataInicio?.toLocaleDateString("pt-BR") || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Data de Fim</p>
                            <p className="font-medium">{dataFim?.toLocaleDateString("pt-BR") || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Duração</p>
                            <p className="font-medium">{duracaoMeses} meses</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Financiamento</p>
                            <p className="font-medium">{projeto.financiamento?.nome || "Nenhum"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="resources" className="mt-4">
                <Card className="glass-card border-white/20 shadow-xl rounded-2xl">
                  <CardHeader className="border-b border-white/10 px-6 py-4 bg-white/70 backdrop-blur-sm">
                    <CardTitle className="text-lg font-semibold text-gray-900">Recursos</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600">Recursos ainda não implementados nesta vista.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="finances" className="mt-4">
                <Card className="glass-card border-white/20 shadow-xl rounded-2xl">
                  <CardHeader className="border-b border-white/10 px-6 py-4 bg-white/70 backdrop-blur-sm">
                    <CardTitle className="text-lg font-semibold text-gray-900">Finanças</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ProjetoFinancas
                      projetoId={projeto.id}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}