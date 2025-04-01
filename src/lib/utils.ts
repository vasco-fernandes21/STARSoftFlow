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

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
