import React from 'react';

export default function DocumentacaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bgApp">
      {/* Main content */}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
} 