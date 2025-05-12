import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { ProjetoEstado } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { put, list, del } from '@vercel/blob';
import { BLOB_PATHS } from "@/lib/blob";

// Schemas
export const entregavelBaseSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
  descricao: z.string().optional().nullable(),
  data: z.string().optional().nullable(),
  anexo: z.string().optional().nullable(),
  estado: z.boolean().optional(),
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

// Novo schema para upload de arquivos via tRPC
export const entregavelUploadSchema = z.object({
  id: z.string().uuid("ID do entregável inválido"),
  fileName: z.string(),
  fileType: z.string(),
  base64Data: z.string(),
});

// Types
export type EntregavelCreate = z.infer<typeof entregavelCreateSchema>;
export type EntregavelUpdate = z.infer<typeof entregavelUpdateSchema>;
export type EntregavelAnexo = z.infer<typeof entregavelAnexoSchema>;
export type EntregavelUpload = z.infer<typeof entregavelUploadSchema>;

// Router
export const entregavelRouter = createTRPCRouter({
  // Criar novo entregável
  create: protectedProcedure.input(entregavelCreateSchema).mutation(async ({ ctx, input }) => {
    return ctx.db.entregavel.create({
      data: {
        nome: input.nome,
        descricao: input.descricao,
        data: input.data ? new Date(input.data) : null,
        tarefaId: input.tarefaId,
      },
    });
  }),

  // Atualizar entregável existente
  update: protectedProcedure.input(entregavelUpdateSchema).mutation(async ({ ctx, input }) => {
    try {
      // Verificar se o entregável existe
      const entregavel = await ctx.db.entregavel.findUnique({
        where: { id: input.id },
      });

      if (!entregavel) {
        throw new Error("Entregável não encontrado");
      }

      // Se estado está sendo atualizado e não foi fornecido valor, inverter o atual
      const data = {
        ...input.data,
        estado: input.data.estado !== undefined ? input.data.estado : undefined,
        data: input.data.data ? new Date(input.data.data) : undefined,
      };

      // Atualizar entregável
      return ctx.db.entregavel.update({
        where: { id: input.id },
        data,
      });
    } catch (error) {
      throw new Error(`Erro ao atualizar entregável: ${error}`);
    }
  }),

  // Obter entregável por ID
  findById: protectedProcedure
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

  // Apagar entregável
  delete: protectedProcedure
    .input(z.string().uuid("ID do entregável inválido"))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.entregavel.delete({
        where: { id: input },
      });
    }),

  // Upload de arquivo via tRPC (usando base64)
  uploadFileBase64: protectedProcedure
    .input(entregavelUploadSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Garantir que a entrada é uma string válida
        if (!input.base64Data) {
          throw new Error("Dados de arquivo inválidos");
        }
        
        // Extrair a parte de dados do base64 (remover prefixo como 'data:image/png;base64,')
        let dataString = input.base64Data;
        const hasBase64Prefix = dataString.includes('base64,');
        
        if (hasBase64Prefix) {
          dataString = dataString.split('base64,')[1] || '';
        }
        
        if (!dataString) {
          throw new Error("Dados de arquivo inválidos após processamento");
        }
        
        // Converter base64 para Buffer
        const buffer = Buffer.from(dataString, 'base64');
        
        // Upload do arquivo usando o buffer diretamente (Vercel Blob aceita Buffer)
        const result = await put(
          `${BLOB_PATHS.DELIVERABLE_FILES}/${input.id}/${input.fileName}`, 
          buffer, 
          { 
            access: 'public',
            contentType: input.fileType
          }
        );
        
        // Atualizar o campo anexo do entregável e marcar como concluído
        await ctx.db.entregavel.update({
          where: { id: input.id },
          data: { 
            estado: true 
          },
        });
        
        return { url: result.url };
      } catch (error) {
        console.error('Erro ao fazer upload do arquivo:', error);
        throw new Error(`Erro ao fazer upload do arquivo: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  // Listar todos os anexos de um entregável
  getAnexos: protectedProcedure
    .input(z.string().uuid("ID do entregável inválido"))
    .query(async ({ input }) => {
      try {
        // Listar todos os arquivos no diretório do entregável
        const prefix = `${BLOB_PATHS.DELIVERABLE_FILES}/${input}/`;
        const blobs = await list({ prefix });
        
        // Mapear os resultados para um formato mais amigável
        return blobs.blobs.map(blob => {
          // Extrair o nome do arquivo do caminho completo
          const fileName = blob.pathname.split('/').pop() || 'arquivo';
          
          // Extrair a extensão do arquivo
          const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
          
          // Determinar o tipo de arquivo baseado na extensão
          const fileType = getFileTypeFromExtension(fileExtension);
          
          return {
            url: blob.url,
            fileName,
            fileType,
            fileExtension,
            uploadedAt: blob.uploadedAt,
            size: blob.size
          };
        });
      } catch (error) {
        console.error('Erro ao listar anexos:', error);
        throw new Error(`Erro ao listar anexos: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  // Deletar um anexo específico
  deleteFile: protectedProcedure
    .input(z.object({
      url: z.string().url("URL do anexo inválida"),
      entregavelId: z.string().uuid("ID do entregável inválido")
    }))
    .mutation(async ({ input }) => {
      try {
        // Deletar o arquivo do Vercel Blob
        await del(input.url);
    
        return { success: true };
      } catch (error) {
        console.error('Erro ao deletar anexo:', error);
        throw new Error(`Erro ao deletar anexo: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  // Obter próximos entregáveis e atrasados
  findProximos: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const dataAtual = new Date();
      const userId = ctx.session.user.id;
      // Workaround para o tipo da sessão
      const userPermissao = (ctx.session.user as any).permissao || "COMUM";

      // Base where condition
      let whereCondition: Prisma.EntregavelWhereInput = {
        data: { not: null }, // apenas entregáveis com data definida
        estado: false, // apenas não concluídos
        tarefa: {
          workpackage: {
            projeto: {
              estado: {
                in: [ProjetoEstado.EM_DESENVOLVIMENTO, ProjetoEstado.APROVADO],
              },
            },
          },
        },
      };

      // Se o usuário tem permissão COMUM, filtrar apenas projetos onde ele está alocado
      if (userPermissao === "COMUM") {
        whereCondition = {
          ...whereCondition,
          tarefa: {
            workpackage: {
              AND: [
                {
                  projeto: {
                    estado: {
                      in: [ProjetoEstado.EM_DESENVOLVIMENTO, ProjetoEstado.APROVADO],
                    },
                  },
                },
                {
                  recursos: {
                    some: {
                      userId,
                    },
                  },
                },
              ],
            },
          },
        };
      }

      const entregaveis = await ctx.db.entregavel.findMany({
        where: whereCondition,
        take: input.limit,
        orderBy: {
          data: "asc",
        },
        include: {
          tarefa: {
            include: {
              workpackage: {
                include: {
                  projeto: {
                    include: {
                      responsavel: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Calcular dias restantes para cada entregável
      return entregaveis.map((entregavel) => {
        const diasRestantes = entregavel.data
          ? Math.ceil((entregavel.data.getTime() - dataAtual.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          id: entregavel.id,
          nome: entregavel.nome,
          descricao: entregavel.descricao,
          data: entregavel.data,
          estado: entregavel.estado,
          diasRestantes,
          tarefa: {
            id: entregavel.tarefa.id,
            nome: entregavel.tarefa.nome,
            workpackage: {
              id: entregavel.tarefa.workpackage.id,
              nome: entregavel.tarefa.workpackage.nome,
              projeto: {
                id: entregavel.tarefa.workpackage.projeto.id,
                nome: entregavel.tarefa.workpackage.projeto.nome,
                responsavel: entregavel.tarefa.workpackage.projeto.responsavel,
              },
            },
          },
        };
      });
    }),
});

// Função auxiliar para determinar o tipo de arquivo com base na extensão
function getFileTypeFromExtension(extension: string): string {
  switch (extension) {
    case 'pdf':
      return 'PDF';
    case 'doc':
    case 'docx':
      return 'Word';
    case 'xls':
    case 'xlsx':
      return 'Excel';
    case 'ppt':
    case 'pptx':
      return 'PowerPoint';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'Imagem';
    case 'zip':
    case 'rar':
      return 'Arquivo Compactado';
    case 'txt':
      return 'Texto';
    default:
      return 'Documento';
  }
}
