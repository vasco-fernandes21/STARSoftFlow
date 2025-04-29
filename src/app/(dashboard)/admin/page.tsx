"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NovoProjeto } from "@/components/projetos/NovoProjeto";
import { StatsGrid } from "@/components/common/StatsGrid";
import type { StatItem } from "@/components/common/StatsGrid";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils"; // Assumindo que esta função existe
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";  
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  Users,
  ChevronRight,
  PieChart as PieChartIcon,
  Clock
} from "lucide-react";

// --- Colar constantes e mock data aqui (fora do componente Page) ---
const mockStatsItems: StatItem[] = [
  {
    icon: Briefcase,
    label: "Projetos Ativos",
    value: 12,
    iconClassName: "text-blue-600",
    iconContainerClassName: "bg-blue-50/80",
    badgeText: "3 novos este mês",
    badgeIcon: TrendingUp,
    badgeClassName: "text-blue-600 bg-blue-50/80 hover:bg-blue-100/80 border-blue-100",
  },
  {
    icon: AlertTriangle,
    label: "Projetos em Risco",
    value: 3,
    iconClassName: "text-amber-600",
    iconContainerClassName: "bg-amber-50/80",
    badgeText: "requerem atenção",
    badgeIcon: AlertCircle,
    badgeClassName: "text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 border-amber-100",
  },
  {
    icon: DollarSign,
    label: "Saúde Financeira",
    value: 85, // Changed from "Positiva" to a number representing a financial health score
    iconClassName: "text-emerald-600",
    iconContainerClassName: "bg-emerald-50/80",
    badgeText: "+5% margem média",
    badgeIcon: TrendingUp,
    badgeClassName: "text-emerald-600 bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-100",
  },
  {
    icon: Users,
    label: "Ocupação Média",
    value: 85,
    suffix: "%",
    iconClassName: "text-purple-600",
    iconContainerClassName: "bg-purple-50/80",
    badgeText: "últimos 30 dias",
    badgeClassName: "text-purple-600 bg-purple-50/80 hover:bg-purple-100/80 border-purple-100",
  },
];

const mockPendingProjects = [
  { id: "proj_abc", name: "Implementação CRM Global", status: "APROVADO", daysPending: 2 },
  { id: "proj_def", name: "Desenvolvimento App Mobile V2", status: "APROVADO", daysPending: 5 },
];

const mockAtRiskProjects = [
  { id: "proj_ghi", name: "Migração Cloud Azure", status: "RISCO_BUDGET", deadline: "2024-08-15" },
  {
    id: "proj_jkl",
    name: "Replatforming E-commerce",
    status: "RISCO_PRAZO",
    deadline: "2024-07-30",
  },
  {
    id: "proj_mno",
    name: "Otimização Base de Dados Clientes",
    status: "RISCO_BUDGET",
    deadline: "2024-09-01",
  },
];

const mockFinancialSummary = {
  totalBudget: 1_500_000,
  totalSpent: 1_150_000,
  projectedResult: 150_000,
};

const mockFinancialTrends = [
  { month: "Jan", orcamento: 125000, despesas: 110000, projetos: 8 },
  { month: "Fev", orcamento: 125000, despesas: 122000, projetos: 8 },
  { month: "Mar", orcamento: 150000, despesas: 140000, projetos: 9 },
  { month: "Abr", orcamento: 150000, despesas: 135000, projetos: 10 },
  { month: "Mai", orcamento: 175000, despesas: 160000, projetos: 11 },
  { month: "Jun", orcamento: 175000, despesas: 168000, projetos: 12 },
];

const mockProjectStatuses = [
  { name: "Em Desenvolvimento", value: 12, color: "#3b82f6" }, // blue-500
  { name: "Em Risco", value: 3, color: "#f59e0b" }, // amber-500
  { name: "Críticos", value: 1, color: "#ef4444" }, // red-500
  { name: "Aprovados", value: 4, color: "#10b981" }, // emerald-500
  { name: "Pendentes", value: 2, color: "#6b7280" }, // gray-500
];

// --- Colar componentes auxiliares aqui (fora do componente Page) ---
function ProjectListCard({
  title,
  projects,
  icon: Icon,
  linkTo = "/projetos",
}: {
  title: string;
  projects: { id: string; name: string; status: string; [key: string]: any }[];
  icon: React.ElementType;
  linkTo?: string;
}) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden border-gray-100 bg-white shadow-md transition-all hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between bg-white px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-slate-500" />
          <CardTitle className="text-base font-medium text-slate-700">{title}</CardTitle>
        </div>
        <Badge variant="secondary" className="border-none bg-slate-100 text-xs text-slate-600">
          {projects.length}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col justify-between bg-slate-50/30 p-0">
        {projects.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {projects.slice(0, 4).map((project) => (
              <li key={project.id} className="px-4 py-3 transition-colors hover:bg-slate-50">
                <Link href={`/projetos/${project.id}`} className="block">
                  <p className="truncate text-sm font-normal text-slate-800 transition-colors group-hover:text-azul">
                    {project.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {project.status === "APROVADO"
                      ? `Aprovado há ${project.daysPending} dias`
                      : `Prazo: ${project.deadline}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center text-sm text-slate-500">Nenhum projeto para mostrar.</div>
        )}
        <div className="mt-auto border-t border-slate-100 bg-white p-3">
          <Link href={linkTo}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-sm text-azul hover:bg-blue-50/80 hover:text-azul"
            >
              Ver Todos
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function FinancialSummaryCard({ summary }: { summary: typeof mockFinancialSummary }) {
  const progress = (summary.totalSpent / summary.totalBudget) * 100;
  const resultColor = summary.projectedResult >= 0 ? "text-emerald-600" : "text-red-600";

  return (
    <Card className="flex h-full flex-col overflow-hidden border-gray-100 bg-white shadow-md transition-all hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between bg-white px-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-slate-500" />
          <CardTitle className="text-base font-medium text-slate-700">Resumo Financeiro</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col justify-between bg-slate-50/30 p-4">
        <div className="space-y-4">
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-slate-600">Orçamento Total</span>
              <span className="font-medium text-slate-800">
                {formatCurrency(summary.totalBudget)}
              </span>
            </div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-slate-600">Total Gasto</span>
              <span className="font-medium text-slate-800">
                {formatCurrency(summary.totalSpent)}
              </span>
            </div>
            <div className="mb-3 mt-2 h-1.5 w-full rounded-full bg-slate-200">
              <div
                className="h-1.5 rounded-full bg-blue-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Resultado Projetado</span>
              <span className={`font-semibold ${resultColor}`}>
                {formatCurrency(summary.projectedResult)}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-100 bg-white p-3">
          <Link href="/financas">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-sm text-azul hover:bg-blue-50/80 hover:text-azul"
            >
              Ver Detalhes Financeiros
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardCharts() {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm">
          <p className="mb-1 font-medium text-slate-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
              {entry.name}:{" "}
              {entry.name.includes("orçamento") || entry.name.includes("despesas")
                ? formatCurrency(entry.value)
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    _index,
    _name,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="overflow-hidden border-gray-100 bg-white shadow-md transition-all hover:shadow-lg">
      <CardHeader className="bg-white px-4 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-base font-medium text-slate-700">
              Visão Geral do Portfólio
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <Tabs defaultValue="financeiro" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="financeiro">Evolução Financeira</TabsTrigger>
            <TabsTrigger value="projetos">Estado dos Projetos</TabsTrigger>
          </TabsList>

          <TabsContent value="financeiro" className="p-1">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mockFinancialTrends}
                  margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    tickFormatter={(value) => `${value / 1000}k€`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    domain={[0, "dataMax + 2"]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    wrapperStyle={{
                      paddingTop: "10px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="orcamento"
                    name="Receitas"
                    fill="#93c5fd"
                    barSize={20}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="despesas"
                    name="Despesas"
                    fill="#3b82f6"
                    barSize={20}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="projetos" className="pt-2">
            <div className="h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockProjectStatuses}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={110}
                    innerRadius={50}
                    dataKey="value"
                    nameKey="name"
                  >
                    {mockProjectStatuses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    wrapperStyle={{
                      paddingTop: "15px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// --- Componente Principal da Página ---
export default function Page() {
  return (
    <div className="h-full bg-bgApp p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Painel de Controlo</h1>
            <p className="text-sm text-slate-500">Visão geral da organização</p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <NovoProjeto />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          {/* KPI Cards */}
          <StatsGrid stats={mockStatsItems} />

          {/* Charts component */}
          <DashboardCharts />

          {/* Grid for Lists and Summary */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Pending Projects */}
            <ProjectListCard
              title="Projetos Aprovados (Pendentes)"
              projects={mockPendingProjects}
              icon={Clock}
              linkTo="/projetos?estado=APROVADO"
            />

            {/* At Risk Projects */}
            <ProjectListCard
              title="Projetos em Risco"
              projects={mockAtRiskProjects}
              icon={AlertTriangle}
              linkTo="/projetos?estado=RISCO"
            />

            {/* Financial Summary */}
            <FinancialSummaryCard summary={mockFinancialSummary} />
          </div>
        </div>
      </div>
    </div>
  );
}
