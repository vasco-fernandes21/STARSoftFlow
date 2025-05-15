import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Prisma, Rubrica } from "@prisma/client";
import { z } from "zod";

// Schema base para materiais
const materialBaseSchema = z.object({
  nome: z
    .string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(255, "Nome deve ter no máximo 255 caracteres"),
  descricao: z.string().optional(),
  preco: z.number().min(0, "Preço deve ser positivo"),
  quantidade: z.number().int().min(1, "Quantidade deve ser pelo menos 1"),
  rubrica: z.nativeEnum(Rubrica),
  ano_utilizacao: z.number().int().min(2024, "Ano de utilização inválido"),
  mes: z.number().int().min(1).max(12).default(1),
  workpackageId: z.string().uuid("ID de workpackage inválido"),
  estado: z.boolean().default(false),
});

// Schema para criação de material
const createMaterialSchema = materialBaseSchema;

// Schema para atualização de material
const updateMaterialSchema = materialBaseSchema.extend({
  preco: z.union([
    z.number().min(0, "Preço deve ser positivo"),
    z.string().transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error("Preço inválido");
      return num;
    })
  ]),
}).partial();

export const materialRouter = createTRPCRouter({
  // Criar material
  create: protectedProcedure.input(createMaterialSchema).mutation(async ({ ctx, input }) => {
    try {
      // Verificar se o workpackage existe
      const workpackage = await ctx.db.workpackage.findUnique({
        where: { id: input.workpackageId },
      });

      if (!workpackage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Work Package não encontrado",
        });
      }

      // Criar material usando Prisma
      const material = await ctx.db.material.create({
        data: {
          nome: input.nome,
          descricao: input.descricao,
          preco: new Prisma.Decimal(input.preco),
          quantidade: input.quantidade,
          rubrica: input.rubrica,
          ano_utilizacao: input.ano_utilizacao,
          mes: input.mes,
          workpackageId: input.workpackageId,
          estado: input.estado,
        },
      });

      return material;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao criar material",
        cause: error,
      });
    }
  }),

  // Atualizar material
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: updateMaterialSchema.omit({ workpackageId: true }).optional(),
        workpackageId: z.string().uuid("ID de workpackage inválido").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, data: inputData = {}, workpackageId } = input;

        // Log para debug
        console.log("Material update input:", JSON.stringify(input, null, 2));

        // Verificar se o material existe
        const materialExistente = await ctx.db.material.findUnique({
          where: { id },
        });

        if (!materialExistente) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Material não encontrado",
          });
        }

        // Definir quais dados serão atualizados
        const data: Prisma.MaterialUpdateInput = {};

        // Adicionar campos do objeto data se fornecido
        if (inputData.nome !== undefined) data.nome = inputData.nome;
        if (inputData.descricao !== undefined) data.descricao = inputData.descricao;
        if (inputData.preco !== undefined) {
          const precoNumerico = typeof inputData.preco === 'string' ? parseFloat(inputData.preco) : inputData.preco;
          if (isNaN(precoNumerico)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Preço inválido",
            });
          }
          data.preco = new Prisma.Decimal(precoNumerico);
        }
        if (inputData.quantidade !== undefined) data.quantidade = inputData.quantidade;
        if (inputData.ano_utilizacao !== undefined) data.ano_utilizacao = inputData.ano_utilizacao;
        if (inputData.mes !== undefined) data.mes = inputData.mes;
        if (inputData.rubrica !== undefined) data.rubrica = inputData.rubrica;
        if (inputData.estado !== undefined) data.estado = inputData.estado;

        // Adicionar workpackageId se fornecido
        if (workpackageId) {
          // Verificar se o workpackage existe
          const workpackage = await ctx.db.workpackage.findUnique({
            where: { id: workpackageId },
          });

          if (!workpackage) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Work Package não encontrado",
            });
          }

          data.workpackage = { connect: { id: workpackageId } };
        }

        // Log para debug
        console.log("Material update data preparada:", JSON.stringify(data, null, 2));

        // Verificar se há dados para atualizar
        if (Object.keys(data).length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Nenhum dado fornecido para atualização",
          });
        }

        // Atualizar material
        const material = await ctx.db.material.update({
          where: { id },
          data,
        });

        // Log para debug
        console.log("Material atualizado com sucesso:", JSON.stringify(material, null, 2));

        return material;
      } catch (error) {
        console.error("Erro na atualização do material:", error);

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          console.error(`Prisma Error code: ${error.code}, message: ${error.message}`);

          // Mensagem mais específica para erros conhecidos
          if (error.code === "P2025") {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Material não encontrado",
            });
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao atualizar material",
          cause: error,
        });
      }
    }),

  // Apagar material
  delete: protectedProcedure.input(z.number()).mutation(async ({ ctx, input: id }) => {
    try {
      await ctx.db.material.delete({
        where: { id },
      });

      return { success: true };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao apagar material",
        cause: error,
      });
    }
  }),

  // Obter materiais por workpackage
  getByWorkpackage: protectedProcedure
    .input(z.string().uuid("ID de workpackage inválido"))
    .query(async ({ ctx, input: workpackageId }) => {
      try {
        const materiais = await ctx.db.material.findMany({
          where: { workpackageId },
          orderBy: { nome: "asc" },
        });

        return materiais;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar materiais",
          cause: error,
        });
      }
    }),

  // Atualizar o estado de um material (concluído ou não)
  atualizarEstado: protectedProcedure
    .input(z.number()) // Recebe apenas o ID do material
    .mutation(async ({ ctx, input: materialId }) => {
      // Verificar se o material existe
      const material = await ctx.db.material.findUnique({
        where: {
          id: materialId,
        },
        include: {
          workpackage: true,
        },
      });

      if (!material) {
        throw new Error("Material não encontrado");
      }

      // Atualizar o estado do material para o oposto do estado atual
      const materialAtualizado = await ctx.db.material.update({
        where: {
          id: materialId,
        },
        data: {
          estado: !material.estado, 
        },
      });

      return materialAtualizado;
    }),

  // Listar todos os materiais
  listarTodos: protectedProcedure
    .input(
      z.object({
        projetoId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const materiais = await ctx.db.material.findMany({
        where: {
          workpackage: {
            projetoId: input.projetoId,
          },
        },
        include: {
          workpackage: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
        orderBy: {
          nome: "asc",
        },
      });

      return materiais;
    }),

  // Endpoint para dashboard com filtros avançados
  findAll: protectedProcedure
    .input(
      z.object({
        ano: z.number().optional(),
        projetoId: z.string().optional(),
        estado: z.boolean().optional(),
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Construir condições where baseadas nos filtros
        const where: Prisma.MaterialWhereInput = {};

        // Filtrar por ano se fornecido
        if (input.ano) {
          where.ano_utilizacao = input.ano;
        }

        // Filtrar por estado se fornecido
        if (input.estado !== undefined) {
          where.estado = input.estado;
        }

        // Filtrar por projeto se fornecido
        if (input.projetoId) {
          where.workpackage = {
            projetoId: input.projetoId,
          };
        }

        // Implementar pesquisa por termo
        if (input.searchTerm && input.searchTerm.trim() !== "") {
          const term = input.searchTerm.trim();
          where.OR = [
            { nome: { contains: term, mode: "insensitive" } },
            { descricao: { contains: term, mode: "insensitive" } },
            { workpackage: { nome: { contains: term, mode: "insensitive" } } },
          ];
        }

        // Buscar materiais com filtros aplicados
        const materiais = await ctx.db.material.findMany({
          where,
          include: {
            workpackage: {
              select: {
                id: true,
                nome: true,
                projeto: {
                  select: {
                    id: true,
                    nome: true,
                  },
                },
              },
            },
          },
          orderBy: [{ ano_utilizacao: "desc" }, { nome: "asc" }],
        });

        return materiais;
      } catch (error) {
        console.error("Erro ao buscar materiais:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar materiais",
          cause: error,
        });
      }
    }),
});
