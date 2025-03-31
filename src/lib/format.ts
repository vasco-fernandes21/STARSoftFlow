/**
 * Formata um valor numérico como moeda (EUR)
 * @param value Valor a ser formatado
 * @returns String formatada como moeda (ex: €1.234,56)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata um valor numérico como percentagem
 * @param value Valor a ser formatado (0-100)
 * @returns String formatada como percentagem (ex: 12,5%)
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

/**
 * Formata um número com separadores de milhar
 * @param value Valor a ser formatado
 * @returns String formatada com separadores (ex: 1.234)
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
} 