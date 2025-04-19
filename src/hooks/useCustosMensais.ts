import { useQuery } from '@tanstack/react-query';

interface CustoMensal {
  mes: string;
  estimado: number;
  realizado: number;
}

export function useCustosMensais(projetoId: string, ano: string) {
  return useQuery<CustoMensal[]>({
    queryKey: ['custos-mensais', projetoId, ano],
    queryFn: async () => {
      const res = await fetch(`/api/projetos/${projetoId}/custos?ano=${ano}`);
      if (!res.ok) throw new Error('Erro ao carregar dados');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // dados ficam fresh por 5 minutos
  });
} 