"use client";

import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, CheckCircle, HelpCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type TipoPopupConfirmacao = "confirmacao" | "alerta" | "sucesso" | "erro" | "info";

interface PopupConfirmacaoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descricao?: string;
  tipo?: TipoPopupConfirmacao;
  labelConfirmar?: string;
  labelCancelar?: string;
  onConfirmar: () => void;
  onCancelar?: () => void;
  destrutivo?: boolean;
}

export function PopupConfirmacao({
  open,
  onOpenChange,
  titulo,
  descricao,
  tipo = "confirmacao",
  labelConfirmar = "Sim",
  labelCancelar = "Não",
  onConfirmar,
  onCancelar,
  destrutivo = false,
}: PopupConfirmacaoProps) {
  const icons = {
    confirmacao: <HelpCircle className="h-5 w-5" />,
    alerta: <AlertTriangle className="h-5 w-5" />,
    sucesso: <CheckCircle className="h-5 w-5" />,
    erro: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />
  };

  const handleCancelar = () => {
    onOpenChange(false);
    onCancelar?.();
  };

  const handleConfirmar = () => {
    onOpenChange(false);
    onConfirmar();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-6 rounded-xl border border-azul/10 bg-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-azul/10 text-azul">
            {icons[tipo]}
          </div>
          
          <div className="flex-1">
            <h3 className="text-base font-medium text-azul">
              {titulo}
            </h3>
            {descricao && (
              <p className="mt-1.5 text-sm text-azul/70 leading-relaxed">
                {descricao}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelar}
            className="rounded-lg h-9 px-4 border-azul/20 text-azul/80 hover:bg-azul/5"
          >
            {labelCancelar}
          </Button>
          <Button
            type="button"
            onClick={handleConfirmar}
            className={cn(
              "rounded-lg h-9 px-4 bg-azul text-white hover:bg-azul/90",
              destrutivo && "bg-red-500 hover:bg-red-600"
            )}
          >
            {labelConfirmar}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}