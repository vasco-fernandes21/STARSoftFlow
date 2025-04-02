import { cn } from "@/lib/utils";

type BarraProgressoProps = {
  value: number;
  showLabel?: boolean;
  className?: string;
};

export const BarraProgresso = ({ value, showLabel = true, className }: BarraProgressoProps) => {
  // Convert the value to proper percentage
  const percentage = value / 100;
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200/60 shadow-inner">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-in-out",
            percentage <= 30
              ? "bg-gradient-to-r from-red-600 to-red-500"
              : percentage <= 60
                ? "bg-gradient-to-r from-amber-600 to-amber-500"
                : "bg-gradient-to-r from-emerald-600 to-emerald-500"
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showLabel && <span className="text-gray-600">{percentage}%</span>}
    </div>
  );
};
