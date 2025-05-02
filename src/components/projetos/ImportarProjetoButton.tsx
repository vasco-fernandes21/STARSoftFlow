"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExternalLink, FileSpreadsheet, Upload } from "lucide-react";
import { useProjetoForm } from "@/components/projetos/criar/ProjetoFormContext";
import * as XLSX from "xlsx";
import { Decimal } from "decimal.js";
import type { Rubrica, Material as PrismaMaterial } from "@prisma/client";
import { generateUUID } from "@/server/api/utils/token";
import { api } from "@/trpc/react";
import { GerirFinanciamentosModal } from "@/components/projetos/criar/novo/financas/GerirFinanciamentosModal";
import { FormContratado } from "@/components/projetos/criar/novo/recursos/form-contratado";
import { toast } from "sonner";

// Interfaces e Tipos
interface Alocacao {
  mes: number;
  ano: number;
  percentagem: number;
}

interface Recurso {
  nome: string;
  userId: string | null;
  alocacoes: Alocacao[];
  salario?: number;
}

// Adicionar nova interface para controlar o estado da importação
interface EstadoImportacao {
  sheetsData: { [key: string]: any[][] };
  nomeProjeto: string;
  tipoFinanciamento: string;
  taxaFinanciamento: number | null;
  overhead: number | null;
  valorEti: number | null;
  workpackages: WorkpackageSimples[];
  materiais: MaterialImportacao[];
  dataInicioProjeto: Date | null;
  dataFimProjeto: Date | null;
}

type MaterialImportacao = Pick<
  PrismaMaterial,
  "nome" | "preco" | "quantidade" | "ano_utilizacao" | "rubrica"
> & {
  workpackageNome: string;
  descricao?: string | null;
  estado?: boolean;
};

interface WorkpackageSimples {
  codigo: string;
  nome: string;
  recursos: Recurso[];
  materiais: MaterialImportacao[];
  dataInicio: Date | null;
  dataFim: Date | null;
}

// Tipo para o que vem da API
type FinanciamentoAPI = {
  id: number;
  nome: string;
  overhead: string;
  taxa_financiamento: string;
  valor_eti: string;
};

// Funções Utilitárias
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

function excelDateToJS(excelDate: number) {
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return {
    mes: date.getMonth() + 1,
    ano: date.getFullYear(),
  };
}

function converterExcelParaJson(workbook: XLSX.WorkBook): {
  [key: string]: any[][];
} {
  const sheetsData: { [key: string]: any[][] } = {};
  workbook.SheetNames.forEach((name) => {
    const sheet = workbook.Sheets[name];
    if (sheet) {
      sheetsData[name] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    }
  });
  return sheetsData;
}

// Funções de Extração de Dados
function extrairDadosProjeto(dados: any[][]) {
  let nomeProjeto = "";
  for (const linha of dados) {
    if (linha && linha.length >= 2 && linha[0] === "Nome do projeto ") {
      nomeProjeto = linha[1];
      break;
    }
  }
  return { nomeProjeto };
}

function extrairDadosFinanciamento(dadosBudget: any[][]): {
  tipoFinanciamento: string;
  taxaFinanciamento: number | null;
  overhead: number | null;
  valorEti: number | null;
} {
  let tipoFinanciamento = "";
  let taxaFinanciamento: number | null = null;
  let overhead: number | null = null;
  const valorEti: number | null = null;

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

  return { tipoFinanciamento, taxaFinanciamento, overhead, valorEti };
}

function extrairValorEti(dadosRH: any[][]): number | null {
  for (let i = 0; i < dadosRH.length; i++) {
    const row = dadosRH[i];
    if (!row || row.length < 6) continue;

    if (row[4] && typeof row[4] === "string" && row[5] && typeof row[5] === "number") {
      return row[5]; // O valor ETI está na coluna 6 (índice 5)
    }
  }
  return null;
}

function extrairMateriais(data: any[][]): MaterialImportacao[] {
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
        nome: despesa,
        preco: new Decimal(custoUnitario),
        quantidade: unidades,
        ano_utilizacao: typeof ano === "number" ? ano : new Date().getFullYear(),
        rubrica: mapearRubrica(rubrica),
        workpackageNome: atividade,
        descricao: null,
        estado: false,
      });
    }
  }

  return materiais;
}

function extrairUtilizadores(apiResponse: any): any[] {
  console.log("[Importação] Dados brutos recebidos:", apiResponse);
  
  if (!apiResponse) {
    console.warn("[Importação] Nenhum dado recebido");
    return [];
  }

  // Tentar extrair items de várias formas possíveis
  const possiveisLocais = [
    apiResponse?.result?.data?.json?.items,
    apiResponse?.items,
    apiResponse?.json?.items,
    apiResponse?.json,
    Array.isArray(apiResponse) ? apiResponse : null
  ];

  for (const local of possiveisLocais) {
    if (Array.isArray(local) && local.length > 0) {
      console.log("[Importação] Dados encontrados em:", local);
      return local;
    }
  }

  console.warn("[Importação] Nenhum dado válido encontrado");
  return [];
}

function extrairDadosRH(data: any[][], utilizadores: any[]): { workpackages: WorkpackageSimples[]; dataInicioProjeto: Date | null; dataFimProjeto: Date | null; } {
  const wps: WorkpackageSimples[] = [];
  let dataInicioProjeto: Date | null = null;
  let dataFimProjeto: Date | null = null;
  const salariosPorRecurso = new Map<string, number>();

  // Primeiro vamos extrair os salários e normalizar os nomes
  for (const row of data) {
    if (!row || row.length < 7) continue;
    
    const nomeRecurso = row[5];
    const valorLido = row[6];
    
    if (typeof nomeRecurso === 'string' && 
        typeof valorLido === 'number' && 
        !nomeRecurso.toLowerCase().includes('contagem') &&
        !nomeRecurso.toLowerCase().includes('células cinza') &&
        !nomeRecurso.toLowerCase().includes('total') &&
        !nomeRecurso.toLowerCase().includes('subtotal') &&
        !nomeRecurso.toLowerCase().includes('eng.') &&
        valorLido > 0) {
      // Converter o valor lido para salário base mensal
      // valor_lido = salario * 1.223 * 14/11
      // então: salario = valor_lido / (1.223 * 14/11)
      const salarioBase = valorLido / (1.223 * 14/11);
      
      // Normalizar o nome do recurso para matching
      const nomeNormalizado = nomeRecurso.trim().toLowerCase();
      salariosPorRecurso.set(nomeNormalizado, salarioBase);
      
      // Também guardar versões alternativas do nome para matching mais flexível
      if (nomeNormalizado.includes(' - ')) {
        const partes = nomeNormalizado.split(' - ');
        if (partes[0]) {
          salariosPorRecurso.set(partes[0].trim(), salarioBase);
        }
      }
      if (nomeNormalizado.includes('-')) {
        const partes = nomeNormalizado.split('-');
        if (partes[0]) {
          salariosPorRecurso.set(partes[0].trim(), salarioBase);
        }
      }
    }
  }

  // 1. Encontrar linha dos cabeçalhos (onde está "Recurso")
  const headerRowIdx = data.findIndex(r => Array.isArray(r) && r.some(c => typeof c === 'string' && c.toUpperCase().includes('RECURSO')));

  // 2. Encontrar linha dos meses (ExcelDate > 40000), ignorando linhas de anos
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

  // 3. Mapear colunas de meses válidas (ExcelDate > 40000)
  const mesesColMap: {col: number, excelDate: number}[] = [];
  if (mesesRow) {
    for (let i = 0; i < mesesRow.length; i++) {
      const v = mesesRow[i];
      if (typeof v === 'number' && v > 40000) {
        mesesColMap.push({col: i, excelDate: v});
      }
    }
  }

  // 4. Detetar dinamicamente colunas de código WP, nome WP e recurso
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

  let wpAtual: WorkpackageSimples | null = null;
  let currentWPIndices = {idxCodigoWP: -1, idxNomeWP: -1, idxNomeRecurso: -1};

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 3) continue;

    // Detetar início de WP
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
    if (typeof nomeRecurso !== 'string' || 
        nomeRecurso.trim() === '' || 
        nomeRecurso.toLowerCase().includes('total') || 
        nomeRecurso.toLowerCase().includes('subtotal') ||
        nomeRecurso.toLowerCase().includes('células cinza')) {
      continue;
    }

    // Encontrar o utilizador correspondente (fuzzy matching)
    const nomeRecursoLower = nomeRecurso.toLowerCase().trim();
    // Função de similaridade simples baseada em número de palavras iguais (pode ser melhorada)
    function similarity(a: string, b: string) {
      const aWords = a.split(/\s+/).filter(Boolean);
      const bWords = b.split(/\s+/).filter(Boolean);
      const common = aWords.filter(word => bWords.includes(word)).length;
      return common / Math.max(aWords.length, bWords.length);
    }
    let bestMatch: any = null;
    let bestScore = 0.0;
    for (const u of utilizadores) {
      const dbName = u.name?.trim().toLowerCase();
      if (!dbName) continue;
      const score = similarity(nomeRecursoLower, dbName);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = u;
      }
    }
    let userId: string | null = null;
    // Considera match se pelo menos 60% das palavras coincidirem
    if (bestScore >= 0.6) {
      userId = bestMatch.id;
    } else {
      // fallback: tentar includes (como antes)
      const potentialMatches = utilizadores.filter(u => {
        const dbNameTrimmedLower = u.name?.trim().toLowerCase();
        return dbNameTrimmedLower?.includes(nomeRecursoLower);
      });
      if (potentialMatches.length === 1) {
        userId = potentialMatches[0]?.id || null;
      }
    }

    // Tentar encontrar o salário usando diferentes variações do nome
    const nomeNormalizado = nomeRecurso.trim().toLowerCase();
    let salarioEncontrado = salariosPorRecurso.get(nomeNormalizado);
    
    if (!salarioEncontrado && nomeNormalizado.includes(' - ')) {
      const partes = nomeNormalizado.split(' - ');
      if (partes[0]) {
        salarioEncontrado = salariosPorRecurso.get(partes[0].trim());
      }
    }
    
    if (!salarioEncontrado && nomeNormalizado.includes('-')) {
      const partes = nomeNormalizado.split('-');
      if (partes[0]) {
        salarioEncontrado = salariosPorRecurso.get(partes[0].trim());
      }
    }

    const recurso: Recurso = { 
      nome: nomeRecurso, 
      userId, 
      alocacoes: [],
      salario: salarioEncontrado
    };

    let dataInicioRecurso: Date | null = null;
    let dataFimRecurso: Date | null = null;

    for (const {col, excelDate} of mesesColMap) {
      const valor = row[col];
      if (valor && typeof valor === 'number' && valor > 0 && valor <= 1) {
        const { mes, ano } = excelDateToJS(excelDate);
        recurso.alocacoes.push({ mes, ano, percentagem: valor * 100 });

        const dataAlocInicio = new Date(ano, mes - 1, 1);
        const dataAlocFim = new Date(ano, mes, 0);

        if (!dataInicioRecurso || dataAlocInicio < dataInicioRecurso) {
          dataInicioRecurso = dataAlocInicio;
        }
        if (!dataFimRecurso || dataAlocFim > dataFimRecurso) {
          dataFimRecurso = dataAlocFim;
        }

        // Atualizar datas do projeto
        if (!dataInicioProjeto || dataAlocInicio < dataInicioProjeto) {
          dataInicioProjeto = dataAlocInicio;
        }
        if (!dataFimProjeto || dataAlocFim > dataFimProjeto) {
          dataFimProjeto = dataAlocFim;
        }
      }
    }

    if (recurso.alocacoes.length > 0) {
      wpAtual.recursos.push(recurso);
      
      if (dataInicioRecurso && (!wpAtual.dataInicio || dataInicioRecurso < wpAtual.dataInicio)) {
        wpAtual.dataInicio = dataInicioRecurso;
      }
      if (dataFimRecurso && (!wpAtual.dataFim || dataFimRecurso > wpAtual.dataFim)) {
        wpAtual.dataFim = dataFimRecurso;
      }
    }
  }

  return { workpackages: wps, dataInicioProjeto, dataFimProjeto };
}

function atribuirMateriaisAosWorkpackages(
  workpackages: WorkpackageSimples[],
  materiais: MaterialImportacao[]
): WorkpackageSimples[] {
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

    if (!wpMatch) {
      const codigoMatch = material.workpackageNome.match(/^A\d+/);
      if (codigoMatch) {
        wpMatch = workpackages.find((wp) => wp.codigo === codigoMatch[0]);
      }
    }

    if (wpMatch) {
      wpMatch.materiais.push(material);
    } else if (workpackages.length > 0 && workpackages[0]) {
      workpackages[0].materiais.push(material);
    }
  });

  return workpackages;
}

// Componente Principal
export default function ImportarProjetoButton() {
  const { dispatch } = useProjetoForm();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalFinanciamentosAberto, setModalFinanciamentosAberto] = useState(false);
  const [showContratadoForm, setShowContratadoForm] = useState(false);
  const [shouldRenderContratadoForm, setShouldRenderContratadoForm] = useState(false);
  const [novoContratadoData, setNovoContratadoData] = useState<{
    nome: string;
    salario: number | undefined;
  } | null>(null);
  const [recursosNaoAssociados, setRecursosNaoAssociados] = useState<Array<{
    nome: string;
    salario: number | undefined;
  }>>([]);
  const [dadosFinanciamento, setDadosFinanciamento] = useState<{
    nome: string;
    overhead: number | null;
    taxa_financiamento: number | null;
    valor_eti: number | null;
  } | null>(null);
  
  const [estadoImportacao, setEstadoImportacao] = useState<EstadoImportacao | null>(null);
  const [processamentoPendente, setProcessamentoPendente] = useState(false);

  const { data: financiamentosData } = api.financiamento.findAll.useQuery({ limit: 100 });
  const { data: utilizadoresData } = api.utilizador.findAll.useQuery();
  const utils = api.useUtils();

  // Função para processar a importação final
  const processarImportacaoFinal = useCallback(() => {
    if (!estadoImportacao) {
      console.error("[Importação Final] Estado de importação não encontrado.");
      toast.error("Erro interno ao processar importação.");
      setIsLoading(false);
      return;
    }

    console.log("[Importação Final] Iniciando processamento com estado:", estadoImportacao);

    const {
      nomeProjeto,
      tipoFinanciamento,
      taxaFinanciamento,
      overhead,
      valorEti,
      workpackages,
      materiais,
      dataInicioProjeto,
      dataFimProjeto
    } = estadoImportacao;

    dispatch({ type: "RESET" });

    dispatch({
      type: "UPDATE_PROJETO",
      data: {
        nome: nomeProjeto,
        inicio: dataInicioProjeto,
        fim: dataFimProjeto,
        overhead: overhead ? new Decimal(overhead / 100) : new Decimal(0),
        taxa_financiamento: taxaFinanciamento ? new Decimal(taxaFinanciamento / 100) : new Decimal(0),
        valor_eti: valorEti ? new Decimal(valorEti) : new Decimal(0),
      },
    });

    // Processar workpackages com as alocações atualizadas
    workpackages.forEach((wp) => {
      const wpId = generateUUID();

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

      wp.recursos.forEach((recurso) => {
        if (!recurso.userId) {
          console.warn(`[Importação Final] Recurso sem userId no WP ${wp.nome}:`, recurso.nome);
          return;
        }

        console.log(`[Importação Final] Processando alocações para recurso ${recurso.nome} (ID: ${recurso.userId})`);

        recurso.alocacoes.forEach((alocacao) => {
          dispatch({
            type: "ADD_ALOCACAO",
            workpackageId: wpId,
            alocacao: {
              userId: recurso.userId!,
              mes: alocacao.mes,
              ano: alocacao.ano,
              ocupacao: new Decimal(alocacao.percentagem / 100),
            },
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
            preco: new Decimal(material.preco),
            quantidade: material.quantidade,
            mes: wp.dataInicio ? wp.dataInicio.getMonth() + 1 : new Date().getMonth() + 1,
            ano_utilizacao: material.ano_utilizacao,
            rubrica: material.rubrica,
            descricao: null,
            estado: false,
          },
        });
      });
    });

    // Processar financiamento
    if (tipoFinanciamento) {
      try {
        const rawFinanciamentos = (financiamentosData?.items || []) as unknown as Array<{
          id: number;
          nome: string;
          overhead: Decimal | string;
          taxa_financiamento: Decimal | string;
          valor_eti: Decimal | string;
        }>;

        const financiamentos: FinanciamentoAPI[] = rawFinanciamentos.map((f) => ({
          id: f.id,
          nome: f.nome,
          overhead: String(f.overhead),
          taxa_financiamento: String(f.taxa_financiamento),
          valor_eti: String(f.valor_eti),
        }));

        const tipoNormalizado = tipoFinanciamento.trim().toLowerCase();
        const financiamentoExistente = financiamentos.find(
          (f) => f.nome.trim().toLowerCase() === tipoNormalizado
        );

        if (financiamentoExistente) {
          dispatch({
            type: "UPDATE_PROJETO",
            data: {
              financiamentoId: financiamentoExistente.id,
            },
          });
        } else if (tipoFinanciamento) {
          setDadosFinanciamento({
            nome: tipoFinanciamento,
            overhead,
            taxa_financiamento: taxaFinanciamento,
            valor_eti: valorEti,
          });
          setModalFinanciamentosAberto(true);
        }
      } catch (error) {
        console.error("[Importação Final] Erro ao verificar financiamentos existentes:", error);
      }
    }

    setEstadoImportacao(null); 
    setOpen(false);
    setIsLoading(false);
    toast.success("Projeto importado com sucesso!");

  }, [dispatch, estadoImportacao, financiamentosData]);

  useEffect(() => {
    if (processamentoPendente && estadoImportacao) {
      console.log("[Importação useEffect] Trigger: Processando importação final");
      processarImportacaoFinal(); 
      setProcessamentoPendente(false);
    }
  }, [processamentoPendente, estadoImportacao, processarImportacaoFinal]);

  const handleFileUpload = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      console.log("[Importação] Nenhum ficheiro selecionado");
      return;
    }

    setIsLoading(true);
    setRecursosNaoAssociados([]);
    setEstadoImportacao(null);
    setProcessamentoPendente(false);

    try {
      const dadosUtilizadores = utilizadoresData;
      console.log("[Importação] Usando dados dos utilizadores em cache:", dadosUtilizadores);
      
      const utilizadores = extrairUtilizadores(dadosUtilizadores);
      console.log("[Importação] Utilizadores extraídos (cache inicial):", utilizadores.length);

      if (!utilizadores) {
        toast.error("Não foi possível obter a lista de utilizadores inicial.");
        setIsLoading(false);
        return;
      }

      const reader = new FileReader();

      reader.onload = async (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetsData = converterExcelParaJson(workbook);

          let wps: WorkpackageSimples[] = [];
          let materiais: MaterialImportacao[] = [];
          let dataInicioProjeto: Date | null = null;
          let dataFimProjeto: Date | null = null;
          let nomeProjeto = "";
          let tipoFinanciamento = "";
          let taxaFinanciamento: number | null = null;
          let overhead: number | null = null;
          let valorEti: number | null = null;

          if (sheetsData["HOME"]) {
            const dadosProjeto = extrairDadosProjeto(sheetsData["HOME"]);
            nomeProjeto = dadosProjeto.nomeProjeto;
          }

          if (sheetsData["BUDGET"]) {
            const dadosFinanciamentoExt = extrairDadosFinanciamento(sheetsData["BUDGET"]);
            tipoFinanciamento = dadosFinanciamentoExt.tipoFinanciamento;
            taxaFinanciamento = dadosFinanciamentoExt.taxaFinanciamento;
            overhead = dadosFinanciamentoExt.overhead;
            valorEti = dadosFinanciamentoExt.valorEti;
          }

          if (sheetsData["RH_Budget_SUBM"]) {
            const valorEtiRH = extrairValorEti(sheetsData["RH_Budget_SUBM"]);
            if (valorEtiRH !== null) {
              valorEti = valorEtiRH;
            }
            const resultado = extrairDadosRH(sheetsData["RH_Budget_SUBM"], utilizadores);
            wps = resultado.workpackages;
            dataInicioProjeto = resultado.dataInicioProjeto;
            dataFimProjeto = resultado.dataFimProjeto;

            const recursosNaoMatchados = wps.flatMap(wp => 
              wp.recursos.filter(r => !r.userId).map(r => ({
                nome: r.nome,
                salario: r.salario ? Math.round(r.salario) : undefined
              }))
            );

            console.log("[Importação] Recursos não matchados (inicial):", recursosNaoMatchados);

            const recursosUnicos = Array.from(new Map(
              recursosNaoMatchados.map(item => [item.nome, item])
            ).values());

            console.log("[Importação] Recursos únicos para contratação:", recursosUnicos);

            const estadoAtual : EstadoImportacao = {
              sheetsData,
              nomeProjeto,
              tipoFinanciamento,
              taxaFinanciamento,
              overhead,
              valorEti,
              workpackages: wps,
              materiais: [],
              dataInicioProjeto,
              dataFimProjeto
            };

            if (sheetsData["Outros_Budget"]) {
              materiais = extrairMateriais(sheetsData["Outros_Budget"]);
              estadoAtual.materiais = materiais;
            }

            if (wps.length > 0 && materiais.length > 0) {
               estadoAtual.workpackages = atribuirMateriaisAosWorkpackages(estadoAtual.workpackages, materiais);
            }
            
            setEstadoImportacao(estadoAtual);

            if (recursosUnicos.length > 0) {
              console.log("[Importação] Iniciando processo de contratação para:", recursosUnicos[0]);
              setRecursosNaoAssociados(recursosUnicos);
              
              // Fechar o modal de upload primeiro
              setOpen(false);
              
              // Aguardar o modal fechar completamente antes de mostrar o form de contratação
              setTimeout(() => {
                if (recursosUnicos[0]) {
                  setNovoContratadoData(recursosUnicos[0]);
                  setShouldRenderContratadoForm(true);
                  setShowContratadoForm(true);
                }
              }, 500);
              
              setIsLoading(false);
              return;
            } else {
               console.log("[Importação] Nenhum recurso por contratar. Iniciando processamento final.");
               setProcessamentoPendente(true);
            }
          } else {
             if (sheetsData["Outros_Budget"]) {
                materiais = extrairMateriais(sheetsData["Outros_Budget"]);
             }
             
             setEstadoImportacao({
                sheetsData,
                nomeProjeto,
                tipoFinanciamento,
                taxaFinanciamento,
                overhead,
                valorEti,
                workpackages: [],
                materiais,
                dataInicioProjeto: null,
                dataFimProjeto: null,
             });
             setProcessamentoPendente(true);
          }

        } catch (error) {
          console.error("[Importação] Erro no reader.onload:", error);
          toast.error("Ocorreu um erro durante a leitura dos dados do ficheiro");
          setIsLoading(false);
        } finally {
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };

      reader.onerror = () => {
        console.error("[Importação] Erro ao ler o ficheiro");
        toast.error("Erro ao ler o ficheiro");
        setIsLoading(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("[Importação] Erro GERAL na importação:", error);
      toast.error("Ocorreu um erro durante a importação");
      setIsLoading(false);
    }
  }, [dispatch, utilizadoresData, utils]);

  const handleContratadoCriado = useCallback(async (novoUserId: string) => {
    console.log("[Importação] Contratado criado callback com ID:", novoUserId);
    
    const recursosRestantes = recursosNaoAssociados.slice(1);
    setRecursosNaoAssociados(recursosRestantes);
    console.log("[Importação] Recursos restantes para processar:", recursosRestantes.length);

    if (recursosRestantes.length > 0 && recursosRestantes[0]) {
      setNovoContratadoData(recursosRestantes[0]);
      setShowContratadoForm(true);
    } else {
      console.log("[Importação] Todos os contratados foram processados. Atualizando associações...");
      setShowContratadoForm(false);
      
      await utils.utilizador.findAll.invalidate();
      const dadosUtilizadoresFinais = await utils.utilizador.findAll.fetch();
      const utilizadoresFinais = extrairUtilizadores(dadosUtilizadoresFinais);
      
      if (!utilizadoresFinais || utilizadoresFinais.length === 0) {
          console.error("[Importação] Falha ao buscar utilizadores finais após contratações.");
          toast.error("Erro ao atualizar lista de utilizadores após contratações.");
          setIsLoading(false);
          return;
      }
      
      if (!estadoImportacao) {
        console.error("[Importação] Estado de importação não encontrado após contratações.");
        toast.error("Erro interno: estado de importação perdido.");
        setIsLoading(false);
        return;
      }

      console.log("[Importação] Utilizadores FINAIS encontrados:", utilizadoresFinais.length);

      const workpackagesAtualizados = estadoImportacao.workpackages.map(wp => ({
        ...wp,
        recursos: wp.recursos.map(recurso => {
          if (recurso.userId) return recurso; 

          const utilizadorEncontrado = utilizadoresFinais.find(u => {
            const nomeUtilizador = u.name?.toLowerCase().trim() || "";
            const nomeRecurso = recurso.nome.toLowerCase().trim();
            return nomeUtilizador === nomeRecurso || 
                   nomeUtilizador.includes(nomeRecurso) || 
                   nomeRecurso.includes(nomeUtilizador) ||
                   similarity(nomeUtilizador, nomeRecurso) > 0.6;
          });

          if (utilizadorEncontrado) {
            console.log(`[Importação Final Assoc] Recurso ${recurso.nome} associado a ${utilizadorEncontrado.name} (ID: ${utilizadorEncontrado.id})`);
            return {
              ...recurso,
              userId: utilizadorEncontrado.id
            };
          } else {
             console.warn(`[Importação Final Assoc] Recurso ${recurso.nome} NÃO encontrado na lista final.`);
             return recurso;
          }
        })
      }));

      setEstadoImportacao(prev => {
        if (!prev) return null;
        console.log("[Importação] Atualizando estado com WPs finais associados.");
        return {
          ...prev,
          workpackages: workpackagesAtualizados as WorkpackageSimples[]
        };
      });

      console.log("[Importação] Triggering processamento final via useEffect.");
      setProcessamentoPendente(true); 
    }
  }, [utils.utilizador.findAll, estadoImportacao, recursosNaoAssociados]);

  const handleFinanciamentoCriado = useCallback((financiamento: FinanciamentoAPI) => {
    dispatch({
      type: "UPDATE_PROJETO",
      data: {
        financiamentoId: financiamento.id,
        overhead: new Decimal(financiamento.overhead),
        taxa_financiamento: new Decimal(financiamento.taxa_financiamento),
        valor_eti: new Decimal(financiamento.valor_eti),
      },
    });

    setDadosFinanciamento(null);
    setModalFinanciamentosAberto(false);
  }, [dispatch]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2 rounded-full bg-azul text-white shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-azul/90 hover:shadow-lg">
            <Upload className="h-4 w-4" />
            Importar Excel
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md z-[1001] bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <DialogHeader>
            <DialogTitle className="text-center">Importar Projeto a partir de Excel</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-azul/30 p-6">
              <FileSpreadsheet className="mb-3 h-12 w-12 text-azul/70" />

              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
                ref={fileInputRef}
              />

              <Button
                className="mt-2 bg-azul hover:bg-azul/90"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg
                      className="-ml-1 mr-3 h-4 w-4 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    A processar...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Upload className="mr-2 h-4 w-4" />
                    Selecionar Ficheiro Excel
                  </span>
                )}
              </Button>
              <p className="mt-2 text-center text-sm text-azul/60">
                Selecione um ficheiro Excel com o formato correto para importar automaticamente os
                dados do projeto
              </p>
            </div>

            <div className="flex items-center justify-center text-sm text-azul/70">
              <ExternalLink className="mr-1 h-4 w-4" />
              <a
                href="/templates/modelo_projeto.xlsx"
                className="underline hover:text-azul"
                download
              >
                Descarregar modelo de exemplo
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {shouldRenderContratadoForm && showContratadoForm && novoContratadoData && (
        console.log("[Importação] Renderizando FormContratado com dados:", {
          showContratadoForm,
          novoContratadoData,
          defaultValues: {
            identificacao: novoContratadoData.nome,
            salario: novoContratadoData.salario?.toString() || ""
          }
        }),
        <FormContratado
          defaultValues={{
            identificacao: novoContratadoData.nome,
            salario: novoContratadoData.salario?.toString() || ""
          }}
          onSuccess={handleContratadoCriado}
          open={showContratadoForm}
          onOpenChange={(newOpen) => {
            setShowContratadoForm(newOpen);
            if (!newOpen) {
              setTimeout(() => {
                setShouldRenderContratadoForm(false);
              }, 300);
            }
          }}
        />
      )}

      {modalFinanciamentosAberto && (
        <GerirFinanciamentosModal
          open={modalFinanciamentosAberto}
          onOpenChange={setModalFinanciamentosAberto}
          dadosPreenchidos={{
            nome: dadosFinanciamento?.nome || "",
            overhead: dadosFinanciamento?.overhead || null,
            taxa_financiamento: dadosFinanciamento?.taxa_financiamento || null,
            valor_eti: dadosFinanciamento?.valor_eti || null,
          }}
          onFinanciamentoCriado={handleFinanciamentoCriado}
        />
      )}
    </>
  );
}

function similarity(a: string, b: string): number {
  const aWords = a.toLowerCase().split(/\\s+/).filter(Boolean);
  const bWords = b.toLowerCase().split(/\\s+/).filter(Boolean);
  if (aWords.length === 0 || bWords.length === 0) return 0;
  const common = aWords.filter(word => bWords.includes(word)).length;
  return common / Math.max(aWords.length, bWords.length);
}