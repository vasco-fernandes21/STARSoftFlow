"use client";

import { useState } from "react";
import { TipoPopupConfirmacao } from "@/components/ui/popup-confirmacao";

interface OpcoesConfirmacao {
  titulo: string;
  descricao?: string;
  tipo?: TipoPopupConfirmacao;
  labelConfirmar?: string;
  labelCancelar?: string;
  destrutivo?: boolean;
}

export function usePopupConfirmacao() {
  const [open, setOpen] = useState(false);
  const [opcoes, setOpcoes] = useState<OpcoesConfirmacao>({
    titulo: "",
  });
  const [resolveRef, setResolveRef] = useState<(value: boolean) => void>();

  const confirmar = (opcoes: OpcoesConfirmacao): Promise<boolean> => {
    setOpcoes(opcoes);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolveRef(() => resolve);
    });
  };

  const handleConfirmar = () => {
    resolveRef?.(true);
  };

  const handleCancelar = () => {
    resolveRef?.(false);
  };

  return {
    open,
    setOpen,
    opcoes,
    confirmar,
    handleConfirmar,
    handleCancelar,
  };
} 