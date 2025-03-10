import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Schemas
export const entregavelBaseSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
  descricao: z.string().optional().nullable(),
  data: z.string().optional().nullable(),
  anexo: z.string().optional().nullable(),
});

export const entregavelCreateSchema = entregavelBaseSchema.extend({
  tarefaId: z.string().uuid("ID da tarefa inválido"),
});

export const entregavelUpdateSchema = z.object({
  id: z.string().uuid("ID do entregável inválido"),
  data: entregavelBaseSchema.partial(),
});

export const entregavelAnexoSchema = z.object({
  id: z.string().uuid("ID do entregável inválido"),
  anexo: z.string().nullable(),
});

// Types
export type EntregavelCreate = z.infer<typeof entregavelCreateSchema>;
export type EntregavelUpdate = z.infer<typeof entregavelUpdateSchema>;
export type EntregavelAnexo = z.infer<typeof entregavelAnexoSchema>;

// Router
export const entregavelRouter = createTRPCRouter({
  // Criar novo entregável
  create: protectedProcedure
    .input(entregavelCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.entregavel.create({
        data: {
          nome: input.nome,
          descricao: input.descricao,
          data: input.data ? new Date(input.data) : null,
          anexo: input.anexo,
          tarefaId: input.tarefaId,
        },
      });
    }),

  // Atualizar entregável existente
  update: protectedProcedure
    .input(entregavelUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.entregavel.update({
        where: { id: input.id },
        data: {
          nome: input.data.nome,
          descricao: input.data.descricao,
          data: input.data.data ? new Date(input.data.data) : undefined,
          anexo: input.data.anexo,
        },
      });
    }),

  // Obter entregável por ID
  getById: protectedProcedure
    .input(z.string().uuid("ID do entregável inválido"))
    .query(async ({ ctx, input }) => {
      return ctx.db.entregavel.findUnique({
        where: { id: input },
        include: {
          tarefa: {
            include: {
              workpackage: {
                include: {
                  projeto: true,
                },
              },
            },
          },
        },
      });
    }),

  // Obter entregáveis por tarefa
  getByTarefa: protectedProcedure
    .input(z.string().uuid("ID da tarefa inválido"))
    .query(async ({ ctx, input }) => {
      return ctx.db.entregavel.findMany({
        where: { tarefaId: input },
        orderBy: { data: "asc" },
      });
    }),

  // Excluir entregável
  delete: protectedProcedure
    .input(z.string().uuid("ID do entregável inválido"))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.entregavel.delete({
        where: { id: input },
      });
    }),

  // Atualizar anexo do entregável
  updateAnexo: protectedProcedure
    .input(entregavelAnexoSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.entregavel.update({
        where: { id: input.id },
        data: { anexo: input.anexo },
      });
    }),
});
