"use client";

import { useState, lazy, Suspense } from "react";
import {
  Users,
  FileText,
  Package,
  DollarSign,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { api } from "@/trpc/react";

// Lazy load dos componentes de tab
const CronogramaTab = lazy(() => import("@/components/projetos/tabs/Cronograma"));
const ProjetoFinancas = lazy(() => import("@/components/projetos/tabs/ProjetoFinancas"));
const ProjetoRecursos = lazy(() => import("@/components/projetos/tabs/ProjetoRecursos"));
const ProjetoMateriais = lazy(() => import("@/components/projetos/tabs/ProjetoMateriais"));
const VisaoGeral = lazy(() => import("@/components/projetos/tabs/VisaoGeral"));

export default function AtividadeEconomicaPage() {
  const { data: projeto, isLoading } = api.projeto.getAtividadeEconomica.useQuery();
  const [tab, setTab] = useState("cronograma");

  // Usar diretamente as datas do backend (Date | null)
  const startDate = projeto?.inicio ?? null;
  const endDate = projeto?.fim ?? null;

  if (isLoading) return <div className="p-8 text-center">A carregar...</div>;
  if (!projeto) return <div className="p-8 text-center text-red-600">Atividade económica não encontrada.</div>;

  return (
    <div className="h-full bg-[#F7F9FC] p-8">
      <div className="max-w-8xl mx-auto space-y-4">
        <div className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{projeto.nome}</h1>
          {projeto.descricao && (
            <p className="mt-2 text-base leading-relaxed text-gray-500">{projeto.descricao}</p>
          )}
        </div>
        <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col">
          <div className="w-full">
            <TabsList className="glass-bg inline-flex h-auto rounded-xl border border-white/30 p-1 shadow-md">
              <TabsTrigger value="cronograma" className={cn("flex items-center gap-2 rounded-lg px-4 py-2", tab === "cronograma" ? "text-customBlue" : "text-gray-600")}> <FileText className="h-4 w-4" /> <span>Cronograma</span> </TabsTrigger>
              <TabsTrigger value="overview" className={cn("flex items-center gap-2 rounded-lg px-4 py-2", tab === "overview" ? "text-customBlue" : "text-gray-600")}> <FileText className="h-4 w-4" /> <span>Visão Geral</span> </TabsTrigger>
              <TabsTrigger value="resources" className={cn("flex items-center gap-2 rounded-lg px-4 py-2", tab === "resources" ? "text-customBlue" : "text-gray-600")}> <Users className="h-4 w-4" /> <span>Recursos</span> </TabsTrigger>
              <TabsTrigger value="materials" className={cn("flex items-center gap-2 rounded-lg px-4 py-2", tab === "materials" ? "text-customBlue" : "text-gray-600")}> <Package className="h-4 w-4" /> <span>Materiais</span> </TabsTrigger>
              <TabsTrigger value="finances" className={cn("flex items-center gap-2 rounded-lg px-4 py-2", tab === "finances" ? "text-customBlue" : "text-gray-600")}> <DollarSign className="h-4 w-4" /> <span>Finanças</span> </TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-3 min-h-[calc(100vh-250px)] flex-1">
            <TabsContent value="cronograma">
              <Suspense fallback={<div>A carregar cronograma...</div>}>
                <Card className="glass-card h-full overflow-hidden rounded-2xl border-white/20 shadow-xl">
                  <div className="h-full">
                    <CronogramaTab
                      projeto={projeto}
                      workpackages={projeto.workpackages}
                      startDate={startDate instanceof Date ? startDate : new Date()}
                      endDate={endDate instanceof Date ? endDate : new Date()}
                      projetoId={projeto.id}
                      options={{ leftColumnWidth: 300, disableInteractions: false }}
                    />
                  </div>
                </Card>
              </Suspense>
            </TabsContent>
            <TabsContent value="overview">
              <Suspense fallback={<div>A carregar visão geral...</div>}>
                <VisaoGeral
                  projeto={{
                    ...projeto,
                    financiamento: projeto.financiamento
                      ? { nome: projeto.financiamento.nome }
                      : null,
                    valor_eti: projeto.valor_eti ? projeto.valor_eti.toString() : null,
                  }}
                />
              </Suspense>
            </TabsContent>
            <TabsContent value="resources">
              <Suspense fallback={<div>A carregar recursos...</div>}>
                <ProjetoRecursos projetoId={projeto.id} />
              </Suspense>
            </TabsContent>
            <TabsContent value="materials">
              <Suspense fallback={<div>A carregar materiais...</div>}>
                <ProjetoMateriais projetoId={projeto.id} />
              </Suspense>
            </TabsContent>
            <TabsContent value="finances">
              <Suspense fallback={<div>A carregar finanças...</div>}>
                <ProjetoFinancas projetoId={projeto.id} />
              </Suspense>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}