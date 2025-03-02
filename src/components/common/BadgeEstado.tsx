import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeProps = {
  status: string;
  label: string;
  variant?: 'projeto' | 'permissao' | 'regime' | 'custom';
  customClassName?: string;
};

export const BadgeEstado = ({ 
  status, 
  label, 
  variant = 'custom',
  customClassName 
}: BadgeProps) => {
  return (
    <Badge className={cn(
      "px-3 py-1 rounded-full text-xs font-medium inline-flex items-center transition-colors duration-300 ease-in-out",
      // Variante de projeto
      variant === 'projeto' && status === "APROVADO" && "bg-emerald-50/70 text-emerald-600 border border-emerald-200 backdrop-blur-sm hover:bg-emerald-100/90 hover:border-emerald-300",
      variant === 'projeto' && status === "ACEITE" && "bg-emerald-50/70 text-emerald-600 border border-emerald-200 backdrop-blur-sm hover:bg-emerald-100/90 hover:border-emerald-300",
      variant === 'projeto' && status === "PENDENTE" && "bg-amber-50/70 text-amber-600 border border-amber-200 backdrop-blur-sm hover:bg-amber-100/90 hover:border-amber-300",
      variant === 'projeto' && status === "RASCUNHO" && "bg-gray-50/70 text-gray-600 border border-gray-200 backdrop-blur-sm hover:bg-gray-100/90 hover:border-gray-300",
      variant === 'projeto' && status === "EM_DESENVOLVIMENTO" && "bg-blue-50/70 text-blue-600 border border-blue-200 backdrop-blur-sm hover:bg-blue-100/90 hover:border-blue-300",
      variant === 'projeto' && status === "CONCLUIDO" && "bg-azul/10 text-azul border border-azul/20 backdrop-blur-sm hover:bg-azul/20 hover:border-azul/30",
      
      // Variante de permissão
      variant === 'permissao' && status === "ADMIN" && "bg-purple-50/70 text-purple-700 border border-purple-200 backdrop-blur-sm hover:bg-purple-100/90 hover:border-purple-300",
      variant === 'permissao' && status === "GESTOR" && "bg-blue-50/70 text-azul border border-blue-200 backdrop-blur-sm hover:bg-blue-100/90 hover:border-blue-300",
      variant === 'permissao' && status === "COMUM" && "bg-gray-50/70 text-gray-600 border border-gray-200 backdrop-blur-sm hover:bg-gray-100/90 hover:border-gray-300",
      
      // Variante de regime
      variant === 'regime' && status === "INTEGRAL" && "bg-green-50/70 text-green-700 border border-green-200 backdrop-blur-sm hover:bg-green-100/90 hover:border-green-300",
      variant === 'regime' && status === "PARCIAL" && "bg-orange-50/70 text-orange-700 border border-orange-200 backdrop-blur-sm hover:bg-orange-100/90 hover:border-orange-300",
      
      // Classe personalizada
      customClassName
    )}>
      {label}
    </Badge>
  );
}; 