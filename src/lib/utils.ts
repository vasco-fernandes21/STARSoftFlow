import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, addMonths, differenceInMonths } from "date-fns";
import { pt } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function gerarMesesEntreDatas(
  dataInicio: Date,
  dataFim: Date
): {
  chave: string;
  nome: string;
  mesNumero: number;
  ano: number;
  data: Date;
  formatado: string;
}[] {
  const meses = [];
  const numMeses = differenceInMonths(dataFim, dataInicio) + 1;

  for (let i = 0; i < numMeses; i++) {
    const data = addMonths(dataInicio, i);
    const mesNumero = data.getMonth() + 1;
    const ano = data.getFullYear();
    const nome = format(data, "MMM", { locale: pt });
    const chave = `${mesNumero}-${ano}`;
    const formatado = `${nome.charAt(0).toUpperCase() + nome.slice(1, 3)}/${String(ano).slice(2)}`;

    meses.push({
      chave,
      nome,
      mesNumero,
      ano,
      data,
      formatado,
    });
  }

  return meses;
}

// --- Formatadores de valores comuns ---

/**
 * Formata um valor numérico como moeda (EUR)
 * @param valor Valor a ser formatado (pode ser null/undefined)
 * @returns String formatada como moeda (ex: €1.234,56)
 */
export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || isNaN(valor)) return "€0,00";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Formata um valor numérico como percentagem (0-100 ou 0-1)
 * @param valor Valor a ser formatado (0-100 ou 0-1)
 * @param jaEmPercentagem Se true, assume que o valor já está em percentagem (default: false)
 * @returns String formatada como percentagem (ex: 12,5%)
 */
export function formatarPercentagem(valor: number | null | undefined, jaEmPercentagem = false): string {
  if (valor === null || valor === undefined || isNaN(valor)) return "0%";
  const percent = jaEmPercentagem ? valor : valor / 100;
  return new Intl.NumberFormat("pt-PT", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(percent);
}

/**
 * Formata uma data para exibição (pt-PT)
 * @param data Data a ser formatada
 * @returns String formatada no padrão local (ex: 01/01/2025)
 */
export function formatarData(data: Date | string | null | undefined): string {
  if (data === null || data === undefined) return "N/D";
  const dataObj = typeof data === "string" ? new Date(data) : data;
  return dataObj.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export const formatarDataSegura = (
  ano: string | number,
  mes: string | number,
  formatString: string
): string => {
  try {
    const data = new Date(Number(ano), Number(mes) - 1, 1);
    return format(data, formatString, { locale: pt });
  } catch {
    return `${mes}/${ano}`;
  }
};

/**
 * Formata um número com separadores de milhar
 * @param valor Valor a ser formatado
 * @param casasDecimais Número de casas decimais (default: 0)
 * @returns String formatada com separadores (ex: 1.234)
 */
export function formatarNumero(valor: number | null | undefined, casasDecimais = 0): string {
  if (valor === null || valor === undefined || isNaN(valor)) return "0";
  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  }).format(valor);
}

/**
 * Formata um valor numérico como moeda (EUR)
 * @param valor Valor a ser formatado (pode ser null/undefined)
 * @returns String formatada como moeda (ex: €1.234,56)
 */
export function formatCurrency(valor: number | null | undefined): string {
  return formatarMoeda(valor);
}

/**
 * Formata um valor numérico como percentagem (0-100 ou 0-1)
 * @param valor Valor a ser formatado (0-100 ou 0-1)
 * @returns String formatada como percentagem (ex: 12,5%)
 */
export function formatPercentage(valor: number | null | undefined): string {
  return formatarPercentagem(valor, false);
}

/**
 * Formata um número com separadores de milhar
 * @param valor Valor a ser formatado
 * @param casasDecimais Número de casas decimais (default: 0)
 * @returns String formatada com separadores (ex: 1.234)
 */
export function formatNumber(valor: number | null | undefined, casasDecimais = 0): string {
  return formatarNumero(valor, casasDecimais);
}

// Função para agrupar alocações por ano e mês com validação
export function agruparAlocacoesPorAnoMes(
  alocacoes:
    | Array<{
        mes: number;
        ano: number;
        ocupacao: any;
      }>
    | undefined
) {
  if (!alocacoes || !Array.isArray(alocacoes)) {
    return {};
  }

  return alocacoes.reduce(
    (acc, alocacao) => {
      if (!alocacao || typeof alocacao.ano === "undefined" || typeof alocacao.mes === "undefined") {
        return acc;
      }

      const ano = alocacao.ano.toString();
      if (!acc[ano]) {
        acc[ano] = {};
      }

      // Garantir que ocupacao seja um número
      const ocupacaoNumero =
        typeof alocacao.ocupacao === "number"
          ? alocacao.ocupacao
          : typeof alocacao.ocupacao === "string"
            ? parseFloat(alocacao.ocupacao)
            : Number(alocacao.ocupacao) || 0;

      acc[ano][alocacao.mes] = ocupacaoNumero * 100;
      return acc;
    },
    {} as Record<string, Record<number, number>>
  );
}
