import { formatarMoeda, formatarNumero } from "@/lib/formatters";

// --- Formatting Functions ---
export const formatNumber = (value: number | undefined | null, fractionDigits = 2): string => {
  if (typeof value !== "number" || isNaN(value)) return "-";
  if (fractionDigits === 0) return formatarNumero(value);
  return value.toLocaleString("pt-PT", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

export const formatCurrency = (value: number | undefined | null): string => {
  if (typeof value !== "number" || isNaN(value)) return "- €";
  return formatarMoeda(value);
};

export const formatPercentage = (value: number | undefined | null, fractionDigits = 1): string => {
  if (typeof value !== "number" || isNaN(value)) return "-";
  const percentValue = Math.abs(value) > 1 ? value / 100 : value;
  return percentValue.toLocaleString("pt-PT", {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};
// --- End Formatting Functions --- 