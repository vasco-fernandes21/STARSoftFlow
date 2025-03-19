// app/projetos/[projetoId]/financas/page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react"; // Ajusta o caminho para o teu tRPC client
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ProjetoFinancasProps {
  projetoId: string;
}

const CORES = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export function ProjetoFinancas({ projetoId }: ProjetoFinancasProps) {
  const { data, isLoading, error } = api.projeto.getFinancas.useQuery({
    projetoId,
    ano: undefined, // Pode adicionar filtros de ano/mês no futuro
    mes: undefined,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[500px] w-full rounded-2xl" />
        <Skeleton className="h-[500px] w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Erro: {error.message}</div>;
  }

  if (!data) return null;

  const { resumo, detalhesPorUser } = data;

  // Dados para o orçamento estimado
  const dadosOrcamentoEstimado = [
    { nome: "Orçamento Estimado", valor: resumo.orcamento.estimado },
  ];

  // Dados para o orçamento real
  const dadosOrcamentoReal = [
    { nome: "Recursos Humanos", valor: resumo.orcamento.real.totalRecursos },
    { nome: "Materiais", valor: resumo.orcamento.real.totalMateriais },
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Finanças do Projeto</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Orçamento Estimado */}
        <Card className="glass-card rounded-2xl border border-gray-200 shadow-lg">
          <CardHeader className="border-b border-gray-100 bg-gray-50/70 px-6 py-4 backdrop-blur-sm">
            <CardTitle className="text-lg font-semibold text-gray-900">Orçamento Estimado</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="text-sm space-y-2">
                <p className="text-gray-600">
                  Total Alocação: <span className="font-medium">{resumo.totalAlocacao.toFixed(2)}</span>
                </p>
                <p className="mt-4 text-lg font-medium text-gray-900">
                  Total Estimado:{" "}
                  {resumo.orcamento.estimado.toLocaleString("pt-PT", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </p>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosOrcamentoEstimado}
                      dataKey="valor"
                      nameKey="nome"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {dadosOrcamentoEstimado.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) =>
                        (value as number).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })
                      }
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orçamento Real */}
        <Card className="glass-card rounded-2xl border border-gray-200 shadow-lg">
          <CardHeader className="border-b border-gray-100 bg-gray-50/70 px-6 py-4 backdrop-blur-sm">
            <CardTitle className="text-lg font-semibold text-gray-900">Orçamento Real</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="text-sm space-y-2">
                <p className="text-gray-600">
                  Recursos Humanos:{" "}
                  {resumo.orcamento.real.totalRecursos.toLocaleString("pt-PT", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </p>
                <p className="text-gray-600">
                  Materiais:{" "}
                  {resumo.orcamento.real.totalMateriais.toLocaleString("pt-PT", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </p>
                <p className="mt-4 text-lg font-medium text-gray-900">
                  Total Real:{" "}
                  {resumo.orcamento.real.total.toLocaleString("pt-PT", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </p>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosOrcamentoReal}
                      dataKey="valor"
                      nameKey="nome"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {dadosOrcamentoReal.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) =>
                        (value as number).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })
                      }
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes por Utilizador (Opcional) */}
      {detalhesPorUser.length > 0 && (
        <Card className="mt-6 glass-card rounded-2xl border border-gray-200 shadow-lg">
          <CardHeader className="border-b border-gray-100 bg-gray-50/70 px-6 py-4 backdrop-blur-sm">
            <CardTitle className="text-lg font-semibold text-gray-900">Detalhes por Utilizador</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {detalhesPorUser.map((item) => (
                <div key={item.user.id} className="flex items-center justify-between border-b py-2">
                  <div>
                    <p className="font-medium text-gray-900">{item.user.name}</p>
                    <p className="text-sm text-gray-600">Alocação: {item.totalAlocacao.toFixed(2)}</p>
                  </div>
                  <p className="font-medium text-gray-900">
                    {item.custoTotal.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}