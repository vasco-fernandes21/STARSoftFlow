import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

type StatCardProps = { 
  icon: LucideIcon;
  label: string;
  value: number;
  iconClassName?: string;
  iconContainerClassName?: string;
  suffix?: string;
  badgeText?: string;
  badgeIcon?: LucideIcon;
  badgeClassName?: string;
  secondaryText?: string;
};

export const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  iconClassName, 
  iconContainerClassName,
  suffix,
  badgeText,
  badgeIcon: BadgeIcon = TrendingUp,
  badgeClassName,
  secondaryText
}: StatCardProps) => {
  return (
    <Card className="glass-card border-white/20 shadow-md transition-all duration-300 ease-in-out hover:shadow-lg hover:translate-y-[-1px]">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shadow-sm", iconContainerClassName)}>
            <Icon className={cn("h-4 w-4", iconClassName)} />
          </div>
          
          {badgeText && (
            <Badge 
              variant="outline" 
              className={cn("text-xs font-normal py-0.5 px-2", badgeClassName)}
            >
              {BadgeIcon && <BadgeIcon className="h-2.5 w-2.5 mr-1" />}
              {badgeText}
            </Badge>
          )}
        </div>
        
        <div>
          <p className="text-xs text-slate-500 mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <h2 className="text-3xl font-medium text-slate-800">
              {value.toLocaleString('pt-PT')}
            </h2>
            {secondaryText && (
              <p className="text-xs text-slate-400">{secondaryText}</p>
            )}
            {suffix && !secondaryText && (
              <p className="text-3xl font-medium text-slate-800">{suffix}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}; 