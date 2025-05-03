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
 * Calcula os custos estimados detalhados (Recursos + Materiais) a partir do snapshot.
 * Retorna totais e detalhes por ano.
 */
async function calcularCustosDetalhadosSnapshot( 
  snapshotData: any, 
  filtros?: { ano?: number } 
): Promise<{
  custoRecursosTotal: Decimal;
  custoMateriaisTotal: Decimal;
  detalhesAnuais: Array<{
    ano: number;
    custoRecursos: Decimal;
    custoMateriais: Decimal;
  }>;
}> {
    const workpackages = snapshotData?.workpackages ?? [];
    let custoRecursosTotal = new Decimal(0);
    let custoMateriaisTotal = new Decimal(0);
    const custosPorAno: Record<number, { recursos: Decimal, materiais: Decimal }> = {};

    for (const wp of workpackages) {
        // Calcular Custo Recursos WP
        const recursosWPSnapshot = wp.recursos ?? [];
        recursosWPSnapshot.forEach((r: any) => {
            const anoRecurso = r.ano as number;
            // Aplicar filtro de ano, se existir
            if (!filtros?.ano || anoRecurso === filtros.ano) {
                const salarioSnap = r.user?.salario ? new Decimal(r.user.salario) : null;
                const custoRecurso = new Decimal(r.ocupacao || 0).times(calcularSalarioAjustado(salarioSnap));
                custoRecursosTotal = custoRecursosTotal.plus(custoRecurso);

                // Detalhes por ano
                if (!custosPorAno[anoRecurso]) {
                    custosPorAno[anoRecurso] = { recursos: new Decimal(0), materiais: new Decimal(0) };
                }
                custosPorAno[anoRecurso].recursos = custosPorAno[anoRecurso].recursos.plus(custoRecurso);
            }
        });

        // Calcular Custo Materiais WP
        const materiaisWPSnapshot = wp.materiais ?? [];
        materiaisWPSnapshot.forEach((m: any) => {
            const anoMaterial = m.ano_utilizacao as number;
             // Aplicar filtro de ano, se existir
            if (!filtros?.ano || anoMaterial === filtros.ano) {
                const custoMaterial = new Decimal(m.preco || 0).times(new Decimal(m.quantidade || 0));
                custoMateriaisTotal = custoMateriaisTotal.plus(custoMaterial);

                // Detalhes por ano
                 if (!custosPorAno[anoMaterial]) {
                    custosPorAno[anoMaterial] = { recursos: new Decimal(0), materiais: new Decimal(0) };
                }
                custosPorAno[anoMaterial].materiais = custosPorAno[anoMaterial].materiais.plus(custoMaterial);
            }
        });
    }

    // Formatar detalhes anuais
    const detalhesAnuais = Object.entries(custosPorAno).map(([anoStr, custos]) => ({
        ano: parseInt(anoStr),
        custoRecursos: custos.recursos,
        custoMateriais: custos.materiais,
    })).sort((a, b) => a.ano - b.ano);

    return {
        custoRecursosTotal,
        custoMateriaisTotal,
        detalhesAnuais,
    };
}

/**
 * Calcula o orçamento submetido de um projeto.
 * A lógica varia consoante o estado do projeto e o valor_eti no snapshot.
 */
async function getOrcamentoSubmetido(
  db: Prisma.TransactionClient,
  projetoId: string,
  filtros?: { ano?: number }
) {
  // Tipo de retorno mais complexo para acomodar os cenários
  type ResultadoOrcamentoSubmetido = {
    orcamentoTotal: Decimal;
    tipoCalculo: 'DB_PENDENTE' | 'ETI_SNAPSHOT' | 'DETALHADO_SNAPSHOT' | 'INVALIDO' | 'REAL_SEM_ETI';
    valorETI: Decimal | null; // Valor ETI usado no cálculo (se aplicável)
    totalAlocacao: Decimal | null; // Alocação total usada no cálculo (se aplicável)
    detalhes?: { // Apenas para DETALHADO_SNAPSHOT
      recursos: Decimal;
      materiais: Decimal;
      overhead: Decimal;
      overheadPercent: Decimal;
    } | null;
    detalhesPorAno: Array<{
      ano: number;
      orcamento: Decimal;
      // Detalhes adicionais por ano, dependendo do tipoCalculo
      valorETI?: Decimal | null;
      totalAlocacao?: Decimal | null;
      custoRecursos?: Decimal | null;
      custoMateriais?: Decimal | null;
      overhead?: Decimal | null;
    }>;
  };

  // 1. Buscar Projeto e seus dados relevantes
  const projeto = await db.projeto.findUnique({
    where: { id: projetoId },
    select: { 
      estado: true,
      valor_eti: true, // Valor ETI atual do projeto (usado para PENDENTE)
      aprovado: true, // O snapshot JSON
      overhead: true, // Overhead atual do projeto (pode não ser o do snapshot!)
    },
  });

  if (!projeto) {
    // Retornar um estado inválido claro
    return {
      orcamentoTotal: new Decimal(0),
      tipoCalculo: 'INVALIDO',
      valorETI: null,
      totalAlocacao: null,
      detalhes: null,
      detalhesPorAno: [],
    } satisfies ResultadoOrcamentoSubmetido;
  }

  // --- Lógica para Projetos NÃO APROVADOS (ex: PENDENTE) --- 
  if (projeto.estado !== 'APROVADO' || !projeto.aprovado) {
    const valorETIAtual = projeto.valor_eti ?? new Decimal(0);
    
    // --- NOVA LÓGICA: Se não tem valor ETI, orçamento submetido = orçamento real ---
    if (valorETIAtual.isZero()) {
      // buscar orçamento real
      const orcamentoReal = await getOrcamentoReal(db, projetoId, filtros);
      // comentário júnior: aqui devolvemos o orçamento real como submetido porque não há ETI
      return {
        orcamentoTotal: orcamentoReal.total,
        tipoCalculo: 'REAL_SEM_ETI',
        valorETI: null,
        totalAlocacao: null,
        detalhes: null,
        detalhesPorAno: [], // podes adaptar se quiseres detalhes anuais
      };
    }

    // Calcula alocações TOTAIS atuais do DB
    const alocacoesDB = await db.alocacaoRecurso.findMany({
      where: {
        workpackage: { projetoId },
        ...(filtros?.ano && { ano: filtros.ano }), // Aplicar filtro de ano aqui
      },
      select: { ocupacao: true, ano: true },
    });

    const alocacoesPorAnoDB: Record<number, Decimal> = {};
    const totalAlocacaoDB = alocacoesDB.reduce((sum, aloc) => {
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
      tipoCalculo: 'DB_PENDENTE',
      valorETI: valorETIAtual,
      totalAlocacao: totalAlocacaoDB,
      detalhes: null,
      detalhesPorAno: detalhesPorAnoDB,
    } satisfies ResultadoOrcamentoSubmetido;
  }

  // --- Lógica para Projetos APROVADOS (Usa Snapshot) --- 
  let snapshotData: any = null;
  try {
    // Garantir que projeto.aprovado é string antes de parse
    if (typeof projeto.aprovado === 'string') {
        snapshotData = JSON.parse(projeto.aprovado);
    } else if (typeof projeto.aprovado === 'object' && projeto.aprovado !== null) {
        snapshotData = projeto.aprovado; // Já é objeto
    } else {
        throw new Error('Snapshot inválido ou ausente.');
    }
  } catch (e) {
    console.error(`Erro ao processar snapshot do projeto ${projetoId}:`, e);
     return { // Retornar estado inválido se snapshot falhar
      orcamentoTotal: new Decimal(0),
      tipoCalculo: 'INVALIDO',
      valorETI: null,
      totalAlocacao: null,
      detalhes: null,
      detalhesPorAno: [],
    } satisfies ResultadoOrcamentoSubmetido;
  }

  // Extrair dados do snapshot
  const valorETISnapshot = snapshotData.valor_eti ? new Decimal(snapshotData.valor_eti) : new Decimal(0);
  // Usar o overhead guardado no RAIZ do snapshot
  const overheadPercentSnapshot = snapshotData.overhead ? new Decimal(snapshotData.overhead) : new Decimal(0);

  // --- Sub-cenário A: Snapshot com Valor ETI > 0 --- 
  if (valorETISnapshot.greaterThan(0)) {
      const snapshotWorkpackages = snapshotData.workpackages ?? [];
      const alocacoesPorAnoSnapshot: Record<number, Decimal> = {};
      let totalAlocacaoSnapshot = new Decimal(0);

      snapshotWorkpackages.forEach((wp: any) => {
          const recursos = wp.recursos ?? [];
          recursos.forEach((rec: any) => {
              const anoRec = rec.ano;
              // Aplicar filtro de ano
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
  // --- Sub-cenário B: Snapshot SEM Valor ETI (> 0) --- 
  else {
      const custosDetalhados = await calcularCustosDetalhadosSnapshot(snapshotData, filtros);
      
      const overheadValorTotal = (custosDetalhados.custoRecursosTotal
          .plus(custosDetalhados.custoMateriaisTotal))
          .times(overheadPercentSnapshot);
          
      const orcamentoTotalDetalhado = custosDetalhados.custoRecursosTotal
          .plus(custosDetalhados.custoMateriaisTotal)
          .plus(overheadValorTotal);

      // Calcular detalhes por ano para o modo detalhado
      const detalhesPorAnoDetalhado = custosDetalhados.detalhesAnuais.map(detalheAno => {
          const overheadAno = (detalheAno.custoRecursos.plus(detalheAno.custoMateriais)).times(overheadPercentSnapshot);
          const orcamentoAno = detalheAno.custoRecursos.plus(detalheAno.custoMateriais).plus(overheadAno);
          return {
              ano: detalheAno.ano,
              orcamento: orcamentoAno,
              custoRecursos: detalheAno.custoRecursos,
              custoMateriais: detalheAno.custoMateriais,
              overhead: overheadAno,
          };
      });

      return {
        orcamentoTotal: orcamentoTotalDetalhado,
        tipoCalculo: 'DETALHADO_SNAPSHOT',
        valorETI: valorETISnapshot, // Ainda é o valor do snapshot (0 ou null)
        totalAlocacao: null, // Não aplicável neste cálculo
        detalhes: {
            recursos: custosDetalhados.custoRecursosTotal,
            materiais: custosDetalhados.custoMateriaisTotal,
            overhead: overheadValorTotal,
            overheadPercent: overheadPercentSnapshot,
        },
        detalhesPorAno: detalhesPorAnoDetalhado,
      } satisfies ResultadoOrcamentoSubmetido;
  }
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
  
  // Calcular overhead - Usa o CUSTO REAL de recursos, como antes. A definição de overhead estimado é SÓ para o orçamento submetido detalhado.
  const overheadCalculadoReal = orcamentoReal.custoRecursos.times(new Decimal(-0.15)); 

  // Calcular resultado financeiro (orçamento submetido * taxa de financiamento - custo real total + overhead)
  const resultado = orcamentoSubmetidoValor.times(taxaFinanciamento).minus(orcamentoReal.total).plus(overheadCalculadoReal);

  // Calcular VAB (orçamento submetido * taxa de financiamento - custo materiais)
  const vab = orcamentoSubmetidoValor.times(taxaFinanciamento).minus(orcamentoReal.custoMateriais);

  // Calcular margem (resultado / orçamento submetido)
  const margem = orcamentoSubmetidoValor.isZero() ? new Decimal(0) : resultado.dividedBy(orcamentoSubmetidoValor).times(new Decimal(100));

  // Calcular VAB / Custos com Pessoal (orçamento submetido * taxa de financiamento / custo recursos)
  const vabCustosPessoal = orcamentoSubmetidoValor.isZero() ? new Decimal(0) : vab.dividedBy(orcamentoReal.custoRecursos);

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

  // Calculo da folga (orçamento submetido - custo real + overhead)
  const folga = orcamentoSubmetidoValor.minus(orcamentoReal.total).plus(overheadCalculadoReal);

  // Base result com custosConcluidos
  const resultadoBase = {
    orcamentoSubmetido: orcamentoSubmetidoValor,
    orcamentoSubmetidoTipo: orcamentoSubmetidoInfo.tipoCalculo,
    orcamentoSubmetidoDetalhes: orcamentoSubmetidoInfo.detalhes,
    taxaFinanciamento: taxaFinanciamento,
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
    overhead: overheadCalculadoReal,
    resultado,
    folga,
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
  orcamentoSubmetidoInfo.detalhesPorAno.forEach((detalhe) => {
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
      // Obter orçamento submetido para este ano
      const orcamentoSubmetidoAnoInfo = await getOrcamentoSubmetido(db, projetoId, { ano });
      const orcamentoSubmetidoAnoValor = orcamentoSubmetidoAnoInfo.orcamentoTotal;
      
      // Obter orçamento real para este ano
      const orcamentoRealAno = await getOrcamentoReal(db, projetoId, { ano });

      // Calcular valor financiado para este ano
      const valorFinanciadoAno = orcamentoSubmetidoAnoValor.times(taxaFinanciamento);
      // Calcular overhead real para este ano
      const overheadRealAno = orcamentoRealAno.custoRecursos.times(new Decimal(-0.15));
      // Calcular resultado para este ano
      const resultadoAno = valorFinanciadoAno.minus(orcamentoRealAno.total).plus(overheadRealAno);
      // Calcular VAB para este ano
      const vabAno = valorFinanciadoAno.minus(orcamentoRealAno.custoMateriais);
      // Calcular margem para este ano
      const margemAno = valorFinanciadoAno.isZero() ? new Decimal(0) : resultadoAno.dividedBy(valorFinanciadoAno).times(new Decimal(100));
      // Calcular VAB / Custos Pessoal para este ano
      const vabCustosPessoalAno = orcamentoRealAno.custoRecursos.isZero() ? new Decimal(0) : vabAno.dividedBy(orcamentoRealAno.custoRecursos);

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
      const folgaAno = orcamentoSubmetidoAnoValor.minus(orcamentoRealAno.total).plus(overheadRealAno);

      return {
        ano,
        orcamento: {
          submetido: orcamentoSubmetidoAnoValor,
          submetidoTipo: orcamentoSubmetidoAnoInfo.tipoCalculo,
          submetidoDetalhes: orcamentoSubmetidoAnoInfo.detalhes,
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
        totalAlocacao: orcamentoSubmetidoAnoInfo.totalAlocacao,
        valorFinanciado: valorFinanciadoAno,
        overhead: overheadRealAno,
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
          // Buscar estado do projeto ANTES de chamar getTotais
          const projetoInfo = await ctx.db.projeto.findUnique({
              where: { id: projetoId },
              select: { estado: true }
          });

          if (!projetoInfo) {
              throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado ao buscar estado." });
          }

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
            estado: projetoInfo.estado,
            orcamentoSubmetido: totais.orcamentoSubmetido.toNumber(),
            orcamentoSubmetidoTipo: totais.orcamentoSubmetidoTipo,
            orcamentoSubmetidoDetalhes: totais.orcamentoSubmetidoDetalhes
              ? {
                  recursos: totais.orcamentoSubmetidoDetalhes.recursos.toNumber(),
                  materiais: totais.orcamentoSubmetidoDetalhes.materiais.toNumber(),
                  overhead: totais.orcamentoSubmetidoDetalhes.overhead.toNumber(),
                  overheadPercent: totais.orcamentoSubmetidoDetalhes.overheadPercent.toNumber(),
                }
              : null,
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
              tipo: "projeto_individual" as const,
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
                  submetidoTipo: detalhe.orcamento.submetidoTipo,
                  submetidoDetalhes: detalhe.orcamento.submetidoDetalhes
                    ? { 
                       recursos: detalhe.orcamento.submetidoDetalhes.recursos.toNumber(), 
                       materiais: detalhe.orcamento.submetidoDetalhes.materiais.toNumber(), 
                       overhead: detalhe.orcamento.submetidoDetalhes.overhead.toNumber(),
                       overheadPercent: detalhe.orcamento.submetidoDetalhes.overheadPercent.toNumber(),
                      } 
                    : null,
                  real: {
                    recursos: detalhe.orcamento.real.recursos.toNumber(),
                    materiais: detalhe.orcamento.real.materiais.toNumber(),
                  },
                },
                custosConcluidos: {
                  recursos: detalhe.custosConcluidos?.recursos.toNumber() || 0,
                  materiais: detalhe.custosConcluidos?.materiais.toNumber() || 0,
                  total: detalhe.custosConcluidos?.total.toNumber() || 0,
                },
                totalAlocacao: detalhe.totalAlocacao?.toNumber(),
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
                            detalhesRecursos: mapDetalhesRecursos(detalhe.orcamento.real.detalhesRecursos),
                          },
                        },
                        custosConcluidos: {
                          recursos: detalhe.custosConcluidos?.recursos.toNumber() || 0,
                          materiais: detalhe.custosConcluidos?.materiais.toNumber() || 0,
                          total: detalhe.custosConcluidos?.total.toNumber() || 0,
                        },
                        alocacoes: detalhe.totalAlocacao?.toNumber(),
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

});
