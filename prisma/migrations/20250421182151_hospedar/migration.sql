-- CreateEnum
CREATE TYPE "ProjetoTipo" AS ENUM ('STANDARD', 'ATIVIDADE_ECONOMICA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Rubrica" ADD VALUE 'INSTRUMENTOS_E_EQUIPAMENTOS';
ALTER TYPE "Rubrica" ADD VALUE 'SUBCONTRATOS';

-- AlterTable
ALTER TABLE "Materiais" ADD COLUMN     "mes" INTEGER DEFAULT 1;

-- AlterTable
ALTER TABLE "Projetos" ADD COLUMN     "aprovado" JSONB,
ADD COLUMN     "tipo" "ProjetoTipo" NOT NULL DEFAULT 'STANDARD',
ALTER COLUMN "estado" SET DEFAULT 'PENDENTE';

-- CreateTable
CREATE TABLE "configuracoes_mensais" (
    "id" UUID NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "diasUteis" INTEGER NOT NULL,
    "horasPotenciais" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_mensais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes_utilizador_mensais" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "diasUteis" INTEGER NOT NULL,
    "horasPotenciais" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_utilizador_mensais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_mensais_mes_ano_key" ON "configuracoes_mensais"("mes", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_utilizador_mensais_user_id_mes_ano_key" ON "configuracoes_utilizador_mensais"("user_id", "mes", "ano");

-- AddForeignKey
ALTER TABLE "configuracoes_utilizador_mensais" ADD CONSTRAINT "configuracoes_utilizador_mensais_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
