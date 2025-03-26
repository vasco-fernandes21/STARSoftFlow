"use client";

import { NovoUtilizadorModal } from "@/components/utilizadores/NovoUtilizadorModal";

export default function CriarUtilizador() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Criar Novo Utilizador</h1>
        <NovoUtilizadorModal />
      </div>
    </div>
  );
}
