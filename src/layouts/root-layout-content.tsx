"use client";

import { AppSidebar } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { usePusherNotifications } from "@/hooks/usePusherNotifications";

export function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  usePusherNotifications();

  const pagesWithoutSidebar = [
    "/login",
    "/primeiro-login",
    "/recuperar-password",
    "/tutoriais",
    "/inicio"
  ];

  const hideSidebar =
    pathname &&
    (pagesWithoutSidebar.includes(pathname) || pathname.startsWith("/documentacao"));

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (hideSidebar) {
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
            {children}
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
