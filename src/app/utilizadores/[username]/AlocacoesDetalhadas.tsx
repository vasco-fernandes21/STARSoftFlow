"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar, Briefcase } from "lucide-react";
import { formatarDataSegura } from "@/lib/utils";
interface WorkpackageInfo {
  id: string;
  nome: string;
}

interface ProjetoInfo {
  id: string;
  nome: string;
}

interface Alocacao {
  ano: number | string;
  mes: number;
  ocupacao: number;
  workpackage: WorkpackageInfo;
  projeto: ProjetoInfo;
}

interface AlocacaoDetalhe {
  workpackageId: string;
  workpackageNome: string;
  projetoId?: string;
  projetoNome: string;
  ocupacao: number;
}

interface ProjetoAgrupado {
  projetoId: string;
  projetoNome: string;
  ocupacaoTotal: number;
  workpackages: {
    workpackageId: string;
    workpackageNome: string;
    ocupacao: number;
  }[];
}

interface AlocacoesDetalhadasProps {
  alocacoes: Alocacao[];
}

// Função para obter cor subtil baseada na ocupação
const getSubtleColor = (ocupacao: number): string => {
  if (ocupacao > 100) return "from-red-50 to-red-100 text-red-700";
  if (ocupacao >= 80) return "from-green-50 to-green-100 text-green-700";
  if (ocupacao >= 50) return "from-blue-50 to-blue-100 text-blue-700";
  if (ocupacao >= 30) return "from-amber-50 to-amber-100 text-amber-700";
  return "from-slate-50 to-slate-100 text-slate-700";
};

export function AlocacoesDetalhadas({ alocacoes }: AlocacoesDetalhadasProps) {
  const [mesSelecionado, setMesSelecionado] = useState<{ ano: string; mes: number } | null>(null);
  const [anoAtivo, setAnoAtivo] = useState<string | null>(null);

  // Organizar alocações por ano e mês
  const alocacoesPorAnoMes: Record<string, Record<number, number>> = {};
  const detalhesAlocacoes: Record<string, Record<number, AlocacaoDetalhe[]>> = {};

  // Use useMemo para aanos para evitar criar um novo array a cada render
  const anos = useMemo(() => {
    const uniqueAnos: string[] = [];

    alocacoes?.forEach((alocacao) => {
      const anoStr = String(alocacao.ano);
      if (!uniqueAnos.includes(anoStr)) {
        uniqueAnos.push(anoStr);
      }
    });

    return uniqueAnos;
  }, [alocacoes]);

  alocacoes?.forEach((alocacao) => {
    const { ano, mes, ocupacao, workpackage, projeto } = alocacao;
    const anoStr = String(ano);

    // Inicializar estruturas se não existirem
    if (!alocacoesPorAnoMes[anoStr]) {
      alocacoesPorAnoMes[anoStr] = {};
    }

    if (!detalhesAlocacoes[anoStr]) {
      detalhesAlocacoes[anoStr] = {};
    }

    if (!detalhesAlocacoes[anoStr][mes]) {
      detalhesAlocacoes[anoStr][mes] = [];
    }

    // Somar ocupação para o mês/ano
    if (!alocacoesPorAnoMes[anoStr][mes]) {
      alocacoesPorAnoMes[anoStr][mes] = 0;
    }
    alocacoesPorAnoMes[anoStr][mes] += Number(ocupacao) * 100;

    // Adicionar detalhes do workpackage/projeto
    if (workpackage) {
      detalhesAlocacoes[anoStr][mes].push({
        workpackageId: workpackage.id,
        workpackageNome: workpackage.nome,
        projetoId: projeto?.id,
        projetoNome: projeto?.nome || "Projeto não especificado",
        ocupacao: Number(ocupacao) * 100,
      });
    }
  });

  // Definir ano ativo inicial (mais recente)
  useEffect(() => {
    if (anos.length > 0 && !anoAtivo) {
      const anoMaisRecente = anos.sort().reverse()[0];
      setAnoAtivo(anoMaisRecente || null);
    }
  }, [anos, anoAtivo]);

  // Função para selecionar um mês
  const handleMesClick = (ano: string, mes: number) => {
    if (mesSelecionado && mesSelecionado.ano === ano && mesSelecionado.mes === mes) {
      setMesSelecionado(null);
    } else {
      setMesSelecionado({ ano, mes });
    }
  };

  // Agrupar detalhes por projeto para melhor organização
  const agruparDetalhesPorProjeto = (detalhes: AlocacaoDetalhe[]): ProjetoAgrupado[] => {
    const projetosMap = new Map<string, ProjetoAgrupado>();

    detalhes.forEach((detalhe) => {
      const projetoId = detalhe.projetoId || "unknown";

      if (!projetosMap.has(projetoId)) {
        projetosMap.set(projetoId, {
          projetoId,
          projetoNome: detalhe.projetoNome,
          ocupacaoTotal: 0,
          workpackages: [],
        });
      }

      const projeto = projetosMap.get(projetoId);
      if (projeto) {
        projeto.ocupacaoTotal += detalhe.ocupacao;
        projeto.workpackages.push({
          workpackageId: detalhe.workpackageId,
          workpackageNome: detalhe.workpackageNome,
          ocupacao: detalhe.ocupacao,
        });
      }
    });

    return Array.from(projetosMap.values());
  };

  if (Object.keys(alocacoesPorAnoMes).length === 0) {
    return (
      <div className="py-16 text-center">
        <Calendar className="mx-auto h-12 w-12 text-gray-200" />
        <h3 className="mt-4 text-lg font-medium text-gray-800">Sem alocações registadas</h3>
        <p className="mt-2 text-sm text-gray-500">
          Este utilizador não tem alocações definidas no sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Seletor de ano - Design minimalista */}
      {anos.length > 1 && (
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-full bg-gray-50 p-1">
            {anos.sort().map((ano) => (
              <button
                key={ano}
                onClick={() => setAnoAtivo(ano)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  anoAtivo === ano
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                } `}
              >
                {ano}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mostrar apenas o ano ativo */}
      {anoAtivo && alocacoesPorAnoMes[anoAtivo] && (
        <div className="space-y-10">
          {/* Grid de meses com design minimalista */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => {
              const ocupacao = alocacoesPorAnoMes[anoAtivo]?.[mes] || 0;
              const subtleColor = getSubtleColor(ocupacao);
              const isSelected = mesSelecionado?.ano === anoAtivo && mesSelecionado?.mes === mes;

              return (
                <div key={mes}>
                  <button
                    onClick={() => handleMesClick(anoAtivo, mes)}
                    className={`w-full rounded-xl bg-gradient-to-br p-3 transition-all duration-300 ${subtleColor} ${ocupacao === 0 ? "opacity-40" : "opacity-100"} ${isSelected ? "ring-2 ring-blue-400 ring-offset-2" : ""} hover:shadow-md focus:outline-none`}
                  >
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-wider opacity-70">
                        {formatarDataSegura(anoAtivo, mes, "MMM")}
                      </p>
                      <p className="mt-1 text-xl font-light">
                        {ocupacao > 0 ? `${ocupacao.toFixed(0)}%` : "-"}
                      </p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Detalhes do mês selecionado - Design ultra clean */}
          {mesSelecionado &&
            detalhesAlocacoes[mesSelecionado.ano]?.[mesSelecionado.mes] &&
            (detalhesAlocacoes[mesSelecionado.ano]?.[mesSelecionado.mes] || []).length > 0 && (
              <div className="animate-fadeIn mt-8">
                <div className="mb-6 flex items-center justify-between">
                  <h4 className="flex items-center text-lg font-light text-gray-700">
                    <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                      <Calendar className="h-4 w-4 text-blue-500" />
                    </span>
                    {formatarDataSegura(mesSelecionado.ano, mesSelecionado.mes, "MMMM yyyy")}
                    <span className="ml-3 text-sm font-medium text-blue-500">
                      {alocacoesPorAnoMes[mesSelecionado.ano]?.[mesSelecionado.mes]?.toFixed(0) ||
                        "0"}
                      % ocupação
                    </span>
                  </h4>
                </div>

                <div className="space-y-6">
                  {agruparDetalhesPorProjeto(
                    detalhesAlocacoes[mesSelecionado.ano]?.[mesSelecionado.mes] ?? []
                  ).map((projeto, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h5 className="flex items-center font-medium text-gray-800">
                          <Briefcase className="mr-2 h-4 w-4 text-blue-500" />
                          {projeto.projetoNome}
                        </h5>
                        <span className="text-sm font-medium text-blue-600">
                          {projeto.ocupacaoTotal.toFixed(0)}%
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        {projeto.workpackages.map((wp, wpIdx) => (
                          <div key={wpIdx} className="group">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 transition-colors group-hover:text-gray-900">
                                {wp.workpackageNome}
                              </span>
                              <span className="font-medium text-gray-500">
                                {wp.ocupacao.toFixed(0)}%
                              </span>
                            </div>
                            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500 group-hover:from-blue-500 group-hover:to-blue-600"
                                style={{ width: `${(wp.ocupacao / projeto.ocupacaoTotal) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
