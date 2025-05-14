/**
 * Formats a number with specified decimal places
 */
export const formatNumber = (value: number | undefined | null, fractionDigits = 2): string => {
  if (typeof value !== "number" || isNaN(value)) return "-";
  return value.toLocaleString("pt-PT", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

/**
 * Formats a number as currency (EUR)
 */
export const formatCurrency = (value: number | undefined | null): string => {
  if (typeof value !== "number" || isNaN(value)) return "- €";
  return value.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formats a number as percentage
 */
export const formatPercentage = (value: number | undefined | null, fractionDigits = 1): string => {
  if (typeof value !== "number" || isNaN(value)) return "-";
  // Handle both decimal (0.xx) and whole number (xx) percentage formats
  const percentValue = Math.abs(value) > 1 ? value / 100 : value;
  return percentValue.toLocaleString("pt-PT", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}; 