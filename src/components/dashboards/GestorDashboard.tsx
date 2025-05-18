'use client';

import MediasAlocacoes from "./gestor/MediasAlocacoes";
import ProximosMateriais from "./gestor/ProximosMateriais";
import ProximosEventos from "./gestor/ProximosEventos";
import { useSession } from "next-auth/react";
import { GestorStats } from "./gestor/GestorStats";

export default function GestorDashboard() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-[#F7F9FC] p-8">
      <div className="mx-auto max-w-8xl space-y-6">
        {/* Header com Boas-vindas */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">
            Painel de Controlo
          </h1>
          <p className="text-sm text-slate-500">
            Olá {session?.user?.name?.split(' ')[0]}, aqui está o resumo da sua plataforma.
          </p>
        </div>

        {/* Cards de estatísticas */}
        <div className="w-full">
          <GestorStats />
        </div>
        
        {/* Layout de duas colunas */}
        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
          <ProximosEventos />
          <MediasAlocacoes />
        </div>

        {/* Materiais em largura total */}
        <div className="w-full">
          <ProximosMateriais />
        </div>
      </div>
    </div>
  );
} 