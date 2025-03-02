"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as Dialog from "@radix-ui/react-dialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { File, LayoutDashboard, Edit } from "lucide-react";
import { UsarTemplate } from "./usarTemplate";

interface NovoProjetoProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function NovoProjeto({ variant = "default", size = "default" }: NovoProjetoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<"template" | "import" | "custom" | null>(null);

  const handleClose = () => {
    setIsOpen(false);
    setSelectedOption(null);
  };

  const handleCreateProject = (data: any) => {
    console.log("Novo projeto:", data);
    handleClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <Button
          variant={variant}
          size={size}
          className="gap-2 bg-azul hover:bg-azul/90 text-white shadow-md"
        >
          <Plus className="h-4 w-4" />
          Novo Projeto
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-h-[90vh] overflow-y-auto ${
          selectedOption === "template" ? "w-[90vw]" : "w-full max-w-md"
        }`}>
          <Dialog.Title className="sr-only">
            {selectedOption === "template" ? "Criar Projeto a partir de Template" : "Adicionar Projeto"}
          </Dialog.Title>
          
          {selectedOption === "template" ? (
            <UsarTemplate onClose={handleClose} onSubmit={handleCreateProject} />
          ) : (
            <Card className="border-none shadow-lg rounded-2xl bg-white">
              <CardHeader className="border-b border-gray-100 px-6 py-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Adicionar Projeto</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-700 hover:bg-gray-100 rounded-lg"
                  onClick={() => setSelectedOption("import")}
                >
                  <File className="h-4 w-4 mr-2 text-blue-500" />
                  Importar
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-700 hover:bg-gray-100 rounded-lg"
                  onClick={() => setSelectedOption("template")}
                >
                  <LayoutDashboard className="h-4 w-4 mr-2 text-blue-500" />
                  A partir de um template
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-700 hover:bg-gray-100 rounded-lg"
                  onClick={() => setSelectedOption("custom")}
                >
                  <Edit className="h-4 w-4 mr-2 text-blue-500" />
                  Personalizado
                </Button>
              </CardContent>
              <CardFooter className="flex justify-end border-t border-gray-100 px-6 py-4">
                <Button variant="ghost" className="text-gray-600 hover:bg-gray-100" onClick={handleClose}>
                  Cancelar
                </Button>
              </CardFooter>
            </Card>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
