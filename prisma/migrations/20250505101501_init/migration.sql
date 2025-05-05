-- CreateEnum
CREATE TYPE "ProjetoEstado" AS ENUM ('RASCUNHO', 'PENDENTE', 'APROVADO', 'EM_DESENVOLVIMENTO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "Permissao" AS ENUM ('ADMIN', 'GESTOR', 'COMUM');

-- CreateEnum
CREATE TYPE "Regime" AS ENUM ('PARCIAL', 'INTEGRAL');

-- CreateEnum
CREATE TYPE "Rubrica" AS ENUM ('MATERIAIS', 'SERVICOS_TERCEIROS', 'OUTROS_SERVICOS', 'DESLOCACAO_ESTADAS', 'OUTROS_CUSTOS', 'CUSTOS_ESTRUTURA', 'INSTRUMENTOS_E_EQUIPAMENTOS', 'SUBCONTRATOS');

-- CreateEnum
CREATE TYPE "ProjetoTipo" AS ENUM ('STANDARD', 'ATIVIDADE_ECONOMICA');

-- CreateEnum
CREATE TYPE "FeedbackEstado" AS ENUM ('PENDENTE', 'RESOLVIDO');

-- CreateEnum
CREATE TYPE "EntidadeNotificacao" AS ENUM ('PROJETO', 'WORKPACKAGE', 'ENTREGAVEL', 'TAREFA', 'ALOCACAO', 'SISTEMA');

-- CreateEnum
CREATE TYPE "UrgenciaNotificacao" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "EstadoNotificacao" AS ENUM ('NAO_LIDA', 'LIDA', 'ARQUIVADA');

-- CreateTable
CREATE TABLE "Projetos" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "inicio" DATE,
    "fim" DATE,
    "estado" "ProjetoEstado" NOT NULL DEFAULT 'PENDENTE',
    "overhead" DECIMAL(5,2) DEFAULT 0,
    "taxa_financiamento" DECIMAL(5,2) DEFAULT 0,
    "valor_eti" DECIMAL(10,2) DEFAULT 0,
    "financiamento_id" INTEGER,
    "responsavel_id" TEXT,
    "aprovado" JSONB,
    "tipo" "ProjetoTipo" NOT NULL DEFAULT 'STANDARD',

    CONSTRAINT "Projetos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Financiamentos" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "overhead" DECIMAL(5,2) NOT NULL,
    "taxa_financiamento" DECIMAL(5,2) NOT NULL,
    "valor_eti" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "Financiamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workpackages" (
    "id" UUID NOT NULL,
    "projeto_id" UUID NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
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
    "descricao" TEXT,
    "inicio" DATE,
    "fim" DATE,
    "estado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entregaveis" (
    "id" UUID NOT NULL,
    "tarefa_id" UUID NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "data" DATE,
    "anexo" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Entregaveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Materiais" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "ano_utilizacao" INTEGER NOT NULL,
    "mes" INTEGER DEFAULT 1,
    "quantidade" INTEGER NOT NULL,
    "rubrica" "Rubrica" NOT NULL DEFAULT 'MATERIAIS',
    "workpackage_id" UUID,
    "descricao" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT false,

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
    "regime" "Regime" DEFAULT 'INTEGRAL',
    "informacoes" TEXT,
    "contratado" BOOLEAN NOT NULL DEFAULT false,
    "salario" DECIMAL(10,2) DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "alocacoes_recursos" (
    "workpackage_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "ocupacao" DECIMAL(4,3) NOT NULL,

    CONSTRAINT "alocacoes_recursos_pkey" PRIMARY KEY ("workpackage_id","user_id","mes","ano")
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
    "expires" TIMESTAMP(3) NOT NULL,
    "id" UUID NOT NULL,

    CONSTRAINT "verificationtokens_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "passwords" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "passwords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rascunhos" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "conteudo" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rascunhos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "estado" "FeedbackEstado" NOT NULL DEFAULT 'PENDENTE',
    "imagem_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "entidade" "EntidadeNotificacao" NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "urgencia" "UrgenciaNotificacao" NOT NULL,
    "estado" "EstadoNotificacao" NOT NULL DEFAULT 'NAO_LIDA',
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "destinatarioId" TEXT NOT NULL,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Financiamentos_nome_key" ON "Financiamentos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_mensais_mes_ano_key" ON "configuracoes_mensais"("mes", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_utilizador_mensais_user_id_mes_ano_key" ON "configuracoes_utilizador_mensais"("user_id", "mes", "ano");

-- CreateIndex
CREATE INDEX "alocacoes_recursos_user_id_ano_mes_idx" ON "alocacoes_recursos"("user_id", "ano", "mes");

-- CreateIndex
CREATE INDEX "alocacoes_recursos_workpackage_id_ano_mes_idx" ON "alocacoes_recursos"("workpackage_id", "ano", "mes");

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

-- CreateIndex
CREATE UNIQUE INDEX "passwords_userId_key" ON "passwords"("userId");

-- CreateIndex
CREATE INDEX "Notificacao_destinatarioId_idx" ON "Notificacao"("destinatarioId");

-- CreateIndex
CREATE INDEX "Notificacao_estado_idx" ON "Notificacao"("estado");

-- CreateIndex
CREATE INDEX "Notificacao_urgencia_idx" ON "Notificacao"("urgencia");

-- CreateIndex
CREATE INDEX "Notificacao_entidade_idx" ON "Notificacao"("entidade");

-- CreateIndex
CREATE INDEX "Notificacao_dataEmissao_idx" ON "Notificacao"("dataEmissao");

-- AddForeignKey
ALTER TABLE "Projetos" ADD CONSTRAINT "Projetos_financiamento_id_fkey" FOREIGN KEY ("financiamento_id") REFERENCES "Financiamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projetos" ADD CONSTRAINT "Projetos_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workpackages" ADD CONSTRAINT "Workpackages_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "Projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefas" ADD CONSTRAINT "Tarefas_workpackage_id_fkey" FOREIGN KEY ("workpackage_id") REFERENCES "Workpackages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entregaveis" ADD CONSTRAINT "Entregaveis_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "Tarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materiais" ADD CONSTRAINT "Materiais_workpackage_id_fkey" FOREIGN KEY ("workpackage_id") REFERENCES "Workpackages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracoes_utilizador_mensais" ADD CONSTRAINT "configuracoes_utilizador_mensais_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes_recursos" ADD CONSTRAINT "alocacoes_recursos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alocacoes_recursos" ADD CONSTRAINT "alocacoes_recursos_workpackage_id_fkey" FOREIGN KEY ("workpackage_id") REFERENCES "Workpackages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passwords" ADD CONSTRAINT "passwords_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rascunhos" ADD CONSTRAINT "rascunhos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
