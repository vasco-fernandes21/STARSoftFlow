import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Decimal } from "decimal.js";
import { RelatorioTemplate } from "@/templates/relatorio-template";
import type { RelatorioMensalOutput } from "@/templates/relatorio-template";
import type { UserWithPermissao } from "./schemas";

// Helper para lançar o Chromium (Puppeteer)
async function launchChromium() {
  if (process.env.NODE_ENV === "production") {
    // @ts-ignore
    const puppeteer = require("puppeteer-core");
    // @ts-ignore
    const chromium = require("@sparticuz/chromium");
    return await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  } else {
    // @ts-ignore
    const puppeteer = require("puppeteer");
    return await puppeteer.launch({ headless: true });
  }
}

export const relatoriosUtilizadorRouter = createTRPCRouter({
  // Query para obter os dados do relatório mensal
  getRelatorioMensal: protectedProcedure
    .input(
      z.object({
        username: z.string().optional(),
        userId: z.string().optional(),
        mes: z.number().min(1).max(12),
        ano: z.number(),
      }).refine(
        (data) => data.username || data.userId,
        { message: "É necessário fornecer username ou userId" }
      )
    )
    .query(async ({ ctx, input }) => {
      // Buscar utilizador por userId ou username
      let utilizador;
      if (input.userId) {
        utilizador = await ctx.db.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            name: true,
            email: true,
            atividade: true,
            regime: true,
          },
        });
      } else if (input.username) {
        utilizador = await ctx.db.user.findUnique({
          where: { username: input.username },
          select: {
            id: true,
            name: true,
            email: true,
            atividade: true,
            regime: true,
          },
        });
      }

      if (!utilizador) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilizador não encontrado",
        });
      }

      // Calcular datas do mês
      const dataInicio = new Date(input.ano, input.mes - 1, 1);
      const dataFim = new Date(input.ano, input.mes, 0);

      // Buscar configuração baseada no regime do utilizador
      let configuracaoMensal;
      if (utilizador.regime === "PARCIAL") {
        configuracaoMensal = await ctx.db.configuracaoUtilizadorMensal.findFirst({
          where: {
            userId: utilizador.id,
            mes: input.mes,
            ano: input.ano,
          },
          select: {
            diasUteis: true,
            horasPotenciais: true,
            jornadaDiaria: true,
          },
        });
      }
      if (!configuracaoMensal) {
        configuracaoMensal = await ctx.db.configuracaoMensal.findFirst({
          where: {
            mes: input.mes,
            ano: input.ano,
          },
          select: {
            diasUteis: true,
            horasPotenciais: true,
            jornadaDiaria: true,
          },
        });
      }
      if (!configuracaoMensal) {
        const diasUteis = 20;
        const horasPotenciais = new Decimal(diasUteis * 8);
        const jornadaDiaria = 8;
        configuracaoMensal = {
          diasUteis,
          horasPotenciais,
          jornadaDiaria,
        };
        const user = ctx.session?.user as UserWithPermissao | undefined;
        if (user && (user.permissao === "ADMIN" || user.permissao === "GESTOR")) {
          if (utilizador.regime === "PARCIAL") {
            await ctx.db.configuracaoUtilizadorMensal.create({
              data: {
                userId: utilizador.id,
                mes: input.mes,
                ano: input.ano,
                diasUteis,
                horasPotenciais,
                jornadaDiaria,
              },
            });
          } else {
            await ctx.db.configuracaoMensal.create({
              data: {
                mes: input.mes,
                ano: input.ano,
                diasUteis,
                horasPotenciais,
                jornadaDiaria,
              },
            });
          }
        }
      }

      // Buscar alocações do utilizador
      const alocacoes = await ctx.db.alocacaoRecurso.findMany({
        where: {
          userId: utilizador.id,
          mes: input.mes,
          ano: input.ano,
          workpackage: {
            projeto: {
              estado: {
                in: ['APROVADO', 'EM_DESENVOLVIMENTO', 'CONCLUIDO']
              }
            }
          }
        },
        select: {
          workpackageId: true,
          ocupacao: true,
          workpackage: {
            select: {
              nome: true,
              projeto: {
                select: {
                  id: true,
                  nome: true,
                  estado: true,
                },
              },
            },
          },
        },
        distinct: ['workpackageId'],
      });

      // Formatar alocações
      const alocacoesFormatadas = alocacoes.map((alocacao) => ({
        workpackageId: alocacao.workpackageId,
        workpackageNome: alocacao.workpackage.nome ?? "Workpackage sem nome",
        projetoId: alocacao.workpackage.projeto.id,
        projetoNome: alocacao.workpackage.projeto.nome ?? "Projeto sem nome",
        projetoEstado: alocacao.workpackage.projeto.estado,
        ocupacao: Number(alocacao.ocupacao),
      }));

      // Buscar tarefas do mês
      const tarefas = await ctx.db.tarefa.findMany({
        where: {
          workpackage: {
            recursos: {
              some: {
                userId: utilizador.id,
                mes: input.mes,
                ano: input.ano,
              },
            },
          },
          inicio: {
            gte: dataInicio,
            lte: dataFim,
          },
        },
        select: {
          id: true,
          nome: true,
          descricao: true,
          inicio: true,
          estado: true,
        },
      });

      // Buscar atividades do mês (simulado)
      const atividades: Array<{
        id: string;
        descricao: string;
        data: Date;
        tipo: "tarefa" | "projeto" | "reunião";
        duracao: number;
      }> = [];

      // Calcular estatísticas
      const tarefasCompletadas = tarefas.filter((t) => t.estado).length;
      const tarefasPendentes = tarefas.filter((t) => !t.estado).length;
      const horasTrabalhadas = alocacoes.reduce((acc, a) => acc + Number(a.ocupacao) * Number(configuracaoMensal.horasPotenciais), 0);
      const produtividade = tarefas.length > 0 ? Math.round((tarefasCompletadas / tarefas.length) * 100) : 0;

      return {
        utilizador: {
          id: utilizador.id,
          nome: utilizador.name,
          email: utilizador.email,
          cargo: utilizador.atividade || "Cargo não definido",
        },
        configuracaoMensal: {
          diasUteis: configuracaoMensal.diasUteis,
          horasPotenciais: Number(configuracaoMensal.horasPotenciais),
          jornadaDiaria: configuracaoMensal.jornadaDiaria || 8,
        },
        alocacoes: alocacoesFormatadas,
        estatisticas: {
          tarefasCompletadas,
          tarefasPendentes,
          horasTrabalhadas,
          produtividade,
        },
        atividades: atividades.map((a) => ({
          ...a,
          data: a.data.toISOString(),
        })),
      };
    }),

  // Mutation para gerar o PDF do relatório mensal
  gerarRelatorioPDF: protectedProcedure
    .input(
      z.object({
        username: z.string().optional(),
        id: z.string().optional(),
        mes: z.number().min(1).max(12),
        ano: z.number(),
      }).refine(
        (data) => data.username !== undefined || data.id !== undefined,
        {
          message: "É necessário fornecer 'username' ou 'id'.",
          path: ["username", "id"],
        }
      )
    )
    .mutation(async ({ ctx, input }) => {
      let browser: any = null;
      let htmlContent: string;
      let dadosRelatorio: RelatorioMensalOutput;
      let userId: string;
      let reportUsername: string;

      try {
        // 1. Determinar o usuário com base no input (username ou id)
        if (input.username) {
          const user = await ctx.db.user.findUnique({
            where: { username: input.username },
            select: { id: true, username: true },
          });
          if (!user) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Utilizador com username ${input.username} não encontrado.`,
            });
          }
          userId = user.id;
          reportUsername = user.username || "Utilizador";
        } else if (input.id) {
          const user = await ctx.db.user.findUnique({
            where: { id: input.id },
            select: { id: true, username: true },
          });
          if (!user) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Utilizador com ID ${input.id} não encontrado.`,
            });
          }
          userId = user.id;
          reportUsername = user.username || "Utilizador";
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Input inválido: 'username' ou 'id' deve ser fornecido.",
          });
        }

        // 2. Obter e formatar dados do relatório
        const dadosBrutos = await ctx.db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            workpackages: {
              where: { mes: input.mes, ano: input.ano },
              select: {
                ocupacao: true,
                workpackage: {
                  select: {
                    id: true,
                    nome: true,
                    projeto: {
                      select: {
                        id: true,
                        nome: true,
                        estado: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!dadosBrutos) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Dados do utilizador não encontrados para este período.",
          });
        }

        dadosRelatorio = {
          utilizador: {
            id: dadosBrutos.id,
            nome: dadosBrutos.name ?? "Nome Indisponível",
            username: dadosBrutos.username ?? "Username Indisponível",
            email: dadosBrutos.email ?? undefined,
          },
          configuracaoMensal: {
            diasUteis: 22, // Placeholder
            horasPotenciais: 22 * 8, // Placeholder
          },
          alocacoes: dadosBrutos.workpackages?.map(aloc => ({
            workpackageId: aloc.workpackage.id,
            workpackageNome: aloc.workpackage.nome ?? "Workpackage sem nome",
            projetoId: aloc.workpackage.projeto.id,
            projetoNome: aloc.workpackage.projeto.nome ?? "Projeto sem nome",
            projetoEstado: aloc.workpackage.projeto.estado,
            ocupacao: Number(aloc.ocupacao),
          })) ?? [],
          estatisticas: {},
          atividades: [],
        };

        // 3. Gerar o HTML do relatório usando a função RelatorioTemplate
        htmlContent = await RelatorioTemplate({
          data: dadosRelatorio,
          periodo: { mes: input.mes, ano: input.ano },
        });

        browser = await launchChromium();
        const page = await browser.newPage();
        await page.setContent(htmlContent, {
          waitUntil: ['networkidle0', 'domcontentloaded', 'load'],
          timeout: 30000
        });
        const pdfBufferRaw = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: {
            top: "20mm",
            right: "20mm",
            bottom: "20mm",
            left: "20mm",
          },
        });
        const pdfBuffer = Buffer.isBuffer(pdfBufferRaw) ? pdfBufferRaw : Buffer.from(pdfBufferRaw);
        const pdfBase64String = pdfBuffer.toString("base64");
        return {
          pdfBase64: pdfBase64String,
          fileName: `${reportUsername.replace(/\s+/g, '_')}_${String(input.mes).padStart(2, '0')}_${input.ano}.pdf`,
        };
      } catch (error) {
        if (browser) {
          await browser.close();
        }
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao gerar o relatório PDF.",
          cause: error instanceof Error ? error.message : "Erro desconhecido durante a geração do PDF",
        });
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    }),
});
