"use client";

import { NovoUtilizadorModal } from "@/app/utilizadores/components/NovoUtilizadorModal";

export default function CriarUtilizador() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Criar Novo Utilizador</h1>
        <NovoUtilizadorModal />
      </div>
    </div>
  );
}
