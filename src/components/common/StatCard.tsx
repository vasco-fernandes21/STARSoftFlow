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
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", iconContainerClassName)}>
            <Icon className={cn("h-5 w-5", iconClassName)} />
          </div>
          
          {badgeText && (
            <Badge 
              variant="outline" 
              className={cn("text-xs", badgeClassName)}
            >
              {BadgeIcon && <BadgeIcon className="h-3 w-3 mr-1" />}
              {badgeText}
            </Badge>
          )}
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <h2 className="text-2xl font-semibold">
              {value.toLocaleString('pt-PT')}
            </h2>
            {secondaryText && (
              <p className="text-xs text-muted-foreground">{secondaryText}</p>
            )}
            {suffix && !secondaryText && (
              <p className="text-2xl font-semibold">{suffix}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 