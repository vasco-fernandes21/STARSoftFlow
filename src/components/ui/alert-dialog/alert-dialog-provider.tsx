"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AlertDialogOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type AlertContextType = {
  showAlert: (options: AlertDialogOptions) => Promise<boolean>;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<AlertDialogOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const showAlert = (options: AlertDialogOptions): Promise<boolean> => {
    setOptions(options);
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      setResolveRef(() => resolve);
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveRef) resolveRef(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveRef) resolveRef(false);
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}

      {options && (
        <AlertDialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open && resolveRef) resolveRef(false);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{options.title}</AlertDialogTitle>
              <AlertDialogDescription>{options.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancel}>
                {options.cancelLabel || "Cancelar"}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
                className={options.destructive ? "bg-red-600 text-white hover:bg-red-700" : ""}
              >
                {options.confirmLabel || "Confirmar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </AlertContext.Provider>
  );
}

export function useAlertDialog() {
  const context = useContext(AlertContext);

  if (context === undefined) {
    throw new Error("useAlertDialog must be used within an AlertDialogProvider");
  }

  return context;
}
