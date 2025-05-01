import { createTRPCRouter } from "@/server/api/trpc";

import { utilizadorRouter } from "./routers/utilizadores";
import { projetoRouter } from "./routers/projetos";
import { financiamentoRouter } from "./routers/financiamento";
import { workpackageRouter } from "./routers/workpackages";
import { tarefaRouter } from "./routers/tarefas";
import { entregavelRouter } from "./routers/entregaveis";
import { materialRouter } from "./routers/materiais";
import { dashboardRouter } from "./routers/dashboard";
import { financasRouter } from "./routers/financas";
import { rascunhoRouter } from "./routers/rascunhos";
import { configuracaoRouter } from "./routers/configuracoes";
import { feedbackRouter } from "./routers/feedback";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  utilizador: utilizadorRouter,
  projeto: projetoRouter,
  financiamento: financiamentoRouter,
  feedback: feedbackRouter,
  workpackage: workpackageRouter,
  tarefa: tarefaRouter,
  entregavel: entregavelRouter,
  material: materialRouter,
  dashboard: dashboardRouter,
  financas: financasRouter,
  rascunho: rascunhoRouter,
  configuracao: configuracaoRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

// Adicione esta função para criar um caller
export const createCaller = (context: any) => appRouter.createCaller(context);
