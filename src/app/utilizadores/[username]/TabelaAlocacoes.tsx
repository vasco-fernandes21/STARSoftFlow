"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SelectField } from "@/components/projetos/criar/components/FormFields";

// Interface para representar a resposta da API
interface ApiWorkpackage {
  id: string;
  nome: string;
  descricao: string | null;
  inicio: string;
  fim: string;
  estado: boolean;
  alocacoes: {
    mes: number;
    ano: number;
    ocupacao: string; // Note que vem como string da API
  }[];
}

interface ApiProjeto {
  id: string;
  nome: string;
  descricao: string;
  inicio: string;
  fim: string;
  workpackages: ApiWorkpackage[];
}

interface ApiResponse {
  result: {
    data: {
      json: ApiProjeto[];
    };
  };
}

// Interfaces para o componente
interface AlocacaoOriginal {
  ano: number;
  mes: number;
  ocupacao: number;
  workpackage: {
    id: string;
    nome: string;
  };
  projeto: {
    id: string;
    nome: string;
  };
}

interface TabelaAlocacoesProps {
  alocacoes: AlocacaoOriginal[] | ApiResponse[] | ApiProjeto[];
  ano?: number;
  onSave?: (
    alocacoes: { workpackageId: string; mes: number; ano: number; ocupacao: number }[]
  ) => Promise<void>;
}

interface WorkpackageProcessado {
  id: string;
  nome: string;
  mes: number;
  ano: number;
  ocupacao: number;
}

interface ProjetoProcessado {
  projetoNome: string;
  projetoId: string;
  workpackages: Map<string, WorkpackageProcessado>;
  totalProposto: number;
}

// Verificador de tipo para ApiResponse
function isApiResponse(obj: any): obj is ApiResponse[] {
  return (
    Array.isArray(obj) &&
    obj.length > 0 &&
    obj[0] !== undefined &&
    obj[0] !== null &&
    typeof obj[0] === "object" &&
    "result" in obj[0] &&
    obj[0].result !== undefined &&
    obj[0].result !== null &&
    typeof obj[0].result === "object" &&
    "data" in obj[0].result &&
    obj[0].result.data !== undefined &&
    obj[0].result.data !== null &&
    typeof obj[0].result.data === "object" &&
    "json" in obj[0].result.data
  );
}

// Verificador de tipo para ApiProjeto
function isApiProjeto(obj: any): obj is ApiProjeto[] {
  return (
    Array.isArray(obj) &&
    obj.length > 0 &&
    obj[0] !== undefined &&
    obj[0] !== null &&
    typeof obj[0] === "object" &&
    "workpackages" in obj[0]
  );
}

export function TabelaAlocacoes({ alocacoes, ano }: TabelaAlocacoesProps) {
  const [mesSelecionado, setMesSelecionado] = React.useState<number | null>(null);
  const [alocacoesEditadas, setAlocacoesEditadas] = React.useState<Map<string, number>>(new Map());
  const [valoresEmEdicao, setValoresEmEdicao] = React.useState<Map<string, string>>(new Map());
  const [camposComErro, setCamposComErro] = React.useState<Set<string>>(new Set());

  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const mesesAbreviados = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  // Normaliza as alocações para o formato interno
  const alocacoesNormalizadas = React.useMemo(() => {
    // Verifica se é uma resposta completa da API
    if (isApiResponse(alocacoes)) {
      const apiResponse = alocacoes as ApiResponse[];

      if (!apiResponse || !apiResponse[0] || !apiResponse[0].result?.data?.json) {
        return [];
      }

      const projetos = apiResponse[0].result.data.json;

      // Converte para o formato usado pelo componente
      return projetos.flatMap((projeto) =>
        projeto.workpackages.flatMap((wp) =>
          wp.alocacoes.map((alocacao) => ({
            ano: alocacao.ano,
            mes: alocacao.mes,
            ocupacao: parseFloat(alocacao.ocupacao),
            workpackage: {
              id: wp.id,
              nome: wp.nome,
            },
            projeto: {
              id: projeto.id,
              nome: projeto.nome,
            },
          }))
        )
      );
    }
    // Verifica se é um array de projetos da API
    else if (isApiProjeto(alocacoes)) {
      const projetos = alocacoes as ApiProjeto[];

      // Converte para o formato usado pelo componente
      return projetos.flatMap((projeto) =>
        projeto.workpackages.flatMap((wp) =>
          wp.alocacoes.map((alocacao) => ({
            ano: alocacao.ano,
            mes: alocacao.mes,
            ocupacao: parseFloat(alocacao.ocupacao),
            workpackage: {
              id: wp.id,
              nome: wp.nome,
            },
            projeto: {
              id: projeto.id,
              nome: projeto.nome,
            },
          }))
        )
      );
    }

    // Já está no formato correto
    return alocacoes as AlocacaoOriginal[];
  }, [alocacoes]);

  const anos = React.useMemo(() => {
    const anosUnicos = [...new Set(alocacoesNormalizadas.map((a) => a.ano))];
    return anosUnicos.length > 0 ? anosUnicos.sort((a, b) => a - b) : [new Date().getFullYear()];
  }, [alocacoesNormalizadas]);

  // Determinar o ano mais recente das alocações
  const anoMaisRecente = React.useMemo(() => {
    return anos.length > 0 ? Math.max(...anos) : new Date().getFullYear();
  }, [anos]);

  // Inicializar com o ano mais recente ou o ano fornecido nas props
  const [anoSelecionado, setAnoSelecionado] = React.useState(ano || anoMaisRecente);

  const projetosAgrupados = React.useMemo(() => {
    // Criamos uma estrutura para evitar duplicações
    const grupos: Record<string, ProjetoProcessado> = {};

    // Primeiro passo: agrupa por projetos
    alocacoesNormalizadas.forEach((alocacao) => {
      const projetoId = alocacao.projeto.id;
      if (!grupos[projetoId]) {
        grupos[projetoId] = {
          projetoNome: alocacao.projeto.nome,
          projetoId: alocacao.projeto.id,
          workpackages: new Map(),
          totalProposto: 0,
        };
      }

      const wpId = alocacao.workpackage.id;

      // Só adicionamos o workpackage se ainda não existir
      if (!grupos[projetoId].workpackages.has(wpId)) {
        grupos[projetoId].workpackages.set(wpId, {
          id: wpId,
          nome: alocacao.workpackage.nome,
          mes: alocacao.mes,
          ano: alocacao.ano,
          ocupacao: alocacao.ocupacao,
        });
      }

      // Verificar se alocacao.ocupacao existe antes de adicionar
      if (typeof alocacao.ocupacao === "number") {
        grupos[projetoId].totalProposto += alocacao.ocupacao;
      }
    });

    return grupos;
  }, [alocacoesNormalizadas]);

  const getAlocacao = (wpId: string, mes: number, ano: number): number => {
    const key = `${wpId}-${mes}-${ano}`;
    if (alocacoesEditadas.has(key)) return alocacoesEditadas.get(key) || 0;
    const alocacao = alocacoesNormalizadas.find(
      (a) => a.workpackage.id === wpId && a.mes === mes && a.ano === ano
    );
    return alocacao?.ocupacao || 0;
  };

  const calcularTotalMes = (mes: number, ano: number): number => {
    return Object.values(projetosAgrupados).reduce((total, projeto) => {
      let projetoTotal = 0;
      projeto.workpackages.forEach((wp) => {
        if (wp.ano === ano && wp.mes === mes) {
          projetoTotal += getAlocacao(wp.id, mes, ano);
        }
      });
      return total + projetoTotal;
    }, 0);
  };

  const calcularTotalWP = (wpId: string): number => {
    return getMesesVisiveis().reduce(
      (total, mes) => total + getAlocacao(wpId, mes, anoSelecionado),
      0
    );
  };

  const handleAlocacaoChange = (wpId: string, mes: number, ano: number, valor: string) => {
    let numeroValor = parseFloat(valor.replace(",", "."));
    const key = `${wpId}-${mes}-${ano}`;

    if (isNaN(numeroValor) || numeroValor < 0 || numeroValor > 1) {
      setCamposComErro((prev) => new Set(prev).add(key));
      return;
    }

    setCamposComErro((prev) => {
      const nova = new Set(prev);
      nova.delete(key);
      return nova;
    });

    numeroValor = Math.round(numeroValor * 100) / 100;
    setAlocacoesEditadas((prev) => new Map(prev).set(key, numeroValor));
  };

  const handleInputChange = (wpId: string, mes: number, ano: number, valor: string) => {
    const key = `${wpId}-${mes}-${ano}`;
    if (valor === "" || /^[0-9]*[,]?[0-9]*$/.test(valor)) {
      setValoresEmEdicao((prev) => new Map(prev).set(key, valor));
    }
  };

  const handleInputBlur = (wpId: string, mes: number, ano: number) => {
    const key = `${wpId}-${mes}-${ano}`;
    const valorEditado = valoresEmEdicao.get(key) || "0";
    handleAlocacaoChange(wpId, mes, ano, valorEditado);
    setValoresEmEdicao((prev) => {
      const nova = new Map(prev);
      nova.delete(key);
      return nova;
    });
  };

  const getMesesVisiveis = () => {
    return mesSelecionado === null
      ? Array.from({ length: 12 }, (_, i) => i + 1)
      : [mesSelecionado + 1];
  };

  const calcularTotalWPsPorProjeto = (projeto: ProjetoProcessado): number => {
    let total = 0;
    projeto.workpackages.forEach((wp) => {
      total += calcularTotalWP(wp.id);
    });
    return total;
  };

  const calcularTotalGeral = (): number => {
    return Object.values(projetosAgrupados).reduce((total, projeto) => {
      return total + calcularTotalWPsPorProjeto(projeto);
    }, 0);
  };

  const anosOptions = anos.map((ano) => ({ value: ano.toString(), label: ano.toString() }));
  const mesesOptions = [
    { value: "todos", label: "Todos os meses" },
    ...meses.map((mes, index) => ({ value: index.toString(), label: mes })),
  ];

  return (
    <div className="space-y-6 bg-white p-6">
      {/* Filtros */}
      <div className="flex flex-col items-start justify-between rounded-lg border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <SelectField
            label="Ano"
            value={anoSelecionado.toString()}
            onChange={(value) => setAnoSelecionado(Number(value))}
            options={anosOptions}
            className="w-[120px] rounded-md border-gray-200 shadow-sm focus:ring-2 focus:ring-[#2C5697]"
          />
          <SelectField
            label="Mês"
            value={mesSelecionado !== null ? mesSelecionado.toString() : "todos"}
            onChange={(value) => setMesSelecionado(value === "todos" ? null : Number(value))}
            options={mesesOptions}
            className="w-[180px] rounded-md border-gray-200 shadow-sm focus:ring-2 focus:ring-[#2C5697]"
          />
        </div>
        {mesSelecionado !== null && (
          <Badge className="mt-2 rounded-md bg-[#2C5697] px-3 py-1 text-white shadow-sm sm:mt-0">
            <Calendar className="mr-2 h-4 w-4" />
            {meses[mesSelecionado]} {anoSelecionado}
          </Badge>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-lg border border-gray-100 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-100 bg-gray-50">
                <TableHead className="sticky left-0 z-10 w-[300px] bg-gray-50 py-3 font-semibold text-gray-700">
                  Projeto / Workpackage
                </TableHead>
                {getMesesVisiveis().map((mes) => (
                  <TableHead
                    key={mes}
                    className="w-[90px] py-3 text-center text-sm font-semibold text-gray-600"
                  >
                    {mesesAbreviados[mes - 1]}
                  </TableHead>
                ))}
                <TableHead className="w-[100px] py-3 text-center font-semibold text-[#2C5697]">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(projetosAgrupados).map((projeto) => (
                <React.Fragment key={projeto.projetoId}>
                  <TableRow className="border-b border-gray-100 bg-gray-50">
                    <TableCell
                      colSpan={getMesesVisiveis().length + 2}
                      className="sticky left-0 bg-gray-50 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{projeto.projetoNome}</span>
                        <Badge className="bg-gray-200 text-xs text-gray-600">
                          {projeto.workpackages.size} WPs
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                  {Array.from(projeto.workpackages.values()).map((wp) => {
                    const totalAlocado = calcularTotalWP(wp.id);
                    return (
                      <TableRow
                        key={wp.id}
                        className="transition-colors duration-150 hover:bg-gray-50"
                      >
                        <TableCell className="sticky left-0 z-10 bg-white py-2 pl-6 group-hover:bg-white">
                          <span className="text-gray-600">{wp.nome}</span>
                        </TableCell>
                        {getMesesVisiveis().map((mes) => {
                          const alocacao = getAlocacao(wp.id, mes, anoSelecionado);
                          const key = `${wp.id}-${mes}-${anoSelecionado}`;
                          const valorEmEdicao = valoresEmEdicao.get(key);
                          return (
                            <TableCell key={mes} className="py-2 text-center">
                              <Input
                                type="text"
                                value={
                                  valorEmEdicao !== undefined
                                    ? valorEmEdicao
                                    : alocacao.toFixed(2).replace(".", ",")
                                }
                                onChange={(e) =>
                                  handleInputChange(wp.id, mes, anoSelecionado, e.target.value)
                                }
                                onBlur={() => handleInputBlur(wp.id, mes, anoSelecionado)}
                                className={cn(
                                  "mx-auto h-8 w-16 rounded-md border text-center text-sm shadow-sm",
                                  camposComErro.has(key)
                                    ? "border-red-300 text-red-600 focus:ring-red-500"
                                    : alocacao > 0
                                      ? "border-[#2C5697] text-[#2C5697] focus:ring-[#2C5697]"
                                      : "border-gray-200 text-gray-500 focus:ring-[#2C5697]"
                                )}
                                placeholder="0,00"
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell className="py-2 text-center font-semibold text-[#2C5697]">
                          {totalAlocado.toFixed(2).replace(".", ",")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="border-t border-gray-100 bg-gray-50">
                <TableCell className="sticky left-0 z-10 bg-gray-50 py-3 font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-[#2C5697]" />
                    Total Alocado
                  </div>
                </TableCell>
                {getMesesVisiveis().map((mes) => (
                  <TableCell key={mes} className="py-3 text-center font-semibold text-[#2C5697]">
                    {calcularTotalMes(mes, anoSelecionado).toFixed(2).replace(".", ",")}
                  </TableCell>
                ))}
                <TableCell className="py-3 text-center font-semibold text-[#2C5697]">
                  {calcularTotalGeral().toFixed(2).replace(".", ",")}
                </TableCell>
              </TableRow>
              <TableRow className="bg-[#2C5697] text-white">
                <TableCell className="sticky left-0 z-10 bg-[#2C5697] py-3 font-semibold">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Total Proposto
                  </div>
                </TableCell>
                {getMesesVisiveis().map((mes) => {
                  const totalProposto = Object.values(projetosAgrupados).reduce(
                    (total, projeto) => {
                      let mesTotal = 0;
                      projeto.workpackages.forEach((wp) => {
                        if (wp.ano === anoSelecionado && wp.mes === mes) {
                          mesTotal += wp.ocupacao;
                        }
                      });
                      return total + mesTotal;
                    },
                    0
                  );
                  return (
                    <TableCell key={mes} className="py-3 text-center font-semibold">
                      {totalProposto.toFixed(2).replace(".", ",")}
                    </TableCell>
                  );
                })}
                <TableCell className="py-3 text-center font-semibold">
                  {Object.values(projetosAgrupados)
                    .reduce((total, projeto) => total + projeto.totalProposto, 0)
                    .toFixed(2)
                    .replace(".", ",")}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>

      {/* Estado vazio */}
      {Object.keys(projetosAgrupados).length === 0 && (
        <div className="rounded-lg border border-gray-100 bg-white py-12 text-center shadow-sm">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-700">Sem alocações</h3>
          <p className="text-gray-500">Nenhuma alocação registrada para exibir.</p>
        </div>
      )}
    </div>
  );
}
