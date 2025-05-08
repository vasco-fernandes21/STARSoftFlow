import { useSession } from "next-auth/react";
import type { Permissao, User as PrismaUser } from "@prisma/client";

export function usePermissions() {
  const { data: session } = useSession();
  const userPermission = (session?.user as unknown as PrismaUser)?.permissao || "COMUM";

  return {
    // Checks com boolen para cada permissão
    isAdmin: userPermission === "ADMIN",
    isGestor: userPermission === "GESTOR" || userPermission === "ADMIN",
    isComum: userPermission === "COMUM",

    //Aqui obtem o tipo de permissão 
    userPermission,

    // Isto é util para verificar se o utilizador tem permissão para fazer algo
    hasPermission: (requiredPermission: Permissao | null) => {
      if (!requiredPermission) return true;
      if (userPermission === "ADMIN") return true;
      if (userPermission === "GESTOR" && requiredPermission !== "ADMIN") return true;
      return userPermission === requiredPermission;
    },
  };
}
