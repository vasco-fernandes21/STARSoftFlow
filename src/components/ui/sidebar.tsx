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
  { icon: Users, label: "Utilizadores", href: "/utilizadores", requiredPermission: "GESTOR" },
  { icon: Settings, label: "Validações", href: "/validations", requiredPermission: "ADMIN" },
];

export const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = () => setCollapsed(!collapsed);
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
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        if (!collapsed) setCollapsed(true);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [collapsed]);

  const MenuItem = ({ item, className = "" }: { item: MenuItem; className?: string }) => {
    const isActive = pathname === item.href;
    const isHovered = hoveredItem === item.href;

    return (
      <Link
        href={item.href}
        className={cn(
          "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
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
            "relative p-2 rounded-xl transition-all duration-200 flex items-center justify-center",
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
              "transition-transform duration-200",
              isHovered && !isActive && "scale-110 rotate-3"
            )} 
          />
        </div>
        <span
          className={cn(
            "transition-all duration-200 whitespace-nowrap",
            collapsed ? "opacity-0 w-0 pointer-events-none" : "opacity-100 w-auto",
            isActive ? "font-semibold" : "font-medium"
          )}
        >
          {item.label}
        </span>
        {isActive && (
          <div className={cn(
            "absolute w-1 h-5 bg-azul rounded-full transition-all duration-300",
             collapsed ? "right-0 top-1/2 -translate-y-1/2" : "left-0 top-1/2 -translate-y-1/2"
          )} />
        )}
      </Link>
    );
  };

  return (
    <div className="relative h-screen">
      <div
        ref={sidebarRef}
        className={cn(
          "h-screen bg-[#F0F4FA] flex flex-col",
          "transition-all duration-300 ease-in-out",
          collapsed ? "w-20" : "w-64",
          "supports-[backdrop-filter]:bg-[#F0F4FA]/90 backdrop-blur-xl"
        )}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-center h-16 px-4 mt-8 relative">
          <div
            className={cn(
              "absolute flex items-center transition-all duration-300",
              collapsed ? "opacity-0 scale-75" : "opacity-100 scale-100"
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
              "transition-all duration-300 border border-azul/20 shadow-sm",
              collapsed ? "opacity-100 scale-100" : "opacity-0 scale-75"
            )}
          >
            <span className="text-azul font-bold text-lg bg-gradient-to-br from-azul to-azul-light bg-clip-text text-transparent">S</span>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-6">
          <nav className="space-y-1.5">
            {filteredMenuItems.map((item) => (
              <MenuItem key={item.href} item={item} />
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-2 border-t border-black/5 space-y-2 bg-gradient-to-t from-[#F0F4FA] to-transparent">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className={cn(
              "w-full rounded-xl text-slate-600 hover:text-azul hover:bg-azul/5 transition-all duration-200",
              "shadow-sm hover:shadow",
              collapsed ? "justify-center px-2" : "justify-between px-3"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <span className="text-xs font-medium">Recolher</span>
                <ChevronLeft className="h-4 w-4" />
              </>
            )}
          </Button>

          <div
            className={cn(
              "flex items-center gap-3 p-2 rounded-xl transition-all duration-200 hover:bg-azul/5"
            )}
          >
            <Link href="/profile" className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-azul/5 to-azul/10 flex items-center justify-center border border-azul/20 shadow-sm">
                  <User size={18} className="text-azul" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white shadow-sm" />
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {session?.user?.name || "Utilizador"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {(session?.user as unknown as PrismaUser)?.atividade || ""}
                  </p>
                </div>
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className={cn(
                "h-9 w-9 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors duration-200",
                "shadow-sm hover:shadow hover:rotate-12"
              )}
              title="Sair"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};