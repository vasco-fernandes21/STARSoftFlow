import { ProjetosFinancasOverview } from "@/components/admin/ProjetosFinancasOverview";
import { Button } from "@/components/ui/button";
import { Euro, ChevronLeft } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Finanças | StarSoftflow",
  description: "Gestão financeira e controlo orçamental de projetos",
};

export default function FinancasPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-slate-700"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Euro className="h-6 w-6 text-azul" />
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Gestão Financeira</h1>
                <p className="text-sm text-slate-500">
                  Visão geral de despesas, receitas e performance financeira dos projetos
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50">
          <ProjetosFinancasOverview />
        </div>
      </div>
    </div>
  );
}
