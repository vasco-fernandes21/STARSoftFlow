/**
 * Formatadores de valores comuns para exibição na UI
 */

/**
 * Formata um valor numérico como moeda (EUR)
 * @param valor Valor a ser formatado
 * @returns String formatada como moeda (ex: €1.234,56)
 */
export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "€0,00";
  
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Formata um valor numérico como percentagem
 * @param valor Valor a ser formatado (0-100)
 * @returns String formatada como percentagem (ex: 12,5%)
 */
export function formatarPercentagem(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "0%";
  
  return new Intl.NumberFormat("pt-PT", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(valor / 100);
}

/**
 * Formata uma data para exibição
 * @param data Data a ser formatada
 * @returns String formatada no padrão local (ex: 01/01/2025)
 */
export function formatarData(data: Date | string | null | undefined): string {
  if (data === null || data === undefined) return "N/D";
  
  // Converter string para Date se necessário
  const dataObj = typeof data === "string" ? new Date(data) : data;
  
  return dataObj.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formata um número com separadores de milhar
 * @param valor Valor a ser formatado
 * @returns String formatada com separadores (ex: 1.234)
 */
export function formatarNumero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "0";
  
  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
} 