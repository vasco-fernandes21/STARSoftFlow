"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Folder, BarChart, LineChart, TrendingUp, AlertCircle } from "lucide-react";
import OverviewTab from "./projeto-financas/OverviewTab";
import OrcamentoRealTab from "./projeto-financas/OrcamentoRealTab";
import OrcamentoSubmetidoTab from "./projeto-financas/OrcamentoSubmetidoTab";
import FolgaTab from "./projeto-financas/FolgaTab";

interface ProjetoFinancasProps {
  projetoId: string;
}

export function ProjetoFinancas({ projetoId }: ProjetoFinancasProps) {
  const [selectedYear, setSelectedYear] = useState<string>("todos");
  
  if (!projetoId) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex w-full max-w-md items-center gap-3 rounded-lg bg-amber-50 p-6 text-amber-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <h3 className="mb-1 font-medium">ID do projeto não fornecido</h3>
            <p className="text-sm text-amber-700/80">É necessário fornecer um ID de projeto válido.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Gestão Financeira</h1>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <div className="border-b">
          <TabsList className="flex h-12 w-full justify-start gap-6 rounded-none bg-transparent p-0">
            <TabsTrigger 
              value="overview" 
              className="flex h-12 items-center gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 py-0 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              <Folder className="h-4 w-4" />
              <span>Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger 
              value="orcamento-submetido" 
              className="flex h-12 items-center gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 py-0 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              <BarChart className="h-4 w-4" />
              <span>Orçamento Submetido</span>
            </TabsTrigger>
            <TabsTrigger 
              value="orcamento-real" 
              className="flex h-12 items-center gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 py-0 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              <LineChart className="h-4 w-4" />
              <span>Orçamento Real</span>
            </TabsTrigger>
            <TabsTrigger 
              value="folga" 
              className="flex h-12 items-center gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 py-0 font-medium text-gray-500 hover:text-gray-700 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Folga</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="pt-6">
          <TabsContent value="overview" className="mt-0">
            <OverviewTab 
              projetoId={projetoId} 
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
            />
          </TabsContent>

          <TabsContent value="orcamento-submetido" className="mt-0">
            <OrcamentoSubmetidoTab
              projetoId={projetoId}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
            />
          </TabsContent>

          <TabsContent value="orcamento-real" className="mt-0">
            <OrcamentoRealTab
              projetoId={projetoId}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
            />
          </TabsContent>

          <TabsContent value="folga" className="mt-0">
            <FolgaTab
              projetoId={projetoId} 
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default ProjetoFinancas; 