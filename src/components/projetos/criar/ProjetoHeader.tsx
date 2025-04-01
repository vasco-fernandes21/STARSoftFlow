import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PaginaHeader } from "@/components/common/PaginaHeader";
import { useRouter } from "next/navigation";

export function ProjetoHeader() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.back()}
        className="glass-bg rounded-full shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-white/70 hover:shadow-lg"
      >
        <ArrowLeft className="h-5 w-5 text-gray-600 transition-colors duration-300 ease-in-out hover:text-azul" />
      </Button>
      <PaginaHeader
        title="Novo Projeto"
        subtitle="Preencha as informações do projeto passo a passo"
      />
    </div>
  );
}
