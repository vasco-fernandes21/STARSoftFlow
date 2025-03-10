"use client";

import { AppSidebar } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { PopupConfirmacaoProvider } from "@/providers/PopupConfirmacaoProvider";

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
          {children}
        </PopupConfirmacaoProvider>
      </main>
    </div>
  );
}