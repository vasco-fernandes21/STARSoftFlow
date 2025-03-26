// app/projetos/[projetoId]/financas/page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react"; // Ajusta o caminho para o teu tRPC client
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ProjetoFinancasProps {
  projetoId: string;
}

interface Alocacao {
  alocacaoId: string;
  workpackage: { id: string; nome: string };
  data: Date | string;
  mes: number;
  ano: number;
  horas: number;
  custo: number;
}

interface DetalheUser {
  user: { 
    id: string; 
    name: string; 
    salario: number | null;
  };
  totalAlocacao: number;
  custoTotal: number;
  alocacoes: Alocacao[];
}

interface AlocacaoPorWorkpackage {
  workpackage: {
    id: string;
    nome: string;
  };
  alocacoes: Alocacao[];
  totalHoras: number;
  totalCusto: number;
}

const CORES = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

// Formatação para exibição com localização PT
const formatNumber = (value: number, fractionDigits = 2) => {
  // Usar arredondamento normal
  return value.toLocaleString("pt-PT", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
};

const formatCurrency = (value: number) => {
  // Usar arredondamento normal para 2 casas decimais
  return value.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR"
  });
};

export function ProjetoFinancas({ projetoId }: ProjetoFinancasProps) {
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  
  const { data, isLoading, error } = api.projeto.getFinancas.useQuery({
    projetoId,
    ano: undefined, // Pode adicionar filtros de ano/mês no futuro
    mes: undefined,
  });

  const handleToggleUser = (userId: string) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

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

  // Organiza as alocações por workpackage para cada user
  const alocacoesPorWorkpackage = (alocacoes: Alocacao[]): AlocacaoPorWorkpackage[] => {
    const wpMap = new Map<string, AlocacaoPorWorkpackage>();
    
    // Agrupar as alocações por workpackage
    alocacoes.forEach(alocacao => {
      const wpId = alocacao.workpackage.id;
      
      if (!wpMap.has(wpId)) {
        wpMap.set(wpId, {
          workpackage: alocacao.workpackage,
          alocacoes: [],
          totalHoras: 0,
          totalCusto: 0
        });
      }
      
      const wp = wpMap.get(wpId);
      if (wp) {
        wp.alocacoes.push(alocacao);
        wp.totalHoras += alocacao.horas; // Soma o valor exato
        wp.totalCusto += alocacao.custo; // Soma o valor exato
      }
    });
    
    // Converter o Map para Array e ordenar pelo nome do workpackage
    return Array.from(wpMap.values()).sort((a, b) => 
      a.workpackage.nome.localeCompare(b.workpackage.nome)
    );
  };

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
                  Total Alocação: <span className="font-medium">{formatNumber(resumo.totalAlocacao)}</span>
                </p>
                <p className="mt-4 text-lg font-medium text-gray-900">
                  Total Estimado: {formatCurrency(resumo.orcamento.estimado)}
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
                      formatter={(value) => formatCurrency(value as number)}
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
                  Recursos Humanos: {formatCurrency(resumo.orcamento.real.totalRecursos)}
                </p>
                <p className="text-gray-600">
                  Materiais: {formatCurrency(resumo.orcamento.real.totalMateriais)}
                </p>
                <p className="mt-4 text-lg font-medium text-gray-900">
                  Total Real: {formatCurrency(resumo.orcamento.real.total)}
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
                      formatter={(value) => formatCurrency(value as number)}
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
            <div className="space-y-6">
              {detalhesPorUser.map((item) => (
                <div key={item.user.id} className="border-b pb-4">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => handleToggleUser(item.user.id)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedUsers[item.user.id] ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{item.user.name}</p>
                        <p className="text-sm text-gray-600">Alocação Total: {formatNumber(item.totalAlocacao)}</p>
                      </div>
                    </div>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(item.custoTotal)}
                    </p>
                  </div>
                  
                  {/* Detalhes de alocações expandidos, organizados por workpackage */}
                  {expandedUsers[item.user.id] && (
                    <div className="mt-4 pl-6 space-y-4">
                      {item.alocacoes && item.alocacoes.length > 0 ? (
                        <>
                          {alocacoesPorWorkpackage(item.alocacoes).map((wp) => (
                            <div key={wp.workpackage.id} className="bg-gray-50 rounded-lg overflow-hidden">
                              <div className="bg-gray-100 p-3 border-b flex flex-col md:flex-row md:justify-between space-y-2 md:space-y-0">
                                <h4 className="font-medium text-gray-800">{wp.workpackage.nome}</h4>
                                <div className="flex flex-col md:flex-row md:space-x-4 space-y-1 md:space-y-0">
                                  <span className="text-gray-700">
                                    Total Horas: <span className="font-medium">{formatNumber(wp.totalHoras)}</span>
                                  </span>
                                  <span className="text-gray-700">
                                    Total Custo: <span className="font-medium">
                                      {formatCurrency(wp.totalCusto)}
                                    </span>
                                  </span>
                                </div>
                              </div>
                              <div className="p-3">
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left pb-2 pr-4 text-gray-500 font-medium">Data</th>
                                      <th className="text-left pb-2 pr-4 text-gray-500 font-medium">Horas</th>
                                      <th className="text-left pb-2 text-gray-500 font-medium">Custo</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {wp.alocacoes.sort((a, b) => {
                                      // Ordenar primeiro por ano, depois por mês
                                      if (a.ano !== b.ano) return a.ano - b.ano;
                                      return a.mes - b.mes;
                                    }).map((alocacao) => (
                                      <tr key={alocacao.alocacaoId} className="border-b border-gray-100 hover:bg-gray-100">
                                        <td className="py-2 pr-4 text-gray-600">
                                          {`${alocacao.mes}/${alocacao.ano}`}
                                        </td>
                                        <td className="py-2 pr-4 text-gray-700">{formatNumber(alocacao.horas)}</td>
                                        <td className="py-2 text-gray-700 font-medium">
                                          {formatCurrency(alocacao.custo)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Sem alocações detalhadas</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}