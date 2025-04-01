"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ProjetoFinanceiro {
  id: string;
  nome: string;
  responsavel: string;
  orcamento: number;
  orcamentoGasto: number;
  percentualGasto: number;
  percentualConcluido: number;
}

interface ProjetoProgressoFinanceiroProps {
  projetos: ProjetoFinanceiro[];
  className?: string;
}

export function ProjetoProgressoFinanceiro({
  projetos,
  className,
}: ProjetoProgressoFinanceiroProps) {
  const router = useRouter();

  if (!projetos || projetos.length === 0) {
    return (
      <Card
        className={cn(
          "glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg",
          className
        )}
      >
        <CardHeader className="border-b border-slate-100/50 px-6 py-4">
          <CardTitle className="font-medium text-slate-800">Progresso Financeiro</CardTitle>
          <CardDescription className="text-slate-500">
            Progresso financeiro dos projetos ativos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <p className="py-8 text-center text-slate-500">Não há projetos ativos no momento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100/50 px-6 py-4">
        <div>
          <CardTitle className="font-medium text-slate-800">Progresso Financeiro</CardTitle>
          <CardDescription className="text-slate-500">
            Progresso financeiro dos projetos ativos
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/projetos")}
          className="text-xs font-normal transition-colors hover:bg-slate-50"
        >
          Ver todos
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100/50">
          {projetos.map((projeto) => (
            <div key={projeto.id} className="p-4 transition-colors hover:bg-slate-50/50">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-normal text-slate-800">{projeto.nome}</p>
                  <p className="text-xs text-slate-500">Responsável: {projeto.responsavel}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 font-normal hover:bg-slate-50"
                  onClick={() => router.push(`/projetos/${projeto.id}`)}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Ver
                </Button>
              </div>

              {/* Progresso físico */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Progresso físico</span>
                  <span className="font-normal text-slate-700">{projeto.percentualConcluido}%</span>
                </div>
                <Progress
                  value={projeto.percentualConcluido}
                  className="h-1.5"
                  indicatorClassName={cn(
                    projeto.percentualConcluido < 30
                      ? "bg-red-500"
                      : projeto.percentualConcluido < 70
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  )}
                />
              </div>

              {/* Progresso financeiro */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Progresso financeiro</span>
                  <span className="font-normal text-slate-700">{projeto.percentualGasto}%</span>
                </div>
                <Progress
                  value={projeto.percentualGasto}
                  className="h-1.5"
                  indicatorClassName={cn(
                    projeto.percentualGasto > 100
                      ? "bg-red-500"
                      : projeto.percentualGasto > 80
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  )}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-normal text-blue-600 hover:bg-blue-100">
                  Orçamento: {projeto.orcamento.toLocaleString("pt-PT")} €
                </Badge>
                <Badge
                  className={cn(
                    "px-2 py-0.5 text-xs font-normal",
                    projeto.percentualGasto > 100
                      ? "border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                      : "border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  )}
                >
                  Gasto: {projeto.orcamentoGasto.toLocaleString("pt-PT")} €
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
