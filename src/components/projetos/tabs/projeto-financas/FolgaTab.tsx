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
import type { DetalheAnualMapped, FinancasComDetalhes } from "../ProjetoFinancas";

export interface FolgaTabProps {
  financas: FinancasComDetalhes;
  detalhesAnuais: DetalheAnualMapped[];
}

export function FolgaTab({ financas, detalhesAnuais }: FolgaTabProps) {
  return (
    <Card className="overflow-hidden border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Folga Financeira</CardTitle>
        <p className="text-sm text-gray-500">
          Apresenta a folga financeira (diferença entre orçamento submetido e custos reais +
          overhead) por ano.
        </p>
      </CardHeader>
      <CardContent>
        {detalhesAnuais.length > 0 ? (
          <>
            <div className="mb-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={detalhesAnuais.map((detalhe) => {
                    const primeiroAno = Math.min(...detalhesAnuais.map((d) => d.ano)) === detalhe.ano;
                    return {
                      ano: detalhe.ano.toString(),
                      folga:
                        primeiroAno
                          ? detalhe.orcamento.submetido - detalhe.orcamento.real.total
                          : detalhe.orcamento.submetido - detalhe.orcamento.real.total + detalhe.overhead,
                      orcamentoSubmetido: detalhe.orcamento.submetido,
                      custosReais: detalhe.orcamento.real.total,
                      overhead: detalhe.overhead,
                    };
                  })}
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
                  <Bar dataKey="folga" name="Folga" fill="#22C55E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Ano</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">
                      Orçamento Submetido
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">
                      Custos Reais
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Overhead</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Folga</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">
                      % do Orçamento
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detalhesAnuais.map((detalhe: DetalheAnualMapped) => {
                    const primeiroAno = Math.min(...detalhesAnuais.map((d) => d.ano)) === detalhe.ano;
                    const folga = primeiroAno
                      ? detalhe.orcamento.submetido - detalhe.orcamento.real.total
                      : detalhe.orcamento.submetido - detalhe.orcamento.real.total + detalhe.overhead;
                    const percentagemFolga = (folga / detalhe.orcamento.submetido) * 100;

                    return (
                      <tr key={detalhe.ano} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{detalhe.ano}</td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(detalhe.orcamento.submetido)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(detalhe.orcamento.real.total)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(primeiroAno ? 0 : detalhe.overhead)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={folga >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(folga)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={percentagemFolga >= 0 ? "text-green-600" : "text-red-600"}
                          >
                            {formatPercentage(percentagemFolga)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(financas.orcamentoSubmetido)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(financas.custosReais.total)}
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(financas.overhead)}</td>
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        const primeiroAnoOverhead =
                          detalhesAnuais.find(
                            (d) => d.ano === Math.min(...detalhesAnuais.map((d) => d.ano))
                          )?.overhead ?? 0;
                        const folgaTotal =
                          financas.orcamentoSubmetido - financas.custosReais.total + (financas.overhead - primeiroAnoOverhead);
                        return (
                          <span className={folgaTotal >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(folgaTotal)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        const primeiroAnoOverhead =
                          detalhesAnuais.find(
                            (d) => d.ano === Math.min(...detalhesAnuais.map((d) => d.ano))
                          )?.overhead ?? 0;
                        const folgaTotal =
                          financas.orcamentoSubmetido - financas.custosReais.total + (financas.overhead - primeiroAnoOverhead);
                        const percentagemFolgaTotal = (folgaTotal / financas.orcamentoSubmetido) * 100;
                        return (
                          <span
                            className={
                              percentagemFolgaTotal >= 0 ? "text-green-600" : "text-red-600"
                            }
                          >
                            {formatPercentage(percentagemFolgaTotal)}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary Cards */}
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div
                className={`rounded-lg p-4 ${(() => {
                  const primeiroAnoOverhead =
                    detalhesAnuais.find(
                      (d) => d.ano === Math.min(...detalhesAnuais.map((d) => d.ano))
                    )?.overhead ?? 0;
                  const folgaTotal =
                    financas.orcamentoSubmetido -
                    financas.custosReais.total +
                    (financas.overhead - primeiroAnoOverhead);
                  return folgaTotal >= 0 ? "bg-green-50" : "bg-red-50";
                })()}`}
              >
                <h3 className="text-sm font-medium text-gray-700">Folga Total</h3>
                <p
                  className={`text-2xl font-semibold ${(() => {
                    const primeiroAnoOverhead =
                      detalhesAnuais.find(
                        (d) => d.ano === Math.min(...detalhesAnuais.map((d) => d.ano))
                      )?.overhead ?? 0;
                    const folgaTotal =
                      financas.orcamentoSubmetido -
                      financas.custosReais.total +
                      (financas.overhead - primeiroAnoOverhead);
                    return folgaTotal >= 0 ? "text-green-900" : "text-red-900";
                  })()}`}
                >
                  {(() => {
                    const primeiroAnoOverhead =
                      detalhesAnuais.find(
                        (d) => d.ano === Math.min(...detalhesAnuais.map((d) => d.ano))
                      )?.overhead ?? 0;
                    return formatCurrency(
                      financas.orcamentoSubmetido -
                        financas.custosReais.total +
                        (financas.overhead - primeiroAnoOverhead)
                    );
                  })()}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <h3 className="text-sm font-medium text-blue-800">Média Anual da Folga</h3>
                <p className="text-2xl font-semibold text-blue-900">
                  {formatCurrency(
                    (detalhesAnuais as DetalheAnualMapped[]).reduce(
                      (acc: number, detalhe: DetalheAnualMapped) => {
                        const primeiroAno =
                          Math.min(...detalhesAnuais.map((d) => d.ano)) === detalhe.ano;
                        return (
                          acc +
                          (primeiroAno
                            ? detalhe.orcamento.submetido - detalhe.orcamento.real.total
                            : detalhe.orcamento.submetido -
                              detalhe.orcamento.real.total +
                              detalhe.overhead)
                        );
                      },
                      0
                    ) / detalhesAnuais.length
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-gray-100 p-4">
                <h3 className="text-sm font-medium text-gray-700">% Média da Folga</h3>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatPercentage(
                    (detalhesAnuais as DetalheAnualMapped[]).reduce(
                      (acc: number, detalhe: DetalheAnualMapped) => {
                        const primeiroAno =
                          Math.min(...detalhesAnuais.map((d) => d.ano)) === detalhe.ano;
                        const folga = primeiroAno
                          ? detalhe.orcamento.submetido - detalhe.orcamento.real.total
                          : detalhe.orcamento.submetido -
                            detalhe.orcamento.real.total +
                            detalhe.overhead;
                        return acc + (folga / detalhe.orcamento.submetido) * 100;
                      },
                      0
                    ) / detalhesAnuais.length
                  )}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">Sem dados de folga financeira disponíveis.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 