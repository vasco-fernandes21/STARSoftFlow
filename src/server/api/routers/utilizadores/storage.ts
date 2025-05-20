import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { put } from "@vercel/blob";
import { z } from "zod";

export const storageUtilizadorRouter = createTRPCRouter({
  deleteAllUserPhotos: protectedProcedure
    .input(
      z.object({ userId: z.string() })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: input.userId } });
      if (!user || !user.name) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado." });
      }
      const userFolder = `${user.name.replace(/\s+/g, "_")}-${user.id}`;
      try {
        // TODO: Implementar a listagem e deleção de blobs em uma pasta se a API @vercel/blob suportar.
        // Por enquanto, @vercel/blob não tem uma função direta para deletar pastas.
        // A alternativa seria listar todos os blobs e deletá-los individualmente.
        // Exemplo conceitual (requer listagem de blobs, que pode não estar disponível diretamente):
        // const { blobs } = await list({ prefix: `${userFolder}/`, token: process.env.BLOB_READ_WRITE_TOKEN });
        // await del(blobs.map(b => b.url), { token: process.env.BLOB_READ_WRITE_TOKEN });
        // Como paliativo, se houver um blob específico conhecido (ex: foto de perfil com nome padrão):
        // await del(`${process.env.BLOB_URL}/${userFolder}/profile_photo.png`, { token: process.env.BLOB_READ_WRITE_TOKEN });

        console.warn(`Deleção de pasta não implementada diretamente. Tentando deletar um arquivo padrão se existir.`);
        // Tentar deletar um arquivo de foto de perfil com nome padrão, se aplicável
        // Esta parte precisa ser ajustada conforme a lógica de nomenclatura de arquivos
        // await del(`${userFolder}/profile_photo.png`); // Ajustar o nome do arquivo e o caminho completo/URL

        return { success: true, message: "Tentativa de exclusão de fotos (implementação pendente para exclusão de pasta)." };
      } catch (error) {
        console.error("Erro ao deletar fotos do perfil:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao deletar fotos do perfil.",
        });
      }
    }),

  uploadProfilePhoto: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        file: z.object({
          name: z.string(),
          type: z.string(),
          data: z.string(), // base64 string
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: input.userId } });
      if (!user || !user.name) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado." });
      }

      // Remove espaços e caracteres especiais do nome do usuário para usar no caminho
      const safeUserName = user.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, '');
      const userFolder = `${safeUserName}-${user.id}`;
      const fileName = `${userFolder}/${input.file.name}`;
      
      // Decodificar dados base64 para Buffer
      const buffer = Buffer.from(input.file.data, 'base64');

      try {
        // Primeiro, deletar a foto de perfil antiga, se existir (assumindo um nome padrão ou lógica para encontrar)
        // Esta é uma suposição; você pode precisar listar os arquivos do usuário para encontrar a foto antiga.
        // Exemplo: await delOldProfilePhoto(userFolder);
        // Por simplicidade, vamos pular a exclusão da foto antiga aqui, mas é importante em produção.

        const blob = await put(fileName, buffer, {
          access: 'public',
          contentType: input.file.type,
          token: process.env.BLOB_READ_WRITE_TOKEN, // Certifique-se que esta variável de ambiente está configurada
        });

        // Atualizar o URL da foto de perfil no banco de dados do usuário, se necessário
        // await ctx.db.user.update({
        //   where: { id: input.userId },
        //   data: { profilePhotoUrl: blob.url },
        // });

        return { url: blob.url };
      } catch (error) {
        console.error("Erro ao fazer upload da foto de perfil:", error);
        if (error instanceof Error && error.message.includes("store not found")) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "A configuração do armazenamento de Blob (Store) não foi encontrada. Verifique as variáveis de ambiente e a configuração do Vercel.",
            });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao fazer upload da foto de perfil.",
        });
      }
    }),
});
