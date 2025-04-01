"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import GestorDashboard from "@/components/dashboards/GestorDashboard";
import { usePermissions } from "@/hooks/usePermissions";

export default function Page() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isGestor } = usePermissions();

  // Redirecionar para a página de login se não houver sessão
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/(auth)/login");
    } else if (status === "authenticated" && !isGestor) {
      // Redirecionar para a página inicial se não for gestor
      router.push("/");
    }
  }, [status, router, isGestor]);

  // Loading skeleton
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Se não houver sessão, mostrar uma mensagem de boas-vindas
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
        <div className="max-w-8xl mx-auto py-20 text-center">
          <h1 className="text-3xl font-extrabold">Bem-vindo ao Sistema de Gestão de Projetos</h1>
          <p className="mt-4">Por favor, faça login para aceder ao seu painel de controlo.</p>
        </div>
      </div>
    );
  }

  // Renderizar o dashboard do gestor
  return <GestorDashboard />;
} 