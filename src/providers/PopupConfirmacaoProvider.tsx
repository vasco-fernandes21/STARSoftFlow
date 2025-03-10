"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { PopupConfirmacao, TipoPopupConfirmacao } from "@/components/ui/popup-confirmacao";
import { usePopupConfirmacao } from "@/hooks/usePopupConfirmacao";

interface PopupConfirmacaoContextProps {
  confirmar: (opcoes: {
    titulo: string;
    descricao?: string;
    tipo?: TipoPopupConfirmacao;
    labelConfirmar?: string;
    labelCancelar?: string;
    destrutivo?: boolean;
  }) => Promise<boolean>;
}

const PopupConfirmacaoContext = createContext<PopupConfirmacaoContextProps | undefined>(undefined);

export function PopupConfirmacaoProvider({ children }: { children: ReactNode }) {
  const { open, setOpen, opcoes, confirmar, handleConfirmar, handleCancelar } = usePopupConfirmacao();

  return (
    <PopupConfirmacaoContext.Provider value={{ confirmar }}>
      <PopupConfirmacao
        open={open}
        onOpenChange={setOpen}
        titulo={opcoes.titulo}
        descricao={opcoes.descricao}
        tipo={opcoes.tipo}
        labelConfirmar={opcoes.labelConfirmar}
        labelCancelar={opcoes.labelCancelar}
        onConfirmar={handleConfirmar}
        onCancelar={handleCancelar}
        destrutivo={opcoes.destrutivo}
      />
      {children}
    </PopupConfirmacaoContext.Provider>
  );
}

export function useConfirmacao() {
  const context = useContext(PopupConfirmacaoContext);
  if (!context) {
    throw new Error("useConfirmacao deve ser usado dentro de um PopupConfirmacaoProvider");
  }
  return context;
} 