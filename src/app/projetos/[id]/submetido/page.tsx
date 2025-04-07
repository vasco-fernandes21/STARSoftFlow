"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  CalendarClock,
  FileText,
  Package,
  Users,
  CheckCircle2,
  Clock,
  ListTodo,
  Coins,
  ChevronUp,
  ChevronDown,
  Code,
  Copy,
  Check,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

// Componente para o cabeçalho do projeto aprovado
const ApprovedProjectHeader = ({
  nome,
  descricao,
  dataAprovacao,
}: {
  nome: string;
  descricao?: string | null;
  dataAprovacao?: Date | null;
}) => (
  <div className="flex flex-col gap-2 rounded-lg border bg-white p-6 shadow-sm">
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">{nome}</h1>
        {descricao && <p className="text-sm text-gray-600">{descricao}</p>}
      </div>
      <Badge variant="outline" className="flex items-center gap-1 border-green-500 text-green-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Versão Aprovada
      </Badge>
    </div>
    {dataAprovacao && (
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Clock className="h-3.5 w-3.5" />
        <span>
          Aprovado em {format(new Date(dataAprovacao), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
        </span>
      </div>
    )}
  </div>
);

// Componente para mostar as estatísticas do projeto
const ProjectStats = ({
  workpackagesCount,
  tarefasCount,
  entregaveisCount,
  dataInicio,
  dataFim,
  valorTotal,
}: {
  workpackagesCount: number;
  tarefasCount: number;
  entregaveisCount: number;
  dataInicio?: Date | null;
  dataFim?: Date | null;
  valorTotal?: number;
}) => {
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Não definida";
    return format(new Date(date), "dd/MM/yyyy");
  };

  const items = [
    {
      title: "Workpackages",
      value: workpackagesCount,
      icon: Package,
      iconColor: "text-indigo-500",
    },
    {
      title: "Tarefas",
      value: tarefasCount,
      icon: FileText,
      iconColor: "text-blue-500",
    },
    {
      title: "Entregáveis",
      value: entregaveisCount,
      icon: CheckCircle2,
      iconColor: "text-green-500",
    },
    {
      title: "Data Início",
      value: formatDate(dataInicio),
      icon: Calendar,
      iconColor: "text-amber-500",
    },
    {
      title: "Data Fim",
      value: formatDate(dataFim),
      icon: CalendarClock,
      iconColor: "text-red-500",
    },
  ];

  // Adicionar valor total se existir
  if (valorTotal) {
    items.push({
      title: "Valor Total",
      value: formatCurrency(valorTotal),
      icon: Coins,
      iconColor: "text-emerald-500",
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item, index) => (
        <Card key={index} className="shadow-sm">
          <CardContent className="flex flex-row items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-gray-500">{item.title}</p>
              <p className="text-xl font-bold">{item.value}</p>
            </div>
            <div className={cn("rounded-full bg-gray-100 p-2", item.iconColor)}>
              <item.icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Componente para mostrar os workpackages
const WorkpackagesSection = ({ workpackages, _inicio, _fim }: { workpackages: any[], _inicio: Date, _fim: Date }) => {
  // Para apresentação simplificada
  const [expandedWP, setExpandedWP] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    if (expandedWP === id) {
      setExpandedWP(null);
    } else {
      setExpandedWP(id);
    }
  };
  
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Workpackages ({workpackages.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {workpackages.map((wp) => (
            <Card 
              key={wp.id} 
              className={cn(
                "border-azul/10 transition-all", 
                expandedWP === wp.id ? "ring-1 ring-azul/20" : ""
              )}
            >
              <div 
                className="flex cursor-pointer items-center justify-between p-4"
                onClick={() => toggleExpand(wp.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                    <Package className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-md font-medium text-gray-900">{wp.nome}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={wp.estado ? "default" : "outline"} className="px-1.5 py-0.5 text-xs">
                        {wp.estado ? "Concluído" : "Em Progresso"}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {wp.inicio ? format(new Date(wp.inicio), "dd/MM/yyyy") : "-"} -{" "}
                        {wp.fim ? format(new Date(wp.fim), "dd/MM/yyyy") : "-"}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(wp.id);
                    }}
                    className="h-8 w-8 rounded-lg p-0"
                  >
                    {expandedWP === wp.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>
              
              {expandedWP === wp.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  {wp.descricao && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">{wp.descricao}</p>
                    </div>
                  )}
                  
                  {/* Tarefas */}
                  {wp.tarefas && wp.tarefas.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <ListTodo className="h-4 w-4 text-azul" />
                        <h4 className="text-sm font-medium text-azul">Tarefas ({wp.tarefas.length})</h4>
                      </div>
                      <ScrollArea className="max-h-[400px] pr-4">
                        <div className="space-y-3">
                          {wp.tarefas.map((tarefa: any) => (
                            <div key={tarefa.id}>
                              <div className="rounded-md border border-azul/10 p-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h5 className="text-sm font-medium text-azul">{tarefa.nome}</h5>
                                    <div className="flex items-center gap-1 mt-1">
                                      <Badge variant={tarefa.estado ? "default" : "outline"} className="px-1.5 py-0.5 text-xs">
                                        {tarefa.estado ? "Concluída" : "Pendente"}
                                      </Badge>
                                      <span className="text-xs text-gray-500">
                                        {tarefa.inicio ? format(new Date(tarefa.inicio), "dd/MM/yyyy") : "-"} -{" "}
                                        {tarefa.fim ? format(new Date(tarefa.fim), "dd/MM/yyyy") : "-"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {tarefa.descricao && (
                                  <div className="mt-2">
                                    <p className="text-xs text-gray-600">{tarefa.descricao}</p>
                                  </div>
                                )}
                                
                                {/* Entregáveis */}
                                {tarefa.entregaveis && tarefa.entregaveis.length > 0 && (
                                  <div className="mt-3">
                                    <h6 className="text-xs font-medium text-gray-700 mb-2">Entregáveis ({tarefa.entregaveis.length})</h6>
                                    <div className="space-y-2">
                                      {tarefa.entregaveis.map((entregavel: any) => (
                                        <div 
                                          key={entregavel.id} 
                                          className="rounded-md border border-gray-100 bg-white p-2"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-azul/10">
                                                <FileText className="h-3 w-3 text-azul" />
                                              </div>
                                              <span className="text-xs font-medium text-gray-700">{entregavel.nome}</span>
                                            </div>
                                            <Badge 
                                              variant={entregavel.estado ? "default" : "outline"} 
                                              className={cn(
                                                "text-xs",
                                                entregavel.estado ? "bg-green-100 text-green-800 border-green-200" : ""
                                              )}
                                            >
                                              {entregavel.estado ? "Concluído" : "Pendente"}
                                            </Badge>
                                          </div>
                                          {entregavel.data && (
                                            <div className="mt-1 pl-8">
                                              <span className="text-xs text-gray-500">
                                                {format(new Date(entregavel.data), "dd/MM/yyyy")}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                  
                  {/* Materiais */}
                  {wp.materiais && wp.materiais.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="h-4 w-4 text-azul" />
                        <h4 className="text-sm font-medium text-azul">Materiais ({wp.materiais.length})</h4>
                      </div>
                      <ScrollArea className="max-h-[400px] pr-4">
                        <div className="space-y-3">
                          {wp.materiais.map((material: any) => (
                            <div key={material.id} className="rounded-md border border-azul/10 p-3">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-azul/10">
                                  <Package className="h-3.5 w-3.5 text-azul" />
                                </div>
                                <div>
                                  <h5 className="text-sm font-medium text-azul">{material.nome}</h5>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-600 px-1.5 py-0.5 text-[10px]">
                                      {material.rubrica}
                                    </Badge>
                                    
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <Calendar className="h-3 w-3" />
                                      <span>{material.ano_utilizacao}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                                      <Coins className="h-3 w-3" />
                                      <span>{formatCurrency(Number(material.preco) * material.quantidade)}</span>
                                    </div>
                                  </div>
                                  
                                  {material.descricao && (
                                    <p className="mt-2 text-xs text-gray-600">{material.descricao}</p>
                                  )}
                                  
                                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                    <div className="rounded-md border border-gray-200 bg-white p-2">
                                      <div className="text-xs text-gray-500">Quantidade</div>
                                      <div className="font-medium">{material.quantidade}</div>
                                    </div>
                                    <div className="rounded-md border border-gray-200 bg-white p-2">
                                      <div className="text-xs text-gray-500">Preço unitário</div>
                                      <div className="font-medium">{formatCurrency(Number(material.preco))}</div>
                                    </div>
                                    <div className="rounded-md border border-gray-200 bg-white p-2">
                                      <div className="text-xs text-gray-500">Total</div>
                                      <div className="font-medium text-green-600">
                                        {formatCurrency(Number(material.preco) * material.quantidade)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                  
                  {/* Recursos */}
                  {wp.recursos && wp.recursos.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-azul" />
                        <h4 className="text-sm font-medium text-azul">Recursos Alocados</h4>
                      </div>
                      <ScrollArea className="max-h-[400px] pr-4">
                        <div className="space-y-3">
                          {Array.from(new Set(wp.recursos.map((r: any) => r.user?.id))).map((userId: unknown) => {
                            if (!userId || typeof userId !== 'string') return null;
                            
                            const userRecursos = wp.recursos.filter((r: any) => r.user?.id === userId);
                            const user = userRecursos[0]?.user;
                            
                            if (!user) return null;
                            
                            return (
                              <div key={userId} className="rounded-md border border-azul/10 p-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-azul/10">
                                    <Users className="h-3.5 w-3.5 text-azul" />
                                  </div>
                                  <div>
                                    <h5 className="text-sm font-medium text-azul">{user.name}</h5>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                  </div>
                                </div>
                                
                                <div className="mt-3">
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                    {userRecursos.map((recurso: any, idx: number) => (
                                      <div 
                                        key={idx} 
                                        className="rounded-md border border-gray-200 bg-white p-2"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="text-xs font-medium">
                                            {recurso.mes}/{recurso.ano}
                                          </div>
                                          <div className="text-xs font-medium text-blue-600">
                                            {Number(recurso.ocupacao) * 100}%
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Componente para mostrar o financiamento
const FinanciamentoSection = ({ financiamento, projeto }: { financiamento?: any; projeto: any }) => {
  if (!financiamento) {
    return null;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Dados de Financiamento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Financiamento</p>
            <p className="text-base font-semibold">{financiamento.nome}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Overhead</p>
            <p className="text-base font-semibold">{Number(projeto.overhead || financiamento.overhead).toFixed(2)}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Taxa de Financiamento</p>
            <p className="text-base font-semibold">{Number(projeto.taxa_financiamento || financiamento.taxa_financiamento).toFixed(2)}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Valor ETI</p>
            <p className="text-base font-semibold">{Number(projeto.valor_eti || financiamento.valor_eti).toFixed(2)}€</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente para mostrar o responsável
const ResponsavelSection = ({ responsavel }: { responsavel?: any }) => {
  if (!responsavel) {
    return null;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Responsável</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{responsavel.name}</p>
            <p className="text-sm text-gray-600">{responsavel.email}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente para visualizar JSON
const JSONViewSection = ({ data }: { data: any }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Dados Estruturados</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="gap-1.5 rounded-lg border-blue-200 text-xs hover:bg-blue-100"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copiado
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copiar JSON
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] rounded-md border">
          <pre className="p-4 font-mono text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default function ProjetoSubmetido() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id || "";
  const [activeTab, setActiveTab] = useState("overview");

  // Buscar o projeto
  const { data: projeto, isLoading, error } = api.projeto.findById.useQuery(id, {
    enabled: !!id,
  });

  // Callback para voltar
  const handleBack = useCallback(() => router.push(`/projetos/${id}`), [router, id]);

  // Valores calculados
  const calculatedValues = useMemo(() => {
    if (!projeto?.aprovado) return null;

    const aprovado = projeto.aprovado as any;
    
    let totalTarefas = 0;
    let totalEntregaveis = 0;
    let valorTotal = 0;
    
    // Calcular totais
    aprovado.workpackages?.forEach((wp: any) => {
      totalTarefas += wp.tarefas?.length || 0;
      
      wp.tarefas?.forEach((tarefa: any) => {
        totalEntregaveis += tarefa.entregaveis?.length || 0;
      });
      
      wp.materiais?.forEach((material: any) => {
        valorTotal += Number(material.preco) * material.quantidade;
      });
    });

    return {
      totalTarefas,
      totalEntregaveis,
      workpackagesCount: aprovado.workpackages?.length || 0,
      valorTotal,
    };
  }, [projeto]);

  // Loading e error states
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500"></div>
        <span className="ml-3">A carregar...</span>
      </div>
    );
  }

  if (error || !projeto) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-500">
        Erro ao carregar o projeto ou projeto não encontrado.
      </div>
    );
  }

  // Verificar se o projeto tem um snapshot aprovado
  if (!projeto.aprovado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-gray-600">
        <p>Este projeto não possui uma versão aprovada para visualização.</p>
        <Button onClick={handleBack} variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para o projeto
        </Button>
      </div>
    );
  }

  // Extrair dados do snapshot aprovado
  const aprovado = projeto.aprovado as any;
  
  return (
    <div className="h-full bg-[#F7F9FC] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="-ml-2 flex items-center text-sm font-medium">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex h-7 items-center gap-1 px-2 py-0 text-gray-500 hover:text-blue-500"
            aria-label="Voltar para detalhes do projeto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao Projeto</span>
          </Button>
        </div>

        {/* Cabeçalho */}
        <ApprovedProjectHeader 
          nome={aprovado.nome} 
          descricao={aprovado.descricao} 
          dataAprovacao={aprovado.data_aprovacao}
        />

        {/* Stats */}
        {calculatedValues && (
          <ProjectStats
            workpackagesCount={calculatedValues.workpackagesCount}
            tarefasCount={calculatedValues.totalTarefas}
            entregaveisCount={calculatedValues.totalEntregaveis}
            dataInicio={aprovado.inicio}
            dataFim={aprovado.fim}
            valorTotal={calculatedValues.valorTotal}
          />
        )}

        {/* Abas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-1 md:grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="workpackages">Workpackages</TabsTrigger>
            <TabsTrigger value="financiamento">Financiamento</TabsTrigger>
            <TabsTrigger value="json">
              <div className="flex items-center gap-1.5">
                <Code className="h-4 w-4" />
                <span>Dados JSON</span>
              </div>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <ResponsavelSection responsavel={aprovado.responsavel} />
            <FinanciamentoSection financiamento={aprovado.financiamento} projeto={aprovado} />
          </TabsContent>
          
          <TabsContent value="workpackages">
            {aprovado.workpackages && aprovado.workpackages.length > 0 ? (
              <WorkpackagesSection 
                workpackages={aprovado.workpackages}
                _inicio={aprovado.inicio ? new Date(aprovado.inicio) : new Date()}
                _fim={aprovado.fim ? new Date(aprovado.fim) : new Date()}
              />
            ) : (
              <Card className="p-6 text-center text-gray-500">
                Este projeto não possui workpackages na sua versão aprovada.
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="financiamento">
            <FinanciamentoSection financiamento={aprovado.financiamento} projeto={aprovado} />
          </TabsContent>
          
          <TabsContent value="json">
            <JSONViewSection data={aprovado} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 