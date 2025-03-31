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
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    );
  }
  
  const shouldHideSidebar = pagesWithoutSidebar.includes(pathname);

  if (shouldHideSidebar) {
    return children;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F0F4FA] text-foreground">
      <AppSidebar />
      <main className="flex-1 overflow-hidden flex flex-col p-4">
        <div className="flex-1 h-full overflow-hidden rounded-xl bg-bgApp shadow-sm">
          <div className="h-full overflow-y-auto">
            <AlertDialogProvider>
              <ProjetoFormProvider>
                {children}
              </ProjetoFormProvider>
            </AlertDialogProvider>
          </div>
        </div>
      </main>
    </div>
  );
}