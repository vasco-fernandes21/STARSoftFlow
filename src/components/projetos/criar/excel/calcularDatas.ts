export function calcularDataInicio(planStart: number): Date {
  const ano = 2024;
  return new Date(ano, planStart - 1, 1);
}

export function calcularDataFim(planStart: number, planDuration: number): Date {
  const inicio = calcularDataInicio(planStart);
  return new Date(inicio.getFullYear(), inicio.getMonth() + planDuration, 0);
}
