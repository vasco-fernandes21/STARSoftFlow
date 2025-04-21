import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import type { DetalheAnualMapped, FinancasComDetalhes } from "../ProjetoFinancas"; // Importar tipos

export interface OrcamentoSubmetidoTabProps {
  financas: FinancasComDetalhes; // Usar tipo importado
  detalhesAnuais: DetalheAnualMapped[]; // Usar tipo importado
  totalEtis: number;
  dadosGraficoSubmissao: any[]; // Manter any por agora
}

export function OrcamentoSubmetidoTab({
  financas,
  detalhesAnuais,
  totalEtis,
  dadosGraficoSubmissao,
}: OrcamentoSubmetidoTabProps) {
  return (
    <Card className="overflow-hidden border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Orçamento Submetido por Ano</CardTitle>
        <p className="text-sm text-gray-500">
          Apresenta o orçamento submetido baseado em alocações de recursos por ano.
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
                  data={dadosGraficoSubmissao} // Uses unfiltered chart data
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
                    dataKey="orcamento"
                    name="Orçamento Submetido"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="valorFinanciado"
                    name="Valor Financiado"
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
                      ETIs Alocados
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">
                      Orçamento Submetido
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">
                      Valor Financiado
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Margem</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">VAB</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">
                      VAB/Custos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Use unfiltered detalhesAnuais */}
                  {detalhesAnuais.map((detalhe: DetalheAnualMapped) => (
                    <tr key={detalhe.ano} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{detalhe.ano}</td>
                      <td className="px-4 py-3 text-right">
                        {formatNumber(detalhe.alocacoes, 1)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(detalhe.orcamento.submetido)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(detalhe.valorFinanciado)}
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
                    <td className="px-4 py-3 text-right">{formatNumber(totalEtis, 1)}</td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(financas.orcamentoSubmetido)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(financas.valorFinanciado)}
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

            {/* Summary Cards (Uses overall financas data) */}
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-4">
                <h3 className="text-sm font-medium text-blue-800">Taxa de Financiamento</h3>
                <p className="text-2xl font-semibold text-blue-900">
                  {formatPercentage(financas.taxaFinanciamento)}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <h3 className="text-sm font-medium text-blue-800">Valor ETI Médio</h3>
                <p className="text-2xl font-semibold text-blue-900">
                  {formatCurrency(
                    totalEtis > 0 ? (financas.orcamentoSubmetido ?? 0) / totalEtis : 0
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <h3 className="text-sm font-medium text-blue-800">Total ETIs Alocados</h3>
                <p className="text-2xl font-semibold text-blue-900">
                  {formatNumber(totalEtis, 1)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">
              Sem dados anuais de orçamento submetido disponíveis.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 