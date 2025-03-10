import { createTRPCRouter } from "./trpc";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";

import { utilizadorRouter } from "./routers/utilizadores";
import { projetoRouter } from "./routers/projetos";
import { workpackageRouter } from "./routers/workpackages";
import { tarefaRouter } from "./routers/tarefas";
import { authRouter } from "./routers/auth";
import { entregavelRouter } from "./routers/entregaveis";
import { materialRouter } from "./routers/materiais";
import { financiamentoRouter } from "./routers/financiamento";
/**
 * Este é o router principal da API.
 * Todos os sub-routers devem ser adicionados aqui.
 */
export const appRouter = createTRPCRouter({
  utilizador: utilizadorRouter,
  projeto: projetoRouter,
  workpackage: workpackageRouter,
  tarefa: tarefaRouter,
  auth: authRouter,
  entregavel: entregavelRouter,
  material: materialRouter,
  financiamento: financiamentoRouter,
});

// Tipos de exportação para uso no cliente
export type AppRouter = typeof appRouter;

// Adicione esta função para criar um caller
export const createCaller = (context: any) => appRouter.createCaller(context);
