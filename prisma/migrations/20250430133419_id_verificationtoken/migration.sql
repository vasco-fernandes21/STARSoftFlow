/*
  Warnings:

  - The required column `id` was added to the `verificationtokens` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "verificationtokens" ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "verificationtokens_pkey" PRIMARY KEY ("id");
