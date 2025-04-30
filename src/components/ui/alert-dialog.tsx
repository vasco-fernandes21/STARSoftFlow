"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { AlertCircle, AlertTriangle, CheckCircle, HelpCircle, Info } from "lucide-react";

import { cn } from "@/lib/utils";

export type AlertDialogType = "confirmacao" | "alerta" | "sucesso" | "erro" | "info";

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-all duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

// Melhorando o layout para ocupar melhor o espaço
const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & {
    tipo?: AlertDialogType;
  }
>(({ className, tipo = "confirmacao", ...props }, ref) => {
  const icons = {
    confirmacao: <HelpCircle className="h-6 w-6" />,
    alerta: <AlertTriangle className="h-6 w-6" />,
    sucesso: <CheckCircle className="h-6 w-6" />,
    erro: <AlertCircle className="h-6 w-6" />,
    info: <Info className="h-6 w-6" />,
  };

  // Cores para os diferentes tipos de alerta com gradientes sutis
  const iconColors = {
    confirmacao: "text-azul",
    alerta: "text-amber-500",
    sucesso: "text-emerald-500",
    erro: "text-red-500",
    info: "text-sky-500",
  };

  const bgGradients = {
    confirmacao: "bg-gradient-to-br from-azul/10 to-azul/5",
    alerta: "bg-gradient-to-br from-amber-50 to-amber-100/50",
    sucesso: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
    erro: "bg-gradient-to-br from-red-50 to-red-100/50",
    info: "bg-gradient-to-br from-sky-50 to-sky-100/50",
  };

  const borderColors = {
    confirmacao: "border-azul/15",
    alerta: "border-amber-200/70",
    sucesso: "border-emerald-200/70",
    erro: "border-red-200/70",
    info: "border-sky-200/70",
  };

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          "data-[state=open]:zoom-in-98 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%] fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-2xl border bg-white/95 p-0 shadow-[0_10px_40px_-5px_rgba(0,0,0,0.1)] backdrop-blur-sm duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2",
          borderColors[tipo],
          className
        )}
        {...props}
      >
        <div className="relative overflow-hidden">
          {/* Barra superior com gradiente do tipo de alerta */}
          <div className={`h-1.5 w-full ${bgGradients[tipo]} absolute left-0 top-0`}></div>

          <div className="mt-1.5 px-6 pb-6 pt-6">
            <div className="flex items-start gap-5">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bgGradients[tipo]} ${iconColors[tipo]} shadow-sm`}
              >
                {icons[tipo]}
              </div>

              <div className="min-w-0 flex-1 pt-1">{props.children}</div>
            </div>
          </div>
        </div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

// Ajustando o Header para melhor distribuição de espaço
const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex w-full flex-col", className)} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

// Ajustando o Footer para ocupar melhor o espaço
const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-7 flex w-full justify-end gap-3", className)} {...props} />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

// Melhorando o título com diferenciação por tipo
const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title> & {
    tipo?: AlertDialogType;
  }
>(({ className, tipo = "confirmacao", ...props }, ref) => {
  const titleColors = {
    confirmacao: "text-azul",
    alerta: "text-amber-700",
    sucesso: "text-emerald-700",
    erro: "text-red-700",
    info: "text-sky-700",
  };

  return (
    <AlertDialogPrimitive.Title
      ref={ref}
      className={cn(`text-lg font-semibold ${titleColors[tipo]}`, className)}
      {...props}
    />
  );
});
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

// Ajustando a descrição para melhor legibilidade
const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("mt-2 break-words text-sm leading-relaxed text-azul/70", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

// Melhorando o botão de confirmação com cores apropriadas por tipo
const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> & {
    destrutivo?: boolean;
    tipo?: AlertDialogType;
  }
>(({ className, destrutivo = false, tipo = "confirmacao", ...props }, ref) => {
  const actionGradients = {
    confirmacao: "bg-gradient-to-r from-azul to-azul/90 hover:from-azul/95 hover:to-azul/85",
    alerta: "bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500",
    sucesso:
      "bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500",
    erro: "bg-gradient-to-r from-red-500 to-red-400 hover:from-red-600 hover:to-red-500",
    info: "bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-600 hover:to-sky-500",
  };

  const destructiveGradient =
    "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600";

  return (
    <AlertDialogPrimitive.Action
      ref={ref}
      className={cn(
        "h-10 rounded-lg px-5 font-medium text-white shadow-sm transition-all duration-200 hover:shadow",
        destrutivo ? destructiveGradient : actionGradients[tipo],
        className
      )}
      {...props}
    />
  );
});
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

// Melhorando o botão de cancelar
const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      "h-10 rounded-lg border border-azul/15 px-5 font-medium text-azul/80 transition-all duration-200 hover:border-azul/20 hover:bg-azul/5",
      className
    )}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
