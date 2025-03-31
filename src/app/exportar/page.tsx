"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import ExportarProjetoButton from "@/components/projetos/ExportarProjetoButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExportarPage() {
  const [selectedProjetoId, setSelectedProjetoId] = useState<string | null>(null);

  // Usar o procedimento tRPC findAll com configurações para limitar dados retornados
  const { data, isLoading, error } = api.projeto.findAll.useQuery(
    {
      limit: 100,
    },
    {
      refetchOnWindowFocus: false,
      select: (data) => {
        // Selecionar apenas id e nome para evitar problemas de serialização
        return {
          items: data.items.map((projeto) => ({
            id: projeto.id,
            nome: projeto.nome,
          })),
        };
      },
    }
  );

  const projetos = data?.items || [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg border-gray-100">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-xl text-gray-800 flex items-center">
              <List className="h-5 w-5 text-azul mr-2" />
              Exportar Projeto para Template Excel
            </CardTitle>
            <CardDescription className="text-gray-500 pt-1">
              Selecione um projeto da lista para exportar seus dados para o template padrão.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Seletor de Projeto */}
            <div>
              <label htmlFor="projeto-select" className="block text-sm font-medium text-gray-700 mb-1">
                Selecione o Projeto
              </label>
              {isLoading && (
                <Skeleton className="h-10 w-full" />
              )}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertTriangle className="h-4 w-4" />
                  Erro ao carregar projetos: {error.message}
                </div>
              )}
              {!isLoading && !error && (
                <Select 
                  value={selectedProjetoId ?? ""} 
                  onValueChange={(value) => setSelectedProjetoId(value || null)}
                >
                  <SelectTrigger id="projeto-select" className="w-full">
                    <SelectValue placeholder="Escolha um projeto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projetos.length > 0 ? (
                      projetos.map((projeto) => (
                        <SelectItem key={projeto.id} value={projeto.id}>
                          {projeto.nome}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-projects" disabled>
                        Nenhum projeto encontrado
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Botão de Exportar (condicional) */}
            <div className="flex justify-end pt-4 border-t border-gray-100">
              {selectedProjetoId && (
                <ExportarProjetoButton projetoId={selectedProjetoId} />
              )}
              {!selectedProjetoId && (
                 <Button disabled variant="outline">
                   Selecione um projeto para exportar
                 </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
