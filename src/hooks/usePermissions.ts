import { useSession } from "next-auth/react";
import type { Permissao, User as PrismaUser } from "@prisma/client";

export function usePermissions() {
  const { data: session } = useSession();
  const userPermission = (session?.user as unknown as PrismaUser)?.permissao || 'COMUM';
  
  return {
    // Simple boolean checks for common permission cases
    isAdmin: userPermission === 'ADMIN',
    isGestor: userPermission === 'GESTOR' || userPermission === 'ADMIN',
    isComum: userPermission === 'COMUM',
    
    // Get raw permission value
    userPermission,
    
    // Flexible permission checker with hierarchy logic
    hasPermission: (requiredPermission: Permissao | null) => {
      if (!requiredPermission) return true;
      if (userPermission === 'ADMIN') return true;
      if (userPermission === 'GESTOR' && requiredPermission !== 'ADMIN') return true;
      return userPermission === requiredPermission;
    }
  };
}
