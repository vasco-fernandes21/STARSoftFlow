/*
  Warnings:

  - You are about to drop the column `anexo` on the `Entregaveis` table. All the data in the column will be lost.
  - You are about to drop the column `foto` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Entregaveis" DROP COLUMN "anexo";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "foto";
