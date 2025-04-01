"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Permissao } from "@prisma/client";

interface ProtectedRouteProps {
  requiredPermission?: Permissao; // Original: requer uma permissão específica
  blockPermission?: Permissao; // Novo: bloqueia uma permissão específica
  children: React.ReactNode;
}

export function ProtectedRoute({
  requiredPermission,
  blockPermission,
  children,
}: ProtectedRouteProps) {
  const { hasPermission, userPermission } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    // Verificar se foi especificado requiredPermission
    if (requiredPermission && !hasPermission(requiredPermission)) {
      router.push("/"); // Redirecionar se não tiver a permissão requerida
      return;
    }

    // Verificar se foi especificado blockPermission
    if (blockPermission && userPermission === blockPermission) {
      router.push("/"); // Redirecionar se tiver a permissão bloqueada
      return;
    }
  }, [hasPermission, userPermission, requiredPermission, blockPermission, router]);

  // Não renderizar nada enquanto verifica permissões
  if (
    (requiredPermission && !hasPermission(requiredPermission)) ||
    (blockPermission && userPermission === blockPermission)
  ) {
    return null;
  }

  return <>{children}</>;
}
