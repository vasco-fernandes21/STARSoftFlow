'use client';

import React from "react";
import type { LucideIcon } from "lucide-react";
import { StatCard } from "./StatCard";

interface StatusCount {
  completed: number;
  pending: number;
  completedLabel?: string;
  pendingLabel?: string;
}

export type StatItem = {
  icon: LucideIcon;
  label: string;
  value: number;
  iconClassName: string;
  iconContainerClassName: string;
  suffix?: string;
  badgeText?: string;
  badgeIcon?: LucideIcon;
  badgeClassName?: string;
  secondaryText?: string;
  trend?: number;
  statusCount?: StatusCount;
  href?: string;
};

type StatsGridProps = {
  stats: StatItem[];
  className?: string;
};

export const StatsGrid = ({ stats, className }: StatsGridProps) => {
  return (
    <div
      className={`grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 ${className || ""}`}
    >
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          icon={stat.icon}
          label={stat.label}
          value={stat.value}
          iconClassName={stat.iconClassName}
          iconContainerClassName={stat.iconContainerClassName}
          suffix={stat.suffix}
          badgeText={stat.badgeText}
          badgeIcon={stat.badgeIcon}
          badgeClassName={stat.badgeClassName}
          secondaryText={stat.secondaryText}
          trend={stat.trend}
          statusCount={stat.statusCount}
          onClick={stat.href ? () => stat.href : undefined}
        />
      ))}
    </div>
  );
};
