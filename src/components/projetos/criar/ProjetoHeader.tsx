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
        className="rounded-full glass-bg hover:bg-white/70 transition-all duration-300 ease-in-out shadow-md hover:shadow-lg hover:scale-105"
      >
        <ArrowLeft className="h-5 w-5 text-gray-600 hover:text-azul transition-colors duration-300 ease-in-out" />
      </Button>
      <PaginaHeader
        title="Novo Projeto"
        subtitle="Preencha as informações do projeto passo a passo"
      />
    </div>
  );
}
