// app/projetos/[projetoId]/financas/page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Area, AreaChart
} from "recharts";
import { ChevronDown, ChevronRight, TrendingUp, Wallet, Users, Calendar, DollarSign, PieChart as PieChartIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProjetoFinancasProps {
  projetoId: string;
}

interface Alocacao {
  alocacaoId: string;
  workpackage: { id: string; nome: string };
  data: Date | string;
  mes: number;
  ano: number;
  horas: number;
  custo: number;
}

interface DetalheUser {
  user: { 
    id: string; 
    name: string; 
    salario: number | null | any;
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

const CORES = ["#7C3AED", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];
const GRADIENTES: [string, string][] = [
  ["#7C3AED", "#8B5CF6"], // Roxo
  ["#3B82F6", "#60A5FA"], // Azul
  ["#10B981", "#34D399"], // Verde
  ["#F59E0B", "#FBBF24"], // Âmbar
  ["#EF4444", "#F87171"], // Vermelho
  ["#EC4899", "#F472B6"]  // Rosa
];

// Formatação para exibição com localização PT
const formatNumber = (value: number, fractionDigits = 2) => {
  return value.toLocaleString("pt-PT", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
};

const formatCurrency = (value: number) => {
  return value.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR"
  });
};

// Função para obter o mês em português
const getMesNome = (mesNumero: number) => {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return meses[mesNumero - 1];
};

// Componente para exibir um card de estatística com ícone
const StatCard = ({ title, value, icon, colorClass }: { title: string, value: string, icon: React.ReactNode, colorClass: string }) => (
  <div className={`animate-fade-in p-6 rounded-xl shadow-md bg-white border border-gray-100 flex items-center hover:shadow-lg transition-shadow duration-300`}>
    <div className={`rounded-full p-3 mr-4 ${colorClass}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

// Obtém um gradiente seguro com fallback
const getGradiente = (index: number): [string, string] => {
  const i = Math.abs(index) % GRADIENTES.length;
  return GRADIENTES[i];
};

// Obtém uma cor segura com fallback
const getCor = (index: number): string => {
  const i = Math.abs(index) % CORES.length;
  return CORES[i];
};

// Calcula o progresso do projeto com base no tempo decorrido
const calcularProgressoTemporal = (resumo: any, detalhesPorUser: DetalheUser[]) => {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  // Conta alocações que já passaram (meses anteriores ao atual)
  let custosAlocacoesPassadas = 0;
  let materiaisComprados = 0;

  // Soma custos de alocações em meses passados
  detalhesPorUser.forEach(user => {
    user.alocacoes.forEach(alocacao => {
      if (alocacao.ano < anoAtual || (alocacao.ano === anoAtual && alocacao.mes < mesAtual)) {
        custosAlocacoesPassadas += alocacao.custo;
      }
    });
  });

  // Aqui assumimos que os materiais comprados estão no resumo
  // Em um cenário real, você teria que buscar os materiais com estado true
  materiaisComprados = resumo.orcamento.real.totalMateriais;

  const totalGastoAteMomento = custosAlocacoesPassadas + materiaisComprados;
  
  // Calcula a percentagem do orçamento já gasto em relação ao estimado
  const percentagemGasto = (totalGastoAteMomento / resumo.orcamento.estimado) * 100;
  
  return {
    gastoReal: totalGastoAteMomento,
    percentagem: Math.min(percentagemGasto, 100),
    custosAlocacoesPassadas,
    materiaisComprados
  };
};

export function ProjetoFinancas({ projetoId }: ProjetoFinancasProps) {
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("overview");
  
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
  
  // Calcular a percentagem do orçamento gasto
  const percentagemGasto = (resumo.orcamento.real.total / resumo.orcamento.estimado) * 100;
  const percentagemFormatada = Math.min(percentagemGasto, 100).toFixed(1);
  
  // Status do orçamento
  const getOrcamentoStatus = () => {
    if (percentagemGasto < 70) return { label: "Dentro do orçamento", color: "bg-green-100 text-green-800" };
    if (percentagemGasto < 90) return { label: "Aproximando-se do limite", color: "bg-amber-100 text-amber-800" };
    if (percentagemGasto < 100) return { label: "Próximo do limite", color: "bg-orange-100 text-orange-800" };
    return { label: "Acima do orçamento", color: "bg-red-100 text-red-800" };
  };
  
  const statusOrcamento = getOrcamentoStatus();

  // Cálculo do progresso baseado no tempo
  const progressoTemporal = calcularProgressoTemporal(resumo, detalhesPorUser);

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
  
  // Preparar dados para gráficos mensais (exemplo)
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
              horasTotal: 0
            });
          }
          
          const entry = dataMap.get(chave);
          entry.custoTotal += alocacao.custo;
          entry.horasTotal += alocacao.horas;
        });
      });
    }
    
    return Array.from(dataMap.values())
      .sort((a, b) => (a.ano * 12 + a.mes) - (b.ano * 12 + b.mes))
      .slice(-6); // últimos 6 meses
  };
  
  const dadosMensais = prepararDadosMensais();
  
  // Organiza as alocações por workpackage para cada user
  const alocacoesPorWorkpackage = (alocacoes: Alocacao[]): AlocacaoPorWorkpackage[] => {
    const wpMap = new Map<string, AlocacaoPorWorkpackage>();
    
    alocacoes.forEach(alocacao => {
      const wpId = alocacao.workpackage.id;
      
      if (!wpMap.has(wpId)) {
        wpMap.set(wpId, {
          workpackage: alocacao.workpackage,
          alocacoes: [],
          totalHoras: 0,
          totalCusto: 0
        });
      }
      
      const wp = wpMap.get(wpId);
      if (wp) {
        wp.alocacoes.push(alocacao);
        wp.totalHoras += alocacao.horas;
        wp.totalCusto += alocacao.custo;
      }
    });
    
    return Array.from(wpMap.values()).sort((a, b) => 
      a.workpackage.nome.localeCompare(b.workpackage.nome)
    );
  };

  // Preparar dados de WP para gráfico
  const dadosWorkpackages = detalhesPorUser.flatMap(user => 
    user.alocacoes
  ).reduce((acc, alocacao) => {
    const wpId = alocacao.workpackage.id;
    const existente = acc.find(item => item.id === wpId);
    
    if (existente) {
      existente.valor += alocacao.custo;
      existente.horas += alocacao.horas;
    } else {
      acc.push({
        id: wpId,
        nome: alocacao.workpackage.nome,
        valor: alocacao.custo,
        horas: alocacao.horas
      });
    }
    
    return acc;
  }, [] as Array<{id: string, nome: string, valor: number, horas: number}>)
  .sort((a, b) => b.valor - a.valor);

  return (
    <div 
      className="space-y-6 animate-fade-in"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard Financeiro</h1>
        <Badge className={`${statusOrcamento.color} px-3 py-1.5 text-sm font-medium`}>
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
            <StatCard 
              title="Orçamento Estimado" 
              value={formatCurrency(resumo.orcamento.estimado)} 
              icon={<Wallet className="h-6 w-6 text-blue-600" />}
              colorClass="bg-blue-50"
            />
            <StatCard 
              title="Orçamento Utilizado" 
              value={formatCurrency(resumo.orcamento.real.total)} 
              icon={<DollarSign className="h-6 w-6 text-purple-600" />}
              colorClass="bg-purple-50"
            />
            <StatCard 
              title="Percentagem Gasta" 
              value={`${percentagemFormatada}%`} 
              icon={<TrendingUp className="h-6 w-6 text-green-600" />}
              colorClass="bg-green-50"
            />
            <StatCard 
              title="Recursos Alocados" 
              value={`${detalhesPorUser.length}`} 
              icon={<Users className="h-6 w-6 text-amber-600" />}
              colorClass="bg-amber-50"
            />
          </div>
          
          {/* Barra de Progresso do Orçamento */}
          <div 
            className="rounded-xl bg-white p-6 shadow-sm animate-slide-up"
            style={{animationDelay: "0.2s"}}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Progresso do Orçamento</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {formatCurrency(resumo.orcamento.real.total)} / {formatCurrency(resumo.orcamento.estimado)}
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <Progress 
                value={Math.min(percentagemGasto, 100)} 
                className="h-2.5 w-full" 
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Progresso Temporal do Projeto */}
          <div 
            className="rounded-xl bg-white p-6 shadow-sm animate-slide-up"
            style={{animationDelay: "0.25s"}}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Progresso Temporal do Projeto</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {formatCurrency(progressoTemporal.gastoReal)} / {formatCurrency(resumo.orcamento.estimado)}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <Progress 
                  value={progressoTemporal.percentagem} 
                  className="h-2.5 w-full" 
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-purple-50 p-3">
                  <p className="text-xs font-medium text-purple-800">Alocações em Meses Passados</p>
                  <p className="text-lg font-semibold text-purple-900">{formatCurrency(progressoTemporal.custosAlocacoesPassadas)}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-xs font-medium text-blue-800">Materiais Adquiridos</p>
                  <p className="text-lg font-semibold text-blue-900">{formatCurrency(progressoTemporal.materiaisComprados)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Distribuição de Gastos e Tendência */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Gastos por Categoria */}
            <div 
              className="rounded-xl bg-white p-6 shadow-sm animate-slide-up"
              style={{animationDelay: "0.3s"}}
            >
              <h3 className="mb-6 text-lg font-medium text-gray-900">Distribuição de Gastos</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosOrcamento}
                      dataKey="valor"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {dadosOrcamento.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={getCor(index)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Tendência Mensal */}
            <div 
              className="rounded-xl bg-white p-6 shadow-sm animate-slide-up"
              style={{animationDelay: "0.4s"}}
            >
              <h3 className="mb-6 text-lg font-medium text-gray-900">Tendência Mensal</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dadosMensais}>
                    <defs>
                      <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Area 
                      type="monotone" 
                      dataKey="custoTotal" 
                      stroke="#7C3AED" 
                      fillOpacity={1} 
                      fill="url(#colorCusto)" 
                      name="Custo"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* Gastos por Workpackage */}
          <div 
            className="rounded-xl bg-white p-6 shadow-sm animate-slide-up"
            style={{animationDelay: "0.5s"}}
          >
            <h3 className="mb-6 text-lg font-medium text-gray-900">Gastos por Workpackage</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosWorkpackages}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Bar dataKey="valor" name="Custo" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
                        <Cell key={`cell-${index}`} fill={getCor(index)} />
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
                        Horas
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
                            <div className={`mr-2 h-3 w-3 rounded-full`} style={{backgroundColor: getCor(index)}}></div>
                            <span className="font-medium text-gray-900">{wp.nome}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                          {formatNumber(wp.horas)}
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
            <h3 className="mb-6 text-lg font-medium text-gray-900">Detalhes dos Workpackages</h3>
            
            <div className="space-y-4">
              {dadosWorkpackages.map((wp, index) => {
                const percentagem = (wp.valor / resumo.orcamento.real.total) * 100;
                // Garantindo que gradienteWp sempre terá um valor
                const gradienteWp = getGradiente(index);
                
                return (
                  <div key={wp.id} className="rounded-lg border border-gray-100 p-4 transition-all hover:shadow-md">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center" 
                             style={{backgroundColor: `${getCor(index)}20`}}>
                          <PieChartIcon className="h-5 w-5" style={{color: getCor(index)}} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{wp.nome}</h4>
                          <p className="text-sm text-gray-500">{formatNumber(wp.horas)} horas</p>
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
                            width: `${percentagem}%`,
                            background: `linear-gradient(90deg, ${gradienteWp[0]}, ${gradienteWp[1]})`
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
              // Garantindo que gradienteUser sempre terá um valor
              const gradienteUser = getGradiente(index);
              
              return (
                <div 
                  key={user.user.id} 
                  className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sm transition-all hover:shadow-md cursor-pointer"
                  onClick={() => handleToggleUser(user.user.id)}
                >
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10" 
                    style={{background: `linear-gradient(135deg, ${gradienteUser[0]}, ${gradienteUser[1]})`}}>
                  </div>
                  <div className="relative">
                    <div className="mb-4 flex items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full" 
                        style={{background: `linear-gradient(135deg, ${gradienteUser[0]}, ${gradienteUser[1]})`}}>
                        <span className="text-sm font-bold uppercase text-white">
                          {user.user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </span>
                      </div>
                      <div className="ml-3">
                        <h4 className="font-medium text-gray-900">{user.user.name}</h4>
                        <p className="text-xs text-gray-500">{formatNumber(user.totalAlocacao)} horas</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Alocação</span>
                        <span className="font-medium">{formatNumber(user.totalAlocacao)} h</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Custo</span>
                        <span className="font-medium">{formatCurrency(user.custoTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">% do Total</span>
                        <span className="font-medium">{((user.custoTotal / resumo.orcamento.real.totalRecursos) * 100).toFixed(1)}%</span>
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
                                <div className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: getCor(Math.abs(wp.workpackage.id.charCodeAt(0) % CORES.length)) }}></div>
                                {wp.workpackage.nome}
                              </h4>
                              <div className="flex items-center gap-6">
                                <div className="text-center">
                                  <p className="text-xs font-medium uppercase text-gray-500">Total Horas</p>
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
                                    Horas
                                  </th>
                                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Custo
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 bg-white">
                                {wp.alocacoes.sort((a, b) => {
                                  if (a.ano !== b.ano) return a.ano - b.ano;
                                  return a.mes - b.mes;
                                }).map((alocacao) => (
                                  <tr key={alocacao.alocacaoId} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-900">
                                      {getMesNome(alocacao.mes)} {alocacao.ano}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3 text-right text-sm text-gray-500">
                                      {formatNumber(alocacao.horas)}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-3 text-right text-sm font-medium text-gray-900">
                                      {formatCurrency(alocacao.custo)}
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