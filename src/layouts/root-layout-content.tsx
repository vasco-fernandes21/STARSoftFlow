"use client";

import { AppSidebar } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { PopupConfirmacaoProvider } from "@/providers/PopupConfirmacaoProvider";
import { ProjetoFormProvider } from "@/components/projetos/criar/ProjetoFormContext";

export function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pagesWithoutSidebar = ["/login", "/primeiro-login"];
  const shouldHideSidebar = pagesWithoutSidebar.includes(pathname);

  if (shouldHideSidebar) {
    return children;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto relative">
        <PopupConfirmacaoProvider>
          <ProjetoFormProvider>
            {children}
          </ProjetoFormProvider>
        </PopupConfirmacaoProvider>
      </main>
    </div>
  );
}