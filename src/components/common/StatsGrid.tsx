import React from "react";
import type { LucideIcon } from "lucide-react";
import { StatCard } from "./StatCard";

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
};

type StatsGridProps = {
  stats: StatItem[];
  className?: string;
};

export const StatsGrid = ({ 
  stats,
  className 
}: StatsGridProps) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className || ''}`}>
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
        />
      ))}
    </div>
  );
}; 