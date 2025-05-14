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

// Função auxiliar para calcular salário ajustado
function calcularSalarioAjustado(salario: Decimal | number | null | undefined): Decimal {
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

        // Buscar todos os projetos ativos (excluindo PENDENTE e RASCUNHO)
        const projetos = await ctx.db.projeto.findMany({
          where: {
            NOT: [
              { estado: ProjetoEstado.PENDENTE },
              { estado: ProjetoEstado.RASCUNHO }
            ]
          },
          select: {
            id: true,
            valor_eti: true,
            taxa_financiamento: true,
          }
        });

        // Inicializar arrays para os dados mensais
        const meses = Array.from({ length: 12 }, (_, i) => i + 1);
        const dadosMensais = meses.map(mes => ({
          mes,
          receitaTotal: new Decimal(0),
          despesaEstimada: new Decimal(0),
          despesaRealizada: new Decimal(0)
        }));

        // Para cada projeto, calcular receitas e despesas por mês
        for (const projeto of projetos) {
          // Buscar alocações do projeto por mês
          const alocacoes = await ctx.db.alocacaoRecurso.findMany({
            where: {
              workpackage: { projetoId: projeto.id },
              ano: ano
            },
            include: {
              user: { select: { salario: true } }
            }
          });

          // Buscar materiais do projeto por mês
          const materiais = await ctx.db.material.findMany({
            where: {
              workpackage: { projetoId: projeto.id },
              ano_utilizacao: ano
            }
          });

          // Processar dados por mês
          for (const dadoMensal of dadosMensais) {
            const mes = dadoMensal.mes;

            // Calcular custos de recursos para o mês
            const custosRecursosMes = alocacoes
              .filter(a => a.mes === mes)
              .reduce((sum, alocacao) => {
                if (!alocacao.user?.salario) return sum;
                return sum.plus(
                  alocacao.ocupacao.times(calcularSalarioAjustado(alocacao.user.salario))
                );
              }, new Decimal(0));

            // Calcular custos de materiais para o mês
            const custosMateriaisMes = materiais
              .filter(m => m.mes === mes)
              .reduce((sum, material) => {
                return sum.plus(material.preco.times(new Decimal(material.quantidade)));
              }, new Decimal(0));

            // Calcular custos de materiais realizados para o mês
            const custosMateriaisRealizadosMes = materiais
              .filter(m => m.mes === mes && m.estado === true)
              .reduce((sum, material) => {
                return sum.plus(material.preco.times(new Decimal(material.quantidade)));
              }, new Decimal(0));

            // Verificar se o mês já passou para considerar custos de recursos como realizados
            const hoje = new Date();
            const mesAtual = hoje.getMonth() + 1;
            const anoAtual = hoje.getFullYear();
            const mesJaPassou = ano < anoAtual || (ano === anoAtual && mes < mesAtual);

            // Atualizar dados mensais
            dadoMensal.despesaEstimada = dadoMensal.despesaEstimada
              .plus(custosRecursosMes)
              .plus(custosMateriaisMes);

            dadoMensal.despesaRealizada = dadoMensal.despesaRealizada
              .plus(mesJaPassou ? custosRecursosMes : new Decimal(0))
              .plus(custosMateriaisRealizadosMes);

            // Calcular receita base mensal do projeto (orçamento submetido mensal)
            let receitaMensalProjetoBase = new Decimal(0);
            if (projeto.valor_eti && projeto.valor_eti.greaterThan(0)) {
              // Se usa ETI, a receita base é alocações × valor_eti
              const alocacoesMes = alocacoes
                .filter(a => a.mes === mes)
                .reduce((sum, a) => sum.plus(a.ocupacao), new Decimal(0));
              receitaMensalProjetoBase = alocacoesMes.times(projeto.valor_eti);
            } else {
              // Se não usa ETI, a receita base é o custo estimado mensal (recursos + materiais)
              receitaMensalProjetoBase = custosRecursosMes.plus(custosMateriaisMes);
            }

            // Aplicar taxa de financiamento do projeto
            const taxaFinanciamentoProjeto = projeto.taxa_financiamento
              ? new Decimal(projeto.taxa_financiamento)
              : new Decimal(0); // Default to 0 if null

            const receitaMensalProjetoFinanciada = receitaMensalProjetoBase.times(taxaFinanciamentoProjeto);
            
            dadoMensal.receitaTotal = dadoMensal.receitaTotal.plus(receitaMensalProjetoFinanciada);
          }
        }

        // Converter Decimals para números e formatar resposta
        return dadosMensais.map(dado => ({
          mes: dado.mes,
          receitaTotal: dado.receitaTotal.toNumber(),
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

        const { ano, mes } = input;

        // Buscar todos os projetos ativos
        const projetos = await ctx.db.projeto.findMany({
          where: {
            NOT: [
              { estado: ProjetoEstado.PENDENTE },
              { estado: ProjetoEstado.RASCUNHO }
            ]
          },
          select: {
            id: true,
            nome: true,
            valor_eti: true,
            taxa_financiamento: true,
          }
        });

        // Estrutura para armazenar resultados por mês
        const meses = mes ? [mes] : Array.from({ length: 12 }, (_, i) => i + 1);
        const resultados = [];

        // Interface para os totais de cálculo (usando Decimal)
        interface TotaisCalculo {
          custoRecursosEstimado: Decimal;
          custoRecursosRealizado: Decimal;
          custoMateriaisEstimado: Decimal;
          custoMateriaisRealizado: Decimal;
          valorETIEstimado: Decimal;
          valorETIRealizado: Decimal;
        }

        // Interface para os totais da resposta (usando number)
        interface TotaisResposta {
          custoRecursosEstimado: number;
          custoRecursosRealizado: number;
          custoMateriaisEstimado: number;
          custoMateriaisRealizado: number;
          valorETIEstimado: number;
          valorETIRealizado: number;
        }

        for (const mesSelecionado of meses) {
          // Dados do mês atual
          const totaisCalculo: TotaisCalculo = {
            custoRecursosEstimado: new Decimal(0),
            custoRecursosRealizado: new Decimal(0),
            custoMateriaisEstimado: new Decimal(0),
            custoMateriaisRealizado: new Decimal(0),
            valorETIEstimado: new Decimal(0),
            valorETIRealizado: new Decimal(0)
          };

          const dadosMes = {
            mes: mesSelecionado,
            recursos: [] as any[],
            materiais: [] as any[],
            totais: totaisCalculo
          };

          // Verificar se o mês já passou
          const hoje = new Date();
          const mesAtual = hoje.getMonth() + 1;
          const anoAtual = hoje.getFullYear();
          const mesJaPassou = ano < anoAtual || (ano === anoAtual && mesSelecionado < mesAtual);

          // Para cada projeto, buscar alocações e materiais
          for (const projeto of projetos) {
            // Buscar alocações agrupadas por utilizador
            const alocacoes = await ctx.db.alocacaoRecurso.findMany({
              where: {
                workpackage: { projetoId: projeto.id },
                ano: ano,
                mes: mesSelecionado
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
                    nome: true
                  }
                }
              }
            });

            // Agrupar alocações por utilizador
            const alocacoesPorUser = new Map();
            for (const alocacao of alocacoes) {
              if (!alocacao.user) continue;

              const userId = alocacao.user.id;
              if (!alocacoesPorUser.has(userId)) {
                alocacoesPorUser.set(userId, {
                  userId: alocacao.user.id,
                  nome: alocacao.user.name,
                  ocupacaoTotal: new Decimal(0),
                  custoEstimado: new Decimal(0),
                  custoRealizado: new Decimal(0),
                  valorETIEstimado: new Decimal(0),
                  valorETIRealizado: new Decimal(0),
                  detalhes: []
                });
              }

              const userDados = alocacoesPorUser.get(userId);
              const salarioMensal = calcularSalarioAjustado(alocacao.user.salario);
              const custoAlocacao = alocacao.ocupacao.times(salarioMensal);
              const valorETI = projeto.valor_eti 
                ? alocacao.ocupacao.times(projeto.valor_eti)
                : new Decimal(0);

              userDados.ocupacaoTotal = userDados.ocupacaoTotal.plus(alocacao.ocupacao);
              userDados.custoEstimado = userDados.custoEstimado.plus(custoAlocacao);
              userDados.custoRealizado = mesJaPassou ? userDados.custoRealizado.plus(custoAlocacao) : userDados.custoRealizado;
              userDados.valorETIEstimado = userDados.valorETIEstimado.plus(valorETI);
              userDados.valorETIRealizado = mesJaPassou ? userDados.valorETIRealizado.plus(valorETI) : userDados.valorETIRealizado;
              
              userDados.detalhes.push({
                workpackage: alocacao.workpackage.nome,
                ocupacao: alocacao.ocupacao.toNumber(),
                custoEstimado: custoAlocacao.toNumber(),
                custoRealizado: mesJaPassou ? custoAlocacao.toNumber() : 0,
                valorETIEstimado: valorETI.toNumber(),
                valorETIRealizado: mesJaPassou ? valorETI.toNumber() : 0
              });
            }

            // Adicionar dados de recursos ao resultado do mês
            for (const userData of alocacoesPorUser.values()) {
              dadosMes.recursos.push({
                ...userData,
                ocupacaoTotal: userData.ocupacaoTotal.toNumber(),
                custoEstimado: userData.custoEstimado.toNumber(),
                custoRealizado: userData.custoRealizado.toNumber(),
                valorETIEstimado: userData.valorETIEstimado.toNumber(),
                valorETIRealizado: userData.valorETIRealizado.toNumber()
              });

              // Atualizar totais
              dadosMes.totais.custoRecursosEstimado = dadosMes.totais.custoRecursosEstimado.plus(userData.custoEstimado);
              dadosMes.totais.custoRecursosRealizado = dadosMes.totais.custoRecursosRealizado.plus(userData.custoRealizado);
              dadosMes.totais.valorETIEstimado = dadosMes.totais.valorETIEstimado.plus(userData.valorETIEstimado);
              dadosMes.totais.valorETIRealizado = dadosMes.totais.valorETIRealizado.plus(userData.valorETIRealizado);
            }

            // Buscar materiais do projeto para o mês
            const materiais = await ctx.db.material.findMany({
              where: {
                workpackage: { projetoId: projeto.id },
                ano_utilizacao: ano,
                mes: mesSelecionado
              },
              include: {
                workpackage: {
                  select: {
                    nome: true
                  }
                }
              }
            });

            // Processar materiais
            for (const material of materiais) {
              const custoTotal = material.preco.times(new Decimal(material.quantidade));
              
              dadosMes.materiais.push({
                nome: material.nome,
                workpackage: material.workpackage?.nome,
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
          }

          // Converter totais para números na resposta
          const totaisResposta: TotaisResposta = {
            custoRecursosEstimado: dadosMes.totais.custoRecursosEstimado.toNumber(),
            custoRecursosRealizado: dadosMes.totais.custoRecursosRealizado.toNumber(),
            custoMateriaisEstimado: dadosMes.totais.custoMateriaisEstimado.toNumber(),
            custoMateriaisRealizado: dadosMes.totais.custoMateriaisRealizado.toNumber(),
            valorETIEstimado: dadosMes.totais.valorETIEstimado.toNumber(),
            valorETIRealizado: dadosMes.totais.valorETIRealizado.toNumber()
          };

          // Criar objeto final do mês com totais convertidos
          const dadosMesResposta = {
            ...dadosMes,
            totais: totaisResposta
          };

          resultados.push(dadosMesResposta);
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
