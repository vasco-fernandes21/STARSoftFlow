"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  FolderKanban,
  Users,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Lock,
  Unlock,
  Euro,
  MessageSquare,
  Bell,
} from "lucide-react";
import { NotificacoesSino } from "@/components/common/NotificacoesSino";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "next-auth/react";
import type { User as PrismaUser } from "@prisma/client";
import { usePermissions } from "@/hooks/usePermissions";
import type { Permissao } from "@prisma/client";
import { signOut } from "next-auth/react";
import { api } from "@/trpc/react";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  requiredPermission?: "COMUM" | "GESTOR" | "ADMIN" | null;
}

const menuItems: MenuItem[] = [
  { icon: Home, label: "Início", href: "/", requiredPermission: null },
  { icon: FolderKanban, label: "Projetos", href: "/projetos", requiredPermission: null },
  { icon: Bell, label: "Notificações", href: "/notificacoes", requiredPermission: null },
  { icon: Euro, label: "Atividade Económica", href: "/atividade-economica", requiredPermission: "ADMIN" },
  { icon: Users, label: "Utilizadores", href: "/utilizadores", requiredPermission: "GESTOR" },
  { icon: MessageSquare, label: "Erros & Feedback", href: "/feedback", requiredPermission: null },
];

export const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = () => {
    if (!isPinned) {
      setCollapsed(!collapsed);
    }
  };

  const togglePin = () => {
    setIsPinned(!isPinned);
    if (collapsed) {
      setCollapsed(false);
    }
  };

  const { data: session } = useSession();
  const { hasPermission } = usePermissions();

  const filteredMenuItems = menuItems.filter(
    (item) => !item.requiredPermission || hasPermission(item.requiredPermission as Permissao)
  );

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    const handleMouseEnter = () => {
      if (!isPinned && collapsed) setCollapsed(false);
    };

    const handleMouseLeave = () => {
      if (!isPinned && !collapsed) setCollapsed(true);
    };

    const sidebarElement = sidebarRef.current;
    if (sidebarElement) {
      sidebarElement.addEventListener("mouseenter", handleMouseEnter);
      sidebarElement.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        sidebarElement.removeEventListener("mouseenter", handleMouseEnter);
        sidebarElement.removeEventListener("mouseleave", handleMouseLeave);
      };
    }
  }, [collapsed, isPinned]);

  const MenuItem = ({ item, className = "" }: { item: MenuItem; className?: string }) => {
    const isActive =
      pathname === null
        ? false
        : item.href === "/"
          ? pathname === "/"
          : pathname.startsWith(`${item.href}/`) || pathname === item.href;
    const isHovered = hoveredItem === item.href;

    // Buscar contagem de notificações não lidas
    const { data: naoLidas = 0 } = api.notificacao.contarNaoLidas.useQuery(
      undefined,
      { 
        enabled: item.href === "/notificacoes",
        staleTime: 1 * 60 * 1000, 
        refetchOnWindowFocus: true,
        refetchInterval: 30 * 1000
      }
    );

    const showBadge = item.href === "/notificacoes" && naoLidas > 0;

    return (
      <Link
        href={item.href}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 ease-in-out",
          isActive
            ? "bg-gradient-to-r from-azul/15 to-azul/5 font-semibold text-azul shadow-sm"
            : "font-medium text-slate-600 hover:bg-azul/5 hover:text-azul",
          className
        )}
        onMouseEnter={() => setHoveredItem(item.href)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center rounded-xl p-2 transition-all duration-300 ease-in-out",
            "min-h-[40px] min-w-[40px]",
            isActive
              ? "bg-azul text-white shadow-md"
              : "text-slate-500 group-hover:bg-azul/5 group-hover:text-azul group-hover:shadow-sm"
          )}
        >
          <item.icon
            size={20}
            strokeWidth={isActive ? 2 : 2}
            className={cn(
              "transition-transform duration-300 ease-in-out",
              isHovered && !isActive && "scale-110"
            )}
          />
          {showBadge && (
            <span className={cn(
              "absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white",
              "animate-in fade-in duration-300",
              collapsed ? "scale-75" : "scale-100"
            )}>
              {naoLidas > 99 ? "99+" : naoLidas}
            </span>
          )}
          {isActive && (
            <div className="absolute inset-0 -z-10 animate-pulse rounded-xl bg-azul/50 opacity-30 blur-sm" />
          )}
        </div>
        <span
          className={cn(
            "transform whitespace-nowrap transition-all duration-300 ease-in-out",
            collapsed
              ? "pointer-events-none w-0 -translate-x-2 opacity-0"
              : "w-auto translate-x-0 opacity-100",
            isActive ? "font-semibold" : "font-medium",
            isHovered && !isActive && "translate-x-0.5"
          )}
        >
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <div className="relative h-screen">
      <div
        ref={sidebarRef}
        className={cn(
          "flex h-screen flex-col bg-[#F0F4FA] -p-2 mt-2",
          "transition-all duration-200 ease-in-out",
          collapsed ? "w-20" : "w-64",
          "backdrop-blur-xl supports-[backdrop-filter]:bg-[#F0F4FA]/90"
        )}
      >
        {/* Logo Section */}
        <div className="relative mt-8 flex h-16 items-center justify-center px-1">
          <div
            className={cn(
              "absolute flex transform items-center transition-all duration-200 ease-in-out",
              collapsed
                ? "-translate-x-4 scale-75 opacity-0"
                : "translate-x-0 scale-100 opacity-100"
            )}
          >
            <Image
              src="/star-institute-logo.png"
              alt="STAR Institute"
              width={160}
              height={40}
              priority
              className="h-7 w-auto"
            />
          </div>
          <div
            className={cn(
              "absolute flex h-9 w-9 items-center justify-center rounded-xl bg-azul shadow-md",
              "transform transition-all duration-200 ease-in-out",
              collapsed ? "translate-x-0 scale-100 opacity-100" : "translate-x-4 scale-75 opacity-0"
            )}
          >
            <span className="text-lg font-bold text-white">S</span>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-6">
          <nav className="flex flex-col gap-2 pr-2">
            {filteredMenuItems.map((item) => (
              <MenuItem key={item.href} item={item} />
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="mt-auto bg-gradient-to-t from-[#F0F4FA] to-transparent">
          <div className="flex items-center px-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className={cn(
                "flex-1 rounded-xl text-slate-600 transition-all duration-300 ease-in-out hover:bg-azul/5 hover:text-azul",
                "shadow-sm hover:shadow",
                collapsed ? "justify-center px-2" : "justify-between px-3"
              )}
              disabled={isPinned}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4 transition-transform duration-300 ease-in-out hover:scale-105" />
              ) : (
                <>
                  <span className="text-xs font-medium transition-all duration-300 ease-in-out">
                    Recolher
                  </span>
                  <ChevronLeft className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
            {!collapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePin}
                className={cn(
                  "ml-2 h-9 w-9 rounded-xl transition-all duration-300 ease-in-out",
                  "shadow-sm hover:scale-105 hover:shadow",
                  isPinned ? "bg-azul text-white" : "text-slate-600 hover:bg-azul/5 hover:text-azul"
                )}
                title={isPinned ? "Desafixar sidebar" : "Fixar sidebar"}
              >
                {isPinned ? (
                  <Lock className="h-4 w-4 transition-transform duration-300 ease-in-out" />
                ) : (
                  <Unlock className="h-4 w-4 transition-transform duration-300 ease-in-out" />
                )}
              </Button>
            )}
          </div>

          <div className="p-2">
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300 ease-in-out hover:bg-azul/5"
            >
              <div className="relative flex min-w-[40px] items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-azul/20 bg-gradient-to-br from-azul/5 to-azul/10 shadow-sm transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md">
                  <User size={18} className="text-azul transition-all duration-300 ease-in-out" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm ring-2 ring-white" />
              </div>
              <div
                className={cn(
                  "flex transform items-center gap-3 transition-all duration-300 ease-in-out min-w-0",
                  collapsed ? "w-0 -translate-x-2 opacity-0" : "w-auto translate-x-0 opacity-100"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 transition-all duration-300 ease-in-out">
                    {session?.user?.name || "Utilizador"}
                  </p>
                  <p
                    className="truncate text-xs text-slate-500 transition-all duration-300 ease-in-out max-w-full"
                    title={(session?.user as unknown as PrismaUser)?.atividade || ""}
                  >
                    {(session?.user as unknown as PrismaUser)?.atividade || ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-9 w-9 rounded-xl text-slate-500 shadow-sm transition-all duration-300 ease-in-out hover:scale-105 hover:bg-red-50 hover:text-red-600 hover:shadow"
                  title="Sair"
                >
                  <LogOut size={16} />
                </Button>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
