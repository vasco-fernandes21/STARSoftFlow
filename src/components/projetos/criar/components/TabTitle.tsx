import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

interface TabTitleProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  badgeContent?: string;
}

export function TabTitle({ title, subtitle, icon, badgeContent }: TabTitleProps) {
  return (
    <div className="p-4 md:p-6 flex items-center justify-between bg-azul text-white">
      <div className="flex items-center">
        {icon}
        <div className="ml-3">
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="text-sm text-white/80">{subtitle}</p>
        </div>
      </div>
      
      {badgeContent && (
        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none">
          {badgeContent}
        </Badge>
      )}
    </div>
  );
} 