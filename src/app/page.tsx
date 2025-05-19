"use client";

import { useSession } from "next-auth/react";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import GestorDashboard from "@/components/dashboards/GestorDashboard";
import UtilizadorDashboard from "@/components/dashboards/UtilizadorDashboard";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

declare module "next-auth" {
  interface User {
    permissao: string;
    atividade: string;
    regime: string;
  }
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-lg font-medium text-gray-700">A carregar sessão...</p>
        </div>
      </div>
    );
  }

  if (status === "authenticated" && session?.user) {
    const userRole = (session.user as any).permissao;

    if (userRole === "ADMIN") {
      return <AdminDashboard />;
    }
    if (userRole === "GESTOR") {
      return <GestorDashboard />;
    }
    if (userRole === "COMUM") {
      return <UtilizadorDashboard />;
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 text-center">
        <h1 className="text-2xl font-semibold text-gray-800">Acesso Não Autorizado</h1>
        <p className="mt-2 text-gray-600">
          A sua conta não tem permissão para aceder a um painel de controlo específico.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Se acredita que isto é um erro, por favor contacte o suporte.
        </p>
      </div>
    );  
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 text-center">
      <h1 className="text-2xl font-semibold text-gray-800">Redirecionando...</h1>
      <p className="mt-2 text-gray-600">
        Por favor, aguarde.
      </p>
    </div>
  );
}
