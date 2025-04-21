import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { formatNumber, formatCurrency, formatPercentage } from "./utils";
import type { DetalheAnualMapped, FinancasComDetalhes } from "../ProjetoFinancas";

export interface OrcamentoRealTabProps {
  financas: FinancasComDetalhes;
  detalhesAnuais: DetalheAnualMapped[];
  dadosGraficoReal: any[];
}

export function OrcamentoRealTab({ financas, detalhesAnuais, dadosGraficoReal }: OrcamentoRealTabProps) {
  return (
    <Card className="overflow-hidden border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Orçamento Real por Ano</CardTitle>
        <p className="text-sm text-gray-500">
          Apresenta o orçamento real baseado em custos de recursos e materiais por ano.
        </p>
      </CardHeader>
      <CardContent>
        {/* Use unfiltered detalhesAnuais here */}
        {detalhesAnuais.length > 0 ? (
          <>
            <div className="mb-6 h-80">
              {/* Chart */}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dadosGraficoReal} // Uses unfiltered chart data
                  margin={{ top: 10, right: 30, left: 30, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="ano"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6B7280", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6B7280", fontSize: 12 }}
                    tickFormatter={(value: number) => `${formatNumber(value / 1000, 0)}k €`}
                  />
                  <RechartsTooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label: string) => `Ano: ${label}`}
                  />
                  <Bar
                    dataKey="recursos"
                    name="Recursos Humanos"
                    stackId="a"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="materiais"
                    name="Materiais"
                    stackId="a"
                    fill="#60A5FA"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              {/* Table */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Ano</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">
                      Recursos Humanos
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Materiais</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">
                      Custos Totais
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Overhead</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Margem</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">VAB</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">VAB/Custos</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Use unfiltered detalhesAnuais */}
                  {detalhesAnuais.map((detalhe: DetalheAnualMapped) => (
                    <tr key={detalhe.ano} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{detalhe.ano}</td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(detalhe.orcamento.real.recursos)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(detalhe.orcamento.real.materiais)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(detalhe.orcamento.real.total)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(detalhe.overhead)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatPercentage(detalhe.margem)}
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(detalhe.vab)}</td>
                      <td className="px-4 py-3 text-right">
                        {formatNumber(detalhe.vabCustosPessoal)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row (Uses overall financas data) */}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(financas.custosReais.recursos)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(financas.custosReais.materiais)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(financas.custosReais.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(financas.overhead)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatPercentage(financas.margem)}
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(financas.vab)}</td>
                    <td className="px-4 py-3 text-right">
                      {formatNumber(financas.vabCustosPessoal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financial Result Card (Overall) */}
            <div className="mt-6">
              <div
                className={`rounded-lg p-4 ${(financas.resultado ?? 0) >= 0 ? "bg-green-50" : "bg-red-50"}`}
              >
                <h3
                  className={`text-sm font-medium ${(financas.resultado ?? 0) >= 0 ? "text-green-800" : "text-red-800"}`}
                >
                  Resultado Financeiro (Total)
                </h3>
                <p
                  className={`text-2xl font-semibold ${(financas.resultado ?? 0) >= 0 ? "text-green-900" : "text-red-900"}`}
                >
                  {formatCurrency(financas.resultado)}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Valor Financiado - Custos Reais + Overhead (Geral do Projeto)
                </p>
              </div>
            </div>

            {/* Summary Cards (Overall) */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-gray-100 p-4">
                <h3 className="text-sm font-medium text-gray-700">
                  Custos Reais Totais (Geral)
                </h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(financas.custosReais.total)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-100 p-4">
                <h3 className="text-sm font-medium text-gray-700">Overhead (Geral)</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(financas.overhead)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-100 p-4">
                <h3 className="text-sm font-medium text-gray-700">
                  Progresso Custos (Geral)
                </h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatPercentage(
                    (financas.custosReais.total ?? 0) > 0
                      ? Math.min(
                          ((financas.custosConcluidos?.total ?? 0) /
                            (financas.custosReais.total ?? 1)) *
                            100,
                          100
                        )
                      : 0,
                    0
                  )}
                </p>
                <div className="relative mt-2">
                  <Progress
                    value={
                      (financas.custosReais.total ?? 0) > 0
                        ? Math.min(
                            ((financas.custosConcluidos?.total ?? 0) /
                              (financas.custosReais.total ?? 1)) *
                              100,
                            100
                          )
                        : 0
                    }
                    className="h-2"
                  />
                  {/* Indicador do valor financiado na barra de progresso geral */}
                  {(financas.valorFinanciado ?? 0) > 0 &&
                    (financas.custosReais.total ?? 0) > 0 && (
                      <div
                        className="absolute top-0 h-3 w-0.5 bg-green-600"
                        style={{
                          left: `${Math.min(((financas.valorFinanciado ?? 0) / (financas.custosReais.total ?? 1)) * 100, 100)}%`,
                          transform: "translateX(-50%)",
                        }}
                      />
                    )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">Sem dados anuais de orçamento real disponíveis.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 