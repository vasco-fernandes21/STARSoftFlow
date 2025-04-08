"use client";

import { useState, useMemo, useEffect } from "react";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SelectField } from "@/components/projetos/criar/components/FormFields";
import { AlocacoesTable } from "./components/alocacoes-table";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Briefcase, BarChart3, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatsGrid } from "@/components/common/StatsGrid";
import type { StatItem } from "@/components/common/StatsGrid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MESES = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const ANOS = Array.from({ length: 5 }, (_, i) => {
  const ano = new Date().getFullYear() - i;
  return { value: ano.toString(), label: ano.toString() };
});

export default function RelatorioPage() {
  const params = useParams();
  const username = params?.username as string;

  const [mesSelecionado, setMesSelecionado] = useState(
    (new Date().getMonth() + 1).toString()
  );
  const [anoSelecionado, setAnoSelecionado] = useState(
    new Date().getFullYear().toString()
  );

  const { data: relatorioData, isLoading, error, refetch } = api.utilizador.getRelatorioMensal.useQuery(
    {
      username,
      mes: parseInt(mesSelecionado),
      ano: parseInt(anoSelecionado),
    },
    {
      enabled: !!username,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
    }
  );

  // Refetch when month or year changes
  useEffect(() => {
    void refetch();
  }, [mesSelecionado, anoSelecionado, refetch]);

  // Memoized stats calculation
  const stats = useMemo<StatItem[]>(() => {
    if (!relatorioData?.configuracaoMensal) return [];

    const { diasUteis, horasPotenciais } = relatorioData.configuracaoMensal;
    
    // Calcular total de ocupação em horas
    const totalHoras = relatorioData.alocacoes.reduce(
      (sum, alocacao) => sum + (alocacao.ocupacao * horasPotenciais), 
      0
    );
    
    // Quantidade de projetos únicos
    const projetosUnicos = new Set(relatorioData.alocacoes.map(a => a.projetoNome)).size;

    return [
      {
        icon: Calendar,
        label: "Dias Úteis",
        value: diasUteis,
        iconClassName: "text-blue-600",
        iconContainerClassName: "bg-blue-50/80",
      },
      {
        icon: Clock,
        label: "Horas Potenciais",
        value: horasPotenciais,
        iconClassName: "text-green-600",
        iconContainerClassName: "bg-green-50/80",
      },
      {
        icon: BarChart3,
        label: "Horas Alocadas",
        value: Math.round(totalHoras * 10) / 10,
        iconClassName: "text-amber-600",
        iconContainerClassName: "bg-amber-50/80",
      },
      {
        icon: Briefcase,
        label: "Projetos",
        value: projetosUnicos,
        iconClassName: "text-purple-600",
        iconContainerClassName: "bg-purple-50/80",
      },
    ];
  }, [relatorioData?.configuracaoMensal, relatorioData?.alocacoes]);

  // Memoized formatted allocations
  const alocacoesFormatadas = useMemo(() => {
    // Ensure we have data and alocacoes is an array
    if (!relatorioData?.alocacoes || !Array.isArray(relatorioData.alocacoes)) {
      return [];
    }
    return relatorioData.alocacoes.map((alocacao) => ({
      id: alocacao.workpackageId + "-" + alocacao.projetoId,
      projeto: alocacao.projetoNome,
      workpackage: alocacao.workpackageNome,
      percentagem: alocacao.ocupacao * 100,
    }));
  }, [relatorioData?.alocacoes]);

  // Obter as horas potenciais do mês
  const horasPotenciais = useMemo(() => {
    return relatorioData?.configuracaoMensal?.horasPotenciais || 176;
  }, [relatorioData?.configuracaoMensal]);

  // Obter o nome do utilizador do relatório
  const nomeUtilizador = useMemo(() => {
    return relatorioData?.utilizador?.nome || username;
  }, [relatorioData?.utilizador, username]);

  // Formatar data selecionada
  const dataSelecionada = useMemo(() => {
    return format(
      new Date(parseInt(anoSelecionado), parseInt(mesSelecionado) - 1),
      "MMMM yyyy",
      { locale: ptBR }
    );
  }, [anoSelecionado, mesSelecionado]);

  // Dropdown para seleção de mês/ano
  const DateSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-white border-gray-200 hover:bg-gray-50 font-medium flex items-center gap-2 h-10 pr-3"
        >
          <CalendarIcon className="h-4 w-4 text-gray-500" />
          <span className="capitalize">{dataSelecionada}</span>
          <ChevronDown className="h-4 w-4 ml-1 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 p-3">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-500 uppercase">Mês</h4>
            <div className="grid grid-cols-3 gap-1.5">
              {MESES.map(mes => (
                <Button
                  key={mes.value}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs justify-center",
                    mesSelecionado === mes.value
                      ? "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                  onClick={() => setMesSelecionado(mes.value)}
                >
                  {mes.label.substring(0, 3)}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-500 uppercase">Ano</h4>
            <div className="flex flex-wrap gap-1.5">
              {ANOS.map(ano => (
                <Button
                  key={ano.value}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs justify-center",
                    anoSelecionado === ano.value
                      ? "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                  onClick={() => setAnoSelecionado(ano.value)}
                >
                  {ano.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (error) {
    return (
      <div className="h-auto bg-[#F7F9FC] p-8">
        <div className="max-w-8xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>
              Ocorreu um erro ao carregar o relatório: {error.message}. Por favor, tente novamente.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="h-auto bg-[#F9FAFB] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header com título e seletor de data */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Alocações de {nomeUtilizador}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Relatório mensal de horas trabalhadas e distribuição por projeto
            </p>
          </div>
          
          <DateSelector />
        </div>

        {/* Stats Grid em linha separada */}
        <div className="-mx-3">
          <StatsGrid stats={stats} className="lg:grid-cols-4" />
        </div>

        {/* Allocations Table com UI moderna */}
        <Card className="shadow-sm overflow-hidden border-none">
          <CardContent className="p-0">
            <div className="p-6 border-b border-gray-100 flex flex-row items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Distribuição de Horas
              </h2>
              {isLoading && <p className="text-sm text-gray-500 animate-pulse">A carregar dados...</p>}
            </div>
            <AlocacoesTable
              alocacoes={alocacoesFormatadas}
              isLoading={isLoading}
              horasPotenciais={horasPotenciais}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}