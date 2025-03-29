"use client";

import { AppSidebar } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { ProjetoFormProvider } from "@/components/projetos/criar/ProjetoFormContext";
import { useEffect, useState } from "react";
import { AlertDialogProvider } from "@/components/ui/alert-dialog/alert-dialog-provider";

export function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const pagesWithoutSidebar = ["/login", "/primeiro-login"];
  
  // Garantir que só renderizamos quando estamos no cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Renderizar um fallback simples até termos acesso ao DOM no cliente
  if (!mounted) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-bgApp text-foreground">
        <div className="w-64 bg-slate-900" />
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>
    );
  }
  
  const shouldHideSidebar = pagesWithoutSidebar.includes(pathname);

  if (shouldHideSidebar) {
    return children;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bgApp text-foreground">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto relative">
        <AlertDialogProvider>
          <ProjetoFormProvider>
            {children}
          </ProjetoFormProvider>
        </AlertDialogProvider>
      </main>
    </div>
  );
}