import { createTRPCRouter } from "@/server/api/trpc";
import { coreUtilizadorRouter } from "./core";
import { alocacoesUtilizadorRouter } from "./alocacoes";
import { relatoriosUtilizadorRouter } from "./relatorios";
import { configuracoesUtilizadorRouter } from "./configuracoes";
import { storageUtilizadorRouter } from "./storage";
export * from "./schemas";

export const utilizadorRouter = createTRPCRouter({
  core: coreUtilizadorRouter,
  alocacoes: alocacoesUtilizadorRouter,
  relatorios: relatoriosUtilizadorRouter,
  configuracoes: configuracoesUtilizadorRouter,
  storage: storageUtilizadorRouter,
});
