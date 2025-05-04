"use client";

import { useMemo, useState } from "react";
import { Calendar, DollarSign, Percent, Info, Users, User, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { User as PrismaUser, Workpackage, AlocacaoRecurso } from "@prisma/client";
import { ProjetoEstado } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader } from "@/components/ui/loader";

interface RecursoComUser extends AlocacaoRecurso {
  user: Pick<PrismaUser, "id" | "name" | "foto"> | null;
}

interface WPComRecursos extends Workpackage {
  recursos: RecursoComUser[];
}

interface ProjetoVisaoGeral {
  id: string;
  nome: string;
  descricao: string | null;
  inicio: Date | null;
  fim: Date | null;
  estado: ProjetoEstado;
  valor_eti: string | null;
  taxa_financiamento: string | null;
  overhead: string | null;
  financiamento?: { nome?: string | null } | null;
  workpackages: WPComRecursos[];
  responsavel?: Pick<PrismaUser, "id" | "name" | "foto"> | null;
}

interface VisaoGeralProps {
  projeto: ProjetoVisaoGeral | null | undefined;
}

const formatarData = (data: Date | string | null | undefined): string => {
  if (!data) return "Não definida";
  try {
    return new Date(data).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Data inválida";
  }
};

const formatCurrency = (value: string | number | null | undefined): string => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (typeof numValue !== "number" || isNaN(numValue)) return "- €";
  return numValue.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPercentage = (value: string | number | null | undefined): string => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (typeof numValue !== "number" || isNaN(numValue)) return "- %";
  const decimalValue = numValue;
  return decimalValue.toLocaleString("pt-PT", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
}

function InfoCard({ title, children }: InfoCardProps) {
  return (
    <Card className="overflow-hidden rounded-xl border border-slate-100 bg-white/80 shadow-sm backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4 pb-3">
        <CardTitle className="text-md font-medium text-slate-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  );
}

interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  iconClassName?: string;
}

function InfoItem({ icon: Icon, label, value, iconClassName }: InfoItemProps) {
  return (
    <div className="flex items-start space-x-3 py-2">
      <Icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400", iconClassName)} />
      <div className="flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-700">
          {value || <span className="font-normal italic text-slate-400">Não definido</span>}
        </p>
      </div>
    </div>
  );
}

interface ResourceUser extends Pick<PrismaUser, "id" | "name" | "foto"> {
  name: string;
}

interface ResourceListProps {
  users: ResourceUser[];
}

function ResourceList({ users }: ResourceListProps) {
  if (!users || users.length === 0) {
    return (
      <p className="text-sm italic text-slate-400">Nenhum recurso alocado.</p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">{users.length} recursos alocados</p>
      <div className="max-h-48 space-y-1.5 overflow-y-auto pr-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-sm"
          >
            <User className="h-4 w-4 flex-shrink-0 text-slate-500" />
            <span className="font-medium">{user.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CostChart({ projetoId, projeto }: { projetoId: string, projeto: ProjetoVisaoGeral }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const { data: gastosMensais, isLoading, error } = api.financas.getGastosMensais.useQuery({
    projetoId: projetoId,
    ano: parseInt(selectedYear),
  }, {
    enabled: !!projetoId && !!selectedYear,
    refetchOnWindowFocus: false,
  });

  // Preparar dados para o gráfico
  const chartData = useMemo(() => {
    if (!gastosMensais) return [];
    
    return gastosMensais.map(gasto => ({
      mes: new Date(parseInt(selectedYear), gasto.mes - 1).toLocaleString('pt-PT', { month: 'short' }),
      estimado: gasto.estimado,
      realizado: gasto.realizado
    }));
  }, [gastosMensais, selectedYear]);

  // Anos disponíveis para seleção (baseados na duração do projeto)
  const availableYears = useMemo(() => {
    const years = [];
    if (projeto.inicio && projeto.fim) {
      const startYear = new Date(projeto.inicio).getFullYear();
      const endYear = new Date(projeto.fim).getFullYear();
      for (let y = startYear; y <= endYear; y++) {
        years.push(y.toString());
      }
    } else if (projeto.inicio) {
      const startYear = new Date(projeto.inicio).getFullYear();
      const currentYear = new Date().getFullYear();
      for (let y = startYear; y <= currentYear + 1; y++) {
        years.push(y.toString());
      }
    } else {
      const currentYear = new Date().getFullYear();
      for (let y = currentYear - 1; y <= currentYear + 1; y++) {
        years.push(y.toString());
      }
    }
    return years;
  }, [projeto.inicio, projeto.fim]);

  const chartConfig = {
    estimado: {
      label: "Estimado",
      color: "#94a3b8"
    },
    realizado: {
      label: "Realizado",
      color: "#475569"
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-slate-700">
          <p className="font-semibold">A carregar dados financeiros...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !gastosMensais) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6 text-center text-amber-700">
          <p className="font-semibold">Erro ao carregar dados financeiros</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-slate-100 bg-white/80 shadow-sm backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <CardTitle className="text-lg font-semibold text-slate-800">Custos Mensais</CardTitle>
          <CardDescription>{selectedYear}</CardDescription>
        </div>
        <div className="w-32">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-8 rounded-md border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-slate-300 focus:ring-offset-0">
              <SelectValue placeholder="Selecione o ano" />
            </SelectTrigger>
            <SelectContent className="rounded-md border-slate-200 shadow-md">
              {availableYears.map((year) => (
                <SelectItem key={year} value={year} className="rounded-sm data-[highlighted]:bg-slate-50">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="horizontal" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis 
                dataKey="mes" 
                stroke="#64748b" 
                tick={{ fontSize: 12 }} 
                tickLine={false} 
                axisLine={false}
                tickMargin={10}
              />
              <YAxis 
                stroke="#64748b" 
                tick={{ fontSize: 12 }} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `${value/1000}K€`}
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white/90 p-3 shadow-md backdrop-blur-sm">
                      <p className="mb-2 font-medium text-slate-800">{payload[0]?.payload.mes}</p>
                      {payload.map((item: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="font-medium text-slate-600">{item.name}:</span>
                          <span className="text-slate-800">{item.value?.toLocaleString('pt-PT')}€</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Bar 
                dataKey="estimado" 
                name="Estimado" 
                fill="#92C5FD" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                dataKey="realizado" 
                name="Realizado" 
                fill="#3C82F6" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default function VisaoGeral({ projeto }: VisaoGeralProps) {
  // Calculate involved users only once, memoizing the result based on workpackages
  const involvedUsers = useMemo(() => {
    // Ensure projeto and workpackages exist before processing
    if (!projeto || !projeto.workpackages) return []; // Check added here

    const userMap = new Map<string, ResourceUser>();
    projeto.workpackages.forEach((wp) => {
      // Ensure wp.recursos is an array before iterating
      (wp.recursos ?? []).forEach((r) => {
        // Check if user exists, has an id, and a name, and is not already in the map
        if (r.user && r.user.id && r.user.name && !userMap.has(r.user.id)) {
          userMap.set(r.user.id, {
            id: r.user.id,
            name: r.user.name, // name is guaranteed by the check above
            foto: r.user.foto, // foto can be null
          });
        }
      });
    });
    // Convert the map values (unique users) to an array
    return Array.from(userMap.values());
  }, [projeto]); // Dependency array ensures recalculation only if projeto object changes

  // If projeto data is not available, show a message and return early
  if (!projeto) {
    // useMemo is now before this check
    return (
      <div className="animate-fade-in space-y-6">
        <Loader.SkeletonCard 
          header={true} 
          headerHeight="h-8" 
          rows={1} 
          rowHeight="h-24" 
          className="border-slate-100"
        />
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Loader.SkeletonCard 
            headerHeight="h-5" 
            rows={2} 
            rowHeight="h-6" 
            className="border-slate-100"
          />
          <Loader.SkeletonCard 
            headerHeight="h-5" 
            rows={4} 
            rowHeight="h-6" 
            className="border-slate-100"
          />
          <Loader.SkeletonCard 
            headerHeight="h-5" 
            rows={5} 
            rowHeight="h-6" 
            className="border-slate-100"
          />
        </div>
        
        <Loader.SkeletonCard 
          header={true} 
          headerHeight="h-6" 
          rows={1} 
          rowHeight="h-64" 
          className="border-slate-100"
        />
      </div>
    );
  }

  const getBadgeClass = (estado: ProjetoEstado) => {
    if (estado === ProjetoEstado.EM_DESENVOLVIMENTO)
      return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
    if (estado === ProjetoEstado.CONCLUIDO)
      return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
    if (estado === ProjetoEstado.APROVADO)
      return "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100";
    if (estado === ProjetoEstado.PENDENTE)
      return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
    return "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100";
  };

  const getBadgeLabel = (estado: ProjetoEstado) => {
    if (estado === ProjetoEstado.EM_DESENVOLVIMENTO) return "Em Desenvolvimento";
    if (estado === ProjetoEstado.CONCLUIDO) return "Concluído";
    if (estado === ProjetoEstado.PENDENTE) return "Pendente";
    if (estado === ProjetoEstado.RASCUNHO) return "Rascunho";
    if (estado === ProjetoEstado.APROVADO) return "Aprovado";
    return estado;
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight text-slate-900">
            {projeto.nome}
          </h1>
          {projeto.descricao && (
            <p className="mt-2 max-w-prose text-sm text-slate-600">{projeto.descricao}</p>
          )}
        </div>
        <Badge
          variant="outline"
          className={cn(
            "w-fit flex-shrink-0 px-3 py-1 text-sm font-semibold shadow-sm sm:w-auto",
            getBadgeClass(projeto.estado)
          )}
        >
          {getBadgeLabel(projeto.estado)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Detalhes do Projeto */}
        <InfoCard title="Detalhes do Projeto">
          <div className="divide-y divide-slate-100">
            <InfoItem 
              icon={User} 
              label="Responsável" 
              value={projeto.responsavel?.name || "Não definido"} 
            />
            <InfoItem 
              icon={Calendar} 
              label="Início" 
              value={formatarData(projeto.inicio)} 
            />
            <InfoItem 
              icon={Calendar} 
              label="Fim" 
              value={formatarData(projeto.fim)} 
            />
            {projeto.inicio && projeto.fim && (
              <InfoItem 
                icon={Clock} 
                label="Duração" 
                value={`${Math.ceil((new Date(projeto.fim).getTime() - new Date(projeto.inicio).getTime()) / (1000 * 60 * 60 * 24 * 30))} meses`} 
              />
            )}
          </div>
        </InfoCard>

        {/* Financiamento */}
        <InfoCard title="Detalhes Financeiros">
          <div className="divide-y divide-slate-100">
            <InfoItem
              icon={Info}
              label="Tipo de Financiamento"
              value={projeto.financiamento?.nome || "N/A"}
            />
            <InfoItem 
              icon={DollarSign} 
              label="Valor ETI" 
              value={formatCurrency(projeto.valor_eti)} 
            />
            <InfoItem
              icon={Percent}
              label="Taxa de Financiamento"
              value={formatPercentage(projeto.taxa_financiamento)}
            />
            <InfoItem 
              icon={Percent} 
              label="Overhead" 
              value={formatPercentage(projeto.overhead)} 
            />
          </div>
        </InfoCard>

        {/* Recursos Envolvidos */}
        <InfoCard title="Recursos Envolvidos">
          <ResourceList users={involvedUsers} />
        </InfoCard>
      </div>

      {/* Gráfico de Custos */}
      <Tabs defaultValue="custos" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-1">
          <TabsTrigger value="custos">Análise de Custos</TabsTrigger>
        </TabsList>
        <TabsContent value="custos">
          <CostChart projetoId={projeto.id} projeto={projeto} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
