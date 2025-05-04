"use client";

import { AppSidebar } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { ProjetoFormProvider } from "@/components/projetos/criar/ProjetoFormContext";
import { useEffect, useState } from "react";
import { AlertDialogProvider } from "@/components/ui/alert-dialog/alert-dialog-provider";
import { NotificacoesProvider } from "@/components/providers/NotificacoesProvider";
import { Toaster } from "@/components/ui/sonner";

export function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const pagesWithoutSidebar = ["/login", "/primeiro-login", "/recuperar-password"];

  // Garantir que só renderizamos quando estamos no cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Renderizar um fallback simples até termos acesso ao DOM no cliente
  if (!mounted) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-bgApp text-foreground">
        <div className="w-64 bg-slate-900" />
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>
      </div>
    );
  }

  // Add null check for pathname
  const shouldHideSidebar = pathname ? pagesWithoutSidebar.includes(pathname) : false;

  if (shouldHideSidebar) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F0F4FA] text-foreground">
      <AppSidebar />
      <main className="flex flex-1 flex-col overflow-hidden p-3.5 pl-1">
        <div className="h-full w-full flex-1 overflow-clip rounded-xl bg-bgApp shadow-sm">
          <div className="h-full max-h-full w-full overflow-y-auto">
            <AlertDialogProvider>
              <NotificacoesProvider>
                <ProjetoFormProvider>{children}</ProjetoFormProvider>
              </NotificacoesProvider>
            </AlertDialogProvider>
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
