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
    <div className={`min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8 custom-blue-blur ${className || ''}`}>
      <div className="max-w-8xl mx-auto space-y-4">
        {children}
      </div>
    </div>
  );
}; 