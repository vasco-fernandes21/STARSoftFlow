"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { api } from "@/trpc/react";
import { formatCurrency } from "./utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FolgaTabProps {
  projetoId: string;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
}

export function FolgaTab({
  projetoId,
}: FolgaTabProps) {
  // Fetch financial vision data
  const { data: visaoProjeto, isLoading: isLoadingVisao } = api.financas.getVisaoProjeto.useQuery({
    projetoId,
  });

  if (isLoadingVisao) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[250px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (!visaoProjeto) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Sem dados de folga disponíveis</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`rounded-lg p-4 ${visaoProjeto.folga >= 0 ? "bg-green-50" : "bg-red-50"}`}>
          <h3 className="text-sm font-medium text-gray-700">Folga Total</h3>
          <p className={`text-2xl font-semibold ${visaoProjeto.folga >= 0 ? "text-green-700" : "text-red-700"}`}>
            {formatCurrency(visaoProjeto.folga)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Diferença entre orçamento submetido e custos reais + overhead
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 p-4">
          <h3 className="text-sm font-medium text-gray-700">Orçamento Submetido</h3>
          <p className="text-2xl font-semibold text-blue-700">
            {formatCurrency(visaoProjeto.orcamentoSubmetido)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Orçamento inicial submetido para o projeto
          </p>
        </div>

        <div className="rounded-lg bg-amber-50 p-4">
          <h3 className="text-sm font-medium text-gray-700">Orçamento Real</h3>
          <p className="text-2xl font-semibold text-amber-700">
            {formatCurrency(visaoProjeto.orcamentoReal)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Orçamento calculado com os valores atuais
          </p>
        </div>
      </div>

      {/* Detailed Table */}
      <Card className="border border-gray-100 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Detalhes por Ano</CardTitle>
          <CardDescription>
            Apresenta a folga financeira (diferença entre orçamento submetido e custos reais + overhead) por ano
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ano</TableHead>
                <TableHead className="text-right">Orçamento Submetido</TableHead>
                <TableHead className="text-right">Orçamento Real</TableHead>
                <TableHead className="text-right">Folga</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visaoProjeto.detalhesAnos.length > 0 ? (
                visaoProjeto.detalhesAnos.map((detalhe) => (
                  <TableRow key={detalhe.ano}>
                    <TableCell className="font-medium text-slate-700">
                      {detalhe.ano}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600">
                      {formatCurrency(detalhe.submetido)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-amber-600">
                      {formatCurrency(detalhe.real)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${detalhe.folga >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(detalhe.folga)}
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
  );
}

export default FolgaTab; 