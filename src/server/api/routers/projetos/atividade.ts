import { publicProcedure, createTRPCRouter } from "../../trpc";

export const atividadeProjetoRouter = createTRPCRouter({
  getAtividadeEconomica: publicProcedure.query(async ({ ctx }) => {
    const projeto = await ctx.db.projeto.findFirst({
      where: { tipo: "ATIVIDADE_ECONOMICA" },
      include: {
        workpackages: {
          include: {
            tarefas: {
              include: {
                entregaveis: true,
              },
            },
            materiais: true,
            recursos: {
              include: {
                user: true,
              },
            },
          },
        },
        financiamento: true,
      },
    });
    if (!projeto) {
      throw new Error("Atividade económica não encontrada");
    }

    // Calcular início e fim com base nos workpackages
    let inicio: Date | null = null;
    let fim: Date | null = null;
    if (projeto.workpackages && projeto.workpackages.length > 0) {
      const sortedByStart = projeto.workpackages
        .filter(wp => wp.inicio != null)
        .sort((a, b) => {
          const aDate = wpToDate(a.inicio);
          const bDate = wpToDate(b.inicio);
          return (aDate ? aDate.getTime() : Infinity) - (bDate ? bDate.getTime() : Infinity);
        });
      const sortedByEnd = projeto.workpackages
        .filter(wp => wp.fim != null)
        .sort((a, b) => {
          const aDate = wpToDate(a.fim);
          const bDate = wpToDate(b.fim);
          return (aDate ? aDate.getTime() : Infinity) - (bDate ? bDate.getTime() : Infinity);
        });
      if (sortedByStart.length > 0 && sortedByStart[0]) inicio = wpToDate(sortedByStart[0].inicio);
      if (sortedByEnd.length > 0 && sortedByEnd[sortedByEnd.length - 1]) fim = wpToDate(sortedByEnd[sortedByEnd.length - 1]?.fim);
    }

    function wpToDate(val: any): Date | null {
      if (!val) return null;
      if (val instanceof Date) return val;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }

    return {
      ...projeto,
      inicio,
      fim,
    };
  }),
});
