export type ViewMode = 'real' | 'submetido';

export interface AlocacaoRecurso {
  mes: number;
  ano: number;
  ocupacao: number;
  workpackageId: string;
  workpackageNome: string;
  projetoId: string;
  projetoNome: string;
}

export interface WorkpackageAprovado {
  id: string;
  nome: string;
  recursos: {
    mes: number;
    ano: number;
    ocupacao: number;
  }[];
}

export interface ProjetoAprovado {
  workpackages: WorkpackageAprovado[];
} 