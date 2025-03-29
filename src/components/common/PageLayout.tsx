import React from "react";

type PageLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export const PageLayout = ({ 
  children,
  className 
}: PageLayoutProps) => {
  return (
    <div className={`min-h-screen bg-bgApp p-8 ${className || ''}`}>
      <div className="max-w-8xl mx-auto space-y-4">
        {children}
      </div>
    </div>
  );
}; 