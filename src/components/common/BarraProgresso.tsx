import { cn } from "@/lib/utils";

type BarraProgressoProps = {
  value: number;
  showLabel?: boolean;
  className?: string;
};

export const BarraProgresso = ({ 
  value, 
  showLabel = true,
  className 
}: BarraProgressoProps) => {
  // Garantir que o valor está entre 0 e 100
  const safeValue = Math.max(0, Math.min(100, value || 0));
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="w-24 h-2 bg-gray-200/60 rounded-full overflow-hidden shadow-inner">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-in-out",
            safeValue <= 30 ? "bg-gradient-to-r from-red-600 to-red-500" :
            safeValue <= 60 ? "bg-gradient-to-r from-amber-600 to-amber-500" :
            "bg-gradient-to-r from-emerald-600 to-emerald-500"
          )}
          style={{ width: `${safeValue}%` }}
        />
      </div>
      {showLabel && <span className="text-gray-600">{safeValue}%</span>}
    </div>
  );
}; 