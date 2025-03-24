// Arquivo para centralizar todas as query keys
export const QUERY_KEYS = {
  projeto: {
    all: ['projeto'] as const,
    lists: () => [...QUERY_KEYS.projeto.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.projeto.all, 'detail', id] as const,
    workpackages: (id: string) => [...QUERY_KEYS.projeto.all, 'workpackages', id] as const,
  },
  workpackage: {
    all: ['workpackage'] as const,
    detail: (id: string) => [...QUERY_KEYS.workpackage.all, 'detail', id] as const,
    findById: (id: string) => [...QUERY_KEYS.workpackage.all, 'findById', id] as const,
    getAlocacoes: (id: string) => [...QUERY_KEYS.workpackage.all, 'alocacoes', id] as const,
    getMateriais: (id: string) => [...QUERY_KEYS.workpackage.all, 'materiais', id] as const,
    getTarefas: (id: string) => [...QUERY_KEYS.workpackage.all, 'tarefas', id] as const,
  },
  tarefa: {
    all: ['tarefa'] as const,
    detail: (id: string) => [...QUERY_KEYS.tarefa.all, 'detail', id] as const,
    findById: (id: string) => [...QUERY_KEYS.tarefa.all, 'findById', id] as const,
    getEntregaveis: (id: string) => [...QUERY_KEYS.tarefa.all, 'entregaveis', id] as const,
  },
  material: {
    all: ['material'] as const,
    detail: (id: number) => [...QUERY_KEYS.material.all, 'detail', id] as const,
    findById: (id: number) => [...QUERY_KEYS.material.all, 'findById', id] as const,
  },
  entregavel: {
    all: ['entregavel'] as const,
    detail: (id: string) => [...QUERY_KEYS.entregavel.all, 'detail', id] as const,
    findById: (id: string) => [...QUERY_KEYS.entregavel.all, 'findById', id] as const,
  },
  financiamento: {
    all: ['financiamento'] as const,
    detail: (id: number) => [...QUERY_KEYS.financiamento.all, 'detail', id] as const,
    findById: (id: number) => [...QUERY_KEYS.financiamento.all, 'findById', id] as const,
  },
  utilizador: {
    all: ['utilizador'] as const,
    detail: (id: string) => [...QUERY_KEYS.utilizador.all, 'detail', id] as const,
    findById: (id: string) => [...QUERY_KEYS.utilizador.all, 'findById', id] as const,
  },
  rascunho: {
    all: ['rascunho'] as const,
    detail: (id: string) => [...QUERY_KEYS.rascunho.all, 'detail', id] as const,
    findById: (id: string) => [...QUERY_KEYS.rascunho.all, 'findById', id] as const,
  }
} as const;
