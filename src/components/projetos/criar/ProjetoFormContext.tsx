import { createContext, useContext, useReducer, type ReactNode, useEffect } from "react";
import {
  type Prisma,
  type Projeto,
  type Workpackage,
  type Tarefa,
  type Entregavel,
  type Material,
  type AlocacaoRecurso,
  type User,
  type ProjetoTipo,
} from "@prisma/client";
import { Decimal } from "decimal.js";
import { useSession } from "next-auth/react";

// Tipo para o responsável com campos relevantes
type ResponsavelInfo = {
  id: string;
  name: string | null;
  email: string | null;
  permissao: User["permissao"];
};

// Tipo para utilizador temporário do projeto
export type UtilizadorState = {
  id: string;
  nome: string;
  email: string;
  permissao?: string;
};

// Definir tipos para o estado
type EntregavelState = Omit<Entregavel, "tarefaId">;
type TarefaState = Omit<Tarefa, "workpackageId"> & { entregaveis: EntregavelState[] };
type MaterialState = Omit<Material, "workpackageId">;
// Remover AlocacaoRecursoState, pois não é utilizado diretamente
type RecursoState = Omit<AlocacaoRecurso, "workpackageId" | "id">;
type WorkpackageState = Omit<Workpackage, "projetoId"> & {
  tarefas: TarefaState[];
  materiais: MaterialState[];
  recursos: RecursoState[];
};

// Exportar os tipos necessários
export type { EntregavelState, TarefaState, MaterialState, RecursoState, WorkpackageState };

// Tipo base do estado usando o modelo Projeto do Prisma
export type ProjetoState = Omit<Projeto, "id" | "responsavel" | "responsavelId"> & {
  responsavel: ResponsavelInfo | null;
  workpackages: WorkpackageState[];
  aprovado: boolean | null;
  tipo: ProjetoTipo;
  utilizadores: UtilizadorState[];
};

// Estado inicial mais limpo
const initialState: ProjetoState = {
  nome: "",
  descricao: "",
  inicio: null,
  fim: null,
  estado: "RASCUNHO",
  overhead: new Decimal(0),
  taxa_financiamento: new Decimal(0),
  valor_eti: new Decimal(0),
  financiamentoId: null,
  responsavel: null,
  workpackages: [],
  aprovado: false,
  tipo: "STANDARD" as ProjetoTipo,
  utilizadores: [],
};

// Ações atualizadas usando os tipos do Prisma
type ProjetoFormAction =
  | {
      type: "SET_FIELD";
      field: keyof Omit<ProjetoState, "workpackages" | "responsavel" | "utilizadores">;
      value: any;
    }
  | { type: "SET_RESPONSAVEL"; responsavel: ResponsavelInfo | null }
  | { type: "ADD_WORKPACKAGE"; workpackage: WorkpackageState }
  | { type: "UPDATE_WORKPACKAGE"; id: string; data: Partial<WorkpackageState> }
  | { type: "REMOVE_WORKPACKAGE"; id: string }
  | { type: "ADD_TAREFA"; workpackageId: string; tarefa: TarefaState }
  | { type: "UPDATE_TAREFA"; workpackageId: string; tarefaId: string; data: Partial<TarefaState> }
  | { type: "REMOVE_TAREFA"; workpackageId: string; tarefaId: string }
  | { type: "ADD_MATERIAL"; workpackageId: string; material: MaterialState }
  | {
      type: "UPDATE_MATERIAL";
      workpackageId: string;
      materialId: number;
      data: Partial<MaterialState>;
    }
  | { type: "REMOVE_MATERIAL"; workpackageId: string; materialId: number }
  | { type: "ADD_ALOCACAO"; workpackageId: string; alocacao: RecursoState }
  | {
      type: "UPDATE_ALOCACAO";
      workpackageId: string;
      userId: string;
      mes: number;
      ano: number;
      data: Partial<RecursoState>;
    }
  | { type: "REMOVE_RECURSO_COMPLETO"; workpackageId: string; userId: string }
  | { type: "ADD_UTILIZADOR"; utilizador: UtilizadorState }
  | { type: "EDIT_UTILIZADOR"; utilizador: UtilizadorState }
  | { type: "REMOVE_UTILIZADOR"; utilizadorId: string }
  | { type: "SET_STATE"; state: ProjetoState }
  | { type: "RESET" }
  | { type: "UPDATE_PROJETO"; data: Partial<Omit<ProjetoState, "workpackages" | "responsavel" | "utilizadores">> };

function projetoReducer(state: ProjetoState, action: ProjetoFormAction): ProjetoState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };

    case "SET_RESPONSAVEL":
      return { ...state, responsavel: action.responsavel };

    case "ADD_WORKPACKAGE":
      return {
        ...state,
        workpackages: [...state.workpackages, action.workpackage],
      };

    case "UPDATE_WORKPACKAGE":
      return {
        ...state,
        workpackages: state.workpackages.map((wp) =>
          wp.id === action.id ? { ...wp, ...action.data } : wp
        ),
      };

    case "REMOVE_WORKPACKAGE":
      return {
        ...state,
        workpackages: state.workpackages.filter((wp) => wp.id !== action.id),
      };

    case "ADD_TAREFA":
      return {
        ...state,
        workpackages: state.workpackages.map((wp) =>
          wp.id === action.workpackageId
            ? {
                ...wp,
                tarefas: [...wp.tarefas, action.tarefa],
              }
            : wp
        ),
      };

    case "UPDATE_TAREFA":
      return {
        ...state,
        workpackages: state.workpackages.map((wp) =>
          wp.id === action.workpackageId
            ? {
                ...wp,
                tarefas: wp.tarefas.map((t) =>
                  t.id === action.tarefaId ? { ...t, ...action.data } : t
                ),
              }
            : wp
        ),
      };

    case "REMOVE_TAREFA":
      return {
        ...state,
        workpackages: state.workpackages.map((wp) =>
          wp.id === action.workpackageId
            ? { ...wp, tarefas: wp.tarefas.filter((t) => t.id !== action.tarefaId) }
            : wp
        ),
      };

    case "ADD_MATERIAL":
      return {
        ...state,
        workpackages: state.workpackages.map((wp) =>
          wp.id === action.workpackageId
            ? {
                ...wp,
                materiais: [...wp.materiais, action.material],
              }
            : wp
        ),
      };

    case "UPDATE_MATERIAL":
      return {
        ...state,
        workpackages: state.workpackages.map((wp) =>
          wp.id === action.workpackageId
            ? {
                ...wp,
                materiais: wp.materiais.map((material) =>
                  material.id === action.materialId ? { ...material, ...action.data } : material
                ),
              }
            : wp
        ),
      };

    case "REMOVE_MATERIAL":
      return {
        ...state,
        workpackages: state.workpackages.map((wp) =>
          wp.id === action.workpackageId
            ? { ...wp, materiais: wp.materiais.filter((m) => m.id !== action.materialId) }
            : wp
        ),
      };

    case "ADD_ALOCACAO":
      return {
        ...state,
        workpackages: state.workpackages.map((wp) =>
          wp.id === action.workpackageId
            ? {
                ...wp,
                recursos: [...wp.recursos, action.alocacao],
              }
            : wp
        ),
      };

    case "UPDATE_ALOCACAO":
      return {
        ...state,
        workpackages: state.workpackages.map((wp) =>
          wp.id === action.workpackageId
            ? {
                ...wp,
                recursos: wp.recursos.map((recurso) =>
                  recurso.userId === action.userId &&
                  recurso.mes === action.mes &&
                  recurso.ano === action.ano
                    ? { ...recurso, ...action.data }
                    : recurso
                ),
              }
            : wp
        ),
      };

    case "REMOVE_RECURSO_COMPLETO":
      return {
        ...state,
        workpackages: state.workpackages.map((wp) =>
          wp.id === action.workpackageId
            ? {
                ...wp,
                recursos: wp.recursos.filter((r) => r.userId !== action.userId),
              }
            : wp
        ),
      };

    case "ADD_UTILIZADOR":
      return {
        ...state,
        utilizadores: [...state.utilizadores, action.utilizador],
      };

    case "EDIT_UTILIZADOR":
      return {
        ...state,
        utilizadores: state.utilizadores.map((u) =>
          u.id === action.utilizador.id ? action.utilizador : u
        ),
      };

    case "REMOVE_UTILIZADOR":
      return {
        ...state,
        utilizadores: state.utilizadores.filter((u) => u.id !== action.utilizadorId),
      };

    case "SET_STATE":
      return action.state;

    case "RESET":
      return initialState;

    case "UPDATE_PROJETO":
      return {
        ...state,
        ...action.data,
      };

    default:
      return state;
  }
}

// Função para converter o estado em input para o Prisma
function convertStateToCreateInput(state: ProjetoState): Prisma.ProjetoCreateInput {
  return {
    nome: state.nome,
    descricao: state.descricao,
    inicio: state.inicio,
    fim: state.fim,
    estado: state.estado,
    overhead: state.overhead,
    taxa_financiamento: state.taxa_financiamento,
    valor_eti: state.valor_eti,
    financiamento: state.financiamentoId ? { connect: { id: state.financiamentoId } } : undefined,
    responsavel: state.responsavel ? { connect: { id: state.responsavel.id } } : undefined,
    workpackages: {
      create: state.workpackages.map((wp) => ({
        nome: wp.nome,
        descricao: wp.descricao,
        inicio: wp.inicio,
        fim: wp.fim,
        estado: wp.estado,
        tarefas: {
          create: wp.tarefas.map((tarefa) => ({
            nome: tarefa.nome,
            descricao: tarefa.descricao,
            inicio: tarefa.inicio,
            fim: tarefa.fim,
            estado: tarefa.estado,
            entregaveis: {
              create: tarefa.entregaveis.map((entregavel) => ({
                nome: entregavel.nome,
                descricao: entregavel.descricao,
                data: entregavel.data,
              })),
            },
          })),
        },
        materiais: {
          create: wp.materiais.map((material) => ({
            nome: material.nome,
            preco: material.preco,
            quantidade: material.quantidade,
            ano_utilizacao: material.ano_utilizacao,
            mes: material.mes,
            rubrica: material.rubrica,
          })),
        },
        recursos: {
          create: wp.recursos.map((recurso) => ({
            user: { connect: { id: recurso.userId } },
            mes: recurso.mes,
            ano: recurso.ano,
            ocupacao: recurso.ocupacao,
          })),
        },
      })),
    },
  };
}

const ProjetoFormContext = createContext<{
  state: ProjetoState;
  dispatch: React.Dispatch<ProjetoFormAction>;
} | null>(null);

export function ProjetoFormProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projetoReducer, initialState);
  const { data: session } = useSession();

  useEffect(() => {
    const user = session?.user;
    if (user?.id && !state.responsavel) {
      dispatch({
        type: "SET_RESPONSAVEL",
        responsavel: {
          id: user.id,
          name: typeof user.name === "string" ? user.name : null,
          email: typeof user.email === "string" ? user.email : null,
          permissao: "COMUM", // Valor padrão, idealmente viria da sessão
        },
      });
    }
  }, [session, state.responsavel]);

  return (
    <ProjetoFormContext.Provider value={{ state, dispatch }}>
      {children}
    </ProjetoFormContext.Provider>
  );
}

export function useProjetoForm() {
  const context = useContext(ProjetoFormContext);
  if (!context) {
    throw new Error("useProjetoForm deve ser usado dentro de um ProjetoFormProvider");
  }
  return context;
}

export { convertStateToCreateInput };
