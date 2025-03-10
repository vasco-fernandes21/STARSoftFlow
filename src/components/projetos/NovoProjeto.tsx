import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function NovoProjeto() {
  const router = useRouter();

  const handleNovoProjeto = () => {
    router.push("/projetos/criar");
  };

  return (
    <Button 
      onClick={handleNovoProjeto}
      className="rounded-full bg-azul hover:bg-azul/90 text-white gap-2 shadow-md hover:shadow-lg transition-all duration-300 ease-in-out hover:scale-105"
    >
      <Plus className="h-4 w-4" />
      Novo Projeto
    </Button>
  );
}
  