import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, CheckCircle2, Clock } from "lucide-react";

interface StatusCount {
  completed: number;
  pending: number;
  completedLabel?: string;
  pendingLabel?: string;
}

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: number | string;
  iconClassName?: string;
  iconContainerClassName?: string;
  suffix?: string;
  badgeText?: string;
  badgeIcon?: LucideIcon;
  badgeClassName?: string;
  secondaryText?: string;
  trend?: number;
  statusCount?: StatusCount;
  centerContent?: boolean;
  hover?: boolean;
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
  secondaryText,
  trend,
  statusCount,
  centerContent = false,
  hover = false,
}: StatCardProps) => {
  // helper to format trend percentage
  const formatTrend = (trend: number) => {
    const isPositive = trend > 0;
    return `${isPositive ? "+" : ""}${trend}%`;
  };

  if (centerContent) {
    return (
      <Card
        className={cn(
          "flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-4 shadow-md",
          hover && "transition-all hover:scale-105 hover:shadow-lg"
        )}
      >
        <div className={cn("mb-2 rounded-full bg-azul/10 p-2 text-azul", iconContainerClassName)}>
          <Icon className={cn("h-6 w-6", iconClassName)} />
        </div>
        <span className="text-2xl font-bold text-gray-900">
          {typeof value === "number" ? value.toLocaleString("pt-PT") : value}
          {suffix && <span className="ml-1 text-gray-600">{suffix}</span>}
        </span>
        <span className="text-xs text-gray-500">{label}</span>

        {secondaryText && <p className="mt-1 text-xs text-gray-400">{secondaryText}</p>}

        {badgeText && (
          <Badge
            variant="outline"
            className={cn("mt-2 bg-white px-2 py-0.5 text-xs font-medium", badgeClassName)}
          >
            {BadgeIcon && <BadgeIcon className="mr-1 h-3 w-3" />}
            {badgeText}
          </Badge>
        )}
      </Card>
    );
  }

  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition-all duration-200 hover:shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <CardContent className="relative space-y-2.5 p-4">
        {/* Header with Icon and Badge */}
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg bg-azul/10 shadow-sm transition-transform duration-200 group-hover:scale-110",
              iconContainerClassName
            )}
          >
            <Icon className={cn("h-4 w-4 text-azul", iconClassName)} />
          </div>

          {badgeText && (
            <Badge
              variant="outline"
              className={cn(
                "bg-white px-2 py-0.5 text-xs font-medium shadow-sm transition-transform duration-200 group-hover:translate-y-0.5",
                badgeClassName
              )}
            >
              {BadgeIcon && <BadgeIcon className="mr-1 h-3 w-3" />}
              {badgeText}
            </Badge>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-0.5">
          <p className="text-sm text-gray-500">{label}</p>

          <div className="space-y-0.5">
            <h2 className="text-xl font-medium tracking-tight text-gray-900">
              {typeof value === "number" ? value.toLocaleString("pt-PT") : value}
              {suffix && <span className="ml-1 text-gray-600">{suffix}</span>}
            </h2>

            {secondaryText && <p className="text-xs text-gray-400">{secondaryText}</p>}
          </div>

          {/* Status Counters */}
          {statusCount && (
            <div className="mt-1 flex gap-3">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs">
                  <span className="text-gray-700">{statusCount.completed}</span>
                  {statusCount.completedLabel && (
                    <span className="ml-1 text-gray-400">{statusCount.completedLabel}</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs">
                  <span className="text-gray-700">{statusCount.pending}</span>
                  {statusCount.pendingLabel && (
                    <span className="ml-1 text-gray-400">{statusCount.pendingLabel}</span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Trend Indicator */}
          {trend !== undefined && (
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs",
                trend > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              )}
            >
              <span className="h-1 w-1 rounded-full bg-current" />
              {formatTrend(trend)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
