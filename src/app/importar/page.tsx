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
import { processReportSheetData } from "../../lib/importar_excel";

// Interfaces baseadas nos tipos do Prisma (local types for page state)
interface PageAlocacao { // Renamed to avoid conflict if importing lib types directly
  mes: number;
  ano: number;
  percentagem: number;
}

interface PageRecurso { // Renamed and userId added
  nome: string;
  userId: string | null; // Added for consistency
  alocacoes: PageAlocacao[];
  salario?: number;
}

// Modificar o tipo para usar number em vez de Decimal durante a importação
type PageMaterialImportacao = { // Renamed
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
  mes: number;
};

interface PageWorkpackageSimples { // Renamed
  codigo: string;
  nome: string;
  recursos: PageRecurso[];
  materiais: PageMaterialImportacao[];
  dataInicio: Date | null;
  dataFim: Date | null;
  id?: string;
}

function mapearRubrica(rubricaExcel: string): Rubrica {
  const mapeamento: Record<string, Rubrica> = {
    Materiais: "MATERIAIS",
    "Serviços Terceiros": "SERVICOS_TERCEIROS",
    "Outros Serviços": "OUTROS_SERVICOS",
    "Deslocações e Estadas": "DESLOCACAO_ESTADAS",
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
    case "DESLOCACAO_ESTADAS":
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
  const [workpackages, setWorkpackages] = useState<PageWorkpackageSimples[]>([]); // Use PageWorkpackageSimples
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [utilizadoresSistema, setUtilizadoresSistema] = useState<any[]>([]); 

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const extrairMateriais = (data: any[][]): PageMaterialImportacao[] => {
    const materiais: PageMaterialImportacao[] = [];
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
          id: Math.floor(Math.random() * 1000000),
          nome: despesa,
          descricao: null,
          estado: false,
          preco: custoUnitario,
          quantidade: unidades,
          ano_utilizacao: typeof ano === "number" ? ano : new Date().getFullYear(),
          rubrica: mapearRubrica(rubrica),
          workpackageId: null,
          workpackageNome: atividade,
          mes: 1,
        });
      }
    }
    return materiais;
  };

  const extrairDadosRH = (data: any[][]): { workpackages: PageWorkpackageSimples[] } => {
    const wps: PageWorkpackageSimples[] = [];
    const salariosPorRecurso = new Map<string, number>();
    for (const row of data) {
      if (!row || row.length < 7) continue;
      const nomeRecurso = row[5];
      const valorLido = row[6];
      if (typeof nomeRecurso === 'string' && 
          typeof valorLido === 'number' && 
          !nomeRecurso.toLowerCase().includes('contagem') &&
          !nomeRecurso.toLowerCase().includes('total') &&
          !nomeRecurso.toLowerCase().includes('subtotal') &&
          !nomeRecurso.toLowerCase().includes('eng.') &&
          valorLido > 0) {
        const salarioBase = valorLido / (1.223 * 14/11);
        const nomeNormalizado = nomeRecurso.trim().toLowerCase();
        salariosPorRecurso.set(nomeNormalizado, salarioBase);
        if (nomeNormalizado.includes(' - ')) {
          const partes = nomeNormalizado.split(' - ');
          if (partes[0]) salariosPorRecurso.set(partes[0].trim(), salarioBase);
        }
        if (nomeNormalizado.includes('-')) {
          const partes = nomeNormalizado.split('-');
          if (partes[0]) salariosPorRecurso.set(partes[0].trim(), salarioBase);
        }
      }
    }

    let mesesRow: any[] | undefined = undefined;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || !Array.isArray(row)) continue;
      const anosCount = row.filter(c => typeof c === 'number' && c >= 2020 && c <= 2100).length;
      const datasExcelCount = row.filter(c => typeof c === 'number' && c > 40000).length;
      if (anosCount >= 3 && datasExcelCount === 0) continue;
      if (datasExcelCount >= 3) {
        mesesRow = row;
        break;
      }
    }

    const mesesColMap: {col: number, excelDate: number}[] = [];
    if (mesesRow) {
      for (let i = 0; i < mesesRow.length; i++) {
        const v = mesesRow[i];
        if (typeof v === 'number' && v > 40000) {
          mesesColMap.push({col: i, excelDate: v});
        }
      }
    }

    function findWPCodeAndName(row: any[]): {idxCodigoWP: number, idxNomeWP: number, idxNomeRecurso: number} {
      let idxCodigoWP = -1, idxNomeWP = -1, idxNomeRecurso = -1;
      for (let i = 0; i < 5; i++) {
        const v = row[i];
        if (typeof v === 'string' && v.match(/^(WP|A)\d+$/i)) {
          idxCodigoWP = i;
          idxNomeWP = i + 1;
          idxNomeRecurso = i + 2;
          break;
        }
      }
      return { idxCodigoWP, idxNomeWP, idxNomeRecurso };
    }

    const excelDateToJSLocal = (excelDate: number) => {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return {
        mes: date.getMonth() + 1,
        ano: date.getFullYear(),
      };
    };

    let wpAtual: PageWorkpackageSimples | null = null;
    let currentWPIndices = {idxCodigoWP: -1, idxNomeWP: -1, idxNomeRecurso: -1};

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 3) continue;
      const wpColInfo = findWPCodeAndName(row);
      if (wpColInfo.idxCodigoWP !== -1) {
        wpAtual = {
          codigo: row[wpColInfo.idxCodigoWP],
          nome: typeof row[wpColInfo.idxNomeWP] === 'string' ? row[wpColInfo.idxNomeWP] : '',
          recursos: [],
          materiais: [],
          dataInicio: null,
          dataFim: null
        };
        wps.push(wpAtual);
        currentWPIndices = wpColInfo;
        continue;
      }
      if (!wpAtual) continue;
      const nomeRecurso = row[currentWPIndices.idxNomeRecurso];
      if (typeof nomeRecurso !== 'string' || nomeRecurso.trim() === '' || 
          nomeRecurso.toLowerCase().includes('total') || nomeRecurso.toLowerCase().includes('subtotal')) {
        continue;
      }
      const nomeNormalizado = nomeRecurso.trim().toLowerCase();
      let salarioEncontrado = salariosPorRecurso.get(nomeNormalizado);
      if (!salarioEncontrado && nomeNormalizado.includes(' - ')) {
        const partes = nomeNormalizado.split(' - ');
        if (partes[0]) salarioEncontrado = salariosPorRecurso.get(partes[0].trim());
      }
      if (!salarioEncontrado && nomeNormalizado.includes('-')) {
        const partes = nomeNormalizado.split('-');
        if (partes[0]) salarioEncontrado = salariosPorRecurso.get(partes[0].trim());
      }
      const recurso: PageRecurso = { // Use PageRecurso
        nome: nomeRecurso,
        userId: null, // extrairDadosRH from page.tsx does not set userId; this is done by lib or later by user
        alocacoes: [],
        salario: salarioEncontrado
      };
      let dataInicioRecurso: Date | null = null;
      let dataFimRecurso: Date | null = null;
      for (const {col, excelDate} of mesesColMap) {
        const valor = row[col];
        if (valor && typeof valor === 'number' && valor > 0 && valor <= 1) {
          const { mes, ano } = excelDateToJSLocal(excelDate);
          recurso.alocacoes.push({ mes, ano, percentagem: valor * 100 });
          const dataAlocInicio = new Date(ano, mes - 1, 1);
          const dataAlocFim = new Date(ano, mes, 0);
          if (!dataInicioRecurso || dataAlocInicio < dataInicioRecurso) dataInicioRecurso = dataAlocInicio;
          if (!dataFimRecurso || dataAlocFim > dataFimRecurso) dataFimRecurso = dataAlocFim;
        }
      }
      if (recurso.alocacoes.length > 0) {
        wpAtual.recursos.push(recurso);
        if (dataInicioRecurso && (!wpAtual.dataInicio || dataInicioRecurso < wpAtual.dataInicio)) wpAtual.dataInicio = dataInicioRecurso;
        if (dataFimRecurso && (!wpAtual.dataFim || dataFimRecurso > wpAtual.dataFim)) wpAtual.dataFim = dataFimRecurso;
      }
    }
    return { workpackages: wps };
  };

  const atribuirMateriaisAosWorkpackages = (
    workpackages: PageWorkpackageSimples[],
    materiais: PageMaterialImportacao[]
  ): PageWorkpackageSimples[] => {
    const wpMap = new Map<string, PageWorkpackageSimples>();
    workpackages.forEach((wp) => {
      wpMap.set(wp.nome, wp);
      const wpCodigo = wp.nome.split(" - ")[0]?.trim();
      if (wpCodigo) wpMap.set(wpCodigo, wp);
    });
    materiais.forEach((material) => {
      let wpMatch = wpMap.get(material.workpackageNome);
      if (!wpMatch && material.workpackageNome) {
        const codigoMatch = material.workpackageNome.match(/^A\d+/);
        if (codigoMatch) wpMatch = workpackages.find((wp) => wp.codigo === codigoMatch[0]) || undefined;
      }
      if (wpMatch) {
        wpMatch.materiais = wpMatch.materiais || [];
        wpMatch.materiais.push(material);
      } else if (workpackages.length > 0 && workpackages[0]) {
        workpackages[0].materiais = workpackages[0].materiais || [];
        workpackages[0].materiais.push(material);
      }
    });
    return workpackages;
  };

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
        if (linha[6] === "Tipo de projeto " && linha[7]) tipoFinanciamento = linha[7];
        else if (linha[6] === "Taxa de financiamento" && typeof linha[7] === "number") taxaFinanciamento = linha[7] * 100;
        else if (linha[6] === "Custos indiretos" && typeof linha[7] === "number") overhead = linha[7] * 100;
      }
    }
    return { tipoFinanciamento, taxaFinanciamento, overhead };
  };

  const extrairValorEti = (dadosRH: any[][]): number | null => {
    for (let i = 0; i < dadosRH.length; i++) {
      const row = dadosRH[i];
      if (row && row.length >= 6) {
        if (row[4] && typeof row[4] === "string" && row[5] && typeof row[5] === "number") return row[5];
      }
    }
    return null;
  };

  const [dadosProjeto, setDadosProjeto] = useState<{
    nomeProjeto: string;
    tipoFinanciamento: string;
    taxaFinanciamento: number | null;
    overhead: number | null;
    valorEti: number | null;
    dataInicioProjeto: Date | null; 
    dataFimProjeto: Date | null;    
  }>({
    nomeProjeto: "",
    tipoFinanciamento: "",
    taxaFinanciamento: null,
    overhead: null,
    valorEti: null,
    dataInicioProjeto: null,
    dataFimProjeto: null,
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
    reader.onload = (event) => {
      try {
        console.log("Ficheiro carregado, iniciando processamento");
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        console.log("Sheets encontradas:", workbook.SheetNames);
        const sheetsData: { [key: string]: any[][] } = {};
        const names = workbook.SheetNames;
        names.forEach((name) => {
          console.log(`Processando sheet: ${name}`);
          const sheet = workbook.Sheets[name];
          if (sheet) sheetsData[name] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        });

        let nomeProjetoFinal = dadosProjeto.nomeProjeto;
        let tipoFinanciamentoFinal = dadosProjeto.tipoFinanciamento;
        let taxaFinanciamentoFinal = dadosProjeto.taxaFinanciamento;
        let overheadFinal = dadosProjeto.overhead;
        let valorEtiFinal = dadosProjeto.valorEti;
        let dataInicioProjetoFinal = dadosProjeto.dataInicioProjeto;
        let dataFimProjetoFinal = dadosProjeto.dataFimProjeto;
        let wpsFinal: PageWorkpackageSimples[] = [];
        let materiaisFinal: PageMaterialImportacao[] = [];

        if (sheetsData["REPORT"]) {
          console.log("Processando sheet REPORT...");
          const reportResultLib = processReportSheetData(sheetsData["REPORT"], utilizadoresSistema);
          
          dataInicioProjetoFinal = reportResultLib.dataInicioProjeto;
          dataFimProjetoFinal = reportResultLib.dataFimProjeto;
          
          wpsFinal = reportResultLib.workpackages.map((libWp): PageWorkpackageSimples => ({
            codigo: libWp.codigo,
            nome: libWp.nome,
            recursos: libWp.recursos.map((libRecurso): PageRecurso => ({
              nome: libRecurso.nome,
              userId: libRecurso.userId,
              alocacoes: libRecurso.alocacoes.map(libAloc => ({ ...libAloc })),
              salario: libRecurso.salario,
            })),
            materiais: [], // REPORT sheet does not populate materials per user request
            dataInicio: libWp.dataInicio,
            dataFim: libWp.dataFim,
            id: undefined, // PageWorkpackageSimples has optional id, lib does not
          }));

          if (sheetsData["HOME"]) {
            const homeData = extrairDadosProjeto(sheetsData["HOME"]);
            nomeProjetoFinal = homeData.nomeProjeto;
          } 
          if (sheetsData["BUDGET"]) {
            const budgetData = extrairDadosFinanciamento(sheetsData["BUDGET"]);
            tipoFinanciamentoFinal = budgetData.tipoFinanciamento;
            taxaFinanciamentoFinal = budgetData.taxaFinanciamento;
            overheadFinal = budgetData.overhead;
          }
          if (sheetsData["RH_Budget_SUBM"]) {
            valorEtiFinal = extrairValorEti(sheetsData["RH_Budget_SUBM"]);
          }
           console.log("Dados da sheet REPORT processados.");

        } else {
          console.log("Sheet REPORT não encontrada, processando outras sheets...");
          if (sheetsData["HOME"]) {
            const homeData = extrairDadosProjeto(sheetsData["HOME"]);
            nomeProjetoFinal = homeData.nomeProjeto;
          }
          if (sheetsData["BUDGET"]) {
            const budgetData = extrairDadosFinanciamento(sheetsData["BUDGET"]);
            tipoFinanciamentoFinal = budgetData.tipoFinanciamento;
            taxaFinanciamentoFinal = budgetData.taxaFinanciamento;
            overheadFinal = budgetData.overhead;
          }
          if (sheetsData["RH_Budget_SUBM"]) {
            valorEtiFinal = extrairValorEti(sheetsData["RH_Budget_SUBM"]);
            const { workpackages: wpsFromRH } = extrairDadosRH(sheetsData["RH_Budget_SUBM"]);
            wpsFinal = wpsFromRH;
          }
          if (sheetsData["Outros_Budget"]) {
            materiaisFinal = extrairMateriais(sheetsData["Outros_Budget"]);
          }
          if (wpsFinal.length > 0 && materiaisFinal.length > 0) {
            wpsFinal = atribuirMateriaisAosWorkpackages(wpsFinal, materiaisFinal);
          }
        }

        setDadosProjeto({
          nomeProjeto: nomeProjetoFinal,
          tipoFinanciamento: tipoFinanciamentoFinal,
          taxaFinanciamento: taxaFinanciamentoFinal,
          overhead: overheadFinal,
          valorEti: valorEtiFinal,
          dataInicioProjeto: dataInicioProjetoFinal,
          dataFimProjeto: dataFimProjetoFinal,
        });

        setWorkpackages(wpsFinal);
        setSheets(sheetsData);
        setSheetNames(names);

        if (nomeProjetoFinal) {
          dispatch({
            type: "UPDATE_PROJETO",
            data: { nome: nomeProjetoFinal, inicio: dataInicioProjetoFinal, fim: dataFimProjetoFinal }, 
          });
        }

      } catch (error) {
        console.error("Erro detalhado ao processar o ficheiro Excel:", error);
        toast.error("Ocorreu um erro ao processar o ficheiro Excel. Verifique o formato do ficheiro.");
      }
    };
    reader.onerror = (error) => {
      console.error("Erro ao ler o ficheiro:", error);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportarProjeto = () => {
    dispatch({ type: "RESET" });
    dispatch({
      type: "UPDATE_PROJETO",
      data: {
        nome: dadosProjeto.nomeProjeto,
        inicio: dadosProjeto.dataInicioProjeto,
        fim: dadosProjeto.dataFimProjeto,
      },
    });


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

      const alocacoesPorUser = wp.recursos.reduce(
        (acc, recurso) => { // recurso here is PageRecurso, which has userId
          const userId = recurso.userId || `novo_user_${crypto.randomUUID()}`;

          if (!acc[userId]) acc[userId] = [];
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

      Object.values(alocacoesPorUser).forEach((alocacoes) => {
        alocacoes.forEach((alocacao) => {
          dispatch({
            type: "ADD_ALOCACAO",
            workpackageId: wpId,
            alocacao,
          });
        });
      });

      if (wp.materiais && wp.materiais.length > 0) { 
        wp.materiais.forEach((material) => {
          dispatch({
            type: "ADD_MATERIAL",
            workpackageId: wpId,
            material: {
              id: material.id,
              nome: material.nome,
              descricao: material.descricao || null, // Handle potentially undefined
              estado: material.estado || false,
              preco: new Decimal(material.preco),
              quantidade: material.quantidade,
              ano_utilizacao: material.ano_utilizacao,
              rubrica: material.rubrica,
              mes: material.mes || 1,
            },
          });
        });
      }
    });
    toast.success("Dados importados com sucesso para o formulário do projeto");
  };

  const alocacoesFormatadas = useMemo(() => {
    return workpackages.map((wp) => {
      const recursos = wp.recursos.map((recurso) => { // recurso here is PageRecurso
        const mesesPorAno: Record<number, Array<{ mes: number; percentagem: number }>> = {};
        recurso.alocacoes.forEach(({ mes, ano, percentagem }) => {
          if (!mesesPorAno[ano]) mesesPorAno[ano] = [];
          mesesPorAno[ano].push({ mes, percentagem });
        });
        Object.keys(mesesPorAno).forEach((ano) => {
          const mesesDoAno = mesesPorAno[Number(ano)];
          if (mesesDoAno) mesesDoAno.sort((a, b) => a.mes - b.mes);
        });
        return {
          ...recurso, // Spreading PageRecurso, which includes userId
          userId: recurso.userId, // Explicitly carry over userId for TS
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
              <p className="mt-2 text-sm text-azul">
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
                      {wp.materiais && wp.materiais.length > 0 && (
                        <Badge variant="outline" className="bg-azul/5">
                          <Package className="mr-1 h-3.5 w-3.5" />
                          {wp.materiais.length} materiais
                        </Badge>
                      )}
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-azul">
                        Início: {wp.dataInicio?.toLocaleDateString("pt-PT")}
                      </p>
                      <p className="text-sm text-azul">
                        Fim: {wp.dataFim?.toLocaleDateString("pt-PT")}
                      </p>
                    </div>

                    {wp.materiais && wp.materiais.length > 0 && (
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
                                    {typeof material.preco === 'number' ? material.preco.toLocaleString("pt-PT") : material.preco} €
                                  </td>
                                  <td className="border-b border-azul/10 p-2 text-center">
                                    {material.quantidade}
                                  </td>
                                  <td className="border-b border-azul/10 p-2 text-right">
                                    {(typeof material.preco === 'number' ? material.preco * material.quantidade : 0).toLocaleString("pt-PT")} €
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
                                    .reduce((total, m) => total + (typeof m.preco === 'number' ? m.preco * m.quantidade : 0), 0)
                                    .toLocaleString("pt-PT")} €
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
                          {wp.recursos.map((recurso, idx) => ( // recurso here is the mapped object from alocacoesFormatadas
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
                                    {recurso.userId && <p className="text-xs text-gray-500">ID: {recurso.userId}</p>}
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
                                                {mesFormatado}: {item.percentagem.toFixed(1)}%
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