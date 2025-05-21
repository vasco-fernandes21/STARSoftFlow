import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { Prisma, ProjetoEstado } from "@prisma/client";
import { Decimal } from "decimal.js";
import { getTotalAlocacoesSchema } from "./schemas";

export const estatisticasProjetoRouter = createTRPCRouter({
  // Obter estatísticas gerais dos projetos
  getProjetosStats: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session?.user?.id;

        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Utilizador não autenticado",
          });
        }

        // Buscar permissão do utilizador
        const user = await ctx.db.user.findUnique({
          where: { id: userId },
          select: { permissao: true },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilizador não encontrado",
          });
        }

        const isComum = user.permissao === "COMUM";

        // Base where clause para projetos standard (não atividade económica)
        const baseWhere = {
          tipo: "STANDARD" as const,
          ...(isComum && {
            workpackages: {
              some: {
                recursos: {
                  some: {
                    userId: userId,
                  },
                },
              },
            },
          }),
        };

        // Total de projetos
        const totalProjetos = await ctx.db.projeto.count({
          where: baseWhere,
        });

        // Projetos concluídos
        const projetosConcluidos = await ctx.db.projeto.count({
          where: {
            ...baseWhere,
            estado: "CONCLUIDO",
          },
        });

        // Projetos em desenvolvimento
        const projetosEmDesenvolvimento = await ctx.db.projeto.count({
          where: {
            ...baseWhere,
            estado: "EM_DESENVOLVIMENTO",
          },
        });

        // Projetos com entregáveis em atraso
        const hoje = new Date();
        const projetosAtrasados = await ctx.db.projeto.count({
          where: {
            ...baseWhere,
            estado: {
              in: ["APROVADO", "EM_DESENVOLVIMENTO", "CONCLUIDO"],
            },
            workpackages: {
              some: {
                tarefas: {
                  some: {
                    entregaveis: {
                      some: {
                        data: {
                          lt: hoje,
                        },
                        estado: false,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        return {
          total: totalProjetos,
          concluidos: projetosConcluidos,
          emDesenvolvimento: projetosEmDesenvolvimento,
          atrasados: projetosAtrasados,
        };
      } catch (error) {
        console.error("Erro ao obter estatísticas dos projetos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter estatísticas dos projetos",
          cause: error,
        });
      }
    }),

  // Nova procedure para obter totais de alocações por projeto
  getTotalAlocacoes: protectedProcedure
    .input(getTotalAlocacoesSchema)
    .query(async ({ ctx, input }) => {
      try {
        const { projetoIds, ano } = input;

        // Interface para o snapshot (semelhante à usada em utilizadorRouter)
        interface ApprovedSnapshotResource {
          userId: string;
          mes: number;
          ano: number;
          ocupacao: number;
        }
        interface ApprovedSnapshotWorkpackage {
          id: string;
          nome: string;
          recursos: ApprovedSnapshotResource[];
        }
        interface ApprovedSnapshot {
          workpackages: ApprovedSnapshotWorkpackage[];
        }

        // 1. Calcular Total de Alocações Reais
        const alocacoesReaisDb = await ctx.db.alocacaoRecurso.findMany({
          where: {
            workpackage: {
              projetoId: { in: projetoIds },
              projeto: { estado: { in: Object.values(ProjetoEstado).filter(s => s !== "PENDENTE" && s !== "RASCUNHO") } },
            },
            ...(ano && { ano }),
          },
          select: {
            ocupacao: true,
            workpackage: { 
              select: { 
                projetoId: true,
                projeto: {
                  select: {
                    nome: true
                  }
                }
              } 
            },
          },
        });

        const totaisReaisMap = new Map<string, Decimal>();
        const nomesProjetosMap = new Map<string, string>();
        alocacoesReaisDb.forEach(ar => {
          const projetoId = ar.workpackage?.projetoId;
          if (typeof projetoId === 'string') {
            const currentTotal = totaisReaisMap.get(projetoId) || new Decimal(0);
            totaisReaisMap.set(projetoId, currentTotal.add(new Decimal(ar.ocupacao)));
            if (ar.workpackage?.projeto?.nome) {
              nomesProjetosMap.set(projetoId, ar.workpackage.projeto.nome);
            }
          }
        });

        // 2. Calcular Total de Alocações Submetidas (do Snapshot)
        const projetosComSnapshot = await ctx.db.projeto.findMany({
          where: {
            id: { in: projetoIds },
            estado: { in: Object.values(ProjetoEstado).filter(s => s !== "PENDENTE" && s !== "RASCUNHO") },
            aprovado: { not: Prisma.DbNull },
          },
          select: {
            id: true,
            nome: true,
            aprovado: true,
          },
        });

        const totaisSubmetidosMap = new Map<string, Decimal>();
        projetosComSnapshot.forEach(p => {
          if (p.aprovado) {
            try {
              const snapshot = p.aprovado as unknown as ApprovedSnapshot;
              let totalOcupacaoSnapshot = new Decimal(0);
              if (snapshot && Array.isArray(snapshot.workpackages)) {
                snapshot.workpackages.forEach(wp => {
                  if (wp.recursos && Array.isArray(wp.recursos)) {
                    wp.recursos.forEach(r => {
                      if (!ano || r.ano === ano) {
                        totalOcupacaoSnapshot = totalOcupacaoSnapshot.add(new Decimal(r.ocupacao));
                      }
                    });
                  }
                });
              }
              totaisSubmetidosMap.set(p.id, totalOcupacaoSnapshot);
              if (p.nome) {
                nomesProjetosMap.set(p.id, p.nome);
              }
            } catch (e) {
              console.error(`Error parsing snapshot for projeto ${p.id}:`, e);
              totaisSubmetidosMap.set(p.id, new Decimal(0));
            }
          }
        });

        // 3. Combinar resultados
        const resultado = projetoIds.map(pid => ({
          projetoId: pid,
          nome: nomesProjetosMap.get(pid) || "",
          totalAlocacoesReais: (totaisReaisMap.get(pid) || new Decimal(0)).toNumber(),
          totalAlocacoesSubmetidas: (totaisSubmetidosMap.get(pid) || new Decimal(0)).toNumber(),
        }));

        return resultado;

      } catch (error) {
        console.error("Erro ao obter totais de alocações por projeto:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao obter totais de alocações",
          cause: error,
        });
      }
    }),
});
