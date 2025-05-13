'use client';

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  onClick?: () => void;
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
  hover = true,
  onClick
}: StatCardProps) => {
  // helper to format trend percentage
  const formatTrend = (trend: number) => {
    const isPositive = trend > 0;
    return `${isPositive ? "+" : ""}${trend}%`;
  };

  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (onClick) {
      return (
        <a href={onClick.toString()} className="block">
          {children}
        </a>
      );
    }
    return <>{children}</>;
  };

  if (centerContent) {
    return (
      <CardWrapper>
        <Card className={cn(
          "overflow-hidden border border-gray-100 bg-white shadow-sm transition-shadow text-center",
          hover && "hover:shadow-md"
        )}>
          <CardContent className="flex flex-col items-center justify-center pt-6 pb-4">
            <Icon className={cn("h-6 w-6 mb-2", iconClassName)} />
            <div className="text-2xl font-bold text-slate-800">
              {typeof value === "number" ? value.toLocaleString("pt-PT") : value}
              {suffix && <span className="ml-1">{suffix}</span>}
            </div>
            <p className="text-sm font-medium text-slate-600">{label}</p>
            {secondaryText && (
              <p className="mt-1.5 text-xs font-medium text-slate-500">
                {secondaryText}
              </p>
            )}
            {badgeText && (
              <p className={cn(
                "mt-2 text-xs",
                badgeClassName?.includes('red') ? "text-red-600" : "text-slate-500"
              )}>
                {badgeText}
              </p>
            )}
          </CardContent>
        </Card>
      </CardWrapper>
    );
  }

  return (
    <CardWrapper>
      <Card className={cn(
        "overflow-hidden border border-gray-100 bg-white shadow-sm transition-shadow",
        hover && "hover:shadow-md"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
          <Icon className={cn("h-5 w-5", iconClassName)} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">
            {typeof value === "number" ? value.toLocaleString("pt-PT") : value}
            {suffix && <span className="ml-1">{suffix}</span>}
          </div>
          {secondaryText && (
            <p className="mt-1.5 text-xs font-medium text-slate-500">
              {secondaryText}
            </p>
          )}
          {badgeText && (
            <p className={cn(
              "mt-1 text-xs",
              badgeClassName?.includes('red') ? "text-red-600" : "text-slate-500"
            )}>
              {badgeText}
            </p>
          )}
          
          {/* Status Counters (se necessário) */}
          {statusCount && (
            <div className="mt-2 flex gap-3">
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
                "mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs",
                trend > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              )}
            >
              <span className="h-1 w-1 rounded-full bg-current" />
              {formatTrend(trend)}
            </div>
          )}
        </CardContent>
      </Card>
    </CardWrapper>
  );
};
