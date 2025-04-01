"use client";

import { useProjetoForm } from "@/components/projetos/criar/ProjetoFormContext";
import { useEffect, useState } from "react";

export default function StateMonitor() {
  const { state } = useProjetoForm();
  const [formattedState, setFormattedState] = useState("");

  useEffect(() => {
    // Converte o Decimal para string nos valores para evitar problemas de serialização
    const cleanState = {
      ...state,
      overhead: state.overhead?.toString(),
      taxa_financiamento: state.taxa_financiamento?.toString(),
      valor_eti: state.valor_eti?.toString(),
      workpackages: state.workpackages?.map((wp) => ({
        ...wp,
        materiais: wp.materiais?.map((m) => ({
          ...m,
          preco: m.preco?.toString(),
        })),
        recursos: wp.recursos?.map((r) => ({
          ...r,
          ocupacao: r.ocupacao?.toString(),
        })),
      })),
    };

    setFormattedState(JSON.stringify(cleanState, null, 2));
  }, [state]);

  return (
    <details className="mt-4 rounded-md border border-slate-200 p-4 text-xs">
      <summary className="cursor-pointer font-medium">Debug: Estado Atual do Projeto</summary>
      <pre className="mt-2 max-h-[300px] overflow-auto rounded bg-slate-50 p-2">
        {formattedState}
      </pre>
    </details>
  );
}
