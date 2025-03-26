"use client";

import * as React from "react";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  FolderKanban,
  FileBarChart2,
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
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { User as PrismaUser } from "@prisma/client";
import { customSignOut } from "@/app/actions/auth-actions";
import { usePermissions } from "@/hooks/usePermissions";
import { Permissao } from "@prisma/client";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href: string;
  requiredPermission?: "COMUM" | "GESTOR" | "ADMIN" | null;
}

// Menu items for main navigation
const menuItems: MenuItem[] = [
  { icon: Home, label: "Início", href: "/", requiredPermission: null },
  { icon: FolderKanban, label: "Projetos", href: "/projetos", requiredPermission: null },
  { icon: Users, label: "Utilizadores", href: "/utilizadores", requiredPermission: "GESTOR" },
  { icon: Settings, label: "Validações", href: "/validations", requiredPermission: "ADMIN" },
];

export const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const toggleCollapse = () => setCollapsed(!collapsed);

  const { data: session } = useSession();
  const { hasPermission } = usePermissions();

  // Filtrar os itens de menu com base nas permissões
  const filteredMenuItems = menuItems.filter(item => {
    // Se não tiver requisito de permissão, todos podem ver
    if (!item.requiredPermission) return true;
    
    // Verificar se o utilizador tem a permissão necessária
    return hasPermission(item.requiredPermission as Permissao);
  });

  // Função para fazer logout
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    try {
      // Chamar a server action de logout
      await customSignOut();
      // Nota: não precisamos de redirecionar aqui porque a server action já faz isso
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      // Fallback: redirecionar manualmente em caso de erro
      window.location.href = '/login';
    }
  };

  // Click outside handler to collapse sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        if (!collapsed) setCollapsed(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sidebarRef, collapsed]);

  // Reusable menu item component
  const MenuItem = ({ item, className = "" }: { item: MenuItem; className?: string }) => (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
        "text-gray-500 hover:text-gray-900",
        pathname === item.href && "text-azul bg-blue-50",
        className
      )}
    >
      <div className={cn(
        "p-2 rounded-lg transition-all duration-200",
        pathname === item.href 
          ? "bg-azul text-white" 
          : "bg-gray-50 text-gray-500 group-hover:bg-azul group-hover:text-white"
      )}>
        <item.icon size={18} />
      </div>
      <span className={cn(
        "transition-all duration-200",
        collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
      )}>
        {item.label}
      </span>
    </Link>
  );

  // Animação do logotipo melhorada
  const logoVariants = {
    collapsed: {
      opacity: 0,
      scale: 0.5,
      transition: {
        duration: 0.05,
        ease: "easeInOut"
      }
    },
    expanded: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.05,
        ease: "easeInOut"
      }
    }
  };

  const iconVariants = {
    initial: { 
      scale: 0.5,
      opacity: 0
    },
    animate: { 
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.2,
        ease: "easeInOut"
      }
    },
    exit: {
      scale: 0.5,
      opacity: 0,
      transition: {
        duration: 0.01,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="relative h-screen">
      <div
        ref={sidebarRef}
        className={cn(
          "h-screen bg-white shadow-lg transition-all duration-200 flex flex-col",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo Section com Animação */}
        <div className="flex items-center justify-center h-16 px-4 mt-7 relative">
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                key="full-logo"
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
                variants={logoVariants}
                className="absolute flex items-center"
              >
                <Image
                  src="/star-institute-logo.png"
                  alt="STAR Institute"
                  width={180}
                  height={45}
                  priority
                  className="h-8 w-auto"
                />
              </motion.div>
            ) : (
              <motion.div
                key="icon-logo"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={iconVariants}
                className="absolute h-10 w-10 rounded-lg bg-azul flex items-center justify-center"
              >
                <span className="text-white font-bold text-lg">S</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Navigation Content */}
        <ScrollArea className="flex-1 px-3 py-4 mt-5">
          <nav className="space-y-6">
            {/* Main Menu Items */}
            <div className="space-y-2">
              {filteredMenuItems.map((item) => (
                <MenuItem key={item.href} item={item} />
              ))}
            </div>
          </nav>
        </ScrollArea>

        {/* Footer Section - reordenado e modificado */}
        <div className="p-3 border-t border-gray-100 space-y-3">
          {/* Collapse Toggle Button - Agora com texto */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className={cn(
              "w-full rounded-lg hover:bg-gray-50 transition-colors duration-200",
              collapsed ? "justify-center" : "justify-between"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 text-gray-500" />
            ) : (
              <>
                <span className="text-sm text-gray-500">Recolher menu</span>
                <ChevronLeft className="h-5 w-5 text-gray-500" />
              </>
            )}
          </Button>

          {/* Profile Section com dados estáticos */}
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-lg group",
            !collapsed && "hover:bg-gray-50 transition-colors duration-200"
          )}>
            <Link
              href="/profile"
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                  <User size={18} className="text-gray-600" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border-2 border-white" />
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session?.user?.name || "Utilizador"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(session?.user as unknown as PrismaUser)?.atividade || ""}
                  </p>
                </div>
              )}
            </Link>
            
            {/* Botão de logout discreto */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 rounded-lg hover:bg-red-50 transition-colors"
              title="Sair"
            >
              <LogOut size={16} className="text-gray-400 hover:text-red-500" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};