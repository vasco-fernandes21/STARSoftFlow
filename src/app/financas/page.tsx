import { ProjetosFinancasOverview } from "@/components/admin/ProjetosFinancasOverview";

export const metadata = {
  title: "Finanças | StarSoftflow",
  description: "Gestão financeira e controlo orçamental de projetos",
};

export default function FinancasPage() {
  return (
    <div className="h-auto bg-[#F7F9FC] p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Finanças</h1>
            <p className="text-sm text-slate-500">
              Visão geral de despesas, receitas e performance financeira dos projetos
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white shadow-md transition-all duration-200 hover:shadow-lg">
          <ProjetosFinancasOverview />
        </div>
      </div>
    </div>
  );
}
