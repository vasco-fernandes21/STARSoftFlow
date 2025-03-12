import { createContext, useContext, useReducer, type ReactNode } from "react";
import { type Prisma, type Projeto, type Workpackage, type Tarefa, type Entregavel, type Material, type AlocacaoRecurso } from "@prisma/client";
import { Decimal } from "decimal.js";

// Tipo base do estado usando o modelo Projeto do Prisma com todas as relações
type ProjetoState = Omit<Projeto, "id"> & {
  workpackages: Array<
    Omit<Workpackage, "projeto"> & {
      tarefas: Array<
        Omit<Tarefa, "workpackage"> & {
          entregaveis: Omit<Entregavel, "tarefa">[];
        }
      >;
      materiais: Omit<Material, "workpackage">[];
      recursos: Omit<AlocacaoRecurso, "workpackage" | "user">[];
    }
  >;
};

// Estado inicial mais limpo
const initialState: ProjetoState = {
  nome: "",
  descricao: null,
  inicio: null,
  fim: null,
  estado: "RASCUNHO",
  overhead: new Decimal(0),
  taxa_financiamento: new Decimal(0),
  valor_eti: new Decimal(0),
  financiamentoId: null,
  workpackages: []
};

// Ações atualizadas usando os tipos do Prisma
type Action = 
  | { type: "UPDATE_FIELD"; field: keyof Omit<ProjetoState, "workpackages">; value: any }
  | { type: "ADD_WORKPACKAGE"; workpackage: ProjetoState["workpackages"][0] }
  | { type: "UPDATE_WORKPACKAGE"; id: string; data: Partial<ProjetoState["workpackages"][0]> }
  | { type: "REMOVE_WORKPACKAGE"; id: string }
  | { type: "ADD_TAREFA"; workpackageId: string; tarefa: ProjetoState["workpackages"][0]["tarefas"][0] }
  | { type: "UPDATE_TAREFA"; workpackageId: string; tarefaId: string; data: Partial<ProjetoState["workpackages"][0]["tarefas"][0]> }
  | { type: "REMOVE_TAREFA"; workpackageId: string; tarefaId: string }
  | { type: "ADD_MATERIAL"; workpackageId: string; material: ProjetoState["workpackages"][0]["materiais"][0] }
  | { type: "REMOVE_MATERIAL"; workpackageId: string; materialId: number }
  | { type: "UPDATE_PROJETO"; data: Partial<ProjetoState> }
  | { type: "RESET" }
  | { type: "ADD_ALOCACAO"; workpackageId: string; alocacao: Omit<AlocacaoRecurso, "workpackage" | "user"> }
  | { type: "UPDATE_ALOCACAO"; workpackageId: string; userId: string; mes: number; ano: number; data: Partial<Omit<AlocacaoRecurso, "workpackage" | "user">> }
  | { type: "REMOVE_ALOCACAO"; workpackageId: string; userId: string; mes: number; ano: number }
  | { type: "REMOVE_RECURSO_COMPLETO"; workpackageId: string; userId: string };

function projetoReducer(state: ProjetoState, action: Action): ProjetoState {
  switch (action.type) {
    case "UPDATE_FIELD":
      return { ...state, [action.field]: action.value };

    case "ADD_WORKPACKAGE":
      return {
        ...state,
        workpackages: [
          ...state.workpackages,
          {
            ...action.workpackage,
            inicio: action.workpackage.inicio,
            fim: action.workpackage.fim
          }
        ]
      };

    case "UPDATE_WORKPACKAGE":
      return {
        ...state,
        workpackages: state.workpackages.map(wp =>
          wp.id === action.id ? { ...wp, ...action.data } : wp
        )
      };

    case "REMOVE_WORKPACKAGE":
      return {
        ...state,
        workpackages: state.workpackages.filter(wp => wp.id !== action.id)
      };

    case "ADD_TAREFA":
      return {
        ...state,
        workpackages: state.workpackages.map(wp =>
          wp.id === action.workpackageId
            ? {
                ...wp,
                tarefas: [
                  ...wp.tarefas,
                  {
                    ...action.tarefa,
                    workpackageId: action.workpackageId,
                    entregaveis: action.tarefa.entregaveis || [],
                    estado: false
                  }
                ]
              }
            : wp
        )
      };

    case "UPDATE_TAREFA":
      return {
        ...state,
        workpackages: state.workpackages.map(wp =>
          wp.id === action.workpackageId
            ? {
                ...wp,
                tarefas: wp.tarefas.map(t =>
                  t.id === action.tarefaId ? { ...t, ...action.data } : t
                )
              }
            : wp
        )
      };

    case "REMOVE_TAREFA":
      return {
        ...state,
        workpackages: state.workpackages.map(wp =>
          wp.id === action.workpackageId
            ? { ...wp, tarefas: wp.tarefas.filter(t => t.id !== action.tarefaId) }
            : wp
        )
      };

    case "ADD_MATERIAL":
      return {
        ...state,
        workpackages: state.workpackages.map(wp =>
          wp.id === action.workpackageId
            ? {
                ...wp,
                materiais: [
                  ...wp.materiais,
                  {
                    ...action.material,
                    id: action.material.id,
                    workpackageId: action.workpackageId
                  }
                ]
              }
            : wp
        )
      };

    case "REMOVE_MATERIAL":
      return {
        ...state,
        workpackages: state.workpackages.map(wp =>
          wp.id === action.workpackageId
            ? { ...wp, materiais: wp.materiais.filter(m => m.id !== action.materialId) }
            : wp
        )
      };

    case "UPDATE_PROJETO":
      return { ...state, ...action.data };

    case "RESET":
      return initialState;

    case "ADD_ALOCACAO":
      return {
        ...state,
        workpackages: state.workpackages.map(wp =>
          wp.id === action.workpackageId
            ? {
                ...wp,
                recursos: [
                  ...(wp.recursos || []),
                  {
                    ...action.alocacao,
                    workpackageId: action.workpackageId
                  }
                ]
              }
            : wp
        )
      };

    case "UPDATE_ALOCACAO":
      return {
        ...state,
        workpackages: state.workpackages.map(wp =>
          wp.id === action.workpackageId
            ? {
                ...wp,
                recursos: wp.recursos?.map(recurso =>
                  recurso.userId === action.userId &&
                  recurso.mes === action.mes &&
                  recurso.ano === action.ano
                    ? { ...recurso, ...action.data }
                    : recurso
                ) || []
              }
            : wp
        )
      };

    case "REMOVE_ALOCACAO":
      return {
        ...state,
        workpackages: state.workpackages.map(wp =>
          wp.id === action.workpackageId
            ? {
                ...wp,
                recursos: wp.recursos?.filter(
                  r => !(r.userId === action.userId && r.mes === action.mes && r.ano === action.ano)
                ) || []
              }
            : wp
        )
      };

    case "REMOVE_RECURSO_COMPLETO":
      return {
        ...state,
        workpackages: state.workpackages.map(wp =>
          wp.id === action.workpackageId
            ? {
                ...wp,
                recursos: wp.recursos?.filter(
                  r => r.userId !== action.userId
                ) || []
              }
            : wp
        )
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
    workpackages: {
      create: state.workpackages.map(wp => ({
        nome: wp.nome,
        descricao: wp.descricao,
        inicio: wp.inicio,
        fim: wp.fim,
        estado: wp.estado,
        tarefas: {
          create: wp.tarefas.map(tarefa => ({
            nome: tarefa.nome,
            descricao: tarefa.descricao,
            inicio: tarefa.inicio,
            fim: tarefa.fim,
            estado: tarefa.estado,
            entregaveis: {
              create: tarefa.entregaveis.map(entregavel => ({
                nome: entregavel.nome,
                descricao: entregavel.descricao,
                data: entregavel.data,
                anexo: entregavel.anexo
              }))
            }
          }))
        },
        materiais: {
          create: wp.materiais.map(material => ({
            nome: material.nome,
            preco: material.preco,
            quantidade: material.quantidade,
            ano_utilizacao: material.ano_utilizacao,
            rubrica: material.rubrica
          }))
        },
        recursos: {
          create: wp.recursos.map(recurso => ({
            user: { connect: { id: recurso.userId } },
            mes: recurso.mes,
            ano: recurso.ano,
            ocupacao: recurso.ocupacao
          }))
        }
      }))
    }
  };
}

// Contexto e Provider mantêm-se similares
const ProjetoFormContext = createContext<{
  state: ProjetoState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function ProjetoFormProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projetoReducer, initialState);
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

