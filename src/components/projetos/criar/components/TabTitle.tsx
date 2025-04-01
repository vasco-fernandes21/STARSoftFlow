import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

interface TabTitleProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  badgeContent?: string;
}

export function TabTitle({ title, subtitle, icon, badgeContent }: TabTitleProps) {
  return (
    <div className="flex items-center justify-between bg-azul p-4 text-white md:p-6">
      <div className="flex items-center">
        {icon}
        <div className="ml-3">
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="text-sm text-white/80">{subtitle}</p>
        </div>
      </div>

      {badgeContent && (
        <Badge className="border-none bg-white/20 text-white hover:bg-white/30">
          {badgeContent}
        </Badge>
      )}
    </div>
  );
}
