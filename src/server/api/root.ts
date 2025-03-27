import { createTRPCRouter } from "./trpc";

import { utilizadorRouter } from "./routers/utilizadores";
import { projetoRouter } from "./routers/projetos";
import { workpackageRouter } from "./routers/workpackages";
import { tarefaRouter } from "./routers/tarefas";
import { entregavelRouter } from "./routers/entregaveis";
import { materialRouter } from "./routers/materiais";
import { financiamentoRouter } from "./routers/financiamento";
import { dashboardRouter } from "./routers/dashboard";
/**
 * Este é o router principal da API.
 * Todos os sub-routers devem ser adicionados aqui.
 */
export const appRouter = createTRPCRouter({
  utilizador: utilizadorRouter,
  projeto: projetoRouter,
  workpackage: workpackageRouter,
  tarefa: tarefaRouter,
  entregavel: entregavelRouter,
  material: materialRouter,
  financiamento: financiamentoRouter,
  dashboard: dashboardRouter,
});

// Tipos de exportação para uso no cliente
export type AppRouter = typeof appRouter;

// Adicione esta função para criar um caller
export const createCaller = (context: any) => appRouter.createCaller(context);
