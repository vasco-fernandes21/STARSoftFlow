"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { AlertCircle, AlertTriangle, CheckCircle, HelpCircle, Info } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type AlertDialogType = "confirmacao" | "alerta" | "sucesso" | "erro" | "info";

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

// Melhorando o layout para ocupar melhor o espaço
const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> & {
    tipo?: AlertDialogType 
  }
>(({ className, tipo = "confirmacao", ...props }, ref) => {
  const icons = {
    confirmacao: <HelpCircle className="h-5 w-5" />,
    alerta: <AlertTriangle className="h-5 w-5" />,
    sucesso: <CheckCircle className="h-5 w-5" />,
    erro: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />
  };
  
  // Cores para os diferentes tipos de alerta
  const iconColors = {
    confirmacao: "text-azul",
    alerta: "text-amber-500",
    sucesso: "text-green-500",
    erro: "text-red-500",
    info: "text-blue-500"
  };
  
  const bgColors = {
    confirmacao: "bg-azul/10",
    alerta: "bg-amber-50",
    sucesso: "bg-green-50",
    erro: "bg-red-50",
    info: "bg-blue-50"
  };

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] p-0 shadow-lg rounded-xl border border-azul/10 bg-white duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden",
          className
        )}
        {...props}
      >
        <div className="relative">
          {/* Barra superior com a cor do tipo de alerta */}
          <div className={`h-1.5 w-full ${bgColors[tipo]} absolute top-0 left-0`}></div>
          
          <div className="pt-5 px-6 pb-6 mt-1.5">
            <div className="flex items-start gap-4">
              <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${bgColors[tipo]} ${iconColors[tipo]}`}>
                {icons[tipo]}
              </div>
              
              <div className="flex-1 min-w-0">
                {props.children}
              </div>
            </div>
          </div>
        </div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  );
})
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

// Ajustando o Header para melhor distribuição de espaço
const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col w-full", className)}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

// Ajustando o Footer para ocupar melhor o espaço
const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex justify-end gap-2 mt-6 w-full",
      className
    )}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

// Melhorando o título com diferenciação por tipo
const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title> & {
    tipo?: AlertDialogType
  }
>(({ className, tipo = "confirmacao", ...props }, ref) => {
  const titleColors = {
    confirmacao: "text-azul",
    alerta: "text-amber-700",
    sucesso: "text-green-700",
    erro: "text-red-700",
    info: "text-blue-700"
  };

  return (
    <AlertDialogPrimitive.Title
      ref={ref}
      className={cn(`text-base font-medium ${titleColors[tipo]}`, className)}
      {...props}
    />
  );
})
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

// Ajustando a descrição para melhor legibilidade
const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("mt-1.5 text-sm text-azul/70 leading-relaxed break-words", className)}
    {...props}
  />
))
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName

// Melhorando o botão de confirmação com cores apropriadas por tipo
const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> & {
    destrutivo?: boolean;
    tipo?: AlertDialogType;
  }
>(({ className, destrutivo = false, tipo = "confirmacao", ...props }, ref) => {
  const actionColors = {
    confirmacao: "bg-azul hover:bg-azul/90",
    alerta: "bg-amber-500 hover:bg-amber-600",
    sucesso: "bg-green-500 hover:bg-green-600",
    erro: "bg-red-500 hover:bg-red-600",
    info: "bg-blue-500 hover:bg-blue-600"
  };

  return (
    <AlertDialogPrimitive.Action
      ref={ref}
      className={cn(
        "rounded-lg h-9 px-4 text-white transition-colors",
        destrutivo ? "bg-red-500 hover:bg-red-600" : actionColors[tipo],
        className
      )}
      {...props}
    />
  );
})
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

// Melhorando o botão de cancelar
const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      "rounded-lg h-9 px-4 border border-azul/20 text-azul/80 hover:bg-azul/5 transition-colors",
      className
    )}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

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
}
