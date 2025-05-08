import type { Prisma, Rubrica } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import { FileText, Euro, Briefcase, Users, CheckCircle } from "lucide-react";
import type { Decimal } from "@prisma/client/runtime/library";

// Usamos o tipo base do Prisma e estendemos apenas o que precisamos
export type ProjetoCreateInput = Omit<
  Prisma.ProjetoCreateInput,
  "workpackages" | "financiamento"
> & {
  id?: string;
  workpackages?: WorkpackageWithRelations[];
  financiamento?: Prisma.ProjetoCreateInput["financiamento"];
  overhead?: Decimal | number;
  taxa_financiamento?: Decimal | number;
  valor_eti?: Decimal | number;
  financiamentoId?: number;
};

export type WorkpackageWithRelations = Omit<
  Prisma.WorkpackageGetPayload<{
    include: {
      tarefas: {
        include: {
          entregaveis: true;
        };
      };
      materiais: true;
      recursos: {
        include: {
          user: true;
        };
      };
    };
  }>,
  "projeto"
> & {
  projetoId: string;
  tarefas: Array<Omit<Prisma.TarefaGetPayload<{ include: { entregaveis: true } }>, "workpackage">>;
  materiais: Array<Omit<Prisma.MaterialGetPayload<{}>, "workpackage">>;
  recursos: Array<
    Omit<
      Prisma.AlocacaoRecursoGetPayload<{
        include: { user: true };
      }>,
      "workpackage"
    >
  >;
};

export type TarefaWithRelations = Prisma.TarefaGetPayload<{
  include: {
    entregaveis: true;
  };
}>;

export type EntregavelWithRelations = Omit<Prisma.EntregavelCreateInput, "tarefa"> & {
  id: string;
  estado?: boolean;
  data?: Date | null;
  anexo?: string | null;
};

export type MaterialWithRelations = Omit<Prisma.MaterialCreateInput, "workpackage"> & {
  id: number;
  nome: string;
  preco: Decimal | number;
  quantidade: number;
  ano_utilizacao: number;
  rubrica: Rubrica;
};

// Atualizado para corresponder à estrutura real da tabela com chave composta
export type AlocacaoRecursoWithRelations = Omit<
  Prisma.AlocacaoRecursoCreateInput,
  "workpackage" | "user"
> & {
  userId: string;
  workpackageId: string;
  mes: number;
  ano: number;
  ocupacao: Decimal | number;
  user?: Prisma.UserGetPayload<{}>;
};

// Tipo completo do Workpackage com todas as relações (para uso em componentes)
export type WorkpackageCompleto = Prisma.WorkpackageGetPayload<{
  include: {
    projeto: true;
    tarefas: {
      include: {
        entregaveis: true;
      };
    };
    materiais: true;
    recursos: {
      include: {
        user: true;
      };
    };
  };
}>;

// Tipo completo do Projeto com todas as relações (para uso em componentes)
export type ProjetoCompleto = Prisma.ProjetoGetPayload<{
  include: {
    financiamento: true;
    workpackages: {
      include: {
        tarefas: {
          include: {
            entregaveis: true;
          };
        };
        materiais: true;
        recursos: {
          include: {
            user: true;
          };
        };
      };
    };
  };
}> & {
  progresso?: number;
};

// Tipos
export type FaseType = "informacoes" | "financas" | "workpackages" | "recursos" | "resumo";

// Ordem das fases
export const fasesOrdem: readonly FaseType[] = [
  "informacoes",
  "financas",
  "workpackages",
  "recursos",
  "resumo",
] as const;

// Informações sobre cada fase
export const fases: Record<
  FaseType,
  {
    titulo: string;
    descricao: string;
    icon: LucideIcon;
  }
> = {
  informacoes: {
    titulo: "Informações",
    descricao: "Detalhes básicos do projeto",
    icon: FileText,
  },
  financas: {
    titulo: "Finanças",
    descricao: "Dados financeiros",
    icon: Euro,
  },
  workpackages: {
    titulo: "Workpackages",
    descricao: "Estrutura do projeto",
    icon: Briefcase,
  },
  recursos: {
    titulo: "Recursos",
    descricao: "Alocação de recursos",
    icon: Users,
  },
  resumo: {
    titulo: "Resumo",
    descricao: "Revisão final",
    icon: CheckCircle,
  },
};

export interface TabNavigationProps {
  onNavigateForward: () => void;
  onNavigateBack: () => void;
}
