import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { Decimal } from "decimal.js";

/**
 * Calcula o orçamento submetido de um projeto.
 * Se o projeto estiver aprovado, usa os dados do snapshot.
 * Se estiver pendente, calcula com base nas alocações dos recursos.
 */
async function getOrcamentoSubmetido(
  db: Prisma.TransactionClient,
  projetoId: string,
  filtros?: { ano?: number }
) {
  // Vai buscar o projeto com estado, valor ETI e snapshot aprovado
  const projeto = await db.projeto.findUnique({
    where: { id: projetoId },
    select: { 
      valor_eti: true,
      estado: true,
      aprovado: true 
    },
  });

  const valorETI = projeto?.valor_eti ?? new Decimal(0);

  if (!projeto || !valorETI) {
    return {
      valorETI: new Decimal(0),
      totalAlocacao: new Decimal(0),
      orcamentoTotal: new Decimal(0),
      detalhesPorAno: [] as { ano: number; totalAlocacao: Decimal; orcamento: Decimal }[],
    };
  }

  // Se o projeto estiver aprovado, usar dados do snapshot
  if (projeto.estado === "APROVADO" && projeto.aprovado) {
    const snapshot = projeto.aprovado as any;
    const workpackages = snapshot.workpackages || [];
    
    // Estrutura para armazenar alocações por ano
    const alocacoesPorAno: Record<number, Decimal> = {};
    
    // Processar workpackages do snapshot
    workpackages.forEach((wp: any) => {
      const recursos = wp.recursos || [];
      recursos.forEach((recurso: any) => {
        const { ano, ocupacao } = recurso;
        if (!filtros?.ano || ano === filtros.ano) {
          alocacoesPorAno[ano] = (alocacoesPorAno[ano] || new Decimal(0)).plus(new Decimal(ocupacao));
        }
      });
    });

    // Calcular total de alocações
    const totalAlocacao = Object.values(alocacoesPorAno).reduce(
      (sum, alocacao) => sum.plus(alocacao),
      new Decimal(0)
    );

    // Calcular orçamento total
    const orcamentoTotal = totalAlocacao.times(valorETI);

    // Preparar detalhes por ano
    const detalhesPorAno = Object.entries(alocacoesPorAno).map(([ano, alocacao]) => ({
      ano: parseInt(ano),
      totalAlocacao: alocacao,
      orcamento: alocacao.times(valorETI),
    }));

    return {
      valorETI,
      totalAlocacao,
      orcamentoTotal,
      detalhesPorAno: detalhesPorAno.sort((a, b) => a.ano - b.ano),
    };
  }

  // Se não estiver aprovado, manter o cálculo original baseado nas tabelas
  const alocacoes = await db.alocacaoRecurso.findMany({
    where: {
      workpackage: { projetoId },
      ...(filtros?.ano && { ano: filtros.ano }),
    },
    select: {
      ocupacao: true,
      ano: true,
    },
  });

  // Soma todas as alocações
  const totalAlocacao = alocacoes.reduce(
    (sum, alocacao) => sum.plus(alocacao.ocupacao),
    new Decimal(0)
  );

  // Calcula o orçamento submetido total: valor ETI * total de alocações
  const orcamentoTotal = totalAlocacao.times(valorETI);

  // Se solicitar detalhes por ano, calcula o orçamento submetido por ano
  const detalhesPorAno: { ano: number; totalAlocacao: Decimal; orcamento: Decimal }[] = [];

  if (alocacoes.length > 0) {
    // Agrupa as alocações por ano
    const alocacoesPorAno = alocacoes.reduce(
      (acc, alocacao) => {
        if (!acc[alocacao.ano]) {
          acc[alocacao.ano] = new Decimal(0);
        }

        acc[alocacao.ano] = (acc[alocacao.ano] ?? new Decimal(0)).plus(alocacao.ocupacao);
        return acc;
      },
      {} as Record<number, Decimal>
    );

    // Calcula o orçamento por ano
    for (const [ano, alocacao] of Object.entries(alocacoesPorAno)) {
      const anoNum = parseInt(ano);
      detalhesPorAno.push({
        ano: anoNum,
        totalAlocacao: alocacao,
        orcamento: alocacao.times(valorETI),
      });
    }

    // Ordena por ano
    detalhesPorAno.sort((a, b) => a.ano - b.ano);
  }

  return {
    valorETI,
    totalAlocacao,
    orcamentoTotal,
    detalhesPorAno,
  };
}

/**
 * Calcula o orçamento real de um projeto.
 * O orçamento real é a soma dos custos de recursos humanos (salário * alocação * fatores de ajuste) e custos de materiais.
 */
async function getOrcamentoReal(
  db: Prisma.TransactionClient,
  projetoId: string,
  filtros?: { ano?: number }
) {
  // Fatores de ajuste para o cálculo real do custo de recursos
  const VALOR_SALARIO = new Decimal(1.223);
  const FATOR_MESES = new Decimal(14).dividedBy(new Decimal(11));

  // Vai buscar todas as alocações de recursos do projeto com informações do utilizador (salário)
  const alocacoes = await db.alocacaoRecurso.findMany({
    where: {
      workpackage: { projetoId },
      ...(filtros?.ano && { ano: filtros.ano }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          salario: true,
        },
      },
    },
  });

  // Vai buscar todos os materiais do projeto com detalhes
  const materiais = await db.material.findMany({
    where: {
      workpackage: { projetoId },
      ...(filtros?.ano && { ano_utilizacao: filtros.ano }),
    },
    select: {
      id: true,
      nome: true,
      preco: true,
      quantidade: true,
      rubrica: true,
      ano_utilizacao: true,
      estado: true,
      workpackage: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  });

  // Agrupa materiais por rubrica
  const detalhesMateriais = materiais.reduce(
    (acc, material) => {
      if (!material.preco || !material.workpackage || !material.rubrica) return acc;

      const custoTotal = material.preco.times(new Decimal(material.quantidade));

      if (!acc[material.rubrica]) {
        acc[material.rubrica] = {
          rubrica: material.rubrica,
          total: new Decimal(0),
          materiais: [],
        };
      }

      const rubricaEntry = acc[material.rubrica];
      if (!rubricaEntry) return acc;

      rubricaEntry.total = rubricaEntry.total.plus(custoTotal);
      rubricaEntry.materiais.push({
        id: material.id,
        nome: material.nome,
        preco: material.preco,
        quantidade: material.quantidade,
        custoTotal,
        workpackage: {
          id: material.workpackage.id,
          nome: material.workpackage.nome,
        },
        ano_utilizacao: material.ano_utilizacao,
        estado: material.estado,
      });

      return acc;
    },
    {} as Record<
      string,
      {
        rubrica: string;
        total: Decimal;
        materiais: Array<{
          id: number;
          nome: string;
          preco: Decimal;
          quantidade: number;
          custoTotal: Decimal;
          workpackage: { id: string; nome: string };
          ano_utilizacao: number;
          estado: boolean;
        }>;
      }
    >
  );

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
    const salarioAjustado = alocacao.user.salario.times(VALOR_SALARIO).times(FATOR_MESES);

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
        alocacao: alocacao.ocupacao,
      },
    });

    return sum.plus(custoAlocacao);
  }, new Decimal(0));

  // Calcular o custo de materiais
  const custoMateriais = materiais.reduce((sum, material) => {
    const custoTotal = material.preco.times(new Decimal(material.quantidade));
    return sum.plus(custoTotal);
  }, new Decimal(0));

  // Orçamento real = custo de recursos + custo de materiais
  return {
    custoRecursos,
    custoMateriais,
    total: custoRecursos.plus(custoMateriais),
    detalhesRecursos,
    detalhesMateriais: Object.values(detalhesMateriais),
  };
}

/**
 * Calcula os totais financeiros de um projeto, incluindo resultado de financiamento.
 * - resultado_financiamento = (orçamento_submetido * taxa_financiamento) - (custo_real_recursos + custo_materiais) + (custo_real_recursos * 0.15)
 * - Pode incluir detalhes por ano para facilitar a visualização em listagens
 */
async function getTotais(
  db: Prisma.TransactionClient,
  projetoId: string,
  options?: {
    ano?: number;
    incluirDetalhesPorAno?: boolean;
  }
) {
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
      fim: true,
    },
  });

  if (!projeto) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Projeto não encontrado",
    });
  }

  // Obter o orçamento submetido
  const orcamentoSubmetido = await getOrcamentoSubmetido(db, projetoId, { ano: options?.ano });

  // Obter o orçamento real (custos efetivos)
  const orcamentoReal = await getOrcamentoReal(db, projetoId, { ano: options?.ano });

  // taxa de financiamento já vem em decimal, não precisa dividir por 100
  const taxaFinanciamento = projeto.taxa_financiamento
    ? new Decimal(projeto.taxa_financiamento)
    : new Decimal(0);

  // Calcular valor financiado (orçamento submetido * taxa de financiamento)
  const valorFinanciado = orcamentoSubmetido.orcamentoTotal.times(taxaFinanciamento);
  // Calcular overhead (15% do custo real de recursos humanos) - NOTA: o overhead do projeto parece ser um valor percentual, mas a fórmula usa -0.15. Verificar se deve usar projeto.overhead
  const overheadCalculado = orcamentoReal.custoRecursos.times(new Decimal(-0.15)); // Overhead fixo de -15% do custo de recursos

  // Calcular resultado financeiro
  // resultado = (valor financiado) - (custo real total) + overhead
  const resultado = valorFinanciado.minus(orcamentoReal.total).plus(overheadCalculado); // Usando o overhead calculado

  // Calcular VAB (Valor Acrescentado Bruto)
  // VAB = valorFinanciado - custoMateriais
  const vab = valorFinanciado.minus(orcamentoReal.custoMateriais);

  // Calcular margem (resultado / valor financiado)
  const margem = valorFinanciado.isZero()
    ? new Decimal(0)
    : resultado.dividedBy(valorFinanciado).times(new Decimal(100));

  // Calcular VAB / Custos com Pessoal
  const vabCustosPessoal = orcamentoReal.custoRecursos.isZero()
    ? new Decimal(0)
    : vab.dividedBy(orcamentoReal.custoRecursos);

  // Calcular custos concluídos (alocações passadas + materiais concluídos)
  // 1. Buscar todas as alocações do projeto com dados do utilizador
  const alocacoes = await db.alocacaoRecurso.findMany({
    where: {
      workpackage: { projetoId },
      ...(options?.ano && { ano: options.ano }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          salario: true,
        },
      },
    },
  });

  // 2. Filtrar alocações passadas (ano anterior ou mesmo ano mas mês < mesAtual) - Ajuste na lógica do mês
  const alocacoesPassadas = alocacoes.filter(
    (a) => a.ano < anoAtual || (a.ano === anoAtual && a.mes < mesAtual) // Mês < mesAtual para incluir o mês anterior mas não o atual
  );

  // 3. Calcular custo das alocações passadas com ajustes
  const custosAlocacoesPassadas = alocacoesPassadas.reduce((sum, alocacao) => {
    if (!alocacao.user.salario) return sum;

    // Usar a mesma fórmula do getOrcamentoReal para consistência
    const salarioAjustado = alocacao.user.salario.times(VALOR_SALARIO).times(FATOR_MESES);

    const custoAlocacao = alocacao.ocupacao.times(salarioAjustado);
    return sum.plus(custoAlocacao);
  }, new Decimal(0));

  // 4. Buscar materiais concluídos
  const materiaisConcluidos = await db.material.findMany({
    where: {
      workpackage: { projetoId },
      estado: true, // Apenas materiais concluídos/adquiridos
      ...(options?.ano && { ano_utilizacao: options.ano }),
    },
  });

  // 5. Calcular custo dos materiais concluídos
  const custoMateriaisConcluidos = materiaisConcluidos.reduce((sum, material) => {
    const custoTotal = material.preco.times(new Decimal(material.quantidade));
    return sum.plus(custoTotal);
  }, new Decimal(0));

  // 6. Total de custos concluídos
  const totalCustosConcluidos = custosAlocacoesPassadas.plus(custoMateriaisConcluidos);

  // Calculo da folga (orçamento submetido - custos reais + overhead)
  const folga = orcamentoSubmetido.orcamentoTotal
    .minus(orcamentoReal.total)
    .plus(overheadCalculado);

  // Base result com custosConcluidos
  const resultadoBase = {
    orcamentoSubmetido: orcamentoSubmetido.orcamentoTotal,
    taxaFinanciamento: projeto.taxa_financiamento || new Decimal(0),
    valorFinanciado,
    custosReais: {
      recursos: orcamentoReal.custoRecursos,
      materiais: orcamentoReal.custoMateriais,
      total: orcamentoReal.total,
      detalhesRecursos: orcamentoReal.detalhesRecursos,
    },
    custosConcluidos: {
      recursos: custosAlocacoesPassadas,
      materiais: custoMateriaisConcluidos,
      total: totalCustosConcluidos,
    },
    overhead: overheadCalculado, // Retornar o overhead calculado
    resultado,
    folga, // Adicionar folga ao resultado base
    vab,
    margem,
    vabCustosPessoal,
  };

  // Se não deseja detalhes por ano, retornar apenas o resultado base
  if (!options?.incluirDetalhesPorAno) {
    return resultadoBase;
  }

  // Caso contrário, calcular detalhes por ano
  const anosSet = new Set<number>();

  // Adicionar anos do orçamento submetido
  orcamentoSubmetido.detalhesPorAno.forEach((detalhe) => {
    anosSet.add(detalhe.ano);
  });

  // Obter todos os anos com alocações
  const todasAlocacoes = await db.alocacaoRecurso.findMany({
    where: { workpackage: { projetoId } },
    select: { ano: true },
    distinct: ["ano"],
  });

  todasAlocacoes.forEach((alocacao) => {
    anosSet.add(alocacao.ano);
  });

  // Obter todos os anos com materiais
  const todosMateriais = await db.material.findMany({
    where: { workpackage: { projetoId } },
    select: { ano_utilizacao: true },
    distinct: ["ano_utilizacao"],
  });

  todosMateriais.forEach((material) => {
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
      const resultadoAno = valorFinanciadoAno.minus(orcamentoRealAno.total).plus(overheadAno); // Usando overhead calculado

      // Calcular VAB para este ano (valor financiado - custo materiais)
      const vabAno = valorFinanciadoAno.minus(orcamentoRealAno.custoMateriais);

      // Calcular margem para este ano
      const margemAno = valorFinanciadoAno.isZero()
        ? new Decimal(0)
        : resultadoAno.dividedBy(valorFinanciadoAno).times(new Decimal(100));

      const vabCustosPessoalAno = orcamentoRealAno.custoRecursos.isZero()
        ? new Decimal(0)
        : vabAno.dividedBy(orcamentoRealAno.custoRecursos);

      // Calcular custos concluídos para este ano
      // 1. Filtrar alocações passadas para este ano
      const alocacoesPassadasAno = alocacoes.filter(
        (a) => a.ano === ano && (ano < anoAtual || (ano === anoAtual && a.mes < mesAtual)) // Ajuste na lógica do mês
      );

      // 2. Calcular custo das alocações passadas com ajustes
      const custosAlocacoesPassadasAno = alocacoesPassadasAno.reduce((sum, alocacao) => {
        if (!alocacao.user.salario) return sum;

        const salarioAjustado = alocacao.user.salario.times(VALOR_SALARIO).times(FATOR_MESES);

        const custoAlocacao = alocacao.ocupacao.times(salarioAjustado);
        return sum.plus(custoAlocacao);
      }, new Decimal(0));

      // 3. Filtrar materiais concluídos para este ano
      const materiaisConcluidosAno = await db.material.findMany({
        where: {
          workpackage: { projetoId },
          estado: true,
          ano_utilizacao: ano,
        },
      });

      // 4. Calcular custo dos materiais concluídos para este ano
      const custoMateriaisConcluidosAno = materiaisConcluidosAno.reduce((sum, material) => {
        const custoTotal = material.preco.times(new Decimal(material.quantidade));
        return sum.plus(custoTotal);
      }, new Decimal(0));

      // 5. Total de custos concluídos para este ano
      const totalCustosConcluidosAno = custosAlocacoesPassadasAno.plus(custoMateriaisConcluidosAno);

      // Calcular folga para este ano
      const folgaAno = orcamentoSubmetidoAno.orcamentoTotal
        .minus(orcamentoRealAno.total)
        .plus(overheadAno); // Usando overhead calculado

      return {
        ano,
        orcamento: {
          submetido: orcamentoSubmetidoAno.orcamentoTotal,
          real: {
            recursos: orcamentoRealAno.custoRecursos,
            materiais: orcamentoRealAno.custoMateriais,
            total: orcamentoRealAno.total,
            detalhesRecursos: orcamentoRealAno.detalhesRecursos,
          },
        },
        custosConcluidos: {
          recursos: custosAlocacoesPassadasAno,
          materiais: custoMateriaisConcluidosAno,
          total: totalCustosConcluidosAno,
        },
        alocacoes: orcamentoSubmetidoAno.totalAlocacao,
        valorFinanciado: valorFinanciadoAno,
        overhead: overheadAno, // Usando overhead calculado
        resultado: resultadoAno,
        folga: folgaAno,
        vab: vabAno,
        margem: margemAno,
        vabCustosPessoal: vabCustosPessoalAno,
      };
    })
  );

  return {
    ...resultadoBase,
    detalhesAnuais,
    anos,
  };
}

export const financasRouter = createTRPCRouter({
  getFinancas: protectedProcedure
    .input(
      z.object({
        projetoId: z.string().uuid("ID do projeto inválido"),
        ano: z.number().int().min(2000).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { projetoId, ano } = input;

      try {
        const projeto = await ctx.db.projeto.findUnique({
          where: { id: projetoId },
          select: {
            valor_eti: true,
            overhead: true,
            taxa_financiamento: true,
          },
        });

        if (!projeto) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Projeto não encontrado",
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

        const alocacoes = (await ctx.db.alocacaoRecurso.findMany({
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
              },
            },
            workpackage: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        })) as AlocacaoDetalhada[];

        // Buscar materiais adquiridos
        const materiaisAdquiridos = await ctx.db.material.findMany({
          where: {
            workpackage: { projetoId },
            estado: true,
            ...(ano && { ano_utilizacao: ano }),
          },
        });

        const custoMaterialAdquirido = materiaisAdquiridos.reduce((sum, material) => {
          const custoTotal = material.preco.times(new Decimal(material.quantidade));
          return sum.plus(custoTotal);
        }, new Decimal(0));

        // Calcular alocações que já ocorreram (meses passados)
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;

        const custosAlocacoesPassadas = totaisFinanceiros.custosConcluidos.recursos;
        const etisAlocacoesPassadas = alocacoes
          .filter((a) => a.ano < anoAtual || (a.ano === anoAtual && a.mes < mesAtual))
          .reduce((sum, a) => sum.plus(a.ocupacao), new Decimal(0));

        // Tipo para detalhes de alocação por utilizador
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
            // Removido custo base, mantido custo ajustado
            custoAjustado: number;
            fatores: {
              segurancaSocial: number;
              meses: number;
            };
          }>;
        };

        // Organizar detalhes por utilizador, usando os custos ajustados
        const custosPorUser = alocacoes.reduce(
          (acc, alocacao) => {
            const user = alocacao.user;
            const workpackage = alocacao.workpackage;

            if (!acc[user.id]) {
              acc[user.id] = {
                user: {
                  id: user.id,
                  name: user.name ?? "Nome Desconhecido",
                  salario: user.salario,
                },
                totalAlocacao: new Decimal(0),
                custoTotal: new Decimal(0),
                alocacoes: [],
              };
            }

            if (alocacao.ocupacao) {
              const userEntry = acc[user.id] as UserAlocacaoDetails;

              userEntry.totalAlocacao = userEntry.totalAlocacao.plus(alocacao.ocupacao);

              // Calcular o custo com os fatores de ajuste (1.223 * 14/11)
              const VALOR_SALARIO = new Decimal(1.223);
              const FATOR_MESES = new Decimal(14).dividedBy(new Decimal(11));

              let custoAjustado = new Decimal(0);

              if (user.salario) {
                const salarioAjustado = user.salario.times(VALOR_SALARIO).times(FATOR_MESES);

                custoAjustado = alocacao.ocupacao.times(salarioAjustado);

                userEntry.custoTotal = userEntry.custoTotal.plus(custoAjustado);
              }

              // Adicionar detalhe da alocação
              userEntry.alocacoes.push({
                alocacaoId: alocacao.id,
                workpackage: {
                  id: workpackage.id,
                  nome: workpackage.nome,
                },
                data: new Date(alocacao.ano, alocacao.mes - 1, 1),
                mes: alocacao.mes,
                ano: alocacao.ano,
                etis: alocacao.ocupacao.toNumber(),
                custoAjustado: custoAjustado.toNumber(),
                // Incluir os fatores para explicar o cálculo
                fatores: {
                  segurancaSocial: VALOR_SALARIO.toNumber(),
                  meses: FATOR_MESES.toNumber(),
                },
              });
            }

            return acc;
          },
          {} as Record<string, UserAlocacaoDetails>
        );

        // Construir a resposta final, convertendo Decimals para numbers
        return {
          parametros: {
            valor_eti: projeto.valor_eti?.toNumber() || 0,
            taxa_financiamento: projeto.taxa_financiamento?.toNumber() || 0,
            overhead: projeto.overhead?.toNumber() || 0, // Overhead percentual definido no projeto
          },
          orcamento: {
            submetido: orcamentoSubmetido.orcamentoTotal.toNumber(),
            detalhesSubmissao: orcamentoSubmetido.detalhesPorAno.map((d) => ({
              ano: d.ano,
              totalAlocacao: d.totalAlocacao.toNumber(),
              orcamento: d.orcamento.toNumber(),
            })),
            real: {
              recursos: orcamentoReal.custoRecursos.toNumber(),
              materiais: orcamentoReal.custoMateriais.toNumber(),
              total: orcamentoReal.total.toNumber(),
              // Incluir os detalhes por recurso
              detalhesRecursos: orcamentoReal.detalhesRecursos.map((detalhe) => ({
                userId: detalhe.userId,
                userName: detalhe.userName,
                salario: detalhe.salario?.toNumber() || 0,
                alocacao: detalhe.alocacao.toNumber(),
                custoAjustado: detalhe.custoAjustado.toNumber(),
                detalhesCalculo: {
                  salarioBase: detalhe.detalhesCalculo.salarioBase?.toNumber() || 0,
                  salarioAjustado: detalhe.detalhesCalculo.salarioAjustado?.toNumber() || 0,
                  alocacao: detalhe.detalhesCalculo.alocacao.toNumber(),
                  formulaUsada: "alocacao * (salario * 1.223 * 14/11)",
                },
              })),
            },
          },
          financeiro: {
            valorFinanciado: totaisFinanceiros.valorFinanciado.toNumber(),
            overheadCalculado: totaisFinanceiros.overhead.toNumber(), // Overhead monetário calculado
            resultado: totaisFinanceiros.resultado.toNumber(),
            folga: totaisFinanceiros.folga.toNumber(),
            vab: totaisFinanceiros.vab.toNumber(),
            margem: totaisFinanceiros.margem.toNumber(),
            vabCustosPessoal: totaisFinanceiros.vabCustosPessoal.toNumber(),
          },
          custosRealizados: {
            // Renomeado de custosConcluidos para mais clareza
            alocacoes: {
              custo: custosAlocacoesPassadas.toNumber(),
              etis: etisAlocacoesPassadas.toNumber(),
            },
            materiais: {
              custo: custoMaterialAdquirido.toNumber(),
              quantidade: materiaisAdquiridos.length, // Manter quantidade para info
            },
            total: totaisFinanceiros.custosConcluidos.total.toNumber(), // Usar o total dos custos concluídos já calculado
            percentagemOrcamentoReal: orcamentoReal.total.greaterThan(0)
              ? totaisFinanceiros.custosConcluidos.total
                  .dividedBy(orcamentoReal.total)
                  .times(100)
                  .toNumber()
              : 0,
            percentagemOrcamentoSubmetido: orcamentoSubmetido.orcamentoTotal.greaterThan(0)
              ? totaisFinanceiros.custosConcluidos.total
                  .dividedBy(orcamentoSubmetido.orcamentoTotal)
                  .times(100)
                  .toNumber()
              : 0,
          },
          detalhesPorUser: Object.values(custosPorUser).map((item) => ({
            user: {
              id: item.user.id,
              name: item.user.name,
              salario: item.user.salario?.toNumber(), // Convertendo salário
            },
            totalAlocacao: item.totalAlocacao.toNumber(),
            custoTotal: item.custoTotal.toNumber(),
            alocacoes: item.alocacoes.sort((a, b) => {
              if (a.ano !== b.ano) return a.ano - b.ano;
              return a.mes - b.mes;
            }),
          })),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erro ao buscar finanças do projeto:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar finanças do projeto",
          cause: error,
        });
      }
    }),

  getTotaisFinanceiros: protectedProcedure
    .input(
      z.object({
        projetoId: z.string().uuid("ID do projeto inválido").optional(),
        ano: z.number().int().min(2000).optional(),
        incluirDetalhesPorAno: z.boolean().optional().default(false),
        apenasAtivos: z.boolean().optional().default(true), // Novo parâmetro para filtrar projetos ativos
      })
    )
    .query(async ({ ctx, input }) => {
      const { projetoId, ano, incluirDetalhesPorAno, apenasAtivos } = input;

      try {
        // CASO 1: Se projetoId for fornecido, retorna dados de um projeto específico
        if (projetoId) {
          const totais = await getTotais(ctx.db, projetoId, {
            ano,
            incluirDetalhesPorAno,
          });

          // Função auxiliar para converter detalhes de recursos
          const mapDetalhesRecursos = (detalhes: typeof totais.custosReais.detalhesRecursos) =>
            detalhes?.map((dr) => ({
              userId: dr.userId,
              userName: dr.userName,
              salario: dr.salario?.toNumber() || 0,
              alocacao: dr.alocacao.toNumber(),
              custoAjustado: dr.custoAjustado.toNumber(),
              detalhesCalculo: {
                salarioBase: dr.detalhesCalculo.salarioBase?.toNumber() || 0,
                salarioAjustado: dr.detalhesCalculo.salarioAjustado?.toNumber() || 0,
                alocacao: dr.detalhesCalculo.alocacao.toNumber(),
                formulaUsada: "alocacao * (salario * 1.223 * 14/11)",
              },
            })) || [];

          // Construir a resposta base para um projeto específico
          const resposta = {
            orcamentoSubmetido: totais.orcamentoSubmetido.toNumber(),
            taxaFinanciamento: totais.taxaFinanciamento.toNumber(),
            valorFinanciado: totais.valorFinanciado.toNumber(),
            custosReais: {
              recursos: totais.custosReais.recursos.toNumber(),
              materiais: totais.custosReais.materiais.toNumber(),
              total: totais.custosReais.total.toNumber(),
              detalhesRecursos: mapDetalhesRecursos(totais.custosReais.detalhesRecursos),
            },
            custosConcluidos: {
              recursos: totais.custosConcluidos?.recursos.toNumber() || 0,
              materiais: totais.custosConcluidos?.materiais.toNumber() || 0,
              total: totais.custosConcluidos?.total.toNumber() || 0,
            },
            overhead: totais.overhead.toNumber(),
            resultado: totais.resultado.toNumber(),
            folga: totais.folga.toNumber(),
            vab: totais.vab.toNumber(),
            margem: totais.margem.toNumber(),
            vabCustosPessoal: totais.vabCustosPessoal.toNumber(),
            meta: {
              tipo: "projeto_individual",
              projetoId,
              filtroAno: ano,
              incluiDetalhes: incluirDetalhesPorAno,
            },
          };

          // Adiciona os detalhes por ano se solicitado e disponível
          if (incluirDetalhesPorAno && "detalhesAnuais" in totais && totais.detalhesAnuais) {
            return {
              ...resposta,
              anos: totais.anos,
              detalhesAnuais: totais.detalhesAnuais.map((detalhe) => ({
                ano: detalhe.ano,
                orcamento: {
                  submetido: detalhe.orcamento.submetido.toNumber(),
                  real: {
                    recursos: detalhe.orcamento.real.recursos.toNumber(),
                    materiais: detalhe.orcamento.real.materiais.toNumber(),
                    total: detalhe.orcamento.real.total.toNumber(),
                    detalhesRecursos: mapDetalhesRecursos(detalhe.orcamento.real.detalhesRecursos),
                  },
                },
                custosConcluidos: {
                  recursos: detalhe.custosConcluidos?.recursos.toNumber() || 0,
                  materiais: detalhe.custosConcluidos?.materiais.toNumber() || 0,
                  total: detalhe.custosConcluidos?.total.toNumber() || 0,
                },
                alocacoes: detalhe.alocacoes.toNumber(),
                valorFinanciado: detalhe.valorFinanciado.toNumber(),
                overhead: detalhe.overhead.toNumber(),
                resultado: detalhe.resultado.toNumber(),
                folga: detalhe.folga.toNumber(),
                vab: detalhe.vab.toNumber(),
                margem: detalhe.margem.toNumber(),
                vabCustosPessoal: detalhe.vabCustosPessoal.toNumber(),
              })),
            };
          }

          return resposta;
        }

        // CASO 2: Se projetoId não for fornecido, retorna dados agregados de todos os projetos
        const projetos = await ctx.db.projeto.findMany({
          where: {
            estado: apenasAtivos ? { in: ["APROVADO", "EM_DESENVOLVIMENTO"] } : undefined,
          },
          select: {
            id: true,
            nome: true,
            estado: true,
            responsavel: {
              select: {
                id: true,
                name: true,
              },
            },
            workpackages: {
              select: {
                tarefas: {
                  select: {
                    estado: true,
                  },
                },
              },
            },
          },
        });

        // Função auxiliar para converter detalhes de recursos
        const mapDetalhesRecursos = (
          detalhes: Awaited<ReturnType<typeof getOrcamentoReal>>["detalhesRecursos"]
        ) =>
          detalhes?.map((dr) => ({
            userId: dr.userId,
            userName: dr.userName,
            salario: dr.salario?.toNumber() || 0,
            alocacao: dr.alocacao.toNumber(),
            custoAjustado: dr.custoAjustado.toNumber(),
            detalhesCalculo: {
              salarioBase: dr.detalhesCalculo.salarioBase?.toNumber() || 0,
              salarioAjustado: dr.detalhesCalculo.salarioAjustado?.toNumber() || 0,
              alocacao: dr.detalhesCalculo.alocacao.toNumber(),
              formulaUsada: "alocacao * (salario * 1.223 * 14/11)",
            },
          })) || [];

        // Buscar dados financeiros para cada projeto
        const dadosFinanceiros = await Promise.all(
          projetos.map(async (projeto) => {
            try {
              // Calcular progresso físico
              let totalTarefas = 0;
              let tarefasConcluidas = 0;
              projeto.workpackages?.forEach((wp) => {
                totalTarefas += wp.tarefas.length;
                tarefasConcluidas += wp.tarefas.filter((tarefa) => tarefa.estado === true).length;
              });
              const progressoFisico =
                totalTarefas > 0 ? Math.round((tarefasConcluidas / totalTarefas) * 100) : 0;

              // Chamar getTotais com incluirDetalhesPorAno: true
              const financasRaw = await getTotais(ctx.db, projeto.id, {
                incluirDetalhesPorAno: true,
              });

              // Mapear os resultados para o formato desejado
              const financasMapped = {
                orcamentoSubmetido: financasRaw.orcamentoSubmetido.toNumber(),
                taxaFinanciamento: financasRaw.taxaFinanciamento.toNumber(),
                valorFinanciado: financasRaw.valorFinanciado.toNumber(),
                custosReais: {
                  recursos: financasRaw.custosReais.recursos.toNumber(),
                  materiais: financasRaw.custosReais.materiais.toNumber(),
                  total: financasRaw.custosReais.total.toNumber(),
                  detalhesRecursos: mapDetalhesRecursos(financasRaw.custosReais.detalhesRecursos),
                },
                custosConcluidos: {
                  recursos: financasRaw.custosConcluidos?.recursos.toNumber() || 0,
                  materiais: financasRaw.custosConcluidos?.materiais.toNumber() || 0,
                  total: financasRaw.custosConcluidos?.total.toNumber() || 0,
                },
                overhead: financasRaw.overhead.toNumber(),
                resultado: financasRaw.resultado.toNumber(),
                folga: financasRaw.folga.toNumber(),
                vab: financasRaw.vab.toNumber(),
                margem: financasRaw.margem.toNumber(),
                vabCustosPessoal: financasRaw.vabCustosPessoal.toNumber(),
                anos:
                  "anos" in financasRaw && Array.isArray(financasRaw.anos) ? financasRaw.anos : [],
                detalhesAnuais:
                  "detalhesAnuais" in financasRaw && Array.isArray(financasRaw.detalhesAnuais)
                    ? financasRaw.detalhesAnuais.map((detalhe) => ({
                        ano: detalhe.ano,
                        orcamento: {
                          submetido: detalhe.orcamento.submetido.toNumber(),
                          real: {
                            recursos: detalhe.orcamento.real.recursos.toNumber(),
                            materiais: detalhe.orcamento.real.materiais.toNumber(),
                            total: detalhe.orcamento.real.total.toNumber(),
                            detalhesRecursos: mapDetalhesRecursos(
                              detalhe.orcamento.real.detalhesRecursos
                            ),
                          },
                        },
                        custosConcluidos: {
                          recursos: detalhe.custosConcluidos?.recursos.toNumber() || 0,
                          materiais: detalhe.custosConcluidos?.materiais.toNumber() || 0,
                          total: detalhe.custosConcluidos?.total.toNumber() || 0,
                        },
                        alocacoes: detalhe.alocacoes.toNumber(),
                        valorFinanciado: detalhe.valorFinanciado.toNumber(),
                        overhead: detalhe.overhead.toNumber(),
                        resultado: detalhe.resultado.toNumber(),
                        folga: detalhe.folga.toNumber(),
                        vab: detalhe.vab.toNumber(),
                        margem: detalhe.margem.toNumber(),
                        vabCustosPessoal: detalhe.vabCustosPessoal.toNumber(),
                      }))
                    : [],
              };

              return {
                id: projeto.id,
                nome: projeto.nome,
                estado: projeto.estado,
                responsavel: projeto.responsavel,
                progresso: progressoFisico,
                financas: financasMapped,
              };
            } catch (error) {
              console.error(
                `Erro ao obter dados financeiros detalhados do projeto ${projeto.id}:`,
                error
              );
              return {
                id: projeto.id,
                nome: projeto.nome,
                estado: projeto.estado,
                responsavel: projeto.responsavel,
                progresso: 0,
                financas: null,
              };
            }
          })
        );

        // Filtrar projetos onde a busca de finanças falhou
        const projetosComFinancas = dadosFinanceiros.filter((p) => p.financas !== null) as Array<
          Omit<(typeof dadosFinanceiros)[number], "financas"> & {
            financas: NonNullable<(typeof dadosFinanceiros)[number]["financas"]>;
          }
        >;

        // Calcular totais consolidados
        const totaisConsolidados = {
          totalProjetosConsultados: projetos.length,
          projetosComFinancas: projetosComFinancas.length,
          orcamentoTotalSubmetido: projetosComFinancas.reduce(
            (acc, p) => acc + p.financas.orcamentoSubmetido,
            0
          ),
          valorTotalFinanciado: projetosComFinancas.reduce(
            (acc, p) => acc + p.financas.valorFinanciado,
            0
          ),
          custosReaisTotal: projetosComFinancas.reduce(
            (acc, p) => acc + p.financas.custosReais.total,
            0
          ),
          custosConcluidosTotal: projetosComFinancas.reduce(
            (acc, p) => acc + p.financas.custosConcluidos.total,
            0
          ),
          overheadTotal: projetosComFinancas.reduce((acc, p) => acc + p.financas.overhead, 0),
          resultadoTotal: projetosComFinancas.reduce((acc, p) => acc + p.financas.resultado, 0),
          folgaTotal: projetosComFinancas.reduce((acc, p) => acc + p.financas.folga, 0),
        };

        // Segmentar projetos por estado financeiro
        const projetosClassificados = {
          saudaveis: projetosComFinancas.filter(
            (p) =>
              p.financas.orcamentoSubmetido > 0 &&
              p.financas.custosReais.total / p.financas.orcamentoSubmetido <= 0.7
          ).length,
          emRisco: projetosComFinancas.filter(
            (p) =>
              p.financas.orcamentoSubmetido > 0 &&
              p.financas.custosReais.total / p.financas.orcamentoSubmetido > 0.7 &&
              p.financas.custosReais.total / p.financas.orcamentoSubmetido <= 0.9
          ).length,
          criticos: projetosComFinancas.filter(
            (p) =>
              p.financas.orcamentoSubmetido > 0 &&
              p.financas.custosReais.total / p.financas.orcamentoSubmetido > 0.9
          ).length,
          comResultadoPositivo: projetosComFinancas.filter((p) => p.financas.resultado > 0).length,
          comResultadoNegativo: projetosComFinancas.filter((p) => p.financas.resultado < 0).length,
        };

        // Calcular médias
        const numProjetosValidos = projetosComFinancas.length;
        const orcamentoTotalValido = totaisConsolidados.orcamentoTotalSubmetido;

        return {
          meta: {
            tipo: "visao_geral",
            filtroAno: ano,
            apenasAtivos,
            incluiDetalhes: incluirDetalhesPorAno,
          },
          projetos: projetosComFinancas,
          totaisConsolidados,
          projetosClassificados,
          taxaMediaFinanciamento:
            orcamentoTotalValido > 0
              ? (totaisConsolidados.valorTotalFinanciado / orcamentoTotalValido) * 100
              : 0,
          margemMedia:
            orcamentoTotalValido > 0
              ? (totaisConsolidados.resultadoTotal / orcamentoTotalValido) * 100
              : 0,
          progressoFinanceiroMedio:
            totaisConsolidados.custosReaisTotal > 0
              ? (totaisConsolidados.custosConcluidosTotal / totaisConsolidados.custosReaisTotal) *
                100
              : 0,
          progressoFisicoMedio:
            numProjetosValidos > 0
              ? projetosComFinancas.reduce((acc, p) => acc + p.progresso, 0) / numProjetosValidos
              : 0,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Erro ao calcular totais financeiros:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao calcular totais financeiros ${projetoId ? "do projeto" : "agregados"}`,
          cause: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }),
});
