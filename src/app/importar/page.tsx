"use client";

import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useProjetoForm,
  ProjetoFormProvider,
} from "@/components/projetos/criar/ProjetoFormContext";
import * as XLSX from "xlsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { User, Calendar, Percent, Users, Package, Briefcase, DollarSign } from "lucide-react";
import { Decimal } from "decimal.js";
import type { Rubrica } from "@prisma/client";
import { toast } from "sonner";

// Interfaces baseadas nos tipos do Prisma
interface Alocacao {
  mes: number;
  ano: number;
  percentagem: number;
}

interface Recurso {
  nome: string;
  alocacoes: Alocacao[];
}

// Modificar o tipo para usar number em vez de Decimal durante a importação
type MaterialImportacao = {
  id: number;
  nome: string;
  descricao?: string | null;
  estado?: boolean;
  workpackageId: string | null;
  preco: number;
  quantidade: number;
  rubrica: Rubrica;
  ano_utilizacao: number;
  workpackageNome: string;
};

interface WorkpackageSimples {
  codigo: string;
  nome: string;
  recursos: Recurso[];
  materiais: MaterialImportacao[];
  dataInicio: Date | null;
  dataFim: Date | null;
  id?: string;
}

function mapearRubrica(rubricaExcel: string): Rubrica {
  const mapeamento: Record<string, Rubrica> = {
    Materiais: "MATERIAIS",
    "Serviços Terceiros": "SERVICOS_TERCEIROS",
    "Outros Serviços": "OUTROS_SERVICOS",
    "Deslocações e Estadas": "DESLOCACAO_ESTADIAS",
    "Outros Custos": "OUTROS_CUSTOS",
    "Custos Estrutura": "CUSTOS_ESTRUTURA",
  };

  return mapeamento[rubricaExcel] || "MATERIAIS";
}

function getBadgeColors(percentagem: number) {
  if (percentagem >= 80) {
    return "bg-green-50 text-green-600 border-green-200";
  } else if (percentagem >= 50) {
    return "bg-blue-50 text-blue-600 border-blue-200";
  } else if (percentagem >= 30) {
    return "bg-amber-50 text-amber-600 border-amber-200";
  }
  return "bg-gray-50 text-gray-600 border-gray-200";
}

function getRubricaColors(rubrica: Rubrica): string {
  switch (rubrica) {
    case "MATERIAIS":
      return "bg-blue-50 text-blue-600 border-blue-200";
    case "SERVICOS_TERCEIROS":
      return "bg-green-50 text-green-600 border-green-200";
    case "OUTROS_SERVICOS":
      return "bg-purple-50 text-purple-600 border-purple-200";
    case "DESLOCACAO_ESTADIAS":
      return "bg-amber-50 text-amber-600 border-amber-200";
    case "OUTROS_CUSTOS":
      return "bg-red-50 text-red-600 border-red-200";
    case "CUSTOS_ESTRUTURA":
      return "bg-slate-50 text-slate-600 border-slate-200";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

function ImportarExcelContent() {
  const { state, dispatch } = useProjetoForm();
  const [sheets, setSheets] = useState<{ [key: string]: any[][] }>({});
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [workpackages, setWorkpackages] = useState<WorkpackageSimples[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const extrairMateriais = (data: any[][]): MaterialImportacao[] => {
    const materiais: MaterialImportacao[] = [];

    for (let i = 6; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || !row[0]) continue;

      const despesa = row[0];
      const atividade = row[1];
      const ano = row[3];
      const rubrica = row[4];
      const custoUnitario = row[5];
      const unidades = row[6];

      if (!despesa || !atividade || !custoUnitario || !unidades) continue;

      if (typeof custoUnitario === "number" && typeof unidades === "number") {
        materiais.push({
          id: Math.floor(Math.random() * 1000000), // Adicionar id que é obrigatório
          nome: despesa,
          descricao: null,
          estado: false,
          preco: custoUnitario, // Agora é number, não Decimal
          quantidade: unidades,
          ano_utilizacao: typeof ano === "number" ? ano : new Date().getFullYear(),
          rubrica: mapearRubrica(rubrica),
          workpackageId: null, // Adicionar workpackageId que é obrigatório
          workpackageNome: atividade,
        });
      }
    }

    return materiais;
  };

  const extrairDadosRH = (data: any[][]): { workpackages: WorkpackageSimples[] } => {
    const wps: WorkpackageSimples[] = [];
    let wpAtual: WorkpackageSimples | undefined = undefined;

    const meses = data[4]?.slice(6) || [];

    const excelDateToJS = (excelDate: number) => {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return {
        mes: date.getMonth() + 1,
        ano: date.getFullYear(),
      };
    };

    for (let i = 7; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      if (row[1]?.match(/^A\d+$/)) {
        console.log("Encontrado workpackage:", row[1], row[2]);
        wpAtual = {
          codigo: row[1],
          nome: row[2] || "",
          recursos: [],
          materiais: [],
          dataInicio: null,
          dataFim: null,
        };
        wps.push(wpAtual);
      } else if (!row[1] && row[2]?.startsWith("A1 -") && !wpAtual) {
        console.log("Encontrado workpackage A1 implícito");
        wpAtual = {
          codigo: "A1",
          nome: row[2],
          recursos: [],
          materiais: [],
          dataInicio: null,
          dataFim: null,
        };
        wps.push(wpAtual);
      } else if (wpAtual && row[3]) {
        console.log("Processando recurso:", row[3]);
        const recurso: Recurso = {
          nome: row[3],
          alocacoes: [],
        };

        let dataInicio: Date | null = null;
        let dataFim: Date | null = null;

        for (let j = 6; j < 42; j++) {
          const valor = row[j];
          if (valor && typeof valor === "number" && !isNaN(valor) && valor > 0 && valor < 2) {
            const dataExcel = meses[j - 6];
            if (dataExcel && typeof dataExcel === "number") {
              const { mes, ano } = excelDateToJS(dataExcel);

              if (!dataInicio) {
                dataInicio = new Date(ano, mes - 1, 1); // Primeiro dia do mês
              }

              recurso.alocacoes.push({
                mes,
                ano,
                percentagem: valor * 100,
              });
            }
          }
        }

        if (dataInicio && row[5]) {
          const duracao = row[5] - 1; // PLAN DURATION - 1
          dataFim = new Date(dataInicio);
          dataFim.setMonth(dataInicio.getMonth() + duracao);
          dataFim.setDate(new Date(dataFim.getFullYear(), dataFim.getMonth() + 1, 0).getDate()); // Último dia do mês
        }

        if (recurso.alocacoes.length > 0) {
          wpAtual.recursos.push(recurso);
          wpAtual.dataInicio = dataInicio;
          wpAtual.dataFim = dataFim;
          console.log(
            `Data de Início: ${dataInicio?.toLocaleDateString("pt-PT")}, Data de Fim: ${dataFim?.toLocaleDateString("pt-PT")}`
          );
        }
      }
    }

    return { workpackages: wps };
  };

  const atribuirMateriaisAosWorkpackages = (
    workpackages: WorkpackageSimples[],
    materiais: MaterialImportacao[]
  ): WorkpackageSimples[] => {
    const wpMap = new Map<string, WorkpackageSimples>();
    workpackages.forEach((wp) => {
      wpMap.set(wp.nome, wp);

      const wpCodigo = wp.nome.split(" - ")[0]?.trim();
      if (wpCodigo) {
        wpMap.set(wpCodigo, wp);
      }
    });

    materiais.forEach((material) => {
      let wpMatch = wpMap.get(material.workpackageNome);

      if (!wpMatch && material.workpackageNome) {
        const codigoMatch = material.workpackageNome.match(/^A\d+/);
        if (codigoMatch) {
          wpMatch = workpackages.find((wp) => wp.codigo === codigoMatch[0]) || undefined;
        }
      }

      if (wpMatch) {
        // Inicializar o array se não existir
        wpMatch.materiais = wpMatch.materiais || [];
        wpMatch.materiais.push(material);
      } else if (workpackages.length > 0) {
        // verificar se existe workpackage antes de aceder
        if (workpackages[0]) {
          // inicializar array de materiais se não existir
          workpackages[0].materiais = workpackages[0].materiais || [];
          workpackages[0].materiais.push(material);
        }
      }
    });

    return workpackages;
  };

  // Nova função para extrair nome do projeto
  const extrairDadosProjeto = (dados: any[][]): { nomeProjeto: string } => {
    let nomeProjeto = "";
    for (const linha of dados) {
      if (linha.length >= 2 && linha[0] === "Nome do projeto ") {
        nomeProjeto = linha[1];
        break;
      }
    }
    return { nomeProjeto };
  };

  // Nova função para extrair financiamento
  const extrairDadosFinanciamento = (
    dadosBudget: any[][]
  ): {
    tipoFinanciamento: string;
    taxaFinanciamento: number | null;
    overhead: number | null;
  } => {
    let tipoFinanciamento = "";
    let taxaFinanciamento: number | null = null;
    let overhead: number | null = null;

    for (const linha of dadosBudget) {
      if (linha && linha.length >= 8) {
        if (linha[6] === "Tipo de projeto " && linha[7]) {
          tipoFinanciamento = linha[7];
        } else if (linha[6] === "Taxa de financiamento" && typeof linha[7] === "number") {
          taxaFinanciamento = linha[7] * 100; // Converter para percentagem
        } else if (linha[6] === "Custos indiretos" && typeof linha[7] === "number") {
          overhead = linha[7] * 100; // Converter para percentagem
        }
      }
    }

    return { tipoFinanciamento, taxaFinanciamento, overhead };
  };

  // Nova função para extrair valor ETI
  const extrairValorEti = (dadosRH: any[][]): number | null => {
    for (let i = 0; i < dadosRH.length; i++) {
      const row = dadosRH[i];
      if (row && row.length >= 6) {
        // Verificar se temos um nome na coluna 5 (índice 4) e um valor na coluna 6 (índice 5)
        if (row[4] && typeof row[4] === "string" && row[5] && typeof row[5] === "number") {
          return row[5]; // Valor ETI logo após o nome
        }
      }
    }
    return null;
  };

  // Estado para os dados de projeto e financiamento
  const [dadosProjeto, setDadosProjeto] = useState<{
    nomeProjeto: string;
    tipoFinanciamento: string;
    taxaFinanciamento: number | null;
    overhead: number | null;
    valorEti: number | null;
  }>({
    nomeProjeto: "",
    tipoFinanciamento: "",
    taxaFinanciamento: null,
    overhead: null,
    valorEti: null,
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Iniciando upload do ficheiro");
    const file = e.target.files?.[0];
    if (!file) {
      console.log("Nenhum ficheiro selecionado");
      return;
    }

    console.log("Ficheiro selecionado:", file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        console.log("Ficheiro carregado, iniciando processamento");
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        console.log("Sheets encontradas:", workbook.SheetNames);

        const sheetsData: { [key: string]: any[][] } = {};
        const names = workbook.SheetNames;

        names.forEach((name) => {
          console.log(`Processando sheet: ${name}`);
          const sheet = workbook.Sheets[name];
          if (sheet) {
            sheetsData[name] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          }
        });

        // Extrair dados adicionais
        let nomeProjeto = "";
        let tipoFinanciamento = "";
        let taxaFinanciamento: number | null = null;
        let overhead: number | null = null;
        let valorEti: number | null = null;

        if (sheetsData["HOME"]) {
          const dados = extrairDadosProjeto(sheetsData["HOME"]);
          nomeProjeto = dados.nomeProjeto;
          console.log("Nome do projeto:", nomeProjeto);
        }

        if (sheetsData["BUDGET"]) {
          const dados = extrairDadosFinanciamento(sheetsData["BUDGET"]);
          tipoFinanciamento = dados.tipoFinanciamento;
          taxaFinanciamento = dados.taxaFinanciamento;
          overhead = dados.overhead;
          console.log("Financiamento:", tipoFinanciamento, taxaFinanciamento, overhead);
        }

        if (sheetsData["RH_Budget_SUBM"]) {
          valorEti = extrairValorEti(sheetsData["RH_Budget_SUBM"]);
          console.log("Valor ETI:", valorEti);
        }

        // Guardar os dados extraídos
        setDadosProjeto({
          nomeProjeto,
          tipoFinanciamento,
          taxaFinanciamento,
          overhead,
          valorEti,
        });

        // Continuar com o processamento existente
        let wps: WorkpackageSimples[] = [];
        let materiais: MaterialImportacao[] = [];

        if (sheetsData["RH_Budget_SUBM"]) {
          const { workpackages: wpsFromRH } = extrairDadosRH(sheetsData["RH_Budget_SUBM"]);
          wps = wpsFromRH;
        }

        if (sheetsData["Outros_Budget"]) {
          materiais = extrairMateriais(sheetsData["Outros_Budget"]);
        }

        if (wps.length > 0 && materiais.length > 0) {
          wps = atribuirMateriaisAosWorkpackages(wps, materiais);
        }

        console.log("Workpackages extraídos:", wps);
        setWorkpackages(wps);
        setSheets(sheetsData);
        setSheetNames(names);

        // Atualizar o nome do projeto no estado global
        if (nomeProjeto) {
          dispatch({
            type: "UPDATE_PROJETO",
            data: { nome: nomeProjeto },
          });
        }
      } catch (error) {
        console.error("Erro detalhado ao processar o ficheiro Excel:", error);
        alert("Ocorreu um erro ao processar o ficheiro Excel. Verifique o formato do ficheiro.");
      }
    };

    reader.onerror = (error) => {
      console.error("Erro ao ler o ficheiro:", error);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImportarProjeto = () => {
    dispatch({ type: "RESET" });

    workpackages.forEach((wp) => {
      const wpId = crypto.randomUUID();

      dispatch({
        type: "ADD_WORKPACKAGE",
        workpackage: {
          id: wpId,
          nome: wp.nome,
          descricao: null,
          inicio: wp.dataInicio,
          fim: wp.dataFim,
          estado: false,
          tarefas: [],
          materiais: [],
          recursos: [],
        },
      });

      // Agrupar alocações por utilizador
      const alocacoesPorUser = wp.recursos.reduce(
        (acc, recurso) => {
          // Aqui vais precisar de mapear o nome do recurso para o userId correto
          const userId = "1"; // Substitui isto pela lógica de mapeamento correta

          if (!acc[userId]) {
            acc[userId] = [];
          }

          // Adicionar todas as alocações deste recurso
          acc[userId].push(
            ...recurso.alocacoes.map((alocacao) => ({
              userId,
              mes: alocacao.mes,
              ano: alocacao.ano,
              ocupacao: new Decimal(alocacao.percentagem / 100),
              workpackageId: wpId,
            }))
          );

          return acc;
        },
        {} as Record<string, any[]>
      );

      // Adicionar todas as alocações para cada utilizador
      Object.values(alocacoesPorUser).forEach((alocacoes) => {
        alocacoes.forEach((alocacao) => {
          dispatch({
            type: "ADD_ALOCACAO",
            workpackageId: wpId,
            alocacao,
          });
        });
      });

      wp.materiais.forEach((material) => {
        dispatch({
          type: "ADD_MATERIAL",
          workpackageId: wpId,
          material: {
            id: Math.floor(Math.random() * 1000000),
            nome: material.nome,
            descricao: null,
            estado: false,
            preco: new Decimal(material.preco),
            quantidade: material.quantidade,
            ano_utilizacao: material.ano_utilizacao,
            rubrica: material.rubrica,
          },
        });
      });
    });

    toast.success("Dados importados com sucesso para o formulário do projeto");
  };

  const alocacoesFormatadas = useMemo(() => {
    return workpackages.map((wp) => {
      const recursos = wp.recursos.map((recurso) => {
        const mesesPorAno: Record<number, Array<{ mes: number; percentagem: number }>> = {};

        recurso.alocacoes.forEach(({ mes, ano, percentagem }) => {
          if (!mesesPorAno[ano]) {
            mesesPorAno[ano] = [];
          }
          mesesPorAno[ano].push({ mes, percentagem });
        });

        Object.keys(mesesPorAno).forEach((ano) => {
          // garantir que o array existe antes de ordenar
          const mesesDoAno = mesesPorAno[Number(ano)];
          if (mesesDoAno) {
            mesesDoAno.sort((a, b) => a.mes - b.mes);
          }
        });
        return {
          ...recurso,
          mesesPorAno,
          totalAlocacoes: recurso.alocacoes.length,
        };
      });

      return {
        ...wp,
        recursos,
      };
    });
  }, [workpackages]);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Importar Dados do Excel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-azul/30 p-6">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
                ref={fileInputRef}
              />
              <Button className="bg-azul hover:bg-azul/90" onClick={handleButtonClick}>
                Selecionar Ficheiro Excel
              </Button>
              <p className="mt-2 text-sm text-azul/60">
                Selecione um ficheiro Excel com o formato correto
              </p>
            </div>

            {/* Exibir dados extraídos do projeto */}
            {dadosProjeto.nomeProjeto && (
              <Card className="bg-azul/5 p-4">
                <h3 className="mb-2 text-lg font-medium text-azul">Dados do Projeto</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Briefcase className="mr-2 h-4 w-4 text-azul" />
                    <span className="font-medium">Nome:</span>
                    <span className="ml-2">{dadosProjeto.nomeProjeto}</span>
                  </div>
                  {dadosProjeto.tipoFinanciamento && (
                    <div className="flex items-center">
                      <Package className="mr-2 h-4 w-4 text-azul" />
                      <span className="font-medium">Tipo de Financiamento:</span>
                      <span className="ml-2">{dadosProjeto.tipoFinanciamento}</span>
                    </div>
                  )}
                  {dadosProjeto.taxaFinanciamento !== null && (
                    <div className="flex items-center">
                      <Percent className="mr-2 h-4 w-4 text-azul" />
                      <span className="font-medium">Taxa de Financiamento:</span>
                      <span className="ml-2">{dadosProjeto.taxaFinanciamento}%</span>
                    </div>
                  )}
                  {dadosProjeto.overhead !== null && (
                    <div className="flex items-center">
                      <DollarSign className="mr-2 h-4 w-4 text-azul" />
                      <span className="font-medium">Overhead:</span>
                      <span className="ml-2">{dadosProjeto.overhead}%</span>
                    </div>
                  )}
                  {dadosProjeto.valorEti !== null && (
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4 text-azul" />
                      <span className="font-medium">Valor ETI:</span>
                      <span className="ml-2">{dadosProjeto.valorEti}€</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {workpackages.length > 0 && (
              <div className="flex justify-end">
                <Button className="bg-azul hover:bg-azul/90" onClick={handleImportarProjeto}>
                  Importar para o Projeto
                </Button>
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-azul">
                Início do Projeto:{" "}
                {state.inicio ? state.inicio.toLocaleDateString("pt-PT") : "Não definido"}
              </p>
              <p className="text-sm text-azul">
                Fim do Projeto:{" "}
                {state.fim instanceof Date ? state.fim.toLocaleDateString("pt-PT") : "Não definido"}
              </p>
            </div>

            {alocacoesFormatadas.length > 0 && (
              <div className="space-y-8">
                {alocacoesFormatadas.map((wp) => (
                  <Card key={wp.codigo} className="overflow-hidden p-4">
                    <div className="mb-4 flex items-center gap-3 border-b border-azul/10 pb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-azul/10">
                        <Briefcase className="h-5 w-5 text-azul" />
                      </div>
                      <h3 className="text-lg font-medium text-azul">
                        {wp.codigo} - {wp.nome}
                      </h3>
                      <Badge variant="outline" className="ml-auto bg-azul/5">
                        <User className="mr-1 h-3.5 w-3.5" />
                        {wp.recursos.length} recursos
                      </Badge>
                      <Badge variant="outline" className="bg-azul/5">
                        <Package className="mr-1 h-3.5 w-3.5" />
                        {wp.materiais.length} materiais
                      </Badge>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-azul">
                        Início: {wp.dataInicio?.toLocaleDateString("pt-PT")}
                      </p>
                      <p className="text-sm text-azul">
                        Fim: {wp.dataFim?.toLocaleDateString("pt-PT")}
                      </p>
                    </div>

                    {wp.materiais.length > 0 && (
                      <div className="mb-8">
                        <div className="mb-3 flex items-center gap-2">
                          <Package className="h-4 w-4 text-azul" />
                          <h4 className="text-sm font-medium text-azul">Materiais</h4>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-azul/5 text-xs text-azul/70">
                                <th className="border-b border-azul/10 p-2 text-left">Item</th>
                                <th className="border-b border-azul/10 p-2 text-right">Preço</th>
                                <th className="border-b border-azul/10 p-2 text-center">Qtd.</th>
                                <th className="border-b border-azul/10 p-2 text-right">Total</th>
                                <th className="border-b border-azul/10 p-2 text-center">Ano</th>
                                <th className="border-b border-azul/10 p-2 text-left">Rubrica</th>
                              </tr>
                            </thead>
                            <tbody>
                              {wp.materiais.map((material, idx) => (
                                <tr key={idx} className="hover:bg-azul/5">
                                  <td className="border-b border-azul/10 p-2">{material.nome}</td>
                                  <td className="border-b border-azul/10 p-2 text-right">
                                    {material.preco.toLocaleString("pt-PT")} €
                                  </td>
                                  <td className="border-b border-azul/10 p-2 text-center">
                                    {material.quantidade}
                                  </td>
                                  <td className="border-b border-azul/10 p-2 text-right">
                                    {(material.preco * material.quantidade).toLocaleString("pt-PT")}{" "}
                                    €
                                  </td>
                                  <td className="border-b border-azul/10 p-2 text-center">
                                    {material.ano_utilizacao}
                                  </td>
                                  <td className="border-b border-azul/10 p-2">
                                    <Badge
                                      variant="outline"
                                      className={getRubricaColors(material.rubrica)}
                                    >
                                      {material.rubrica.replace("_", " ")}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-azul/5 font-medium">
                                <td colSpan={3} className="p-2 text-right">
                                  Total:
                                </td>
                                <td className="p-2 text-right">
                                  {wp.materiais
                                    .reduce((total, m) => total + m.preco * m.quantidade, 0)
                                    .toLocaleString("pt-PT")}{" "}
                                  €
                                </td>
                                <td colSpan={2}></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {wp.recursos.length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <User className="h-4 w-4 text-azul" />
                          <h4 className="text-sm font-medium text-azul">Recursos</h4>
                        </div>

                        <div className="space-y-6">
                          {wp.recursos.map((recurso, idx) => (
                            <div
                              key={idx}
                              className="overflow-hidden rounded-lg border border-azul/10 bg-white"
                            >
                              <div className="flex items-center justify-between border-b border-azul/10 p-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-azul/10">
                                    <User className="h-5 w-5 text-azul" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-azul">{recurso.nome}</h4>
                                    <div className="flex items-center gap-2 text-xs text-azul/60">
                                      <Calendar className="h-3.5 w-3.5" />
                                      <span>{recurso.totalAlocacoes} meses alocados</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-slate-50/70 p-4">
                                <div className="space-y-6">
                                  {Object.entries(recurso.mesesPorAno)
                                    .sort()
                                    .map(([ano, meses]) => (
                                      <div key={ano} className="space-y-2">
                                        <h5 className="text-sm font-medium text-azul">{ano}</h5>

                                        <div className="flex flex-wrap gap-2">
                                          {meses.map((item) => {
                                            const mesFormatado = format(
                                              new Date(Number(ano), item.mes - 1),
                                              "MMM",
                                              { locale: pt }
                                            );
                                            const badgeClass = getBadgeColors(item.percentagem);

                                            return (
                                              <Badge
                                                key={`${item.mes}-${ano}`}
                                                variant="outline"
                                                className={`${badgeClass} whitespace-nowrap py-1`}
                                              >
                                                {mesFormatado}: {Math.round(item.percentagem)}%
                                              </Badge>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {sheetNames.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Conteúdo das Sheets</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue={sheetNames[0]}>
                    <TabsList>
                      {sheetNames.map((name) => (
                        <TabsTrigger key={name} value={name}>
                          {name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {sheetNames.map((name) => (
                      <TabsContent key={name} value={name}>
                        <div className="max-h-[500px] overflow-auto rounded-md bg-gray-50 p-4">
                          <pre className="whitespace-pre-wrap text-xs">
                            {JSON.stringify(sheets[name], null, 2)}
                          </pre>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ImportarExcelPage() {
  return (
    <ProjetoFormProvider>
      <ImportarExcelContent />
    </ProjetoFormProvider>
  );
}
