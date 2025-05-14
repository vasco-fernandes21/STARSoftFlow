"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Filter, DollarSign, Users, Package, LineChart } from "lucide-react";
import { api } from "@/trpc/react";
import { formatCurrency } from "./utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrcamentoSubmetidoTabProps {
  projetoId: string;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
}

export function OrcamentoSubmetidoTab({
  projetoId,
  selectedYear,
  setSelectedYear,
}: OrcamentoSubmetidoTabProps) {
  const [filterType, setFilterType] = useState<"year" | "workpackage">("year");
  const utils = api.useUtils();

  const { data: orcamentoData, isLoading } = api.financas.getOrcamentoSubmetidoDetalhado.useQuery(
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
      void utils.financas.getOrcamentoSubmetidoDetalhado.prefetch({
        projetoId,
        tipoVisualizacao: filterType,
      });
    }
  }, [projetoId, filterType, utils.financas.getOrcamentoSubmetidoDetalhado]);

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!orcamentoData) {
    return (
      <div className="flex h-96 items-center justify-center text-gray-500">
        Não foram encontrados dados de orçamento submetido para este projeto.
      </div>
    );
  }

  const { custoRecursosTotal, custoMateriaisTotal, custoTotal } = orcamentoData;
  const overhead = custoRecursosTotal * -0.15; // 15% overhead sobre os recursos

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Orçamento Submetido Total</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {formatCurrency(custoTotal)}
            </div>
            <p className="mt-1.5 text-xs font-medium text-slate-500">
              Total de custos submetidos
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Recursos Humanos</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {formatCurrency(custoRecursosTotal)}
            </div>
            <p className="mt-1.5 text-xs font-medium text-slate-500">
              Custos com pessoal
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Materiais e Equipamentos</CardTitle>
            <Package className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {formatCurrency(custoMateriaisTotal)}
            </div>
            <p className="mt-1.5 text-xs font-medium text-slate-500">
              Custos com materiais e serviços
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Overhead (-15%)</CardTitle>
            <LineChart className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {formatCurrency(overhead)}
            </div>
            <p className="mt-1.5 text-xs font-medium text-slate-500">
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

        <Card className="border border-gray-100 bg-white shadow-sm">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">
                    {filterType === "year" ? "Ano" : "Workpackage"}
                  </TableHead>
                  <TableHead className="text-right">Custos Recursos</TableHead>
                  <TableHead className="text-right">Custos Materiais</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.length > 0 ? (
                  tableData.map((row) => (
                    <TableRow key={row.identifier}>
                      <TableCell className="font-medium text-slate-700">
                        {row.nome}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.custoRecursos)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.custoMateriais)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.total)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Não foram encontrados dados para esta visualização.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default OrcamentoSubmetidoTab; 