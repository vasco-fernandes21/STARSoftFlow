/*
  Warnings:

  - The primary key for the `alocacoes_recursos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `horasPotenciais` on the `configuracoes_mensais` table. All the data in the column will be lost.
  - You are about to drop the column `horasPotenciais` on the `configuracoes_utilizador_mensais` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[workpackage_id,user_id,mes,ano]` on the table `alocacoes_recursos` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `alocacoes_recursos` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "alocacoes_recursos" DROP CONSTRAINT "alocacoes_recursos_pkey",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "workpackage_id" DROP NOT NULL,
ADD CONSTRAINT "alocacoes_recursos_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "configuracoes_mensais" DROP COLUMN "horasPotenciais";

-- AlterTable
ALTER TABLE "configuracoes_utilizador_mensais" DROP COLUMN "horasPotenciais";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "n_colaborador" INTEGER DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "alocacoes_recursos_workpackage_id_user_id_mes_ano_key" ON "alocacoes_recursos"("workpackage_id", "user_id", "mes", "ano");

-- RenameIndex
ALTER INDEX "alocacoes_recursos_workpackage_id_ano_mes_idx" RENAME TO "AlocacaoRecurso_workpackageId_ano_mes";
