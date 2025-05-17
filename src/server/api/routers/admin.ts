import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Permissao, ProjetoEstado } from "@prisma/client";
import { Decimal } from "decimal.js";
import { z } from "zod";

// Tipo para verificar permissões de utilizador
type UserWithPermissao = {
  permissao: Permissao;
  id: string;
} & Record<string, any>;

export function calcularSalarioAjustado(salario: Decimal | number | null | undefined): Decimal {
  if (salario === null || salario === undefined) {
    return new Decimal(0);
  }
  const salarioDecimal = new Decimal(salario);
  const VALOR_SALARIO = new Decimal(1.223);
  const FATOR_MESES = new Decimal(14).dividedBy(new Decimal(11)); 
  return salarioDecimal.times(VALOR_SALARIO).times(FATOR_MESES);
}

export const adminRouter = createTRPCRouter({
  // Obter estatísticas gerais para o dashboard do admin
  getAdminStats: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Verificar se o utilizador é admin
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || user.permissao !== Permissao.ADMIN) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem aceder a estas estatísticas",
          });
        }

        // Buscar contagem de projetos por estado
        const projetosAprovados = await ctx.db.projeto.count({
          where: { estado: ProjetoEstado.APROVADO }
        });

        const projetosEmDesenvolvimento = await ctx.db.projeto.count({
          where: { estado: ProjetoEstado.EM_DESENVOLVIMENTO }
        });

        const projetosPendentes = await ctx.db.projeto.count({
          where: { estado: ProjetoEstado.PENDENTE }
        });

        // Buscar projetos com entregáveis em atraso
        const hoje = new Date();
        const projetosComEntregaveisAtrasados = await ctx.db.projeto.count({
          where: {
            workpackages: {
              some: {
                tarefas: {
                  some: {
                    entregaveis: {
                      some: {
                        data: {
                          lt: hoje
                        },
                        estado: false
                      }
                    }
                  }
                }
              }
            }
          }
        });

        return {
          projetosAprovados,
          projetosEmDesenvolvimento,
          projetosPendentes,
          projetosComEntregaveisAtrasados
        };
      } catch (error) {
        console.error("Erro ao obter estatísticas de admin:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter estatísticas",
          cause: error,
        });
      }
    }),

  // Obter receitas e despesas mensais do ano atual
  getReceitas: protectedProcedure
    .input(
      z.object({
        ano: z.number().int().min(2000).default(() => new Date().getFullYear())
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Verificar se o utilizador é admin
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || user.permissao !== Permissao.ADMIN) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem aceder a estas estatísticas",
          });
        }

        const { ano } = input;

        // Buscar todos os projetos ativos (excluindo RASCUNHO e PENDENTE)
        const projetos = await ctx.db.projeto.findMany({
          where: {
            NOT: [
              { estado: ProjetoEstado.RASCUNHO },
              { estado: ProjetoEstado.PENDENTE }
            ]
          },
          select: {
            id: true,
            valor_eti: true,
            taxa_financiamento: true,
            aprovado: true,
            workpackages: {
              select: {
                id: true,
                recursos: {
                  where: {
                    ano: ano
                  },
                  select: {
                    ocupacao: true,
                    mes: true,
                    user: {
                      select: {
                        salario: true
                      }
                    }
                  }
                },
                materiais: {
                  where: {
                    ano_utilizacao: ano
                  },
                  select: {
                    preco: true,
                    quantidade: true,
                    mes: true,
                    estado: true
                  }
                }
              }
            }
          }
        });

        // Inicializar arrays para os dados mensais
        const meses = Array.from({ length: 12 }, (_, i) => i + 1);
        const dadosMensais = meses.map(mes => ({
          mes,
          receitaTotal: new Decimal(0),
          alocacaoEstimada: new Decimal(0),
          alocacaoRealizada: new Decimal(0),
          custoEstimado: new Decimal(0),
          custoRealizado: new Decimal(0),
          despesaEstimada: new Decimal(0),
          despesaRealizada: new Decimal(0)
        }));

        // Para cada projeto
        for (const projeto of projetos) {
          let snapshotData: any = null;
          
          // Tentar carregar o snapshot se existir
          if (projeto.aprovado) {
            try {
              snapshotData = typeof projeto.aprovado === 'string' 
                ? JSON.parse(projeto.aprovado) 
                : projeto.aprovado;
            } catch (e) {
              console.error(`Erro ao processar snapshot do projeto ${projeto.id}:`, e);
              continue;
            }
          }

          // Para cada mês
          for (const dadoMensal of dadosMensais) {
            const mes = dadoMensal.mes;
            
            // Verificar se o mês já passou
            const hoje = new Date();
            const mesAtual = hoje.getMonth() + 1;
            const anoAtual = hoje.getFullYear();
            const mesJaPassou = ano < anoAtual || (ano === anoAtual && mes < mesAtual);

            // Calcular receita usando snapshot se disponível
            if (snapshotData) {
              const valorETISnapshot = snapshotData.valor_eti 
                ? new Decimal(snapshotData.valor_eti)
                : new Decimal(0);
              
              if (valorETISnapshot.greaterThan(0)) {
                // Calcular alocação total do mês do snapshot
                let alocacaoTotalMes = new Decimal(0);
                const snapshotWorkpackages = snapshotData.workpackages ?? [];
                
                snapshotWorkpackages.forEach((wp: any) => {
                  const recursos = wp.recursos ?? [];
                  recursos.forEach((rec: any) => {
                    if (rec.mes === mes && rec.ano === ano) {
                      alocacaoTotalMes = alocacaoTotalMes.plus(new Decimal(rec.ocupacao || 0));
                    }
                  });
                });

                // Calcular receita baseada no ETI e taxa de financiamento
                const taxaFinanciamento = snapshotData.taxa_financiamento 
                  ? new Decimal(snapshotData.taxa_financiamento).dividedBy(100)
                  : new Decimal(0);
                
                const receitaMes = alocacaoTotalMes
                  .times(valorETISnapshot)
                  .times(taxaFinanciamento);

                dadoMensal.receitaTotal = dadoMensal.receitaTotal.plus(receitaMes);
                dadoMensal.alocacaoEstimada = dadoMensal.alocacaoEstimada.plus(alocacaoTotalMes);
              }
            } else {
              // Calcular receita usando dados atuais do banco
              const valorETI = projeto.valor_eti ?? new Decimal(0);
              if (valorETI.greaterThan(0)) {
                let alocacaoTotalMes = new Decimal(0);
                
                projeto.workpackages.forEach(wp => {
                  wp.recursos.forEach(rec => {
                    if (rec.mes === mes) {
                      alocacaoTotalMes = alocacaoTotalMes.plus(rec.ocupacao);
                    }
                  });
                });

                const taxaFinanciamento = projeto.taxa_financiamento 
                  ? new Decimal(projeto.taxa_financiamento).dividedBy(100)
                  : new Decimal(0);
                
                const receitaMes = alocacaoTotalMes
                  .times(valorETI)
                  .times(taxaFinanciamento);

                dadoMensal.receitaTotal = dadoMensal.receitaTotal.plus(receitaMes);
                dadoMensal.alocacaoEstimada = dadoMensal.alocacaoEstimada.plus(alocacaoTotalMes);
              }
            }

            // Calcular despesas usando sempre dados atuais do banco
            let custoRecursosMes = new Decimal(0);
            let custoMateriaisMes = new Decimal(0);
            let custoMateriaisRealizadoMes = new Decimal(0);

            // Processar recursos
            projeto.workpackages.forEach(wp => {
              wp.recursos.forEach(rec => {
                if (rec.mes === mes && rec.user?.salario) {
                  const ocupacao = rec.ocupacao;
                  const salarioMensal = calcularSalarioAjustado(rec.user.salario);
                  const custoRecurso = ocupacao.times(salarioMensal);
                  custoRecursosMes = custoRecursosMes.plus(custoRecurso);
                }
              });

              // Processar materiais
              wp.materiais.forEach(material => {
                if (material.mes === mes) {
                  const custoMaterial = material.preco.times(new Decimal(material.quantidade));
                  custoMateriaisMes = custoMateriaisMes.plus(custoMaterial);
                  
                  if (material.estado) {
                    custoMateriaisRealizadoMes = custoMateriaisRealizadoMes.plus(custoMaterial);
                  }
                }
              });
            });

            // Atualizar despesas
            dadoMensal.despesaEstimada = dadoMensal.despesaEstimada.plus(custoRecursosMes).plus(custoMateriaisMes);
            
            // Para despesa realizada: custos de recursos de meses passados + materiais realizados
            if (mesJaPassou) {
              dadoMensal.despesaRealizada = dadoMensal.despesaRealizada.plus(custoRecursosMes);
            }
            dadoMensal.despesaRealizada = dadoMensal.despesaRealizada.plus(custoMateriaisRealizadoMes);
          }
        }

        // Converter Decimals para números e formatar resposta
        return dadosMensais.map(dado => ({
          mes: dado.mes,
          receitaTotal: dado.receitaTotal.toNumber(),
          alocacaoEstimada: dado.alocacaoEstimada.toNumber(),
          alocacaoRealizada: dado.alocacaoRealizada.toNumber(),
          custoEstimado: dado.custoEstimado.toNumber(),
          custoRealizado: dado.custoRealizado.toNumber(),
          despesaEstimada: dado.despesaEstimada.toNumber(),
          despesaRealizada: dado.despesaRealizada.toNumber()
        }));

      } catch (error) {
        console.error("Erro ao obter receitas e despesas:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter receitas e despesas",
          cause: error,
        });
      }
    }),

  // Obter detalhamento de despesas mensais
  getDespesas: protectedProcedure
    .input(
      z.object({
        ano: z.number().int().min(2000).default(() => new Date().getFullYear()),
        mes: z.number().int().min(1).max(12).optional()
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Verificar se o utilizador é admin
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (!user || user.permissao !== Permissao.ADMIN) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas administradores podem aceder a estas estatísticas",
          });
        }

        const { ano, mes: inputMes } = input;

        // Buscar materiais
        const materiais = await ctx.db.material.findMany({
          where: {
            ano_utilizacao: ano,
            ...(inputMes && { mes: inputMes }),
            workpackage: {
              projeto: {
                NOT: [
                  { estado: ProjetoEstado.PENDENTE },
                  { estado: ProjetoEstado.RASCUNHO }
                ]
              }
            }
          },
          include: {
            workpackage: {
              select: {
                nome: true,
                projeto: {
                  select: {
                    id: true,
                    nome: true
                  }
                }
              }
            }
          }
        });

        // Buscar alocações
        const alocacoes = await ctx.db.alocacaoRecurso.findMany({
          where: {
            ano: ano,
            ...(inputMes && { mes: inputMes }),
            workpackage: {
              projeto: {
                NOT: [
                  { estado: ProjetoEstado.PENDENTE },
                  { estado: ProjetoEstado.RASCUNHO }
                ]
              }
            }
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                salario: true
              }
            },
            workpackage: {
              select: {
                nome: true,
                projeto: {
                  select: {
                    id: true,
                    nome: true,
                    valor_eti: true
                  }
                }
              }
            }
          }
        });

        const meses = inputMes ? [inputMes] : Array.from({ length: 12 }, (_, i) => i + 1);
        const resultados = [];

        for (const mesSelecionado of meses) {
          const dadosMes = {
            mes: mesSelecionado,
            alocacoes: [] as any[],
            materiais: [] as any[],
            totais: {
              custoRecursosEstimado: new Decimal(0),
              custoRecursosRealizado: new Decimal(0),
              custoMateriaisEstimado: new Decimal(0),
              custoMateriaisRealizado: new Decimal(0)
            }
          };

          // Verificar se o mês já passou
          const hoje = new Date();
          const mesAtual = hoje.getMonth() + 1;
          const anoAtual = hoje.getFullYear();
          const mesJaPassou = ano < anoAtual || (ano === anoAtual && mesSelecionado < mesAtual);

          // Processar alocações
          for (const alocacao of alocacoes.filter(a => a.mes === mesSelecionado)) {
            if (!alocacao.user?.salario) continue;

            const salarioMensal = calcularSalarioAjustado(alocacao.user.salario);
            const custoEstimado = alocacao.ocupacao.times(salarioMensal);
            const custoRealizado = mesJaPassou ? custoEstimado : new Decimal(0);
            const valorETI = alocacao.workpackage.projeto.valor_eti 
              ? new Decimal(alocacao.workpackage.projeto.valor_eti)
              : new Decimal(0);
            const valorETIAlocacao = alocacao.ocupacao.times(valorETI);

            dadosMes.alocacoes.push({
              userId: alocacao.user.id,
              nome: alocacao.user.name,
              workpackage: alocacao.workpackage.nome,
              projeto: alocacao.workpackage.projeto.nome,
              ocupacao: alocacao.ocupacao.toNumber(),
              ocupacaoEstimada: alocacao.ocupacao.toNumber(),
              ocupacaoRealizada: alocacao.ocupacao.toNumber(),
              custoEstimado: custoEstimado.toNumber(),
              custoRealizado: custoRealizado.toNumber(),
              valorETI: valorETIAlocacao.toNumber()
            });

            // Atualizar totais
            dadosMes.totais.custoRecursosEstimado = dadosMes.totais.custoRecursosEstimado.plus(custoEstimado);
            dadosMes.totais.custoRecursosRealizado = dadosMes.totais.custoRecursosRealizado.plus(custoRealizado);
          }

          // Processar materiais
          for (const material of materiais.filter(m => m.mes === mesSelecionado)) {
            const custoTotal = material.preco.times(new Decimal(material.quantidade));
            
            dadosMes.materiais.push({
              nome: material.nome,
              workpackage: material.workpackage?.nome,
              projeto: material.workpackage?.projeto.nome,
              quantidade: material.quantidade,
              precoUnitario: material.preco.toNumber(),
              custoTotal: custoTotal.toNumber(),
              realizado: material.estado,
              rubrica: material.rubrica
            });

            // Atualizar totais
            dadosMes.totais.custoMateriaisEstimado = dadosMes.totais.custoMateriaisEstimado.plus(custoTotal);
            if (material.estado) {
              dadosMes.totais.custoMateriaisRealizado = dadosMes.totais.custoMateriaisRealizado.plus(custoTotal);
            }
          }

          // Converter totais para números
          const totaisResposta = {
            custoRecursosEstimado: dadosMes.totais.custoRecursosEstimado.toNumber(),
            custoRecursosRealizado: dadosMes.totais.custoRecursosRealizado.toNumber(),
            custoMateriaisEstimado: dadosMes.totais.custoMateriaisEstimado.toNumber(),
            custoMateriaisRealizado: dadosMes.totais.custoMateriaisRealizado.toNumber()
          };

          resultados.push({
            mes: dadosMes.mes,
            alocacoes: dadosMes.alocacoes,
            materiais: dadosMes.materiais,
            totais: totaisResposta
          });
        }

        return resultados;

      } catch (error) {
        console.error("Erro ao obter detalhamento de despesas:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter detalhamento de despesas",
          cause: error,
        });
      }
    }),
});
