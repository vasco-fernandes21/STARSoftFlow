import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma, Rubrica } from "@prisma/client";
import { Decimal } from "decimal.js";

/**
 * Função auxiliar para calcular salário ajustado
 */
function calcularSalarioAjustado(salario: Decimal | number | null | undefined): Decimal {
  if (salario === null || salario === undefined) {
    return new Decimal(0);
  }
  const salarioDecimal = new Decimal(salario);
  const VALOR_SALARIO = new Decimal(1.223);
  const FATOR_MESES = new Decimal(14).dividedBy(new Decimal(11)); 
  return salarioDecimal.times(VALOR_SALARIO).times(FATOR_MESES);
}

/**
 * Calcula o orçamento submetido de um projeto.
 * Se o projeto está PENDENTE:
 * - Se valor_eti > 0: orçamento = alocações × valor_eti
 * - Se valor_eti = 0: orçamento = custo real das alocações + custo real dos materiais
 * 
 * Se o projeto está APROVADO (com snapshot):
 * - Se valor_eti > 0: orçamento = alocações do snapshot × valor_eti do snapshot
 * - Se valor_eti = 0: orçamento = custo real das alocações + custo real dos materiais
 */

async function getOrcamentoSubmetido(
  db: Prisma.TransactionClient,
  projetoId: string,
  filtros?: { ano?: number }
) {
  type ResultadoOrcamentoSubmetido = {
    orcamentoTotal: Decimal;
    tipoCalculo: 'ETI_DB' | 'ETI_SNAPSHOT' | 'REAL' | 'INVALIDO';
    valorETI: Decimal | null;
    totalAlocacao: Decimal | null;
    detalhes?: {
      recursos: Decimal;
      materiais: Decimal;
    } | null;
    detalhesPorAno: Array<{
      ano: number;
      orcamento: Decimal;
      valorETI?: Decimal | null;
      totalAlocacao?: Decimal | null;
      custoRecursos?: Decimal;
      custoMateriais?: Decimal;
    }>;
  };

  // 1. Pega no projeto e nos seus dados relevantes
  const projeto = await db.projeto.findUnique({
    where: { id: projetoId },
    select: { 
      estado: true,
      valor_eti: true,
      aprovado: true,
    },
  });

  if (!projeto) {
    return {
      orcamentoTotal: new Decimal(0),
      tipoCalculo: 'INVALIDO',
      valorETI: null,
      totalAlocacao: null,
      detalhes: null,
      detalhesPorAno: [],
    } satisfies ResultadoOrcamentoSubmetido;
  }

  // 2. Função auxiliar para calcular orçamento real
  async function calcularOrcamentoRealLocal() { // Renomeada para evitar conflito de escopo
    const orcamentoRealInfo = await getOrcamentoReal(db, projetoId, filtros);
    
    const detalhesPorAnoReal = filtros?.ano ? [{
      ano: filtros.ano,
      orcamento: orcamentoRealInfo.total,
      custoRecursos: orcamentoRealInfo.custoRecursos,
      custoMateriais: orcamentoRealInfo.custoMateriais
    }] : [];

      return {
      orcamentoTotal: orcamentoRealInfo.total,
      tipoCalculo: 'REAL',
        valorETI: null,
        totalAlocacao: null,
      detalhes: {
        recursos: orcamentoRealInfo.custoRecursos,
        materiais: orcamentoRealInfo.custoMateriais
      },
      detalhesPorAno: detalhesPorAnoReal,
    } satisfies ResultadoOrcamentoSubmetido;
  }

  // --- Lógica para Projetos NÃO APROVADOS (PENDENTE) --- 
  if (projeto.estado !== 'APROVADO' || !projeto.aprovado) {
    const valorETIAtual = projeto.valor_eti ?? new Decimal(0);
    
    if (valorETIAtual.isZero()) {
      return await calcularOrcamentoRealLocal();
    }

    const alocacoesDB = await db.alocacaoRecurso.findMany({
      where: {
        workpackage: { projetoId },
        ...(filtros?.ano && { ano: filtros.ano }),
      },
      select: { ocupacao: true, ano: true },
    });

    const alocacoesPorAnoDB: Record<number, Decimal> = {};
    const totalAlocacaoDB = alocacoesDB.reduce((sum: Decimal, aloc: { ocupacao: Decimal, ano: number }) => {
      const anoAloc = aloc.ano;
       if (!alocacoesPorAnoDB[anoAloc]) {
            alocacoesPorAnoDB[anoAloc] = new Decimal(0);
        }
        alocacoesPorAnoDB[anoAloc] = alocacoesPorAnoDB[anoAloc].plus(aloc.ocupacao);
      return sum.plus(aloc.ocupacao);
    }, new Decimal(0));

    const orcamentoTotalDB = totalAlocacaoDB.times(valorETIAtual);

    const detalhesPorAnoDB = Object.entries(alocacoesPorAnoDB).map(([anoStr, alocAno]) => ({
      ano: parseInt(anoStr),
      orcamento: alocAno.times(valorETIAtual),
      valorETI: valorETIAtual,
      totalAlocacao: alocAno,
    })).sort((a, b) => a.ano - b.ano);

    return {
      orcamentoTotal: orcamentoTotalDB,
      tipoCalculo: 'ETI_DB',
      valorETI: valorETIAtual,
      totalAlocacao: totalAlocacaoDB,
      detalhes: null,
      detalhesPorAno: detalhesPorAnoDB,
    } satisfies ResultadoOrcamentoSubmetido;
  }

  // --- Lógica para Projetos APROVADOS (Usa Snapshot) --- 
  let snapshotData: any = null;
  try {
    if (typeof projeto.aprovado === 'string') {
        snapshotData = JSON.parse(projeto.aprovado);
    } else if (typeof projeto.aprovado === 'object' && projeto.aprovado !== null) {
      snapshotData = projeto.aprovado;
    } else {
        throw new Error('Snapshot inválido ou ausente.');
    }
  } catch (e) {
    console.error(`Erro ao processar snapshot do projeto ${projetoId}:`, e);
    return await calcularOrcamentoRealLocal();
  }

  const valorETISnapshot = snapshotData.valor_eti ? new Decimal(snapshotData.valor_eti) : new Decimal(0);

  if (valorETISnapshot.isZero()) {
    return await calcularOrcamentoRealLocal();
  }

      const snapshotWorkpackages = snapshotData.workpackages ?? [];
      const alocacoesPorAnoSnapshot: Record<number, Decimal> = {};
      let totalAlocacaoSnapshot = new Decimal(0);

      snapshotWorkpackages.forEach((wp: any) => {
          const recursos = wp.recursos ?? [];
          recursos.forEach((rec: any) => {
              const anoRec = rec.ano;
              if (!filtros?.ano || anoRec === filtros.ano) {
                  const ocupacao = new Decimal(rec.ocupacao || 0);
                  totalAlocacaoSnapshot = totalAlocacaoSnapshot.plus(ocupacao);
                  if (!alocacoesPorAnoSnapshot[anoRec]) {
                      alocacoesPorAnoSnapshot[anoRec] = new Decimal(0);
        }
                  alocacoesPorAnoSnapshot[anoRec] = alocacoesPorAnoSnapshot[anoRec].plus(ocupacao);
              }
          });
      });

      const orcamentoTotalETI = totalAlocacaoSnapshot.times(valorETISnapshot);
      const detalhesPorAnoETI = Object.entries(alocacoesPorAnoSnapshot).map(([anoStr, alocAno]) => ({
        ano: parseInt(anoStr),
        orcamento: alocAno.times(valorETISnapshot),
        valorETI: valorETISnapshot,
        totalAlocacao: alocAno,
      })).sort((a, b) => a.ano - b.ano);

      return {
        orcamentoTotal: orcamentoTotalETI,
        tipoCalculo: 'ETI_SNAPSHOT',
        valorETI: valorETISnapshot,
        totalAlocacao: totalAlocacaoSnapshot,
        detalhes: null,
        detalhesPorAno: detalhesPorAnoETI,
      } satisfies ResultadoOrcamentoSubmetido;
}

/**
 * Calcula o orçamento real de um projeto.
 * O orçamento real é a soma dos custos de recursos humanos (salário * alocação * fatores de ajuste) e custos de materiais.
 */
async function getOrcamentoReal(
  db: Prisma.TransactionClient,
  projetoId: string,
  filtros?: { ano?: number; workpackageId?: string }
) {
  // Fatores de ajuste para o cálculo real do custo de recursos
  const VALOR_SALARIO = new Decimal(1.223);
  const FATOR_MESES = new Decimal(14).dividedBy(new Decimal(11));

  // Vai buscar todas as alocações de recursos do projeto com informações do utilizador (salário)
  const alocacoes = await db.alocacaoRecurso.findMany({
    where: {
      workpackage: { 
        projetoId,
        ...(filtros?.workpackageId && { id: filtros.workpackageId }),
      },
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
      workpackage: { 
        projetoId,
        ...(filtros?.workpackageId && { id: filtros.workpackageId }),
      },
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
      mes: true,
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
        mes: material.mes != null ? material.mes : 1,
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
          mes: number;
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
 * Função auxiliar para calcular custos detalhados (Recursos + Materiais) a partir de dados de snapshot,
 * com filtros opcionais por workpackageId e ano.
 */
async function calcularCustosDetalhadosSnapshotFiltrado(
  snapshotData: any,
  filtros?: { workpackageId?: string; ano?: number }
): Promise<{
  custoRecursosTotal: Decimal;
  custoMateriaisTotal: Decimal;
}> {
  let custoRecursosTotal = new Decimal(0);
  let custoMateriaisTotal = new Decimal(0);

  const workpackagesSnapshot = snapshotData?.workpackages ?? [];

  for (const wpSnap of workpackagesSnapshot) {
    // Filtrar por workpackageId se fornecido
    if (filtros?.workpackageId && wpSnap.id !== filtros.workpackageId) {
      continue;
    }

    // Calcular Custo Recursos WP do Snapshot
    const recursosWPSnapshot = wpSnap.recursos ?? [];
    recursosWPSnapshot.forEach((r: any) => {
      const anoRecurso = r.ano as number;
      // Aplicar filtro de ano, se existir
      if (!filtros?.ano || anoRecurso === filtros.ano) {
        const salarioSnap = r.user?.salario ? new Decimal(r.user.salario) : null;
        const custoRecurso = new Decimal(r.ocupacao || 0).times(calcularSalarioAjustado(salarioSnap));
        custoRecursosTotal = custoRecursosTotal.plus(custoRecurso);
      }
    });

    // Calcular Custo Materiais WP do Snapshot
    const materiaisWPSnapshot = wpSnap.materiais ?? [];
    materiaisWPSnapshot.forEach((m: any) => {
      const anoMaterial = m.ano_utilizacao as number;
      // Aplicar filtro de ano, se existir
      if (!filtros?.ano || anoMaterial === filtros.ano) {
        const custoMaterial = new Decimal(m.preco || 0).times(new Decimal(m.quantidade || 0));
        custoMateriaisTotal = custoMateriaisTotal.plus(custoMaterial);
      }
    });
  }

  return {
    custoRecursosTotal,
    custoMateriaisTotal,
  };
}

/**
 * Calcula os totais financeiros de um projeto.
 * Retorna apenas métricas essenciais:
 * - Orçamento Submetido
 * - Orçamento Real
 * - Resultado Financeiro
 * - Margem
 * - VAB/Custos Pessoal
 * - Folga
 */
async function getTotais(
  db: Prisma.TransactionClient,
  projetoId: string,
  options?: {
    ano?: number;
  }
) {
  // Obter o projeto com taxa de financiamento
  const projeto = await db.projeto.findUnique({
    where: { id: projetoId },
    select: {
      valor_eti: true,
      taxa_financiamento: true,
      overhead: true,
    },
  });

  if (!projeto) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Projeto não encontrado",
    });
  }

  // Obter o orçamento submetido
  const orcamentoSubmetidoInfo = await getOrcamentoSubmetido(db, projetoId, { ano: options?.ano });
  const orcamentoSubmetidoValor = orcamentoSubmetidoInfo.orcamentoTotal;

  // Obter o orçamento real (custos efetivos)
  const orcamentoReal = await getOrcamentoReal(db, projetoId, { ano: options?.ano });

  // taxa de financiamento já vem em decimal, não precisa dividir por 100
  const taxaFinanciamento = projeto.taxa_financiamento
    ? new Decimal(projeto.taxa_financiamento)
    : new Decimal(0);

  // Calcular valor financiado (orçamento submetido * taxa de financiamento)
  const valorFinanciado = orcamentoSubmetidoValor.times(taxaFinanciamento);
  
  // Calcular overhead - Usa o CUSTO REAL de recursos
  const overheadCalculadoReal = orcamentoReal.custoRecursos.times(new Decimal(-0.15)); 

  // Calcular resultado financeiro (orçamento submetido * taxa de financiamento - custo real total + overhead)
  const resultado = valorFinanciado.minus(orcamentoReal.total).plus(overheadCalculadoReal);

  // Calcular VAB (orçamento submetido * taxa de financiamento - custo materiais)
  const vab = valorFinanciado.minus(orcamentoReal.custoMateriais);

  // Calcular margem (resultado / orçamento submetido)
  const margem = orcamentoSubmetidoValor.isZero() 
    ? new Decimal(0) 
    : resultado.dividedBy(orcamentoSubmetidoValor).times(new Decimal(100));

  // Calcular VAB / Custos com Pessoal
  const vabCustosPessoal = orcamentoReal.custoRecursos.isZero()
    ? new Decimal(0)
    : vab.dividedBy(orcamentoReal.custoRecursos);

  // Calculo da folga (orçamento submetido - custo real + overhead)
  const folga = orcamentoSubmetidoValor.minus(orcamentoReal.total).plus(overheadCalculadoReal);

  return {
    orcamentoSubmetido: orcamentoSubmetidoValor,
    orcamentoReal: orcamentoReal.total,
    resultadoFinanceiro: resultado,
    margem,
    vabCustosPessoal,
    folga,
  };
}

export const financasRouter = createTRPCRouter({

  getGastosMensais: protectedProcedure
    .input(
      z.object({
        projetoId: z.string().uuid("ID do projeto inválido"),
        ano: z.number().int().min(2000),
        mes: z.number().int().min(1).max(12).optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { projetoId, ano } = input;

      // Buscar dados do projeto para saber duração
      const projeto = await ctx.db.projeto.findUnique({
        where: { id: projetoId },
        select: { inicio: true, fim: true }
      });

      if (!projeto) { 
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Projeto não encontrado"
        });
      }

      // Função auxiliar para calcular dados de um mês específico
      async function getDadosMes(mes: number) {
        // Buscar alocações do mês
        const alocacoes = await ctx.db.alocacaoRecurso.findMany({
          where: {
            workpackage: { projetoId },
            ano,
            mes
          },
          include: {
            user: { select: { salario: true } }
          }
        });

        // Buscar materiais do mês
        const materiais = await ctx.db.material.findMany({
          where: {
            workpackage: { projetoId },
            ano_utilizacao: ano,
            mes
          }
        });

        // Calcular custos estimados
        const estimadoRecursos = alocacoes.reduce((acc, alocacao) => {
          if (!alocacao.user?.salario) return acc;
          const salarioAjustado = new Decimal(alocacao.user.salario)
            .times(new Decimal(1.223))
            .times(new Decimal(14).dividedBy(new Decimal(11)));
          return acc.plus(new Decimal(alocacao.ocupacao).times(salarioAjustado));
        }, new Decimal(0));

        const estimadoMateriais = materiais.reduce((acc, material) => {
          return acc.plus(new Decimal(material.preco).times(material.quantidade));
        }, new Decimal(0));

        // Calcular custos realizados (apenas materiais marcados como concluídos)
        const realizadoMateriais = materiais
          .filter(m => m.estado)
          .reduce((acc, material) => {
            return acc.plus(new Decimal(material.preco).times(material.quantidade));
          }, new Decimal(0));

        // Para recursos, consideramos realizado = estimado para meses passados
        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1;
        const anoAtual = hoje.getFullYear();
        const isPassado = ano < anoAtual || (ano === anoAtual && mes < mesAtual);
        const realizadoRecursos = isPassado ? estimadoRecursos : new Decimal(0);

        return {
          mes,
          ano,
          estimado: estimadoRecursos.plus(estimadoMateriais).toNumber(),
          realizado: realizadoRecursos.plus(realizadoMateriais).toNumber()
        };
      }

      // Retornar dados para todos os meses do ano
      const meses = Array.from({ length: 12 }, (_, i) => i + 1);
      const resultados = await Promise.all(meses.map(getDadosMes));
      
      return resultados;
    }),

  getComparacaoGastos: protectedProcedure
    .input(
      z.object({
        projetoId: z.string().uuid("ID do projeto inválido"),
        // workpackageId não é mais input aqui, a filtragem é client-side
        // incluirDetalhes também não, sempre incluímos rubricas na resposta agora
      })
    )
    .query(async ({ ctx, input }) => {
      const { projetoId } = input;

      // 1. Buscar Projeto (estado, workpackages com ID/Nome, snapshot)
      const projetoInfo = await ctx.db.projeto.findUnique({
        where: { id: projetoId },
        select: { estado: true, workpackages: { select: { id: true, nome: true } }, aprovado: true },
      });
      if (!projetoInfo) { 
        throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
      }

      // 2. Parse Snapshot
      let snapshotData: any = null; 
      try {
        if (typeof projetoInfo.aprovado === 'string') {
            snapshotData = JSON.parse(projetoInfo.aprovado);
        } else if (typeof projetoInfo.aprovado === 'object' && projetoInfo.aprovado !== null) {
            snapshotData = projetoInfo.aprovado;
        } else {
             console.warn(`Snapshot inválido ou ausente para projeto ${projetoId}`);
             snapshotData = { workpackages: [] }; 
          }
      } catch(e) {
          console.error(`Erro ao parse snapshot projeto ${projetoId}:`, e);
          snapshotData = { workpackages: [] }; 
      }

      const valorETISnapshot = snapshotData?.valor_eti ? new Decimal(snapshotData.valor_eti) : new Decimal(0);
      const estimativaBaseadaEmETI = valorETISnapshot.greaterThan(0);
      const snapshotWorkpackages = snapshotData?.workpackages ?? [];

      // --- 3. Calcular Dados por Workpackage e Totais --- 
      
      let totalEstimadoRecursos = new Decimal(0);
      let totalEstimadoMateriais = new Decimal(0);
      let totalRealRecursos = new Decimal(0);
      let totalRealMateriais = new Decimal(0);
      const totalEstimadoRubricas: Record<string, Decimal> = {};
      const totalRealRubricas: Record<string, Decimal> = {};

      // Buscar TODOS os dados reais (Alocações e Materiais) do DB de uma vez
      const alocacoesReaisDB = await ctx.db.alocacaoRecurso.findMany({ 
          where: { workpackage: { projetoId: projetoId } }, 
          include: { user: { select: { salario: true } }, workpackage: { select: { id: true } } } 
      });
      const materiaisReaisDB = await ctx.db.material.findMany({ 
          where: { workpackage: { projetoId: projetoId } }, 
          select: { preco: true, quantidade: true, rubrica: true, workpackageId: true } 
      });

      // Processar cada Workpackage definido no projeto
      const workpackagesResposta = await Promise.all(projetoInfo.workpackages.map(async (wpBase) => {
          const wpId = wpBase.id;

          // Encontrar o WP correspondente no snapshot
          const wpSnapshot = snapshotWorkpackages.find((wpSnap: any) => wpSnap.id === wpId);

          // --- Calcular Estimado para este WP (do Snapshot) ---
          let estimadoRecursosWP = new Decimal(0);
          let estimadoMateriaisWP = new Decimal(0);
          const estimadoRubricasWP: Record<string, Decimal> = {};

          if (wpSnapshot) {
              const recursosSnap = wpSnapshot.recursos ?? [];
              const materiaisSnap = wpSnapshot.materiais ?? [];

              if (estimativaBaseadaEmETI) {
                  // Cenário ETI: Apenas alocações * ETI
                  const alocWPSnap = recursosSnap.reduce((s: Decimal, r:any) => s.plus(new Decimal(r.ocupacao||0)), new Decimal(0));
                  estimadoRecursosWP = alocWPSnap.times(valorETISnapshot);
                  estimadoMateriaisWP = new Decimal(0); // Materiais NÃO entram na estimativa ETI
                  // Rúbricas também são 0 na estimativa ETI
              } else {
                  // Cenário Detalhado: Recursos ajustados + Materiais
                  estimadoRecursosWP = recursosSnap.reduce((s: Decimal, r: any) => {
                      const salSnap = r.user?.salario ? new Decimal(r.user.salario) : null;
                      return s.plus(new Decimal(r.ocupacao||0).times(calcularSalarioAjustado(salSnap)));
                  }, new Decimal(0));

                  materiaisSnap.forEach((m: any) => {
                      const custoMatSnap = new Decimal(m.preco||0).times(new Decimal(m.quantidade||0));
                      estimadoMateriaisWP = estimadoMateriaisWP.plus(custoMatSnap);
                      if (m.rubrica) {
                          estimadoRubricasWP[m.rubrica] = (estimadoRubricasWP[m.rubrica] || new Decimal(0)).plus(custoMatSnap);
                          // Acumular nos totais de rúbricas apenas no modo detalhado
                          totalEstimadoRubricas[m.rubrica] = (totalEstimadoRubricas[m.rubrica] || new Decimal(0)).plus(custoMatSnap);
                      }
                  });
              }
          }
          // Acumular nos totais gerais (independentemente do método ETI/Detalhado)
          totalEstimadoRecursos = totalEstimadoRecursos.plus(estimadoRecursosWP);
          totalEstimadoMateriais = totalEstimadoMateriais.plus(estimadoMateriaisWP);

          // --- Calcular Real para este WP (do DB) ---
          let realRecursosWP = new Decimal(0);
          let realMateriaisWP = new Decimal(0);
          const realRubricasWP: Record<string, Decimal> = {};
          alocacoesReaisDB.filter(a => a.workpackage.id === wpId).forEach(aloc => {
              const custoRealRec = new Decimal(aloc.ocupacao).times(calcularSalarioAjustado(aloc.user.salario));
              realRecursosWP = realRecursosWP.plus(custoRealRec);
          });
          materiaisReaisDB.filter(m => m.workpackageId === wpId).forEach(mat => {
              const custoMatReal = new Decimal(mat.preco).times(new Decimal(mat.quantidade));
              realMateriaisWP = realMateriaisWP.plus(custoMatReal);
              if (mat.rubrica) {
                  realRubricasWP[mat.rubrica] = (realRubricasWP[mat.rubrica] || new Decimal(0)).plus(custoMatReal);
                  // Acumular nos totais de rúbricas apenas no modo detalhado
                  totalRealRubricas[mat.rubrica] = (totalRealRubricas[mat.rubrica] || new Decimal(0)).plus(custoMatReal);
              }
          });
          totalRealRecursos = totalRealRecursos.plus(realRecursosWP);
          totalRealMateriais = totalRealMateriais.plus(realMateriaisWP);

          // Montar detalhes de rubricas para este WP
          const todasRubricasWPKeys = Array.from(new Set([...Object.keys(estimadoRubricasWP), ...Object.keys(realRubricasWP)])) as Rubrica[];
          const rubricasDetalhadasWP = todasRubricasWPKeys.map(key => ({
                rubrica: key,
                estimado: estimadoRubricasWP[key]?.toNumber() || 0,
                real: realRubricasWP[key]?.toNumber() || 0,
          }));

          // Retornar estrutura completa para este WP
          return {
            id: wpId,
              nome: wpBase.nome,
            recursos: {
                  estimado: estimadoRecursosWP.toNumber(),
                  real: realRecursosWP.toNumber(),
            },
              materiais: {
                  totalEstimado: estimadoMateriaisWP.toNumber(),
                  totalReal: realMateriaisWP.toNumber(),
                  rubricas: rubricasDetalhadasWP,
              },
          };
      }));

      // Calcular Totais Gerais
      const totalEstimadoGeral = totalEstimadoRecursos.plus(totalEstimadoMateriais);
      const totalRealGeral = totalRealRecursos.plus(totalRealMateriais);

      // Detalhes de Rubricas Totais
      const todasRubricasTotalKeys = Array.from(new Set([...Object.keys(totalEstimadoRubricas), ...Object.keys(totalRealRubricas)])) as Rubrica[];
      const rubricasDetalhadasTotal = todasRubricasTotalKeys.map(key => ({
        rubrica: key,
        estimado: totalEstimadoRubricas[key]?.toNumber() || 0,
        real: totalRealRubricas[key]?.toNumber() || 0,
      }));

      // Calcular Percentagem
      const basePercent = totalEstimadoGeral; // Usar sempre o total estimado (Recursos+Materiais Snap) como base
      const realizadoPercent = basePercent.isZero() ? new Decimal(0) : totalRealGeral.dividedBy(basePercent).times(100); 

      // Montar Resposta Final
      return {
          estado: projetoInfo.estado,
          estimativaBaseadaEmETI: estimativaBaseadaEmETI,
        total: {
          recursos: {
              estimado: totalEstimadoRecursos.toNumber(),
              real: totalRealRecursos.toNumber(),
          },
          materiais: {
              estimado: totalEstimadoMateriais.toNumber(),
              real: totalRealMateriais.toNumber(),
              rubricas: rubricasDetalhadasTotal, 
          },
          geral: {
                estimado: totalEstimadoGeral.toNumber(),
                real: totalRealGeral.toNumber()
          }
        },
        comparacaoGlobal: {
          realizadoPercent: realizadoPercent.isNaN() ? 0 : realizadoPercent.toNumber(),
        },
          workpackages: workpackagesResposta, // Array com detalhes por WP
      };
        
    }),

  getPainelFinanceiroProjeto: protectedProcedure
    .input(
      z.object({
        projetoId: z.string().uuid("ID do projeto inválido"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { projetoId } = input;

      // 1. Fetch Projeto (incluindo valor_eti e snapshot)
      const projeto = await ctx.db.projeto.findUnique({
        where: { id: projetoId },
        select: {
          id: true,
          nome: true, // Adicionado para referência futura, se necessário
          valor_eti: true,
          aprovado: true, // Snapshot JSON
          workpackages: { // Para iterar sobre os workpackages existentes no DB
            select: {
              id: true,
              nome: true,
            }
          }
        },
      });

      if (!projeto) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
      }

      // 2. Parse Snapshot
      let snapshotData: any = null;
      let snapshotPresente = false;
      try {
        if (typeof projeto.aprovado === 'string') {
          snapshotData = JSON.parse(projeto.aprovado);
          snapshotPresente = true;
        } else if (typeof projeto.aprovado === 'object' && projeto.aprovado !== null) {
          snapshotData = projeto.aprovado; // Já é objeto
          snapshotPresente = true;
        } else {
          console.warn(`Snapshot inválido ou ausente para projeto ${projetoId}`);
          snapshotData = { workpackages: [] }; // Fallback para evitar erros
        }
      } catch (e) {
        console.error(`Erro ao parse snapshot do projeto ${projetoId}:`, e);
        snapshotData = { workpackages: [] }; // Fallback
      }
      const snapshotWorkpackages = snapshotData?.workpackages ?? [];

      // 3. Fetch dados reais do DB (nível do projeto)
      const alocacoesDBProjeto = await ctx.db.alocacaoRecurso.findMany({
        where: { workpackage: { projetoId } },
        include: { user: { select: { salario: true } } },
      });

      const materiaisDBProjeto = await ctx.db.material.findMany({
        where: { workpackage: { projetoId } },
      });

      // 4. Calcular datas atuais
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const mesAtual = hoje.getMonth() + 1; // JavaScript months are 0-indexed

      // 5. Inicializar variáveis de resultado (nível do projeto)
      let orcamentoPrevistoGlobalComETI_Projeto: Decimal | null = null;
      let previstoRecursosSnapshot_Projeto: Decimal | null = null;
      let previstoMateriaisSnapshot_Projeto: Decimal | null = null;
      let realizadoRecursos_Projeto = new Decimal(0);
      let realizadoMateriais_Projeto = new Decimal(0);
      let tipoCalculoPrevisto_Projeto: 'ETI_DB' | 'DETALHADO_SNAPSHOT' | 'NENHUM' = 'NENHUM';

      // 6. Calcular Custos Realizados (nível do projeto)
      alocacoesDBProjeto.forEach(aloc => {
        if (aloc.user?.salario && (aloc.ano < anoAtual || (aloc.ano === anoAtual && aloc.mes < mesAtual))) {
          realizadoRecursos_Projeto = realizadoRecursos_Projeto.plus(
            new Decimal(aloc.ocupacao).times(calcularSalarioAjustado(aloc.user.salario))
          );
        }
      });

      materiaisDBProjeto.forEach(mat => {
        if (mat.estado && mat.preco && mat.quantidade) {
          realizadoMateriais_Projeto = realizadoMateriais_Projeto.plus(
            new Decimal(mat.preco).times(new Decimal(mat.quantidade))
          );
        }
      });
      
      // 7. Lógica condicional baseada em projeto.valor_eti (do DB) - (nível do projeto)
      const valorETIDB_Projeto = projeto.valor_eti ? new Decimal(projeto.valor_eti) : new Decimal(0);

      if (snapshotPresente) {
        if (valorETIDB_Projeto.greaterThan(0)) {
          tipoCalculoPrevisto_Projeto = 'ETI_DB';
          let totalOcupacaoSnapshot_Projeto = new Decimal(0);
          snapshotWorkpackages.forEach((wpSnap: any) => {
            const recursosSnap = wpSnap.recursos ?? [];
            recursosSnap.forEach((rec: any) => {
              totalOcupacaoSnapshot_Projeto = totalOcupacaoSnapshot_Projeto.plus(new Decimal(rec.ocupacao || 0));
            });
          });
          orcamentoPrevistoGlobalComETI_Projeto = valorETIDB_Projeto.times(totalOcupacaoSnapshot_Projeto);
        } else {
          tipoCalculoPrevisto_Projeto = 'DETALHADO_SNAPSHOT';
          previstoRecursosSnapshot_Projeto = new Decimal(0);
          previstoMateriaisSnapshot_Projeto = new Decimal(0);
          snapshotWorkpackages.forEach((wpSnap: any) => {
            const recursosSnap = wpSnap.recursos ?? [];
            recursosSnap.forEach((r: any) => {
              const salarioSnap = r.user?.salario ? new Decimal(r.user.salario) : null;
              previstoRecursosSnapshot_Projeto = previstoRecursosSnapshot_Projeto!.plus(
                new Decimal(r.ocupacao || 0).times(calcularSalarioAjustado(salarioSnap))
              );
            });
            const materiaisSnap = wpSnap.materiais ?? [];
            materiaisSnap.forEach((m: any) => {
              previstoMateriaisSnapshot_Projeto = previstoMateriaisSnapshot_Projeto!.plus(
                new Decimal(m.preco || 0).times(new Decimal(m.quantidade || 0))
              );
            });
          });
        }
      } else {
        // Usar a lógica normal de cálculo do orçamento submetido
        const orcamentoSubmetidoInfo = await getOrcamentoSubmetido(ctx.db, projetoId);
        
        if (orcamentoSubmetidoInfo.tipoCalculo === 'ETI_DB') {
          tipoCalculoPrevisto_Projeto = 'ETI_DB';
          orcamentoPrevistoGlobalComETI_Projeto = orcamentoSubmetidoInfo.orcamentoTotal;
        } else {
          tipoCalculoPrevisto_Projeto = 'DETALHADO_SNAPSHOT';
          previstoRecursosSnapshot_Projeto = orcamentoSubmetidoInfo.detalhes?.recursos ?? realizadoRecursos_Projeto;
          previstoMateriaisSnapshot_Projeto = orcamentoSubmetidoInfo.detalhes?.materiais ?? realizadoMateriais_Projeto;
        }
      }

      // 8. Calcular detalhes por Workpackage
      const detalhesPorWorkpackage = await Promise.all(projeto.workpackages.map(async wpDB => {
        const wpSnapshot = snapshotPresente
          ? snapshotWorkpackages.find((sWp: any) => sWp.id === wpDB.id || sWp.nome === wpDB.nome)
          : null;

        let orcamentoPrevistoWorkpackageComETI: Decimal | null = null;
        let previstoRecursosSnapshotWorkpackage: Decimal | null = null;
        let previstoMateriaisSnapshotWorkpackage: Decimal | null = null;

        if (snapshotPresente) {
          if (tipoCalculoPrevisto_Projeto === 'ETI_DB') {
            let totalOcupacaoSnapshotWP = new Decimal(0);
            if (wpSnapshot?.recursos) {
              wpSnapshot.recursos.forEach((rec: any) => {
                totalOcupacaoSnapshotWP = totalOcupacaoSnapshotWP.plus(new Decimal(rec.ocupacao || 0));
              });
            }
            orcamentoPrevistoWorkpackageComETI = valorETIDB_Projeto.times(totalOcupacaoSnapshotWP);
          } else if (tipoCalculoPrevisto_Projeto === 'DETALHADO_SNAPSHOT') {
            previstoRecursosSnapshotWorkpackage = new Decimal(0);
            previstoMateriaisSnapshotWorkpackage = new Decimal(0);
            if (wpSnapshot?.recursos) {
              wpSnapshot.recursos.forEach((r: any) => {
                const salarioSnap = r.user?.salario ? new Decimal(r.user.salario) : null;
                previstoRecursosSnapshotWorkpackage = previstoRecursosSnapshotWorkpackage!.plus(
                  new Decimal(r.ocupacao || 0).times(calcularSalarioAjustado(salarioSnap))
                );
              });
            }
            if (wpSnapshot?.materiais) {
              wpSnapshot.materiais.forEach((m: any) => {
                previstoMateriaisSnapshotWorkpackage = previstoMateriaisSnapshotWorkpackage!.plus(
                  new Decimal(m.preco || 0).times(new Decimal(m.quantidade || 0))
                );
              });
            }
          }
        } else {
          // Usar getOrcamentoSubmetido para cada workpackage quando não há snapshot
          const orcamentoSubmetidoWPInfo = await getOrcamentoSubmetido(ctx.db, projetoId);
          const filteredOrcamento = orcamentoSubmetidoWPInfo.detalhes;
          
          if (orcamentoSubmetidoWPInfo.tipoCalculo === 'ETI_DB') {
            // Para ETI, precisamos calcular a proporção deste WP
            const alocacoesWP = await ctx.db.alocacaoRecurso.findMany({
              where: { workpackageId: wpDB.id },
              select: { ocupacao: true }
            });
            const totalOcupacaoWP = alocacoesWP.reduce((sum, aloc) => sum.plus(aloc.ocupacao), new Decimal(0));
            orcamentoPrevistoWorkpackageComETI = totalOcupacaoWP.times(valorETIDB_Projeto);
          } else {
            // Para não-ETI, filtramos os recursos e materiais deste WP
            const orcamentoRealWP = await getOrcamentoReal(ctx.db, projetoId, { workpackageId: wpDB.id });
            previstoRecursosSnapshotWorkpackage = orcamentoRealWP.custoRecursos;
            previstoMateriaisSnapshotWorkpackage = orcamentoRealWP.custoMateriais;
          }
        }

        // Cálculo dos realizados por WP
        let realizadoRecursosWP = new Decimal(0);
        alocacoesDBProjeto
          .filter(aloc => aloc.workpackageId === wpDB.id)
          .forEach(aloc => {
            if (aloc.user?.salario && (aloc.ano < anoAtual || (aloc.ano === anoAtual && aloc.mes < mesAtual))) {
              realizadoRecursosWP = realizadoRecursosWP.plus(
                new Decimal(aloc.ocupacao).times(calcularSalarioAjustado(aloc.user.salario))
              );
            }
          });

        let realizadoMateriaisWP = new Decimal(0);
        materiaisDBProjeto
          .filter(mat => mat.workpackageId === wpDB.id)
          .forEach(mat => {
            if (mat.estado && mat.preco && mat.quantidade) {
              realizadoMateriaisWP = realizadoMateriaisWP.plus(
                new Decimal(mat.preco).times(new Decimal(mat.quantidade))
              );
            }
          });

        return {
            workpackageId: wpDB.id,
            workpackageName: wpDB.nome,
            orcamentoPrevistoComETI: orcamentoPrevistoWorkpackageComETI?.toNumber() ?? null,
            previstoRecursosSnapshot: previstoRecursosSnapshotWorkpackage?.toNumber() ?? null,
            previstoMateriaisSnapshot: previstoMateriaisSnapshotWorkpackage?.toNumber() ?? null,
            realizadoRecursos: realizadoRecursosWP.toNumber(),
            realizadoMateriais: realizadoMateriaisWP.toNumber(),
        };
      }));

      // 9. Retornar os resultados
      return {
        projetoId: projeto.id,
        tipoCalculoPrevisto: tipoCalculoPrevisto_Projeto,
        valorETIDB: projeto.valor_eti?.toNumber() ?? null,
        snapshotPresente,
        
        // Totais do Projeto
        orcamentoPrevistoGlobalComETI: orcamentoPrevistoGlobalComETI_Projeto?.toNumber() ?? null,
        previstoRecursosSnapshot: previstoRecursosSnapshot_Projeto?.toNumber() ?? null,
        previstoMateriaisSnapshot: previstoMateriaisSnapshot_Projeto?.toNumber() ?? null,
        realizadoRecursos: realizadoRecursos_Projeto.toNumber(),
        realizadoMateriais: realizadoMateriais_Projeto.toNumber(),

        // Detalhes por Workpackage
        detalhesPorWorkpackage,
      };
    }),

  getOrcamentoSubmetidoDetalhado: protectedProcedure
    .input(
      z.object({
        projetoId: z.string().uuid("ID do projeto inválido"),
        ano: z.number().int().min(1900).optional(),
        workpackageId: z.string().uuid("ID do workpackage inválido").optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { projetoId, ano, workpackageId } = input;

      const projeto = await ctx.db.projeto.findUnique({
        where: { id: projetoId },
        select: { estado: true, valor_eti: true, aprovado: true },
      });

      if (!projeto) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
      }

      type ResultadoOrcamento = {
        valorTotal: Decimal;
        tipoCalculo: string; // 'ETI_DB', 'REAL_DB', 'ETI_SNAPSHOT', 'REAL_SNAPSHOT', 'INVALIDO'
        componentesReais?: { recursos: Decimal; materiais: Decimal };
        valorETIUsado?: Decimal;
        totalAlocacaoUsado?: Decimal;
      };

      if (projeto.estado === "PENDENTE") {
        const valorETIDB = projeto.valor_eti ?? new Decimal(0);

        if (valorETIDB.greaterThan(0)) {
          const alocacoes = await ctx.db.alocacaoRecurso.findMany({
            where: {
              workpackage: {
                projetoId: projetoId,
                ...(workpackageId && { id: workpackageId }),
              },
              ...(ano && { ano: ano }),
            },
            select: { ocupacao: true },
          });
          const totalAlocacao = alocacoes.reduce((sum, item) => sum.plus(item.ocupacao), new Decimal(0));
          return {
            valorTotal: totalAlocacao.times(valorETIDB),
            tipoCalculo: "ETI_DB",
            valorETIUsado: valorETIDB,
            totalAlocacaoUsado: totalAlocacao,
          } satisfies ResultadoOrcamento;
        } else {
          const orcamentoRealInfo = await getOrcamentoReal(ctx.db, projetoId, { ano, workpackageId });
          return {
            valorTotal: orcamentoRealInfo.total,
            tipoCalculo: "REAL_DB",
            componentesReais: {
              recursos: orcamentoRealInfo.custoRecursos,
              materiais: orcamentoRealInfo.custoMateriais,
            },
          } satisfies ResultadoOrcamento;
        }
      } else {
        // Estados: APROVADO, EM_DESENVOLVIMENTO, CONCLUIDO
        if (!projeto.aprovado || typeof projeto.aprovado !== 'object') {
          // Tentar parse se for string, senão inválido
          let snapshotDataParsed: any = null;
          if (typeof projeto.aprovado === 'string') {
            try {
              snapshotDataParsed = JSON.parse(projeto.aprovado);
            } catch (e) {
              console.error("Falha ao parsear snapshot (string):", e);
              // Considerar REAL_DB como fallback se snapshot falhar e ETI do DB for 0?
              // Por ora, mais seguro retornar inválido se o snapshot é esperado mas falha.
              throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Snapshot do projeto inválido ou corrompido" });
            }
          } else {
             throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Snapshot do projeto ausente ou inválido" });
          }
          projeto.aprovado = snapshotDataParsed; // Substitui pelo objeto parseado
        }
        
        const snapshotData: any = projeto.aprovado;
        const valorETISnapshot = snapshotData.valor_eti ? new Decimal(snapshotData.valor_eti) : new Decimal(0);

        if (valorETISnapshot.greaterThan(0)) {
          let totalAlocacaoSnapshot = new Decimal(0);
          const wpsSnapshot = snapshotData.workpackages ?? [];
          for (const wpS of wpsSnapshot) {
            if (workpackageId && wpS.id !== workpackageId) continue;
            const recursosS = wpS.recursos ?? [];
            for (const recS of recursosS) {
              if (ano && recS.ano !== ano) continue;
              totalAlocacaoSnapshot = totalAlocacaoSnapshot.plus(new Decimal(recS.ocupacao || 0));
            }
          }
          return {
            valorTotal: totalAlocacaoSnapshot.times(valorETISnapshot),
            tipoCalculo: "ETI_SNAPSHOT",
            valorETIUsado: valorETISnapshot,
            totalAlocacaoUsado: totalAlocacaoSnapshot,
          } satisfies ResultadoOrcamento;
        } else {
          const custosSnapshot = await calcularCustosDetalhadosSnapshotFiltrado(snapshotData, { workpackageId, ano });
          return {
            valorTotal: custosSnapshot.custoRecursosTotal.plus(custosSnapshot.custoMateriaisTotal),
            tipoCalculo: "REAL_SNAPSHOT",
            componentesReais: {
              recursos: custosSnapshot.custoRecursosTotal,
              materiais: custosSnapshot.custoMateriaisTotal,
            },
          } satisfies ResultadoOrcamento;
        }
      }
    }),

  getOrcamentoRealDetalhado: protectedProcedure
    .input(
      z.object({
        projetoId: z.string().uuid("ID do projeto inválido"),
        tipoVisualizacao: z.enum(["year", "workpackage"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const { projetoId, tipoVisualizacao } = input;

      // 1. Buscar dados do projeto para saber duração
      const projeto = await ctx.db.projeto.findUnique({
        where: { id: projetoId },
        select: { 
          inicio: true, 
          fim: true,
          workpackages: {
            select: {
              id: true,
              nome: true,
            }
          }
        }
      });

      if (!projeto) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Projeto não encontrado"
        });
      }

      // 2. Buscar todas as alocações e materiais do projeto
      const alocacoes = await ctx.db.alocacaoRecurso.findMany({
        where: { workpackage: { projetoId } },
        include: {
          user: { select: { salario: true } },
          workpackage: { select: { id: true, nome: true } }
        }
      });

      const materiais = await ctx.db.material.findMany({
        where: { workpackage: { projetoId } },
        include: {
          workpackage: { select: { id: true, nome: true } }
        }
      });

      // 3. Calcular totais gerais
      let custoRecursosTotal = new Decimal(0);
      let custoMateriaisTotal = new Decimal(0);

      // Calcular custo total de recursos
      alocacoes.forEach(alocacao => {
        if (alocacao.user?.salario) {
          const custoRecurso = alocacao.ocupacao.times(
            calcularSalarioAjustado(alocacao.user.salario)
          );
          custoRecursosTotal = custoRecursosTotal.plus(custoRecurso);
        }
      });

      // Calcular custo total de materiais
      materiais.forEach(material => {
        const custoMaterial = material.preco.times(new Decimal(material.quantidade));
        custoMateriaisTotal = custoMateriaisTotal.plus(custoMaterial);
      });

      const custoTotal = custoRecursosTotal.plus(custoMateriaisTotal);

      // 4. Preparar detalhes baseado no tipo de visualização
      if (tipoVisualizacao === "year") {
        // Determinar anos do projeto
        const anoInicio = projeto.inicio ? new Date(projeto.inicio).getFullYear() : new Date().getFullYear();
        const anoFim = projeto.fim ? new Date(projeto.fim).getFullYear() : new Date().getFullYear();
        const anos = Array.from(
          { length: anoFim - anoInicio + 1 }, 
          (_, i) => anoInicio + i
        );

        // Agregar dados por ano
        const detalhesAnos = anos.map(ano => {
          // Calcular custos de recursos para o ano
          const custosRecursosAno = alocacoes
            .filter(a => a.ano === ano)
            .reduce((sum, alocacao) => {
              if (!alocacao.user?.salario) return sum;
              return sum.plus(
                alocacao.ocupacao.times(calcularSalarioAjustado(alocacao.user.salario))
              );
            }, new Decimal(0));

          // Calcular custos de materiais para o ano
          const custosMateriaisAno = materiais
            .filter(m => m.ano_utilizacao === ano)
            .reduce((sum, material) => {
              return sum.plus(material.preco.times(new Decimal(material.quantidade)));
            }, new Decimal(0));

          return {
            ano,
            custosRecursos: custosRecursosAno.toNumber(),
            custosMateriais: custosMateriaisAno.toNumber(),
            custoTotal: custosRecursosAno.plus(custosMateriaisAno).toNumber()
          };
        });

        return {
          custoRecursosTotal: custoRecursosTotal.toNumber(),
          custoMateriaisTotal: custoMateriaisTotal.toNumber(),
          custoTotal: custoTotal.toNumber(),
          detalhes: detalhesAnos
        };

      } else {
        // Agregar dados por workpackage
        const detalhesWorkpackages = projeto.workpackages.map(wp => {
          // Calcular custos de recursos para o workpackage
          const custosRecursosWP = alocacoes
            .filter(a => a.workpackageId === wp.id)
            .reduce((sum, alocacao) => {
              if (!alocacao.user?.salario) return sum;
              return sum.plus(
                alocacao.ocupacao.times(calcularSalarioAjustado(alocacao.user.salario))
              );
            }, new Decimal(0));

          // Calcular custos de materiais para o workpackage
          const custosMateriaisWP = materiais
            .filter(m => m.workpackageId === wp.id)
            .reduce((sum, material) => {
              return sum.plus(material.preco.times(new Decimal(material.quantidade)));
            }, new Decimal(0));

          return {
            workpackageId: wp.id,
            workpackageNome: wp.nome,
            custosRecursos: custosRecursosWP.toNumber(),
            custosMateriais: custosMateriaisWP.toNumber(),
            custoTotal: custosRecursosWP.plus(custosMateriaisWP).toNumber()
          };
        });

        return {
          custoRecursosTotal: custoRecursosTotal.toNumber(),
          custoMateriaisTotal: custoMateriaisTotal.toNumber(),
          custoTotal: custoTotal.toNumber(),
          detalhes: detalhesWorkpackages
        };
      }
    }),

  getVisaoProjeto: protectedProcedure
    .input(
      z.object({
        projetoId: z.string().uuid("ID do projeto inválido"),
        ano: z.number().int().min(2000).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { projetoId, ano } = input;

      try {
        const projetoDB = await ctx.db.projeto.findUnique({
          where: { id: projetoId },
          select: { 
            id: true,
            nome: true,
            estado: true,
            taxa_financiamento: true,
          }
        });

        if (!projetoDB) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
        }

        const totais = await getTotais(ctx.db, projetoId, { ano });
        
        return {
          id: projetoDB.id,
          nome: projetoDB.nome,
          estado: projetoDB.estado,
          taxa_financiamento: projetoDB.taxa_financiamento?.toNumber() ?? 0,
          orcamentoSubmetido: totais.orcamentoSubmetido.toNumber(),
          orcamentoReal: totais.orcamentoReal.toNumber(),
          resultadoFinanceiro: totais.resultadoFinanceiro.toNumber(),
          margem: totais.margem.toNumber(),
          vabCustosPessoal: totais.vabCustosPessoal.toNumber(),
          folga: totais.folga.toNumber(),
        };

      } catch (error) {
        console.error("Erro ao obter visão do projeto:", error);
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao obter visão do projeto ${projetoId}: ${message}`,
          cause: error,
        });
      }
    }),
});
