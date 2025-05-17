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
        taxaFinanciamento = Number((linha[7] * 100).toFixed(2)); // Limitar a 2 casas decimais
      } else if (linha[6] === "Custos indiretos" && typeof linha[7] === "number") {
        overhead = Number((linha[7] * 100).toFixed(2)); // Limitar a 2 casas decimais
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

  // Função de similaridade (pode ser movida para fora se usada em mais locais)
  function similarity(a: string, b: string) {
    const aWords = a.toLowerCase().split(/\s+/).filter(Boolean);
    const bWords = b.toLowerCase().split(/\s+/).filter(Boolean);
    if (aWords.length === 0 || bWords.length === 0) return 0;
    const common = aWords.filter(word => bWords.includes(word)).length;
    return common / Math.max(aWords.length, bWords.length);
  }

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
    const isContratadoGenerico = /^contratado\s+\d+$/i.test(nomeRecursoLower);

    if (!isContratadoGenerico) {
      // Se NÃO for um contratado genérico, tentar encontrar correspondência
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
      
      // Considera match se pelo menos 60% das palavras coincidirem
      if (bestScore >= 0.6) {
        userId = bestMatch.id;
      } else {
        // fallback: tentar includes (como antes), mas talvez mais restritivo?
        const potentialMatches = utilizadores.filter(u => {
          const dbNameTrimmedLower = u.name?.trim().toLowerCase();
          // Apenas faz match se o nome da DB incluir exatamente o nome lido (evita matches parciais indesejados)
          return dbNameTrimmedLower?.includes(nomeRecursoLower) || nomeRecursoLower.includes(dbNameTrimmedLower ?? ""); 
        });
        if (potentialMatches.length === 1) {
          userId = potentialMatches[0]?.id || null;
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