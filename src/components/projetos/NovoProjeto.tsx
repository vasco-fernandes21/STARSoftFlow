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
      className="gap-2 rounded-full bg-azul text-white shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-azul/90 hover:shadow-lg"
    >
      <Plus className="h-4 w-4" />
      Novo Projeto
    </Button>
  );
}
