// app/projetos/[projetoId]/financas/page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Area, AreaChart
} from "recharts";
import { ChevronDown, ChevronRight, TrendingUp, Wallet, Users, Calendar, DollarSign, PieChart as PieChartIcon, ArrowUpDown } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VariantProps } from "class-variance-authority";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProjetoFinancasProps {
  projetoId: string;
}

interface Alocacao {
  alocacaoId?: string;
  workpackage?: { 
    id?: string; 
    nome?: string; 
  };
  data?: Date | string;
  mes?: number;
  ano?: number;
  etis?: number;
  custo?: number;
}

interface DetalheUser {
  user: { 
    id: string; 
    name: string; 
    salario: number | null;
  };
  totalAlocacao: number;
  custoTotal: number;
  alocacoes: Alocacao[];
}

interface AlocacaoPorWorkpackage {
  workpackage: {
    id: string;
    nome: string;
  };
  alocacoes: Alocacao[];
  totalHoras: number;
  totalCusto: number;
}

const CORES = ["#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#C9D1D5", "#E2E8F0"];
const GRADIENTES = [
  ["#3B82F6", "#60A5FA"], // Azul primário
  ["#60A5FA", "#93C5FD"], // Azul secundário
  ["#93C5FD", "#BFDBFE"], // Azul terciário
  ["#BFDBFE", "#DBEAFE"], // Azul claro
  ["#C9D1D5", "#E2E8F0"], // Cinza
  ["#E2E8F0", "#F1F5F9"]  // Cinza claro
] as const;

// Formatação para exibição com localização PT
const formatNumber = (value: number, fractionDigits = 2) => {
  // Garantir que value não é undefined ou null antes de formatar
  if (value === undefined || value === null) return "0";
  
  return value.toLocaleString("pt-PT", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
};

const formatCurrency = (value: number) => {
  // Garantir que value não é undefined ou null antes de formatar
  if (value === undefined || value === null) return "0,00 €";
  
  return value.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Função para obter o mês em português
const getMesNome = (mesNumero: number | undefined): string => {
  if (mesNumero === undefined) return "Desconhecido";
  
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  
  // Valida se o índice está no intervalo válido (1-12)
  if (mesNumero < 1 || mesNumero > 12) return "Desconhecido";
  
  // At this point TypeScript should know mesNumero is between 1-12
  const mesIndex = mesNumero - 1;
  return meses[mesIndex] as string;
};

// Componente para exibir um card de estatística com ícone modernizado
const StatCard = ({ title, value, icon, colorClass }: { title: string, value: React.ReactNode, icon: React.ReactNode, colorClass: string }) => (
  <div className={`animate-fade-in p-6 rounded-xl shadow-sm bg-white border border-gray-100 flex items-center hover:shadow-md transition-shadow duration-300`}>
    <div className={`rounded-full p-3 mr-4 ${colorClass}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {value}
    </div>
  </div>
);

// Tipo para a variante do Badge baseado no componente real
type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

// Tipo para o status do orçamento
interface OrcamentoStatus {
  label: string;
  variant: BadgeVariant;
}

export function ProjetoFinancas({ projetoId }: ProjetoFinancasProps) {
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("overview");
  const [workpackageSort, setWorkpackageSort] = useState<"valor" | "nome">("valor");
  const [monthRange, setMonthRange] = useState<"3" | "6" | "12">("6");
  
  const { data, isLoading, error } = api.projeto.getFinancas.useQuery({
    projetoId,
    ano: undefined,
    mes: undefined,
  });

  const handleToggleUser = (userId: string) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <Skeleton className="col-span-1 h-[400px] w-full rounded-xl lg:col-span-2" />
        <Skeleton className="col-span-1 h-[400px] w-full rounded-xl lg:col-span-2" />
        <Skeleton className="col-span-1 h-[300px] w-full rounded-xl lg:col-span-4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="rounded-lg bg-red-50 p-8 text-center shadow-sm">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-red-800">Erro ao carregar dados financeiros</h3>
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { resumo, detalhesPorUser } = data;
  
  // Usando dados de custosRealizados da API
  const custosRealizados = data.custosRealizados || {
    alocacoes: { custo: 0, etis: 0 },
    materiais: { custo: 0, quantidade: 0 },
    total: 0,
    percentagemReal: 0,
    percentagemEstimado: 0
  };
  
  // Status do orçamento
  const getOrcamentoStatus = (): OrcamentoStatus => {
    // Usar a maior percentagem entre real e estimado para determinar o status
    const percentagem = Math.max(
      custosRealizados.percentagemReal || 0,
      custosRealizados.percentagemEstimado || 0
    );

    if (percentagem < 70) return { label: "Dentro do orçamento", variant: "default" };
    if (percentagem < 90) return { label: "A aproximar-se do limite", variant: "warning" };
    if (percentagem < 100) return { label: "Próximo do limite", variant: "orange" };
    return { label: "Acima do orçamento", variant: "red" };
  };
  
  const statusOrcamento = getOrcamentoStatus();

  // Usar as novas percentagens diretamente do custosRealizados
  const percentagemFormatada = Math.min(custosRealizados.percentagemEstimado || 0, 100).toFixed(1);
  
  // Dados para o orçamento
  const dadosOrcamento = [
    { 
      name: "Recursos Humanos", 
      valor: resumo.orcamento.real.totalRecursos,
      estimado: resumo.orcamento.estimado * 0.7 // exemplo fictício
    },
    { 
      name: "Materiais", 
      valor: resumo.orcamento.real.totalMateriais,
      estimado: resumo.orcamento.estimado * 0.3 // exemplo fictício
    }
  ];
  
  // Preparar dados mensais (exemplo)
  const prepararDadosMensais = () => {
    const dataMap = new Map();
    
    if (detalhesPorUser && detalhesPorUser.length > 0) {
      detalhesPorUser.forEach(user => {
        user.alocacoes.forEach(alocacao => {
          const chave = `${alocacao.ano}-${alocacao.mes}`;
          if (!dataMap.has(chave)) {
            dataMap.set(chave, {
              mes: getMesNome(alocacao.mes),
              ano: alocacao.ano,
              custoTotal: 0,
              etisTotal: 0
            });
          }
          
          const entry = dataMap.get(chave);
          entry.custoTotal += alocacao.custo;
          entry.etisTotal += alocacao.etis;
        });
      });
    }
    
    return Array.from(dataMap.values())
      .sort((a, b) => (a.ano * 12 + a.mes) - (b.ano * 12 + b.mes))
      .slice(-Number(monthRange)); // usar o monthRange selecionado
  };
  
  const dadosMensais = prepararDadosMensais();
  
  // Organiza as alocações por workpackage para cada user
  const alocacoesPorWorkpackage = (alocacoes: Alocacao[]): AlocacaoPorWorkpackage[] => {
    const wpMap = new Map<string, AlocacaoPorWorkpackage>();
    
    alocacoes.forEach(alocacao => {
      // Ignorar alocações sem workpackage ou sem id
      if (!alocacao.workpackage?.id) return;
      
      const wpId = alocacao.workpackage.id;
      
      if (!wpMap.has(wpId)) {
        wpMap.set(wpId, {
          workpackage: {
            id: alocacao.workpackage.id,
            nome: alocacao.workpackage.nome || 'Sem nome'
          },
          alocacoes: [],
          totalHoras: 0,
          totalCusto: 0
        });
      }
      
      const wp = wpMap.get(wpId);
      if (wp) {
        wp.alocacoes.push(alocacao);
        wp.totalHoras += alocacao.etis || 0;
        wp.totalCusto += alocacao.custo || 0;
      }
    });
    
    return Array.from(wpMap.values()).sort((a, b) => {
      const nomeA = a.workpackage?.nome || '';
      const nomeB = b.workpackage?.nome || '';
      return nomeA.localeCompare(nomeB);
    });
  };

  // Preparar dados de WP para gráfico
  const dadosWorkpackages = detalhesPorUser.flatMap(user => 
    user.alocacoes
  ).reduce((acc, alocacao) => {
    // Ignorar alocações sem workpackage ou sem id
    if (!alocacao.workpackage?.id) return acc;
    
    const wpId = alocacao.workpackage.id;
    const existente = acc.find(item => item.id === wpId);
    
    if (existente) {
      existente.valor += alocacao.custo || 0;
      existente.etis += alocacao.etis || 0;
    } else {
      acc.push({
        id: wpId,
        nome: alocacao.workpackage.nome || 'Sem nome',
        valor: alocacao.custo || 0,
        etis: alocacao.etis || 0
      });
    }
    
    return acc;
  }, [] as Array<{id: string, nome: string, valor: number, etis: number}>)
  .sort((a, b) => workpackageSort === "valor" ? b.valor - a.valor : a.nome.localeCompare(b.nome));

  return (
    <div 
      className="space-y-6 animate-fade-in"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Finanças</h1>
        <Badge variant={statusOrcamento.variant} className="px-3 py-1.5 text-sm font-medium">
          {statusOrcamento.label}
        </Badge>
      </div>
      
      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-4 grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="detalhes">Detalhes por WP</TabsTrigger>
          <TabsTrigger value="utilizadores">Equipa</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {resumo.orcamento.estimado > 0 && (
              <StatCard 
                title="Orçamento Estimado" 
                value={formatCurrency(resumo.orcamento.estimado)} 
                icon={<Wallet className="h-6 w-6 text-blue-600" />}
                colorClass="bg-blue-50"
              />
            )}
            {resumo.orcamento.real.total > 0 && (
              <StatCard 
                title="Orçamento Real" 
                value={formatCurrency(resumo.orcamento.real.total)} 
                icon={<DollarSign className="h-6 w-6 text-blue-500" />}
                colorClass="bg-blue-50"
              />
            )}
            {(resumo.orcamento.estimado > 0 || resumo.orcamento.real.total > 0) && (
              <StatCard 
                title="Percentagem Gasta" 
                value={
                  <div className="w-full space-y-2">
                    {custosRealizados.percentagemReal > 0 && resumo.orcamento.real.total > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-500">Real</span>
                          <span className="text-xs font-medium text-blue-600">{custosRealizados.percentagemReal.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-blue-100">
                          <div 
                            className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                            style={{ width: `${Math.min(custosRealizados.percentagemReal, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {custosRealizados.percentagemEstimado > 0 && resumo.orcamento.estimado > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-500">Estimado</span>
                          <span className="text-xs font-medium text-indigo-600">{custosRealizados.percentagemEstimado.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-indigo-100">
                          <div 
                            className="h-2 rounded-full bg-indigo-600 transition-all duration-500"
                            style={{ width: `${Math.min(custosRealizados.percentagemEstimado, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                } 
                icon={<TrendingUp className="h-6 w-6 text-blue-700" />}
                colorClass="bg-blue-50"
              />
            )}
            <StatCard 
              title="Recursos Alocados" 
              value={`${detalhesPorUser.length}`} 
              icon={<Users className="h-6 w-6 text-gray-500" />}
              colorClass="bg-gray-100"
            />
          </div>
          
          {/* Progresso do Projeto */}
          <div 
            className="rounded-xl bg-white p-6 shadow-sm animate-slide-up"
            style={{animationDelay: "0.25s"}}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Progresso do Projeto</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {formatCurrency(custosRealizados.total)}
                  {resumo.orcamento.estimado > 0 && ` / ${formatCurrency(resumo.orcamento.estimado)}`}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              {(resumo.orcamento.estimado > 0 || resumo.orcamento.real.total > 0) && (
                <div className="space-y-1">
                  <Progress 
                    value={Math.max(custosRealizados.percentagemReal || 0, custosRealizados.percentagemEstimado || 0)} 
                    className="h-3 w-full bg-gray-100" 
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-xs font-medium text-blue-800">Alocações Passadas</p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-blue-900">{formatCurrency(custosRealizados.alocacoes.custo)}</p>
                    <p className="text-sm text-blue-700">{formatNumber(custosRealizados.alocacoes.etis)} ETIs</p>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-100 p-3">
                  <p className="text-xs font-medium text-gray-700">Materiais Adquiridos</p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(custosRealizados.materiais.custo)}</p>
                    <p className="text-sm text-gray-600">Quantidade: {custosRealizados.materiais.quantidade}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center rounded-lg border border-gray-100 p-4 mt-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Real vs. Estimado</p>
                  <p className="text-lg font-semibold">
                    {resumo.orcamento.real.total > 0 && formatCurrency(resumo.orcamento.real.total)}
                    {resumo.orcamento.real.total > 0 && resumo.orcamento.estimado > 0 && ' / '}
                    {resumo.orcamento.estimado > 0 && formatCurrency(resumo.orcamento.estimado)}
                    {resumo.orcamento.real.total === 0 && resumo.orcamento.estimado === 0 && 'Não definido'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-600">Custos Realizados</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(custosRealizados.total)}
                    {(custosRealizados.percentagemReal > 0 || custosRealizados.percentagemEstimado > 0) && (
                      <span className={`ml-2 text-sm ${
                        Math.max(custosRealizados.percentagemReal || 0, custosRealizados.percentagemEstimado || 0) > 90 ? 'text-red-500' : 
                        Math.max(custosRealizados.percentagemReal || 0, custosRealizados.percentagemEstimado || 0) > 70 ? 'text-amber-500' : 
                        'text-blue-500'
                      }`}>
                        {custosRealizados.percentagemReal > 0 && resumo.orcamento.real.total > 0 && `(${custosRealizados.percentagemReal.toFixed(1)}% real)`}
                        {custosRealizados.percentagemReal > 0 && custosRealizados.percentagemEstimado > 0 && resumo.orcamento.real.total > 0 && resumo.orcamento.estimado > 0 && ' / '}
                        {custosRealizados.percentagemEstimado > 0 && resumo.orcamento.estimado > 0 && `(${custosRealizados.percentagemEstimado.toFixed(1)}% est.)`}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Distribuição de Gastos e Tendência */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Gastos por Categoria */}
            {(resumo.orcamento.real.totalRecursos > 0 || resumo.orcamento.real.totalMateriais > 0) && (
              <div 
                className="rounded-xl bg-white p-6 shadow-sm animate-slide-up"
                style={{animationDelay: "0.3s"}}
              >
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Distribuição de Gastos</h3>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        Por categoria
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Distribuição dos custos realizados</div>
                </div>
                
                <div className="h-72 mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosOrcamento.filter(d => d.valor > 0)}
                        dataKey="valor"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={60}
                        paddingAngle={2}
                        strokeWidth={4}
                        stroke="#fff"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {dadosOrcamento.filter(d => d.valor > 0).map((_, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={['#3B82F6', '#60A5FA'][index % 2]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatCurrency(value as number)}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          borderRadius: '0.5rem',
                          border: '1px solid #E5E7EB',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        }}
                        itemStyle={{ padding: '0.25rem 0' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        align="center"
                        layout="horizontal"
                        iconType="circle"
                        iconSize={10}
                        wrapperStyle={{ paddingTop: '20px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* Tendência Mensal */}
            {dadosMensais.length > 0 && (
              <div 
                className="rounded-xl bg-white p-6 shadow-sm animate-slide-up"
                style={{animationDelay: "0.4s"}}
              >
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Tendência Mensal</h3>
                    <div className="flex items-center gap-2">
                      <Select
                        value={monthRange}
                        onValueChange={(value) => setMonthRange(value as "3" | "6" | "12")}
                      >
                        <SelectTrigger className="h-8 w-[180px] bg-blue-50/50 border-blue-100 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-blue-600" />
                            <span>Últimos {monthRange} meses</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                              Últimos 3 meses
                            </div>
                          </SelectItem>
                          <SelectItem value="6">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                              Últimos 6 meses
                            </div>
                          </SelectItem>
                          <SelectItem value="12">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                              Últimos 12 meses
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Custos realizados ao longo do tempo</div>
                </div>
                
                <div className="h-72 mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dadosMensais}>
                      <defs>
                        <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis 
                        dataKey="mes" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        tickFormatter={(value) => `${value / 1000}k €`}
                        dx={-10}
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value as number)}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          borderRadius: '0.5rem',
                          border: '1px solid #E5E7EB',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '0.5rem' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="custoTotal" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorCusto)" 
                        name="Custo"
                        activeDot={{ r: 6, fill: '#2563EB', stroke: 'white', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="detalhes" className="space-y-6">
          {/* Distribuição de Workpackages */}
          <div 
            className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fade-in"
          >
            {/* Gráfico de distribuição de WPs */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-medium text-gray-900">Distribuição por Workpackage</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosWorkpackages}
                      dataKey="valor"
                      nameKey="nome"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={40}
                      paddingAngle={2}
                      labelLine={false}
                      label={({ name, percent }) => 
                        percent > 0.05 ? `${name.substring(0, 10)}${name.length > 10 ? '...' : ''}: ${(percent * 100).toFixed(0)}%` : ''}
                    >
                      {dadosWorkpackages.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CORES[Math.abs(index) % CORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [formatCurrency(value as number), props.payload.nome]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Tabela top workpackages */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-medium text-gray-900">Top Workpackages</h3>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Workpackage
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        ETIs
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Custo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {dadosWorkpackages.slice(0, 5).map((wp, index) => (
                      <tr key={wp.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center">
                            <div className={`mr-2 h-3 w-3 rounded-full`} style={{backgroundColor: CORES[Math.abs(index) % CORES.length]}}></div>
                            <span className="font-medium text-gray-900">{wp.nome}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                          {formatNumber(wp.etis, 1)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(wp.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Lista detalhada de workpackages */}
          <div 
            className="rounded-xl bg-white p-6 shadow-sm animate-slide-up delay-200"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Detalhes dos Workpackages</h3>
              <Select
                value={workpackageSort}
                onValueChange={(value) => setWorkpackageSort(value as "valor" | "nome")}
              >
                <SelectTrigger className="h-8 w-[180px] bg-blue-50/50 border-blue-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    {workpackageSort === "valor" ? (
                      <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-blue-600" />
                    )}
                    <span>
                      {workpackageSort === "valor" ? "Ordenar por valor" : "Ordenar alfabeticamente"} 
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valor">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-blue-600" />
                      Ordenar por valor
                    </div>
                  </SelectItem>
                  <SelectItem value="nome">
                    <div className="flex items-center">
                      <ArrowUpDown className="h-4 w-4 mr-2 text-blue-600" />
                      Ordenar alfabeticamente
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-4">
              {dadosWorkpackages.map((wp, index) => {
                // Calcular percentagem usando valores não arredondados
                const percentagem = resumo.orcamento.real.total > 0 
                  ? (wp.valor / resumo.orcamento.real.total) * 100 
                  : 0;
                
                // Obter índice seguro para cores e gradientes
                const safeIndex = Math.abs(index) % CORES.length;
                // Garantir valores padrão se algo der errado
                const cor = CORES[safeIndex] || "#3B82F6";
                const gradienteInicio = GRADIENTES[safeIndex]?.[0] || "#3B82F6";
                const gradienteFim = GRADIENTES[safeIndex]?.[1] || "#60A5FA";
                
                return (
                  <div key={wp.id} className="rounded-lg border border-gray-100 p-4 transition-all hover:shadow-md">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center" 
                             style={{backgroundColor: `${cor}20`}}>
                          <PieChartIcon className="h-5 w-5" style={{color: cor}} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{wp.nome}</h4>
                          <p className="text-sm text-gray-500">{formatNumber(wp.etis, 1)} ETIs</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-medium text-gray-900">{formatCurrency(wp.valor)}</span>
                        <p className="text-sm text-gray-500">{percentagem.toFixed(1)}% do total</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div 
                          className="h-full rounded-full transition-all duration-1000" 
                          style={{
                            width: `${Math.min(percentagem, 100)}%`,
                            background: `linear-gradient(90deg, ${gradienteInicio}, ${gradienteFim})`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="utilizadores" className="space-y-6">
          {/* Cards de membros da equipa */}
          <div 
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in"
          >
            {detalhesPorUser.map((user, index) => {
              // Obter índice seguro para cores
              const safeIndex = Math.abs(index) % CORES.length;
              // Garantir valores padrão
              const corPrimaria = CORES[safeIndex] || "#3B82F6";
              const corSecundaria = CORES[(safeIndex + 1) % CORES.length] || "#60A5FA";
              
              return (
                <div 
                  key={user.user.id} 
                  className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sm transition-all hover:shadow-md cursor-pointer"
                  onClick={() => handleToggleUser(user.user.id)}
                >
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10" 
                    style={{background: `linear-gradient(135deg, ${corPrimaria}, ${corSecundaria})`}}>
                  </div>
                  <div className="relative">
                    <div className="mb-4 flex items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full" 
                        style={{background: `linear-gradient(135deg, ${corPrimaria}, ${corSecundaria})`}}>
                        <span className="text-sm font-bold uppercase text-white">
                          {user.user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </span>
                      </div>
                      <div className="ml-3">
                        <h4 className="font-medium text-gray-900">{user.user.name}</h4>
                        <p className="text-xs text-gray-500">{formatNumber(user.totalAlocacao)} ETIs</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Alocação</span>
                        <span className="font-medium">{formatNumber(user.totalAlocacao)} ETI</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Custo</span>
                        <span className="font-medium">{formatCurrency(user.custoTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">% do Total</span>
                        <span className="font-medium">
                          {resumo.orcamento.real.totalRecursos > 0 
                            ? ((user.custoTotal / resumo.orcamento.real.totalRecursos) * 100).toFixed(1)
                            : "0.0"}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-center">
                      <button 
                        className="inline-flex items-center text-xs font-medium text-purple-600 hover:text-purple-800"
                      >
                        {expandedUsers[user.user.id] ? (
                          <>
                            <ChevronDown className="mr-1 h-4 w-4" />
                            <span>Fechar detalhes</span>
                          </>
                        ) : (
                          <>
                            <ChevronRight className="mr-1 h-4 w-4" />
                            <span>Ver detalhes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Detalhes expandidos */}
          {detalhesPorUser.map((user) => (
            expandedUsers[user.user.id] && (
              <div 
                key={`details-${user.user.id}`}
                className="mt-4 rounded-xl bg-white p-6 shadow-sm animate-slide-down"
              >
                <h3 className="mb-4 text-lg font-medium text-gray-900">{user.user.name} - Detalhes</h3>
                
                <div className="space-y-6">
                  {user.alocacoes && user.alocacoes.length > 0 ? (
                    <>
                      {alocacoesPorWorkpackage(user.alocacoes).map((wp) => (
                        <div key={wp.workpackage.id} className="overflow-hidden rounded-lg border border-gray-200">
                          <div className="bg-gray-50 p-4">
                            <div className="flex flex-col justify-between space-y-2 md:flex-row md:items-center md:space-y-0">
                              <h4 className="flex items-center font-medium text-gray-800">
                                <div 
                                  className="mr-2 h-3 w-3 rounded-full" 
                                  style={{ backgroundColor: CORES[Math.abs(wp.workpackage.id.charCodeAt(0) % CORES.length)] }}>
                                </div>
                                {wp.workpackage.nome}
                              </h4>
                              <div className="flex items-center gap-6">
                                <div className="text-center">
                                  <p className="text-xs font-medium uppercase text-gray-500">Total ETIs</p>
                                  <p className="text-lg font-medium text-gray-900">{formatNumber(wp.totalHoras)}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs font-medium uppercase text-gray-500">Total Custo</p>
                                  <p className="text-lg font-medium text-gray-900">{formatCurrency(wp.totalCusto)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Período
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    ETIs
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Custo
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 bg-white">
                                {wp.alocacoes.sort((a, b) => {
                                  // Add null checks and fallbacks for the ano and mes properties
                                  const anoA = a.ano ?? 0;
                                  const anoB = b.ano ?? 0;
                                  const mesA = a.mes ?? 0;
                                  const mesB = b.mes ?? 0;
                                  
                                  if (anoA !== anoB) return anoA - anoB;
                                  return mesA - mesB;
                                }).map((alocacao) => (
                                  <tr key={alocacao.alocacaoId} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-900">
                                      {getMesNome(alocacao.mes ?? 0)} {alocacao.ano ?? ''}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3 text-right text-sm text-gray-500">
                                      {formatNumber(alocacao.etis ?? 0)}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3 text-right text-sm font-medium text-gray-900">
                                      {formatCurrency(alocacao.custo ?? 0)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="rounded-lg bg-gray-50 p-8 text-center">
                      <p className="text-sm text-gray-500">Sem alocações detalhadas para este utilizador</p>
                    </div>
                  )}
                </div>
              </div>
            )
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Add default export to support lazy loading
export default ProjetoFinancas;