import * as XLSX from "xlsx";
import { Decimal } from "decimal.js";
import type { Rubrica, Material as PrismaMaterial } from "@prisma/client";

// Interfaces e Tipos
export interface Alocacao {
  mes: number;
  ano: number;
  percentagem: number;
}

export interface Recurso {
  nome: string;
  userId: string | null;
  alocacoes: Alocacao[];
  salario?: number;
}

export interface EstadoImportacao {
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

export type MaterialImportacao = Pick<
  PrismaMaterial,
  "nome" | "preco" | "quantidade" | "ano_utilizacao" | "rubrica"
> & {
  workpackageNome: string;
  descricao?: string | null;
  estado?: boolean;
};

export interface WorkpackageSimples {
  codigo: string;
  nome: string;
  recursos: Recurso[];
  materiais: MaterialImportacao[];
  dataInicio: Date | null;
  dataFim: Date | null;
}

// Tipo para o que vem da API
export type FinanciamentoAPI = {
  id: number;
  nome: string;
  overhead: string;
  taxa_financiamento: string;
  valor_eti: string;
};

// Funções Utilitárias
export function mapearRubrica(rubricaExcel: string): Rubrica {
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

export function excelDateToJS(excelDate: number) {
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return {
    mes: date.getMonth() + 1,
    ano: date.getFullYear(),
  };
}

// New utility to convert Excel serial to JS Date object
export function excelSerialToDate(serial: number): Date {
  const utcMilliseconds = (serial - 25569) * 86400 * 1000;
  return new Date(utcMilliseconds);
}

// Utility function for string similarity (moved to top level for wider use)
function similarity(a: string, b: string): number {
  const aLower = a.toLowerCase().split(/[\s-]+/).filter(Boolean); // Corrected variable name and regex
  const bLower = b.toLowerCase().split(/[\s-]+/).filter(Boolean); // Corrected regex
  if (aLower.length === 0 || bLower.length === 0) return 0;

  const setA = new Set(aLower);
  const setB = new Set(bLower);
  let intersectionSize = 0;
  for (const word of setA) {
    if (setB.has(word)) {
      intersectionSize++;
    }
  }
  if (intersectionSize === 0) return 0; // Avoid division by zero if no intersection
  // Using a Jaccard-like index
  return intersectionSize / (setA.size + setB.size - intersectionSize);
}

export function converterExcelParaJson(workbook: XLSX.WorkBook): {
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
export function extrairDadosProjeto(dados: any[][]) {
  let nomeProjeto = "";
  for (const linha of dados) {
    if (linha && linha.length >= 2 && linha[0] === "Nome do projeto ") {
      nomeProjeto = linha[1];
      break;
    }
  }
  return { nomeProjeto };
}

export function extrairDadosFinanciamento(dadosBudget: any[][]): {
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
        taxaFinanciamento = Number(linha[7].toFixed(2)); // Limitar a 2 casas decimais, sem multiplicar
      } else if (linha[6] === "Custos indiretos" && typeof linha[7] === "number") {
        overhead = Number(linha[7].toFixed(2)); // Limitar a 2 casas decimais, sem multiplicar
      }
    }
  }

  return { tipoFinanciamento, taxaFinanciamento, overhead, valorEti };
}

export function extrairValorEti(dadosRH: any[][]): number | null {
  for (let i = 0; i < dadosRH.length; i++) {
    const row = dadosRH[i];
    if (!row || row.length < 6) continue;

    if (row[4] && typeof row[4] === "string" && row[5] && typeof row[5] === "number") {
      return Number(Number(row[5]).toFixed(2)); // Limitar a 2 casas decimais
    }
  }
  return null;
}

export function extrairMateriais(data: any[][]): MaterialImportacao[] {
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

export function extrairUtilizadores(apiResponse: any): any[] {
  if (!apiResponse) {
    return [];
  }

  const possiveisLocais = [
    apiResponse?.result?.data?.json?.items,
    apiResponse?.items,
    apiResponse?.json?.items,
    apiResponse?.json,
    Array.isArray(apiResponse) ? apiResponse : null
  ];

  for (const local of possiveisLocais) {
    if (Array.isArray(local) && local.length > 0) {
      return local;
    }
  }

  return [];
}

export function extrairDadosRH(data: any[][], utilizadores: any[]): { workpackages: WorkpackageSimples[]; dataInicioProjeto: Date | null; dataFimProjeto: Date | null; } {
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

  // Log temporário: primeiro passo para coletar todos os nomes de recursos lidos
  const recursosLidosRH = new Set<string>();
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 3) continue;

    // Detetar início de WP
    const wpColInfo = findWPCodeAndName(row);
    if (wpColInfo.idxCodigoWP !== -1) {
      currentWPIndices = wpColInfo;
      continue;
    }

    if (currentWPIndices.idxNomeRecurso === -1) continue;

    const nomeRecurso = row[currentWPIndices.idxNomeRecurso];
    if (typeof nomeRecurso === 'string' && 
        nomeRecurso.trim() !== '' && 
        !nomeRecurso.toLowerCase().includes('total') && 
        !nomeRecurso.toLowerCase().includes('subtotal') &&
        !nomeRecurso.toLowerCase().includes('células cinza')) {
      recursosLidosRH.add(nomeRecurso.trim());
    }
  }
  
  console.log(`[extrairDadosRH] RECURSOS DISTINTOS LIDOS:`, Array.from(recursosLidosRH).sort());

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

    let userId: string | null = null;
    const nomeRecursoLower = nomeRecurso.toLowerCase().trim();
    
    // Verificar se o nome corresponde ao padrão "Contratado X"
    const isContratadoGenerico = /^contratado(\s+\d+)?$/i.test(nomeRecursoLower);

    if (!isContratadoGenerico) {
      console.log(`[extrairDadosRH] A processar recurso: '${nomeRecurso}' (lower: '${nomeRecursoLower}')`);
      
      // Para recursos específicos como "Contratação MSc - Ambiente", fazer matching exato primeiro
      let exactMatch: any = null;
      for (const u of utilizadores) {
        const dbName = u.name?.trim();
        if (!dbName) continue;
        
        // Tentativa de match exato (case-insensitive)
        if (dbName.toLowerCase() === nomeRecursoLower) {
          exactMatch = u;
          break;
        }
      }
      
      if (exactMatch) {
        userId = exactMatch.id;
        console.log(`[extrairDadosRH] Recurso '${nomeRecurso}' matched exactly to '${exactMatch.name}'.`);
      } else {
        // Se não houver match exato, tentar similaridade mas com threshold mais alto para recursos específicos
        let bestMatch: any = null;
        let bestScore = 0.0;
        
        // Para recursos que começam com "Contratação", usar threshold mais alto para evitar matches incorretos
        const isContratacaoEspecifica = nomeRecursoLower.startsWith("contratação");
        const thresholdSimilarity = isContratacaoEspecifica ? 0.85 : 0.6;
        
        for (const u of utilizadores) {
          const dbName = u.name?.trim().toLowerCase();
          if (!dbName) continue;
          const score = similarity(nomeRecursoLower, dbName);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = u;
          }
        }
        
        if (bestScore >= thresholdSimilarity) {
          userId = bestMatch.id;
          console.log(`[extrairDadosRH] Recurso '${nomeRecurso}' matched by similarity (${bestScore.toFixed(3)}) to '${bestMatch.name}'.`);
        } else {
          // Para recursos específicos como "Contratação MSc - X", não fazer fallback com includes
          // porque pode causar matches incorretos entre especializações diferentes
          if (!isContratacaoEspecifica) {
            // Fallback apenas para recursos que não começam com "Contratação"
            const potentialMatches = utilizadores.filter(u => {
              const dbNameTrimmedLower = u.name?.trim().toLowerCase();
              return dbNameTrimmedLower?.includes(nomeRecursoLower) || nomeRecursoLower.includes(dbNameTrimmedLower ?? ""); 
            });
            if (potentialMatches.length === 1) {
              userId = potentialMatches[0]?.id || null;
              console.log(`[extrairDadosRH] Recurso '${nomeRecurso}' matched by fallback to '${potentialMatches[0]?.name}'.`);
            } else if (potentialMatches.length > 1) {
              console.warn(`[extrairDadosRH] Recurso '${nomeRecurso}' had multiple fallback matches. UserId remains null.`);
            } else {
              console.warn(`[extrairDadosRH] Recurso '${nomeRecurso}' had best similarity score ${bestScore.toFixed(3)} with '${bestMatch?.name}', below threshold. UserId remains null.`);
            }
          } else {
            console.log(`[extrairDadosRH] Recurso específico de contratação '${nomeRecurso}' não encontrou match adequado. UserId será null para criar novo recurso.`);
          }
        }
      }
    } else {
       console.log(`[extrairDadosRH] Recurso '${nomeRecurso}' identificado como contratado genérico. Não será associado automaticamente.`);
       // Se for "Contratado X", userId permanece null, forçando a criação.
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
      userId, // userId será null se for contratado genérico ou se não houver match
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

export function atribuirMateriaisAosWorkpackages(
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

// --- NEW FUNCTION FOR "REPORT" SHEET ---
interface ReportParseResult {
  dataInicioProjeto: Date | null;
  dataFimProjeto: Date | null;
  workpackages: WorkpackageSimples[];
  nomeProjeto: string | null;
  taxaFinanciamento: number | null;
}

export function processReportSheetData(
  reportSheetData: any[][],
  utilizadoresSistema: any[]
): ReportParseResult {
  let dataInicioProjeto: Date | null = null;
  let dataFimProjeto: Date | null = null;
  let nomeProjeto: string | null = null;
  let taxaFinanciamento: number | null = null;
  const workpackagesMap = new Map<string, WorkpackageSimples>();

  // 1. Extract global project data from the top of the sheet
  for (const row of reportSheetData) {
    if (Array.isArray(row) && row.length >= 2) {
      if (row[0] === "Data de arranque:" && typeof row[1] === 'number') {
        dataInicioProjeto = excelSerialToDate(row[1]);
      } else if (row[0] === "Data de conclusão:" && typeof row[1] === 'number') {
        dataFimProjeto = excelSerialToDate(row[1]);
      } else if (row[0] === "Nome Projeto:" && typeof row[1] === 'string') {
        nomeProjeto = row[1].trim();
      } else if (row[0] === "Taxa de financiamento:" && typeof row[1] === 'number') {
        // Assuming the rate in Excel is like 0.85 for 85%
        taxaFinanciamento = parseFloat((row[1] * 100).toFixed(2));
      }
    }
  }

  // 2. Find the monthly date header row and the start of the allocation data
  let monthlyDateHeaderRowIndex = -1;
  let allocationDataStartIndex = -1;
  const monthlyColumnMap: { col: number; date: Date }[] = [];

  for (let i = 0; i < reportSheetData.length; i++) {
    const row = reportSheetData[i];
    if (!Array.isArray(row)) continue;

    // Heuristic for monthly date header: starts with "Recursos", "Atividades", then has Excel dates
    if (typeof row[0] === 'string' && row[0].trim() === "Recursos" &&
        typeof row[1] === 'string' && row[1].trim() === "Atividades") {
      
      let firstDateColumn = -1;
      // Scan for the first column that looks like an Excel date (large number)
      // Typically, there are summary columns (TOTAL, 2025, 2026, etc.) before actual month dates
      for (let j = 2; j < row.length; j++) { 
        if (typeof row[j] === 'number' && row[j] > 40000 && row[j] < 60000) { // Plausible Excel date range
          firstDateColumn = j;
          break;
        }
      }

      if (firstDateColumn !== -1) {
        monthlyDateHeaderRowIndex = i;
        allocationDataStartIndex = i + 1; // Data rows start immediately after this header
        for (let col = firstDateColumn; col < row.length; col++) {
          if (typeof row[col] === 'number' && row[col] > 40000 && row[col] < 60000) {
            monthlyColumnMap.push({ col, date: excelSerialToDate(row[col]) });
          } else if (monthlyColumnMap.length > 0) {
            // If we started finding dates and then hit a non-date, stop for this row.
            break;
          }
        }
        if (monthlyColumnMap.length > 0) break; // Found the header and mapped month columns
      }
    }
  }

  if (allocationDataStartIndex === -1 || monthlyColumnMap.length === 0) {
    console.warn("[processReportSheetData] Could not reliably find monthly date headers or allocation data section for the REPORT sheet.");
    return { dataInicioProjeto, dataFimProjeto, workpackages: [], nomeProjeto, taxaFinanciamento };
  }
  
  // Log temporário: mostrar todos os nomes de recursos lidos
  const recursosLidos = new Set<string>();
  for (let i = allocationDataStartIndex; i < reportSheetData.length; i++) {
    const row = reportSheetData[i];
    if (!Array.isArray(row) || row.length < 2 || typeof row[0] !== 'string' || typeof row[1] !== 'string') {
      if(Array.isArray(row) && typeof row[0] === 'string' && row[0].trim().toLowerCase() === 'total') break;
      if(Array.isArray(row) && row.every(cell => cell === null || cell === undefined || cell === '')) break;
      continue;
    }

    const resourceNameRaw = row[0].trim();
    const activityNameRaw = row[1].trim();

    if (resourceNameRaw === '' || activityNameRaw === '' || 
        resourceNameRaw.toLowerCase().includes('total') || activityNameRaw.toLowerCase().includes('total') ||
        resourceNameRaw.toLowerCase().startsWith("subtotal") || activityNameRaw.toLowerCase().startsWith("subtotal")) {
      continue;
    }
    
    recursosLidos.add(resourceNameRaw);
  }
  
  console.log(`[processReportSheetData] RECURSOS DISTINTOS LIDOS:`, Array.from(recursosLidos).sort());
  
  // 3. Parse allocations
  for (let i = allocationDataStartIndex; i < reportSheetData.length; i++) {
    const row = reportSheetData[i];
    if (!Array.isArray(row) || row.length < 2 || typeof row[0] !== 'string' || typeof row[1] !== 'string') {
      // If the first cell isn't a string (e.g. empty row, or a total sum row that's not string-labeled)
      // or if it's an empty array, assume end of data or irrelevant row.
      if(Array.isArray(row) && typeof row[0] === 'string' && row[0].trim().toLowerCase() === 'total') break; // Stop if we explicitly hit a "Total" row
      if(Array.isArray(row) && row.every(cell => cell === null || cell === undefined || cell === '')) break; // Stop on completely empty/null rows
      continue;
    }

    const resourceNameRaw = row[0].trim();
    const activityNameRaw = row[1].trim();

    if (resourceNameRaw === '' || activityNameRaw === '' || 
        resourceNameRaw.toLowerCase().includes('total') || activityNameRaw.toLowerCase().includes('total') ||
        resourceNameRaw.toLowerCase().startsWith("subtotal") || activityNameRaw.toLowerCase().startsWith("subtotal")) {
      continue; // Skip summary/total lines within the data block
    }
    
    let wp = workpackagesMap.get(activityNameRaw);
    if (!wp) {
      // Default: code is full name, name is full name
      let finalCodigo = activityNameRaw;
      // Tentar extrair o código, mas o nome é sempre o texto integral
      const pattern = /^([A-Za-z0-9\.\-]+)\s+(.+)$/;
      const parts = activityNameRaw.match(pattern);
      if (parts && parts[1]) {
        finalCodigo = parts[1];
      }
      wp = {
        codigo: finalCodigo,
        nome: activityNameRaw, // SEMPRE o texto integral
        recursos: [],
        materiais: [],
        dataInicio: null,
        dataFim: null,
      };
      workpackagesMap.set(activityNameRaw, wp); // Still use original full name as map key
    }

    let userId: string | null = null;
    const resourceNameLower = resourceNameRaw.toLowerCase();
    
    // Identificar recursos genéricos apenas se forem exatamente "Contratado" ou "Contratado X"
    const isContratadoGenerico = /^contratado(\s+\d+)?$/i.test(resourceNameLower);

    if (!isContratadoGenerico) {
      console.log(`[processReportSheetData] A processar recurso: '${resourceNameRaw}' (lower: '${resourceNameLower}')`);
      
      // Para recursos específicos como "Contratação MSc - Ambiente", fazer matching exato primeiro
      let exactMatch: any = null;
      for (const u of utilizadoresSistema) {
        const dbName = u.name?.trim();
        if (!dbName) continue;
        
        // Tentativa de match exato (case-insensitive)
        if (dbName.toLowerCase() === resourceNameLower) {
          exactMatch = u;
          break;
        }
      }
      
      if (exactMatch) {
        userId = exactMatch.id;
        console.log(`[processReportSheetData] Recurso '${resourceNameRaw}' matched exactly to '${exactMatch.name}'.`);
      } else {
        // Se não houver match exato, tentar similaridade mas com threshold mais alto para recursos específicos
        let bestMatch: any = null;
        let bestScore = -1;
        
        // Para recursos que começam com "Contratação", usar threshold mais alto para evitar matches incorretos
        const isContratacaoEspecifica = resourceNameLower.startsWith("contratação");
        const thresholdSimilarity = isContratacaoEspecifica ? 0.85 : 0.6; // Threshold mais alto para "Contratação"
        
        for (const u of utilizadoresSistema) {
          const dbName = u.name?.trim().toLowerCase();
          if (!dbName) continue;
          const score = similarity(resourceNameLower, dbName);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = u;
          }
        }
        
        if (bestScore >= thresholdSimilarity) {
          userId = bestMatch.id;
          console.log(`[processReportSheetData] Recurso '${resourceNameRaw}' matched by similarity (${bestScore.toFixed(3)}) to '${bestMatch.name}'.`);
        } else {
          // Para recursos específicos como "Contratação MSc - X", não fazer fallback com includes
          // porque pode causar matches incorretos entre especializações diferentes
          if (isContratacaoEspecifica) {
            console.log(`[processReportSheetData] Recurso específico '${resourceNameRaw}' não encontrou match adequado. UserId será null para criar novo recurso.`);
          } else {
            // Fallback para outros tipos de recursos (não "Contratação")
            const potentialMatches = utilizadoresSistema.filter(u => {
              const dbNameTrimmedLower = u.name?.trim().toLowerCase();
              return dbNameTrimmedLower?.includes(resourceNameLower) || resourceNameLower.includes(dbNameTrimmedLower ?? "");
            });
            
            if (potentialMatches.length === 1) {
              userId = potentialMatches[0]?.id || null;
              console.log(`[processReportSheetData] Recurso '${resourceNameRaw}' matched by fallback to '${potentialMatches[0]?.name}'.`);
            } else if (potentialMatches.length > 1) {
              console.warn(`[processReportSheetData] Recurso '${resourceNameRaw}' had multiple fallback matches. UserId remains null.`);
            } else {
              console.warn(`[processReportSheetData] Recurso '${resourceNameRaw}' had best similarity score ${bestScore.toFixed(3)} with '${bestMatch?.name}', below threshold. UserId remains null.`);
            }
          }
        }
      }
    } else {
      console.log(`[processReportSheetData] Recurso '${resourceNameRaw}' identified as generic contractor. UserId will be null, new resource to be created.`);
    }
    
    const recurso: Recurso = {
      nome: resourceNameRaw,
      userId,
      alocacoes: [],
      // Salario not parsed from this sheet structure based on current request
    };

    let currentWpMinDate: Date | null = wp.dataInicio;
    let currentWpMaxDate: Date | null = wp.dataFim;

    for (const { col, date: monthDate } of monthlyColumnMap) {
      const percentageVal = row[col];
      if (typeof percentageVal === 'number' && !isNaN(percentageVal) && percentageVal > 0) {
        // Ensure percentage is capped at 100% if it's > 1 (e.g. 50 for 50%)
        // If it's <=1 (e.g. 0.5 for 50%), multiply by 100.
        const actualPercentage = percentageVal <= 1 && percentageVal > 0 ? percentageVal * 100 : percentageVal;
        const roundedPercentage = parseFloat(actualPercentage.toFixed(2));

        recurso.alocacoes.push({
          mes: monthDate.getUTCMonth() + 1,
          ano: monthDate.getUTCFullYear(),
          percentagem: roundedPercentage,
        });

        const monthStartDate = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1));
        
        // Para o REPORT, tanto dataInicio como dataFim são o primeiro dia do mês
        if (!currentWpMinDate || monthStartDate < currentWpMinDate) {
          currentWpMinDate = monthStartDate;
        }
        if (!currentWpMaxDate || monthStartDate > currentWpMaxDate) {
          currentWpMaxDate = monthStartDate;
        }
      }
    }

    if (recurso.alocacoes.length > 0) {
      const existingRecursoIndex = wp.recursos.findIndex(r => r.nome === recurso.nome && r.userId === recurso.userId);
      if (existingRecursoIndex !== -1 && wp.recursos[existingRecursoIndex]) {
         // This case should ideally not happen if each row is unique resource+activity in the source
         console.warn(`[processReportSheetData] Duplicate resource entry found for ${recurso.nome} in WP ${wp.nome}. Merging allocations.`);
         wp.recursos[existingRecursoIndex]!.alocacoes.push(...recurso.alocacoes);
         // Sort allocations by date after merge if necessary
          wp.recursos[existingRecursoIndex]!.alocacoes.sort((a,b) => new Date(a.ano, a.mes -1).getTime() - new Date(b.ano, b.mes-1).getTime());

      } else {
        wp.recursos.push(recurso);
      }
      wp.dataInicio = currentWpMinDate;
      wp.dataFim = currentWpMaxDate;
    }
  }

  return {
    dataInicioProjeto,
    dataFimProjeto,
    workpackages: Array.from(workpackagesMap.values()).filter(wp => wp.recursos.length > 0 || (wp.dataInicio && wp.dataFim)), // Only return WPs with resources or derived dates
    nomeProjeto,
    taxaFinanciamento,
  };
} 