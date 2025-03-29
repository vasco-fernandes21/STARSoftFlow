import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { ProjetoEstado, Rubrica } from "@prisma/client";
import type { Prisma, Rascunho } from "@prisma/client";
import { handlePrismaError, calcularAlocacoesPassadas } from "../utils";
import { paginationSchema } from "../schemas/common";
import { Decimal } from "decimal.js";

// Schema base para projeto
export const projetoBaseSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(255, "Nome deve ter no máximo 255 caracteres"),
  descricao: z.string().optional(),
  inicio: z.coerce.date().optional(),
  fim: z.coerce.date().optional(),
  estado: z.nativeEnum(ProjetoEstado).optional().default(ProjetoEstado.RASCUNHO),
  overhead: z.coerce.number().min(0).max(100).default(0),
  taxa_financiamento: z.coerce.number().min(0).max(100).default(0),
  valor_eti: z.coerce.number().min(0).default(0),
  financiamentoId: z.coerce.number().int("ID do financiamento deve ser um número inteiro").optional(),
});

// Schema para criação de projeto
export const createProjetoSchema = projetoBaseSchema;

// Schema para atualização de projeto
export const updateProjetoSchema = projetoBaseSchema.partial();

// Schema para filtros de projeto
export const projetoFilterSchema = z.object({
  search: z.string().optional(),
  estado: z.nativeEnum(ProjetoEstado).optional(),
  financiamentoId: z.coerce.number().int("ID do financiamento deve ser um número inteiro").optional(),
}).merge(paginationSchema);

// Schema para validação de datas
export const projetoDateValidationSchema = z.object({
  inicio: z.coerce.date().optional(),
  fim: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.inicio && data.fim) {
      return data.inicio <= data.fim;
    }
    return true;
  },
  {
    message: "A data de fim deve ser posterior à data de início",
    path: ["fim"],
  }
);

// Schema para criação de projeto completo
export const createProjetoCompletoSchema = z.object({
  // Dados básicos do projeto
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(255, "Nome deve ter no máximo 255 caracteres"),
  descricao: z.string().optional(),
  inicio: z.date().optional(),
  fim: z.date().optional(),
  estado: z.nativeEnum(ProjetoEstado).optional().default(ProjetoEstado.RASCUNHO),
  financiamentoId: z.number().optional(),
  responsavelId: z.string().optional(),
  overhead: z.number().min(0).max(100).default(0),
  taxa_financiamento: z.number().min(0).max(100).default(0),
  valor_eti: z.number().min(0).default(0),
  
  // Workpackages e seus sub-dados
  workpackages: z.array(z.object({
    id: z.string().optional(), // ID temporário fornecido pelo frontend
    nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    descricao: z.string().optional(),
    inicio: z.date().optional(),
    fim: z.date().optional(),
    estado: z.boolean().optional().default(false),
    
    // Tarefas do workpackage
    tarefas: z.array(z.object({
      nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
      descricao: z.string().optional(),
      inicio: z.date().optional(),
      fim: z.date().optional(),
      estado: z.boolean().optional().default(false),
      
      // Entregáveis da tarefa
      entregaveis: z.array(z.object({
        nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
        descricao: z.string().optional(),
        data: z.date().optional(),
      })).optional().default([]),
    })).optional().default([]),
    
    // Materiais do workpackage
    materiais: z.array(z.object({
      id: z.number().optional(), // ID temporário fornecido pelo frontend
      nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
      preco: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
      quantidade: z.number().min(1, "Quantidade deve ser pelo menos 1"),
      rubrica: z.nativeEnum(Rubrica).default(Rubrica.MATERIAIS),
      ano_utilizacao: z.number().int().min(2000, "Ano deve ser válido").max(2100, "Ano deve ser válido"),
    })).optional().default([]),
    
    // Alocações de recursos do workpackage
    recursos: z.array(z.object({
      userId: z.string(),
      mes: z.number().min(1).max(12),
      ano: z.number().int().min(2000).max(2100),
      ocupacao: z.union([z.string(), z.number()]).transform(val => 
        typeof val === 'string' ? parseFloat(val) : val
      ),
      workpackageId: z.string().optional(), // Será preenchido após criar o workpackage
    })).optional().default([]),
  })).optional().default([]),
});

// Tipos inferidos dos schemas
export type CreateProjetoInput = z.infer<typeof createProjetoSchema>;
export type UpdateProjetoInput = z.infer<typeof updateProjetoSchema>;
export type ProjetoFilterInput = z.infer<typeof projetoFilterSchema>;
export type CreateProjetoCompletoInput = z.infer<typeof createProjetoCompletoSchema>;

/**
 * Calcula o orçamento submetido de um projeto.
 * O orçamento submetido é o valor ETI do projeto multiplicado pelo total de alocações dos recursos.
 * Pode ser filtrado por ano para obter detalhes mais específicos.
 */
async function getOrcamentoSubmetido(db: Prisma.TransactionClient, projetoId: string, filtros?: { ano?: number }) {
  // Buscar o valor ETI do projeto
  const projeto = await db.projeto.findUnique({
    where: { id: projetoId },
    select: { valor_eti: true }
  });

  if (!projeto || !projeto.valor_eti) {
    return {
      valorETI: new Decimal(0),
      totalAlocacao: new Decimal(0),
      orcamentoTotal: new Decimal(0),
      detalhesPorAno: [] as { ano: number; totalAlocacao: Decimal; orcamento: Decimal }[]
    };
  }

  // Buscar todas as alocações de recursos do projeto
  const alocacoes = await db.alocacaoRecurso.findMany({
    where: {
      workpackage: { projetoId },
      ...(filtros?.ano && { ano: filtros.ano })
    },
    select: {
      ocupacao: true,
      ano: true
    }
  });

  // Somar todas as alocações
  const totalAlocacao = alocacoes.reduce(
    (sum, alocacao) => sum.plus(alocacao.ocupacao), 
    new Decimal(0)
  );

  // Calcular o orçamento submetido total: valor ETI * total de alocações
  const orcamentoTotal = totalAlocacao.times(projeto.valor_eti);

  // Se solicitar detalhes por ano, calcular o orçamento submetido por ano
  const detalhesPorAno: { ano: number; totalAlocacao: Decimal; orcamento: Decimal }[] = [];
  
  if (alocacoes.length > 0) {
    // Agrupar alocações por ano
    const alocacoesPorAno = alocacoes.reduce((acc, alocacao) => {
      if (!acc[alocacao.ano]) {
        acc[alocacao.ano] = new Decimal(0);
      }

      acc[alocacao.ano] = (acc[alocacao.ano] ?? new Decimal(0)).plus(alocacao.ocupacao);
      return acc;
    }, {} as Record<number, Decimal>);

    // Calcular orçamento por ano
    for (const [ano, alocacao] of Object.entries(alocacoesPorAno)) {
      const anoNum = parseInt(ano);
      detalhesPorAno.push({
        ano: anoNum,
        totalAlocacao: alocacao,
        orcamento: alocacao.times(projeto.valor_eti)
      });
    }

    // Ordenar por ano
    detalhesPorAno.sort((a, b) => a.ano - b.ano);
  }

  return {
    valorETI: projeto.valor_eti,
    totalAlocacao,
    orcamentoTotal,
    detalhesPorAno
  };
}

/**
 * Calcula o orçamento real de um projeto.
 * O orçamento real é a soma dos custos de recursos humanos (salário * alocação * fatores de ajuste) e custos de materiais.
 */
async function getOrcamentoReal(db: Prisma.TransactionClient, projetoId: string, filtros?: { ano?: number }) {
  // Fatores de ajuste para o cálculo real do custo de recursos
  const VALOR_SALARIO = new Decimal(1.223);
  const FATOR_MESES = new Decimal(14).dividedBy(new Decimal(11));

  // Buscar todas as alocações de recursos do projeto com informações do usuário (salário)
  const alocacoes = await db.alocacaoRecurso.findMany({
    where: {
      workpackage: { projetoId },
      ...(filtros?.ano && { ano: filtros.ano })
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          salario: true,
        }
      }
    }
  });

  // Buscar todos os materiais do projeto
  const materiais = await db.material.findMany({
    where: {
      workpackage: { projetoId },
      ...(filtros?.ano && { ano_utilizacao: filtros.ano })
    }
  });

  // Detalhes de custo por utilizador
  const detalhesRecursos: Array<{
    userId: string;
    userName: string | null;
    salario: Decimal | null;
    alocacao: Decimal;
    custoAjustado: Decimal;
    detalhesCalculo: {
      salarioBase: Decimal | null;
      salarioAjustado: Decimal | null;
      alocacao: Decimal;
    };
  }> = [];

  // Calcular o custo de recursos humanos com a nova fórmula
  const custoRecursos = alocacoes.reduce((sum, alocacao) => {
    if (!alocacao.user.salario) return sum;

    // Cálculo com a nova fórmula: alocacao * (salario * 1.223 * 14/11)
    const salarioAjustado = alocacao.user.salario
      .times(VALOR_SALARIO)
      .times(FATOR_MESES);
    
    const custoAlocacao = alocacao.ocupacao.times(salarioAjustado);

    // Guardar detalhes do cálculo por recurso
    detalhesRecursos.push({
      userId: alocacao.user.id,
      userName: alocacao.user.name,
      salario: alocacao.user.salario,
      alocacao: alocacao.ocupacao,
      custoAjustado: custoAlocacao,
      detalhesCalculo: {
        salarioBase: alocacao.user.salario,
        salarioAjustado: salarioAjustado,
        alocacao: alocacao.ocupacao
      }
    });
    
    return sum.plus(custoAlocacao);
  }, new Decimal(0));

  // Calcular o custo de materiais
  const custoMateriais = materiais.reduce(
    (sum, material) => {
      const custoTotal = material.preco.times(new Decimal(material.quantidade));
      return sum.plus(custoTotal);
    },
    new Decimal(0)
  );

  // Orçamento real = custo de recursos + custo de materiais
  return {
    custoRecursos,
    custoMateriais,
    total: custoRecursos.plus(custoMateriais),
    detalhesRecursos
  };
}

/**
 * Calcula os totais financeiros de um projeto, incluindo resultado de financiamento.
 * - resultado_financiamento = (orçamento_submetido * taxa_financiamento) - (custo_real_recursos + custo_materiais) + (custo_real_recursos * 0.15)
 * - Pode incluir detalhes por ano para facilitar a visualização em listagens
 */
async function getTotais(db: Prisma.TransactionClient, projetoId: string, options?: { 
  ano?: number; 
  incluirDetalhesPorAno?: boolean;
}) {
  // Constantes para cálculos de salários ajustados
  const VALOR_SALARIO = new Decimal(1.223);
  const FATOR_MESES = new Decimal(14).dividedBy(new Decimal(11));
  
  // Obter data atual para comparação em cálculos de custos
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  // Obter o projeto com taxa de financiamento
  const projeto = await db.projeto.findUnique({
    where: { id: projetoId },
    select: {
      valor_eti: true,
      taxa_financiamento: true,
      overhead: true,
      inicio: true,
      fim: true
    }
  });

  if (!projeto) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Projeto não encontrado"
    });
  }

  // Obter o orçamento submetido
  const orcamentoSubmetido = await getOrcamentoSubmetido(db, projetoId, { ano: options?.ano });
  
  // Obter o orçamento real (custos efetivos)
  const orcamentoReal = await getOrcamentoReal(db, projetoId, { ano: options?.ano });
  
  // Converter taxa de financiamento de percentagem para decimal (ex: 75% -> 0.75)
  // taxa de financiamento já vem em decimal, não precisa dividir por 100
  const taxaFinanciamento = projeto.taxa_financiamento ? 
    new Decimal(projeto.taxa_financiamento) : 
    new Decimal(0);
  
  // Calcular valor financiado (orçamento submetido * taxa de financiamento)
  const valorFinanciado = orcamentoSubmetido.orcamentoTotal.times(taxaFinanciamento);
  // Calcular overhead (15% do custo real de recursos humanos)
  const overhead = orcamentoReal.custoRecursos.times(new Decimal(-0.15));
  
  // Calcular resultado financeiro
  // resultado = (valor financiado) - (custo real total) + overhead
  const resultado = valorFinanciado
    .minus(orcamentoReal.total) 
    .plus(overhead);

  // Calcular VAB (Valor Acrescentado Bruto)
  // VAB = valorFinanciado - custoMateriais
  const vab = valorFinanciado.minus(orcamentoReal.custoMateriais);

  // Calcular margem (resultado / valor financiado)
  const margem = valorFinanciado.isZero() ? 
    new Decimal(0) : 
    resultado.dividedBy(valorFinanciado).times(new Decimal(100));

  // Calcular VAB / Custos com Pessoal
  const vabCustosPessoal = orcamentoReal.custoRecursos.isZero() ? 
    new Decimal(0) : 
    vab.dividedBy(orcamentoReal.custoRecursos);

  // Calcular custos concluídos (alocações passadas + materiais concluídos)
  // 1. Buscar todas as alocações do projeto com dados do usuário
  const alocacoes = await db.alocacaoRecurso.findMany({
    where: {
      workpackage: { projetoId },
      ...(options?.ano && { ano: options.ano })
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          salario: true,
        }
      }
    }
  });

  // 2. Filtrar alocações passadas (ano anterior ou mesmo ano mas mês <= mesAtual)
  const alocacoesPassadas = alocacoes.filter(a => 
    a.ano < anoAtual || (a.ano === anoAtual && a.mes <= mesAtual)
  );

  // 3. Calcular custo das alocações passadas com ajustes
  const custosAlocacoesPassadas = alocacoesPassadas.reduce((sum, alocacao) => {
    if (!alocacao.user.salario) return sum;
    
    // Usar a mesma fórmula do getOrcamentoReal para consistência
    const salarioAjustado = alocacao.user.salario
      .times(VALOR_SALARIO)
      .times(FATOR_MESES);
      
    const custoAlocacao = alocacao.ocupacao.times(salarioAjustado);
    return sum.plus(custoAlocacao);
  }, new Decimal(0));

  // 4. Buscar materiais concluídos
  const materiaisConcluidos = await db.material.findMany({
    where: {
      workpackage: { projetoId },
      estado: true, // Apenas materiais concluídos/adquiridos
      ...(options?.ano && { ano_utilizacao: options.ano })
    }
  });

  // 5. Calcular custo dos materiais concluídos
  const custoMateriaisConcluidos = materiaisConcluidos.reduce(
    (sum, material) => {
      const custoTotal = material.preco.times(new Decimal(material.quantidade));
      return sum.plus(custoTotal);
    },
    new Decimal(0)
  );

  // 6. Total de custos concluídos
  const totalCustosConcluidos = custosAlocacoesPassadas.plus(custoMateriaisConcluidos);

  // Base result com custosConcluidos
  const resultadoBase = {
    orcamentoSubmetido: orcamentoSubmetido.orcamentoTotal,
    taxaFinanciamento: projeto.taxa_financiamento || new Decimal(0),
    valorFinanciado,
    custosReais: {
      recursos: orcamentoReal.custoRecursos,
      materiais: orcamentoReal.custoMateriais,
      total: orcamentoReal.total,
      detalhesRecursos: orcamentoReal.detalhesRecursos
    },
    custosConcluidos: {
      recursos: custosAlocacoesPassadas,
      materiais: custoMateriaisConcluidos,
      total: totalCustosConcluidos
    },
    overhead,
    resultado,
    vab,
    margem,
    vabCustosPessoal
  };

  // Se não deseja detalhes por ano, retornar apenas o resultado base
  if (!options?.incluirDetalhesPorAno) {
    return resultadoBase;
  }

  // Caso contrário, calcular detalhes por ano
  const anosSet = new Set<number>();
  
  // Adicionar anos do orçamento submetido
  orcamentoSubmetido.detalhesPorAno.forEach(detalhe => {
    anosSet.add(detalhe.ano);
  });
  
  // Obter todos os anos com alocações
  const todasAlocacoes = await db.alocacaoRecurso.findMany({
    where: { workpackage: { projetoId } },
    select: { ano: true },
    distinct: ['ano']
  });
  
  todasAlocacoes.forEach(alocacao => {
    anosSet.add(alocacao.ano);
  });
  
  // Obter todos os anos com materiais
  const materiais = await db.material.findMany({
    where: { workpackage: { projetoId } },
    select: { ano_utilizacao: true },
    distinct: ['ano_utilizacao']
  });
  
  materiais.forEach(material => {
    anosSet.add(material.ano_utilizacao);
  });
  
  // Converter o Set para array e ordenar
  const anos = Array.from(anosSet).sort();
  
  // Calcular os totais para cada ano
  const detalhesAnuais = await Promise.all(
    anos.map(async (ano) => {
      // Obter orçamento real e submetido para este ano
      const orcamentoRealAno = await getOrcamentoReal(db, projetoId, { ano });
      const orcamentoSubmetidoAno = await getOrcamentoSubmetido(db, projetoId, { ano });
      
      // Calcular valor financiado para este ano
      const valorFinanciadoAno = orcamentoSubmetidoAno.orcamentoTotal.times(taxaFinanciamento);
      
      // Calcular overhead para este ano
      const overheadAno = orcamentoRealAno.custoRecursos.times(new Decimal(-0.15));
      
      // Calcular resultado para este ano
      const resultadoAno = valorFinanciadoAno
        .minus(orcamentoRealAno.total)
        .plus(overheadAno);

      // Calcular VAB para este ano (valor financiado - custo materiais)
      const vabAno = valorFinanciadoAno.minus(orcamentoRealAno.custoMateriais);

      // Calcular margem para este ano
      const margemAno = valorFinanciadoAno.isZero() ? 
        new Decimal(0) : 
        resultadoAno.dividedBy(valorFinanciadoAno).times(new Decimal(100));

      const vabCustosPessoalAno = orcamentoRealAno.custoRecursos.isZero() ? 
        new Decimal(0) : 
        vabAno.dividedBy(orcamentoRealAno.custoRecursos);
      
      // Calcular custos concluídos para este ano
      // 1. Filtrar alocações passadas para este ano
      const alocacoesPassadasAno = alocacoes.filter(a => 
        a.ano === ano && (ano < anoAtual || (ano === anoAtual && a.mes <= mesAtual))
      );

      // 2. Calcular custo das alocações passadas com ajustes
      const custosAlocacoesPassadasAno = alocacoesPassadasAno.reduce((sum, alocacao) => {
        if (!alocacao.user.salario) return sum;
        
        const salarioAjustado = alocacao.user.salario
          .times(VALOR_SALARIO)
          .times(FATOR_MESES);
          
        const custoAlocacao = alocacao.ocupacao.times(salarioAjustado);
        return sum.plus(custoAlocacao);
      }, new Decimal(0));

      // 3. Filtrar materiais concluídos para este ano
      const materiaisConcluidosAno = await db.material.findMany({
        where: {
          workpackage: { projetoId },
          estado: true, 
          ano_utilizacao: ano
        }
      });

      // 4. Calcular custo dos materiais concluídos para este ano
      const custoMateriaisConcluidosAno = materiaisConcluidosAno.reduce(
        (sum, material) => {
          const custoTotal = material.preco.times(new Decimal(material.quantidade));
          return sum.plus(custoTotal);
        },
        new Decimal(0)
      );

      // 5. Total de custos concluídos para este ano
      const totalCustosConcluidosAno = custosAlocacoesPassadasAno.plus(custoMateriaisConcluidosAno);
      
      return {
        ano,
        orcamento: {
          submetido: orcamentoSubmetidoAno.orcamentoTotal,
          real: {
            recursos: orcamentoRealAno.custoRecursos,
            materiais: orcamentoRealAno.custoMateriais,
            total: orcamentoRealAno.total,
            detalhesRecursos: orcamentoRealAno.detalhesRecursos
          }
        },
        custosConcluidos: {
          recursos: custosAlocacoesPassadasAno,
          materiais: custoMateriaisConcluidosAno,
          total: totalCustosConcluidosAno
        },
        alocacoes: orcamentoSubmetidoAno.totalAlocacao,
        valorFinanciado: valorFinanciadoAno,
        overhead: overheadAno,
        resultado: resultadoAno,
        vab: vabAno,
        margem: margemAno,
        vabCustosPessoal: vabCustosPessoalAno
      };
    })
  );
  
  return {
    ...resultadoBase,
    detalhesAnuais,
    anos
  };
}

export const projetoRouter = createTRPCRouter({
  // Obter todos os projetos
  findAll: publicProcedure
    .input(
      projetoFilterSchema.extend({
        userId: z.string().optional(),
        apenasAlocados: z.boolean().optional()
      }).optional().default({})
    )
    .query(async ({ ctx, input }) => {
      try {
        const { 
          search, 
          estado, 
          financiamentoId, 
          page = 1, 
          limit = 10, 
          userId, 
          apenasAlocados 
        } = input;
        
        const where: Prisma.ProjetoWhereInput = {
          ...(search && {
            OR: [
              { nome: { contains: search, mode: 'insensitive' } },
              { descricao: { contains: search, mode: 'insensitive' } }
            ]
          }),
          ...(estado && { estado }),
          ...(financiamentoId && { financiamentoId })
        };

        if (apenasAlocados && userId) {
          where.workpackages = {
            some: {
              recursos: {
                some: {
                  userId: userId
                }
              }
            }
          };
        }

        const total = await ctx.db.projeto.count({ where });

        const projetos = await ctx.db.projeto.findMany({
          where,
          orderBy: { nome: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            financiamento: true,
            responsavel: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            workpackages: {
              include: {
                tarefas: true,
                recursos: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        salario: true
                      }
                    }
                  }
                },
                materiais: true
              }
            }
          }
        });

        let rascunhos: Rascunho[] = [];
        if (apenasAlocados && userId) {
          rascunhos = await ctx.db.rascunho.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
          });
        }

        // Data atual para cálculos de custos
        const dataAtual = new Date();
        const anoAtual = dataAtual.getFullYear();
        const mesAtual = dataAtual.getMonth() + 1;

        const items = projetos.map(projeto => {
          // Cálculo do progresso físico
          let totalTarefas = 0;
          let tarefasConcluidas = 0;

          projeto.workpackages?.forEach(wp => {
            totalTarefas += wp.tarefas.length;
            tarefasConcluidas += wp.tarefas.filter(tarefa => tarefa.estado === true).length;
          });

          const progresso = totalTarefas > 0 ? Math.round((tarefasConcluidas / totalTarefas) * 100) : 0;

          // Cálculo do orçamento e custos
          const orcamentoTotal = projeto.valor_eti ? Number(projeto.valor_eti) : 0;
          
          // Custos de materiais (apenas materiais adquiridos)
          let custoMateriais = 0;
          projeto.workpackages.forEach(wp => {
            wp.materiais.forEach(material => {
              if (material.estado) { // Apenas materiais adquiridos (estado = true)
                custoMateriais += Number(material.preco) * material.quantidade;
              }
            });
          });
          
          // Custos de recursos humanos (apenas alocações passadas)
          let custoRecursos = 0;
          projeto.workpackages.forEach(wp => {
            wp.recursos.forEach(alocacao => {
              if (alocacao.ano < anoAtual || (alocacao.ano === anoAtual && alocacao.mes <= mesAtual)) {
                const ocupacao = Number(alocacao.ocupacao);
                const salario = alocacao.user.salario ? Number(alocacao.user.salario) : 0;
                custoRecursos += ocupacao * salario;
              }
            });
          });

          const orcamentoUtilizado = custoMateriais + custoRecursos;
          const progressoFinanceiro = orcamentoTotal > 0 
            ? Math.round((orcamentoUtilizado / orcamentoTotal) * 100) 
            : 0;

          return {
            ...projeto,
            progresso,
            progressoFinanceiro,
            orcamento: {
              total: orcamentoTotal,
              utilizado: orcamentoUtilizado,
              materiais: custoMateriais,
              recursos: custoRecursos
            },
            responsavel: projeto.responsavel
          };
        });

        return {
          items,
          ...(rascunhos.length > 0 ? { rascunhos } : {}),
          pagination: {
            total,
            pages: Math.ceil(total / limit),
            page,
            limit
          }
        };
      } catch (error) {
        console.error("Erro ao listar projetos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao listar projetos",
          cause: error
        });
      }
    }),
  
  // Obter projeto por ID
  findById: publicProcedure
    .input(z.string().uuid("ID do projeto inválido"))
    .query(async ({ ctx, input: id }) => {
      try {
        const projeto = await ctx.db.projeto.findUnique({
          where: { id },
          include: {
            financiamento: true,
            workpackages: {
              include: {
                tarefas: {
                  include: {
                    entregaveis: true
                  }
                },
                materiais: true,
                recursos: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        salario: true
                      }
                    },
                  }
                }
              }
            }
          }
        });
        
        if (!projeto) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Projeto não encontrado",
          });
        }
        
        let totalTarefas = 0;
        let tarefasConcluidas = 0;

        projeto.workpackages?.forEach(wp => {
          totalTarefas += wp.tarefas.length;
          tarefasConcluidas += wp.tarefas.filter(tarefa => tarefa.estado === true).length;
        });

       const progresso = totalTarefas > 0 ? tarefasConcluidas / totalTarefas : 0;
       
       return {
        ...projeto,
        progresso,
       };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),

  getFinancas: publicProcedure
    .input(z.object({
      projetoId: z.string().uuid("ID do projeto inválido"),
      ano: z.number().int().min(2000).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { projetoId, ano } = input;
      
      const projeto = await ctx.db.projeto.findUnique({
        where: { id: projetoId },
        select: {
          valor_eti: true,
          overhead: true,
          taxa_financiamento: true
        }
      });

      if (!projeto) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Projeto não encontrado"
        });
      }

      // Calcular orçamento submetido
      const orcamentoSubmetido = await getOrcamentoSubmetido(ctx.db, projetoId, { ano });
      
      // Calcular orçamento real com base nos filtros fornecidos
      const orcamentoReal = await getOrcamentoReal(ctx.db, projetoId, { ano });
      
      // Calcular totais financeiros (resultado de financiamento, overhead, etc)
      const totaisFinanceiros = await getTotais(ctx.db, projetoId, { ano });

      // Buscar alocações com detalhes para relatório
      type AlocacaoDetalhada = {
        id: string;
        userId: string;
        workpackageId: string;
        mes: number;
        ano: number;
        ocupacao: Decimal;
        user: {
          id: string;
          name: string | null;
          salario: Decimal | null;
        };
        workpackage: {
          id: string;
          nome: string;
        };
      };

      const alocacoes = await ctx.db.alocacaoRecurso.findMany({
        where: {
          workpackage: { projetoId },
          ...(ano && { ano }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              salario: true,
            }
          },
          workpackage: {
            select: {
              id: true,
              nome: true
            }
          }
        }
      }) as AlocacaoDetalhada[];

      // Buscar materiais adquiridos
      const materiaisAdquiridos = await ctx.db.material.findMany({
        where: {
          workpackage: { projetoId },
          estado: true,
          ...(ano && { ano_utilizacao: ano })
        }
      });

      const custoMaterialAdquirido = materiaisAdquiridos.reduce(
        (sum, material) => {
          const custoTotal = material.preco.times(new Decimal(material.quantidade));
          return sum.plus(custoTotal);
        },
        new Decimal(0)
      );

      // Calcular alocações que já ocorreram (meses passados)
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const mesAtual = hoje.getMonth() + 1;

      // Usar a função auxiliar para calcular alocações passadas
      const { custos: custosAlocacoesPassadas, etis: etisAlocacoesPassadas } = 
        calcularAlocacoesPassadas(alocacoes, anoAtual, mesAtual);

      // Tipo para detalhes de alocação por usuário
      type UserAlocacaoDetails = {
        user: {
          id: string;
          name: string;
          salario: Decimal | null;
        };
        totalAlocacao: Decimal;
        custoTotal: Decimal;
        alocacoes: Array<{
          alocacaoId: string;
          workpackage: {
            id: string;
            nome: string;
          };
          data: Date;
          mes: number;
          ano: number;
          etis: number;
          custo: number;
          custoAjustado: number;
          fatores: {
            segurancaSocial: number;
            meses: number;
          };
        }>;
      };

      // Organizar detalhes por usuário
      const custosPorUser = alocacoes.reduce((acc, alocacao) => {
        const user = alocacao.user;
        const workpackage = alocacao.workpackage;
        
        if (!acc[user.id]) {
          acc[user.id] = {
            user: {
              id: user.id,
              name: user.name ?? "Nome Desconhecido",
              salario: user.salario
            },
            totalAlocacao: new Decimal(0),
            custoTotal: new Decimal(0),
            alocacoes: []
          };
        }
        
        if (alocacao.ocupacao) {
          const userEntry = acc[user.id] as UserAlocacaoDetails;
          
          userEntry.totalAlocacao = userEntry.totalAlocacao.plus(alocacao.ocupacao);
          
          // Calcular o custo com os fatores de ajuste (1.223 * 14/11)
          const VALOR_SALARIO = new Decimal(1.223);
          const FATOR_MESES = new Decimal(14).dividedBy(new Decimal(11));
          
          let custo = new Decimal(0);
          let custoAjustado = new Decimal(0);
          
          if (user.salario) {
            // Custo base (apenas para referência)
            custo = alocacao.ocupacao.times(user.salario);
            
            // Custo ajustado com os fatores
            const salarioAjustado = user.salario
              .times(VALOR_SALARIO)
              .times(FATOR_MESES);
            
            custoAjustado = alocacao.ocupacao.times(salarioAjustado);
            
            userEntry.custoTotal = userEntry.custoTotal.plus(custoAjustado);
          }
          
          // Adicionar detalhe da alocação
          userEntry.alocacoes.push({
            alocacaoId: alocacao.id,
            workpackage: {
              id: workpackage.id,
              nome: workpackage.nome
            },
            data: new Date(alocacao.ano, alocacao.mes - 1, 1),
            mes: alocacao.mes,
            ano: alocacao.ano,
            etis: alocacao.ocupacao.toNumber(),
            custo: custo.toNumber(),
            custoAjustado: custoAjustado.toNumber(),
            // Incluir os fatores para explicar o cálculo
            fatores: {
              segurancaSocial: VALOR_SALARIO.toNumber(),
              meses: FATOR_MESES.toNumber()
            }
          });
        }
        
        return acc;
      }, {} as Record<string, UserAlocacaoDetails>);

      return {
        parametros: {
          valor_eti: projeto.valor_eti?.toNumber() || 0,
          taxa_financiamento: projeto.taxa_financiamento?.toNumber() || 0,
          overhead: projeto.overhead?.toNumber() || 0
        },
        orcamento: {
          submetido: orcamentoSubmetido.orcamentoTotal.toNumber(),
          detalhesSubmissao: orcamentoSubmetido.detalhesPorAno.map(d => ({
            ano: d.ano,
            totalAlocacao: d.totalAlocacao.toNumber(),
            orcamento: d.orcamento.toNumber()
          })),
          real: {
            recursos: orcamentoReal.custoRecursos.toNumber(),
            materiais: orcamentoReal.custoMateriais.toNumber(),
            total: orcamentoReal.total.toNumber(),
            // Incluir os detalhes por recurso
            detalhesRecursos: orcamentoReal.detalhesRecursos.map(detalhe => ({
              userId: detalhe.userId,
              userName: detalhe.userName,
              salario: detalhe.salario?.toNumber() || 0,
              alocacao: detalhe.alocacao.toNumber(),
              custoAjustado: detalhe.custoAjustado.toNumber(),
              detalhesCalculo: {
                salarioBase: detalhe.detalhesCalculo.salarioBase?.toNumber() || 0,
                salarioAjustado: detalhe.detalhesCalculo.salarioAjustado?.toNumber() || 0,
                alocacao: detalhe.detalhesCalculo.alocacao.toNumber(),
                formulaUsada: "alocacao * (salario * 1.223 * 14/11)"
              }
            }))
          }
        },
        financeiro: {
          valorFinanciado: totaisFinanceiros.valorFinanciado.toNumber(),
          overhead: totaisFinanceiros.overhead.toNumber(),
          resultado: totaisFinanceiros.resultado.toNumber()
        },
        custosRealizados: {
          alocacoes: {
            custo: custosAlocacoesPassadas.toNumber(),
            etis: etisAlocacoesPassadas.toNumber()
          },
          materiais: {
            custo: custoMaterialAdquirido.toNumber(),
            quantidade: materiaisAdquiridos.length
          },
          total: custosAlocacoesPassadas.plus(custoMaterialAdquirido).toNumber(),
          percentagemOrcamentoReal: orcamentoReal.total.greaterThan(0)
            ? (custosAlocacoesPassadas.plus(custoMaterialAdquirido).dividedBy(orcamentoReal.total).times(100)).toNumber()
            : 0,
          percentagemOrcamentoSubmetido: orcamentoSubmetido.orcamentoTotal.greaterThan(0)
            ? (custosAlocacoesPassadas.plus(custoMaterialAdquirido).dividedBy(orcamentoSubmetido.orcamentoTotal).times(100)).toNumber()
            : 0
        },
        detalhesPorUser: Object.values(custosPorUser).map(item => ({
          user: item.user,
          totalAlocacao: item.totalAlocacao.toNumber(),
          custoTotal: item.custoTotal.toNumber(),
          alocacoes: item.alocacoes.sort((a, b) => {
            if (a.ano !== b.ano) return a.ano - b.ano;
            return a.mes - b.mes;
          })
        })),
      };
    }),
  
  // Criar projeto
  create: protectedProcedure
    .input(createProjetoSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        if (input.inicio && input.fim) {
          const { success } = projetoDateValidationSchema.safeParse({
            inicio: input.inicio,
            fim: input.fim,
          });
          
          if (!success) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A data de fim deve ser posterior à data de início",
            });
          }
        }
        
        // Extrair o ID do utilizador da sessão
        const userId = ctx.session.user.id;
        
        const { 
          nome, 
          descricao, 
          inicio, 
          fim, 
          estado = ProjetoEstado.RASCUNHO, 
          financiamentoId,
          overhead = 0, 
          taxa_financiamento = 0, 
          valor_eti = 0 
        } = input;
        
        const createData = {
          nome,
          descricao,
          inicio,
          fim,
          estado,
          overhead,
          taxa_financiamento,
          valor_eti,
          // Usar a sintaxe de relacionamento para o responsável
          responsavel: {
            connect: { id: userId }
          },
          ...(financiamentoId ? {
            financiamento: {
              connect: { id: financiamentoId }
            }
          } : {})
        } as any;
        
        const projeto = await ctx.db.projeto.create({
          data: createData,
          include: {
            financiamento: true,
            responsavel: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
        });
        
        return projeto;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Atualizar projeto
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid("ID do projeto inválido"),
      data: updateProjetoSchema,
    }))
    .mutation(async ({ ctx, input: { id, data } }) => {
      try {
        if (data.inicio && data.fim) {
          const dateValidation = projetoDateValidationSchema.safeParse({ inicio: data.inicio, fim: data.fim });
          if (!dateValidation.success) {
            return {
              success: false,
              error: {
                message: "Erro de validação",
                errors: dateValidation.error.flatten().fieldErrors,
              },
            };
          }
        }
        
        const updateData: Prisma.ProjetoUpdateInput = {
          nome: data.nome,
          descricao: data.descricao,
          inicio: data.inicio,
          fim: data.fim,
          estado: data.estado,
          overhead: data.overhead,
          taxa_financiamento: data.taxa_financiamento,
          valor_eti: data.valor_eti,
          ...(data.financiamentoId !== undefined && {
            financiamento: data.financiamentoId ? {
              connect: { id: data.financiamentoId }
            } : { disconnect: true }
          }),
        };
        
        const projeto = await ctx.db.projeto.update({
          where: { id },
          data: updateData,
          include: {
            financiamento: true,
          },
        });
        
        return {
          success: true,
          data: projeto
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            success: false,
            error: {
              message: "Erro de validação",
              errors: error.flatten().fieldErrors,
            },
          };
        }
        return handlePrismaError(error);
      }
    }),
  
  // Apagar projeto
  delete: protectedProcedure
    .input(z.string().uuid("ID do projeto inválido"))
    .mutation(async ({ ctx, input: id }) => {
      try {
        const workpackages = await ctx.db.workpackage.findMany({
          where: { projetoId: id },
          include: {
            tarefas: true,
          },
        });
        
        for (const wp of workpackages) {
          if (wp.tarefas.length > 0) {
            await ctx.db.tarefa.deleteMany({
              where: { workpackageId: wp.id },
            });
          }
        }
        
        await ctx.db.workpackage.deleteMany({
          where: { projetoId: id },
        });
        
        await ctx.db.projeto.delete({
          where: { id },
        });
        
        return { success: true };
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Alterar estado do projeto
  updateEstado: protectedProcedure
    .input(z.object({
      id: z.string().uuid("ID do projeto inválido"),
      estado: z.nativeEnum(ProjetoEstado),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, estado } = input;
        
        const projeto = await ctx.db.projeto.update({
          where: { id },
          data: { estado },
        });
        
        return projeto;
      } catch (error) {
        return handlePrismaError(error);
      }
    }),
  
  // Criar projeto completo com workpackages, tarefas, entregáveis, materiais e alocações
  createCompleto: protectedProcedure
    .input(z.object({
      nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(255, "Nome deve ter no máximo 255 caracteres"),
      descricao: z.string().optional(),
      inicio: z.date().optional(),
      fim: z.date().optional(),
      estado: z.nativeEnum(ProjetoEstado).optional().default(ProjetoEstado.RASCUNHO),
      financiamentoId: z.number().optional(),
      responsavelId: z.string().optional(),
      overhead: z.number().min(0).max(100).default(0),
      taxa_financiamento: z.number().min(0).max(100).default(0),
      valor_eti: z.number().min(0).default(0),
      workpackages: z.array(z.object({
        id: z.string().optional(),
        nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
        descricao: z.string().optional(),
        inicio: z.date().optional(),
        fim: z.date().optional(),
        estado: z.boolean().optional().default(false),
        tarefas: z.array(z.object({
          nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
          descricao: z.string().optional(),
          inicio: z.date().optional(),
          fim: z.date().optional(),
          estado: z.boolean().optional().default(false),
          entregaveis: z.array(z.object({
            nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
            descricao: z.string().optional(),
            data: z.date().optional(),
          })).optional().default([]),
        })).optional().default([]),
        materiais: z.array(z.object({
          id: z.number().optional(),
          nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
          preco: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) : val),
          quantidade: z.number().min(1, "Quantidade deve ser pelo menos 1"),
          rubrica: z.nativeEnum(Rubrica).default(Rubrica.MATERIAIS),
          ano_utilizacao: z.number().int().min(2000, "Ano deve ser válido").max(2100, "Ano deve ser válido"),
        })).optional().default([]),
        recursos: z.array(z.object({
          userId: z.string(),
          mes: z.number().min(1).max(12),
          ano: z.number().int().min(2000).max(2100),
          ocupacao: z.union([z.string(), z.number()]).transform(val => 
            typeof val === 'string' ? parseFloat(val) : val
          ),
          workpackageId: z.string().optional(),
        })).optional().default([]),
      })).optional().default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (input.inicio && input.fim) {
          const { success } = projetoDateValidationSchema.safeParse({
            inicio: input.inicio,
            fim: input.fim,
          });
          
          if (!success) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A data de fim deve ser posterior à data de início",
            });
          }
        }
        
        for (const wp of input.workpackages) {
          if (wp.inicio && wp.fim) {
            if (wp.inicio > wp.fim) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Workpackage "${wp.nome}": A data de fim deve ser posterior à data de início`,
              });
            }
            
            if (input.inicio && wp.inicio < input.inicio) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Workpackage "${wp.nome}": A data de início não pode ser anterior à data de início do projeto`,
              });
            }
            
            if (input.fim && wp.fim > input.fim) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Workpackage "${wp.nome}": A data de fim não pode ser posterior à data de fim do projeto`,
              });
            }
          }
          
          for (const tarefa of wp.tarefas) {
            if (tarefa.inicio && tarefa.fim) {
              if (tarefa.inicio > tarefa.fim) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Tarefa "${tarefa.nome}": A data de fim deve ser posterior à data de início`,
                });
              }
              
              if (wp.inicio && tarefa.inicio < wp.inicio) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Tarefa "${tarefa.nome}": A data de início não pode ser anterior à data de início do workpackage`,
                });
              }
              
              if (wp.fim && tarefa.fim > wp.fim) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Tarefa "${tarefa.nome}": A data de fim não pode ser posterior à data de fim do workpackage`,
                });
              }
            }
          }
        }
        
        // Extrair o ID do utilizador da sessão
        const userId = ctx.session.user.id;
        
        // Determinar qual ID de utilizador será usado como responsável
        const targetUserId = input.responsavelId || userId;

        // Verificar se o utilizador existe
        const userExists = await ctx.db.user.findUnique({
          where: { id: targetUserId },
          select: { id: true }
        });

        if (!userExists) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "O utilizador responsável especificado não existe",
          });
        }
        
        const projeto = await ctx.db.projeto.create({
          data: {
            nome: input.nome,
            descricao: input.descricao,
            inicio: input.inicio,
            fim: input.fim,
            estado: input.estado,
            overhead: input.overhead,
            taxa_financiamento: input.taxa_financiamento,
            valor_eti: input.valor_eti,
            // Usar a sintaxe de relacionamento do Prisma para o responsável
            responsavel: {
              connect: {
                id: targetUserId
              }
            },
            ...(input.financiamentoId ? {
              financiamento: {
                connect: {
                  id: input.financiamentoId
                }
              }
            } : {}),
            workpackages: {
              create: input.workpackages.map(wp => ({
                nome: wp.nome,
                descricao: wp.descricao,
                inicio: wp.inicio,
                fim: wp.fim,
                estado: wp.estado,
                tarefas: {
                  create: wp.tarefas.map(t => ({
                    nome: t.nome,
                    descricao: t.descricao,
                    inicio: t.inicio,
                    fim: t.fim,
                    estado: t.estado,
                    entregaveis: {
                      create: t.entregaveis.map(e => ({
                        nome: e.nome,
                        descricao: e.descricao,
                        data: e.data
                      }))
                    }
                  }))
                },
                materiais: {
                  create: wp.materiais.map(m => ({
                    nome: m.nome,
                    preco: m.preco,
                    quantidade: m.quantidade,
                    rubrica: m.rubrica,
                    ano_utilizacao: m.ano_utilizacao
                  }))
                }
              }))
            }
          },
          include: {
            financiamento: true,
            responsavel: {
              select: {
                id: true, 
                name: true,
                email: true
              }
            },
            workpackages: {
              include: {
                tarefas: {
                  include: {
                    entregaveis: true
                  }
                },
                materiais: true
              }
            }
          }
        });
        
        for (const wpInput of input.workpackages) {
          if (!wpInput.recursos || wpInput.recursos.length === 0) continue;
          
          const workpackage = projeto.workpackages.find(w => w.nome === wpInput.nome);
          if (!workpackage) continue;
          
          for (const recurso of wpInput.recursos) {
            try {
              await ctx.db.alocacaoRecurso.create({
                data: {
                  workpackageId: workpackage.id,
                  userId: recurso.userId,
                  mes: recurso.mes,
                  ano: recurso.ano,
                  ocupacao: new Decimal(recurso.ocupacao)
                }
              });
            } catch (error) {
              console.error(`Erro ao criar alocação: ${error}`);
            }
          }
        }
        
        return {
          success: true,
          data: projeto
        };
      } catch (error) {
        console.error("Erro ao criar projeto completo:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        return handlePrismaError(error);
      }
    }),

  /**
   * Obter os totais financeiros do projeto, incluindo cálculo do resultado de financiamento
   * Inclui detalhes por ano quando solicitado para facilitar visualização em listagens
   */
  getTotaisFinanceiros: publicProcedure
    .input(z.object({
      projetoId: z.string().uuid("ID do projeto inválido"),
      ano: z.number().int().min(2000).optional(),
      incluirDetalhesPorAno: z.boolean().optional().default(false)
    }))
    .query(async ({ ctx, input }) => {
      const { projetoId, ano, incluirDetalhesPorAno } = input;
      
      try {
        // Usar a função getTotais para calcular os resultados financeiros
        const totais = await getTotais(ctx.db, projetoId, { 
          ano, 
          incluirDetalhesPorAno
        });

        // Base da resposta (sempre presente)
        const resposta = {
          orcamentoSubmetido: totais.orcamentoSubmetido.toNumber(),
          taxaFinanciamento: totais.taxaFinanciamento.toNumber(),
          valorFinanciado: totais.valorFinanciado.toNumber(),
          custosReais: {
            recursos: totais.custosReais.recursos.toNumber(),
            materiais: totais.custosReais.materiais.toNumber(),
            total: totais.custosReais.total.toNumber(),
            // Incluir detalhes de recursos se disponíveis
            detalhesRecursos: totais.custosReais.detalhesRecursos?.map(dr => ({
              userId: dr.userId,
              userName: dr.userName,
              salario: dr.salario?.toNumber() || 0,
              alocacao: dr.alocacao.toNumber(),
              custoAjustado: dr.custoAjustado.toNumber(),
              detalhesCalculo: {
                salarioBase: dr.detalhesCalculo.salarioBase?.toNumber() || 0,
                salarioAjustado: dr.detalhesCalculo.salarioAjustado?.toNumber() || 0,
                alocacao: dr.detalhesCalculo.alocacao.toNumber(),
                formulaUsada: "alocacao * (salario * 1.223 * 14/11)"
              }
            })) || []
          },
          custosConcluidos: {
            recursos: totais.custosConcluidos?.recursos.toNumber() || 0,
            materiais: totais.custosConcluidos?.materiais.toNumber() || 0,
            total: totais.custosConcluidos?.total.toNumber() || 0
          },
          overhead: totais.overhead.toNumber(),
          resultado: totais.resultado.toNumber(),
          vab: totais.vab.toNumber(),
          margem: totais.margem.toNumber(),
          vabCustosPessoal: totais.vabCustosPessoal.toNumber(),
          meta: {
            filtroAno: ano,
            incluiDetalhes: incluirDetalhesPorAno
          }
        };

        // Adicionar detalhes por ano se solicitado
        if (incluirDetalhesPorAno && 'detalhesAnuais' in totais) {
          return {
            ...resposta,
            anos: totais.anos,
            detalhesAnuais: totais.detalhesAnuais.map(detalhe => ({
              ano: detalhe.ano,
              orcamento: {
                submetido: detalhe.orcamento.submetido.toNumber(),
                real: {
                  recursos: detalhe.orcamento.real.recursos.toNumber(),
                  materiais: detalhe.orcamento.real.materiais.toNumber(),
                  total: detalhe.orcamento.real.total.toNumber(),
                  detalhesRecursos: detalhe.orcamento.real.detalhesRecursos?.map(dr => ({
                    userId: dr.userId,
                    userName: dr.userName,
                    salario: dr.salario?.toNumber() || 0,
                    alocacao: dr.alocacao.toNumber(),
                    custoAjustado: dr.custoAjustado.toNumber(),
                    detalhesCalculo: {
                      salarioBase: dr.detalhesCalculo.salarioBase?.toNumber() || 0,
                      salarioAjustado: dr.detalhesCalculo.salarioAjustado?.toNumber() || 0,
                      alocacao: dr.detalhesCalculo.alocacao.toNumber(),
                      formulaUsada: "alocacao * (salario * 1.223 * 14/11)"
                    }
                  })) || []
                }
              },
              custosConcluidos: {
                recursos: detalhe.custosConcluidos?.recursos.toNumber() || 0,
                materiais: detalhe.custosConcluidos?.materiais.toNumber() || 0,
                total: detalhe.custosConcluidos?.total.toNumber() || 0
              },
              alocacoes: detalhe.alocacoes.toNumber(),
              valorFinanciado: detalhe.valorFinanciado.toNumber(),
              overhead: detalhe.overhead.toNumber(),
              resultado: detalhe.resultado.toNumber(),
              vab: detalhe.vab.toNumber(),
              margem: detalhe.margem.toNumber(),
              vabCustosPessoal: detalhe.vabCustosPessoal.toNumber()
            }))
          };
        }

        return resposta;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        console.error("Erro ao calcular totais financeiros:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao calcular totais financeiros",
          cause: error
        });
      }
    }),
});