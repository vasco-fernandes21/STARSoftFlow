"use client";

import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Filter } from "lucide-react";
import { api } from "@/trpc/react";
import { formatNumber, formatCurrency, formatPercentage } from "./utils";
import { SelectField } from "@/components/projetos/criar/components/FormFields";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// import type { Decimal } from 'decimal.js'; // Removed as client receives numbers

// Type for individual workpackage item from getByProjeto
interface WorkpackageSelectItem {
  id: string;
  nome: string;
}

// Inferred type for orcamentoDetalhadoData (based on backend `getOrcamentoRealDetalhado`)
// This helps with type safety if tRPC inference is not perfectly picked up by the editor
interface OrcamentoDetalhado {
  custoRecursos: number; // Expecting number on client
  custoMateriais: number; // Expecting number on client
  total: number; // Expecting number on client
  detalhesRecursos: Array<any>; // Define more specifically if needed
  detalhesMateriais: Array<any>; // Define more specifically if needed
}

interface OrcamentoRealTabProps {
  projetoId: string;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
}

type DetalheAno = {
  ano: number;
  custosRecursos: number;
  custosMateriais: number;
  custoTotal: number;
}

type DetalheWorkpackage = {
  workpackageId: string;
  workpackageNome: string;
  custosRecursos: number;
  custosMateriais: number;
  custoTotal: number;
}

type OrcamentoRealResponse = {
  custoRecursosTotal: number;
  custoMateriaisTotal: number;
  custoTotal: number;
  detalhes: Array<{
    ano: number;
    custosRecursos: number;
    custosMateriais: number;
    custoTotal: number;
  }> | Array<{
    workpackageId: string;
    workpackageNome: string;
    custosRecursos: number;
    custosMateriais: number;
    custoTotal: number;
  }>;
}

export function OrcamentoRealTab({
  projetoId,
  selectedYear,
  setSelectedYear,
}: OrcamentoRealTabProps) {
  const [selectedWorkpackage, setSelectedWorkpackage] = useState<string>("todos");
  const [filterType, setFilterType] = useState<"year" | "workpackage">("year");
  
  const utils = api.useUtils();
  
  const { data: projetoDetails } = api.projeto.findById.useQuery(
    projetoId,
    { enabled: !!projetoId }
  );

  const { data: workpackages = [] } = api.workpackage.getByProjeto.useQuery(
    projetoId,
    { enabled: !!projetoId }
  );

  const { data: orcamentoData, isLoading } = api.financas.getOrcamentoRealDetalhado.useQuery(
    {
      projetoId,
      tipoVisualizacao: filterType,
    },
    {
      enabled: !!projetoId,
      staleTime: 1 * 60 * 1000, 
    }
  );

  useEffect(() => {
    if (projetoId) {
      void utils.financas.getOrcamentoRealDetalhado.prefetch({
        projetoId,
        tipoVisualizacao: filterType,
      });
    }
  }, [projetoId, filterType, utils.financas.getOrcamentoRealDetalhado]);

  const anosDisponiveis = useMemo(() => {
    const anos = new Set<number>();
    const currentYear = new Date().getFullYear();
    anos.add(currentYear);
    anos.add(currentYear - 1);
    if (projetoDetails?.inicio || projetoDetails?.fim) {
      const startYear = projetoDetails.inicio 
        ? new Date(projetoDetails.inicio).getFullYear() 
        : currentYear - 1;
      const endYear = projetoDetails.fim 
        ? new Date(projetoDetails.fim).getFullYear() 
        : currentYear + 1;
      for (let year = startYear; year <= endYear; year++) {
        anos.add(year);
      }
    }
    return Array.from(anos).sort((a, b) => b - a);
  }, [projetoDetails]);

  const workpackageOptions = useMemo(() => {
    const options = [{ value: "todos", label: "Todos os Workpackages" }];
    if (workpackages && workpackages.length > 0) {
      (workpackages as WorkpackageSelectItem[]).forEach((wp: WorkpackageSelectItem) => {
        options.push({
          value: wp.id,
          label: wp.nome
        });
      });
    }
    return options;
  }, [workpackages]);
  
  const yearOptions = useMemo(() => {
    const options = [{ value: "todos", label: "Todos os Anos" }];
    anosDisponiveis.forEach(ano => {
      options.push({
        value: ano.toString(),
        label: ano.toString()
      });
    });
    return options;
  }, [anosDisponiveis]);

  const chartData = useMemo(() => {
    const data = orcamentoData as OrcamentoDetalhado | undefined;
    if (!data) return [];
    
    let label = "Agregado";
    if (filterType === 'year' && selectedYear !== 'todos') {
      label = `Ano: ${selectedYear}`;
    } else if (filterType === 'workpackage' && selectedWorkpackage !== 'todos') {
      const wp = (workpackages as WorkpackageSelectItem[]).find(w => w.id === selectedWorkpackage);
      label = wp ? `WP: ${wp.nome}` : 'Workpackage';
    } else if (filterType === 'year') {
      label = "Todos os Anos (Agregado)";
    } else if (filterType === 'workpackage') {
      label = "Todos os WPs (Agregado)";
    }

    return [{
      name: label,
      recursos: data.custoRecursos || 0,
      materiais: data.custoMateriais || 0,
    }];
  }, [orcamentoData, filterType, selectedYear, selectedWorkpackage, workpackages]);

  const summaryData = useMemo(() => {
    const data = orcamentoData as OrcamentoDetalhado | undefined;
    if (!data) {
      return {
        totalRecursos: 0,
        totalMateriais: 0,
        totalGeral: 0,
        overhead: 0
      };
    }
    const custoRecursosNum = data.custoRecursos || 0;
    const custoMateriaisNum = data.custoMateriais || 0;
    const totalGeralNum = data.total || 0;
    const overheadNum = custoRecursosNum * 0.15; // 15% overhead on resources

    return {
      totalRecursos: custoRecursosNum,
      totalMateriais: custoMateriaisNum,
      totalGeral: totalGeralNum,
      overhead: overheadNum
    };
  }, [orcamentoData]);

  // Prepare table data based on filter type
  const tableData = useMemo(() => {
    if (!orcamentoData) return [];

    return orcamentoData.detalhes.map((detalhe) => {
      if (filterType === "year" && "ano" in detalhe) {
        return {
          identifier: detalhe.ano,
          nome: detalhe.ano.toString(),
          custoRecursos: detalhe.custosRecursos,
          custoMateriais: detalhe.custosMateriais,
          total: detalhe.custoTotal
        };
      } else if (filterType === "workpackage" && "workpackageId" in detalhe) {
        return {
          identifier: detalhe.workpackageId,
          nome: detalhe.workpackageNome,
          custoRecursos: detalhe.custosRecursos,
          custoMateriais: detalhe.custosMateriais,
          total: detalhe.custoTotal
        };
      }
      return null;
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }, [orcamentoData, filterType]);

  const handleFilterTypeChange = (value: string) => {
    setFilterType(value as "year" | "workpackage");
  };
  
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    if (filterType === 'year') {
      void utils.financas.getOrcamentoRealDetalhado.invalidate();
    }
  };

  const handleWorkpackageChange = (wpId: string) => {
    setSelectedWorkpackage(wpId);
    if (filterType === 'workpackage') {
      void utils.financas.getOrcamentoRealDetalhado.invalidate();
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!orcamentoData) {
    return (
      <div className="flex h-96 items-center justify-center text-gray-500">
        Não foram encontrados dados de orçamento real para este projeto.
      </div>
    );
  }

  const { custoRecursosTotal, custoMateriaisTotal, custoTotal } = orcamentoData;
  const overhead = custoRecursosTotal * -0.15; // 15% overhead on resources

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Orçamento Real Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(custoTotal)}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Total de custos reais incorridos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Recursos Humanos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(custoRecursosTotal)}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Custos com pessoal
            </p>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Materiais e Equipamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">
              {formatCurrency(custoMateriaisTotal)}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Custos com materiais e serviços
            </p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Overhead (-15%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              {formatCurrency(overhead)}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              15% dos custos de recursos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Tabs 
          value={filterType} 
          onValueChange={handleFilterTypeChange}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="year" className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Visão por Anos
            </TabsTrigger>
            <TabsTrigger value="workpackage" className="flex items-center gap-1.5">
              <Filter className="h-4 w-4" />
              Visão por Workpackages
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {filterType === "year" ? "Ano" : "Workpackage"}
                  </TableHead>
                  <TableHead className="text-right">Custos Recursos</TableHead>
                  <TableHead className="text-right">Custos Materiais</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row) => (
                  <TableRow key={row.identifier}>
                    <TableCell className="font-medium">
                      {filterType === "year" ? row.identifier : row.nome}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.custoRecursos)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.custoMateriais)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default OrcamentoRealTab; 