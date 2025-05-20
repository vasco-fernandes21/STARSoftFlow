import { createTRPCRouter } from "@/server/api/trpc";
import { projetoRouter } from "./routers/projetos";
import { financiamentoRouter } from "./routers/financiamento";
import { workpackageRouter } from "./routers/workpackages";
import { tarefaRouter } from "./routers/tarefas";
import { entregavelRouter } from "./routers/entregaveis";
import { materialRouter } from "./routers/materiais";
import { dashboardRouter } from "./routers/dashboard";
import { financasRouter } from "./routers/financas";
import { rascunhoRouter } from "./routers/rascunhos";
import { feedbackRouter } from "./routers/feedback";
import { notificacoesRouter } from "./routers/notificacoes";
import { adminRouter } from "./routers/admin";
import { gestorRouter } from "./routers/gestor";
import { utilizadorRouter } from "./routers/utilizadores";

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
  notificacao: notificacoesRouter,
  admin: adminRouter,
  gestor: gestorRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

// Adicione esta função para criar um caller
export const createCaller = (context: any) => appRouter.createCaller(context);
