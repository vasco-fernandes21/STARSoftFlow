"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { 
  Users, ArrowUpRight, Briefcase, 
  Clock, DollarSign, FileText
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Definir o tipo para o período da dashboard
type DashboardPeriod = "month" | "quarter" | "year";

export default function AdminDashboard() {
  const router = useRouter();
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  
  // Fetch admin dashboard data
  const { data, isLoading } = api.dashboard.getAdminOverview.useQuery({ period });
  
  // Cores para os gráficos
  const CORES = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", 
    "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e"
  ];
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <ProtectedRoute blockPermission="COMUM">
      <div className="flex flex-col gap-6 pb-10">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard de Administração</h1>
            <p className="text-muted-foreground">Visão geral e estatísticas de todos os projetos e utilizadores.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPeriod("month")} className={period === "month" ? "bg-primary/10" : ""}>
              Mês
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPeriod("quarter")} className={period === "quarter" ? "bg-primary/10" : ""}>
              Trimestre
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPeriod("year")} className={period === "year" ? "bg-primary/10" : ""}>
              Ano
            </Button>
          </div>
        </header>
        
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="projects">Projetos</TabsTrigger>
            <TabsTrigger value="users">Utilizadores</TabsTrigger>
            <TabsTrigger value="financials">Financeiros</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Status Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.projetos.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {data?.projetos.ativos || 0} ativos, {data?.projetos.concluidos || 0} concluídos
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Utilizadores Ativos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.utilizadores.total || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {data?.utilizadores.integral || 0} tempo integral, {data?.utilizadores.parcial || 0} parcial
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Orçamento Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(data?.financeiro.orcamentoTotal || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(data?.financeiro.gastoTotal || 0)} já utilizado
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Entregáveis Pendentes</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.entregaveis.pendentes || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {data?.entregaveis.atrasados || 0} atrasados, {data?.entregaveis.proximos || 0} próximos
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Projetos e Ocupação */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Projetos por Estado */}
              <Card>
                <CardHeader>
                  <CardTitle>Projetos por Estado</CardTitle>
                  <CardDescription>Distribuição dos projetos por estado atual</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data?.projetosPorEstado || []}
                          dataKey="valor"
                          nameKey="nome"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          innerRadius={40}
                          paddingAngle={2}
                          labelLine={false}
                          label={({ name, percent }) => 
                            percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                        >
                          {(data?.projetosPorEstado || []).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [value, "Projetos"]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Ocupação Mensal */}
              <Card>
                <CardHeader>
                  <CardTitle>Ocupação de Recursos</CardTitle>
                  <CardDescription>Histórico de alocação de recursos nos últimos meses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={data?.ocupacaoMensal || []}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value}%`, "Ocupação"]} />
                        <Area 
                          type="monotone" 
                          dataKey="ocupacao" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.2} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Dados Financeiros */}
            <Card>
              <CardHeader>
                <CardTitle>Dados Financeiros</CardTitle>
                <CardDescription>Visão geral dos gastos por categoria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Distribuição por Tipo */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Recursos Humanos</span>
                      <span className="font-medium">
                        {formatCurrency(data?.financeiro.distribuicao?.rh || 0)} 
                        ({data?.financeiro.distribuicaoPct?.rh || 0}%)
                      </span>
                    </div>
                    <Progress value={data?.financeiro.distribuicaoPct?.rh || 0} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Materiais</span>
                      <span className="font-medium">
                        {formatCurrency(data?.financeiro.distribuicao?.materiais || 0)} 
                        ({data?.financeiro.distribuicaoPct?.materiais || 0}%)
                      </span>
                    </div>
                    <Progress value={data?.financeiro.distribuicaoPct?.materiais || 0} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Serviços</span>
                      <span className="font-medium">
                        {formatCurrency(data?.financeiro.distribuicao?.servicos || 0)} 
                        ({data?.financeiro.distribuicaoPct?.servicos || 0}%)
                      </span>
                    </div>
                    <Progress value={data?.financeiro.distribuicaoPct?.servicos || 0} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Outros</span>
                      <span className="font-medium">
                        {formatCurrency(data?.financeiro.distribuicao?.outros || 0)} 
                        ({data?.financeiro.distribuicaoPct?.outros || 0}%)
                      </span>
                    </div>
                    <Progress value={data?.financeiro.distribuicaoPct?.outros || 0} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Projetos que Precisam de Atenção */}
            <Card>
              <CardHeader>
                <CardTitle>Projetos que Precisam de Atenção</CardTitle>
                <CardDescription>Projetos com atrasos ou problemas orçamentais</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-4 text-muted-foreground">Carregando projetos...</p>
                ) : data?.projetosAtencao && data.projetosAtencao.length > 0 ? (
                  <div className="space-y-4">
                    {data.projetosAtencao.map((projeto) => (
                      <div key={projeto.id} className="flex items-start justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{projeto.nome}</span>
                            {projeto.atrasado && (
                              <Badge variant="destructive" className="text-xs">Atrasado</Badge>
                            )}
                            {projeto.orcamentoExcedido && (
                              <Badge variant="warning" className="text-xs">Orçamento Excedido</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Responsável: {projeto.responsavel}
                          </div>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <Clock className="mr-1 h-3 w-3" />
                              {projeto.percentualConcluido}% concluído
                            </span>
                            <span className="flex items-center">
                              <DollarSign className="mr-1 h-3 w-3" />
                              {projeto.percentualOrcamentoGasto}% do orçamento
                            </span>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => router.push(`/projetos/${projeto.id}`)}
                        >
                          <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                          Ver
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">Não há projetos com problemas no momento.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Conteúdo da tab Projetos (implementar conforme necessário) */}
          <TabsContent value="projects" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Projetos</CardTitle>
                <CardDescription>Implementar uma visão mais detalhada dos projetos</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-12">
                  Esta seção será implementada em uma próxima fase com uma análise detalhada dos projetos, incluindo
                  gráficos de progresso, métricas de desempenho e informações sobre entregáveis.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Conteúdo da tab Utilizadores (implementar conforme necessário) */}
          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Utilizadores</CardTitle>
                <CardDescription>Implementar uma visão detalhada dos utilizadores</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-12">
                  Esta seção será implementada em uma próxima fase com estatísticas detalhadas sobre utilizadores,
                  incluindo alocação, carga de trabalho e produtividade.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Conteúdo da tab Financeiros (implementar conforme necessário) */}
          <TabsContent value="financials" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Análise Financeira</CardTitle>
                <CardDescription>Implementar uma visão detalhada das finanças</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-12">
                  Esta seção será implementada em uma próxima fase com análise detalhada das finanças,
                  incluindo fluxo de caixa, projeções e relatórios de despesas.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}