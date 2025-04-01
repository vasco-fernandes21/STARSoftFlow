import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeProps = {
  status: string;
  label: string;
  variant?: "projeto" | "permissao" | "regime" | "prazo" | "custom";
  customClassName?: string;
};

export const BadgeEstado = ({ status, label, variant = "custom", customClassName }: BadgeProps) => {
  return (
    <Badge
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors duration-300 ease-in-out",
        // Variante de projeto
        variant === "projeto" &&
          status === "APROVADO" &&
          "border border-emerald-200 bg-emerald-50/70 text-emerald-600 backdrop-blur-sm hover:border-emerald-300 hover:bg-emerald-100",
        variant === "projeto" &&
          status === "ACEITE" &&
          "border border-emerald-200 bg-emerald-50/70 text-emerald-600 backdrop-blur-sm hover:border-emerald-300 hover:bg-emerald-100",
        variant === "projeto" &&
          status === "PENDENTE" &&
          "border border-amber-200 bg-amber-50/70 text-amber-600 backdrop-blur-sm hover:border-amber-300 hover:bg-amber-100",
        variant === "projeto" &&
          status === "RASCUNHO" &&
          "border border-gray-200 bg-gray-50/70 text-gray-600 backdrop-blur-sm hover:border-gray-300 hover:bg-gray-100",
        variant === "projeto" &&
          status === "EM_DESENVOLVIMENTO" &&
          "border border-blue-200 bg-blue-50/70 text-blue-600 backdrop-blur-sm hover:border-blue-300 hover:bg-blue-100",
        variant === "projeto" &&
          status === "CONCLUIDO" &&
          "border border-azul/20 bg-azul/10 text-azul backdrop-blur-sm hover:border-azul/30 hover:bg-azul/20",

        // Variante de permissão
        variant === "permissao" &&
          status === "ADMIN" &&
          "border border-purple-200 bg-purple-50/70 text-purple-700 backdrop-blur-sm hover:border-purple-300 hover:bg-purple-100",
        variant === "permissao" &&
          status === "GESTOR" &&
          "border border-blue-200 bg-blue-50/70 text-azul backdrop-blur-sm hover:border-blue-300 hover:bg-blue-100",
        variant === "permissao" &&
          status === "COMUM" &&
          "border border-gray-200 bg-gray-50/70 text-gray-600 backdrop-blur-sm hover:border-gray-300 hover:bg-gray-100",

        // Variante de regime
        variant === "regime" &&
          status === "INTEGRAL" &&
          "border border-green-200 bg-green-50/70 text-green-700 backdrop-blur-sm hover:border-green-300 hover:bg-green-100",
        variant === "regime" &&
          status === "PARCIAL" &&
          "border border-orange-200 bg-orange-50/70 text-orange-700 backdrop-blur-sm hover:border-orange-300 hover:bg-orange-100",

        // Variante de prazo
        variant === "prazo" &&
          status === "ESTE_MES" &&
          "border border-green-200 bg-green-50/70 text-green-600 backdrop-blur-sm hover:border-green-300 hover:bg-green-100",
        variant === "prazo" &&
          status === "PROXIMO_MES" &&
          "border border-blue-200 bg-blue-50/70 text-blue-600 backdrop-blur-sm hover:border-blue-300 hover:bg-blue-100",
        variant === "prazo" &&
          status === "ESTE_ANO" &&
          "border border-purple-200 bg-purple-50/70 text-purple-600 backdrop-blur-sm hover:border-purple-300 hover:bg-purple-100",
        variant === "prazo" &&
          status === "ATRASADO" &&
          "border border-red-200 bg-red-50/70 text-red-600 backdrop-blur-sm hover:border-red-300 hover:bg-red-100",

        // Classe personalizada
        customClassName
      )}
    >
      {label}
    </Badge>
  );
};
