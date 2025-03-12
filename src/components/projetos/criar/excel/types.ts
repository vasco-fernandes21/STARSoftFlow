export interface Alocacao {
  mes: number;
  ano: number;
  ocupacao: number;
}

export interface RecursoWorkpackage {
  userId: string;
  mes: number;
  ano: number;
  ocupacao: number;
}

export interface WorkpackageData {
  id: string;
  nome: string;
  descricao: string | null;
  inicio: Date;
  fim: Date;
  estado: string;
  recursos: RecursoWorkpackage[];
}

export interface RecursoAlocacao {
  nome: string;
  alocacoes: {
    [workpackage: string]: Alocacao[];
  };
  totaisPorAno: {
    [ano: number]: number;
  };
}

export interface ProcessedData {
  workpackages: WorkpackageData[];
  alocacoes: { [key: string]: RecursoAlocacao };
}
