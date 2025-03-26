-- AlterTable
ALTER TABLE "Materiais" ADD COLUMN     "descricao" TEXT;

-- AlterTable
ALTER TABLE "Projetos" ADD COLUMN     "responsavel_id" TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "salario" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Projetos" ADD CONSTRAINT "Projetos_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
