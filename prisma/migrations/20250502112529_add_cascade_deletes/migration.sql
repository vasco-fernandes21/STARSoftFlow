-- DropForeignKey
ALTER TABLE "Materiais" DROP CONSTRAINT "Materiais_workpackage_id_fkey";

-- DropForeignKey
ALTER TABLE "Tarefas" DROP CONSTRAINT "Tarefas_workpackage_id_fkey";

-- DropForeignKey
ALTER TABLE "Workpackages" DROP CONSTRAINT "Workpackages_projeto_id_fkey";

-- DropForeignKey
ALTER TABLE "alocacoes_recursos" DROP CONSTRAINT "alocacoes_recursos_user_id_fkey";

-- DropForeignKey
ALTER TABLE "alocacoes_recursos" DROP CONSTRAINT "alocacoes_recursos_workpackage_id_fkey";

-- AddForeignKey
ALTER TABLE "Workpackages" ADD CONSTRAINT "Workpackages_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "Projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefas" ADD CONSTRAINT "Tarefas_workpackage_id_fkey" FOREIGN KEY ("workpackage_id") REFERENCES "Workpackages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materiais" ADD CONSTRAINT "Materiais_workpackage_id_fkey" FOREIGN KEY ("workpackage_id") REFERENCES "Workpackages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes_recursos" ADD CONSTRAINT "alocacoes_recursos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes_recursos" ADD CONSTRAINT "alocacoes_recursos_workpackage_id_fkey" FOREIGN KEY ("workpackage_id") REFERENCES "Workpackages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
