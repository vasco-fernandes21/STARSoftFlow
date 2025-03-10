import { type Prisma } from "@prisma/client";
import { FileText, Calendar, Euro, Briefcase, Users, CheckCircle, LucideIcon } from "lucide-react";

// Usamos o tipo base do Prisma e estendemos apenas o que precisamos
export type ProjetoCreateInput = Omit<Prisma.ProjetoCreateInput, 'workpackages' | 'financiamento'> & {
  id?: string;
  workpackages?: WorkpackageWithRelations[];
  financiamento?: Prisma.ProjetoCreateInput['financiamento'];
};

export type WorkpackageWithRelations = Omit<Prisma.WorkpackageGetPayload<{
  include: {
    tarefas: {
      include: {
        entregaveis: true
      }
    }
    materiais: true
    recursos: true
  }
}>, "projeto"> & {
  projetoId: string;
  tarefas: Array<Omit<Prisma.TarefaGetPayload<{ include: { entregaveis: true } }>, "workpackage">>;
  materiais: Array<Omit<Prisma.MaterialGetPayload<{}>, "workpackage">>;
  recursos: Array<Omit<Prisma.AlocacaoRecursoGetPayload<{}>, "workpackage" | "user">>;
};

export type TarefaWithRelations = Prisma.TarefaGetPayload<{
  include: {
    entregaveis: true
  }
}>;

export type EntregavelWithRelations = Omit<Prisma.EntregavelCreateInput, 'tarefa'> & {
  id: string;
};

export type MaterialWithRelations = Omit<Prisma.MaterialCreateInput, 'workpackage'> & {
  id: string;
};

export type AlocacaoRecursoWithRelations = {
  id: string;
  userId: string;
  mes: number;
  ano: number;
  ocupacao: number;
};

// Tipos
export type FaseType = 
  | "informacoes"
  | "financas"
  | "workpackages"
  | "recursos"
  | "resumo";

// Ordem das fases
export const fasesOrdem: readonly FaseType[] = [
  "informacoes",
  "financas",
  "workpackages",
  "recursos",
  "resumo"
] as const;

// Informações sobre cada fase
export const fases: Record<FaseType, { 
  titulo: string;
  descricao: string;
  icon: LucideIcon;
}> = {
  informacoes: {
    titulo: "Informações",
    descricao: "Detalhes básicos do projeto",
    icon: FileText
  },
  financas: {
    titulo: "Finanças",
    descricao: "Dados financeiros",
    icon: Euro
  },
  workpackages: {
    titulo: "Work Packages",
    descricao: "Estrutura do projeto",
    icon: Briefcase
  },
  recursos: {
    titulo: "Recursos",
    descricao: "Alocação de recursos",
    icon: Users
  },
  resumo: {
    titulo: "Resumo",
    descricao: "Revisão final",
    icon: CheckCircle
  }
};

export interface TabNavigationProps {
  onNavigateForward: () => void;
  onNavigateBack: () => void;
} 