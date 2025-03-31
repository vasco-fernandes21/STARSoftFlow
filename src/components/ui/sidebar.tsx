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

  const filteredMenuItems = menuItems.filter((item) =>
    !item.requiredPermission || hasPermission(item.requiredPermission as Permissao)
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
    const isActive = item.href === "/" 
      ? pathname === "/" 
      : pathname.startsWith(`${item.href}/`) || pathname === item.href;
    const isHovered = hoveredItem === item.href;

    return (
      <Link
        href={item.href}
        className={cn(
          "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ease-in-out",
          isActive 
            ? "text-azul font-semibold" 
            : "text-slate-600 font-medium hover:text-azul hover:bg-azul/5",
          className
        )}
        onMouseEnter={() => setHoveredItem(item.href)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <div
          className={cn(
            "relative p-2 rounded-xl transition-all duration-200 ease-in-out flex items-center justify-center",
            "min-w-[40px] min-h-[40px]",
            isActive
              ? "bg-azul/10 text-azul shadow-sm ring-1 ring-azul/10"
              : "text-slate-500 group-hover:text-azul group-hover:bg-azul/5"
          )}
        >
          <item.icon 
            size={20} 
            strokeWidth={isActive ? 2.5 : 2} 
            className={cn(
              "transition-transform duration-200 ease-in-out",
              isHovered && !isActive && "scale-110 rotate-3"
            )} 
          />
        </div>
        <span
          className={cn(
            "transition-all duration-200 ease-in-out transform",
            collapsed 
              ? "opacity-0 -translate-x-2 w-0 pointer-events-none" 
              : "opacity-100 translate-x-0 w-auto",
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
          "h-screen bg-[#F0F4FA] flex flex-col -p-2",
          "transition-all duration-200 ease-in-out",
          collapsed ? "w-20" : "w-64",
          "supports-[backdrop-filter]:bg-[#F0F4FA]/90 backdrop-blur-xl"
        )}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-center h-16 px-1 mt-8 relative">
          <div
            className={cn(
              "absolute flex items-center transition-all duration-200 ease-in-out transform",
              collapsed ? "opacity-0 scale-75 -translate-x-4" : "opacity-100 scale-100 translate-x-0"
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
              "absolute h-9 w-9 rounded-xl bg-gradient-to-br from-azul/5 to-azul/10 flex items-center justify-center",
              "transition-all duration-200 ease-in-out transform border border-azul/20 shadow-sm",
              collapsed ? "opacity-100 scale-100 translate-x-0" : "opacity-0 scale-75 translate-x-4"
            )}
          >
            <span className="text-azul font-bold text-lg bg-gradient-to-br from-azul to-azul-light bg-clip-text text-transparent">S</span>
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
                "flex-1 rounded-xl text-slate-600 hover:text-azul hover:bg-azul/5 transition-all duration-200 ease-in-out",
                "shadow-sm hover:shadow",
                collapsed ? "justify-center px-2" : "justify-between px-3"
              )}
              disabled={isPinned}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <span className="text-xs font-medium transition-opacity duration-200 ease-in-out">Recolher</span>
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
                  "ml-2 w-9 h-9 rounded-xl transition-all duration-200 ease-in-out",
                  "hover:bg-azul/5 shadow-sm hover:shadow",
                  isPinned 
                    ? "text-azul bg-azul/5" 
                    : "text-slate-600 hover:text-azul"
                )}
                title={isPinned ? "Desafixar sidebar" : "Fixar sidebar"}
              >
                {isPinned ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Unlock className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          <div className="p-2">
            <Link 
              href="/profile" 
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            >
              <div className="relative flex items-center justify-center min-w-[40px]">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-azul/5 to-azul/10 flex items-center justify-center border border-azul/20 shadow-sm">
                  <User size={18} className="text-azul" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white shadow-sm" />
              </div>
              <div
                className={cn(
                  "flex items-center gap-3 transition-all duration-200 ease-in-out transform",
                  collapsed ? "opacity-0 -translate-x-2 w-0" : "opacity-100 translate-x-0 w-auto"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {session?.user?.name || "Utilizador"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {(session?.user as unknown as PrismaUser)?.atividade || ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-9 w-9 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-600 transition-all duration-200 ease-in-out shadow-sm hover:shadow hover:rotate-12"
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