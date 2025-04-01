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
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Euro,
  Lock,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "next-auth/react";
import type { User as PrismaUser } from "@prisma/client";
import { customSignOut } from "@/app/actions/auth-actions";
import { usePermissions } from "@/hooks/usePermissions";
import type { Permissao } from "@prisma/client";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  requiredPermission?: "COMUM" | "GESTOR" | "ADMIN" | null;
}

const menuItems: MenuItem[] = [
  { icon: Home, label: "Início", href: "/", requiredPermission: null },
  { icon: FolderKanban, label: "Projetos", href: "/projetos", requiredPermission: null },
  { icon: Euro, label: "Finanças", href: "/financas", requiredPermission: null },
  { icon: Users, label: "Utilizadores", href: "/utilizadores", requiredPermission: "GESTOR" },
  { icon: Settings, label: "Validações", href: "/validations", requiredPermission: "ADMIN" },
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
      await customSignOut();
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
      item.href === "/"
        ? pathname === "/"
        : pathname.startsWith(`${item.href}/`) || pathname === item.href;
    const isHovered = hoveredItem === item.href;

    return (
      <Link
        href={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ease-in-out",
          isActive
            ? "font-semibold text-azul"
            : "font-medium text-slate-600 hover:bg-azul/5 hover:text-azul",
          className
        )}
        onMouseEnter={() => setHoveredItem(item.href)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <div
          className={cn(
            "relative flex items-center justify-center rounded-xl p-2 transition-all duration-200 ease-in-out",
            "min-h-[40px] min-w-[40px]",
            isActive
              ? "bg-azul/10 text-azul shadow-sm ring-1 ring-azul/10"
              : "text-slate-500 group-hover:bg-azul/5 group-hover:text-azul"
          )}
        >
          <item.icon
            size={20}
            strokeWidth={isActive ? 2.5 : 2}
            className={cn(
              "transition-transform duration-200 ease-in-out",
              isHovered && !isActive && "rotate-3 scale-110"
            )}
          />
        </div>
        <span
          className={cn(
            "transform transition-all duration-200 ease-in-out",
            collapsed
              ? "pointer-events-none w-0 -translate-x-2 opacity-0"
              : "w-auto translate-x-0 opacity-100",
            isActive ? "font-semibold" : "font-medium"
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
          "-p-2 flex h-screen flex-col bg-[#F0F4FA]",
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
              "absolute flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-azul/5 to-azul/10",
              "transform border border-azul/20 shadow-sm transition-all duration-200 ease-in-out",
              collapsed ? "translate-x-0 scale-100 opacity-100" : "translate-x-4 scale-75 opacity-0"
            )}
          >
            <span className="bg-gradient-to-br from-azul to-azul-light bg-clip-text text-lg font-bold text-azul text-transparent">
              S
            </span>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-6 pr-0">
          <nav className="space-y-1.5">
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
                "flex-1 rounded-xl text-slate-600 transition-all duration-200 ease-in-out hover:bg-azul/5 hover:text-azul",
                "shadow-sm hover:shadow",
                collapsed ? "justify-center px-2" : "justify-between px-3"
              )}
              disabled={isPinned}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <span className="text-xs font-medium transition-opacity duration-200 ease-in-out">
                    Recolher
                  </span>
                  <ChevronLeft className="h-4 w-4" />
                </>
              )}
            </Button>
            {!collapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePin}
                className={cn(
                  "ml-2 h-9 w-9 rounded-xl transition-all duration-200 ease-in-out",
                  "shadow-sm hover:bg-azul/5 hover:shadow",
                  isPinned ? "bg-azul/5 text-azul" : "text-slate-600 hover:text-azul"
                )}
                title={isPinned ? "Desafixar sidebar" : "Fixar sidebar"}
              >
                {isPinned ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
            )}
          </div>

          <div className="p-2">
            <Link href="/profile" className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <div className="relative flex min-w-[40px] items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-azul/20 bg-gradient-to-br from-azul/5 to-azul/10 shadow-sm">
                  <User size={18} className="text-azul" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm ring-2 ring-white" />
              </div>
              <div
                className={cn(
                  "flex transform items-center gap-3 transition-all duration-200 ease-in-out",
                  collapsed ? "w-0 -translate-x-2 opacity-0" : "w-auto translate-x-0 opacity-100"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {session?.user?.name || "Utilizador"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {(session?.user as unknown as PrismaUser)?.atividade || ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-9 w-9 rounded-xl text-slate-500 shadow-sm transition-all duration-200 ease-in-out hover:rotate-12 hover:bg-red-50 hover:text-red-600 hover:shadow"
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
