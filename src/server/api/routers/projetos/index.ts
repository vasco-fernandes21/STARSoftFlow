import { createTRPCRouter } from "../../trpc";
import { coreProjetoRouter } from "./core";
import { estatisticasProjetoRouter } from "./estatisticas";
import { atividadeProjetoRouter } from "./atividade";
export const projetoRouter = createTRPCRouter({
  core: coreProjetoRouter,
  estatisticas: estatisticasProjetoRouter,
  atividade: atividadeProjetoRouter,
});
