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

// Função utilitária para obter os dados do relatório mensal
async function obterRelatorioMensal(ctx: any, input: any) {
  // Buscar utilizador por userId ou username
  let utilizador;
  if (input.userId) {
    utilizador = await ctx.db.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        name: true,
        username: true,
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
        username: true,
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
        jornadaDiaria: true,
      },
    });
  }
  if (!configuracaoMensal) {
    const diasUteis = 20;
    const jornadaDiaria = 8;
    const horasPotenciais = new Decimal(diasUteis * jornadaDiaria);
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
            jornadaDiaria,
          },
        });
      } else {
        await ctx.db.configuracaoMensal.create({
          data: {
            mes: input.mes,
            ano: input.ano,
            diasUteis,
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
              tipo: true,
            },
          },
        },
      },
    },
    distinct: ['workpackageId'],
  });

  // Processar alocações: agregar por projeto se for ATIVIDADE_ECONOMICA
  const agregadas: any[] = [];
  const outros: any[] = [];
  const atividadeEconomicaMap = new Map<string, { projetoId: string, projetoNome: string, projetoEstado: string, ocupacao: number }>();

  for (const alocacao of alocacoes) {
    const projeto = alocacao.workpackage?.projeto;
    if (projeto?.tipo === 'ATIVIDADE_ECONOMICA') {
      // Agregar por projeto
      if (!atividadeEconomicaMap.has(projeto.id)) {
        atividadeEconomicaMap.set(projeto.id, {
          projetoId: projeto.id,
          projetoNome: 'Atividade Económica',
          projetoEstado: projeto.estado,
          ocupacao: 0,
        });
      }
      const entry = atividadeEconomicaMap.get(projeto.id)!;
      entry.ocupacao += Number(alocacao.ocupacao);
    } else {
      outros.push({
        workpackageId: alocacao.workpackageId,
        workpackageNome: alocacao.workpackage?.nome ?? 'Workpackage sem nome',
        projetoId: projeto?.id ?? 'Projeto sem ID',
        projetoNome: projeto?.nome ?? 'Projeto sem nome',
        projetoEstado: projeto?.estado,
        ocupacao: Number(alocacao.ocupacao),
      });
    }
  }

  // Adicionar as linhas agregadas de atividade económica
  for (const entry of atividadeEconomicaMap.values()) {
    agregadas.push({
      workpackageId: '',
      workpackageNome: 'Atividade Económica',
      projetoId: entry.projetoId,
      projetoNome: 'Atividade Económica',
      projetoEstado: entry.projetoEstado,
      ocupacao: entry.ocupacao,
    });
  }

  const alocacoesFormatadas = [...outros, ...agregadas];

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
  const tarefasCompletadas = tarefas.filter((t: any) => t.estado).length;
  const tarefasPendentes = tarefas.filter((t: any) => !t.estado).length;
  const horasPotenciaisCalculadas = new Decimal(configuracaoMensal.diasUteis).mul(new Decimal(configuracaoMensal.jornadaDiaria || 8));
  const horasTrabalhadas = alocacoes.reduce((acc: any, a: any) => acc + Number(a.ocupacao) * horasPotenciaisCalculadas.toNumber(), 0);
  const produtividade = tarefas.length > 0 ? Math.round((tarefasCompletadas / tarefas.length) * 100) : 0;

  // Buscar alocações de férias/ausências
  const alocacoesAusencias = await ctx.db.alocacaoRecurso.findMany({
    where: {
      userId: utilizador.id,
      mes: input.mes,
      ano: input.ano,
      workpackageId: null,
    },
    select: {
      ocupacao: true,
    },
  });

  const totalOcupacaoAusencias = alocacoesAusencias.reduce((sum: any, a: any) => sum + Number(a.ocupacao), 0);
  const horasAusencias = totalOcupacaoAusencias * horasPotenciaisCalculadas.toNumber();

  return {
    utilizador: {
      id: utilizador.id,
      nome: utilizador.name,
      email: utilizador.email,
      cargo: utilizador.atividade || "Cargo não definido",
    },
    configuracaoMensal: {
      diasUteis: configuracaoMensal.diasUteis,
      horasPotenciais: horasPotenciaisCalculadas.toNumber(),
      jornadaDiaria: configuracaoMensal.jornadaDiaria || 8,
      ausencias: horasAusencias, // Adicionado
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
      return obterRelatorioMensal(ctx, input);
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
          const user = await ctx.db.user.findUnique({ where: { username: input.username }, select: { id: true, username: true } });
          if (!user) throw new TRPCError({ code: "NOT_FOUND", message: `Utilizador ${input.username} não encontrado.` });
          userId = user.id;
          reportUsername = user.username ?? input.username;
        } else if (input.id) {
          const user = await ctx.db.user.findUnique({ where: { id: input.id }, select: { id: true, username: true } });
          if (!user) throw new TRPCError({ code: "NOT_FOUND", message: `Utilizador com ID ${input.id} não encontrado.` });
          userId = user.id;
          reportUsername = user.username ?? input.id;
        } else {
          throw new TRPCError({ code: "BAD_REQUEST", message: "É necessário fornecer username ou id." });
        }

        // Obter dados do relatório usando a função utilitária
        dadosRelatorio = await obterRelatorioMensal(ctx, {
          userId: userId, // Passando userId que já foi determinado
          mes: input.mes,
          ano: input.ano,
        });

        // Gerar HTML usando o template
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
