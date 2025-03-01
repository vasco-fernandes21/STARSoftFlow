-- CreateEnum
CREATE TYPE "ProjetoEstado" AS ENUM ('RASCUNHO', 'PENDENTE', 'ACEITE', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "Permissao" AS ENUM ('ADMIN', 'GESTOR', 'COMUM');

-- CreateEnum
CREATE TYPE "Regime" AS ENUM ('PARCIAL', 'INTEGRAL');

-- CreateTable
CREATE TABLE "Projetos" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "inicio" DATE,
    "fim" DATE,
    "estado" "ProjetoEstado" NOT NULL DEFAULT 'RASCUNHO',
    "tipo_financiamento_id" INTEGER,
    "detalhes_financiamento" JSONB,

    CONSTRAINT "Projetos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TiposFinanciamento" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "campos" JSONB,

    CONSTRAINT "TiposFinanciamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workpackages" (
    "id" UUID NOT NULL,
    "projeto_id" UUID NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "inicio" DATE,
    "fim" DATE,
    "estado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Workpackages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarefas" (
    "id" UUID NOT NULL,
    "workpackage_id" UUID NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "inicio" DATE,
    "fim" DATE,
    "estado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Materiais" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "workpackage_id" UUID,

    CONSTRAINT "Materiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255),
    "email" VARCHAR(255),
    "emailVerified" TIMESTAMP(3),
    "foto" TEXT,
    "atividade" VARCHAR(255),
    "contratacao" DATE,
    "username" VARCHAR(255),
    "permissao" "Permissao" NOT NULL DEFAULT 'COMUM',
    "regime" "Regime" NOT NULL DEFAULT 'INTEGRAL',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarefaUser" (
    "tarefa_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "ocupacao" DECIMAL(2,1) NOT NULL,

    CONSTRAINT "TarefaUser_pkey" PRIMARY KEY ("tarefa_id","user_id","mes","ano")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verificationtokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TiposFinanciamento_nome_key" ON "TiposFinanciamento"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_token_key" ON "verificationtokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_identifier_token_key" ON "verificationtokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- AddForeignKey
ALTER TABLE "Projetos" ADD CONSTRAINT "Projetos_tipo_financiamento_id_fkey" FOREIGN KEY ("tipo_financiamento_id") REFERENCES "TiposFinanciamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workpackages" ADD CONSTRAINT "Workpackages_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "Projetos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefas" ADD CONSTRAINT "Tarefas_workpackage_id_fkey" FOREIGN KEY ("workpackage_id") REFERENCES "Workpackages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materiais" ADD CONSTRAINT "Materiais_workpackage_id_fkey" FOREIGN KEY ("workpackage_id") REFERENCES "Workpackages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaUser" ADD CONSTRAINT "TarefaUser_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "Tarefas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarefaUser" ADD CONSTRAINT "TarefaUser_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
