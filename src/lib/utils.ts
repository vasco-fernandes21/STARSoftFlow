import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, addMonths, differenceInMonths } from "date-fns";
import { pt, ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function gerarMesesEntreDatas(dataInicio: Date, dataFim: Date): {
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
    const nome = format(data, 'MMM', { locale: pt });
    const chave = `${mesNumero}-${ano}`;
    const formatado = `${nome.charAt(0).toUpperCase() + nome.slice(1, 3)}/${String(ano).slice(2)}`;
    
    meses.push({
      chave,
      nome,
      mesNumero,
      ano,
      data,
      formatado
    });
  }
  
  return meses;
} 


export const formatarDataSegura = (ano: string | number, mes: string | number, formatString: string): string => {
  try {
    const data = new Date(Number(ano), Number(mes) - 1, 1);
    return format(data, formatString, { locale: pt });
  } catch (error) {
    return `${mes}/${ano}`;
  }
};
