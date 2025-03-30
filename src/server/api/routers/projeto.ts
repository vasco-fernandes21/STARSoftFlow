import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { publicProcedure } from '../trpc';
import { getTotais } from '../../utils/financeiro';

const projetoRouter = publicProcedure
  .input(z.object({
    limit: z.number().optional().default(10),
    cursor: z.string().nullish(),
    estado: z.nativeEnum(ProjetoEstado).optional(),
    includeFinancialDetails: z.boolean().optional().default(false)
  }))
  .query(async ({ ctx, input }) => {
    const { limit, cursor, estado, includeFinancialDetails } = input;
    const skip = cursor ? 1 : 0;
    
    // query conditions
    const where: Prisma.ProjetoWhereInput = {};
    if (estado) {
      where.estado = estado;
    }
    
    // execute query
    const items = await ctx.db.projeto.findMany({
      take: limit + 1,
      skip,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { updatedAt: 'desc' },
      where,
      include: {
        responsavel: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    const nextCursor = items.length > limit ? items[limit - 1]!.id : null;
    const projetosBase = items.slice(0, limit);
    
    // If financial details are requested, fetch them for each project
    let projetosWithFinances = projetosBase;
    
    if (includeFinancialDetails) {
      projetosWithFinances = await Promise.all(
        projetosBase.map(async (projeto) => {
          try {
            // Use the existing getTotaisFinanceiros function
            const financasData = await getTotais(ctx.db, projeto.id, { incluirDetalhesPorAno: true });
            return {
              ...projeto,
              financas: financasData,
            };
          } catch (error) {
            console.error(`Error fetching finances for project ${projeto.id}:`, error);
            return {
              ...projeto,
              financas: null,
            };
          }
        })
      );
    }
    
    return {
      items: projetosWithFinances,
      nextCursor,
      pagination: {
        total: await ctx.db.projeto.count({ where }),
        pageSize: limit,
        page: cursor ? Math.floor(skip / limit) + 1 : 1,
      },
    };
  });

export default projetoRouter; 