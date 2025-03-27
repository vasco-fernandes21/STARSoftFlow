import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = { 
  icon: LucideIcon, 
  label: string, 
  value: number, 
  iconClassName?: string,
  iconContainerClassName?: string
};

export const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  iconClassName, 
  iconContainerClassName
}: StatCardProps) => {
  return (
    <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg hover:translate-y-[-1px]">
      <div className="p-5 flex items-center gap-4">
        <div className={cn("h-10 w-10 rounded-full backdrop-blur-sm flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-300", iconContainerClassName)}>
          <Icon className={cn("h-5 w-5", iconClassName)} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-semibold">
            {value.toLocaleString('pt-PT')}
          </p>
        </div>
      </div>
    </Card>
  );
}; 