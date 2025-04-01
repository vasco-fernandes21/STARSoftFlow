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
  value: number;
  iconClassName?: string;
  iconContainerClassName?: string;
  suffix?: string;
  badgeText?: string;
  badgeIcon?: LucideIcon;
  badgeClassName?: string;
  secondaryText?: string;
  trend?: number;
  statusCount?: StatusCount;
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
}: StatCardProps) => {
  // helper to format trend percentage
  const formatTrend = (trend: number) => {
    const isPositive = trend > 0;
    return `${isPositive ? "+" : ""}${trend}%`;
  };

  return (
    <Card className="group relative overflow-hidden bg-gradient-to-br from-[#FFFFFF] to-[#FFFFFF]/80 transition-all duration-200 hover:to-[#FFFFFF]">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <CardContent className="relative space-y-2.5 p-4">
        {/* Header with Icon and Badge */}
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#FFFFFF] to-[#FFFFFF] shadow-sm ring-1 ring-black/[0.02] transition-transform duration-200 group-hover:scale-110",
              iconContainerClassName
            )}
          >
            <Icon className={cn("h-4 w-4 text-slate-600", iconClassName)} />
          </div>

          {badgeText && (
            <Badge
              variant="outline"
              className={cn(
                "bg-[#FFFFFF] px-2 py-0.5 text-xs font-medium shadow-sm transition-transform duration-200 group-hover:translate-y-0.5",
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
          <p className="text-sm text-slate-500">{label}</p>

          <div className="space-y-0.5">
            <h2 className="text-xl font-medium tracking-tight text-slate-900">
              {value.toLocaleString("pt-PT")}
              {suffix && <span className="ml-1 text-slate-600">{suffix}</span>}
            </h2>

            {secondaryText && <p className="text-xs text-slate-400">{secondaryText}</p>}
          </div>

          {/* Status Counters */}
          {statusCount && (
            <div className="mt-1 flex gap-3">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs">
                  <span className="text-slate-700">{statusCount.completed}</span>
                  {statusCount.completedLabel && (
                    <span className="ml-1 text-slate-400">{statusCount.completedLabel}</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs">
                  <span className="text-slate-700">{statusCount.pending}</span>
                  {statusCount.pendingLabel && (
                    <span className="ml-1 text-slate-400">{statusCount.pendingLabel}</span>
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
