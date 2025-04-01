import React from "react";

type PaginaHeaderProps = {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
};

export const PaginaHeader = ({ title, subtitle, action }: PaginaHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
};
