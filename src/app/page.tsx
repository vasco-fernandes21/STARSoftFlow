"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';

const AdminDashboard = dynamic(() => import("@/components/dashboards/AdminDashboard"), {
  loading: () => <DashboardSkeleton />
});

const GestorDashboard = dynamic(() => import("@/components/dashboards/GestorDashboard"), {
  loading: () => <DashboardSkeleton />
});

const UtilizadorDashboard = dynamic(() => import("@/components/dashboards/UtilizadorDashboard"), {
  loading: () => <DashboardSkeleton />
});

const DashboardSkeleton = () => (
  <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
    <div className="h-8 bg-gray-200 rounded-md animate-pulse w-1/4"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1,2,3].map((i) => (
        <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
      ))}
    </div>
    <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
  </div>
);

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
    return <DashboardSkeleton />;
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
