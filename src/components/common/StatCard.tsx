import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import CountUp from 'react-countup';

type StatCardProps = { 
  icon: LucideIcon, 
  label: string, 
  value: number, 
  iconClassName?: string,
  iconContainerClassName?: string,
  duration?: number
};

export const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  iconClassName, 
  iconContainerClassName,
  duration
}: StatCardProps) => {
  // Calcula a duração baseada no valor se não for fornecida
  const calculatedDuration = duration || value / 10;

  return (
    <Card className="glass-card border-white/20 shadow-xl transition-all duration-300 ease-in-out hover:shadow-2xl hover:translate-y-[-2px]">
      <div className="p-5 flex items-center gap-4">
        <div className={cn("h-10 w-10 rounded-full backdrop-blur-sm flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300", iconContainerClassName)}>
          <Icon className={cn("h-5 w-5", iconClassName)} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-semibold">
            <CountUp 
              end={value} 
              duration={calculatedDuration}
              separator="." 
              decimal="," 
              enableScrollSpy 
              scrollSpyOnce
              useEasing={false}
            />
          </p>
        </div>
      </div>
    </Card>
  );
}; 