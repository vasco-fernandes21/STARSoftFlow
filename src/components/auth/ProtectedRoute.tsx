"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import type { Permissao } from "@prisma/client";
import { useSession } from "next-auth/react";

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
  const { status } = useSession();

  // Se ainda está carregando a sessão, não fazer nada
  if (status === "loading") {
    return null;
  }

  // Se não está autenticado, redirecionar para login
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  // Verificar permissões apenas quando a sessão estiver carregada
  const hasRequiredPermission = !requiredPermission || hasPermission(requiredPermission);
  const isBlockedByPermission = blockPermission && userPermission === blockPermission;

  // Se não tem permissão ou está bloqueado, redirecionar
  if (!hasRequiredPermission || isBlockedByPermission) {
    router.push("/");
    return null;
  }

  // Se chegou aqui, tem todas as permissões necessárias
  return <>{children}</>;
}
