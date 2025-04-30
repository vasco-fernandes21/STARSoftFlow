"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";

interface FormContratadoProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function FormContratado({ onSuccess, trigger }: FormContratadoProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState({
    identificacao: "",
    descricao: "",
    salario: "",
    contratado: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const utils = api.useUtils();

  const resetFormAndClose = () => {
    setFormValues({ identificacao: "", descricao: "", salario: "", contratado: true });
    setErrors({});
    setIsSubmitting(false);
    setOpen(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formValues.identificacao?.trim()) {
      newErrors.identificacao = "Identificação é obrigatória";
    }
    if (formValues.salario && isNaN(Number(formValues.salario.replace(",",".")))) {
      newErrors.salario = "Valor inválido";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createUserMutation = api.utilizador.create.useMutation({
    onSuccess: (data) => {
      toast.success("Contratado criado com sucesso!");
      utils.utilizador.findAll.invalidate();
      resetFormAndClose();
      if (onSuccess) onSuccess();
    },
    onError: () => {
      toast.error("Ocorreu um erro ao criar o contratado.");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const userData = {
        name: formValues.identificacao.trim(),
        informacoes: formValues.descricao.trim() || undefined,
        salario: formValues.salario ? Number(formValues.salario.replace(",",".")) : undefined,
        contratado: true,
      };
      createUserMutation.mutate(userData);
    } catch (error) {
      toast.error("Ocorreu um erro ao processar os dados do formulário");
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="overflow-hidden rounded-2xl border-none bg-white/95 p-0 shadow-2xl backdrop-blur-md sm:max-w-[500px]">
        <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col overflow-hidden">
          <DialogHeader className="border-b border-white/20 bg-gradient-to-b from-azul/10 to-transparent p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-azul/20 bg-azul/10">
                <UserPlus className="h-6 w-6 text-azul" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Novo Contratado
                </DialogTitle>
                <DialogDescription className="text-gray-500">
                  Adicione um novo contratado ao sistema
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Identificação */}
              <div className="space-y-2">
                <Label htmlFor="identificacao" className="flex items-center text-sm font-medium text-gray-700">
                  Identificação do contratado <span className="ml-1 text-red-500">*</span>
                </Label>
                <Input
                  id="identificacao"
                  value={formValues.identificacao}
                  onChange={(e) => handleChange("identificacao", e.target.value)}
                  placeholder="Nome, código ou referência do contratado"
                  className={cn(
                    "rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20",
                    errors.identificacao && "border-red-300 focus:ring-red-500/20"
                  )}
                />
                {errors.identificacao && <p className="mt-1 text-xs text-red-500">{errors.identificacao}</p>}
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="descricao" className="text-sm font-medium text-gray-700">
                  Descrição da contratação
                </Label>
                <Input
                  id="descricao"
                  value={formValues.descricao}
                  onChange={(e) => handleChange("descricao", e.target.value)}
                  placeholder="Detalhes ou descrição da contratação"
                  className="rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20"
                />
              </div>

              {/* Salário */}
              <div className="mb-4">
                <Label htmlFor="salario" className="block text-xs font-medium text-azul/80 mb-1">
                  €/Mês
                </Label>
                <Input
                  id="salario"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formValues.salario}
                  onChange={(e) => setFormValues((v) => ({ ...v, salario: e.target.value }))}
                  placeholder="Valor mensal do contratado"
                  className="rounded-xl border-gray-200 bg-white/70 text-gray-700 shadow-sm backdrop-blur-sm focus:ring-2 focus:ring-azul/20"
                />
                {errors.salario && (
                  <div className="text-xs text-red-500 mt-1">{errors.salario}</div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 border-t border-gray-100 bg-gray-50/80 px-6 py-4">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-gray-200 bg-white text-gray-700 shadow-sm transition-all duration-300 ease-in-out hover:bg-white/80 hover:text-gray-900 hover:shadow-md"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="gap-2 rounded-full bg-azul text-white shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-azul/90 hover:shadow-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  A criar...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Criar contratado
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
